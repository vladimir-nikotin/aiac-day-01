import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ClaudeService, ClaudeStopReason, Message } from '../claude';

type UUID = string;

type AgentServiceRequest = {
  model?: string;
  question: string;
  sessionId?: UUID;
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
  private readonly history = new Map<UUID, Message[]>();

  constructor(private readonly claude: ClaudeService) {}

  async ask({
    model,
    question,
    sessionId: requestSessionId,
    stopSequences,
    temperature,
  }: AgentServiceRequest): Promise<AgentServiceResponse> {
    const sessionId = requestSessionId ?? this.startSession();
    const history = this.history.get(sessionId);

    if (history === undefined) {
      throw new Error(
        `Session ID ${sessionId} doesn't exist, call startSession first`,
      );
    }

    const message: Message = {
      content: [
        {
          text: question,
          type: 'text',
        },
      ],
      role: 'user',
    };

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

    history.push(message, {
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

  startSession(): UUID {
    const sessionId = randomUUID();
    this.history.set(sessionId, []);
    return sessionId;
  }
  closeSession(sessionId: UUID) {
    this.history.delete(sessionId);
  }
}
