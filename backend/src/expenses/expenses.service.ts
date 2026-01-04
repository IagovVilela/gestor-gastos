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

    return expense;
  }

  async findAll(userId: string, query: QueryExpenseDto) {
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

    const updateData: any = { ...updateExpenseDto };
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

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
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
    const paid = expenses.filter((expense) => {
      const paymentDate = expense.paymentDate 
        ? new Date(expense.paymentDate) 
        : new Date(expense.date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate <= today;
    });

    const unpaid = expenses.filter((expense) => {
      const paymentDate = expense.paymentDate 
        ? new Date(expense.paymentDate) 
        : new Date(expense.date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate > today;
    });

    const paidTotal = paid.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const unpaidTotal = unpaid.reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Buscar fatura do mês atual se o serviço estiver disponível
    let currentMonthBill = null;
    if (this.creditCardBillsService) {
      try {
        currentMonthBill = await this.creditCardBillsService.getCurrentMonthBill(userId);
      } catch (error) {
        // Ignorar erro se o serviço não estiver disponível
      }
    }

    return {
      total,
      paidTotal,
      unpaidTotal,
      paid: paid.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        paymentDate: e.paymentDate || e.date,
        category: e.category,
        bank: e.bank,
      })),
      unpaid: unpaid.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        paymentDate: e.paymentDate || e.date,
        category: e.category,
        bank: e.bank,
      })),
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
}

