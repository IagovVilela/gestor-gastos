'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Calendar, DollarSign, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { CreditCardBillForm } from './credit-card-bill-form';

interface FutureBillExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  isPaid: boolean;
  isProjected?: boolean; // Indica se é uma despesa projetada (recorrente)
  category?: {
    name: string;
    color?: string;
  } | null;
  bank?: {
    name: string;
  } | null;
}

interface FutureBill {
  id: string;
  description: string;
  closingDate: string;
  dueDate: string;
  bestPurchaseDate?: string | null;
  totalAmount: number;
  isPaid: boolean;
  bank?: {
    id: string;
    name: string;
  } | null;
  expenses: FutureBillExpense[];
}

export function FutureBillsList() {
  const { toast } = useToast();
  const [bills, setBills] = useState<FutureBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [monthsAhead, setMonthsAhead] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchBanks();
    fetchFutureBills();
  }, [selectedBankId, monthsAhead, startDate, endDate]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchFutureBills = async () => {
    try {
      setLoading(true);
      const params: any = {
        monthsAhead,
      };

      if (selectedBankId !== 'all') {
        params.bankId = selectedBankId === 'none' ? null : selectedBankId;
      }

      if (startDate) {
        params.startDate = startDate;
      }

      if (endDate) {
        params.endDate = endDate;
      }

      const response = await api.get('/credit-card-bills/future', { params });
      setBills(response.data);
    } catch (error) {
      console.error('Erro ao carregar faturas futuras:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar faturas futuras',
        variant: 'destructive',
      });
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleBillExpanded = (billId: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billId)) {
      newExpanded.delete(billId);
    } else {
      newExpanded.add(billId);
    }
    setExpandedBills(newExpanded);
  };

  const handleEditBill = (billId: string) => {
    setEditingBillId(billId);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingBillId(undefined);
    fetchFutureBills();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Faturas Futuras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Faturas Futuras
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="bank-filter">Banco</Label>
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os bancos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os bancos</SelectItem>
                    <SelectItem value="none">Sem banco</SelectItem>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="months-ahead">Meses à frente</Label>
                <Input
                  id="months-ahead"
                  type="number"
                  min="1"
                  max="12"
                  value={monthsAhead}
                  onChange={(e) => setMonthsAhead(parseInt(e.target.value) || 5)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Data inicial (opcional)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data final (opcional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Lista de faturas futuras */}
            {bills.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma fatura futura encontrada
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  As faturas futuras são geradas automaticamente quando há despesas de crédito
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bills.map((bill) => (
                  <Card key={bill.id} className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">{bill.description}</CardTitle>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            Futura
                          </Badge>
                          {bill.isPaid && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              Paga
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBill(bill.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleBillExpanded(bill.id)}
                          >
                            {expandedBills.has(bill.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-700">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">
                            📅 Fechamento
                          </span>
                          <span className="text-sm font-semibold">
                            {format(new Date(bill.closingDate), "dd 'de' MMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-700">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">
                            ⏰ Vencimento
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            {format(new Date(bill.dueDate), "dd 'de' MMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {bill.bestPurchaseDate && (
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-700">
                            <span className="text-xs font-medium text-muted-foreground block mb-1">
                              💡 Melhor Compra
                            </span>
                            <span className="text-sm font-semibold text-yellow-600">
                              {format(new Date(bill.bestPurchaseDate), "dd 'de' MMM", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {bill.bank && (
                        <div className="text-sm text-muted-foreground mb-4">
                          Banco: <span className="font-semibold">{bill.bank.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          Valor Estimado:
                        </span>
                        <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(bill.totalAmount)}
                        </span>
                      </div>

                      {expandedBills.has(bill.id) && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Compras que aparecerão nesta fatura ({bill.expenses.length})
                          </h4>
                          {bill.expenses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Nenhuma compra ainda para esta fatura
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {bill.expenses.map((expense) => (
                                <div
                                  key={expense.id}
                                  className="flex items-center justify-between p-3 border rounded-lg"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{expense.description}</p>
                                      {expense.isProjected && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-blue-50 text-blue-700 border-blue-300"
                                        >
                                          Projetada
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(expense.date), "dd 'de' MMM", {
                                          locale: ptBR,
                                        })}
                                      </p>
                                      {expense.category && (
                                        <>
                                          <span className="text-muted-foreground">•</span>
                                          <Badge variant="outline" className="text-xs">
                                            {expense.category.name}
                                          </Badge>
                                        </>
                                      )}
                                      {expense.isPaid && (
                                        <>
                                          <span className="text-muted-foreground">•</span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-green-50 text-green-700 border-green-300"
                                          >
                                            Paga
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-red-600">
                                      {formatCurrency(expense.amount)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
    </>
  );
}

