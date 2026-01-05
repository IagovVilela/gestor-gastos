import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsAccountDto } from './dto/create-savings-account.dto';
import { UpdateSavingsAccountDto } from './dto/update-savings-account.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { BanksService } from '../banks/banks.service';
import { SavingsTransactionType } from '@prisma/client';

@Injectable()
export class SavingsAccountsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BanksService))
    private banksService: BanksService,
  ) {}

  async create(userId: string, createSavingsAccountDto: CreateSavingsAccountDto) {
    // Verificar se banco existe e pertence ao usuário (se fornecido)
    if (createSavingsAccountDto.bankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: createSavingsAccountDto.bankId },
      });

      if (!bank) {
        throw new NotFoundException('Banco não encontrado');
      }

      if (bank.userId !== userId) {
        throw new ForbiddenException('Banco não pertence ao usuário');
      }
    }

    // Verificar se meta existe e pertence ao usuário (se fornecido)
    if (createSavingsAccountDto.goalId) {
      const goal = await this.prisma.goal.findUnique({
        where: { id: createSavingsAccountDto.goalId },
      });

      if (!goal) {
        throw new NotFoundException('Meta não encontrada');
      }

      if (goal.userId !== userId) {
        throw new ForbiddenException('Meta não pertence ao usuário');
      }

      // Verificar se a meta já tem uma poupança associada
      const existingSavings = await this.prisma.savingsAccount.findUnique({
        where: { goalId: createSavingsAccountDto.goalId },
      });

      if (existingSavings) {
        throw new BadRequestException('Esta meta já possui uma poupança associada');
      }
    }

    return this.prisma.savingsAccount.create({
      data: {
        ...createSavingsAccountDto,
        userId,
        currentAmount: 0,
      },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            targetAmount: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    const savingsAccounts = await this.prisma.savingsAccount.findMany({
      where: { userId },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            targetAmount: true,
            currentAmount: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular total geral
    const totalAmount = savingsAccounts.reduce(
      (sum, account) => sum + Number(account.currentAmount),
      0,
    );

    return {
      savingsAccounts,
      totalAmount,
      count: savingsAccounts.length,
    };
  }

  async findOne(id: string, userId: string) {
    const savingsAccount = await this.prisma.savingsAccount.findUnique({
      where: { id },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            targetAmount: true,
            currentAmount: true,
          },
        },
        transactions: {
          orderBy: {
            date: 'desc',
          },
          take: 10, // Últimas 10 transações
        },
      },
    });

    if (!savingsAccount) {
      throw new NotFoundException('Poupança não encontrada');
    }

    if (savingsAccount.userId !== userId) {
      throw new ForbiddenException('Poupança não pertence ao usuário');
    }

    return savingsAccount;
  }

  async update(id: string, userId: string, updateSavingsAccountDto: UpdateSavingsAccountDto) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    // Verificar banco se fornecido
    if (updateSavingsAccountDto.bankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: updateSavingsAccountDto.bankId },
      });

      if (!bank || bank.userId !== userId) {
        throw new NotFoundException('Banco não encontrado ou não pertence ao usuário');
      }
    }

    // Verificar meta se fornecido
    if (updateSavingsAccountDto.goalId) {
      const goal = await this.prisma.goal.findUnique({
        where: { id: updateSavingsAccountDto.goalId },
      });

      if (!goal || goal.userId !== userId) {
        throw new NotFoundException('Meta não encontrada ou não pertence ao usuário');
      }

      // Verificar se outra poupança já está associada a esta meta
      const existingSavings = await this.prisma.savingsAccount.findFirst({
        where: {
          goalId: updateSavingsAccountDto.goalId,
          id: { not: id },
        },
      });

      if (existingSavings) {
        throw new BadRequestException('Esta meta já possui outra poupança associada');
      }
    }

    return this.prisma.savingsAccount.update({
      where: { id },
      data: updateSavingsAccountDto,
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            targetAmount: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verificar se poupança existe e pertence ao usuário
    const savingsAccount = await this.findOne(id, userId);

    // Se houver valor guardado, não permitir exclusão (ou devolver ao banco)
    if (Number(savingsAccount.currentAmount) > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma poupança com valor guardado. Retire o valor antes de excluir.',
      );
    }

    return this.prisma.savingsAccount.delete({
      where: { id },
    });
  }

  async deposit(id: string, userId: string, depositDto: DepositDto) {
    const savingsAccount = await this.findOne(id, userId);

    // Determinar banco de origem
    const bankId = depositDto.bankId || savingsAccount.bankId;

    if (!bankId) {
      throw new BadRequestException(
        'É necessário especificar um banco para realizar o depósito. Configure um banco padrão na poupança ou informe no depósito.',
      );
    }

    // Verificar se banco existe e pertence ao usuário
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário');
    }

    // Verificar se há saldo suficiente no banco
    if (Number(bank.balance) < depositDto.amount) {
      throw new BadRequestException('Saldo insuficiente no banco para realizar o depósito');
    }

    // Realizar transação
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Criar transação de depósito
      const savingsTransaction = await tx.savingsTransaction.create({
        data: {
          savingsAccountId: id,
          type: SavingsTransactionType.DEPOSIT,
          amount: depositDto.amount,
          description: depositDto.description || 'Depósito',
          bankId,
          userId,
        },
      });

      // Atualizar valor da poupança
      const updatedSavingsAccount = await tx.savingsAccount.update({
        where: { id },
        data: {
          currentAmount: {
            increment: depositDto.amount,
          },
        },
      });

      // Deduzir do saldo do banco
      await this.banksService.updateBalance(
        bankId,
        userId,
        { balance: Number(bank.balance) - depositDto.amount },
      );

      return { savingsTransaction, updatedSavingsAccount };
    });

    return transaction.savingsTransaction;
  }

  async withdraw(id: string, userId: string, withdrawDto: WithdrawDto) {
    const savingsAccount = await this.findOne(id, userId);

    // Verificar se há valor suficiente na poupança
    if (Number(savingsAccount.currentAmount) < withdrawDto.amount) {
      throw new BadRequestException('Valor insuficiente na poupança para realizar a retirada');
    }

    // Determinar banco de destino
    const bankId = withdrawDto.bankId || savingsAccount.bankId;

    if (!bankId) {
      throw new BadRequestException(
        'É necessário especificar um banco para realizar a retirada. Configure um banco padrão na poupança ou informe na retirada.',
      );
    }

    // Verificar se banco existe e pertence ao usuário
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário');
    }

    // Realizar transação
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Criar transação de retirada
      const savingsTransaction = await tx.savingsTransaction.create({
        data: {
          savingsAccountId: id,
          type: SavingsTransactionType.WITHDRAWAL,
          amount: withdrawDto.amount,
          description: withdrawDto.description || 'Retirada',
          bankId,
          userId,
        },
      });

      // Atualizar valor da poupança
      const updatedSavingsAccount = await tx.savingsAccount.update({
        where: { id },
        data: {
          currentAmount: {
            decrement: withdrawDto.amount,
          },
        },
      });

      // Adicionar ao saldo do banco
      await this.banksService.updateBalance(
        bankId,
        userId,
        { balance: Number(bank.balance) + withdrawDto.amount },
      );

      return { savingsTransaction, updatedSavingsAccount };
    });

    return transaction.savingsTransaction;
  }

  async getTransactions(id: string, userId: string, limit: number = 50) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.savingsTransaction.findMany({
      where: { savingsAccountId: id },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });
  }

  async getEvolution(id: string, userId: string, months: number = 12) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId: id,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Agrupar por mês e calcular saldo acumulado
    const monthlyData: { month: string; balance: number; deposits: number; withdrawals: number }[] = [];
    let currentBalance = 0;

    const monthMap = new Map<string, { deposits: number; withdrawals: number }>();

    transactions.forEach((transaction) => {
      const monthKey = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { deposits: 0, withdrawals: 0 });
      }

      const monthData = monthMap.get(monthKey)!;

      if (transaction.type === SavingsTransactionType.DEPOSIT) {
        currentBalance += Number(transaction.amount);
        monthData.deposits += Number(transaction.amount);
      } else {
        currentBalance -= Number(transaction.amount);
        monthData.withdrawals += Number(transaction.amount);
      }

      monthlyData.push({
        month: monthKey,
        balance: currentBalance,
        deposits: monthData.deposits,
        withdrawals: monthData.withdrawals,
      });
    });

    return monthlyData;
  }

  async getTotalEvolution(userId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.savingsTransaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
        },
      },
      include: {
        savingsAccount: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Agrupar por mês e calcular saldo total acumulado
    const monthlyData: { month: string; balance: number; deposits: number; withdrawals: number }[] = [];
    const monthMap = new Map<string, { deposits: number; withdrawals: number; balance: number }>();

    transactions.forEach((transaction) => {
      const monthKey = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { deposits: 0, withdrawals: 0, balance: 0 });
      }

      const monthData = monthMap.get(monthKey)!;

      if (transaction.type === SavingsTransactionType.DEPOSIT) {
        monthData.deposits += Number(transaction.amount);
        monthData.balance += Number(transaction.amount);
      } else {
        monthData.withdrawals += Number(transaction.amount);
        monthData.balance -= Number(transaction.amount);
      }
    });

    // Converter para array e calcular saldo acumulado
    let cumulativeBalance = 0;
    monthMap.forEach((data, month) => {
      cumulativeBalance += data.balance;
      monthlyData.push({
        month,
        balance: cumulativeBalance,
        deposits: data.deposits,
        withdrawals: data.withdrawals,
      });
    });

    return monthlyData.sort((a, b) => a.month.localeCompare(b.month));
  }
}

