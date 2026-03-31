import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { MaterialService } from '../material/material.service';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  constructor(private readonly materialService: MaterialService) {}

  async generateCoursePack(userId: string, materialNames: string[], prompt?: string) {
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

    // Prefer OPENAI_API_KEY, fallback to GEMINI_API_KEY
    if (process.env.OPENAI_API_KEY) {
      return this.generateWithOpenAI(systemPrompt);
    } else if (process.env.GEMINI_API_KEY) {
      return this.generateWithGemini(systemPrompt);
    } else {
      throw new InternalServerErrorException('No AI provider API key found (OPENAI_API_KEY or GEMINI_API_KEY)');
    }
  }

  private async generateWithOpenAI(systemPrompt: string) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
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

  private async generateWithGemini(systemPrompt: string) {
    const customFetch = (url: RequestInfo | URL, init?: RequestInit) => {
      return fetch(url, init);
    };

    // Ensure fetch is explicitly passed or native fetch is used, but without overriding globals
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }, { fetch: customFetch as any });

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
