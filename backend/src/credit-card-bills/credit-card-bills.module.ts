import { Module } from '@nestjs/common';
import { CreditCardBillsService } from './credit-card-bills.service';
import { CreditCardBillsController } from './credit-card-bills.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCardBillsController],
  providers: [CreditCardBillsService],
  exports: [CreditCardBillsService],
})
export class CreditCardBillsModule {}
