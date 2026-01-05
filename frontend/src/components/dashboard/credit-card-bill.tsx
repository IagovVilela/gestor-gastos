'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, DollarSign, Plus, Edit, CheckCircle2, XCircle, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCardBillForm } from '@/components/credit-card-bills/credit-card-bill-form';
import { useToast } from '@/hooks/use-toast';

interface CreditExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentDate: string;
  isPaid?: boolean;
  paymentSource?: {
    type: 'paid' | 'current_balance' | 'future_receipts' | 'insufficient';
    label: string;
  };
  category?: {
    name: string;
    color?: string;
  } | null;
  bank?: {
    name: string;
  } | null;
  paidBank?: {
    id: string;
    name: string;
  } | null;
}

interface CreditCardBillInfo {
  id: string;
  description: string;
  closingDate: string;
  dueDate: string;
  bestPurchaseDate?: string | null;
  totalAmount: number;
  isPaid: boolean;
  bank?: { name: string } | null;
}

interface CreditCardBillData {
  total: number;
  paidTotal: number;
  unpaidTotal: number;
  paid: CreditExpense[];
  unpaid: CreditExpense[];
  bill: CreditCardBillInfo | null;
}

export function CreditCardBill() {
  const { toast } = useToast();
  const [data, setData] = useState<CreditCardBillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | undefined>();
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/expenses/credit-card');
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar fatura do cartão:', error);
      setData({
        total: 0,
        paidTotal: 0,
        unpaidTotal: 0,
        paid: [],
        unpaid: [],
        bill: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingBillId(undefined);
    fetchData();
    toast({
      title: 'Sucesso',
      description: 'Fatura salva com sucesso',
    });
  };

  const handleEditBill = () => {
    if (data?.bill) {
      setEditingBillId(data.bill.id);
      setFormOpen(true);
    }
  };

  const handleCreateBill = () => {
    setEditingBillId(undefined);
    setFormOpen(true);
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
      } else {
        await api.patch(`/expenses/${expenseId}/mark-unpaid`);
      }
      fetchData();
      
      // Disparar evento para atualizar saldos em outros componentes
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
      
      toast({
        title: 'Sucesso',
        description: isPaid ? 'Despesa marcada como paga' : 'Despesa marcada como não paga',
      });
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
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fatura do Cartão de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Fatura do Cartão de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma compra no cartão de crédito registrada
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <>
      <FadeIn>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Fatura do Cartão de Crédito
              </CardTitle>
              <div className="flex gap-2">
                {data.bill ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditBill}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Fatura
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateBill}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Criar Fatura
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Informações da Fatura */}
              {data.bill ? (
                <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Calendar className="h-4 w-4" />
                      {data.bill.description}
                    </h3>
                    {data.bill.isPaid ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paga
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">📅 Fechamento</span>
                        <span className="text-sm font-semibold">
                          {format(new Date(data.bill.closingDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground block mb-1">⏰ Vencimento</span>
                        <span className="text-sm font-semibold text-red-600">
                          {format(new Date(data.bill.dueDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    {data.bill.bestPurchaseDate && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block mb-1">💡 Melhor Compra</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {format(new Date(data.bill.bestPurchaseDate), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {data.bill.bank && (
                    <div className="text-xs text-muted-foreground">
                      Banco: <span className="font-semibold">{data.bill.bank.name}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Valor Total da Fatura:</span>
                      <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(data.bill.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="bill-paid" className="text-sm font-medium text-muted-foreground cursor-pointer">
                        Marcar fatura como paga
                      </label>
                      <Switch
                        id="bill-paid"
                        checked={data.bill.isPaid}
                        onCheckedChange={async (checked) => {
                          try {
                            if (checked) {
                              await api.patch(`/credit-card-bills/${data.bill!.id}/mark-paid`);
                            } else {
                              await api.patch(`/credit-card-bills/${data.bill!.id}/mark-unpaid`);
                            }
                            fetchData();
                            
                            // Disparar evento para atualizar saldos em outros componentes
                            window.dispatchEvent(new CustomEvent('balanceUpdated'));
                            
                            toast({
                              title: 'Sucesso',
                              description: checked ? 'Fatura marcada como paga' : 'Fatura marcada como não paga',
                            });
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Erro ao atualizar status da fatura',
                              variant: 'destructive',
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                        Fatura não cadastrada
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Cadastre uma fatura para ver as datas de fechamento, vencimento e melhor data para compras.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateBill}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Criar
                    </Button>
                  </div>
                </div>
              )}

            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold">{formatCurrency(data.total)}</p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-sm text-muted-foreground mb-1">Já Pagas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.paidTotal)}
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                <p className="text-sm text-muted-foreground mb-1">A Pagar</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(data.unpaidTotal)}
                </p>
              </div>
            </div>

            {/* Despesas a Pagar */}
            {data.unpaid.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  A Pagar ({data.unpaid.length})
                </h3>
                <div className="space-y-2">
                  {data.unpaid.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.paymentDate), "dd 'de' MMM", {
                              locale: ptBR,
                            })}
                          </p>
                          {expense.paymentSource && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  expense.paymentSource.type === 'current_balance' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : expense.paymentSource.type === 'future_receipts'
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                                }`}
                              >
                                {expense.paymentSource.label}
                              </Badge>
                            </>
                          )}
                          {expense.category && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-xs">
                                {expense.category.name}
                              </Badge>
                            </>
                          )}
                          {expense.bank && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {expense.bank.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>
                        <Switch
                          checked={expense.isPaid || false}
                          onCheckedChange={(checked) => handleMarkAsPaid(expense.id, !checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Despesas Já Pagas */}
            {data.paid.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Já Pagas ({data.paid.length})
                </h3>
                <div className="space-y-2">
                  {data.paid.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 opacity-75"
                    >
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
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            Pago em {format(new Date(expense.paymentDate), "dd 'de' MMM", {
                              locale: ptBR,
                            })}
                            {expense.paidBank && (
                              <> • Banco: <span className="font-semibold">{expense.paidBank.name}</span></>
                            )}
                          </p>
                          {expense.paymentSource && expense.paymentSource.type !== 'paid' && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  expense.paymentSource.type === 'current_balance' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : expense.paymentSource.type === 'future_receipts'
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                    : 'bg-red-50 text-red-700 border-red-300'
                                }`}
                              >
                                {expense.paymentSource.label}
                              </Badge>
                            </>
                          )}
                          {expense.category && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <Badge variant="outline" className="text-xs">
                                {expense.category.name}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="font-semibold text-muted-foreground">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>
                        <Switch
                          checked={expense.isPaid || false}
                          onCheckedChange={(checked) => handleMarkAsPaid(expense.id, !checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </FadeIn>

      {/* Formulário de Fatura */}
      <CreditCardBillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
        billId={editingBillId}
      />

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

