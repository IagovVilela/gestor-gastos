'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpenseForm } from './expense-form';
import { ExpenseFilters } from './expense-filters';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ArrowDownCircle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentDate?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  category?: {
    name: string;
  } | null;
  bank?: {
    name: string;
  } | null;
  paidBank?: {
    id: string;
    name: string;
  } | null;
  isRecurring: boolean;
  isFixed: boolean;
  recurringType?: string;
  notes?: string;
  receiptImageUrl?: string;
}

export function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | undefined>();
  const [deletingExpense, setDeletingExpense] = useState<string | undefined>();
  const [filters, setFilters] = useState<import('./expense-filters').ExpenseFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [banks, setBanks] = useState<Array<{ 
    id: string; 
    name: string; 
    type: string;
    balance: number;
    savingsAccount?: {
      id: string;
      name: string;
      currentAmount: number;
      targetAmount?: number | null;
      description?: string | null;
    } | null;
  }>>([]);
  const [paymentMode, setPaymentMode] = useState<'single' | 'combined'>('single');
  const [combinedPayments, setCombinedPayments] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  useEffect(() => {
    fetchExpenses(1); // Resetar para página 1 quando filtros mudarem
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', {
        params: { type: 'EXPENSE' },
      });
      setCategories(response.data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchExpenses = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pagination.limit,
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'page') {
          params[key] = value;
        }
      });
      const response = await api.get('/expenses', { params });
      
      // Suportar formato antigo (array) e novo (objeto com paginação)
      if (Array.isArray(response.data)) {
        setExpenses(response.data);
      } else {
        setExpenses(response.data.data || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar despesas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: import('./expense-filters').ExpenseFilters) => {
    setFilters(newFilters);
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;

    try {
      await api.delete(`/expenses/${deletingExpense}`);
      toast({
        title: 'Sucesso',
        description: 'Despesa deletada com sucesso',
      });
      fetchExpenses();
      setDeletingExpense(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar despesa',
        variant: 'destructive',
      });
    }
  };


  const handleMarkAsPaid = (expenseId: string, currentIsPaid: boolean) => {
    if (currentIsPaid) {
      // Se já está pago, apenas desmarcar
      handleTogglePaid(expenseId, false);
    } else {
      // Se não está pago, abrir diálogo para selecionar banco
      const expense = expenses.find(e => e.id === expenseId);
      setSelectedExpenseId(expenseId);
      setSelectedExpense(expense || null);
      setSelectedBankId('');
      setPaymentMode('single');
      setCombinedPayments({});
      setMarkPaidDialogOpen(true);
    }
  };

  const handleTogglePaid = async (expenseId: string, isPaid: boolean, paymentBankId?: string, payments?: Array<{ bankId: string; amount: number }>) => {
    try {
      if (isPaid) {
        if (payments && payments.length > 0) {
          await api.patch(`/expenses/${expenseId}/mark-paid`, {
            payments,
          });
        } else {
          await api.patch(`/expenses/${expenseId}/mark-paid`, {
            paymentBankId: paymentBankId || undefined,
          });
        }
        toast({
          title: 'Sucesso',
          description: 'Despesa marcada como paga',
        });
      } else {
        await api.patch(`/expenses/${expenseId}/mark-unpaid`);
        toast({
          title: 'Sucesso',
          description: 'Despesa marcada como não paga',
        });
      }
      fetchExpenses(pagination.page);
      
      // Disparar evento para atualizar saldos em outros componentes
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao atualizar status da despesa',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmMarkAsPaid = () => {
    if (!selectedExpenseId || !selectedExpense) return;

    const expenseAmount = selectedExpense.amount;
    const combinedTotal = Object.values(combinedPayments).reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = expenseAmount - combinedTotal;

    if (paymentMode === 'combined') {
      // Validar que o total está correto
      if (Math.abs(remainingAmount) > 0.01) {
        toast({
          title: 'Erro',
          description: remainingAmount > 0 
            ? `Ainda falta distribuir ${formatCurrency(remainingAmount)}`
            : `O valor distribuído excede a despesa em ${formatCurrency(Math.abs(remainingAmount))}`,
          variant: 'destructive',
        });
        return;
      }

      // Criar array de pagamentos
      const payments = Object.entries(combinedPayments)
        .filter(([_, amount]) => amount > 0)
        .map(([bankId, amount]) => ({
          bankId,
          amount,
        }));

      handleTogglePaid(selectedExpenseId, true, undefined, payments);
    } else {
      handleTogglePaid(selectedExpenseId, true, selectedBankId || undefined);
    }

    setMarkPaidDialogOpen(false);
    setSelectedExpenseId(null);
    setSelectedExpense(null);
    setSelectedBankId('');
    setPaymentMode('single');
    setCombinedPayments({});
  };

  const bankTypeLabels: Record<string, string> = {
    SALARY_ACCOUNT: 'Conta Salário',
    CURRENT_ACCOUNT: 'Conta Corrente',
    SAVINGS_ACCOUNT: 'Conta Poupança',
    INVESTMENT: 'Conta Investimento',
    CREDIT_CARD: 'Cartão de Crédito',
    DIGITAL_WALLET: 'Carteira Digital',
    OTHER: 'Outros',
  };

  // Agrupar contas por nome do banco
  const groupedBanks = banks.reduce((acc, bank) => {
    const bankName = bank.name;
    if (!acc[bankName]) {
      acc[bankName] = [];
    }
    acc[bankName].push(bank);
    return acc;
  }, {} as Record<string, typeof banks>);

  const expenseAmount = selectedExpense ? selectedExpense.amount : 0;
  const combinedTotal = Object.values(combinedPayments).reduce((sum, amount) => sum + amount, 0);
  const remainingAmount = expenseAmount - combinedTotal;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ExpenseFilters onFilterChange={handleFilterChange} categories={categories} />
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl sm:text-2xl">Despesas</CardTitle>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Despesa
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma despesa registrada
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeira despesa
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4 flex-1 w-full sm:w-auto min-w-0">
                    <ArrowDownCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1 sm:mt-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{expense.description}</p>
                        {expense.isPaid && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            <Check className="h-3 w-3 mr-1" />
                            Paga
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.date), "dd 'de' MMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                        {expense.paymentDate && expense.paymentDate !== expense.date && (
                          <> • Pagar em {format(new Date(expense.paymentDate), "dd 'de' MMM", { locale: ptBR })}</>
                        )}
                        {expense.isPaid && expense.paidBank && (
                          <> • Pago com: <span className="font-semibold">{expense.paidBank.name}</span></>
                        )}
                        {expense.category && ` • ${expense.category.name}`}
                        {expense.isFixed && ` • Fixo`}
                        {expense.isRecurring && ` • Recorrente`}
                      </p>
                      {expense.receiptImageUrl && (
                        <div className="mt-2">
                          <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                            <Image
                              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${expense.receiptImageUrl}`}
                              alt="Comprovante"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-right sm:text-left flex-shrink-0">
                      <p className="font-semibold text-red-600 text-lg sm:text-base">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`paid-${expense.id}`} className="text-sm text-muted-foreground">
                        Paga
                      </Label>
                      <Switch
                        id={`paid-${expense.id}`}
                        checked={expense.isPaid || false}
                        onCheckedChange={(checked) => handleMarkAsPaid(expense.id, !checked)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingExpense(expense.id);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} despesas
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExpenses(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchExpenses(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingExpense(undefined);
        }}
        onSuccess={() => {
          fetchExpenses(pagination.page);
          setFormOpen(false);
          setEditingExpense(undefined);
        }}
        expenseId={editingExpense}
      />

      <AlertDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para selecionar banco ao marcar como pago */}
      <Dialog open={markPaidDialogOpen} onOpenChange={(open) => {
        setMarkPaidDialogOpen(open);
        if (!open) {
          setSelectedExpenseId(null);
          setSelectedExpense(null);
          setSelectedBankId('');
          setPaymentMode('single');
          setCombinedPayments({});
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marcar Despesa como Paga</DialogTitle>
            <DialogDescription>
              Valor da despesa: <span className="font-semibold">{selectedExpense ? formatCurrency(selectedExpense.amount) : formatCurrency(0)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={paymentMode} onValueChange={(value) => setPaymentMode(value as 'single' | 'combined')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Pagamento Único</TabsTrigger>
                <TabsTrigger value="combined">Pagamento Combinado</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-3">
                <Label>Selecione uma conta para pagar a despesa completa</Label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {banks.map((bank) => {
                    const isSelected = selectedBankId === bank.id;
                    const bankBalance = Number(bank.balance || 0);
                    const balanceAfter = bankBalance - expenseAmount;
                    const isSavingsAccount = bank.type === 'SAVINGS_ACCOUNT';
                    const hasSavings = isSavingsAccount && bank.savingsAccount;

                    return (
                      <div
                        key={bank.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedBankId(bank.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => setSelectedBankId(bank.id)}
                                className="mt-1"
                              />
                              <span className="font-semibold">{bank.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {bankTypeLabels[bank.type] || bank.type}
                              </Badge>
                            </div>
                            
                            <div className="ml-6 space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">Saldo atual: </span>
                                <span className={`font-semibold ${bankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(bankBalance)}
                                </span>
                              </p>
                              
                              <p className="text-sm">
                                <span className="text-muted-foreground">Saldo após pagamento: </span>
                                <span className={`font-semibold ${balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(balanceAfter)}
                                </span>
                              </p>

                              {/* Diagnóstico para poupanças */}
                              {isSavingsAccount && hasSavings && bank.savingsAccount && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                    📊 Diagnóstico da Poupança
                                  </p>
                                  <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                                    <p>
                                      <span className="font-medium">Poupança:</span> {bank.savingsAccount.name}
                                    </p>
                                    <p>
                                      <span className="font-medium">Valor guardado:</span> {formatCurrency(Number(bank.savingsAccount.currentAmount))}
                                    </p>
                                    {bank.savingsAccount.targetAmount && (
                                      <p>
                                        <span className="font-medium">Meta:</span> {formatCurrency(Number(bank.savingsAccount.targetAmount))}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Aviso se saldo ficará negativo */}
                              {!isSavingsAccount && balanceAfter < 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                                  ⚠️ Atenção: O saldo ficará negativo após o pagamento!
                                </p>
                              )}

                              {/* Confirmação se saldo é suficiente */}
                              {!isSavingsAccount && balanceAfter >= 0 && bankBalance >= expenseAmount && (
                                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                  ✓ Saldo suficiente para pagar a despesa
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Opção sem banco específico */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBankId === 'none' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedBankId('none')}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={selectedBankId === 'none'}
                        onChange={() => setSelectedBankId('none')}
                      />
                      <span className="font-medium">Sem banco específico</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      O saldo não será atualizado automaticamente
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="combined" className="space-y-3">
                <Label>Distribua o pagamento entre múltiplas contas</Label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedBanks).map(([bankName, accounts]) => (
                    <div key={bankName} className="border rounded-lg p-3">
                      <h4 className="font-semibold mb-2 text-lg">{bankName}</h4>
                      <div className="space-y-2">
                        {accounts.map((account) => {
                          const paymentAmount = combinedPayments[account.id] || 0;
                          const accountBalance = Number(account.balance || 0);
                          const balanceAfter = accountBalance - paymentAmount;
                          const isSavingsAccount = account.type === 'SAVINGS_ACCOUNT';
                          const hasSavings = isSavingsAccount && account.savingsAccount;
                          const maxAmount = Math.min(accountBalance, remainingAmount + paymentAmount);

                          return (
                            <div key={account.id} className="p-2 border rounded bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {bankTypeLabels[account.type] || account.type}
                                  </Badge>
                                  {isSavingsAccount && hasSavings && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                      Poupança: {account.savingsAccount.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Saldo: </span>
                                  <span className={`font-semibold ${accountBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(accountBalance)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`amount-${account.id}`} className="text-xs w-24">
                                    Valor a pagar:
                                  </Label>
                                  <Input
                                    id={`amount-${account.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={maxAmount}
                                    value={paymentAmount || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setCombinedPayments({
                                        ...combinedPayments,
                                        [account.id]: Math.min(value, maxAmount),
                                      });
                                    }}
                                    placeholder="0,00"
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCombinedPayments({
                                        ...combinedPayments,
                                        [account.id]: Math.min(accountBalance, remainingAmount + paymentAmount),
                                      });
                                    }}
                                  >
                                    Máx
                                  </Button>
                                </div>
                                
                                {paymentAmount > 0 && (
                                  <div className="text-xs space-y-1">
                                    <p>
                                      <span className="text-muted-foreground">Saldo após: </span>
                                      <span className={`font-semibold ${balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(balanceAfter)}
                                      </span>
                                    </p>
                                    {balanceAfter < 0 && (
                                      <p className="text-red-600 dark:text-red-400 font-semibold">
                                        ⚠️ Saldo ficará negativo!
                                      </p>
                                    )}
                                  </div>
                                )}

                                {isSavingsAccount && hasSavings && account.savingsAccount && paymentAmount > 0 && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                      📊 Diagnóstico da Poupança
                                    </p>
                                    <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                                      <p>
                                        <span className="font-medium">Valor guardado:</span> {formatCurrency(Number(account.savingsAccount.currentAmount))}
                                      </p>
                                      {account.savingsAccount.targetAmount && (
                                        <p>
                                          <span className="font-medium">Meta:</span> {formatCurrency(Number(account.savingsAccount.targetAmount))}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total distribuído:</span>
                    <span className={`font-bold text-lg ${Math.abs(remainingAmount) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(combinedTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Restante:</span>
                    <span className={`font-semibold ${Math.abs(remainingAmount) < 0.01 ? 'text-green-600' : remainingAmount > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                  {Math.abs(remainingAmount) > 0.01 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {remainingAmount > 0 
                        ? '⚠️ Ainda falta distribuir parte do valor'
                        : '⚠️ O valor distribuído excede o valor da despesa'}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMarkPaidDialogOpen(false);
                setSelectedExpenseId(null);
                setSelectedExpense(null);
                setSelectedBankId('');
                setPaymentMode('single');
                setCombinedPayments({});
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmMarkAsPaid}
              disabled={paymentMode === 'combined' && Math.abs(remainingAmount) > 0.01}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

