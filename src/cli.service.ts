import { Injectable } from '@nestjs/common';
import readline from 'readline';

import { AgentService, AgentServiceResponse } from './agent';

const getAsk = (rl: readline.Interface) => (prompt: string) =>
  new Promise<string>((resolve) => rl.question(prompt, resolve));

const models: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
  opus6: 'claude-opus-4-6',
  opus7: 'claude-opus-4-7',
  opus8: 'claude-opus-4-8',
};

@Injectable()
export class CliService {
  constructor(private readonly agent: AgentService) {}

  async run() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const ask = getAsk(rl);
    let lines: string[] = [];
    let model: string | undefined;
    let stopSequences: string[] = [];
    let temperature: number | undefined;

    while (true) {
      const userInput = await ask('> ').then((input: string) => input.trim());

      if (userInput.startsWith('/model')) {
        const modelValue = models[userInput.slice(7).trim()];
        if (modelValue) {
          model = modelValue;
        }
      }
      if (userInput.startsWith('/exit')) {
        break;
      }
      if (userInput.startsWith('/stop')) {
        stopSequences.push(userInput.slice(6).trim());
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

      const question = lines.join('\n');

      const answer = await this.agent.ask({
        model: model ?? models.haiku,
        question,
        stopSequences,
        temperature,
      });
      this.printAnswer(answer);

      rl.resume();

      lines = [];
      model = undefined;
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
  }: AgentServiceResponse) {
    process.stdout.write(`< in ${input} out ${output}`);
    if (reason === 'max_tokens') {
      process.stdout.write(` ! TOKENS`);
    }
    if (sequence !== null) {
      process.stdout.write(` ! ${sequence}`);
    }
    process.stdout.write('\n');

    process.stdout.write(answer);
    process.stdout.write('\n\n');
  }
}
