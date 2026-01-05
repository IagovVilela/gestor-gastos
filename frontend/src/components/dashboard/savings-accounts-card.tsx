'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { PiggyBank, ArrowDown, ArrowUp, TrendingUp, Plus } from 'lucide-react';
import { FadeIn } from '@/components/animations/fade-in';
import { DepositWithdrawDialog } from '@/components/savings-accounts/deposit-withdraw-dialog';
import { useRouter } from 'next/navigation';
import { Progress } from '@/components/ui/progress';

interface SavingsAccount {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount?: number;
  color?: string;
  icon?: string;
}

interface SavingsAccountsResponse {
  savingsAccounts: SavingsAccount[];
  totalAmount: number;
  count: number;
}

export function SavingsAccountsCard() {
  const [data, setData] = useState<SavingsAccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositWithdrawOpen, setDepositWithdrawOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const router = useRouter();

  useEffect(() => {
    fetchSavingsAccounts();
    
    // Escutar evento de atualização
    const handleUpdate = () => {
      fetchSavingsAccounts();
    };
    
    window.addEventListener('balanceUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('balanceUpdated', handleUpdate);
    };
  }, []);

  const fetchSavingsAccounts = async () => {
    try {
      const response = await api.get('/savings-accounts');
      setData(response.data);
    } catch (error) {
      console.error('Erro ao carregar poupanças:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeposit = (accountId: string) => {
    setSelectedAccount(accountId);
    setTransactionType('deposit');
    setDepositWithdrawOpen(true);
  };

  const handleOpenWithdraw = (accountId: string) => {
    setSelectedAccount(accountId);
    setTransactionType('withdraw');
    setDepositWithdrawOpen(true);
  };

  const handleTransactionClose = () => {
    setDepositWithdrawOpen(false);
    setSelectedAccount(undefined);
    fetchSavingsAccounts();
    // Disparar evento para atualizar outros componentes
    window.dispatchEvent(new CustomEvent('balanceUpdated'));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.savingsAccounts.length === 0) {
    return (
      <FadeIn>
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <CardTitle>Poupanças</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/savings-accounts')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Criar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Nenhuma poupança criada ainda
              </p>
              <Button onClick={() => router.push('/savings-accounts')}>
                Criar Primeira Poupança
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  // Mostrar top 3 poupanças
  const topSavings = data.savingsAccounts
    .sort((a, b) => b.currentAmount - a.currentAmount)
    .slice(0, 3);

  const getProgress = (account: SavingsAccount) => {
    if (!account.targetAmount || account.targetAmount === 0) return 0;
    return Math.min((account.currentAmount / account.targetAmount) * 100, 100);
  };

  return (
    <>
      <FadeIn>
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <CardTitle>Poupanças</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/savings-accounts')}
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Total Geral */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-primary mb-1">
                {formatCurrency(data.totalAmount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total guardado em {data.count} poupança{data.count !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Lista de Poupanças */}
            <div className="space-y-3">
              {topSavings.map((account) => {
                const progress = getProgress(account);
                return (
                  <div
                    key={account.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {account.icon && (
                          <span className="text-lg">{account.icon}</span>
                        )}
                        <span className="font-medium text-sm">{account.name}</span>
                      </div>
                      <span className="font-bold text-primary">
                        {formatCurrency(account.currentAmount)}
                      </span>
                    </div>

                    {/* Progresso */}
                    {account.targetAmount && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Botões de Ação Rápida */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleOpenDeposit(account.id)}
                      >
                        <ArrowDown className="h-3 w-3 mr-1" />
                        Depositar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleOpenWithdraw(account.id)}
                        disabled={account.currentAmount === 0}
                      >
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Retirar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.count > 3 && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/savings-accounts')}
                >
                  Ver todas as {data.count} poupanças
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Dialog de Depósito/Retirada */}
      <DepositWithdrawDialog
        open={depositWithdrawOpen}
        onClose={handleTransactionClose}
        accountId={selectedAccount}
        type={transactionType}
      />
    </>
  );
}



