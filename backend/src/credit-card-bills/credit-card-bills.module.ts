import { Module, forwardRef } from '@nestjs/common';
import { CreditCardBillsService } from './credit-card-bills.service';
import { CreditCardBillsController } from './credit-card-bills.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BanksModule } from '../banks/banks.module';

@Module({
  imports: [PrismaModule, forwardRef(() => BanksModule)],
  controllers: [CreditCardBillsController],
  providers: [CreditCardBillsService],
  exports: [CreditCardBillsService],
})
export class CreditCardBillsModule {}
