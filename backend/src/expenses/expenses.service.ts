import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { AlertGeneratorService } from '../alerts/alert-generator.service';
import { BanksService } from '../banks/banks.service';
import { CreditCardBillsService } from '../credit-card-bills/credit-card-bills.service';
import { Prisma, PaymentMethod } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AlertGeneratorService))
    private alertGeneratorService?: AlertGeneratorService,
    @Inject(forwardRef(() => BanksService))
    private banksService?: BanksService,
    @Inject(forwardRef(() => CreditCardBillsService))
    private creditCardBillsService?: CreditCardBillsService,
  ) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    // Verificar se categoria existe e pertence ao usuário (se fornecida)
    if (createExpenseDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: createExpenseDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    // Verificar se banco existe e pertence ao usuário (se fornecida)
    if (createExpenseDto.bankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: createExpenseDto.bankId },
      });

      if (!bank) {
        throw new NotFoundException('Banco não encontrado');
      }

      if (bank.userId !== userId) {
        throw new ForbiddenException('Banco não pertence ao usuário');
      }
    }

    // Se paymentDate não foi informado, usa a data do lançamento
    const paymentDate = createExpenseDto.paymentDate 
      ? new Date(createExpenseDto.paymentDate)
      : new Date(createExpenseDto.date);

    const expense = await this.prisma.expense.create({
      data: {
        ...createExpenseDto,
        date: new Date(createExpenseDto.date),
        paymentDate: paymentDate,
        userId,
        amount: new Prisma.Decimal(createExpenseDto.amount),
        bankId: createExpenseDto.bankId || null, // Garantir que seja null se não fornecido
      },
      include: {
        category: true,
        bank: true,
      },
    });

    // Atualizar saldo do banco automaticamente APENAS se:
    // 1. Tem banco associado
    // 2. paymentDate <= hoje (não é lançamento futuro)
    // 3. paymentMethod não é CREDIT (crédito só afeta saldo quando paga a fatura)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shouldUpdateBalance = 
      createExpenseDto.bankId &&
      paymentDate <= today &&
      createExpenseDto.paymentMethod !== PaymentMethod.CREDIT;

    if (this.banksService && shouldUpdateBalance) {
      this.banksService
        .updateBalanceFromTransaction(createExpenseDto.bankId, createExpenseDto.amount, 'expense', 'create')
        .catch((err) => console.error('Erro ao atualizar saldo do banco:', err));
    }

    // Gerar alertas automaticamente (assíncrono, não bloqueia a resposta)
    if (this.alertGeneratorService) {
      this.alertGeneratorService.generateAlertsForUser(userId).catch(() => {
        // Ignorar erros na geração de alertas para não afetar a criação da despesa
      });
    }

    // Se for despesa de crédito, gerar/atualizar faturas futuras
    if (createExpenseDto.paymentMethod === PaymentMethod.CREDIT && this.creditCardBillsService) {
      try {
        await this.creditCardBillsService.generateFutureBills(userId, 5, createExpenseDto.bankId);
      } catch (error) {
        console.error('Erro ao gerar faturas futuras:', error);
      }
    }

    return expense;
  }

  async findAll(userId: string, query: QueryExpenseDto) {
    try {
      const where: any = { userId };

      if (query.startDate || query.endDate) {
        where.date = {};
        if (query.startDate) {
          where.date.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.date.lte = new Date(query.endDate);
        }
      }

      if (query.categoryId) {
        where.categoryId = query.categoryId;
      }

      if (query.isFixed !== undefined) {
        where.isFixed = query.isFixed;
      }

      if (query.search) {
        // MySQL não suporta mode: 'insensitive', mas geralmente é case-insensitive por padrão
        where.description = {
          contains: query.search,
        };
      }

      if (query.isRecurring !== undefined) {
        where.isRecurring = query.isRecurring;
      }

      if (query.paymentMethod) {
        where.paymentMethod = query.paymentMethod;
      }

      if (query.futureOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        where.paymentDate = {
          gt: today,
        };
      }

      // Paginação
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Buscar dados e total em paralelo
      const [data, total] = await Promise.all([
        this.prisma.expense.findMany({
          where,
          select: {
            id: true,
            description: true,
            amount: true,
            date: true,
            categoryId: true,
            isRecurring: true,
            isFixed: true,
            recurringType: true,
            notes: true,
            receiptImageUrl: true,
            paymentDate: true,
            paymentMethod: true,
            isPaid: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            bank: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            paidBank: {
              select: {
                id: true,
                name: true,
              },
            },
            bankId: true,
          },
          orderBy: {
            date: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.expense.count({ where }),
      ]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
      throw error;
    }
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        bank: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('Despesa não pertence ao usuário');
    }

    return expense;
  }

  async update(id: string, userId: string, updateExpenseDto: UpdateExpenseDto) {
    // Buscar despesa atual para comparar valores
    const oldExpense = await this.findOne(id, userId);

    // Verificar categoria se fornecida
    if (updateExpenseDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateExpenseDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    // Verificar banco se fornecido
    if (updateExpenseDto.bankId !== undefined) {
      if (updateExpenseDto.bankId) {
        const bank = await this.prisma.bank.findUnique({
          where: { id: updateExpenseDto.bankId },
        });

        if (!bank) {
          throw new NotFoundException('Banco não encontrado');
        }

        if (bank.userId !== userId) {
          throw new ForbiddenException('Banco não pertence ao usuário');
        }
      }
      // Se bankId for null, está permitido (despesa sem banco)
    }

    const updateData: any = { ...updateExpenseDto };
    // Garantir que bankId seja null se não fornecido ou se for string vazia
    if (updateExpenseDto.bankId !== undefined) {
      updateData.bankId = updateExpenseDto.bankId || null;
    }
    if (updateExpenseDto.date) {
      updateData.date = new Date(updateExpenseDto.date);
    }
    if (updateExpenseDto.paymentDate !== undefined) {
      updateData.paymentDate = updateExpenseDto.paymentDate ? new Date(updateExpenseDto.paymentDate) : null;
    }
    if (updateExpenseDto.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(updateExpenseDto.amount);
    }

    const expense = await this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        bank: true,
      },
    });

    // Recalcular paymentDate se não foi informado
    const newPaymentDate = expense.paymentDate || expense.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newPaymentMethod = updateExpenseDto.paymentMethod !== undefined 
      ? updateExpenseDto.paymentMethod 
      : oldExpense.paymentMethod;

    // Atualizar saldo do banco automaticamente APENAS se:
    // 1. Tem banco associado
    // 2. paymentDate <= hoje (não é lançamento futuro)
    // 3. paymentMethod não é CREDIT
    const shouldUpdateBalance = 
      expense.bankId &&
      newPaymentDate <= today &&
      newPaymentMethod !== PaymentMethod.CREDIT;

    if (this.banksService) {
      const oldAmount = Number(oldExpense.amount);
      const newAmount = updateExpenseDto.amount !== undefined ? updateExpenseDto.amount : oldAmount;
      const oldBankId = oldExpense.bankId;
      const newBankId = updateExpenseDto.bankId !== undefined ? updateExpenseDto.bankId : oldBankId;

      // Reverter saldo antigo se necessário
      const oldPaymentDate = oldExpense.paymentDate || oldExpense.date;
      const oldShouldUpdate = oldBankId && oldPaymentDate <= today && oldExpense.paymentMethod !== PaymentMethod.CREDIT;

      if (oldShouldUpdate && (oldBankId !== newBankId || oldAmount !== newAmount || !shouldUpdateBalance)) {
        // Reverter saldo antigo
        this.banksService
          .updateBalanceFromTransaction(oldBankId, oldAmount, 'expense', 'delete')
          .catch((err) => console.error('Erro ao reverter saldo do banco:', err));
      }

      // Aplicar novo saldo se necessário
      if (shouldUpdateBalance && (oldBankId !== newBankId || oldAmount !== newAmount || !oldShouldUpdate)) {
        this.banksService
          .updateBalanceFromTransaction(newBankId, newAmount, 'expense', 'create')
          .catch((err) => console.error('Erro ao atualizar saldo do banco:', err));
      }
    }

    // Gerar alertas automaticamente (assíncrono, não bloqueia a resposta)
    if (this.alertGeneratorService) {
      this.alertGeneratorService.generateAlertsForUser(userId).catch(() => {
        // Ignorar erros na geração de alertas para não afetar a atualização da despesa
      });
    }

    return expense;
  }

  async remove(id: string, userId: string) {
    // Buscar despesa antes de deletar para atualizar saldo
    const expense = await this.findOne(id, userId);

    await this.prisma.expense.delete({
      where: { id },
    });

    // Atualizar saldo do banco automaticamente
    if (this.banksService && expense.bankId) {
      this.banksService
        .updateBalanceFromTransaction(expense.bankId, Number(expense.amount), 'expense', 'delete')
        .catch((err) => console.error('Erro ao atualizar saldo do banco:', err));
    }
  }

  async getMonthlyTotal(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Buscar apenas despesas não pagas (despesas pagas já foram deduzidas do saldo)
    // E excluir despesas de crédito (que aparecem na fatura)
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        isPaid: false, // Apenas despesas não pagas
        paymentMethod: { not: PaymentMethod.CREDIT }, // Excluir crédito
        OR: [
          {
            paymentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            paymentDate: null,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
    });

    const total = expenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    return {
      total,
      count: expenses.length,
      year,
      month,
    };
  }

  async getByCategory(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        bank: true,
      },
    });

    const grouped = expenses.reduce((acc, expense) => {
      const categoryName = expense.category?.name || 'Sem categoria';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: expense.category,
          total: 0,
          count: 0,
        };
      }
      acc[categoryName].total += Number(expense.amount);
      acc[categoryName].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }

  async getCreditCardExpenses(userId: string, creditCardBillsService?: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar todas as despesas no crédito
    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        paymentMethod: PaymentMethod.CREDIT,
      },
      include: {
        category: true,
        bank: true,
        paidBank: true,
      },
      orderBy: {
        date: 'desc', // Ordenar por data de lançamento
      },
    });

    // Calcular total
    const total = expenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    // Separar em pagas e não pagas
    // Considera isPaid primeiro, depois paymentDate
    const paid = expenses.filter((expense) => {
      if (expense.isPaid) return true; // Se marcado como pago, sempre considera pago
      const paymentDate = expense.paymentDate 
        ? new Date(expense.paymentDate) 
        : new Date(expense.date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate <= today;
    });

    const unpaid = expenses.filter((expense) => {
      if (expense.isPaid) return false; // Se marcado como pago, não está pendente
      const paymentDate = expense.paymentDate 
        ? new Date(expense.paymentDate) 
        : new Date(expense.date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate > today;
    });

    const paidTotal = paid.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const unpaidTotal = unpaid.reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Buscar saldo atual e receitas futuras para determinar como será pago
    const currentBalance = this.banksService 
      ? (await this.banksService.getTotalBalance(userId)).total 
      : 0;
    
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const futureReceipts = await this.prisma.receipt.findMany({
      where: {
        userId,
        date: {
          gt: today,
          lte: lastDayOfMonth,
        },
      },
    });
    
    const futureReceiptsTotal = futureReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
    const availableBalance = currentBalance + futureReceiptsTotal;

    // Função para determinar como será pago
    const getPaymentSource = (expense: any) => {
      const expenseAmount = Number(expense.amount);
      const paymentDate = expense.paymentDate ? new Date(expense.paymentDate) : new Date(expense.date);
      
      if (expense.isPaid) {
        return { type: 'paid', label: 'Já paga' };
      }
      
      if (paymentDate <= today) {
        // Se a data de pagamento já passou, verifica se tem saldo
        if (currentBalance >= expenseAmount) {
          return { type: 'current_balance', label: 'Com saldo atual' };
        } else {
          return { type: 'future_receipts', label: 'Com receitas futuras' };
        }
      } else {
        // Se é futuro, verifica se terá saldo disponível
        if (availableBalance >= expenseAmount) {
          if (currentBalance >= expenseAmount) {
            return { type: 'current_balance', label: 'Com saldo atual' };
          } else {
            return { type: 'future_receipts', label: 'Com receitas futuras' };
          }
        } else {
          return { type: 'insufficient', label: 'Saldo insuficiente' };
        }
      }
    };

    // Buscar fatura do mês atual se o serviço estiver disponível
    let currentMonthBill = null;
    if (this.creditCardBillsService) {
      try {
        currentMonthBill = await this.creditCardBillsService.getCurrentMonthBill(userId);
      } catch (error) {
        // Ignorar erro se o serviço não estiver disponível ou se houver erro na busca
        console.error('Erro ao buscar fatura do mês atual:', error);
      }
    }

    return {
      total,
      paidTotal,
      unpaidTotal,
      paid: paid.map((e) => {
        const paymentSource = getPaymentSource(e);
        return {
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date,
          paymentDate: e.paymentDate || e.date,
          isPaid: e.isPaid,
          paymentSource,
          category: e.category,
          bank: e.bank,
          paidBank: e.paidBank,
        };
      }),
      unpaid: unpaid.map((e) => {
        const paymentSource = getPaymentSource(e);
        return {
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date,
          paymentDate: e.paymentDate || e.date,
          isPaid: e.isPaid,
          paymentSource,
          category: e.category,
          bank: e.bank,
          paidBank: e.paidBank,
        };
      }),
      bill: currentMonthBill
        ? {
            id: currentMonthBill.id,
            description: currentMonthBill.description,
            closingDate: currentMonthBill.closingDate,
            dueDate: currentMonthBill.dueDate,
            bestPurchaseDate: currentMonthBill.bestPurchaseDate,
            totalAmount: Number(currentMonthBill.totalAmount),
            isPaid: currentMonthBill.isPaid,
            bank: currentMonthBill.bank,
          }
        : null,
    };
  }

  async markAsPaid(id: string, userId: string, paymentBankId?: string) {
    const expense = await this.findOne(id, userId);
    
    // Determinar qual banco usar para pagar
    const bankIdToUse = paymentBankId || expense.bankId;
    
    // Validar banco se fornecido
    if (paymentBankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: paymentBankId },
      });
      
      if (!bank) {
        throw new NotFoundException('Banco não encontrado');
      }
      
      if (bank.userId !== userId) {
        throw new ForbiddenException('Banco não pertence ao usuário');
      }
    }
    
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { 
        isPaid: true,
        paidBankId: bankIdToUse || null,
      },
      include: {
        category: true,
        bank: true,
        paidBank: true,
      },
    });

    // Atualizar saldo do banco quando marcar como pago
    // Se o usuário selecionou um banco para pagar, SEMPRE atualiza o saldo desse banco
    // (subtrai o valor da despesa do saldo)
    if (this.banksService && bankIdToUse) {
      try {
        // Se a despesa já estava marcada como paga antes, não atualiza novamente
        // (evita duplicar a subtração)
        if (!expense.isPaid) {
          await this.banksService.updateBalanceFromTransaction(
            bankIdToUse,
            Number(expense.amount),
            'expense',
            'create' // 'create' subtrai do saldo para despesas
          );
        }
      } catch (error) {
        console.error('Erro ao atualizar saldo do banco:', error);
        throw error; // Propaga o erro para que o usuário saiba que algo deu errado
      }
    }

    // Recalcular fatura se for despesa de crédito
    // Também recalcular faturas futuras que podem ter sido afetadas
    if (expense.paymentMethod === PaymentMethod.CREDIT && this.creditCardBillsService) {
      try {
        await this.creditCardBillsService.recalculateBillTotal(userId, expense.bankId);
        // Gerar/atualizar faturas futuras se necessário
        await this.creditCardBillsService.generateFutureBills(userId, 5, expense.bankId);
      } catch (error) {
        console.error('Erro ao recalcular fatura:', error);
      }
    }

    return updated;
  }

  async markAsUnpaid(id: string, userId: string) {
    const expense = await this.findOne(id, userId);
    
    // Reverter saldo do banco ANTES de atualizar (para ter o valor correto)
    // Se a despesa estava paga e tinha um banco associado, reverte o saldo
    if (this.banksService && expense.isPaid && expense.paidBankId) {
      try {
        // 'delete' adiciona de volta ao saldo (reverte a subtração)
        await this.banksService.updateBalanceFromTransaction(
          expense.paidBankId,
          Number(expense.amount),
          'expense',
          'delete'
        );
      } catch (error) {
        console.error('Erro ao reverter saldo do banco:', error);
        throw error; // Propaga o erro para que o usuário saiba que algo deu errado
      }
    }
    
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { 
        isPaid: false,
        paidBankId: null,
      },
      include: {
        category: true,
        bank: true,
        paidBank: true,
      },
    });

    // Recalcular fatura se for despesa de crédito
    // Também recalcular faturas futuras que podem ter sido afetadas
    if (expense.paymentMethod === PaymentMethod.CREDIT && this.creditCardBillsService) {
      try {
        await this.creditCardBillsService.recalculateBillTotal(userId, expense.bankId);
        // Gerar/atualizar faturas futuras se necessário
        await this.creditCardBillsService.generateFutureBills(userId, 5, expense.bankId);
      } catch (error) {
        console.error('Erro ao recalcular fatura:', error);
      }
    }

    return updated;
  }
}

