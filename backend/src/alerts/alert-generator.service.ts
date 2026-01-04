import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from './alerts.service';
import { GoalsService } from '../goals/goals.service';
import { ExpensesService } from '../expenses/expenses.service';
import { ReceiptsService } from '../receipts/receipts.service';

@Injectable()
export class AlertGeneratorService {
  constructor(
    private prisma: PrismaService,
    private alertsService: AlertsService,
    private goalsService: GoalsService,
    private expensesService: ExpensesService,
    private receiptsService: ReceiptsService,
  ) {}

  /**
   * Gera alertas automáticos para um usuário
   */
  async generateAlertsForUser(userId: string): Promise<number> {
    let alertsGenerated = 0;

    // Verificar metas
    alertsGenerated += await this.checkGoals(userId);

    // Verificar orçamento mensal
    alertsGenerated += await this.checkMonthlyBudget(userId);

    // Verificar limites de categoria
    alertsGenerated += await this.checkCategoryLimits(userId);

    // Verificar pagamentos recorrentes próximos
    alertsGenerated += await this.checkRecurringPayments(userId);

    return alertsGenerated;
  }

  /**
   * Verifica metas e gera alertas quando necessário
   */
  private async checkGoals(userId: string): Promise<number> {
    let alertsGenerated = 0;
    const now = new Date();
    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
        isCompleted: false,
      },
      include: {
        category: true,
      },
    });

    for (const goal of goals) {
      // Calcular progresso atual
      const progress = await this.goalsService.calculateProgress(userId, goal.id);
      const progressPercentage = (Number(progress.currentAmount) / Number(goal.targetAmount)) * 100;

      // Verificar se meta foi alcançada
      if (progress.isCompleted && !goal.isCompleted) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'GOAL_ACHIEVED',
            relatedGoalId: goal.id,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: 'Meta Alcançada! 🎉',
            message: `Parabéns! Você alcançou sua meta "${goal.name}". Valor atual: R$ ${Number(progress.currentAmount).toFixed(2)}`,
            type: 'GOAL_ACHIEVED',
            severity: 'SUCCESS',
            relatedGoalId: goal.id,
          });
          alertsGenerated++;
        }
      }
      // Aviso se está próximo (80-99%)
      else if (progressPercentage >= 80 && progressPercentage < 100) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'GOAL_WARNING',
            relatedGoalId: goal.id,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: 'Meta Próxima!',
            message: `Você está ${progressPercentage.toFixed(0)}% da sua meta "${goal.name}". Faltam R$ ${(Number(goal.targetAmount) - Number(progress.currentAmount)).toFixed(2)}`,
            type: 'GOAL_WARNING',
            severity: 'WARNING',
            relatedGoalId: goal.id,
          });
          alertsGenerated++;
        }
      }
      // Aviso se está muito abaixo (menos de 50% e próximo do prazo)
      else if (progressPercentage < 50 && goal.deadline) {
        const daysUntilDeadline = Math.ceil(
          (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
          const existingAlert = await this.prisma.alert.findFirst({
            where: {
              userId,
              type: 'GOAL_WARNING',
              relatedGoalId: goal.id,
              isRead: false,
              createdAt: {
                gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Últimos 3 dias
              },
            },
          });

          if (!existingAlert) {
            await this.alertsService.create(userId, {
              title: 'Atenção: Meta com Prazo Próximo',
              message: `Sua meta "${goal.name}" está ${progressPercentage.toFixed(0)}% completa e faltam apenas ${daysUntilDeadline} dia(s).`,
              type: 'GOAL_WARNING',
              severity: 'WARNING',
              relatedGoalId: goal.id,
            });
            alertsGenerated++;
          }
        }
      }
    }

    return alertsGenerated;
  }

  /**
   * Verifica orçamento mensal e gera alertas se excedido
   */
  private async checkMonthlyBudget(userId: string): Promise<number> {
    let alertsGenerated = 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Buscar metas de orçamento mensal
    const budgetGoals = await this.prisma.goal.findMany({
      where: {
        userId,
        type: 'MONTHLY_BUDGET',
        isCompleted: false,
      },
    });

    if (budgetGoals.length === 0) {
      return 0;
    }

    // Calcular despesas do mês
    const expensesTotal = await this.expensesService.getMonthlyTotal(userId, year, month);
    const totalExpenses = expensesTotal.total;

    for (const goal of budgetGoals) {
      const budgetLimit = Number(goal.targetAmount);
      const percentage = (totalExpenses / budgetLimit) * 100;

      // Alerta se excedeu 100%
      if (totalExpenses > budgetLimit) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'BUDGET_EXCEEDED',
            relatedGoalId: goal.id,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: 'Orçamento Mensal Excedido!',
            message: `Você excedeu seu orçamento mensal de R$ ${budgetLimit.toFixed(2)}. Gasto atual: R$ ${totalExpenses.toFixed(2)} (${percentage.toFixed(0)}%)`,
            type: 'BUDGET_EXCEEDED',
            severity: 'ERROR',
            relatedGoalId: goal.id,
          });
          alertsGenerated++;
        }
      }
      // Aviso se está próximo (80-100%)
      else if (percentage >= 80 && percentage < 100) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'BUDGET_EXCEEDED',
            relatedGoalId: goal.id,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Últimos 3 dias
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: 'Atenção: Orçamento Próximo do Limite',
            message: `Você já gastou ${percentage.toFixed(0)}% do seu orçamento mensal. Restam R$ ${(budgetLimit - totalExpenses).toFixed(2)}`,
            type: 'BUDGET_EXCEEDED',
            severity: 'WARNING',
            relatedGoalId: goal.id,
          });
          alertsGenerated++;
        }
      }
    }

    return alertsGenerated;
  }

  /**
   * Verifica limites de categoria e gera alertas se ultrapassados
   */
  private async checkCategoryLimits(userId: string): Promise<number> {
    let alertsGenerated = 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Buscar metas de limite por categoria
    const categoryLimitGoals = await this.prisma.goal.findMany({
      where: {
        userId,
        type: 'CATEGORY_LIMIT',
        isCompleted: false,
        categoryId: { not: null },
      },
      include: {
        category: true,
      },
    });

    if (categoryLimitGoals.length === 0) {
      return 0;
    }

    // Buscar despesas por categoria do mês
    const expensesByCategory = await this.expensesService.getByCategory(userId, year, month);

    for (const goal of categoryLimitGoals) {
      if (!goal.categoryId) continue;

      const categoryExpenses = expensesByCategory.find(
        (cat) => cat.categoryId === goal.categoryId,
      );
      const categoryTotal = categoryExpenses?.total || 0;
      const limit = Number(goal.targetAmount);
      const percentage = (categoryTotal / limit) * 100;

      // Alerta se excedeu
      if (categoryTotal > limit) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'CATEGORY_LIMIT',
            relatedGoalId: goal.id,
            relatedCategoryId: goal.categoryId,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: `Limite de Categoria Excedido: ${goal.category?.name}`,
            message: `Você excedeu o limite de R$ ${limit.toFixed(2)} na categoria "${goal.category?.name}". Gasto atual: R$ ${categoryTotal.toFixed(2)} (${percentage.toFixed(0)}%)`,
            type: 'CATEGORY_LIMIT',
            severity: 'ERROR',
            relatedGoalId: goal.id,
            relatedCategoryId: goal.categoryId,
          });
          alertsGenerated++;
        }
      }
      // Aviso se está próximo (80-100%)
      else if (percentage >= 80 && percentage < 100) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'CATEGORY_LIMIT',
            relatedGoalId: goal.id,
            relatedCategoryId: goal.categoryId,
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Últimos 3 dias
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: `Atenção: Limite de Categoria Próximo`,
            message: `Você já gastou ${percentage.toFixed(0)}% do limite na categoria "${goal.category?.name}". Restam R$ ${(limit - categoryTotal).toFixed(2)}`,
            type: 'CATEGORY_LIMIT',
            severity: 'WARNING',
            relatedGoalId: goal.id,
            relatedCategoryId: goal.categoryId,
          });
          alertsGenerated++;
        }
      }
    }

    return alertsGenerated;
  }

  /**
   * Verifica pagamentos recorrentes próximos e gera alertas
   */
  private async checkRecurringPayments(userId: string): Promise<number> {
    let alertsGenerated = 0;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Buscar despesas recorrentes
    const recurringExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        isRecurring: true,
      },
      include: {
        category: true,
      },
    });

    for (const expense of recurringExpenses) {
      if (!expense.recurringType || !expense.recurringNextDate) continue;

      const nextDate = new Date(expense.recurringNextDate);
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Alerta se está próximo (1-3 dias)
      if (daysUntil >= 1 && daysUntil <= 3) {
        const existingAlert = await this.prisma.alert.findFirst({
          where: {
            userId,
            type: 'RECURRING_PAYMENT',
            message: { contains: expense.description },
            isRead: false,
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            },
          },
        });

        if (!existingAlert) {
          await this.alertsService.create(userId, {
            title: `Pagamento Recorrente Próximo: ${expense.description}`,
            message: `O pagamento recorrente "${expense.description}" (R$ ${Number(expense.amount).toFixed(2)}) vence em ${daysUntil} dia(s) (${nextDate.toLocaleDateString('pt-BR')})`,
            type: 'RECURRING_PAYMENT',
            severity: daysUntil === 1 ? 'WARNING' : 'INFO',
            relatedCategoryId: expense.categoryId || undefined,
          });
          alertsGenerated++;
        }
      }
    }

    return alertsGenerated;
  }
}

