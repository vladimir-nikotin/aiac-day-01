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
    const stopSequences: string[] = [];

    while (true) {
      const userInput = await ask('> ').then((input: string) => input.trim());

      if (userInput.startsWith('/stop')) {
        stopSequences.push(userInput.slice(6));
      }
      if (userInput !== '') {
        lines.push(userInput);
        continue;
      }
      if (lines.length === 0) {
        continue;
      }

      rl.pause();

      // 1: Просто запрос
      let sessionId = this.claude.startSession();
      let answer = await this.claude.fetchApi({
        message: lines.join('\n'),
        sessionId,
        stopSequences,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      // 2: По шагам
      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message: [...lines, 'Решай задачу пошагово.'].join('\n'),
        sessionId,
        stopSequences,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      // 3: С мета-промптом
      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message: [
          'Создай промпт для claude, который поможет качественно ответить на следующие вопросы.',
          ...lines,
        ].join('\n'),
        sessionId,
        stopSequences,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message: answer.answer,
        sessionId,
        stopSequences: [],
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      // 4: С группой
      sessionId = this.claude.startSession();
      answer = await this.claude.fetchApi({
        message: [
          ...lines,
          'Для ответа на вопрос создай экспертную группу из системного аналитика, software engineer, software architector и критика.',
          'В ответе изложи мнения каждого члена экспертной группы. Подведи краткий итог с обзором мнений экспертов.',
        ].join('\n'),
        sessionId,
        stopSequences,
      });
      this.printAnswer(answer);
      this.claude.closeSession(sessionId);

      rl.resume();

      lines = [];
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
