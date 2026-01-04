'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentDate: string;
  category?: {
    name: string;
    color?: string;
  } | null;
  bank?: {
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
  const [data, setData] = useState<CreditCardBillData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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
      });
    } finally {
      setLoading(false);
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
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fatura do Cartão de Crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Informações da Fatura */}
            {data.bill && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Calendar className="h-4 w-4" />
                  Informações da Fatura
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-xs font-medium text-muted-foreground">📅 Fechamento:</span>
                    <span className="text-xs font-semibold">
                      {format(new Date(data.bill.closingDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800">
                    <span className="text-xs font-medium text-muted-foreground">⏰ Vencimento:</span>
                    <span className="text-xs font-semibold text-red-600">
                      {format(new Date(data.bill.dueDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {data.bill.bestPurchaseDate && (
                    <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800">
                      <span className="text-xs font-medium text-muted-foreground">💡 Melhor data para compra:</span>
                      <span className="text-xs font-semibold text-blue-600">
                        {format(new Date(data.bill.bestPurchaseDate), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>
                  )}
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
                      <div className="text-right ml-4">
                        <p className="font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </p>
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
                        <p className="font-medium truncate">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            Pago em {format(new Date(expense.paymentDate), "dd 'de' MMM", {
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
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold text-muted-foreground">
                          {formatCurrency(expense.amount)}
                        </p>
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
  );
}

