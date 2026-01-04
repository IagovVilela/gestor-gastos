'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = [
  '#EF4444', // Vermelho para despesas
  '#F87171',
  '#FCA5A5',
  '#FEE2E2',
  '#DC2626',
  '#B91C1C',
  '#991B1B',
  '#7F1D1D',
  '#DC2626',
  '#B91C1C',
];

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: {
    name: string;
    color?: string;
  } | null;
}

export function ExpensesChart() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const response = await api.get('/expenses', {
          params: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            limit: 100,
            page: 1,
          },
        });

        const expensesData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);

        setExpenses(expensesData.map((e: any) => ({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          date: e.date,
          category: e.category,
        })));
      } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular total
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const chartData = expenses.map((expense) => {
    const percentage = total > 0 ? (expense.amount / total) * 100 : 0;
    return {
      name: expense.description,
      value: expense.amount,
      percentage: percentage.toFixed(1),
      date: expense.date,
      category: expense.category?.name || 'Sem categoria',
    };
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhuma despesa registrada este mês</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-red-600 font-semibold">
            {formatCurrency(data.value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.percentage}% do total
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(data.date), "dd 'de' MMM", { locale: ptBR })}
          </p>
          {data.category && (
            <p className="text-xs text-muted-foreground">
              Categoria: {data.category}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total de {expenses.length} despesa(s) este mês
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => {
                  return `${name}\n${percentage}%`;
                }}
                outerRadius={100}
                fill="#EF4444"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

