import { Module } from '@nestjs/common';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService], // Exportar para uso em outros módulos (expenses, receipts)
})
export class BanksModule {}
