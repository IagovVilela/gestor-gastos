import { Module, forwardRef } from '@nestjs/common';
import { SavingsAccountsService } from './savings-accounts.service';
import { SavingsAccountsController } from './savings-accounts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BanksModule } from '../banks/banks.module';

@Module({
  imports: [PrismaModule, forwardRef(() => BanksModule)],
  controllers: [SavingsAccountsController],
  providers: [SavingsAccountsService],
  exports: [SavingsAccountsService],
})
export class SavingsAccountsModule {}

