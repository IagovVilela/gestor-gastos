import { Module, forwardRef } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertGeneratorService } from './alert-generator.service';
import { AlertsController } from './alerts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GoalsModule } from '../goals/goals.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [PrismaModule, GoalsModule, forwardRef(() => ExpensesModule), ReceiptsModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertGeneratorService],
  exports: [AlertsService, AlertGeneratorService],
})
export class AlertsModule {}

