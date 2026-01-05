import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardBillDto } from './dto/create-credit-card-bill.dto';
import { UpdateCreditCardBillDto } from './dto/update-credit-card-bill.dto';
import { BanksService } from '../banks/banks.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreditCardBillsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BanksService))
    private banksService?: BanksService,
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
      ? new Date(lastBill.closingDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia após o último fechamento
      : new Date(year, month, 1); // Início do mês se for a primeira fatura
    const periodEnd = closingDate;

    const creditExpensesWhere: any = {
      userId,
      paymentMethod: 'CREDIT',
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };
    
    // Só filtrar por banco se bankId não for null
    if (bankId !== null) {
      creditExpensesWhere.bankId = bankId;
    } else {
      creditExpensesWhere.bankId = null;
    }

    const creditExpenses = await this.prisma.expense.findMany({
      where: creditExpensesWhere,
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
          ? new Date(new Date(previousBill.closingDate).getTime() + 24 * 60 * 60 * 1000) // +1 dia após o último fechamento
          : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
        const periodEnd = closingDate;

        const creditExpensesWhere: any = {
          userId,
          paymentMethod: 'CREDIT',
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        };
        
        // Só filtrar por banco se billBankId não for null
        if (billBankId !== null) {
          creditExpensesWhere.bankId = billBankId;
        } else {
          creditExpensesWhere.bankId = null;
        }

        const creditExpenses = await this.prisma.expense.findMany({
          where: creditExpensesWhere,
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
      ? new Date(lastBill.closingDate.getTime() + 24 * 60 * 60 * 1000) // +1 dia após o último fechamento
      : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
    const periodEnd = closingDate;

    const creditExpensesWhere: any = {
      userId,
      paymentMethod: 'CREDIT',
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };
    
    // Só filtrar por banco se currentBankId não for null
    if (currentBankId !== null) {
      creditExpensesWhere.bankId = currentBankId;
    } else {
      creditExpensesWhere.bankId = null;
    }

    const creditExpenses = await this.prisma.expense.findMany({
      where: creditExpensesWhere,
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

  async getCurrentMonthBill(userId: string, bankId?: string | null) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const bill = await this.prisma.creditCardBill.findFirst({
      where: {
        userId,
        bankId: bankId !== undefined ? bankId : undefined,
        closingDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      include: {
        bank: true,
      },
    });

    if (!bill) {
      return null;
    }

    // Recalcular total para garantir que está atualizado
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
      ? new Date(previousBill.closingDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
    const periodEnd = closingDate;

    const creditExpensesWhere: any = {
      userId,
      paymentMethod: 'CREDIT',
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (billBankId !== null) {
      creditExpensesWhere.bankId = billBankId;
    } else {
      creditExpensesWhere.bankId = null;
    }

    const creditExpenses = await this.prisma.expense.findMany({
      where: creditExpensesWhere,
    });

    const totalAmount = creditExpenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    return {
      ...bill,
      totalAmount: new Prisma.Decimal(totalAmount),
    };
  }

  async getAllCurrentMonthBills(userId: string) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Buscar todas as faturas do mês atual
    const allBills = await this.prisma.creditCardBill.findMany({
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
      orderBy: {
        closingDate: 'desc',
      },
    });

    // Agrupar por banco e pegar apenas a mais recente de cada banco
    const billsByBank = new Map<string | null, any>();
    
    for (const bill of allBills) {
      const bankKey = bill.bankId || 'null';
      if (!billsByBank.has(bankKey)) {
        billsByBank.set(bankKey, bill);
      }
    }

    // Processar cada fatura para calcular o total
    const processedBills: any[] = [];
    for (const bill of billsByBank.values()) {
      const processedBill = await this.processBillTotal(bill, userId);
      if (processedBill) {
        processedBills.push(processedBill);
      }
    }

    return processedBills;
  }

  private async processBillTotal(bill: any, userId: string) {
    // Buscar a fatura completa com banco
    const fullBill = await this.prisma.creditCardBill.findUnique({
      where: { id: bill.id },
      include: {
        bank: true,
      },
    });

    if (!fullBill) {
      return null;
    }

    const closingDate = new Date(fullBill.closingDate);
    const billBankId = fullBill.bankId;
    
    // Buscar última fatura anterior do mesmo banco
    const previousBill = await this.prisma.creditCardBill.findFirst({
      where: {
        userId,
        id: { not: fullBill.id },
        bankId: billBankId,
        closingDate: { lt: closingDate },
      },
      orderBy: {
        closingDate: 'desc',
      },
    });

    const periodStart = previousBill
      ? new Date(previousBill.closingDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
    const periodEnd = closingDate;

    const creditExpensesWhere: any = {
      userId,
      paymentMethod: 'CREDIT',
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    };

    if (billBankId !== null) {
      creditExpensesWhere.bankId = billBankId;
    } else {
      creditExpensesWhere.bankId = null;
    }

    const creditExpenses = await this.prisma.expense.findMany({
      where: creditExpensesWhere,
    });

    const totalAmount = creditExpenses.reduce((sum, expense) => {
      return sum + Number(expense.amount);
    }, 0);

    return {
      ...fullBill,
      totalAmount: new Prisma.Decimal(totalAmount),
    };
  }

  async markAsPaid(id: string, userId: string, paymentBankId?: string, payments?: Array<{ bankId: string; amount: number }>) {
    const bill = await this.findOne(id, userId);
    
    // Se foi fornecido pagamentos parciais, usar pagamento combinado
    if (payments && payments.length > 0) {
      return this.payBillCombined(id, userId, bill, payments);
    }
    
    // Determinar qual banco usar para pagar
    const bankIdToUse = paymentBankId || bill.bankId;
    
    // Validar banco se fornecido
    if (paymentBankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: paymentBankId },
      });
      
      if (!bank) {
        throw new NotFoundException('Banco não encontrado');
      }
      
      if (bank.userId !== userId) {
        throw new ForbiddenException('Banco não pertence ao usuário');
      }
    }
    
    const updated = await this.prisma.creditCardBill.update({
      where: { id },
      data: { 
        isPaid: true,
        paidBankId: bankIdToUse || null,
      },
      include: {
        bank: true,
        paidBank: true,
      },
    });

    // Atualizar saldo do banco quando marcar como pago
    // Se o usuário selecionou um banco para pagar, SEMPRE atualiza o saldo desse banco
    // (subtrai o valor da fatura do saldo)
    if (this.banksService && bankIdToUse) {
      try {
        // Se a fatura já estava marcada como paga antes, não atualiza novamente
        // (evita duplicar a subtração)
        if (!bill.isPaid) {
          await this.banksService.updateBalanceFromTransaction(
            bankIdToUse,
            Number(bill.totalAmount),
            'expense',
            'create' // 'create' subtrai do saldo para despesas
          );
        }
      } catch (error) {
        console.error('Erro ao atualizar saldo do banco:', error);
        throw error; // Propaga o erro para que o usuário saiba que algo deu errado
      }
    }

    return updated;
  }

  private async payBillCombined(
    id: string,
    userId: string,
    bill: any,
    payments: Array<{ bankId: string; amount: number }>
  ) {
    const totalAmount = Number(bill.totalAmount);
    const paymentsTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Validar que a soma dos pagamentos é igual ao valor da fatura
    if (Math.abs(paymentsTotal - totalAmount) > 0.01) {
      throw new BadRequestException(
        `A soma dos pagamentos (${paymentsTotal.toFixed(2)}) deve ser igual ao valor da fatura (${totalAmount.toFixed(2)})`
      );
    }

    // Validar todos os bancos
    for (const payment of payments) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: payment.bankId },
      });
      
      if (!bank) {
        throw new NotFoundException(`Banco ${payment.bankId} não encontrado`);
      }
      
      if (bank.userId !== userId) {
        throw new ForbiddenException(`Banco ${payment.bankId} não pertence ao usuário`);
      }
    }

    // Atualizar fatura como paga (usar o primeiro banco como paidBankId para compatibilidade)
    const updated = await this.prisma.creditCardBill.update({
      where: { id },
      data: { 
        isPaid: true,
        paidBankId: payments[0].bankId, // Usar o primeiro banco como referência
      },
      include: {
        bank: true,
        paidBank: true,
      },
    });

    // Atualizar saldos de todos os bancos usados
    if (this.banksService && !bill.isPaid) {
      try {
        for (const payment of payments) {
          await this.banksService.updateBalanceFromTransaction(
            payment.bankId,
            payment.amount,
            'expense',
            'create' // 'create' subtrai do saldo para despesas
          );
        }
      } catch (error) {
        console.error('Erro ao atualizar saldos dos bancos:', error);
        throw error;
      }
    }

    return updated;
  }

  async markAsUnpaid(id: string, userId: string) {
    const bill = await this.findOne(id, userId);
    
    // Buscar a fatura com o paidBankId antes de atualizar
    const billWithPaidBank = await this.prisma.creditCardBill.findUnique({
      where: { id },
      select: { paidBankId: true },
    });
    
    const updated = await this.prisma.creditCardBill.update({
      where: { id },
      data: { 
        isPaid: false,
        paidBankId: null,
      },
      include: {
        bank: true,
        paidBank: true,
      },
    });

    // Reverter saldo do banco quando desmarcar como pago
    // Usar o paidBankId (banco usado para pagar) se existir, senão usar o bankId (banco da fatura)
    const bankIdToRevert = billWithPaidBank?.paidBankId || bill.bankId;
    if (this.banksService && bill.isPaid && bankIdToRevert) {
      try {
        // Reverter a subtração anterior (adicionar de volta ao saldo)
        await this.banksService.updateBalanceFromTransaction(
          bankIdToRevert,
          Number(bill.totalAmount),
          'expense',
          'delete' // 'delete' adiciona de volta ao saldo (reverte a subtração)
        );
      } catch (error) {
        console.error('Erro ao reverter saldo do banco:', error);
        // Não propaga o erro aqui para não impedir a atualização do status
      }
    }

    return updated;
  }

  /**
   * Determina qual fatura uma compra pertence baseado na data da compra e no dia de fechamento
   */
  private determineBillForExpense(
    expenseDate: Date,
    closingDay: number,
    lastBillClosingDate: Date | null,
  ): { closingDate: Date; dueDate: Date; periodStart: Date; periodEnd: Date } {
    const expenseYear = expenseDate.getFullYear();
    const expenseMonth = expenseDate.getMonth();
    const expenseDay = expenseDate.getDate();

    // Se a compra é antes do dia de fechamento no mês atual, ela pertence à fatura deste mês
    // Se é depois, pertence à fatura do próximo mês
    let billYear = expenseYear;
    let billMonth = expenseMonth;

    if (expenseDay > closingDay) {
      // Compra depois do fechamento → vai para próxima fatura
      billMonth = expenseMonth + 1;
      if (billMonth > 11) {
        billMonth = 0;
        billYear = expenseYear + 1;
      }
    }

    // Calcular data de fechamento da fatura
    const lastDayOfBillMonth = new Date(billYear, billMonth + 1, 0).getDate();
    const adjustedClosingDay = Math.min(closingDay, lastDayOfBillMonth);
    const closingDate = new Date(billYear, billMonth, adjustedClosingDay);

    // Calcular data de vencimento (geralmente alguns dias após o fechamento)
    // Vamos usar o mesmo padrão: se dueDay < closingDay, vencimento é no mês seguinte
    // Por enquanto, vamos calcular baseado na última fatura ou usar um padrão
    let dueYear = billYear;
    let dueMonth = billMonth;
    // Assumindo que o vencimento é sempre no mês seguinte ao fechamento
    dueMonth = billMonth + 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear = billYear + 1;
    }
    const lastDayOfDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
    // Usar o mesmo dia de vencimento da última fatura ou padrão de 5 dias após fechamento
    const dueDay = Math.min(closingDay, lastDayOfDueMonth); // Simplificado, pode ser ajustado
    const dueDate = new Date(dueYear, dueMonth, dueDay);

    // Calcular período da fatura
    const periodStart = lastBillClosingDate
      ? new Date(lastBillClosingDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(billYear, billMonth, 1);
    const periodEnd = closingDate;

    return { closingDate, dueDate, periodStart, periodEnd };
  }

  /**
   * Gera faturas futuras automaticamente baseado nas despesas de crédito existentes
   * Apenas cria faturas se houver despesas de crédito que vão aparecer nelas
   */
  async generateFutureBills(userId: string, monthsAhead: number = 5, bankId?: string | null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar todas as faturas existentes para identificar padrões de fechamento
    const existingBills = await this.prisma.creditCardBill.findMany({
      where: {
        userId,
        bankId: bankId !== undefined ? bankId : undefined,
      },
      include: {
        bank: true,
      },
      orderBy: {
        closingDate: 'desc',
      },
    });

    // Agrupar por banco para gerar faturas futuras para cada banco
    const billsByBank = new Map<string | null, typeof existingBills>();
    existingBills.forEach((bill) => {
      const key = bill.bankId || 'null';
      if (!billsByBank.has(key)) {
        billsByBank.set(key, []);
      }
      billsByBank.get(key)!.push(bill);
    });

    const generatedBills = [];

    for (const [bankKey, bills] of billsByBank.entries()) {
      const currentBankId = bankKey === 'null' ? null : bankKey;
      
      if (bills.length === 0) {
        // Se não há faturas existentes, não podemos gerar futuras sem saber o padrão
        continue;
      }

      // Pegar a última fatura para usar como referência
      const lastBill = bills[0];
      const closingDay = lastBill.closingDate.getDate();
      const dueDay = lastBill.dueDate.getDate();
      const lastClosingDate = new Date(lastBill.closingDate);

      // Gerar faturas para os próximos N meses
      for (let i = 1; i <= monthsAhead; i++) {
        const futureClosingDate = new Date(lastClosingDate);
        futureClosingDate.setMonth(futureClosingDate.getMonth() + i);
        
        // Ajustar dia de fechamento se necessário
        const lastDayOfMonth = new Date(
          futureClosingDate.getFullYear(),
          futureClosingDate.getMonth() + 1,
          0,
        ).getDate();
        const adjustedClosingDay = Math.min(closingDay, lastDayOfMonth);
        futureClosingDate.setDate(adjustedClosingDay);

        // Verificar se já existe uma fatura para esta data
        const existingBill = await this.prisma.creditCardBill.findFirst({
          where: {
            userId,
            bankId: currentBankId,
            closingDate: {
              gte: new Date(futureClosingDate.getFullYear(), futureClosingDate.getMonth(), 1),
              lt: new Date(futureClosingDate.getFullYear(), futureClosingDate.getMonth() + 1, 1),
            },
          },
        });

        if (existingBill) {
          continue; // Já existe, pular
        }

        // Calcular período desta fatura
        const previousBill = await this.prisma.creditCardBill.findFirst({
          where: {
            userId,
            bankId: currentBankId,
            closingDate: { lt: futureClosingDate },
          },
          orderBy: {
            closingDate: 'desc',
          },
        });

        const periodStart = previousBill
          ? new Date(previousBill.closingDate.getTime() + 24 * 60 * 60 * 1000)
          : new Date(futureClosingDate.getFullYear(), futureClosingDate.getMonth(), 1);
        const periodEnd = futureClosingDate;

        // Verificar se há despesas de crédito neste período
        const creditExpensesWhere: any = {
          userId,
          paymentMethod: 'CREDIT',
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        };

        if (currentBankId !== null) {
          creditExpensesWhere.bankId = currentBankId;
        } else {
          creditExpensesWhere.bankId = null;
        }

        const creditExpenses = await this.prisma.expense.findMany({
          where: creditExpensesWhere,
        });

        // Buscar despesas recorrentes de crédito para este banco
        const recurringExpensesWhere: any = {
          userId,
          paymentMethod: 'CREDIT',
          isRecurring: true,
          recurringType: 'MONTHLY',
        };

        if (currentBankId !== null) {
          recurringExpensesWhere.bankId = currentBankId;
        } else {
          recurringExpensesWhere.bankId = null;
        }

        const recurringExpenses = await this.prisma.expense.findMany({
          where: recurringExpensesWhere,
        });

        // Projetar despesas recorrentes para o período desta fatura
        let hasRecurringInPeriod = false;
        for (const recurringExpense of recurringExpenses) {
          const expenseDate = new Date(recurringExpense.date);
          const expenseDay = expenseDate.getDate();
          const expenseMonth = expenseDate.getMonth();
          const expenseYear = expenseDate.getFullYear();

          const billMonth = futureClosingDate.getMonth();
          const billYear = futureClosingDate.getFullYear();

          // Se a fatura é do mesmo mês ou posterior, projetar a despesa
          if (
            billYear > expenseYear ||
            (billYear === expenseYear && billMonth >= expenseMonth)
          ) {
            const projectedDate = new Date(billYear, billMonth, expenseDay);
            const lastDayOfMonth = new Date(billYear, billMonth + 1, 0).getDate();
            if (expenseDay > lastDayOfMonth) {
              projectedDate.setDate(lastDayOfMonth);
            }

            if (projectedDate >= periodStart && projectedDate <= periodEnd) {
              hasRecurringInPeriod = true;
              break;
            }
          }
        }

        // Só criar fatura se houver despesas de crédito OU despesas recorrentes no período
        if (creditExpenses.length === 0 && !hasRecurringInPeriod) {
          continue;
        }

        // Calcular total incluindo despesas recorrentes projetadas
        let totalAmount = creditExpenses.reduce((sum, expense) => {
          return sum + Number(expense.amount);
        }, 0);

        // Adicionar despesas recorrentes projetadas ao total
        for (const recurringExpense of recurringExpenses) {
          const expenseDate = new Date(recurringExpense.date);
          const expenseDay = expenseDate.getDate();
          const expenseMonth = expenseDate.getMonth();
          const expenseYear = expenseDate.getFullYear();

          const billMonth = futureClosingDate.getMonth();
          const billYear = futureClosingDate.getFullYear();

          // Se a fatura é do mesmo mês ou posterior, projetar a despesa
          if (
            billYear > expenseYear ||
            (billYear === expenseYear && billMonth >= expenseMonth)
          ) {
            const projectedDate = new Date(billYear, billMonth, expenseDay);
            const lastDayOfMonth = new Date(billYear, billMonth + 1, 0).getDate();
            if (expenseDay > lastDayOfMonth) {
              projectedDate.setDate(lastDayOfMonth);
            }

            if (projectedDate >= periodStart && projectedDate <= periodEnd) {
              // Verificar se já existe uma despesa real para esta data (evitar duplicação)
              const alreadyExists = creditExpenses.some(
                (e) =>
                  e.description === recurringExpense.description &&
                  e.amount.toString() === recurringExpense.amount.toString() &&
                  new Date(e.date).getMonth() === billMonth &&
                  new Date(e.date).getFullYear() === billYear,
              );

              if (!alreadyExists) {
                totalAmount += Number(recurringExpense.amount);
              }
            }
          }
        }

        // Calcular data de vencimento
        let dueYear = futureClosingDate.getFullYear();
        let dueMonth = futureClosingDate.getMonth();
        if (dueDay < adjustedClosingDay) {
          dueMonth = futureClosingDate.getMonth() + 1;
          if (dueMonth > 11) {
            dueMonth = 0;
            dueYear = futureClosingDate.getFullYear() + 1;
          }
        }
        const lastDayOfDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
        const adjustedDueDay = Math.min(dueDay, lastDayOfDueMonth);
        const dueDate = new Date(dueYear, dueMonth, adjustedDueDay);

        // Gerar descrição
        const monthNames = [
          'Janeiro',
          'Fevereiro',
          'Março',
          'Abril',
          'Maio',
          'Junho',
          'Julho',
          'Agosto',
          'Setembro',
          'Outubro',
          'Novembro',
          'Dezembro',
        ];
        const bankName = lastBill.bank?.name || 'Cartão';
        const description = `Fatura ${bankName} - ${monthNames[futureClosingDate.getMonth()]} ${futureClosingDate.getFullYear()}`;

        const newBill = await this.prisma.creditCardBill.create({
          data: {
            description,
            closingDate: futureClosingDate,
            dueDate,
            bestPurchaseDate: lastBill.bestPurchaseDate
              ? new Date(
                  futureClosingDate.getFullYear(),
                  futureClosingDate.getMonth(),
                  lastBill.bestPurchaseDate.getDate(),
                )
              : null,
            totalAmount: new Prisma.Decimal(totalAmount),
            userId,
            bankId: currentBankId,
            isPaid: false,
          },
          include: {
            bank: true,
          },
        });

        generatedBills.push(newBill);
      }
    }

    return generatedBills;
  }

  /**
   * Lista faturas futuras (ainda não fechadas)
   */
  async getFutureBills(
    userId: string,
    bankId?: string | null,
    monthsAhead: number = 5,
    startDate?: Date,
    endDate?: Date,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Gerar faturas futuras automaticamente se necessário
    await this.generateFutureBills(userId, monthsAhead, bankId);

    // Buscar faturas futuras (fechamento > hoje)
    const where: any = {
      userId,
      closingDate: {
        gt: startDate || today,
      },
    };

    if (bankId !== undefined) {
      where.bankId = bankId;
    }

    if (endDate) {
      where.closingDate.lte = endDate;
    }

    const futureBills = await this.prisma.creditCardBill.findMany({
      where,
      include: {
        bank: true,
      },
      orderBy: {
        closingDate: 'asc',
      },
    });

    // Para cada fatura futura, calcular as despesas que vão aparecer
    const billsWithExpenses = await Promise.all(
      futureBills.map(async (bill) => {
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
          ? new Date(previousBill.closingDate.getTime() + 24 * 60 * 60 * 1000)
          : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
        const periodEnd = closingDate;

        const creditExpensesWhere: any = {
          userId,
          paymentMethod: 'CREDIT',
          date: {
            gte: periodStart,
            lte: periodEnd,
          },
        };

        if (billBankId !== null) {
          creditExpensesWhere.bankId = billBankId;
        } else {
          creditExpensesWhere.bankId = null;
        }

        const creditExpenses = await this.prisma.expense.findMany({
          where: creditExpensesWhere,
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

        // Buscar despesas recorrentes de crédito e projetá-las para esta fatura
        const recurringExpensesWhere: any = {
          userId,
          paymentMethod: 'CREDIT',
          isRecurring: true,
          recurringType: 'MONTHLY', // Por enquanto apenas mensais
        };

        if (billBankId !== null) {
          recurringExpensesWhere.bankId = billBankId;
        } else {
          recurringExpensesWhere.bankId = null;
        }

        const recurringExpenses = await this.prisma.expense.findMany({
          where: recurringExpensesWhere,
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

        // Projetar despesas recorrentes para o período desta fatura
        const projectedRecurringExpenses = [];
        for (const recurringExpense of recurringExpenses) {
          const expenseDate = new Date(recurringExpense.date);
          const expenseDay = expenseDate.getDate();
          const expenseMonth = expenseDate.getMonth();
          const expenseYear = expenseDate.getFullYear();

          // Calcular a data projetada para este mês da fatura
          const billMonth = closingDate.getMonth();
          const billYear = closingDate.getFullYear();

          // Se a fatura é do mesmo mês ou posterior, projetar a despesa
          if (
            billYear > expenseYear ||
            (billYear === expenseYear && billMonth >= expenseMonth)
          ) {
            // Calcular quantos meses se passaram desde a data original
            const monthsDiff =
              (billYear - expenseYear) * 12 + (billMonth - expenseMonth);

            // Calcular a data projetada
            const projectedDate = new Date(billYear, billMonth, expenseDay);
            const lastDayOfMonth = new Date(billYear, billMonth + 1, 0).getDate();
            if (expenseDay > lastDayOfMonth) {
              projectedDate.setDate(lastDayOfMonth);
            }

            // Verificar se a data projetada está dentro do período da fatura
            if (projectedDate >= periodStart && projectedDate <= periodEnd) {
              // Verificar se já existe uma despesa real para esta data (evitar duplicação)
              const alreadyExists = creditExpenses.some(
                (e) =>
                  e.description === recurringExpense.description &&
                  e.amount.toString() === recurringExpense.amount.toString() &&
                  new Date(e.date).getMonth() === billMonth &&
                  new Date(e.date).getFullYear() === billYear,
              );

              if (!alreadyExists) {
                projectedRecurringExpenses.push({
                  id: `${recurringExpense.id}-projected-${billYear}-${billMonth}`,
                  description: recurringExpense.description,
                  amount: Number(recurringExpense.amount),
                  date: projectedDate,
                  isPaid: false,
                  isProjected: true, // Marcar como projetada
                  category: recurringExpense.category,
                  bank: recurringExpense.bank,
                });
              }
            }
          }
        }

        // Combinar despesas reais e projetadas
        const allExpenses = [
          ...creditExpenses.map((e) => ({
            id: e.id,
            description: e.description,
            amount: Number(e.amount),
            date: e.date,
            isPaid: e.isPaid,
            isProjected: false,
            category: e.category,
            bank: e.bank,
          })),
          ...projectedRecurringExpenses,
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const totalAmount = allExpenses.reduce((sum, expense) => {
          return sum + expense.amount;
        }, 0);

        return {
          ...bill,
          totalAmount: new Prisma.Decimal(totalAmount),
          expenses: allExpenses,
        };
      }),
    );

    return billsWithExpenses;
  }

  async recalculateBillTotal(userId: string, bankId?: string | null) {
    // Buscar todas as faturas do usuário (e do banco se especificado)
    const bills = await this.prisma.creditCardBill.findMany({
      where: {
        userId,
        bankId: bankId !== undefined ? bankId : undefined,
      },
      orderBy: {
        closingDate: 'asc',
      },
    });

    // Recalcular cada fatura
    for (const bill of bills) {
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
        ? new Date(new Date(previousBill.closingDate).getTime() + 24 * 60 * 60 * 1000)
        : new Date(closingDate.getFullYear(), closingDate.getMonth(), 1);
      const periodEnd = closingDate;

      const creditExpensesWhere: any = {
        userId,
        paymentMethod: 'CREDIT',
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      };
      
      if (billBankId !== null) {
        creditExpensesWhere.bankId = billBankId;
      } else {
        creditExpensesWhere.bankId = null;
      }

      const creditExpenses = await this.prisma.expense.findMany({
        where: creditExpensesWhere,
      });

      const totalAmount = creditExpenses.reduce((sum, expense) => {
        return sum + Number(expense.amount);
      }, 0);

      await this.prisma.creditCardBill.update({
        where: { id: bill.id },
        data: { totalAmount: new Prisma.Decimal(totalAmount) },
      });
    }
  }
}
