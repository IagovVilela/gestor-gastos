'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';
import { StaggerContainer, StaggerItem } from '@/components/animations/stagger-container';
import { HoverScale } from '@/components/animations/hover-scale';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SummaryCards() {
  const { receiptsTotal, expensesTotal, balance, creditCardBill, loading } = useDashboard();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted mb-2" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <StaggerContainer className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StaggerItem>
        <HoverScale>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(receiptsTotal?.total || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {receiptsTotal?.count || 0} registro(s) este mês
              </p>
            </CardContent>
          </Card>
        </HoverScale>
      </StaggerItem>

      <StaggerItem>
        <HoverScale>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(expensesTotal?.total || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {expensesTotal?.count || 0} registro(s) este mês
              </p>
            </CardContent>
          </Card>
        </HoverScale>
      </StaggerItem>

      <StaggerItem>
        <HoverScale>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
              </p>
            </CardContent>
          </Card>
        </HoverScale>
      </StaggerItem>

      <StaggerItem>
        <HoverScale>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fatura do Mês</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              {creditCardBill ? (
                <>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(creditCardBill.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {creditCardBill.isPaid ? (
                      <span className="text-green-500">Fatura paga</span>
                    ) : (
                      <>
                        Vence em{' '}
                        {format(new Date(creditCardBill.dueDate), "dd 'de' MMM", {
                          locale: ptBR,
                        })}
                      </>
                    )}
                  </p>
                  {creditCardBill.bank && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {creditCardBill.bank.name}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nenhuma fatura este mês
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </HoverScale>
      </StaggerItem>
    </StaggerContainer>
  );
}

