import { Injectable } from '@nestjs/common';
import readline from 'readline';

import { ClaudeService, ClaudeServiceResponse } from './claude.service';

const getAsk = (rl: readline.Interface) => (prompt: string) =>
  new Promise<string>((resolve) => rl.question(prompt, resolve));

@Injectable()
export class CliService {
  constructor(private readonly claude: ClaudeService) {}

  async run() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = getAsk(rl);
    let lines: string[] = [];
    let stopSequences: string[] = [];
    let temperature: number | undefined;

    while (true) {
      const userInput = await ask('> ').then((input: string) => input.trim());

      if (userInput.startsWith('/stop')) {
        stopSequences.push(userInput.slice(6));
      }
      if (userInput.startsWith('/temp')) {
        temperature = Number.parseFloat(userInput.slice(6));
      }
      if (userInput !== '') {
        lines.push(userInput);
        continue;
      }
      if (lines.length === 0) {
        continue;
      }

      rl.pause();

      const message = lines.join('\n');

      let sessionId = this.claude.startSession();
      let answer = await this.claude.fetchApi({
        message,
        sessionId,
        stopSequences,
        temperature: temperature ?? 0,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message,
        sessionId,
        stopSequences,
        temperature: temperature ?? 0.7,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message,
        sessionId,
        stopSequences,
        temperature: temperature ?? 1.2,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      rl.resume();

      lines = [];
      stopSequences = [];
      temperature = undefined;
    }
  }

  printAnswer({
    answer,
    input,
    output,
    reason,
    sequence,
  }: ClaudeServiceResponse) {
    process.stdout.write(`< in ${input} out ${output}`);
    if (reason === 'max_tokens') {
      process.stdout.write(` ! TOKENS`);
    }
    if (sequence !== null) {
      process.stdout.write(` ! ${sequence}`);
    }
    process.stdout.write('\n');

    process.stdout.write(answer);
    process.stdout.write('\n\n\n\n\n\n\n\n\n');
  }
}
