import { Module, forwardRef } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SavingsAccountsModule } from '../savings-accounts/savings-accounts.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DashboardModule), forwardRef(() => SavingsAccountsModule)],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}


