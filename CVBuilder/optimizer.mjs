import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

/**
 * CV Optimizer Engine
 * 
 * Takes a base CV (JSON) and a Job Description, 
 * and uses AI to highlight relevant skills and rewrite 
 * experience bullets for maximum ATS score.
 */
export class CVOptimizer {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async optimize(baseCV, jobDescription) {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) optimization engine.
      
      TASK:
      Tailor the following CV data to match the provided Job Description.
      
      RULES:
      1. DO NOT lie or invent experience.
      2. Rephrase existing experience using keywords found in the Job Description.
      3. Prioritize skills mentioned in the JD.
      4. Ensure the output is valid JSON matching the input schema.
      5. Output format: JSON ONLY.

      JOB DESCRIPTION:
      ${jobDescription}

      BASE CV DATA:
      ${JSON.stringify(baseCV, null, 2)}
    `;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error optimizing CV:', error);
      throw error;
    }
  }
}
