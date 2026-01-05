'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { HoverScale } from '@/components/animations/hover-scale';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FutureReceipt {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: { name: string; color: string } | null;
  bank?: { name: string } | null;
}

interface FutureExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: { name: string; color: string } | null;
  bank?: { name: string } | null;
  paymentMethod?: string;
}

interface Phase {
  name: string;
  description: string;
  balance: number;
  date: string;
}

interface CreditCardBill {
  id: string;
  description: string;
  closingDate: string;
  dueDate: string;
  bestPurchaseDate?: string | null;
  totalAmount: number;
  isPaid: boolean;
  bank?: { name: string } | null;
}

interface ProjectedBalanceData {
  currentBalance: number;
  totalReceipts: number;
  totalExpenses: number;
  creditCardTotal: number;
  monthlyBalance: number; // Receitas totais - Despesas totais - Fatura do cartão
  futureReceiptsTotal: number;
  futureExpensesTotal: number;
  projectedBalance: number;
  futureReceiptsCount: number;
  futureExpensesCount: number;
  pastReceiptsCount: number;
  pastExpensesCount: number;
  phases: {
    phase1: Phase;
    phase2: Phase;
    phase3: Phase;
    phase4: Phase;
  };
  creditCardBill: CreditCardBill | null;
  futureReceipts: FutureReceipt[];
  futureExpenses: FutureExpense[];
  monthlyExpenses: FutureExpense[]; // Todas as despesas mensais (Fase 3)
  creditCardExpensesDetails: FutureExpense[]; // Despesas do cartão (Fase 4)
}

export function ProjectedBalance() {
  const [data, setData] = useState<ProjectedBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/projected-balance');
        setData(response.data);
      } catch (error) {
        console.error('Erro ao carregar saldo projetado:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Escutar evento de atualização de saldo
    const handleBalanceUpdate = () => {
      fetchData();
    };
    
    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate);
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-40 animate-pulse rounded bg-muted mb-2" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const difference = data.phases.phase4.balance - data.currentBalance;
  const isPositive = difference >= 0;

  return (
    <FadeIn>
      <HoverScale>
        <Card className="border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo Projetado
            </CardTitle>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8 w-8 p-0"
              >
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {formatCurrency(data.phases.phase4.balance)}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Saldo após pagar todas as contas (receitas, despesas e fatura do cartão)
            </p>

            {/* Fases do Saldo */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Fases do Saldo:</h4>
              
              {/* Fase 1 */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Fase 1: {data.phases.phase1.name}</span>
                  <span className="text-lg font-bold">{formatCurrency(data.phases.phase1.balance)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{data.phases.phase1.description}</p>
              </div>

              {/* Fase 2 */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    Fase 2: {data.phases.phase2.name}
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(data.phases.phase2.balance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{data.phases.phase2.description}</p>
                <p className="text-xs text-green-600 mt-1">
                  +{formatCurrency(data.totalReceipts || 0)} em receitas
                </p>
              </div>

              {/* Fase 3 */}
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-yellow-600" />
                    Fase 3: {data.phases.phase3.name}
                  </span>
                  <span className={`text-lg font-bold ${
                    data.phases.phase3.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(data.phases.phase3.balance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{data.phases.phase3.description}</p>
                <p className="text-xs text-red-600 mt-1 font-semibold">
                  -{formatCurrency(data.totalExpenses || 0)} em despesas mensais ({data.monthlyExpenses?.length || 0} despesa(s))
                </p>
                {data.monthlyExpenses && data.monthlyExpenses.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Ver despesas que serão pagas ({data.monthlyExpenses.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {data.monthlyExpenses.map((expense) => (
                        <div key={expense.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-white dark:bg-gray-800">
                          <div className="flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(expense.date), "dd/MM", { locale: ptBR })}
                              {expense.category && (
                                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                  {expense.category.name}
                                </Badge>
                              )}
                            </p>
                          </div>
                          <span className="text-red-600 font-semibold ml-2">
                            -{formatCurrency(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Fase 4 */}
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Fase 4: {data.phases.phase4.name}
                  </span>
                  <span className={`text-xl font-bold ${
                    data.phases.phase4.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(data.phases.phase4.balance)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{data.phases.phase4.description}</p>
                <div className="mt-2 space-y-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 font-semibold">
                    -{formatCurrency(data.creditCardTotal || 0)} em fatura do cartão ({data.creditCardExpensesDetails?.length || 0} compra(s))
                  </p>
                  {data.creditCardBill ? (
                    <div className="space-y-1.5 border-t pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">📅 Fechamento:</span>
                        <span className="text-xs font-semibold">
                          {format(new Date(data.creditCardBill.closingDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">⏰ Vencimento:</span>
                        <span className="text-xs font-semibold text-red-600">
                          {format(new Date(data.creditCardBill.dueDate), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      {data.creditCardBill.bestPurchaseDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">💡 Melhor data para compra:</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {format(new Date(data.creditCardBill.bestPurchaseDate), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 border-t pt-2">
                      <p className="text-xs text-muted-foreground italic text-center py-1">
                        ⚠️ Fatura não cadastrada. Cadastre uma fatura para ver as datas de fechamento e vencimento.
                      </p>
                    </div>
                  )}
                </div>
                {data.creditCardExpensesDetails && data.creditCardExpensesDetails.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Ver compras na fatura ({data.creditCardExpensesDetails.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {data.creditCardExpensesDetails.map((expense) => (
                        <div key={expense.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-white dark:bg-gray-800">
                          <div className="flex-1">
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-muted-foreground">
                              {format(new Date(expense.date), "dd/MM", { locale: ptBR })}
                              {expense.category && (
                                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                                  {expense.category.name}
                                </Badge>
                              )}
                            </p>
                          </div>
                          <span className="text-red-600 font-semibold ml-2">
                            -{formatCurrency(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Detalhes Expandidos */}
            {showDetails && (
              <div className="mt-6 space-y-4 pt-4 border-t">
                {/* Receitas Futuras */}
                {data.futureReceipts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Receitas que Entrarão ({data.futureReceipts.length}):
                    </h4>
                    <div className="space-y-2">
                      {data.futureReceipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{receipt.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(receipt.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                              {receipt.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {receipt.category.name}
                                </Badge>
                              )}
                              {receipt.bank && ` • ${receipt.bank.name}`}
                            </p>
                          </div>
                          <span className="font-semibold text-green-600 ml-4">
                            +{formatCurrency(receipt.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Despesas Futuras */}
                {data.futureExpenses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Despesas que Sairão ({data.futureExpenses.length}):
                    </h4>
                    <div className="space-y-2">
                      {data.futureExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(expense.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                              {expense.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {expense.category.name}
                                </Badge>
                              )}
                              {expense.bank && ` • ${expense.bank.name}`}
                              {expense.paymentMethod && ` • ${expense.paymentMethod.replace(/_/g, ' ')}`}
                            </p>
                          </div>
                          <span className="font-semibold text-red-600 ml-4">
                            -{formatCurrency(expense.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensagem se não houver transações futuras */}
                {data.futureReceipts.length === 0 && data.futureExpenses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma transação futura registrada para este mês.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </HoverScale>
    </FadeIn>
  );
}
