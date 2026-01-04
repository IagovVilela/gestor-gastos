'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMonthlyComparison } from '@/hooks/use-monthly-comparison';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { HoverScale } from '@/components/animations/hover-scale';
import { Badge } from '@/components/ui/badge';

export function MonthlyComparison() {
  const { currentMonth, previousMonth, receiptsChange, expensesChange, balanceChange, loading } =
    useMonthlyComparison();

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeColor = (change: number, isExpense: boolean = false) => {
    if (change === 0) return 'text-muted-foreground';
    if (isExpense) {
      // Para despesas, aumento é ruim (vermelho), redução é bom (verde)
      return change > 0 ? 'text-red-500' : 'text-green-500';
    }
    // Para receitas, aumento é bom (verde), redução é ruim (vermelho)
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparação Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeIn>
      <HoverScale>
        <Card>
          <CardHeader>
            <CardTitle>Comparação Mensal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparação com o mês anterior
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Receitas */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Receitas</p>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {formatCurrency(previousMonth.receipts)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {formatCurrency(currentMonth.receipts)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {getChangeIcon(receiptsChange)}
                    <span className={`text-xs font-medium ${getChangeColor(receiptsChange)}`}>
                      {formatPercentage(receiptsChange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Despesas */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Despesas</p>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {formatCurrency(previousMonth.expenses)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {formatCurrency(currentMonth.expenses)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {getChangeIcon(expensesChange)}
                    <span
                      className={`text-xs font-medium ${getChangeColor(expensesChange, true)}`}
                    >
                      {formatPercentage(expensesChange)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Saldo */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      currentMonth.balance >= 0
                        ? 'bg-green-100 dark:bg-green-900/20'
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}
                  >
                    {currentMonth.balance >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Saldo</p>
                    <p className="text-xs text-muted-foreground">
                      Mês anterior: {formatCurrency(previousMonth.balance)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      currentMonth.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(currentMonth.balance)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    {balanceChange > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : balanceChange < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        balanceChange > 0
                          ? 'text-green-500'
                          : balanceChange < 0
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {balanceChange >= 0 ? '+' : ''}
                      {formatCurrency(balanceChange)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </HoverScale>
    </FadeIn>
  );
}

