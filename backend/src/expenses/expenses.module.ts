import { Module, forwardRef, Inject } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { BanksModule } from '../banks/banks.module';
import { CreditCardBillsModule } from '../credit-card-bills/credit-card-bills.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AlertsModule),
    forwardRef(() => BanksModule),
    forwardRef(() => CreditCardBillsModule),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}

