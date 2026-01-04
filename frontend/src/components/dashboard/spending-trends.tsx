'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/lib/api';
import { formatCurrencyCompact } from '@/lib/formatters';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FadeIn } from '@/components/animations/fade-in';

interface MonthlyData {
  month: string;
  receipts: number;
  expenses: number;
  balance: number;
}

export function SpendingTrends() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const months: MonthlyData[] = [];

        // Buscar dados dos últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(now, i);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          const [receiptsRes, expensesRes] = await Promise.all([
            api.get(`/receipts/monthly/${year}/${month}`),
            api.get(`/expenses/monthly/${year}/${month}`),
          ]);

          const receipts = receiptsRes.data.total || 0;
          const expenses = expensesRes.data.total || 0;

          months.push({
            month: format(date, 'MMM', { locale: ptBR }),
            receipts,
            expenses,
            balance: receipts - expenses,
          });
        }

        setData(months);
      } catch (error) {
        console.error('Erro ao carregar tendências:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, []);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrencyCompact(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Dados insuficientes para análise</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Gastos (6 meses)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tendência de receitas e despesas ao longo do tempo
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrencyCompact} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="receipts"
                name="Receitas"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Despesas"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

