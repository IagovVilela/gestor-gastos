'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  CreditCard,
  PiggyBank,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  CheckCircle,
} from 'lucide-react';
import { FadeIn } from '@/components/animations/fade-in';
import { HoverScale } from '@/components/animations/hover-scale';

interface Insight {
  type: 'positive' | 'warning' | 'info' | 'critical';
  icon: React.ReactNode;
  title: string;
  message: string;
  priority: number; // Para ordenar por prioridade
}

export function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Calcular mês anterior
        const lastMonth = month === 1 ? 12 : month - 1;
        const lastMonthYear = month === 1 ? year - 1 : year;

        // Buscar dados do mês atual e anterior
        const [
          receiptsRes,
          expensesRes,
          expensesByCategoryRes,
          lastMonthReceiptsRes,
          lastMonthExpensesRes,
          projectedBalanceRes,
          creditCardBillRes,
          goalsRes,
          savingsRes,
        ] = await Promise.all([
          api.get(`/receipts/monthly/${year}/${month}`),
          api.get(`/expenses/monthly/${year}/${month}`),
          api.get(`/expenses/by-category/${year}/${month}`),
          api.get(`/receipts/monthly/${lastMonthYear}/${lastMonth}`),
          api.get(`/expenses/monthly/${lastMonthYear}/${lastMonth}`),
          api.get('/dashboard/projected-balance'),
          api.get('/credit-card-bills/current-month'),
          api.get('/goals'),
          api.get('/savings-accounts'),
        ]);

        const receipts = receiptsRes.data.total || 0;
        const expenses = expensesRes.data.total || 0;
        const balance = receipts - expenses;
        const expensesByCategory = expensesByCategoryRes.data || [];

        const lastMonthReceipts = lastMonthReceiptsRes.data.total || 0;
        const lastMonthExpenses = lastMonthExpensesRes.data.total || 0;
        const lastMonthBalance = lastMonthReceipts - lastMonthExpenses;

        const projectedBalance = projectedBalanceRes.data;
        const creditCardBill = creditCardBillRes.data;
        const goals = goalsRes.data || [];
        const savingsAccounts = savingsRes.data || [];

        const generatedInsights: Insight[] = [];

        // ========== INSIGHT 1: Saldo Projetado (Fase 4) - CRÍTICO ==========
        if (projectedBalance?.phases?.phase4) {
          const phase4Balance = projectedBalance.phases.phase4.balance;
          const monthlyObligations =
            (projectedBalance.totalExpenses || 0) + (projectedBalance.creditCardTotal || 0);
          const safetyMargin = Math.max(500, monthlyObligations * 0.1);

          if (phase4Balance < 0) {
            generatedInsights.push({
              type: 'critical',
              icon: <AlertTriangle className="h-5 w-5" />,
              title: '⚠️ Saldo Projetado Negativo',
              message: `Após pagar todas as contas, seu saldo ficará em ${formatCurrency(
                phase4Balance,
              )}. Você precisa de ${formatCurrency(
                Math.abs(phase4Balance),
              )} para cobrir todas as obrigações.`,
              priority: 1,
            });
          } else if (phase4Balance < safetyMargin) {
            generatedInsights.push({
              type: 'warning',
              icon: <AlertTriangle className="h-5 w-5" />,
              title: 'Saldo Projetado Baixo',
              message: `Após pagar todas as contas, você terá ${formatCurrency(
                phase4Balance,
              )} (margem de segurança: ${formatCurrency(safetyMargin)}). Considere reduzir gastos futuros.`,
              priority: 2,
            });
          } else {
            generatedInsights.push({
              type: 'positive',
              icon: <CheckCircle className="h-5 w-5" />,
              title: 'Saldo Projetado Saudável',
              message: `Após pagar todas as contas, você terá ${formatCurrency(
                phase4Balance,
              )} disponível. Sua margem de segurança está adequada.`,
              priority: 5,
            });
          }
        }

        // ========== INSIGHT 2: Fatura de Cartão de Crédito ==========
        if (creditCardBill) {
          const billTotal = Number(creditCardBill.totalAmount || 0);
          const billPaid = Number(creditCardBill.paidAmount || 0);
          const billRemaining = billTotal - billPaid;
          const dueDate = new Date(creditCardBill.dueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (billRemaining > 0) {
            if (daysUntilDue < 0) {
              generatedInsights.push({
                type: 'critical',
                icon: <CreditCard className="h-5 w-5" />,
                title: 'Fatura Vencida!',
                message: `Sua fatura de ${formatCurrency(billTotal)} está vencida há ${Math.abs(
                  daysUntilDue,
                )} dias. Restam ${formatCurrency(billRemaining)} para pagar.`,
                priority: 1,
              });
            } else if (daysUntilDue <= 5) {
              generatedInsights.push({
                type: 'warning',
                icon: <CreditCard className="h-5 w-5" />,
                title: 'Fatura Próxima do Vencimento',
                message: `Sua fatura de ${formatCurrency(billTotal)} vence em ${daysUntilDue} dias. Restam ${formatCurrency(
                  billRemaining,
                )} para pagar.`,
                priority: 2,
              });
            } else if (billTotal > receipts * 0.5) {
              generatedInsights.push({
                type: 'warning',
                icon: <CreditCard className="h-5 w-5" />,
                title: 'Fatura Elevada',
                message: `Sua fatura de ${formatCurrency(
                  billTotal,
                )} representa ${((billTotal / receipts) * 100).toFixed(0)}% das suas receitas mensais. Considere reduzir compras no crédito.`,
                priority: 3,
              });
            }
          } else if (billTotal > 0) {
            generatedInsights.push({
              type: 'positive',
              icon: <CheckCircle className="h-5 w-5" />,
              title: 'Fatura Paga',
              message: `Parabéns! Você pagou toda a fatura de ${formatCurrency(billTotal)}.`,
              priority: 6,
            });
          }
        }

        // ========== INSIGHT 3: Comparação com Mês Anterior ==========
        if (lastMonthReceipts > 0 || lastMonthExpenses > 0) {
          const receiptsChange = receipts - lastMonthReceipts;
          const expensesChange = expenses - lastMonthExpenses;
          const receiptsChangePercent =
            lastMonthReceipts > 0 ? (receiptsChange / lastMonthReceipts) * 100 : 0;
          const expensesChangePercent =
            lastMonthExpenses > 0 ? (expensesChange / lastMonthExpenses) * 100 : 0;

          if (Math.abs(receiptsChangePercent) > 20) {
            generatedInsights.push({
              type: receiptsChangePercent > 0 ? 'positive' : 'warning',
              icon: receiptsChangePercent > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
              title: `Receitas ${receiptsChangePercent > 0 ? 'Aumentaram' : 'Diminuíram'}`,
              message: `Suas receitas ${receiptsChangePercent > 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(
                receiptsChangePercent,
              ).toFixed(0)}% em relação ao mês anterior (${formatCurrency(
                Math.abs(receiptsChange),
              )} ${receiptsChangePercent > 0 ? 'a mais' : 'a menos'}).`,
              priority: 4,
            });
          }

          if (Math.abs(expensesChangePercent) > 20 && expensesChangePercent > 0) {
            generatedInsights.push({
              type: 'warning',
              icon: <TrendingUp className="h-5 w-5" />,
              title: 'Gastos Aumentaram',
              message: `Seus gastos aumentaram ${expensesChangePercent.toFixed(0)}% em relação ao mês anterior (${formatCurrency(
                expensesChange,
              )} a mais). Revise suas despesas.`,
              priority: 3,
            });
          } else if (Math.abs(expensesChangePercent) > 15 && expensesChangePercent < 0) {
            generatedInsights.push({
              type: 'positive',
              icon: <TrendingDown className="h-5 w-5" />,
              title: 'Gastos Reduzidos',
              message: `Parabéns! Seus gastos diminuíram ${Math.abs(expensesChangePercent).toFixed(0)}% em relação ao mês anterior (economizou ${formatCurrency(
                Math.abs(expensesChange),
              )}).`,
              priority: 5,
            });
          }
        }

        // ========== INSIGHT 4: Categoria com Alto Gasto (Melhorado) ==========
        if (expensesByCategory.length > 0 && expenses > 0) {
          const topCategory = expensesByCategory.reduce((prev: any, current: any) =>
            Number(current.total) > Number(prev.total) ? current : prev,
          );

          const categoryPercentage = (Number(topCategory.total) / expenses) * 100;
          const categoryName = topCategory.category?.name || 'Sem categoria';

          if (categoryPercentage > 50) {
            generatedInsights.push({
              type: 'warning',
              icon: <Target className="h-5 w-5" />,
              title: 'Categoria Dominante',
              message: `${categoryName} representa ${categoryPercentage.toFixed(0)}% (${formatCurrency(
                topCategory.total,
              )}) dos seus gastos. Considere diversificar ou revisar essa categoria.`,
              priority: 3,
            });
          } else if (categoryPercentage > 30) {
            generatedInsights.push({
              type: 'info',
              icon: <Target className="h-5 w-5" />,
              title: 'Categoria com Maior Gasto',
              message: `${categoryName} é sua maior categoria de gastos (${categoryPercentage.toFixed(0)}% - ${formatCurrency(
                topCategory.total,
              )}).`,
              priority: 6,
            });
          }
        }

        // ========== INSIGHT 5: Metas e Progresso ==========
        if (goals.length > 0) {
          const activeGoals = goals.filter((g: any) => !g.isCompleted);
          const nearCompletionGoals = activeGoals.filter((g: any) => {
            const progress = (Number(g.currentAmount || 0) / Number(g.targetAmount || 1)) * 100;
            return progress >= 75 && progress < 100;
          });
          const stuckGoals = activeGoals.filter((g: any) => {
            const progress = (Number(g.currentAmount || 0) / Number(g.targetAmount || 1)) * 100;
            return progress < 10 && g.monthsNeeded && g.monthsNeeded > 24;
          });

          if (nearCompletionGoals.length > 0) {
            generatedInsights.push({
              type: 'positive',
              icon: <Target className="h-5 w-5" />,
              title: 'Meta Próxima de Conclusão',
              message: `Você está próximo de alcançar ${nearCompletionGoals.length} meta(s)! Continue economizando para atingir seus objetivos.`,
              priority: 4,
            });
          }

          if (stuckGoals.length > 0) {
            generatedInsights.push({
              type: 'warning',
              icon: <Target className="h-5 w-5" />,
              title: 'Metas com Progresso Lento',
              message: `Você tem ${stuckGoals.length} meta(s) que levarão mais de 2 anos para concluir. Considere ajustar o valor ou aumentar sua economia mensal.`,
              priority: 4,
            });
          }
        }

        // ========== INSIGHT 6: Poupanças ==========
        if (savingsAccounts.length > 0) {
          const totalSavings = savingsAccounts.reduce(
            (sum: number, acc: any) => sum + Number(acc.currentAmount || 0),
            0,
          );
          const accountsWithTarget = savingsAccounts.filter((acc: any) => acc.targetAmount);
          const accountsNearTarget = accountsWithTarget.filter((acc: any) => {
            const progress = (Number(acc.currentAmount || 0) / Number(acc.targetAmount || 1)) * 100;
            return progress >= 80 && progress < 100;
          });

          if (totalSavings > 0) {
            generatedInsights.push({
              type: 'positive',
              icon: <PiggyBank className="h-5 w-5" />,
              title: 'Poupanças Ativas',
              message: `Você tem ${formatCurrency(totalSavings)} guardado em ${savingsAccounts.length} poupança(s). ${
                accountsNearTarget.length > 0
                  ? `${accountsNearTarget.length} poupança(s) próxima(s) da meta!`
                  : 'Continue economizando!'
              }`,
              priority: 5,
            });
          }
        }

        // ========== INSIGHT 7: Despesas Futuras ==========
        if (projectedBalance?.futureExpensesCount > 0) {
          const futureExpensesTotal = projectedBalance.futureExpensesTotal || 0;
          if (futureExpensesTotal > receipts * 0.3) {
            generatedInsights.push({
              type: 'warning',
              icon: <Calendar className="h-5 w-5" />,
              title: 'Muitas Despesas Futuras',
              message: `Você tem ${projectedBalance.futureExpensesCount} despesa(s) futura(s) totalizando ${formatCurrency(
                futureExpensesTotal,
              )} (${((futureExpensesTotal / receipts) * 100).toFixed(0)}% das receitas). Planeje-se!`,
              priority: 3,
            });
          }
        }

        // ========== INSIGHT 8: Receitas Futuras ==========
        if (projectedBalance?.futureReceiptsCount > 0) {
          const futureReceiptsTotal = projectedBalance.futureReceiptsTotal || 0;
          if (futureReceiptsTotal > receipts * 0.5) {
            generatedInsights.push({
              type: 'positive',
              icon: <ArrowUp className="h-5 w-5" />,
              title: 'Receitas Futuras Planejadas',
              message: `Você ainda receberá ${formatCurrency(
                futureReceiptsTotal,
              )} em ${projectedBalance.futureReceiptsCount} receita(s) futura(s).`,
              priority: 6,
            });
          }
        }

        // ========== INSIGHT 9: Economia Mensal ==========
        if (balance > 0 && receipts > 0) {
          const savingsRate = (balance / receipts) * 100;
          if (savingsRate >= 30) {
            generatedInsights.push({
              type: 'positive',
              icon: <DollarSign className="h-5 w-5" />,
              title: 'Excelente Taxa de Economia',
              message: `Você está economizando ${savingsRate.toFixed(0)}% das suas receitas (${formatCurrency(
                balance,
              )}). Isso é excelente para construir uma reserva de emergência!`,
              priority: 5,
            });
          } else if (savingsRate < 10 && balance > 0) {
            generatedInsights.push({
              type: 'info',
              icon: <DollarSign className="h-5 w-5" />,
              title: 'Taxa de Economia Baixa',
              message: `Você está economizando apenas ${savingsRate.toFixed(0)}% das suas receitas (${formatCurrency(
                balance,
              )}). Tente aumentar para pelo menos 20% para construir uma reserva.`,
              priority: 6,
            });
          }
        }

        // ========== INSIGHT 10: Poucas Transações (Melhorado) ==========
        const totalTransactions = (receiptsRes.data.count || 0) + (expensesRes.data.count || 0);
        if (totalTransactions < 5 && (receipts > 0 || expenses > 0)) {
          generatedInsights.push({
            type: 'info',
            icon: <Lightbulb className="h-5 w-5" />,
            title: 'Registre Mais Transações',
            message: `Você tem apenas ${totalTransactions} transação(ões) este mês. Registre mais para ter análises mais precisas e insights mais detalhados.`,
            priority: 7,
          });
        }

        // Ordenar por prioridade (menor número = maior prioridade)
        generatedInsights.sort((a, b) => a.priority - b.priority);

        // Limitar a 6 insights mais importantes
        setInsights(generatedInsights.slice(0, 6));
      } catch (error) {
        console.error('Erro ao gerar insights:', error);
      } finally {
        setLoading(false);
      }
    };

    generateInsights();
  }, []);

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'border-green-500 bg-green-50 dark:bg-green-900/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-900/10';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights e Análises</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights e Análises</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Não há insights disponíveis no momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Insights e Análises</CardTitle>
          <p className="text-sm text-muted-foreground">
            Análises inteligentes sobre suas finanças
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <HoverScale key={index}>
                <div
                  className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)} transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 ${getIconColor(insight.type)}`}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{insight.title}</h4>
                        <Badge
                          variant={
                            insight.type === 'positive'
                              ? 'default'
                              : insight.type === 'warning'
                              ? 'destructive'
                              : insight.type === 'critical'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {insight.type === 'positive'
                            ? 'Positivo'
                            : insight.type === 'warning'
                            ? 'Atenção'
                            : insight.type === 'critical'
                            ? 'Crítico'
                            : 'Info'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                    </div>
                  </div>
                </div>
              </HoverScale>
            ))}
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
