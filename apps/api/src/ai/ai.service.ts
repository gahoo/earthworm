import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { MaterialService } from '../material/material.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AiService {
  constructor(private readonly materialService: MaterialService) {}

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.md': 'text/markdown',
        '.srt': 'text/plain',
        '.vtt': 'text/plain',
        '.lrc': 'text/plain',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
        '.mp3': 'audio/mp3',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.mpeg': 'video/mpeg',
        '.mov': 'video/quicktime',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async generateCoursePack(
    userId: string,
    materialNames: string[],
    prompt?: string,
    provider?: string,
    apiKey?: string,
    apiBaseUrl?: string,
    modelName?: string
  ) {
    if (!materialNames || materialNames.length === 0) {
      throw new BadRequestException('materialNames is required');
    }

    const fileParts: { mimeType: string, data: string, filename: string }[] = [];

    for (const name of materialNames) {
      const safePath = await this.materialService.getMaterialPath(userId, name);
      const mimeType = this.getMimeType(name);

      // Read as base64
      const buffer = fs.readFileSync(safePath);
      const data = buffer.toString('base64');

      fileParts.push({
          mimeType,
          data,
          filename: name
      });
    }

    const systemPrompt = `You are an expert English language teacher.
Based on the provided materials, generate a JSON object representing a course pack.
The JSON must follow this structure exactly (do not wrap it in markdown codeblocks like \`\`\`json):
{
  "title": "A catchy title for the course pack",
  "description": "A short description of what the course covers",
  "isFree": true,
  "cover": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6",
  "courses": [
    {
      "title": "Title of the first lesson/course",
      "content": [
        {
          "chinese": "我",
          "english": "I",
          "soundmark": "/aɪ/"
        },
        {
          "chinese": "喜欢",
          "english": "like",
          "soundmark": "/laɪk/"
        },
        {
          "chinese": "我喜欢",
          "english": "I like",
          "soundmark": "/aɪ/ /laɪk/"
        }
      ]
    }
  ]
}

Crucially, the "content" field of each course MUST be an array of objects containing exactly three string keys: "chinese", "english", and "soundmark" (phonetic transcription). Extract logical sentences, phrases, and key vocabulary from the materials to populate this array. The list should progressively build from words to full sentences.
Ensure there are at least 3 courses in the "courses" array, each containing at least 10 vocabulary/sentence items in its "content" array.
Additional instructions from the user: ${prompt || 'None'}`;

    const effectiveProvider = provider || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

    if (effectiveProvider === 'openai') {
      return this.generateWithOpenAI(systemPrompt, fileParts, apiKey, apiBaseUrl, modelName);
    } else if (effectiveProvider === 'gemini') {
      return this.generateWithGemini(systemPrompt, fileParts, apiKey, apiBaseUrl, modelName);
    } else {
      throw new InternalServerErrorException('No valid AI provider configuration found.');
    }
  }

  private async generateWithOpenAI(systemPrompt: string, fileParts: any[], customApiKey?: string, customApiBaseUrl?: string, customModel?: string) {
    const openai = new OpenAI({
      apiKey: customApiKey || process.env.OPENAI_API_KEY,
      baseURL: customApiBaseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    });

    // Note: OpenAI multimodal supports images mainly via base64, and text.
    // We will append text files. For images, we will use the content array.
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    for (const file of fileParts) {
        if (file.mimeType.startsWith('image/')) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${file.mimeType};base64,${file.data}`
                }
            });
        } else if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
            const textContent = Buffer.from(file.data, 'base64').toString('utf-8');
            userContent.push({
                type: 'text',
                text: `--- Material: ${file.filename} ---\n${textContent}`
            });
        } else {
            // For other binary formats (PDF, audio, video) OpenAI chat completions doesn't natively support base64 uploading them directly in the prompt for text generation without the assistants/files API.
            // We'll warn or just skip/pass as best effort text if we have to, but realistically we should just skip unsupported ones for OpenAI basic chat.
            console.warn(`OpenAI provider currently doesn't support ${file.mimeType} natively in chat completions.`);
        }
    }

    if (userContent.length === 0) {
        userContent.push({ type: 'text', text: 'Please generate based on the system prompt.' });
    }

    const response = await openai.chat.completions.create({
      model: customModel || process.env.OPENAI_MODEL || 'gpt-4o', // Need vision model for multimodal
      messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) throw new InternalServerErrorException('OpenAI returned empty response');

    try {
      return JSON.parse(result);
    } catch (e) {
      throw new InternalServerErrorException('OpenAI did not return valid JSON');
    }
  }

  private async generateWithGemini(systemPrompt: string, fileParts: any[], customApiKey?: string, customApiBaseUrl?: string, customModel?: string) {
    const customFetch = (url: string | Request | URL, init?: RequestInit) => {
      if (customApiBaseUrl) {
          // Replace base URL if provided
          if (typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
              url = url.replace('https://generativelanguage.googleapis.com', customApiBaseUrl);
          } else if (url instanceof URL && url.hostname === 'generativelanguage.googleapis.com') {
              const newUrl = new URL(url.pathname + url.search, customApiBaseUrl);
              url = newUrl.toString();
          } else if (url instanceof Request && url.url.includes('generativelanguage.googleapis.com')) {
              const newUrl = url.url.replace('https://generativelanguage.googleapis.com', customApiBaseUrl);
              url = new Request(newUrl, url);
          }
      }
      return fetch(url, init);
    };

    const key = customApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new InternalServerErrorException('Gemini API key not provided');
    }

    // Ensure fetch is explicitly passed or native fetch is used, but without overriding globals
    // If customApiBaseUrl is provided, it must be injected into the GoogleGenerativeAI client config, which uses fetch.
    const customClient = {
        fetch: customFetch as any,
    };
    if (customApiBaseUrl) {
        (customClient as any).baseUrl = customApiBaseUrl;
    }

    const genAI = new GoogleGenerativeAI(key);

    // The google generative AI SDK expects baseUrl directly in RequestOptions
    const requestOptions: any = {};
    if (customApiBaseUrl) {
        requestOptions.baseUrl = customApiBaseUrl;
        requestOptions.customClient = customClient;
    }

    const model = genAI.getGenerativeModel(
      { model: customModel || "gemini-1.5-pro" },
      requestOptions
    );

    const parts: any[] = [{ text: systemPrompt }];
    for (const file of fileParts) {
        parts.push({
            inlineData: {
                data: file.data,
                mimeType: file.mimeType
            }
        });
    }

    const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const text = result.response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new InternalServerErrorException('Gemini did not return valid JSON');
    }
  }
}
