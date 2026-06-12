import { Injectable } from '@nestjs/common';

import { ClaudeService, ClaudeStopReason, Message } from '../claude';
import { HistoryService } from './history.service';

type AgentServiceRequest = {
  model?: string;
  question: string;
  stopSequences: string[];
  temperature?: number;
};
export type AgentServiceResponse = {
  answer: string;
  input: number;
  output: number;
  reason: ClaudeStopReason;
  sequence: string | null;
};

@Injectable()
export class AgentService {
  constructor(
    private readonly claude: ClaudeService,
    private readonly history: HistoryService,
  ) {}

  async ask({
    model,
    question,
    stopSequences,
    temperature,
  }: AgentServiceRequest): Promise<AgentServiceResponse> {
    const message: Message = {
      content: [
        {
          text: question,
          type: 'text',
        },
      ],
      role: 'user',
    };
    const history = this.history.get();

    const {
      content,
      stop_reason: reason,
      stop_sequence: sequence,
      usage: { input_tokens: input, output_tokens: output },
    } = await this.claude.fetchApi({
      messages: [...history, message],
      model,
      stopSequences,
      temperature,
    });

    await this.history.add(message, {
      content,
      role: 'assistant',
    });

    let answer = '';

    for (const { type, ...others } of content) {
      if (answer.length > 0) {
        answer += '\n\n';
      }
      if (type === 'text') {
        answer += others.text;
      } else {
        answer += `[${type}]`;
      }
    }

    return {
      answer,
      input,
      output,
      reason,
      sequence,
    };
  }
}
