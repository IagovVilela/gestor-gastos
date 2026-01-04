import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardBillDto } from './dto/create-credit-card-bill.dto';
import { UpdateCreditCardBillDto } from './dto/update-credit-card-bill.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreditCardBillsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(userId: string, createCreditCardBillDto: CreateCreditCardBillDto) {
    // Calcular datas completas baseadas nos dias informados
    const today = new Date();
    const year = createCreditCardBillDto.year || today.getFullYear();
    const month = createCreditCardBillDto.month !== undefined ? createCreditCardBillDto.month - 1 : today.getMonth();
    
    // Calcular data de fechamento (ajustar se o dia for maior que os dias do mês)
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const closingDay = Math.min(createCreditCardBillDto.closingDay, lastDayOfMonth);
    const closingDate = new Date(year, month, closingDay);
    
    // Calcular data de vencimento (pode ser no mês seguinte se dueDay < closingDay)
    let dueYear = year;
    let dueMonth = month;
    if (createCreditCardBillDto.dueDay < closingDay) {
      dueMonth = month + 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear = year + 1;
      }
    }
    const lastDayOfDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
    const dueDay = Math.min(createCreditCardBillDto.dueDay, lastDayOfDueMonth);
    const dueDate = new Date(dueYear, dueMonth, dueDay);

    // Buscar última fatura do mesmo banco para calcular o período correto
    const bankId = createCreditCardBillDto.bankId || null;
    const lastBill = await this.prisma.creditCardBill.findFirst({
      where: {
        userId,
        bankId: bankId,
      },
      orderBy: {
        closingDate: 'desc',
      },
    });

    // Período: do último fechamento (ou início do mês se não houver) até o fechamento atual
    const periodStart = lastBill 
      ? new Date(lastBill.closingDate.getTime() + 1) // +1 dia após o último fechamento
      : new Date(year, month, 1); // Início do mês se for a primeira fatura
    const periodEnd = closingDate;

    const creditExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        paymentMethod: 'CREDIT',
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const totalAmount = creditExpenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    const bill = await this.prisma.creditCardBill.create({
      data: {
        description: createCreditCardBillDto.description,
        closingDate,
        dueDate,
        bestPurchaseDate: createCreditCardBillDto.bestPurchaseDay
          ? new Date(year, month, Math.min(createCreditCardBillDto.bestPurchaseDay, lastDayOfMonth))
          : null,
        totalAmount: new Prisma.Decimal(totalAmount),
        userId,
        bankId: createCreditCardBillDto.bankId || null,
        isPaid: createCreditCardBillDto.isPaid || false,
        notes: createCreditCardBillDto.notes || null,
      },
      include: {
        bank: true,
      },
    });

    return bill;
  }

  async findAll(userId: string) {
    const bills = await this.prisma.creditCardBill.findMany({
      where: { userId },
      include: {
        bank: true,
      },
      orderBy: {
        closingDate: 'desc',
      },
    });

    // Recalcular totalAmount para cada fatura usando o período correto
    const billsWithRecalculatedTotal = await Promise.all(
      bills.map(async (bill) => {
        const closingDate = new Date(bill.closingDate);
        const billBankId = bill.bankId;
        
        // Buscar última fatura anterior do mesmo banco
        const previousBill = await this.prisma.creditCardBill.findFirst({
          where: {
            userId,
            id: { not: bill.id },
            bankId: billBankId,
            closingDate: { lt: closingDate },
          },
          orderBy: {
            closingDate: 'desc',
          },
        });
        
        const periodStart = previousBill
          ? new Date(new Date(previousBill.closingDate).getTime() + 1)
          : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
        const periodEnd = closingDate;

        const creditExpenses = await this.prisma.expense.findMany({
          where: {
            userId,
            paymentMethod: 'CREDIT',
            date: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        });

        const totalAmount = creditExpenses.reduce((sum, expense) => {
          return sum + Number(expense.amount);
        }, 0);

        return {
          ...bill,
          totalAmount: new Prisma.Decimal(totalAmount),
        };
      })
    );

    return billsWithRecalculatedTotal;
  }

  async findOne(id: string, userId: string) {
    const bill = await this.prisma.creditCardBill.findUnique({
      where: { id },
      include: {
        bank: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('Fatura não encontrada');
    }

    if (bill.userId !== userId) {
      throw new ForbiddenException('Fatura não pertence ao usuário');
    }

    return bill;
  }

  async update(id: string, userId: string, updateCreditCardBillDto: UpdateCreditCardBillDto) {
    const bill = await this.findOne(id, userId);

    const updateData: any = {};
    
    // Se houver novos campos de dia, calcular datas completas
    if (updateCreditCardBillDto.closingDay !== undefined || updateCreditCardBillDto.month !== undefined || updateCreditCardBillDto.year !== undefined) {
      const today = new Date();
      const year = updateCreditCardBillDto.year || bill.closingDate.getFullYear();
      const month = updateCreditCardBillDto.month !== undefined ? updateCreditCardBillDto.month - 1 : bill.closingDate.getMonth();
      const closingDay = updateCreditCardBillDto.closingDay !== undefined ? updateCreditCardBillDto.closingDay : bill.closingDate.getDate();
      
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const adjustedClosingDay = Math.min(closingDay, lastDayOfMonth);
      updateData.closingDate = new Date(year, month, adjustedClosingDay);
    }

    if (updateCreditCardBillDto.dueDay !== undefined || updateCreditCardBillDto.closingDay !== undefined) {
      const closingDate = updateData.closingDate || bill.closingDate;
      const dueDay = updateCreditCardBillDto.dueDay !== undefined ? updateCreditCardBillDto.dueDay : bill.dueDate.getDate();
      
      let dueYear = closingDate.getFullYear();
      let dueMonth = closingDate.getMonth();
      if (dueDay < closingDate.getDate()) {
        dueMonth = closingDate.getMonth() + 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear = closingDate.getFullYear() + 1;
        }
      }
      const lastDayOfDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
      const adjustedDueDay = Math.min(dueDay, lastDayOfDueMonth);
      updateData.dueDate = new Date(dueYear, dueMonth, adjustedDueDay);
    }

    if (updateCreditCardBillDto.bestPurchaseDay !== undefined) {
      const closingDate = updateData.closingDate || bill.closingDate;
      const year = closingDate.getFullYear();
      const month = closingDate.getMonth();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      updateData.bestPurchaseDate = new Date(year, month, Math.min(updateCreditCardBillDto.bestPurchaseDay, lastDayOfMonth));
    }

    // Atualizar outros campos
    if (updateCreditCardBillDto.description !== undefined) updateData.description = updateCreditCardBillDto.description;
    if (updateCreditCardBillDto.bankId !== undefined) updateData.bankId = updateCreditCardBillDto.bankId || null;
    if (updateCreditCardBillDto.isPaid !== undefined) updateData.isPaid = updateCreditCardBillDto.isPaid;
    if (updateCreditCardBillDto.notes !== undefined) updateData.notes = updateCreditCardBillDto.notes || null;

    // Recalcular total baseado no período correto
    const closingDate = updateData.closingDate || bill.closingDate;
    
    // Buscar última fatura anterior do mesmo banco para calcular período
    const currentBankId = updateData.bankId !== undefined ? (updateData.bankId || null) : bill.bankId;
    const lastBill = await this.prisma.creditCardBill.findFirst({
      where: {
        userId,
        id: { not: id },
        bankId: currentBankId,
        closingDate: { lt: closingDate },
      },
      orderBy: {
        closingDate: 'desc',
      },
    });

    const periodStart = lastBill 
      ? new Date(lastBill.closingDate.getTime() + 1)
      : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
    const periodEnd = closingDate;

    const creditExpenses = await this.prisma.expense.findMany({
      where: {
        userId,
        paymentMethod: 'CREDIT',
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const totalAmount = creditExpenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    updateData.totalAmount = new Prisma.Decimal(totalAmount);

    return this.prisma.creditCardBill.update({
      where: { id },
      data: updateData,
      include: {
        bank: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.creditCardBill.delete({
      where: { id },
    });
  }

  async getCurrentMonthBill(userId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return this.prisma.creditCardBill.findFirst({
      where: {
        userId,
        closingDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        bank: true,
      },
    });
  }
}
