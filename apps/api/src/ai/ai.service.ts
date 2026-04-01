import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { MaterialService } from '../material/material.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  constructor(private readonly materialService: MaterialService) {}

  async generateCoursePack(
    userId: string,
    materialNames: string[],
    prompt?: string,
    provider?: string,
    apiKey?: string,
    apiBaseUrl?: string
  ) {
    if (!materialNames || materialNames.length === 0) {
      throw new BadRequestException('materialNames is required');
    }

    let combinedText = '';
    for (const name of materialNames) {
      const text = await this.materialService.readMaterialText(userId, name);
      combinedText += `\n\n--- Material: ${name} ---\n${text}`;
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
      "content": "A short markdown text summarizing the lesson, extracting key vocabulary or sentences."
    }
  ]
}

Ensure there are at least 3 courses in the "courses" array.
Additional instructions from the user: ${prompt || 'None'}

Materials:
${combinedText}`;

    const effectiveProvider = provider || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini');

    if (effectiveProvider === 'openai') {
      return this.generateWithOpenAI(systemPrompt, apiKey, apiBaseUrl);
    } else if (effectiveProvider === 'gemini') {
      return this.generateWithGemini(systemPrompt, apiKey);
    } else {
      throw new InternalServerErrorException('No valid AI provider configuration found.');
    }
  }

  private async generateWithOpenAI(systemPrompt: string, customApiKey?: string, customApiBaseUrl?: string) {
    const openai = new OpenAI({
      apiKey: customApiKey || process.env.OPENAI_API_KEY,
      baseURL: customApiBaseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
    });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: systemPrompt }],
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

  private async generateWithGemini(systemPrompt: string, customApiKey?: string) {
    const customFetch = (url: string | Request | URL, init?: RequestInit) => {
      return fetch(url, init);
    };

    const key = customApiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new InternalServerErrorException('Gemini API key not provided');
    }

    // Ensure fetch is explicitly passed or native fetch is used, but without overriding globals
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-pro" },
      { customClient: { fetch: customFetch as any } } as any
    );

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
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
