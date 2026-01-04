import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ExpensesModule } from './expenses/expenses.module';
import { GoalsModule } from './goals/goals.module';
import { AlertsModule } from './alerts/alerts.module';
import { UploadModule } from './upload/upload.module';
import { SettingsModule } from './settings/settings.module';
import { BanksModule } from './banks/banks.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CreditCardBillsModule } from './credit-card-bills/credit-card-bills.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ReceiptsModule,
    ExpensesModule,
    GoalsModule,
    AlertsModule,
    UploadModule,
    SettingsModule,
    BanksModule,
    DashboardModule,
    CreditCardBillsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

