import { PDFParse } from 'pdf-parse';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import 'dotenv/config';

/**
 * CV Extractor & Parser
 * Supports both Anthropic (Claude) and OpenAI (GPT-4o) with automatic fallback.
 */
export class CVExtractor {
  constructor(anthropicKey, openaiKey) {
    this.anthropic = anthropicKey || process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: anthropicKey || process.env.ANTHROPIC_API_KEY }) : null;
    this.openai = openaiKey || process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: openaiKey || process.env.OPENAI_API_KEY }) : null;
  }

  async extractAndParse(buffer) {
    try {
      // 1. Extract raw text from PDF
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      const rawText = data.text;
      await parser.destroy();

      if (!rawText || rawText.length < 50) {
        throw new Error('PDF extraction returned insufficient text.');
      }

      const prompt = `
        Parse the following raw CV text into structured JSON.
        RAW CV TEXT:
        ${rawText}

        OUTPUT SCHEMA:
        {
          "basics": { "name": "", "label": "", "email": "", "phone": "", "location": "", "website": "" },
          "work": [ { "company": "", "position": "", "startDate": "", "endDate": "", "highlights": [] } ],
          "education": [ { "institution": "", "area": "", "studyType": "", "endDate": "" } ],
          "skills": [ { "name": "", "keywords": [] } ],
          "projects": [ { "name": "", "description": "", "keywords": [], "url": "" } ]
        }
        Return VALID JSON ONLY.
      `;

      // Try Anthropic first, then OpenAI
      try {
        if (!this.anthropic) throw new Error('No Anthropic key');
        return await this.parseWithAnthropic(prompt);
      } catch (err) {
        if (err.message.includes('credit balance') || !this.anthropic) {
          console.warn('⚠️ Anthropic failed/unavailable. Falling back to OpenAI...');
          if (!this.openai) throw new Error('No AI providers available (both keys missing or invalid)');
          return await this.parseWithOpenAI(prompt);
        }
        throw err;
      }
    } catch (error) {
      console.error('Error in CV Extraction:', error.message);
      throw error;
    }
  }

  async parseWithAnthropic(prompt) {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    return this.cleanJSON(response.content[0].text);
  }

  async parseWithOpenAI(prompt) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  }

  cleanJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI failed to generate valid JSON');
    return JSON.parse(match[0]);
  }
}
