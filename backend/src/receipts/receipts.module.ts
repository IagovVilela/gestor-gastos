import { Module, forwardRef } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BanksModule } from '../banks/banks.module';

@Module({
  imports: [PrismaModule, forwardRef(() => BanksModule)],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}


