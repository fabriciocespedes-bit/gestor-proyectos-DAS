import { Module } from '@nestjs/common';
import { OkrService } from './okr.service';
import { OkrController } from './okr.controller';

@Module({
  controllers: [OkrController],
  providers: [OkrService],
  exports: [OkrService],
})
export class OkrModule {}
