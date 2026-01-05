import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { Prisma, BankType, SavingsTransactionType } from '@prisma/client';
import { SavingsAccountsService } from '../savings-accounts/savings-accounts.service';

// Função auxiliar para formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

@Injectable()
export class BanksService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SavingsAccountsService))
    private savingsAccountsService?: SavingsAccountsService,
  ) {}

  async create(userId: string, createBankDto: CreateBankDto) {
    // Se for marcar como principal, remover isPrimary de outros bancos
    if (createBankDto.isPrimary) {
      await this.prisma.bank.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Criar o banco
    const bank = await this.prisma.bank.create({
      data: {
        name: createBankDto.name,
        type: createBankDto.type || BankType.CURRENT_ACCOUNT,
        userId,
        balance: createBankDto.balance ? new Prisma.Decimal(createBankDto.balance) : new Prisma.Decimal(0),
        isPrimary: createBankDto.isPrimary || false,
        color: createBankDto.color,
        icon: createBankDto.icon,
      },
    });

    // Se for conta poupança, processar de acordo com a opção escolhida
    if (createBankDto.type === BankType.SAVINGS_ACCOUNT && this.savingsAccountsService) {
      const initialAmount = createBankDto.balance || 0;

      // Opção 1: Associar a poupança existente
      if (createBankDto.existingSavingsAccountId) {
        // Verificar se a poupança existe e pertence ao usuário
        const existingSavings = await this.prisma.savingsAccount.findUnique({
          where: { id: createBankDto.existingSavingsAccountId },
        });

        if (!existingSavings) {
          throw new NotFoundException('Poupança não encontrada');
        }

        if (existingSavings.userId !== userId) {
          throw new BadRequestException('Poupança não pertence ao usuário');
        }

        // Atualizar o bankId da poupança para referenciar este banco
        await this.prisma.savingsAccount.update({
          where: { id: createBankDto.existingSavingsAccountId },
          data: {
            bankId: bank.id,
          },
        });

        // Criar transação de associação para histórico (não afeta o valor)
        if (initialAmount > 0) {
          const bankTypeLabel = createBankDto.type === BankType.SAVINGS_ACCOUNT ? 'Conta Poupança' 
            : createBankDto.type === BankType.CURRENT_ACCOUNT ? 'Conta Corrente'
            : createBankDto.type === BankType.SALARY_ACCOUNT ? 'Conta Salário'
            : createBankDto.type === BankType.INVESTMENT ? 'Conta Investimento'
            : createBankDto.type === BankType.CREDIT_CARD ? 'Cartão de Crédito'
            : createBankDto.type === BankType.DIGITAL_WALLET ? 'Carteira Digital'
            : 'Outros';
          
          await this.prisma.savingsTransaction.create({
            data: {
              savingsAccountId: createBankDto.existingSavingsAccountId,
              type: SavingsTransactionType.DEPOSIT,
              amount: initialAmount,
              description: `Associação da conta ${createBankDto.name} (${bankTypeLabel}) - ${formatCurrency(initialAmount)}`,
              bankId: bank.id,
              userId,
            },
          });
        }
      } 
      // Opção 2: Criar nova poupança (ou adicionar ao saldo geral se não houver dados)
      else {
        // Se não especificou poupança existente e não tem dados para criar nova,
        // apenas adiciona ao saldo geral (não cria poupança)
        if (!createBankDto.savingsName && !createBankDto.savingsDescription && !createBankDto.savingsGoalId) {
          // Opção 3: Adicionar ao saldo geral - não criar poupança
          // O valor fica no banco mas não conta no saldo total (já está excluído)
          // Não precisa fazer nada aqui, o banco já foi criado
        } else {
          // Criar nova poupança
          const savingsName = createBankDto.savingsName || `${createBankDto.name} - Poupança`;
          const savingsDescription = createBankDto.savingsDescription || `Poupança vinculada à conta ${createBankDto.name}`;
          
          // Criar poupança - o valor inicial fica apenas como referência na conta poupança
          const newSavingsAccount = await this.prisma.savingsAccount.create({
            data: {
              name: savingsName,
              description: savingsDescription,
              bankId: bank.id,
              goalId: createBankDto.savingsGoalId,
              color: createBankDto.color,
              icon: createBankDto.icon,
              userId,
              currentAmount: new Prisma.Decimal(initialAmount), // Valor inicial apenas como referência
            },
          });

          // Criar transação de associação para histórico (não afeta o valor)
          if (initialAmount > 0) {
            const bankTypeLabel = createBankDto.type === BankType.SAVINGS_ACCOUNT ? 'Conta Poupança' 
              : createBankDto.type === BankType.CURRENT_ACCOUNT ? 'Conta Corrente'
              : createBankDto.type === BankType.SALARY_ACCOUNT ? 'Conta Salário'
              : createBankDto.type === BankType.INVESTMENT ? 'Conta Investimento'
              : createBankDto.type === BankType.CREDIT_CARD ? 'Cartão de Crédito'
              : createBankDto.type === BankType.DIGITAL_WALLET ? 'Carteira Digital'
              : 'Outros';
            
            await this.prisma.savingsTransaction.create({
              data: {
                savingsAccountId: newSavingsAccount.id,
                type: SavingsTransactionType.DEPOSIT,
                amount: initialAmount,
                description: `Associação da conta ${createBankDto.name} (${bankTypeLabel}) - ${formatCurrency(initialAmount)}`,
                bankId: bank.id,
                userId,
              },
            });
          }
        }
      }
    }

    return bank;
  }

  async findAll(userId: string) {
    const banks = await this.prisma.bank.findMany({
      where: { userId },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Buscar poupanças associadas a cada banco e calcular valores corretos
    const banksWithSavings = await Promise.all(
      banks.map(async (bank) => {
        // Se for conta poupança, buscar a poupança associada
        if (bank.type === 'SAVINGS_ACCOUNT') {
          const savingsAccount = await this.prisma.savingsAccount.findFirst({
            where: { bankId: bank.id },
            select: {
              id: true,
              name: true,
              currentAmount: true,
              targetAmount: true,
              description: true,
            },
          });

          if (savingsAccount && this.savingsAccountsService) {
            // Calcular o valor real da poupança (considera saldo da conta + transações)
            const calculatedAmount = await this.savingsAccountsService.calculateSavingsAmount(
              savingsAccount.id,
              bank.userId
            );

            return {
              ...bank,
              savingsAccount: {
                ...savingsAccount,
                currentAmount: calculatedAmount,
              },
            };
          }

          return {
            ...bank,
            savingsAccount: savingsAccount || null,
          };
        }

        return {
          ...bank,
          savingsAccount: null,
        };
      })
    );

    return banksWithSavings;
  }

  async findOne(id: string, userId: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
    });

    if (!bank || bank.userId !== userId) {
      throw new NotFoundException('Banco não encontrado ou não pertence ao usuário.');
    }

    // Buscar poupança associada a este banco
    const savingsAccount = await this.prisma.savingsAccount.findFirst({
      where: { bankId: id },
      select: {
        id: true,
        name: true,
        currentAmount: true,
      },
    });

    return {
      ...bank,
      savingsAccounts: savingsAccount ? [savingsAccount] : [],
    };
  }

  async update(id: string, userId: string, updateBankDto: UpdateBankDto) {
    const bank = await this.findOne(id, userId); // Verifica se o banco existe e pertence ao usuário

    // Se for marcar como principal, remover isPrimary de outros bancos
    if (updateBankDto.isPrimary) {
      await this.prisma.bank.updateMany({
        where: { userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updateData: any = { ...updateBankDto };
    // Remover campos de poupança do updateData antes de atualizar o banco
    delete updateData.existingSavingsAccountId;
    
    if (updateBankDto.balance !== undefined) {
      updateData.balance = new Prisma.Decimal(updateBankDto.balance);
    }

    // Atualizar o banco
    const updatedBank = await this.prisma.bank.update({
      where: { id },
      data: updateData,
    });

    // Nota: Atualizar o saldo de uma conta poupança não deve ajustar automaticamente a poupança associada
    // O saldo da conta poupança é apenas informativo. Ajustes devem ser feitos através de depósitos/retiradas explícitas

    // Se for conta poupança e houver existingSavingsAccountId, associar (apenas se mudou a associação)
    if (updateBankDto.type === BankType.SAVINGS_ACCOUNT && updateBankDto.existingSavingsAccountId && this.savingsAccountsService) {
      // Buscar poupança atual associada a este banco
      const currentSavings = await this.prisma.savingsAccount.findFirst({
        where: { bankId: id },
      });

      // Se já tem uma poupança associada e é diferente da nova (mudou a associação)
      if (currentSavings && currentSavings.id !== updateBankDto.existingSavingsAccountId) {
        // Desassociar a poupança antiga
        await this.prisma.savingsAccount.update({
          where: { id: currentSavings.id },
          data: { bankId: null },
        });

        // Verificar se a nova poupança existe e pertence ao usuário
        const newSavings = await this.prisma.savingsAccount.findUnique({
          where: { id: updateBankDto.existingSavingsAccountId },
        });

        if (!newSavings) {
          throw new NotFoundException('Poupança não encontrada');
        }

        if (newSavings.userId !== userId) {
          throw new BadRequestException('Poupança não pertence ao usuário');
        }

        // Associar a nova poupança
        await this.prisma.savingsAccount.update({
          where: { id: updateBankDto.existingSavingsAccountId },
          data: { bankId: id },
        });

        // Criar transação de associação para histórico (não afeta o valor)
        const bankBalance = Number(updatedBank.balance);
        if (bankBalance > 0) {
          const bankTypeLabel = updatedBank.type === BankType.SAVINGS_ACCOUNT ? 'Conta Poupança' 
            : updatedBank.type === BankType.CURRENT_ACCOUNT ? 'Conta Corrente'
            : updatedBank.type === BankType.SALARY_ACCOUNT ? 'Conta Salário'
            : updatedBank.type === BankType.INVESTMENT ? 'Conta Investimento'
            : updatedBank.type === BankType.CREDIT_CARD ? 'Cartão de Crédito'
            : updatedBank.type === BankType.DIGITAL_WALLET ? 'Carteira Digital'
            : 'Outros';
          
          await this.prisma.savingsTransaction.create({
            data: {
              savingsAccountId: updateBankDto.existingSavingsAccountId,
              type: SavingsTransactionType.DEPOSIT,
              amount: bankBalance,
              description: `Associação da conta ${updatedBank.name} (${bankTypeLabel}) - ${formatCurrency(bankBalance)}`,
              bankId: id,
              userId,
            },
          });
        }
      } else if (!currentSavings) {
        // Não tinha poupança associada, agora vai associar uma nova
        const newSavings = await this.prisma.savingsAccount.findUnique({
          where: { id: updateBankDto.existingSavingsAccountId },
        });

        if (!newSavings) {
          throw new NotFoundException('Poupança não encontrada');
        }

        if (newSavings.userId !== userId) {
          throw new BadRequestException('Poupança não pertence ao usuário');
        }

        // Associar a nova poupança
        await this.prisma.savingsAccount.update({
          where: { id: updateBankDto.existingSavingsAccountId },
          data: { bankId: id },
        });

        // Se houver saldo no banco, transferir para a poupança e criar transação
        const bankBalance = Number(updatedBank.balance);
        if (bankBalance > 0) {
          await this.prisma.$transaction(async (tx) => {
            // Criar transação de depósito
            await tx.savingsTransaction.create({
              data: {
                savingsAccountId: updateBankDto.existingSavingsAccountId,
                type: SavingsTransactionType.DEPOSIT,
                amount: bankBalance,
                description: `Transferência da conta ${updatedBank.name}`,
                bankId: id,
                userId,
              },
            });

            // Adicionar valor à poupança
            await tx.savingsAccount.update({
              where: { id: updateBankDto.existingSavingsAccountId },
              data: {
                currentAmount: {
                  increment: bankBalance,
                },
              },
            });

            // Deduzir do saldo do banco
            const currentBankBalance = await tx.bank.findUnique({
              where: { id },
              select: { balance: true },
            });

            if (currentBankBalance) {
              const newBalance = Number(currentBankBalance.balance) - bankBalance;
              await tx.bank.update({
                where: { id },
                data: {
                  balance: new Prisma.Decimal(Math.max(0, newBalance)),
                },
              });
            }
          });
        }
      }
      // Se já tinha a mesma poupança associada, não faz nada - apenas atualiza o saldo do banco
    } else if (updateBankDto.type === BankType.SAVINGS_ACCOUNT && !updateBankDto.existingSavingsAccountId) {
      // Se for conta poupança mas não especificou poupança, desassociar qualquer poupança existente
      const currentSavings = await this.prisma.savingsAccount.findFirst({
        where: { bankId: id },
      });

      if (currentSavings) {
        await this.prisma.savingsAccount.update({
          where: { id: currentSavings.id },
          data: { bankId: null },
        });
      }
    }

    return updatedBank;
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
      where: { 
        userId,
        type: { not: 'SAVINGS_ACCOUNT' }, // Excluir contas poupança do saldo total
      },
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
