'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SavingsAccountForm } from './savings-account-form';
import { DepositWithdrawDialog } from './deposit-withdraw-dialog';
import { SavingsEvolutionChart } from './savings-evolution-chart';
import { SavingsTransactionsList } from './savings-transactions-list';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, PiggyBank, TrendingUp, ArrowDown, ArrowUp, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

interface SavingsAccount {
  id: string;
  name: string;
  description?: string;
  currentAmount: number;
  targetAmount?: number;
  bank?: {
    id: string;
    name: string;
    color?: string;
    type?: string;
    balance?: number;
  } | null;
  goal?: {
    id: string;
    title: string;
    targetAmount: number;
  } | null;
  color?: string;
  icon?: string;
  createdAt: string;
  _count?: {
    transactions: number;
  };
}

interface SavingsAccountsResponse {
  savingsAccounts: SavingsAccount[];
  totalAmount: number;
  count: number;
}

export function SavingsAccountsList() {
  const [data, setData] = useState<SavingsAccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | undefined>();
  const [deletingAccount, setDeletingAccount] = useState<string | undefined>();
  const [depositWithdrawOpen, setDepositWithdrawOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [expandedAccount, setExpandedAccount] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchSavingsAccounts();
  }, []);

  const fetchSavingsAccounts = async () => {
    try {
      const response = await api.get('/savings-accounts');
      setData(response.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar poupanças',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;

    try {
      await api.delete(`/savings-accounts/${deletingAccount}`);
      toast({
        title: 'Sucesso',
        description: 'Poupança deletada com sucesso',
      });
      setDeletingAccount(undefined);
      fetchSavingsAccounts();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar poupança',
        variant: 'destructive',
      });
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

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingAccount(undefined);
    fetchSavingsAccounts();
  };

  const handleTransactionClose = () => {
    setDepositWithdrawOpen(false);
    setSelectedAccount(undefined);
    fetchSavingsAccounts();
  };

  const handleRestoreBalances = async () => {
    try {
      const response = await api.post('/savings-accounts/restore-savings-balances');
      toast({
        title: 'Sucesso',
        description: `Saldos restaurados! ${response.data.restored} conta(s) poupança foram corrigidas.`,
      });
      // Disparar evento para atualizar saldos em outros componentes
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao restaurar saldos',
        variant: 'destructive',
      });
    }
  };

  const getProgress = (account: SavingsAccount) => {
    if (!account.targetAmount || account.targetAmount === 0) return 0;
    return Math.min((account.currentAmount / account.targetAmount) * 100, 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Card de Total Geral */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Total Guardado</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {data?.count || 0} poupança{data?.count !== 1 ? 's' : ''}
                </p>
              </div>
              <PiggyBank className="h-12 w-12 text-primary opacity-50" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(data?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Botões de Ação */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={handleRestoreBalances}
          className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Restaurar Saldos de Contas Poupança
        </Button>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Poupança
        </Button>
      </div>

      {/* Gráfico de Evolução */}
      {data && data.savingsAccounts.length > 0 && (
        <SavingsEvolutionChart />
      )}

      {/* Lista de Poupanças */}
      {!data?.savingsAccounts.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PiggyBank className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma poupança criada ainda. Crie sua primeira poupança!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.savingsAccounts.map((account, index) => {
            const progress = getProgress(account);
            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {account.icon && (
                            <span className="text-2xl">{account.icon}</span>
                          )}
                          <CardTitle className="text-xl">{account.name}</CardTitle>
                        </div>
                        {account.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {account.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingAccount(account.id);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    {/* Valor Atual */}
                    <div className="mb-4">
                      <div className="text-3xl font-bold mb-1">
                        {formatCurrency(account.currentAmount)}
                      </div>
                      {account.targetAmount && (
                        <div className="text-sm text-muted-foreground">
                          de {formatCurrency(account.targetAmount)}
                        </div>
                      )}
                    </div>

                    {/* Progresso */}
                    {account.targetAmount && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {/* Informações Adicionais */}
                    <div className="space-y-2 mb-4 flex-1">
                      {account.bank && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {account.bank.name}
                            {account.bank.type && (
                              <span className="ml-1 text-muted-foreground">
                                ({bankTypeLabels[account.bank.type] || account.bank.type})
                              </span>
                            )}
                            {account.bank.balance !== undefined && (
                              <span className="ml-1 text-muted-foreground">
                                - {formatCurrency(account.bank.balance)}
                              </span>
                            )}
                          </Badge>
                        </div>
                      )}
                      {account.goal && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{account.goal.title}</span>
                        </div>
                      )}
                      {account._count && (
                        <div className="text-xs text-muted-foreground">
                          {account._count.transactions} transação{account._count.transactions !== 1 ? 'ões' : ''}
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenDeposit(account.id)}
                        >
                          <ArrowDown className="h-4 w-4 mr-1" />
                          Depositar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenWithdraw(account.id)}
                          disabled={account.currentAmount === 0}
                        >
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Retirar
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setExpandedAccount(expandedAccount === account.id ? undefined : account.id)}
                      >
                        {expandedAccount === account.id ? 'Ocultar' : 'Ver'} Transações
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Transações Expandidas - Fora do Grid */}
      <AnimatePresence>
        {expandedAccount && data?.savingsAccounts.find(a => a.id === expandedAccount) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 overflow-hidden"
          >
            <SavingsTransactionsList
              accountId={expandedAccount}
              accountName={data.savingsAccounts.find(a => a.id === expandedAccount)?.name || ''}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário */}
      <SavingsAccountForm
        open={formOpen}
        onClose={handleFormClose}
        accountId={editingAccount}
      />

      {/* Dialog de Depósito/Retirada */}
      <DepositWithdrawDialog
        open={depositWithdrawOpen}
        onClose={handleTransactionClose}
        accountId={selectedAccount}
        type={transactionType}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Poupança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta poupança? Esta ação não pode ser desfeita.
              {data?.savingsAccounts.find((a) => a.id === deletingAccount)?.currentAmount && (
                <span className="block mt-2 font-semibold text-destructive">
                  Atenção: Esta poupança possui valor guardado. Retire o valor antes de excluir.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

