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

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

type BankType = 'SALARY_ACCOUNT' | 'CURRENT_ACCOUNT' | 'SAVINGS_ACCOUNT' | 'INVESTMENT' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  description?: string;
  date: string;
  bank?: {
    id: string;
    name: string;
    type?: BankType;
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
          <CardTitle className="text-lg">Histórico de Transações - {accountName}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma transação registrada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`p-2 rounded-full flex-shrink-0 ${
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {transaction.description || 
                            (transaction.type === 'DEPOSIT' ? 'Depósito' : 'Retirada')}
                        </p>
                        <Badge
                          variant={
                            transaction.description?.startsWith('Associação')
                              ? 'outline'
                              : transaction.type === 'DEPOSIT'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {transaction.description?.startsWith('Associação')
                            ? 'Associação'
                            : transaction.type === 'DEPOSIT'
                            ? 'Depósito'
                            : 'Retirada'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="whitespace-nowrap">
                            {format(new Date(transaction.date), "dd 'de' MMM 'de' yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        {transaction.bank && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">
                              {transaction.bank.name}
                              {transaction.bank.type && (
                                <span className="text-muted-foreground/70">
                                  {' '}({bankTypeLabels[transaction.bank.type] || transaction.bank.type})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p
                      className={`font-bold text-base ${
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
                    size="sm"
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


