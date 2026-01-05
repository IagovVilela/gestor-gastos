'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FadeIn } from '@/components/animations/fade-in';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EvolutionData {
  month: string;
  balance: number;
  deposits: number;
  withdrawals: number;
}

interface SavingsAccount {
  id: string;
  name: string;
}

interface SavingsEvolutionChartProps {
  accountId?: string;
  accountName?: string;
}

export function SavingsEvolutionChart({ accountId, accountName }: SavingsEvolutionChartProps) {
  const [data, setData] = useState<EvolutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(12);
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(accountId);

  useEffect(() => {
    if (selectedAccount) {
      fetchEvolution(selectedAccount);
    } else {
      fetchTotalEvolution();
    }
    fetchAccounts();
  }, [selectedAccount, months]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/savings-accounts');
      setAccounts(response.data.savingsAccounts || []);
    } catch (error) {
      console.error('Erro ao carregar poupanças:', error);
    }
  };

  const fetchEvolution = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/savings-accounts/${id}/evolution`, {
        params: { months },
      });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar evolução:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalEvolution = async () => {
    try {
      setLoading(true);
      const response = await api.get('/savings-accounts/evolution', {
        params: { months },
      });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar evolução geral:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (monthStr: string) => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return format(date, 'MMM/yyyy', { locale: ptBR });
    } catch {
      return monthStr;
    }
  };

  const chartData = data.map((item) => ({
    ...item,
    monthFormatted: formatMonth(item.month),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium mb-2">{data.monthFormatted}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Saldo: </span>
            <span className="font-semibold text-primary">
              {formatCurrency(data.balance)}
            </span>
          </p>
          {data.deposits > 0 && (
            <p className="text-sm text-green-600">
              Depósitos: {formatCurrency(data.deposits)}
            </p>
          )}
          {data.withdrawals > 0 && (
            <p className="text-sm text-red-600">
              Retiradas: {formatCurrency(data.withdrawals)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução das Poupanças</CardTitle>
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
          <CardTitle>Evolução das Poupanças</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">
              Nenhum dado de evolução disponível
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
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedAccount
                ? `Evolução: ${accounts.find((a) => a.id === selectedAccount)?.name || accountName || 'Poupança'}`
                : 'Evolução Geral das Poupanças'}
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={selectedAccount || 'all'}
                onValueChange={(value) => setSelectedAccount(value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione uma poupança" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Poupanças</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthFormatted"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => formatCurrency(value, { compact: true })}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Saldo"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </FadeIn>
  );
}



