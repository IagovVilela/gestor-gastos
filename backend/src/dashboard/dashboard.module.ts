import { Module, forwardRef } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BanksModule } from '../banks/banks.module';
import { CreditCardBillsModule } from '../credit-card-bills/credit-card-bills.module';

@Module({
  imports: [PrismaModule, BanksModule, forwardRef(() => CreditCardBillsModule)],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
