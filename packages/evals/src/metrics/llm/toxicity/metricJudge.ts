import { type MastraLLMBase } from '@mastra/core/llm';
import { z } from 'zod';

import { MastraAgentJudge } from '../../judge';

import { generateEvaluatePrompt, getReasonPrompt, TOXICITY_AGENT_INSTRUCTIONS } from './prompts';

export class ToxicityJudge extends MastraAgentJudge {
  constructor(llm: MastraLLMBase) {
    super('Toxicity', TOXICITY_AGENT_INSTRUCTIONS, llm);
  }

  async evaluate(input: string, actualOutput: string): Promise<{ verdict: string; reason: string }[]> {
    const prompt = generateEvaluatePrompt({ input, output: actualOutput });
    const result = await this.agent.generate(prompt, {
      output: z.object({
        verdicts: z.array(
          z.object({
            verdict: z.string(),
            reason: z.string(),
          }),
        ),
      }),
    });

    return result.object.verdicts;
  }

  async getReason({ score, toxics }: { score: number; toxics: string[] }): Promise<string> {
    const prompt = getReasonPrompt({ score, toxics });
    const result = await this.agent.generate(prompt, {
      output: z.object({
        reason: z.string(),
      }),
    });

    return result.object;
  }
}
