'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowUp, Calendar, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/animations/fade-in';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  description?: string;
  date: string;
  bank?: {
    id: string;
    name: string;
    color?: string;
  } | null;
}

interface SavingsTransactionsListProps {
  accountId: string;
  accountName: string;
}

export function SavingsTransactionsList({ accountId, accountName }: SavingsTransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    fetchTransactions();
  }, [accountId, limit]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/savings-accounts/${accountId}/transactions`, {
        params: { limit },
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando transações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações - {accountName}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma transação registrada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`p-2 rounded-full ${
                        transaction.type === 'DEPOSIT'
                          ? 'bg-green-100 dark:bg-green-900/20'
                          : 'bg-red-100 dark:bg-red-900/20'
                      }`}
                    >
                      {transaction.type === 'DEPOSIT' ? (
                        <ArrowDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowUp className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {transaction.description || 
                            (transaction.type === 'DEPOSIT' ? 'Depósito' : 'Retirada')}
                        </p>
                        <Badge
                          variant={transaction.type === 'DEPOSIT' ? 'default' : 'secondary'}
                        >
                          {transaction.type === 'DEPOSIT' ? 'Depósito' : 'Retirada'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(transaction.date), "dd 'de' MMM 'de' yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </div>
                        {transaction.bank && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {transaction.bank.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${
                        transaction.type === 'DEPOSIT'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'DEPOSIT' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))}
              {transactions.length >= limit && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setLimit(limit + 20)}
                  >
                    Carregar mais transações
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

