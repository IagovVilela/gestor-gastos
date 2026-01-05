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
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleMarkAsPaid = (expenseId: string, currentIsPaid: boolean) => {
    if (currentIsPaid) {
      // Se já está pago, apenas desmarcar
      handleTogglePaid(expenseId, false);
    } else {
      // Se não está pago, abrir diálogo para selecionar banco
      setSelectedExpenseId(expenseId);
      setSelectedBankId('');
      setMarkPaidDialogOpen(true);
    }
  };

  const handleTogglePaid = async (expenseId: string, isPaid: boolean, paymentBankId?: string) => {
    try {
      if (isPaid) {
        await api.patch(`/expenses/${expenseId}/mark-paid`, {
          paymentBankId: paymentBankId || undefined,
        });
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
    if (selectedExpenseId) {
      handleTogglePaid(selectedExpenseId, true, selectedBankId || undefined);
      setMarkPaidDialogOpen(false);
      setSelectedExpenseId(null);
      setSelectedBankId('');
    }
  };

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
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Despesa como Paga</DialogTitle>
            <DialogDescription>
              Selecione o banco usado para pagar esta despesa. O saldo será atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentBank">Banco usado para pagar</Label>
              <Select
                value={selectedBankId || 'none'}
                onValueChange={(value) => setSelectedBankId(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem banco específico</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não selecionar, o sistema usará o banco da despesa ou não atualizará o saldo.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMarkPaidDialogOpen(false);
                setSelectedExpenseId(null);
                setSelectedBankId('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmMarkAsPaid}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

