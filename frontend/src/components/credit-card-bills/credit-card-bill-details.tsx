'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Calendar, DollarSign, CheckCircle2, Building2, Loader2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  isPaid?: boolean;
  category?: {
    name: string;
    color?: string;
  } | null;
  bank?: {
    name: string;
  } | null;
  paidBank?: {
    name: string;
  } | null;
}

interface CreditCardBillDetails {
  id: string;
  description: string;
  closingDate: string;
  dueDate: string;
  bestPurchaseDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  bank?: { name: string } | null;
  paidBank?: { id: string; name: string } | null;
  notes?: string | null;
  expenses: Expense[];
}

interface CreditCardBillDetailsProps {
  open: boolean;
  onClose: () => void;
  billId: string | null;
}

export function CreditCardBillDetails({ open, onClose, billId }: CreditCardBillDetailsProps) {
  const [bill, setBill] = useState<CreditCardBillDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && billId) {
      fetchBillDetails();
    } else {
      setBill(null);
    }
  }, [open, billId]);

  const fetchBillDetails = async () => {
    if (!billId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/credit-card-bills/${billId}`);
      setBill(response.data);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao carregar detalhes da fatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Detalhes da Fatura
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a fatura e suas despesas
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bill ? (
          <div className="space-y-6">
            {/* Informações da Fatura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{bill.description}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      Fechamento
                    </p>
                    <p className="font-medium">
                      {format(new Date(bill.closingDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      Vencimento
                    </p>
                    <p className="font-medium text-red-600">
                      {format(new Date(bill.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Total
                    </p>
                    <p className="font-bold text-lg">
                      {formatCurrency(Number(bill.totalAmount) || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      Status
                    </p>
                    {bill.isPaid ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Paga
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Pendente</Badge>
                    )}
                  </div>
                </div>

                {bill.isPaid && bill.paidBank && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Banco usado para pagar:
                      </span>
                      <span className="font-medium text-blue-600">
                        {bill.paidBank.name}
                      </span>
                    </div>
                    {bill.paidAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Valor pago:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(bill.paidAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {bill.bank && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Cartão:</span>
                    <span className="font-medium">{bill.bank.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lista de Despesas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Despesas ({bill.expenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bill.expenses.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma despesa encontrada nesta fatura
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bill.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{expense.description}</p>
                            {expense.isPaid && (
                              <Badge variant="outline" className="text-xs">
                                Paga
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              {format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            {expense.category && (
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: expense.category.color || undefined,
                                  color: expense.category.color || undefined,
                                }}
                              >
                                {expense.category.name}
                              </Badge>
                            )}
                            {expense.bank && (
                              <span className="text-xs">Cartão: {expense.bank.name}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {formatCurrency(expense.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

