import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Meta não encontrada');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('Meta não pertence ao usuário');
    }

    return goal;
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
    const goal = await this.findOne(goalId, userId);

    // Calcular progresso baseado no tipo de meta
    let currentAmount = Number(goal.currentAmount);

    if (goal.type === 'EXPENSE_LIMIT' || goal.type === 'CATEGORY_LIMIT') {
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
      // Para economia, calcular receitas - despesas
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
          },
        }),
      ]);

      const receiptsTotal = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
      const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      currentAmount = receiptsTotal - expensesTotal;
    }

    const isCompleted = currentAmount >= Number(goal.targetAmount);

    return this.prisma.goal.update({
      where: { id: goalId },
      data: {
        currentAmount,
        isCompleted,
      },
      include: {
        category: true,
      },
    });
  }
}


