import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BanksService } from '../banks/banks.service';
import { CreditCardBillsService } from '../credit-card-bills/credit-card-bills.service';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private banksService: BanksService,
    @Inject(forwardRef(() => CreditCardBillsService))
    private creditCardBillsService?: CreditCardBillsService,
  ) {}

  async getProjectedBalance(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Primeiro e último dia do mês atual
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);

    // Saldo atual de todos os bancos
    const { total: currentBalance } = await this.banksService.getTotalBalance(userId);

    // Buscar TODAS as receitas do mês (já recebidas + futuras)
    const allReceipts = await this.prisma.receipt.findMany({
      where: {
        userId,
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        bank: {
          select: {
            name: true,
          },
        },
      },
    });

    // Buscar TODAS as despesas do mês (já pagas + futuras)
    // Mas apenas as que NÃO são crédito (crédito não afeta saldo até pagar)
    const allExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        OR: [
          {
            paymentDate: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
            paymentMethod: {
              not: PaymentMethod.CREDIT,
            },
          },
          {
            paymentDate: null,
            date: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
            paymentMethod: {
              not: PaymentMethod.CREDIT,
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        bank: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'asc',
      },
    });

    // Separar receitas em já recebidas e futuras
    const pastReceipts = allReceipts.filter((r) => new Date(r.date) <= today);
    const futureReceipts = allReceipts.filter((r) => new Date(r.date) > today);

    // Separar despesas em já pagas e futuras
    const pastExpenses = allExpenses.filter((e) => {
      const paymentDate = e.paymentDate || e.date;
      return new Date(paymentDate) <= today;
    });
    const futureExpenses = allExpenses.filter((e) => {
      const paymentDate = e.paymentDate || e.date;
      return new Date(paymentDate) > today;
    });

    // Calcular totais
    const totalReceipts = allReceipts.reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0,
    );

    const totalExpenses = allExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    const futureReceiptsTotal = futureReceipts.reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0,
    );

    const futureExpensesTotal = futureExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Buscar fatura do cartão do mês atual
    const currentMonthBill = this.creditCardBillsService
      ? await this.creditCardBillsService.getCurrentMonthBill(userId)
      : null;

    // Calcular total da fatura do cartão (despesas de crédito do mês)
    const creditCardExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        paymentMethod: PaymentMethod.CREDIT,
        date: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        category: {
          select: {
            name: true,
            color: true,
          },
        },
        bank: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const creditCardTotal = creditCardExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Calcular fases do saldo
    // Fase 1: Saldo Atual
    const phase1 = currentBalance;

    // Fase 2: Após receber todas as receitas do mês
    const phase2 = phase1 + totalReceipts;

    // Fase 3: Após pagar despesas mensais (exceto cartão)
    const phase3 = phase2 - totalExpenses;

    // Fase 4: Após pagar fatura do cartão (no vencimento)
    const phase4 = phase3 - creditCardTotal;

    // Saldo projetado = saldo atual + (receitas totais do mês - despesas totais do mês - fatura do cartão)
    const monthlyBalance = totalReceipts - totalExpenses - creditCardTotal;
    const projectedBalance = currentBalance + monthlyBalance;

    return {
      currentBalance,
      totalReceipts,
      totalExpenses,
      creditCardTotal,
      monthlyBalance, // Receitas totais - Despesas totais - Fatura do cartão
      futureReceiptsTotal,
      futureExpensesTotal,
      projectedBalance,
      futureReceiptsCount: futureReceipts.length,
      futureExpensesCount: futureExpenses.length,
      pastReceiptsCount: pastReceipts.length,
      pastExpensesCount: pastExpenses.length,
      // Fases do saldo
      phases: {
        phase1: {
          name: 'Saldo Atual',
          description: 'O que você tem hoje',
          balance: phase1,
          date: today,
        },
        phase2: {
          name: 'Após Receber Receitas',
          description: 'Após receber todas as receitas do mês',
          balance: phase2,
          date: lastDayOfMonth,
        },
        phase3: {
          name: 'Após Pagar Despesas',
          description: 'Após pagar despesas mensais (exceto cartão)',
          balance: phase3,
          date: lastDayOfMonth,
        },
        phase4: {
          name: 'Após Pagar Fatura',
          description: currentMonthBill
            ? `Após pagar fatura do cartão (vencimento: ${new Date(currentMonthBill.dueDate).toLocaleDateString('pt-BR')})`
            : 'Após pagar fatura do cartão',
          balance: phase4,
          date: currentMonthBill ? new Date(currentMonthBill.dueDate) : lastDayOfMonth,
        },
      },
      creditCardBill: currentMonthBill
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
      futureReceipts: futureReceipts.map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        date: r.date,
        category: r.category ? { name: r.category.name, color: r.category.color } : null,
        bank: r.bank ? { name: r.bank.name } : null,
      })),
      futureExpenses: futureExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.paymentDate || e.date,
        category: e.category ? { name: e.category.name, color: e.category.color } : null,
        bank: e.bank ? { name: e.bank.name } : null,
        paymentMethod: e.paymentMethod,
      })),
      // Detalhes das despesas mensais (Fase 3)
      monthlyExpenses: allExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.paymentDate || e.date,
        category: e.category ? { name: e.category.name, color: e.category.color } : null,
        bank: e.bank ? { name: e.bank.name } : null,
        paymentMethod: e.paymentMethod,
      })),
      // Detalhes da fatura do cartão (Fase 4)
      creditCardExpensesDetails: creditCardExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        category: e.category ? { name: e.category.name, color: e.category.color } : null,
        bank: e.bank ? { name: e.bank.name } : null,
      })),
    };
  }
}

