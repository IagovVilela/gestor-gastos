import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createReceiptDto: CreateReceiptDto) {
    // Verificar se categoria existe e pertence ao usuário (se fornecida)
    if (createReceiptDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: createReceiptDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    return this.prisma.receipt.create({
      data: {
        ...createReceiptDto,
        date: new Date(createReceiptDto.date),
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  async findAll(userId: string, query: QueryReceiptDto) {
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

    if (query.search) {
      // MySQL não suporta mode: 'insensitive', mas geralmente é case-insensitive por padrão
      where.description = {
        contains: query.search,
      };
    }

    if (query.isRecurring !== undefined) {
      where.isRecurring = query.isRecurring;
    }

    return this.prisma.receipt.findMany({
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
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receita não encontrada');
    }

    if (receipt.userId !== userId) {
      throw new ForbiddenException('Receita não pertence ao usuário');
    }

    return receipt;
  }

  async update(id: string, userId: string, updateReceiptDto: UpdateReceiptDto) {
    // Verificar se receita existe e pertence ao usuário
    await this.findOne(id, userId);

    // Verificar categoria se fornecida
    if (updateReceiptDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateReceiptDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }

      if (category.userId !== userId) {
        throw new ForbiddenException('Categoria não pertence ao usuário');
      }
    }

    const updateData: any = { ...updateReceiptDto };
    if (updateReceiptDto.date) {
      updateData.date = new Date(updateReceiptDto.date);
    }

    return this.prisma.receipt.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verificar se receita existe e pertence ao usuário
    await this.findOne(id, userId);

    return this.prisma.receipt.delete({
      where: { id },
    });
  }

  async getMonthlyTotal(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const receipts = await this.prisma.receipt.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const total = receipts.reduce((sum, receipt) => {
      return sum + Number(receipt.amount);
    }, 0);

    return {
      total,
      count: receipts.length,
      year,
      month,
    };
  }

  async getByCategory(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const receipts = await this.prisma.receipt.findMany({
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

    // Agrupar por categoria
    const grouped = receipts.reduce((acc, receipt) => {
      const categoryId = receipt.categoryId || 'sem-categoria';
      const categoryName = receipt.category?.name || 'Sem categoria';

      if (!acc[categoryId]) {
        acc[categoryId] = {
          categoryId: categoryId === 'sem-categoria' ? null : categoryId,
          category: receipt.category || null,
          total: 0,
          count: 0,
        };
      }

      acc[categoryId].total += Number(receipt.amount);
      acc[categoryId].count += 1;

      return acc;
    }, {} as Record<string, { categoryId: string | null; category: any; total: number; count: number }>);

    return Object.values(grouped);
  }
}

