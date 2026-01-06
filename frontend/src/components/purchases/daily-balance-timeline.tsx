'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Building2, ArrowDown, Minus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PurchaseForm } from './purchase-form';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface Bank {
  id: string;
  name: string;
  balance: number;
  color?: string;
  type?: string;
}

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

interface Purchase {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentDate?: string | null;
  paymentMethod?: string;
  bank?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  createdAt: string;
}

interface DailyTransaction {
  id: string;
  type: 'purchase' | 'initial';
  description: string;
  amount: number;
  timestamp: string;
  bankId?: string;
  bankName?: string;
  bankColor?: string;
  bankType?: string;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod?: string;
}

const paymentMethodLabels: Record<string, string> = {
  CREDIT: 'Cartão de Crédito',
  DEBIT: 'Cartão de Débito',
  CASH: 'Dinheiro',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferência Bancária',
  OTHER: 'Outros',
};

export function DailyBalanceTimeline() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | undefined>();
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Escutar evento de atualização de saldo
    const handleBalanceUpdate = () => {
      fetchData();
    };
    
    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, [selectedDate, periodFilter]);

  const getDateRange = () => {
    // Criar data a partir da string selecionada sem timezone
    // selectedDate vem no formato 'yyyy-MM-dd'
    const [year, month, day] = selectedDate.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day); // month é 0-indexed
    baseDate.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    let endDate: Date;
    
    switch (periodFilter) {
      case 'day':
        startDate = new Date(baseDate);
        endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'week':
        // ptBR usa segunda-feira como primeiro dia da semana
        startDate = startOfWeek(baseDate, { locale: ptBR, weekStartsOn: 1 });
        endDate = endOfWeek(baseDate, { locale: ptBR, weekStartsOn: 1 });
        endDate.setDate(endDate.getDate() + 1); // Incluir o último dia
        break;
      case 'month':
        startDate = startOfMonth(baseDate);
        endDate = endOfMonth(baseDate);
        endDate.setDate(endDate.getDate() + 1); // Incluir o último dia
        break;
      case 'year':
        startDate = startOfYear(baseDate);
        endDate = endOfYear(baseDate);
        endDate.setDate(endDate.getDate() + 1); // Incluir o último dia
        break;
      default:
        startDate = new Date(baseDate);
        endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + 1);
    }
    
    // Garantir que as horas estão zeradas
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      startDateObj: startDate,
      endDateObj: endDate,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { startDate, endDate, startDateObj, endDateObj } = getDateRange();
      const isToday = periodFilter === 'day' && new Date(selectedDate).getTime() === today.getTime();

      const [banksRes, purchasesRes, receiptsRes] = await Promise.all([
        api.get('/banks'),
        api.get('/expenses', {
          params: {
            startDate,
            endDate,
            limit: 500,
          },
        }),
        api.get('/receipts', {
          params: {
            startDate,
            endDate,
            limit: 500,
          },
        }),
      ]);

      setBanks(banksRes.data || []);
      setPurchases((purchasesRes.data?.data || purchasesRes.data || []).sort((a: Purchase, b: Purchase) => 
        new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      ));

      // Calcular saldo inicial do dia (antes de qualquer transação)
      // Saldo inicial = Saldo atual - receitas do dia + despesas do dia que foram descontadas
      const initialBalances: Record<string, number> = {};
      const todayPurchases: Purchase[] = [];
      
      // Começar com o saldo atual de cada banco
      // Garantir conversão correta de Decimal para Number
      banksRes.data.forEach((bank: Bank) => {
        // Converter corretamente o saldo (pode vir como string ou Decimal do Prisma)
        const balance = typeof bank.balance === 'string' 
          ? parseFloat(bank.balance) 
          : Number(bank.balance);
        initialBalances[bank.id] = balance;
      });

      // Reverter receitas do período (subtrair do saldo atual para obter saldo inicial)
      const receiptsData = receiptsRes.data?.data || receiptsRes.data || [];
      receiptsData.forEach((receipt: any) => {
        if (receipt.bankId) {
          // Extrair apenas a parte da data (sem hora) para evitar problemas de timezone
          // A data pode vir como '2026-01-05' ou '2026-01-05T10:08:00.000Z'
          const receiptDateStr = receipt.date.includes('T') 
            ? receipt.date.split('T')[0] 
            : receipt.date.substring(0, 10);
          
          // Verificar se a receita está no período selecionado
          if (receiptDateStr >= startDate && receiptDateStr < endDate) {
            // Se é hoje, verificar se a receita já foi adicionada ao saldo
            // Se é dia passado, assumir que foi adicionada
            const receiptDateObj = new Date(receipt.date);
            receiptDateObj.setHours(0, 0, 0, 0);
            let wasAdded = false;
            if (isToday) {
              wasAdded = receiptDateObj <= today;
            } else {
              wasAdded = true;
            }
            
            if (wasAdded) {
              const receiptAmount = typeof receipt.amount === 'string' 
                ? parseFloat(receipt.amount) 
                : Number(receipt.amount);
              initialBalances[receipt.bankId] = (initialBalances[receipt.bankId] || 0) - receiptAmount;
            }
          }
        }
      });

      // Reverter despesas do período (adicionar de volta ao saldo para obter saldo inicial)
      const purchasesData = purchasesRes.data?.data || purchasesRes.data || [];
      purchasesData.forEach((purchase: Purchase) => {
        if (purchase.bank?.id && purchase.paymentMethod !== 'CREDIT') {
          // Extrair apenas a parte da data (sem hora) para evitar problemas de timezone
          // A data pode vir como '2026-01-05' ou '2026-01-05T10:08:00.000Z'
          const purchaseDateStr = purchase.date.includes('T') 
            ? purchase.date.split('T')[0] 
            : purchase.date.substring(0, 10);
          
          // Verificar se a compra está no período selecionado
          if (purchaseDateStr >= startDate && purchaseDateStr < endDate) {
            // Verificar se já foi descontada do saldo
            // A despesa só é descontada se paymentDate <= hoje (ou <= data selecionada para dias passados)
            // Se não tem paymentDate, usa a data da compra
            const effectivePaymentDate = purchase.paymentDate 
              ? new Date(purchase.paymentDate) 
              : new Date(purchase.date);
            effectivePaymentDate.setHours(0, 0, 0, 0);
            
            let wasDeducted = false;
            if (isToday) {
              // Para hoje, verificar se paymentDate <= hoje
              wasDeducted = effectivePaymentDate <= today;
            } else {
              // Para períodos passados, verificar se paymentDate <= fim do período
              // Se paymentDate é futuro em relação ao fim do período, não foi descontada ainda
              wasDeducted = effectivePaymentDate <= endDateObj;
            }
            
            // Sempre adicionar compras do dia à lista, mesmo se não foram descontadas ainda
            // (para mostrar na timeline)
            if (purchase.bank?.id) {
              // Se foi descontada, reverter o desconto para calcular saldo inicial
              if (wasDeducted) {
                const purchaseAmount = typeof purchase.amount === 'string' 
                  ? parseFloat(purchase.amount) 
                  : Number(purchase.amount);
                const bankId = purchase.bank.id;
                initialBalances[bankId] = (initialBalances[bankId] || 0) + purchaseAmount;
              }
              // Sempre adicionar à lista de compras do dia para mostrar na timeline
              todayPurchases.push(purchase);
            }
          }
        }
      });

      // Criar timeline de transações
      const timeline: DailyTransaction[] = [];

      // Adicionar saldo inicial de cada banco
      banksRes.data.forEach((bank: Bank) => {
        const bankBalance = typeof bank.balance === 'string' 
          ? parseFloat(bank.balance) 
          : Number(bank.balance);
        const initialBalance = initialBalances[bank.id] !== undefined 
          ? initialBalances[bank.id] 
          : bankBalance;
            timeline.push({
              id: `initial-${bank.id}`,
              type: 'initial',
              description: `Saldo inicial - ${bank.name}`,
              amount: 0,
              timestamp: `${format(startDateObj, 'yyyy-MM-dd')}T00:00:00`,
              bankId: bank.id,
              bankName: bank.name,
              bankColor: bank.color,
              bankType: bank.type,
              balanceBefore: initialBalance,
              balanceAfter: initialBalance,
            });
      });

      // Adicionar compras do período em ordem cronológica
      // As compras já foram filtradas no loop anterior, então não precisa verificar novamente
      const sortedPurchases = todayPurchases.sort((a: Purchase, b: Purchase) => 
        new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime()
      );

      // Manter controle do saldo atual de cada banco durante o processamento
      const currentBalances: Record<string, number> = { ...initialBalances };

      sortedPurchases.forEach((purchase: Purchase) => {
        if (purchase.bank?.id && purchase.paymentMethod !== 'CREDIT') {
          // As compras já foram filtradas no loop anterior, então processar todas
          // Verificar se já foi descontada (para calcular saldo corretamente)
          const effectivePaymentDate = purchase.paymentDate 
            ? new Date(purchase.paymentDate) 
            : new Date(purchase.date);
          effectivePaymentDate.setHours(0, 0, 0, 0);
          
          let wasDeducted = false;
          if (isToday) {
            wasDeducted = effectivePaymentDate <= today;
          } else {
            wasDeducted = effectivePaymentDate <= endDateObj;
          }
          
          const purchaseAmount = typeof purchase.amount === 'string' 
            ? parseFloat(purchase.amount) 
            : Number(purchase.amount);
          const bankId = purchase.bank.id;
          
          // Se foi descontada, calcular saldo antes e depois
          // Se não foi descontada ainda, mostrar saldo atual (não muda)
          let balanceBefore: number;
          let balanceAfter: number;
          
          if (wasDeducted) {
            balanceBefore = currentBalances[bankId] || initialBalances[bankId] || 0;
            balanceAfter = balanceBefore - purchaseAmount;
            // Atualizar saldo atual para próxima compra
            currentBalances[bankId] = balanceAfter;
          } else {
            // Se não foi descontada ainda, o saldo não muda
            balanceBefore = currentBalances[bankId] || initialBalances[bankId] || 0;
            balanceAfter = balanceBefore;
          }

          // Buscar o tipo de conta do banco
          const bankInfo = purchase.bank ? banksRes.data.find((b: Bank) => b.id === purchase.bank!.id) : null;
          
          timeline.push({
            id: purchase.id,
            type: 'purchase',
            description: purchase.description,
            amount: purchaseAmount,
            timestamp: purchase.createdAt || purchase.date,
            bankId: purchase.bank?.id,
            bankName: purchase.bank?.name,
            bankColor: purchase.bank?.color,
            bankType: bankInfo?.type,
            balanceBefore,
            balanceAfter,
            paymentMethod: purchase.paymentMethod,
          });
        }
      });

      // Ordenar timeline por timestamp
      timeline.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setTransactions(timeline);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBalance = (bankId: string) => {
    const bank = banks.find(b => b.id === bankId);
    return bank ? Number(bank.balance) : 0;
  };

  const handleEdit = (purchaseId: string) => {
    setEditingPurchaseId(purchaseId);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPurchaseId) return;

    try {
      await api.delete(`/expenses/${deletingPurchaseId}`);
      toast({
        title: 'Sucesso',
        description: 'Compra excluída com sucesso',
      });
      setDeletingPurchaseId(undefined);
      fetchData();
      // Disparar evento para atualizar saldos
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir compra',
        variant: 'destructive',
      });
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingPurchaseId(undefined);
    fetchData();
    // Disparar evento para atualizar saldos
    window.dispatchEvent(new CustomEvent('balanceUpdated'));
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingPurchaseId(undefined);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extrato Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const todayTransactions = transactions.filter(t => t.type === 'purchase');
  const initialBalances = transactions.filter(t => t.type === 'initial');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Extrato de Movimentações</CardTitle>
          <div className="flex items-center gap-3">
            <Tabs value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="year">Ano</TabsTrigger>
              </TabsList>
            </Tabs>
            {periodFilter === 'day' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {periodFilter === 'day' && format(new Date(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          {periodFilter === 'week' && (() => {
            const baseDate = new Date(selectedDate);
            const weekStart = startOfWeek(baseDate, { locale: ptBR });
            const weekEnd = endOfWeek(baseDate, { locale: ptBR });
            return `${format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - ${format(weekEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
          })()}
          {periodFilter === 'month' && format(new Date(selectedDate), "MMMM 'de' yyyy", { locale: ptBR })}
          {periodFilter === 'year' && format(new Date(selectedDate), "yyyy", { locale: ptBR })}
        </p>
      </CardHeader>
      <CardContent>
        {initialBalances.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma conta encontrada</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Saldos Iniciais */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {periodFilter === 'day' ? 'Saldos Iniciais' : `Saldo Inicial do ${periodFilter === 'week' ? 'Período' : periodFilter === 'month' ? 'Mês' : 'Ano'}`}
              </h3>
              {initialBalances.map((initial) => {
                const bank = banks.find(b => b.id === initial.bankId);
                const currentBalance = bank 
                  ? (typeof bank.balance === 'string' ? parseFloat(bank.balance) : Number(bank.balance))
                  : 0;
                return (
                  <motion.div
                    key={initial.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: initial.bankColor || '#8B5CF6', opacity: 0.2 }}
                      >
                        <Building2
                          className="h-5 w-5"
                          style={{ color: initial.bankColor || '#8B5CF6' }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{initial.bankName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Saldo inicial</p>
                          {initial.bankType && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                {bankTypeLabels[initial.bankType] || initial.bankType}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(initial.balanceBefore)}</p>
                      {currentBalance !== initial.balanceBefore && (
                        <p className="text-xs text-muted-foreground">
                          Agora: {formatCurrency(currentBalance)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Timeline de Transações */}
            {todayTransactions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  Movimentações
                </h3>
                <div className="relative">
                  {/* Linha vertical da timeline */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {todayTransactions.map((transaction, index) => {
                      const isLast = index === todayTransactions.length - 1;
                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-start gap-4"
                        >
                          {/* Ponto da timeline */}
                          <div className="relative z-10 flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background"
                              style={{ borderColor: transaction.bankColor || '#8B5CF6' }}
                            >
                              <Minus
                                className="h-5 w-5"
                                style={{ color: transaction.bankColor || '#8B5CF6' }}
                              />
                            </div>
                          </div>

                          {/* Conteúdo da transação */}
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{transaction.description}</p>
                                  {transaction.paymentMethod && (
                                    <Badge variant="outline" className="text-xs">
                                      {paymentMethodLabels[transaction.paymentMethod] || transaction.paymentMethod}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: transaction.bankColor || '#8B5CF6' }}
                                  />
                                  <span>{transaction.bankName}</span>
                                  {transaction.bankType && (
                                    <>
                                      <span>•</span>
                                      <span>{bankTypeLabels[transaction.bankType] || transaction.bankType}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>
                                    {format(new Date(transaction.timestamp), 'HH:mm', { locale: ptBR })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Antes: </span>
                                    <span className="font-medium">{formatCurrency(transaction.balanceBefore)}</span>
                                  </div>
                                  <ArrowDown className="h-4 w-4 text-destructive" />
                                  <div>
                                    <span className="text-muted-foreground">Depois: </span>
                                    <span className="font-semibold text-destructive">
                                      {formatCurrency(transaction.balanceAfter)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-destructive">
                                    -{formatCurrency(transaction.amount)}
                                  </p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEdit(transaction.id)}
                                    title="Editar compra"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingPurchaseId(transaction.id)}
                                    title="Excluir compra"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {todayTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma movimentação registrada neste dia
                </p>
              </div>
            )}

            {/* Saldos Finais */}
            {todayTransactions.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {periodFilter === 'day' ? 'Saldos Finais' : `Saldo Final do ${periodFilter === 'week' ? 'Período' : periodFilter === 'month' ? 'Mês' : 'Ano'}`}
                </h3>
                {banks.map((bank) => {
                  const bankTransactions = todayTransactions.filter(t => t.bankId === bank.id);
                  if (bankTransactions.length === 0) return null;
                  
                  const lastTransaction = bankTransactions[bankTransactions.length - 1];
                  return (
                    <motion.div
                      key={bank.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: bank.color || '#8B5CF6', opacity: 0.2 }}
                        >
                          <Building2
                            className="h-5 w-5"
                            style={{ color: bank.color || '#8B5CF6' }}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{bank.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {periodFilter === 'day' ? 'Saldo final do dia' : `Saldo final do ${periodFilter === 'week' ? 'período' : periodFilter === 'month' ? 'mês' : 'ano'}`}
                            </p>
                            {bank.type && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <p className="text-xs text-muted-foreground">
                                  {bankTypeLabels[bank.type] || bank.type}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(lastTransaction.balanceAfter)}</p>
                        <p className="text-xs text-muted-foreground">
                          {bankTransactions.length} {bankTransactions.length === 1 ? 'movimentação' : 'movimentações'}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Dialog de Edição */}
      {formOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleFormClose();
            }
          }}
        >
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border p-6">
            <PurchaseForm
              purchaseId={editingPurchaseId}
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
              showCard={false}
            />
          </div>
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingPurchaseId}
        onOpenChange={(open) => !open && setDeletingPurchaseId(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Compra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita e o saldo da conta será atualizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

