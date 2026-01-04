'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { FadeIn } from '@/components/animations/fade-in';
import { HoverScale } from '@/components/animations/hover-scale';

interface Insight {
  type: 'positive' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
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

        // Buscar dados do mês atual
        const [receiptsRes, expensesRes, expensesByCategoryRes] = await Promise.all([
          api.get(`/receipts/monthly/${year}/${month}`),
          api.get(`/expenses/monthly/${year}/${month}`),
          api.get(`/expenses/by-category/${year}/${month}`),
        ]);

        const receipts = receiptsRes.data.total || 0;
        const expenses = expensesRes.data.total || 0;
        const balance = receipts - expenses;
        const expensesByCategory = expensesByCategoryRes.data || [];

        const generatedInsights: Insight[] = [];

        // Insight 1: Saldo positivo/negativo
        if (balance > 0) {
          generatedInsights.push({
            type: 'positive',
            icon: <TrendingUp className="h-5 w-5" />,
            title: 'Saldo Positivo!',
            message: `Você está com saldo positivo de ${formatCurrency(balance)} este mês. Continue assim!`,
          });
        } else if (balance < 0) {
          generatedInsights.push({
            type: 'warning',
            icon: <AlertTriangle className="h-5 w-5" />,
            title: 'Atenção: Saldo Negativo',
            message: `Seu saldo está negativo em ${formatCurrency(Math.abs(balance))}. Considere reduzir gastos.`,
          });
        }

        // Insight 2: Categoria com maior gasto
        if (expensesByCategory.length > 0) {
          const topCategory = expensesByCategory.reduce((prev: any, current: any) =>
            Number(current.total) > Number(prev.total) ? current : prev
          );

          const categoryPercentage = (Number(topCategory.total) / expenses) * 100;

          if (categoryPercentage > 40) {
            generatedInsights.push({
              type: 'warning',
              icon: <Target className="h-5 w-5" />,
              title: 'Categoria com Alto Gasto',
              message: `${topCategory.category?.name || 'Sem categoria'} representa ${categoryPercentage.toFixed(0)}% dos seus gastos. Considere revisar.`,
            });
          }
        }

        // Insight 3: Comparação receitas vs despesas
        if (expenses > 0 && receipts > 0) {
          const expenseRatio = (expenses / receipts) * 100;
          if (expenseRatio > 90) {
            generatedInsights.push({
              type: 'warning',
              icon: <AlertTriangle className="h-5 w-5" />,
              title: 'Gastos Próximos das Receitas',
              message: `Você está gastando ${expenseRatio.toFixed(0)}% das suas receitas. Tente economizar mais.`,
            });
          } else if (expenseRatio < 50) {
            generatedInsights.push({
              type: 'positive',
              icon: <TrendingUp className="h-5 w-5" />,
              title: 'Excelente Controle!',
              message: `Você está gastando apenas ${expenseRatio.toFixed(0)}% das suas receitas. Ótimo trabalho!`,
            });
          }
        }

        // Insight 4: Poucas transações
        const totalTransactions = (receiptsRes.data.count || 0) + (expensesRes.data.count || 0);
        if (totalTransactions < 5) {
          generatedInsights.push({
            type: 'info',
            icon: <Lightbulb className="h-5 w-5" />,
            title: 'Registre Mais Transações',
            message: 'Você tem poucas transações este mês. Registre mais para ter análises mais precisas.',
          });
        }

        setInsights(generatedInsights);
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
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {insight.type === 'positive'
                            ? 'Positivo'
                            : insight.type === 'warning'
                            ? 'Atenção'
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

