import { Module } from '@nestjs/common';
import { TimeboxingService } from './timeboxing.service';
import { TimeboxingController } from './timeboxing.controller';

@Module({
  controllers: [TimeboxingController],
  providers: [TimeboxingService],
  exports: [TimeboxingService],
})
export class TimeboxingModule {}
