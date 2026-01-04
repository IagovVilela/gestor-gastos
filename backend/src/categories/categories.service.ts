import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto) {
    // Verificar se categoria pai existe e pertence ao usuário (se fornecida)
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }

      if (parent.userId !== userId) {
        throw new ForbiddenException('Categoria pai não pertence ao usuário');
      }
    }

    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        userId,
      },
      include: {
        parent: true,
        subcategories: true,
      },
    });
  }

  async findAll(userId: string, type?: CategoryType) {
    const where: any = { userId };
    if (type) {
      where.type = { in: [type, CategoryType.BOTH] };
    }

    return this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        subcategories: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: {
            receipts: true,
            expenses: true,
            goals: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (category.userId !== userId) {
      throw new ForbiddenException('Categoria não pertence ao usuário');
    }

    return category;
  }

  async update(id: string, userId: string, updateCategoryDto: UpdateCategoryDto) {
    // Verificar se categoria existe e pertence ao usuário
    await this.findOne(id, userId);

    // Verificar categoria pai se fornecida
    if (updateCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Categoria pai não encontrada');
      }

      if (parent.userId !== userId) {
        throw new ForbiddenException('Categoria pai não pertence ao usuário');
      }

      // Evitar criar loop (categoria não pode ser pai de si mesma)
      if (parent.parentId === id) {
        throw new ForbiddenException('Não é possível criar hierarquia circular');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        subcategories: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verificar se categoria existe e pertence ao usuário
    await this.findOne(id, userId);

    // Verificar se tem subcategorias
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true,
      },
    });

    if (category.subcategories.length > 0) {
      throw new ForbiddenException('Não é possível deletar categoria com subcategorias');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}


