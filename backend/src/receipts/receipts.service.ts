import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { BanksService } from '../banks/banks.service';
import { Prisma } from '@prisma/client';
import { PaymentScheduleItemDto } from './dto/payment-schedule.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BanksService))
    private banksService?: BanksService,
  ) {}

  /**
   * Valida o paymentSchedule
   */
  private validatePaymentSchedule(items: PaymentScheduleItemDto[], totalAmount: number) {
    if (!items || items.length === 0) {
      throw new BadRequestException('PaymentSchedule deve ter pelo menos um item');
    }

    let totalPercentage = 0;
    let totalFixed = 0;

    for (const item of items) {
      if (item.day < -1 || item.day > 31 || (item.day === 0)) {
        throw new BadRequestException(`Dia inválido: ${item.day}. Deve ser entre 1-31 ou -1 (último dia)`);
      }

      if (item.usePercentage === false) {
        totalFixed += item.value;
      } else {
        totalPercentage += item.value;
      }
    }

    // Se usar percentuais, deve somar 100%
    if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException(`A soma dos percentuais deve ser 100%. Atual: ${totalPercentage}%`);
    }

    // Se usar valores fixos, deve somar o valor total
    if (totalFixed > 0 && Math.abs(totalFixed - totalAmount) > 0.01) {
      throw new BadRequestException(`A soma dos valores fixos deve ser igual ao valor total. Atual: R$ ${totalFixed.toFixed(2)}, Esperado: R$ ${totalAmount.toFixed(2)}`);
    }
  }

  /**
   * Cria receitas baseadas no paymentSchedule para o mês atual e próximos meses
   */
  private async createReceiptsFromSchedule(userId: string, createReceiptDto: CreateReceiptDto) {
    if (!createReceiptDto.paymentSchedule || !createReceiptDto.paymentSchedule.items) {
      throw new BadRequestException('PaymentSchedule é obrigatório para receitas recorrentes mensais');
    }

    this.validatePaymentSchedule(createReceiptDto.paymentSchedule.items, createReceiptDto.amount);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Criar receitas para os próximos 12 meses
    const receipts = [];
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const targetMonth = currentMonth + monthOffset;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const actualMonth = targetMonth % 12;

      // Calcular último dia do mês
      const lastDayOfMonth = new Date(targetYear, actualMonth + 1, 0).getDate();

      for (const item of createReceiptDto.paymentSchedule.items) {
        let day = item.day;
        if (day === -1) {
          day = lastDayOfMonth; // Último dia do mês
        }

        // Calcular valor da parcela
        let itemAmount = 0;
        if (item.usePercentage === false) {
          itemAmount = item.value;
        } else {
          itemAmount = (createReceiptDto.amount * item.value) / 100;
        }

        // Data da receita
        const receiptDate = new Date(targetYear, actualMonth, day);
        receiptDate.setHours(0, 0, 0, 0);

        // Criar receita
        const receipt = await this.prisma.receipt.create({
          data: {
            description: `${createReceiptDto.description} - Parcela ${createReceiptDto.paymentSchedule.items.indexOf(item) + 1}/${createReceiptDto.paymentSchedule.items.length}`,
            amount: new Prisma.Decimal(itemAmount),
            date: receiptDate,
            categoryId: createReceiptDto.categoryId || null,
            bankId: createReceiptDto.bankId || null,
            userId,
            isRecurring: false, // Cada parcela individual não é recorrente
            recurringType: null,
            paymentSchedule: null, // Não armazenar schedule nas parcelas individuais
            notes: createReceiptDto.notes || null,
          },
          include: {
            category: true,
            bank: true,
          },
        });

        receipts.push(receipt);

        // Atualizar saldo do banco APENAS se a receita não é futura
        if (this.banksService && createReceiptDto.bankId && receiptDate <= today) {
          this.banksService
            .updateBalanceFromTransaction(createReceiptDto.bankId, itemAmount, 'receipt', 'create')
            .catch((err) => console.error('Erro ao atualizar saldo do banco:', err));
        }
      }
    }

    // Retornar a primeira receita criada (representativa)
    return receipts[0];
  }

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

    const receiptDate = new Date(createReceiptDto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Se tem paymentSchedule e é recorrente mensal, criar receitas baseadas no schedule
    if (createReceiptDto.paymentSchedule && createReceiptDto.isRecurring && createReceiptDto.recurringType === 'MONTHLY') {
      return this.createReceiptsFromSchedule(userId, createReceiptDto);
    }

    // Validar paymentSchedule se fornecido
    if (createReceiptDto.paymentSchedule) {
      this.validatePaymentSchedule(createReceiptDto.paymentSchedule.items, createReceiptDto.amount);
    }

    const receipt = await this.prisma.receipt.create({
      data: {
        ...createReceiptDto,
        date: receiptDate,
        userId,
        amount: new Prisma.Decimal(createReceiptDto.amount),
        paymentSchedule: createReceiptDto.paymentSchedule ? JSON.stringify(createReceiptDto.paymentSchedule) : null,
      },
      include: {
        category: true,
        bank: true,
      },
    });

    // Atualizar saldo do banco automaticamente APENAS se a receita não é futura
    // Receitas futuras (date > hoje) não devem atualizar o saldo até que realmente aconteçam
    if (this.banksService && createReceiptDto.bankId && receiptDate <= today) {
      this.banksService
        .updateBalanceFromTransaction(createReceiptDto.bankId, createReceiptDto.amount, 'receipt', 'create')
        .catch((err) => console.error('Erro ao atualizar saldo do banco:', err));
    }

    return receipt;
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
      where.description = {
        contains: query.search,
      };
    }

    if (query.isRecurring !== undefined) {
      where.isRecurring = query.isRecurring;
    }

    // Paginação
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Buscar dados e total em paralelo
    const [data, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        select: {
          id: true,
          description: true,
          amount: true,
          date: true,
          categoryId: true,
          isRecurring: true,
          recurringType: true,
          notes: true,
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
      this.prisma.receipt.count({ where }),
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
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: {
        category: true,
        bank: true,
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
    // Buscar receita atual para comparar valores
    const oldReceipt = await this.findOne(id, userId);

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
    if (updateReceiptDto.amount !== undefined) {
      updateData.amount = new Prisma.Decimal(updateReceiptDto.amount);
    }
    if (updateReceiptDto.paymentSchedule) {
      updateData.paymentSchedule = JSON.stringify(updateReceiptDto.paymentSchedule);
    }

    // Lógica de atualização de saldo considerando receitas futuras
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oldReceiptDate = new Date(oldReceipt.date);
    const newReceiptDate = updateReceiptDto.date ? new Date(updateReceiptDto.date) : oldReceiptDate;

    const oldAmount = Number(oldReceipt.amount);
    const newAmount = updateReceiptDto.amount !== undefined ? updateReceiptDto.amount : oldAmount;
    const oldBankId = oldReceipt.bankId;
    const newBankId = updateReceiptDto.bankId !== undefined ? updateReceiptDto.bankId : oldBankId;

    // Verificar se a receita antiga afetou o saldo (não era futura)
    const oldShouldUpdateBalance = oldBankId && oldReceiptDate <= today;
    // Verificar se a receita nova deve afetar o saldo (não é futura)
    const newShouldUpdateBalance = newBankId && newReceiptDate <= today;

    const updatedReceipt = await this.prisma.receipt.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        bank: true,
      },
    });

    if (this.banksService) {
      // Reverter saldo antigo se a receita antiga afetou o saldo
      if (oldShouldUpdateBalance && (!newShouldUpdateBalance || oldBankId !== newBankId || oldAmount !== newAmount)) {
        this.banksService
          .updateBalanceFromTransaction(oldBankId, oldAmount, 'receipt', 'delete')
          .catch((err) => console.error('Erro ao reverter saldo do banco antigo:', err));
      }

      // Aplicar novo saldo se a receita nova deve afetar o saldo
      if (newShouldUpdateBalance) {
        this.banksService
          .updateBalanceFromTransaction(newBankId, newAmount, 'receipt', oldShouldUpdateBalance && oldBankId === newBankId ? 'update' : 'create', oldShouldUpdateBalance && oldBankId === newBankId ? oldAmount : undefined, oldShouldUpdateBalance && oldBankId !== newBankId ? oldBankId : undefined)
          .catch((err) => console.error('Erro ao aplicar saldo do novo banco:', err));
      }
    }

    return updatedReceipt;
  }

  async remove(id: string, userId: string) {
    // Buscar receita antes de deletar para atualizar saldo
    const receipt = await this.findOne(id, userId);

    await this.prisma.receipt.delete({
      where: { id },
    });

    // Reverter saldo do banco automaticamente APENAS se a receita afetou o saldo (não era futura)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const receiptDate = new Date(receipt.date);
    const shouldRevertBalance = receipt.bankId && receiptDate <= today;

    if (this.banksService && shouldRevertBalance) {
      this.banksService
        .updateBalanceFromTransaction(receipt.bankId, Number(receipt.amount), 'receipt', 'delete')
        .catch((err) => console.error('Erro ao reverter saldo do banco:', err));
    }
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
        bank: true,
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