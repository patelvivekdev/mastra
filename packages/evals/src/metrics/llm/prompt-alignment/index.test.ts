import { OpenAI } from '@mastra/core/llm/openai';
import { describe, it, expect } from 'vitest';

import { TestCaseWithInstructions } from '../utils';

import { PromptAlignmentMetric } from './index';

const testCases: TestCaseWithInstructions[] = [
  {
    // Perfect alignment (score: 1.0)
    instructions: ['Reply in all uppercase'],
    input: 'What is the weather?',
    output: 'THE WEATHER IS SUNNY TODAY.',
    expectedResult: {
      score: 1.0,
      reason: 'The output follows the uppercase instruction perfectly',
    },
  },
  {
    // Zero alignment (score: 0)
    instructions: ['Reply in all uppercase'],
    input: 'What is the weather?',
    output: 'The weather is sunny today.',
    expectedResult: {
      score: 0,
      reason: 'The output does not follow the uppercase instruction',
    },
  },
  {
    // Multiple instructions - all followed (score: 1.0)
    instructions: ['Reply in all uppercase', 'End with an exclamation mark'],
    input: 'What is the weather?',
    output: 'THE WEATHER IS SUNNY TODAY!',
    expectedResult: {
      score: 1.0,
      reason: 'The output follows both uppercase and exclamation mark instructions',
    },
  },
  {
    // Multiple instructions - partial follow (score: 0.5)
    instructions: ['Reply in all uppercase', 'End with an exclamation mark'],
    input: 'What is the weather?',
    output: 'THE WEATHER IS SUNNY TODAY.',
    expectedResult: {
      score: 0.5,
      reason: 'The output follows the uppercase instruction but lacks an exclamation mark',
    },
  },
  {
    // Complex multiple instructions (score: 1.0)
    instructions: ['Start with "Answer:"', 'Use exactly four sentences', 'End with a period'],
    input: 'Describe the seasons.',
    output: 'Answer: Spring brings flowers. Summer brings heat. Fall brings colors. Winter brings snow.',
    expectedResult: {
      score: 1.0,
      reason: 'The output follows all formatting instructions precisely',
    },
  },
  {
    // Empty output (score: 0)
    instructions: ['Reply in all uppercase'],
    input: 'What is the weather?',
    output: '',
    expectedResult: {
      score: 0,
      reason: 'Empty output cannot follow any instructions',
    },
  },
];

const SECONDS = 10000;

const llm = new OpenAI({
  name: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

describe(
  'PromptAlignmentMetric',
  () => {
    it('should measure perfect alignment with single instruction', async () => {
      const testCase = testCases[0]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);
      expect(result.score).toBe(testCase.expectedResult.score);
    });

    it('should measure zero alignment with single instruction', async () => {
      const testCase = testCases[1]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);

      expect(result.score).toBe(testCase.expectedResult.score);
    });

    it('should measure perfect alignment with multiple instructions', async () => {
      const testCase = testCases[2]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);

      expect(result.score).toBe(testCase.expectedResult.score);
    });

    it('should measure partial alignment with multiple instructions', async () => {
      const testCase = testCases[3]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);

      expect(result.score).toBe(testCase.expectedResult.score);
    });

    it('should measure alignment with complex formatting instructions', async () => {
      const testCase = testCases[4]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);

      expect(result.score).toBe(testCase.expectedResult.score);
    });

    it('should handle empty output', async () => {
      const testCase = testCases[5]!;
      const metric = new PromptAlignmentMetric(llm, {
        instructions: testCase.instructions,
      });

      const result = await metric.measure(testCase.input, testCase.output);

      expect(result.score).toBe(testCase.expectedResult.score);
    });
  },
  {
    timeout: 15 * SECONDS,
  },
);
