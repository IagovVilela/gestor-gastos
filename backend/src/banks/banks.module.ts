import { Module, forwardRef } from '@nestjs/common';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SavingsAccountsModule } from '../savings-accounts/savings-accounts.module';

@Module({
  imports: [PrismaModule, forwardRef(() => SavingsAccountsModule)],
  controllers: [BanksController],
  providers: [BanksService],
  exports: [BanksService], // Exportar para uso em outros módulos (expenses, receipts)
})
export class BanksModule {}
