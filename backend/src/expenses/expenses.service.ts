import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { AlertGeneratorService } from '../alerts/alert-generator.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => AlertGeneratorService))
    private alertGeneratorService?: AlertGeneratorService,
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

    const expense = await this.prisma.expense.create({
      data: {
        ...createExpenseDto,
        date: new Date(createExpenseDto.date),
        userId,
      },
      include: {
        category: true,
      },
    });

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

    return this.prisma.expense.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
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
    // Verificar se despesa existe e pertence ao usuário
    await this.findOne(id, userId);

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

    const expense = await this.prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // Gerar alertas automaticamente (assíncrono, não bloqueia a resposta)
    if (this.alertGeneratorService) {
      this.alertGeneratorService.generateAlertsForUser(userId).catch(() => {
        // Ignorar erros na geração de alertas para não afetar a atualização da despesa
      });
    }

    return expense;
  }

  async remove(id: string, userId: string) {
    // Verificar se despesa existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.expense.delete({
      where: { id },
    });
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
}

