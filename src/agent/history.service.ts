import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import fs from 'fs';
import path from 'path';

import { Message } from '../claude';
import { DeepReadonly } from '../types';

@Injectable()
export class HistoryService {
  private readonly filePath: string;
  private messages: Message[] = [];

  constructor(private readonly config: ConfigService) {
    const relPath = this.config.get<string>(
      'agent.history.path',
      'history.json',
    );
    this.filePath = path.join(__dirname, '..', '..', relPath);
    this.load();
  }

  async add(question: Message, answer: Message): Promise<void> {
    this.messages.push(question, answer);
    await this.save();
  }
  get(): DeepReadonly<Message[]> {
    return this.messages;
  }

  private load(): void {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      this.messages = JSON.parse(content) as Message[];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
    } catch (error) {}
  }
  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(this.messages, null, 2),
        'utf-8',
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
    } catch (error) {}
  }
}
