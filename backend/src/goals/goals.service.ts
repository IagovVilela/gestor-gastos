import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => DashboardService))
    private dashboardService?: DashboardService,
  ) {}

  async create(userId: string, createGoalDto: CreateGoalDto) {
    // Verificar se categoria existe e pertence ao usuário (se fornecida)
    if (createGoalDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: createGoalDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    return this.prisma.goal.create({
      data: {
        ...createGoalDto,
        deadline: createGoalDto.deadline ? new Date(createGoalDto.deadline) : null,
        userId,
        currentAmount: 0,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Calcula economia mensal média baseada nas receitas e despesas dos últimos 3 meses
   */
  private async calculateMonthlySavings(userId: string): Promise<number> {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    
    const [receipts, expenses] = await Promise.all([
      this.prisma.receipt.findMany({
        where: {
          userId,
          date: { gte: threeMonthsAgo },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          userId,
          date: { gte: threeMonthsAgo },
          paymentMethod: { not: 'CREDIT' }, // Excluir crédito (já está na fatura)
        },
      }),
    ]);

    const totalReceipts = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalSavings = totalReceipts - totalExpenses;

    // Calcular média mensal (dividir por 3 meses)
    return Math.max(0, totalSavings / 3); // Não permitir valores negativos
  }

  async findAll(userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      include: {
        category: true,
        savingsAccount: {
          select: {
            id: true,
            name: true,
            currentAmount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular economia mensal média
    const monthlySavings = await this.calculateMonthlySavings(userId);

    // Adicionar informações calculadas para cada meta
    return goals.map((goal) => {
      // Se houver poupança associada, usar o valor guardado na poupança
      let currentAmount = Number(goal.currentAmount);
      if (goal.savingsAccount) {
        currentAmount = Number(goal.savingsAccount.currentAmount);
      }

      // Garantir que nunca seja negativo
      currentAmount = Math.max(0, currentAmount);

      const remaining = Math.max(0, Number(goal.targetAmount) - currentAmount);
      const monthsNeeded = monthlySavings > 0 && remaining > 0 ? Math.ceil(remaining / monthlySavings) : null;
      const estimatedDate = monthsNeeded
        ? new Date(new Date().setMonth(new Date().getMonth() + monthsNeeded))
        : null;

      return {
        ...goal,
        currentAmount: currentAmount, // Usar valor da poupança se houver
        remainingAmount: remaining,
        monthlySavingsNeeded: monthlySavings > 0 && monthsNeeded ? remaining / monthsNeeded : null,
        monthsNeeded,
        estimatedCompletionDate: estimatedDate,
        monthlySavingsAverage: monthlySavings,
      };
    });
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        category: true,
        savingsAccount: {
          select: {
            id: true,
            name: true,
            currentAmount: true,
          },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('Meta não pertence ao usuário');
    }

    // Se houver poupança associada, usar o valor guardado na poupança
    let currentAmount = Number(goal.currentAmount);
    if (goal.savingsAccount) {
      currentAmount = Number(goal.savingsAccount.currentAmount);
    }

    // Garantir que nunca seja negativo
    currentAmount = Math.max(0, currentAmount);

    // Calcular economia mensal média
    const monthlySavings = await this.calculateMonthlySavings(userId);
    const remaining = Math.max(0, Number(goal.targetAmount) - currentAmount);
    const monthsNeeded = monthlySavings > 0 && remaining > 0 ? Math.ceil(remaining / monthlySavings) : null;
    const estimatedDate = monthsNeeded
      ? new Date(new Date().setMonth(new Date().getMonth() + monthsNeeded))
      : null;

    return {
      ...goal,
      currentAmount: currentAmount, // Usar valor da poupança se houver
      remainingAmount: remaining,
      monthlySavingsNeeded: monthlySavings > 0 && monthsNeeded ? remaining / monthsNeeded : null,
      monthsNeeded,
      estimatedCompletionDate: estimatedDate,
      monthlySavingsAverage: monthlySavings,
    };
  }

  async update(id: string, userId: string, updateGoalDto: UpdateGoalDto) {
    // Verificar se meta existe e pertence ao usuário
    await this.findOne(id, userId);

    // Verificar categoria se fornecida
    if (updateGoalDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateGoalDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    const updateData: any = { ...updateGoalDto };
    if (updateGoalDto.deadline) {
      updateData.deadline = new Date(updateGoalDto.deadline);
    }

    // Calcular progresso
    if (updateData.targetAmount !== undefined) {
      const goal = await this.prisma.goal.findUnique({ where: { id } });
      const progress = (Number(goal.currentAmount) / Number(updateData.targetAmount)) * 100;
      updateData.isCompleted = progress >= 100;
    }

    return this.prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verificar se meta existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.goal.delete({
      where: { id },
    });
  }

  async updateProgress(id: string, userId: string, amount: number) {
    const goal = await this.findOne(id, userId);

    const newAmount = Number(goal.currentAmount) + amount;
    const isCompleted = newAmount >= Number(goal.targetAmount);

    return this.prisma.goal.update({
      where: { id },
      data: {
        currentAmount: newAmount,
        isCompleted,
      },
      include: {
        category: true,
      },
    });
  }

  async calculateProgress(userId: string, goalId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        savingsAccount: {
          select: {
            id: true,
            currentAmount: true,
          },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('Meta não pertence ao usuário');
    }

    // Calcular progresso baseado no tipo de meta
    let currentAmount = Number(goal.currentAmount);

    // PRIORIDADE: Se houver poupança associada, usar o valor guardado na poupança
    if (goal.savingsAccount) {
      currentAmount = Number(goal.savingsAccount.currentAmount);
    } else if (goal.type === 'EXPENSE_LIMIT' || goal.type === 'CATEGORY_LIMIT') {
      // Para limites, calcular baseado nas despesas
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const where: any = {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (goal.categoryId) {
        where.categoryId = goal.categoryId;
      }

      const expenses = await this.prisma.expense.findMany({ where });
      currentAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    } else if (goal.type === 'SAVINGS') {
      // Para economia sem poupança, usar o saldo projetado (após pagar todas as contas)
      if (this.dashboardService) {
        const projectedBalance = await this.dashboardService.getProjectedBalance(userId);
        // O saldo projetado já considera todas as receitas e despesas do mês
        // Usar a fase 4 (após pagar fatura do cartão) como valor atual
        currentAmount = Math.max(0, Number(projectedBalance.phases.phase4.balance));
      } else {
        // Fallback: calcular receitas - despesas se DashboardService não estiver disponível
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [receipts, expenses] = await Promise.all([
          this.prisma.receipt.findMany({
            where: {
              userId,
              date: { gte: startDate, lte: endDate },
            },
          }),
          this.prisma.expense.findMany({
            where: {
              userId,
              date: { gte: startDate, lte: endDate },
              isPaid: false,
              paymentMethod: { not: 'CREDIT' },
            },
          }),
        ]);

        const receiptsTotal = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
        const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const monthlySavings = receiptsTotal - expensesTotal;
        currentAmount = Math.max(0, Number(goal.currentAmount) + Math.max(0, monthlySavings));
      }
    }

    // Garantir que currentAmount nunca seja negativo
    currentAmount = Math.max(0, currentAmount);
    const isCompleted = currentAmount >= Number(goal.targetAmount);

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount,
        isCompleted,
      },
      include: {
        category: true,
        savingsAccount: {
          select: {
            id: true,
            name: true,
            currentAmount: true,
          },
        },
      },
    });
  }
}


