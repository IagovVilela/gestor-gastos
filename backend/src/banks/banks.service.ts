import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBankDto: CreateBankDto) {
    // Se for marcar como principal, remover isPrimary de outros bancos
    if (createBankDto.isPrimary) {
      await this.prisma.bank.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.bank.create({
      data: {
        ...createBankDto,
        userId,
        balance: createBankDto.balance ? new Prisma.Decimal(createBankDto.balance) : new Prisma.Decimal(0),
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bank.findMany({
      where: { userId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, userId: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário.');
    }

    return bank;
  }

  async update(id: string, userId: string, updateBankDto: UpdateBankDto) {
    await this.findOne(id, userId); // Verifica se o banco existe e pertence ao usuário

    // Se for marcar como principal, remover isPrimary de outros bancos
    if (updateBankDto.isPrimary) {
      await this.prisma.bank.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updateData: any = { ...updateBankDto };
    if (updateBankDto.balance !== undefined) {
      updateData.balance = new Prisma.Decimal(updateBankDto.balance);
    }

    return this.prisma.bank.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Verifica se o banco existe e pertence ao usuário

    // Verificar se há transações associadas
    const [receiptsCount, expensesCount] = await Promise.all([
      this.prisma.receipt.count({ where: { bankId: id } }),
      this.prisma.expense.count({ where: { bankId: id } }),
    ]);

    if (receiptsCount > 0 || expensesCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir o banco pois existem transações associadas. Remova ou altere as transações primeiro.',
      );
    }

    return this.prisma.bank.delete({
      where: { id },
    });
  }

  async updateBalance(id: string, userId: string, updateBalanceDto: UpdateBalanceDto) {
    await this.findOne(id, userId); // Verifica se o banco existe e pertence ao usuário

    return this.prisma.bank.update({
      where: { id },
      data: {
        balance: new Prisma.Decimal(updateBalanceDto.balance),
      },
    });
  }

  async getTotalBalance(userId: string) {
    const banks = await this.prisma.bank.findMany({
      where: { userId },
      select: { balance: true },
    });

    const total = banks.reduce((sum, bank) => {
      return sum + Number(bank.balance);
    }, 0);

    return { total };
  }

  // Método para atualizar saldo automaticamente ao criar/editar/deletar transações
  async updateBalanceFromTransaction(
    bankId: string | null | undefined,
    amount: number,
    type: 'receipt' | 'expense',
    operation: 'create' | 'update' | 'delete',
    oldAmount?: number,
    oldBankId?: string | null,
  ) {
    if (!bankId && !oldBankId) {
      return; // Sem banco associado, não atualiza saldo
    }

    // Se estiver editando e mudou de banco
    if (operation === 'update' && oldBankId && bankId !== oldBankId) {
      // Reverter no banco antigo
      if (oldBankId) {
        const oldBank = await this.prisma.bank.findUnique({ where: { id: oldBankId } });
        if (oldBank) {
          const adjustment = type === 'receipt' ? -Number(oldAmount || 0) : Number(oldAmount || 0);
          await this.prisma.bank.update({
            where: { id: oldBankId },
            data: {
              balance: new Prisma.Decimal(Number(oldBank.balance) + adjustment),
            },
          });
        }
      }

      // Aplicar no banco novo
      if (bankId) {
        const newBank = await this.prisma.bank.findUnique({ where: { id: bankId } });
        if (newBank) {
          const adjustment = type === 'receipt' ? Number(amount) : -Number(amount);
          await this.prisma.bank.update({
            where: { id: bankId },
            data: {
              balance: new Prisma.Decimal(Number(newBank.balance) + adjustment),
            },
          });
        }
      }
      return;
    }

    // Operação normal (create, delete ou update sem mudança de banco)
    const targetBankId = bankId || oldBankId;
    if (!targetBankId) return;

    const bank = await this.prisma.bank.findUnique({ where: { id: targetBankId } });
    if (!bank) return;

    let adjustment = 0;

    if (operation === 'create') {
      adjustment = type === 'receipt' ? Number(amount) : -Number(amount);
    } else if (operation === 'delete') {
      adjustment = type === 'receipt' ? -Number(amount) : Number(amount);
    } else if (operation === 'update') {
      // Atualizar: ajustar pela diferença
      const oldValue = Number(oldAmount || 0);
      const newValue = Number(amount);
      if (type === 'receipt') {
        adjustment = newValue - oldValue;
      } else {
        adjustment = oldValue - newValue;
      }
    }

    await this.prisma.bank.update({
      where: { id: targetBankId },
      data: {
        balance: new Prisma.Decimal(Number(bank.balance) + adjustment),
      },
    });
  }
}
