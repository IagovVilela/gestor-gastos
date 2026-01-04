'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';

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

interface ReceiptByCategory {
  category: {
    id: string;
    name: string;
    color?: string;
  } | null;
  total: number;
  count: number;
}

export function ReceiptsByCategoryChart() {
  const [data, setData] = useState<ReceiptByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const response = await api.get(`/receipts/by-category/${year}/${month}`);
        setData(response.data);
      } catch (error: any) {
        console.error('Erro ao carregar receitas por categoria:', error);
        // Se for 404, pode ser que o endpoint não exista ou o backend não esteja rodando
        if (error.response?.status === 404) {
          console.warn('Endpoint /receipts/by-category não encontrado. Verifique se o backend está rodando.');
        }
        setData([]); // Define dados vazios em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular total para mostrar porcentagens
  const total = data.reduce((sum, item) => sum + Number(item.total), 0);

  const chartData = data.map((item) => {
    const value = Number(item.total);
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return {
      name: item.category?.name || 'Sem categoria',
      value,
      count: item.count,
      percentage: percentage.toFixed(1),
    };
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas por Categoria</CardTitle>
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
          <CardTitle>Receitas por Categoria</CardTitle>
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
            {data.count} registro(s)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Receitas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-muted-foreground">Total de Receitas</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => {
                  const percentage = (percent * 100).toFixed(1);
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

