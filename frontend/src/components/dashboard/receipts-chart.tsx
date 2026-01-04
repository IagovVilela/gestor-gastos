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
  '#22c55e', // Verde para receitas
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#a7f3d0',
  '#d1fae5',
  '#86efac',
  '#4ade80',
  '#16a34a',
  '#15803d',
];

interface Receipt {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: {
    name: string;
    color?: string;
  } | null;
}

export function ReceiptsChart() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const response = await api.get('/receipts', {
          params: {
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
            limit: 100,
            page: 1,
          },
        });

        const receiptsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);

        setReceipts(receiptsData.map((r: any) => ({
          id: r.id,
          description: r.description,
          amount: Number(r.amount),
          date: r.date,
          category: r.category,
        })));
      } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        setReceipts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular total
  const total = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  const chartData = receipts.map((receipt) => {
    const percentage = total > 0 ? (receipt.amount / total) * 100 : 0;
    return {
      name: receipt.description,
      value: receipt.amount,
      percentage: percentage.toFixed(1),
      date: receipt.date,
      category: receipt.category?.name || 'Sem categoria',
    };
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas</CardTitle>
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
          <CardTitle>Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhuma receita registrada este mês</p>
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
          <p className="text-sm text-green-600 font-semibold">
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
          <CardTitle>Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total de {receipts.length} receita(s) este mês
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
                fill="#22c55e"
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

