import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ProxyAgent, fetch } from 'undici';

type Role = 'assistant' | 'user';
type Message = {
  content: string;
  role: Role;
};

@Injectable()
export class ClaudeService {
  private readonly history = new Map<string, Message[]>();

  constructor(private readonly config: ConfigService) {}

  async fetchApi(sessionId: string, message: string): Promise<string> {
    const messages = this.history.get(sessionId);

    if (messages === undefined) {
      throw new Error(
        `Session ID ${sessionId} doesn't exist, call startSession first`,
      );
    }

    const headers = {
      'anthropic-version': this.config.getOrThrow<string>('claude.api.version'),
      'content-type': 'application/json',
      'x-api-key': this.config.getOrThrow<string>('claude.api.key'),
    };
    const dispatcher = new ProxyAgent({
      uri: this.config.getOrThrow<string>('claude.proxy.url'),
    });

    const question: Message = {
      content: message,
      role: 'user',
    };

    const response = await fetch(
      this.config.getOrThrow<string>('claude.api.url'),
      {
        body: JSON.stringify({
          max_tokens: 1024,
          messages: [...messages, question],
          model: 'claude-sonnet-4-6',
        }),
        dispatcher,
        headers,
        method: 'POST',
      },
    );

    const { ok, status, statusText } = response;

    if (!ok) {
      return `Error ${status} ${statusText}`;
    }
    if (status !== 200) {
      return `Something went wrong ${status} ${statusText}`;
    }

    const {
      content: [{ type, ...reply }],
    } = (await response.json()) as {
      content: { type: string; text: string }[];
    };

    if (type !== 'text') {
      return `Unsupported [${type}]\n\n${JSON.stringify(reply)}`;
    }

    const { text: answer } = reply;

    messages.push(question);
    messages.push({
      content: answer,
      role: 'assistant',
    });

    return answer;
  }

  startSession(): string {
    const sessionId = randomUUID();
    this.history.set(sessionId, []);
    return sessionId;
  }
  closeSession(sessionId: string) {
    this.history.delete(sessionId);
  }
}
