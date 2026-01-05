import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsAccountDto } from './dto/create-savings-account.dto';
import { UpdateSavingsAccountDto } from './dto/update-savings-account.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { BanksService } from '../banks/banks.service';
import { SavingsTransactionType, Prisma } from '@prisma/client';

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
            type: true,
            balance: true,
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

  async calculateSavingsAmount(savingsAccountId: string, userId: string): Promise<number> {
    // O valor guardado deve ser calculado APENAS pelas transações reais
    // (depósitos - retiradas), excluindo transações de sistema como Transferência,
    // Ajuste de saldo e Associação
    
    // Soma apenas das transações reais (excluindo Transferência, Ajuste de saldo e Associação)
    // As associações não são transações reais, apenas registros de vinculação de contas
    const realTransactions = await this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId,
        AND: [
          {
            description: {
              not: {
                startsWith: 'Transferência',
              },
            },
          },
          {
            description: {
              not: {
                startsWith: 'Ajuste de saldo',
              },
            },
          },
          {
            description: {
              not: {
                startsWith: 'Associação',
              },
            },
          },
        ],
      },
      select: {
        type: true,
        amount: true,
      },
    });

    const realTransactionsTotal = realTransactions.reduce((sum, t) => {
      return sum + (t.type === 'DEPOSIT' ? Number(t.amount) : -Number(t.amount));
    }, 0);

    // Valor guardado = soma das transações reais (depósitos - retiradas)
    return realTransactionsTotal;
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
            type: true,
            balance: true,
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

    // Calcular valores dinâmicos para cada poupança
    const accountsWithCalculatedAmounts = await Promise.all(
      savingsAccounts.map(async (account) => {
        const calculatedAmount = await this.calculateSavingsAmount(account.id, userId);
        return {
          ...account,
          currentAmount: calculatedAmount,
        };
      }),
    );

    // Calcular total geral
    const totalAmount = accountsWithCalculatedAmounts.reduce(
      (sum, account) => sum + account.currentAmount,
      0,
    );

    return {
      savingsAccounts: accountsWithCalculatedAmounts,
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
            type: true,
            balance: true,
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

    // Calcular valor real usando função auxiliar
    const calculatedAmount = await this.calculateSavingsAmount(id, userId);

    return {
      ...savingsAccount,
      currentAmount: new Prisma.Decimal(calculatedAmount),
    };
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

    const updateData: any = { ...updateSavingsAccountDto };
    
    // Converter currentAmount para Decimal se fornecido
    if (updateData.currentAmount !== undefined) {
      updateData.currentAmount = new Prisma.Decimal(updateData.currentAmount);
    }

    return this.prisma.savingsAccount.update({
      where: { id },
      data: updateData,
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            color: true,
            type: true,
            balance: true,
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
    // Não usar o banco associado se ele for do tipo SAVINGS_ACCOUNT
    // Pois não queremos transferir da conta poupança para a poupança
    let bankId = depositDto.bankId;
    if (!bankId && savingsAccount.bankId) {
      const associatedBank = await this.prisma.bank.findUnique({
        where: { id: savingsAccount.bankId },
        select: { type: true },
      });
      // Só usar o banco associado se não for do tipo SAVINGS_ACCOUNT
      if (associatedBank && associatedBank.type !== 'SAVINGS_ACCOUNT') {
        bankId = savingsAccount.bankId;
      }
    }

    if (!bankId) {
      throw new BadRequestException(
        'É necessário especificar um banco para realizar o depósito.',
      );
    }

    // Verificar se banco existe e pertence ao usuário
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário');
    }

    // Se não for conta poupança, verificar se há saldo suficiente
    // Se for conta poupança, apenas associamos o valor, não transferimos
    const isSavingsAccountBank = bank.type === 'SAVINGS_ACCOUNT';
    if (!isSavingsAccountBank && Number(bank.balance) < depositDto.amount) {
      throw new BadRequestException('Saldo insuficiente no banco para realizar o depósito');
    }

    // Realizar transação com timeout aumentado
    const transaction = await this.prisma.$transaction(
      async (tx) => {
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

        // Se não for conta poupança, deduzir do saldo do banco
        // Se for conta poupança, apenas associamos o valor, mantendo o saldo
        if (!isSavingsAccountBank) {
          // Buscar saldo atual do banco dentro da transação para garantir consistência
          const currentBankForDeposit = await tx.bank.findUnique({
            where: { id: bankId },
            select: { balance: true },
          });

          if (!currentBankForDeposit) {
            throw new NotFoundException('Banco não encontrado');
          }

          // Calcular novo saldo e atualizar usando Prisma.Decimal
          const newBalanceForDeposit = Number(currentBankForDeposit.balance) - depositDto.amount;
          await tx.bank.update({
            where: { id: bankId },
            data: {
              balance: new Prisma.Decimal(newBalanceForDeposit),
            },
          });
        }

        return { savingsTransaction, updatedSavingsAccount };
      },
      {
        maxWait: 10000, // Tempo máximo de espera para iniciar a transação (10s)
        timeout: 15000, // Timeout da transação (15s)
      },
    );

    return transaction.savingsTransaction;
  }

  /**
   * Restaura o saldo de contas poupança que foram zeradas incorretamente
   * quando foram usadas como banco em depósitos/retiradas
   */
  async restoreSavingsAccountBalances(userId: string) {
    // Buscar todas as transações de poupança que usaram contas poupança como banco
    const transactions = await this.prisma.savingsTransaction.findMany({
      where: {
        userId,
        bankId: { not: null },
      },
      include: {
        bank: {
          select: {
            id: true,
            type: true,
            balance: true,
          },
        },
      },
    });

    // Agrupar por banco e calcular o total a restaurar
    const bankRestorations = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.bank && transaction.bank.type === 'SAVINGS_ACCOUNT') {
        const bankId = transaction.bank.id;
        const currentRestoration = bankRestorations.get(bankId) || 0;
        
        // Se foi depósito, o valor foi deduzido incorretamente, então precisa ser adicionado de volta
        // Se foi retirada, o valor foi adicionado incorretamente, então precisa ser deduzido
        const amountToRestore = transaction.type === 'DEPOSIT' 
          ? Number(transaction.amount) 
          : -Number(transaction.amount);
        
        bankRestorations.set(bankId, currentRestoration + amountToRestore);
      }
    }

    // Restaurar saldos
    const results = [];
    for (const [bankId, amountToRestore] of bankRestorations.entries()) {
      if (Math.abs(amountToRestore) > 0.01) { // Apenas se houver diferença significativa
        const bank = await this.prisma.bank.findUnique({
          where: { id: bankId },
          select: { balance: true, name: true },
        });

        if (bank) {
          const newBalance = Number(bank.balance) + amountToRestore;
          await this.prisma.bank.update({
            where: { id: bankId },
            data: {
              balance: new Prisma.Decimal(newBalance),
            },
          });

          results.push({
            bankId,
            bankName: bank.name,
            amountRestored: amountToRestore,
            oldBalance: Number(bank.balance),
            newBalance,
          });
        }
      }
    }

    return {
      restored: results.length,
      details: results,
    };
  }

  async withdraw(id: string, userId: string, withdrawDto: WithdrawDto) {
    const savingsAccount = await this.findOne(id, userId);

    // Verificar se há valor suficiente na poupança
    if (Number(savingsAccount.currentAmount) < withdrawDto.amount) {
      throw new BadRequestException('Valor insuficiente na poupança para realizar a retirada');
    }

    // Determinar banco de destino
    // Não usar o banco associado se ele for do tipo SAVINGS_ACCOUNT
    // Pois não queremos transferir da poupança para a conta poupança
    let bankId = withdrawDto.bankId;
    if (!bankId && savingsAccount.bankId) {
      const associatedBank = await this.prisma.bank.findUnique({
        where: { id: savingsAccount.bankId },
        select: { type: true },
      });
      // Só usar o banco associado se não for do tipo SAVINGS_ACCOUNT
      if (associatedBank && associatedBank.type !== 'SAVINGS_ACCOUNT') {
        bankId = savingsAccount.bankId;
      }
    }

    if (!bankId) {
      throw new BadRequestException(
        'É necessário especificar um banco para realizar a retirada.',
      );
    }

    // Verificar se banco existe e pertence ao usuário
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário');
    }

    // Se for conta poupança, apenas associamos o valor, não transferimos
    const isSavingsAccountBank = bank.type === 'SAVINGS_ACCOUNT';

    // Realizar transação com timeout aumentado
    const transaction = await this.prisma.$transaction(
      async (tx) => {
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

        // Se não for conta poupança, adicionar ao saldo do banco
        // Se for conta poupança, apenas associamos o valor, mantendo o saldo
        if (!isSavingsAccountBank) {
          // Buscar saldo atual do banco dentro da transação para garantir consistência
          const currentBank = await tx.bank.findUnique({
            where: { id: bankId },
            select: { balance: true },
          });

          if (!currentBank) {
            throw new NotFoundException('Banco não encontrado');
          }

          // Calcular novo saldo e atualizar usando Prisma.Decimal
          const newBalance = Number(currentBank.balance) + withdrawDto.amount;
          await tx.bank.update({
            where: { id: bankId },
            data: {
              balance: new Prisma.Decimal(newBalance),
            },
          });
        }

        return { savingsTransaction, updatedSavingsAccount };
      },
      {
        maxWait: 10000, // Tempo máximo de espera para iniciar a transação (10s)
        timeout: 15000, // Timeout da transação (15s)
      },
    );

    return transaction.savingsTransaction;
  }

  async getTransactions(id: string, userId: string, limit: number = 50) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    // Buscar todas as transações (incluindo associações para mostrar de qual conta veio)
    // Mas excluindo Transferência e Ajuste de saldo que são incorretas
    return this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId: id,
        AND: [
          {
            description: {
              not: {
                startsWith: 'Transferência',
              },
            },
          },
          {
            description: {
              not: {
                startsWith: 'Ajuste de saldo',
              },
            },
          },
        ],
      },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            type: true,
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

  async cleanupIncorrectTransactions(id: string, userId: string) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    // Buscar todas as transações para filtrar manualmente (mais robusto)
    const allTransactions = await this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId: id,
      },
      select: {
        id: true,
        description: true,
      },
    });

    // Identificar transações incorretas usando o mesmo filtro da evolução
    const excludeKeywords = [
      'transferência',
      'transferencia',
      'transfer',
      'ajuste',
      'associação',
      'associacao',
      'associac',
      'da conta',
      'conta ',
    ];

    const incorrectTransactionIds = allTransactions
      .filter((t) => {
        const desc = (t.description || '').toLowerCase().trim();
        
        // Excluir transações sem descrição (antigas incorretas)
        if (!desc) {
          return true;
        }
        
        // Excluir transações com palavras-chave de exclusão
        return excludeKeywords.some((keyword) => desc.includes(keyword));
      })
      .map((t) => t.id);

    // Deletar transações incorretas
    const deleted = await this.prisma.savingsTransaction.deleteMany({
      where: {
        id: {
          in: incorrectTransactionIds,
        },
      },
    });

    // Recalcular o valor da poupança usando função auxiliar
    const calculatedAmount = await this.calculateSavingsAmount(id, userId);

    await this.prisma.savingsAccount.update({
      where: { id },
      data: {
        currentAmount: new Prisma.Decimal(calculatedAmount),
      },
    });

    return { deleted: deleted.count };
  }

  async createAssociationTransaction(id: string, userId: string) {
    // Verificar se poupança existe e pertence ao usuário
    const savingsAccount = await this.findOne(id, userId);

    // Buscar conta poupança associada
    if (!savingsAccount.bankId) {
      throw new BadRequestException('Esta poupança não possui conta poupança associada');
    }

    const associatedBank = await this.prisma.bank.findUnique({
      where: { id: savingsAccount.bankId },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
      },
    });

    if (!associatedBank) {
      throw new NotFoundException('Conta poupança associada não encontrada');
    }

    // Verificar se já existe transação de associação para esta conta
    const existingAssociation = await this.prisma.savingsTransaction.findFirst({
      where: {
        savingsAccountId: id,
        description: {
          startsWith: 'Associação da conta',
        },
        bankId: savingsAccount.bankId,
      },
    });

    if (existingAssociation) {
      throw new BadRequestException('Transação de associação já existe para esta conta');
    }

    // Criar transação de associação
    const bankBalance = Number(associatedBank.balance);
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return this.prisma.savingsTransaction.create({
      data: {
        savingsAccountId: id,
        type: SavingsTransactionType.DEPOSIT,
        amount: bankBalance,
        description: `Associação da conta ${associatedBank.name} (${formatCurrency(bankBalance)})`,
        bankId: savingsAccount.bankId,
        userId,
      },
      include: {
        bank: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
          },
        },
      },
    });
  }

  async debugTransactions(id: string, userId: string, months: number = 12) {
    // Verificar se poupança existe e pertence ao usuário
    await this.findOne(id, userId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Buscar TODAS as transações
    const allTransactions = await this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId: id,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
      },
    });

    // Classificar transações
    const classified = allTransactions.map((t) => {
      const desc = (t.description || '').toLowerCase().trim();
      const excludeKeywords = [
        'transferência',
        'transferencia',
        'transfer',
        'ajuste',
        'associação',
        'associacao',
        'associac',
        'da conta',
        'conta ',
      ];
      const shouldExclude = excludeKeywords.some((keyword) => desc.includes(keyword));
      
      return {
        ...t,
        willBeIncluded: !shouldExclude,
        reason: shouldExclude ? 'Contém palavra-chave de exclusão' : 'Transação real',
      };
    });

    const included = classified.filter((t) => t.willBeIncluded);
    const excluded = classified.filter((t) => !t.willBeIncluded);

    const totalDeposits = included
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = included
      .filter((t) => t.type === 'WITHDRAWAL')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalTransactions: allTransactions.length,
      included: included.length,
      excluded: excluded.length,
      totalDeposits,
      totalWithdrawals,
      balance: totalDeposits - totalWithdrawals,
      allTransactions: classified,
      includedTransactions: included,
      excludedTransactions: excluded,
    };
  }

  async getEvolution(id: string, userId: string, months: number = 12) {
    // Verificar se poupança existe e pertence ao usuário
    const savingsAccount = await this.findOne(id, userId);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // IMPORTANTE: A evolução mostra apenas as transações manuais (depósitos/retiradas)
    // O saldo das contas associadas NÃO deve aparecer na evolução
    // A evolução começa do zero e mostra apenas movimentações manuais

    // Buscar TODAS as transações primeiro para debug
    const allTransactions = await this.prisma.savingsTransaction.findMany({
      where: {
        savingsAccountId: id,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        date: true,
      },
    });

    // Filtrar manualmente para garantir que nenhuma transação incorreta seja incluída
    // Excluir: Transferência, Ajuste de saldo, Associação (qualquer variação)
    // IMPORTANTE: Apenas transações com descrições válidas são incluídas
    const transactions = allTransactions.filter((t) => {
      const desc = (t.description || '').toLowerCase().trim();
      
      // Se não tem descrição, excluir (pode ser transação antiga incorreta)
      if (!desc) {
        return false;
      }
      
      // Excluir qualquer transação que contenha essas palavras-chave (case-insensitive)
      const excludeKeywords = [
        'transferência',
        'transferencia',
        'transfer',
        'ajuste',
        'associação',
        'associacao',
        'associac',
        'da conta',
        'conta ',
      ];
      
      // Se contém qualquer palavra-chave de exclusão, não incluir
      const shouldExclude = excludeKeywords.some((keyword) => desc.includes(keyword));
      
      // Incluir apenas se NÃO contém palavras-chave de exclusão
      // E tem descrição (mesmo que seja apenas "Depósito" ou "Retirada")
      return !shouldExclude;
    });

    // Agrupar por mês e calcular saldo acumulado
    // A evolução começa do zero e mostra apenas transações manuais
    const monthlyDataMap = new Map<string, { deposits: number; withdrawals: number; balance: number }>();
    let currentBalance = 0; // Sempre começa do zero na evolução

    // Processar transações
    transactions.forEach((transaction) => {
      const monthKey = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyDataMap.has(monthKey)) {
        monthlyDataMap.set(monthKey, { deposits: 0, withdrawals: 0, balance: currentBalance });
      }

      const monthData = monthlyDataMap.get(monthKey)!;

      if (transaction.type === SavingsTransactionType.DEPOSIT) {
        currentBalance += Number(transaction.amount);
        monthData.deposits += Number(transaction.amount);
      } else {
        currentBalance -= Number(transaction.amount);
        monthData.withdrawals += Number(transaction.amount);
      }

      monthData.balance = currentBalance;
    });

    // Converter para array e preencher meses sem transações
    const monthlyData: { month: string; balance: number; deposits: number; withdrawals: number }[] = [];
    const today = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyDataMap.has(monthKey)) {
        const data = monthlyDataMap.get(monthKey)!;
        monthlyData.push({
          month: monthKey,
          balance: data.balance,
          deposits: data.deposits,
          withdrawals: data.withdrawals,
        });
      } else {
        // Mês sem transações - usar saldo do mês anterior (ou zero se for o primeiro)
        const previousBalance = monthlyData.length > 0 
          ? monthlyData[monthlyData.length - 1].balance 
          : 0;
        monthlyData.push({
          month: monthKey,
          balance: previousBalance,
          deposits: 0,
          withdrawals: 0,
        });
      }
    }

    return monthlyData;
  }

  async getTotalEvolution(userId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Buscar TODAS as transações primeiro
    const allTransactions = await this.prisma.savingsTransaction.findMany({
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

    // Filtrar manualmente para garantir que nenhuma transação incorreta seja incluída
    // Excluir: Transferência, Ajuste de saldo, Associação (qualquer variação)
    // IMPORTANTE: Apenas transações com descrições válidas são incluídas
    const transactions = allTransactions.filter((t) => {
      const desc = (t.description || '').toLowerCase().trim();
      
      // Se não tem descrição, excluir (pode ser transação antiga incorreta)
      if (!desc) {
        return false;
      }
      
      // Excluir qualquer transação que contenha essas palavras-chave (case-insensitive)
      const excludeKeywords = [
        'transferência',
        'transferencia',
        'transfer',
        'ajuste',
        'associação',
        'associacao',
        'associac',
        'da conta',
        'conta ',
      ];
      
      // Se contém qualquer palavra-chave de exclusão, não incluir
      const shouldExclude = excludeKeywords.some((keyword) => desc.includes(keyword));
      
      // Incluir apenas se NÃO contém palavras-chave de exclusão
      // E tem descrição (mesmo que seja apenas "Depósito" ou "Retirada")
      return !shouldExclude;
    });

    // Agrupar por mês e calcular saldo acumulado
    // A evolução começa do zero e mostra apenas transações manuais
    const monthlyDataMap = new Map<string, { deposits: number; withdrawals: number; balance: number }>();
    let currentBalance = 0; // Sempre começa do zero na evolução
    let lastMonthKey = '';

    // Processar transações em ordem cronológica
    transactions.forEach((transaction) => {
      const monthKey = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, '0')}`;
      
      // Se é um novo mês, inicializar com o saldo atual (saldo acumulado até então)
      if (monthKey !== lastMonthKey) {
        if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, { deposits: 0, withdrawals: 0, balance: currentBalance });
        }
        lastMonthKey = monthKey;
      }

      const monthData = monthlyDataMap.get(monthKey)!;

      if (transaction.type === SavingsTransactionType.DEPOSIT) {
        currentBalance += Number(transaction.amount);
        monthData.deposits += Number(transaction.amount);
      } else {
        currentBalance -= Number(transaction.amount);
        monthData.withdrawals += Number(transaction.amount);
      }

      // Atualizar saldo do mês após cada transação
      monthData.balance = currentBalance;
    });

    // Converter para array e preencher meses sem transações
    const monthlyData: { month: string; balance: number; deposits: number; withdrawals: number }[] = [];
    const today = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyDataMap.has(monthKey)) {
        const data = monthlyDataMap.get(monthKey)!;
        monthlyData.push({
          month: monthKey,
          balance: data.balance,
          deposits: data.deposits,
          withdrawals: data.withdrawals,
        });
      } else {
        // Mês sem transações - usar saldo do mês anterior (ou zero se for o primeiro)
        const previousBalance = monthlyData.length > 0 
          ? monthlyData[monthlyData.length - 1].balance 
          : 0;
        monthlyData.push({
          month: monthKey,
          balance: previousBalance,
          deposits: 0,
          withdrawals: 0,
        });
      }
    }

    return monthlyData;
  }
}

