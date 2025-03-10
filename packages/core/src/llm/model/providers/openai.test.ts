import { JSONSchema7 } from 'json-schema';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Load environment variables
import 'dotenv/config';

import { createTool } from '../../../tools';

import { OpenAI } from './openai';

const calculatorTool = createTool({
  id: 'Calculator',
  description: 'A simple calculator tool',
  inputSchema: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ context }) => {
    return { result: context.a + context.a };
  },
});

describe('LLM Class Integration Tests', () => {
  const llm = new OpenAI({
    name: 'gpt-4o-mini',
  });

  describe('OpenAI Integration', () => {
    it('should generate text completion', async () => {
      const response = await llm.generate('What is 2+2?');
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    }, 30000);

    it('should generate structured output', async () => {
      const schema = z.object({
        answer: z.number(),
        explanation: z.string(),
      });

      const response = await llm.generate('What is 2+2?', { output: schema });

      expect(response.object).toBeDefined();
      expect(response.object.answer).toBe(4);
      expect(typeof response.object.explanation).toBe('string');
    }, 30000);

    it('should generate structured output using json schema of type object', async () => {
      const schema = {
        type: 'object',
        properties: {
          answer: { type: 'number' },
          explanation: { type: 'string' },
        },
        additionalProperties: false,
        required: ['answer', 'explanation'],
      } as JSONSchema7;

      const response = await llm.generate('What is 2+2?', { output: schema });
      expect(response.object).toBeDefined();
      expect(response.object.answer).toBe(4);
      expect(typeof response.object.explanation).toBe('string');
    }, 3000);

    it('should generate structured output using json schema of nested object', async () => {
      const schema = {
        type: 'object',
        properties: {
          student: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  questionAttempted: { type: 'boolean' },
                },
                additionalProperties: false,
                required: ['id', 'name', 'questionAttempted'],
              },
              calculation: {
                type: 'array',
                items: { type: 'number' },
              },
            },
            additionalProperties: false,
            required: ['profile', 'calculation'],
          },
        },
        additionalProperties: false,
        required: ['student'],
      } as JSONSchema7;

      const response = await llm.generate(
        'Student Sarah Johnson (ID: 78901) is counting from 1 to 5. What are her numbers?',
        { output: schema },
      );
      expect(response.object).toBeDefined();
      console.log('response.object', response.object);
      expect(typeof response.object.student.profile.id).toBe('number');
      expect(response.object.student.profile.id).toBe(78901);
      expect(typeof response.object.student.profile.name).toBe('string');
      expect(response.object.student.profile.name).toBe('Sarah Johnson');
      expect(typeof response.object.student.profile.questionAttempted).toBe('boolean');
      expect(response.object.student.profile.questionAttempted).toBe(true);
      expect(response.object.student.calculation[0]).toBe(1);
      expect(response.object.student.calculation[1]).toBe(2);
      expect(response.object.student.calculation[2]).toBe(3);
      expect(response.object.student.calculation[3]).toBe(4);
      expect(response.object.student.calculation[4]).toBe(5);
    }, 3000);

    it('should stream structured output using json schema of type object', async () => {
      const chunks: string[] = [];
      const schema = {
        type: 'object',
        properties: {
          answer: { type: 'number' },
          explanation: { type: 'string' },
        },
        additionalProperties: false,
        required: ['answer', 'explanation'],
      } as JSONSchema7;

      const response = await llm.stream('What is 2+2?', {
        output: schema,
        onFinish: text => {
          chunks.push(text);
          return;
        },
      });
      for await (const chunk of response.textStream) {
        // Write each chunk without a newline to create a continuous stream
        expect(chunk).toBeDefined();
      }

      expect(chunks.length).toBeGreaterThan(0);

      expect(response.object).toBeDefined();
      const resObject = await response.object;
      expect(resObject.answer).toBe(4);
      expect(typeof resObject.explanation).toBe('string');
    }, 3000);

    it('should stream text completion', async () => {
      const chunks: string[] = [];
      const response = await llm.stream('Count from 1 to 5.', {
        onFinish: text => {
          chunks.push(text);
          return;
        },
      });

      for await (const chunk of response.textStream) {
        // Write each chunk without a newline to create a continuous stream
        expect(chunk).toBeDefined();
      }

      expect(chunks.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Tool Integration', () => {
    const llm = new OpenAI({
      name: 'gpt-4',
    });

    it('should use tools in generation', async () => {
      const response = await llm.generate('What is 123 + 456? Use the calculator tool to find out.', {
        tools: {
          calculatorTool,
        },
      });

      expect(response.text).toBeDefined();
    }, 30000);
  });

  describe('Error Handling', () => {
    const llm = new OpenAI({
      name: 'invalid-model',
    });

    it('should handle invalid model configurations', async () => {
      await expect(llm.generate('test')).rejects.toThrow();
    });

    it('should handle missing API keys', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(llm.generate('test')).rejects.toThrow();

      process.env.OPENAI_API_KEY = originalKey;
    });
  });

  describe('Rate Limiting', () => {
    const rateLimitLLM = new OpenAI({
      name: 'gpt-3.5-turbo',
    });

    it('should handle rate limits gracefully', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => rateLimitLLM.generate('What is 2+2?'));

      const results = await Promise.allSettled(promises);
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 60000);
  });
});
