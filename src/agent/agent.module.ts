import { Module } from '@nestjs/common';
import { ClaudeModule } from '../claude';
import { AgentService } from './agent.service';

@Module({
  imports: [ClaudeModule],
  exports: [AgentService],
  providers: [AgentService],
})
export class AgentModule {}
