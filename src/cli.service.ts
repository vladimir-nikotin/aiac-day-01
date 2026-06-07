import { Injectable } from '@nestjs/common';
import readline from 'readline';

import { ClaudeService } from './claude.service';

@Injectable()
export class CliService {
  constructor(private readonly claude: ClaudeService) {}

  async run() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = (prompt: string) =>
      new Promise<string>((resolve) => rl.question(prompt, resolve));
    const sessionId = this.claude.startSession();

    let lines: string[] = [];

    while (true) {
      const input = await ask('> ').then((input: string) => input.trim());

      if (input !== '') {
        lines.push(input);
        continue;
      }
      if (lines.length > 0) {
        const response = await this.claude.fetchApi(
          sessionId,
          lines.join('\n'),
        );

        rl.pause();

        process.stdout.write(response);
        process.stdout.write('\n\n');

        rl.resume();

        lines = [];
      }
    }
  }
}
