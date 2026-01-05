'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
import { ArrowDown, ArrowUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DepositWithdrawDialogProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
  type: 'deposit' | 'withdraw';
}

interface Bank {
  id: string;
  name: string;
  balance: number;
}

interface SavingsAccount {
  id: string;
  name: string;
  currentAmount: number;
  bank?: {
    id: string;
    name: string;
  } | null;
}

interface ProjectedBalanceData {
  currentBalance: number;
  phases: {
    phase4: {
      balance: number;
    };
  };
  totalExpenses: number;
  creditCardTotal: number;
}

export function DepositWithdrawDialog({
  open,
  onClose,
  accountId,
  type,
}: DepositWithdrawDialogProps) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [account, setAccount] = useState<SavingsAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [projectedBalance, setProjectedBalance] = useState<ProjectedBalanceData | null>(null);
  const [loadingProjection, setLoadingProjection] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && accountId) {
      fetchAccount();
      fetchBanks();
      fetchProjectedBalance();
    } else {
      resetForm();
    }
  }, [open, accountId]);

  useEffect(() => {
    if (open && amount && bankId && parseFloat(amount) > 0) {
      // Debounce para não fazer muitas requisições
      const timer = setTimeout(() => {
        fetchProjectedBalance();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, amount, bankId, type]);

  const fetchAccount = async () => {
    if (!accountId) return;
    try {
      const response = await api.get(`/savings-accounts/${accountId}`);
      setAccount(response.data);
      setBankId(response.data.bank?.id || '');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar poupança',
        variant: 'destructive',
      });
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchProjectedBalance = async () => {
    try {
      setLoadingProjection(true);
      const response = await api.get('/dashboard/projected-balance');
      setProjectedBalance(response.data);
    } catch (error) {
      console.error('Erro ao carregar saldo projetado:', error);
    } finally {
      setLoadingProjection(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setBankId('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor inválido',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'withdraw' && account && amountNum > account.currentAmount) {
      toast({
        title: 'Erro',
        description: 'Valor maior que o disponível na poupança',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        amount: amountNum,
        description: description || undefined,
      };

      if (bankId && bankId !== 'none') {
        data.bankId = bankId;
      }

      if (type === 'deposit') {
        await api.post(`/savings-accounts/${accountId}/deposit`, data);
        toast({
          title: 'Sucesso',
          description: 'Depósito realizado com sucesso',
        });
      } else {
        await api.post(`/savings-accounts/${accountId}/withdraw`, data);
        toast({
          title: 'Sucesso',
          description: 'Retirada realizada com sucesso',
        });
      }

      resetForm();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || `Erro ao realizar ${type === 'deposit' ? 'depósito' : 'retirada'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = banks.find((b) => b.id === bankId);
  const amountNum = parseFloat(amount) || 0;
  
  // Calcular valores após a transação
  const bankBalanceAfter = selectedBank
    ? type === 'deposit'
      ? selectedBank.balance - amountNum
      : selectedBank.balance + amountNum
    : 0;

  const savingsAmountAfter = account
    ? type === 'deposit'
      ? account.currentAmount + amountNum
      : account.currentAmount - amountNum
    : 0;

  // Calcular saldo projetado após a transação
  // O saldo projetado (fase 4) = saldo atual + receitas - despesas - fatura
  // Se for depósito: reduz o saldo atual do banco, então reduz o saldo projetado
  // Se for retirada: aumenta o saldo atual do banco, então aumenta o saldo projetado
  const projectedBalanceAfter = projectedBalance
    ? type === 'deposit'
      ? projectedBalance.currentBalance - amountNum + projectedBalance.totalReceipts - projectedBalance.totalExpenses - projectedBalance.creditCardTotal
      : projectedBalance.currentBalance + amountNum + projectedBalance.totalReceipts - projectedBalance.totalExpenses - projectedBalance.creditCardTotal
    : null;

  // Validações e alertas
  const hasInsufficientBalance = type === 'deposit' && selectedBank && amountNum > selectedBank.balance;
  const hasInsufficientSavings = type === 'withdraw' && account && amountNum > account.currentAmount;
  const willBeNegative = bankBalanceAfter < 0;
  
  // Calcular margem de segurança (10% das despesas mensais ou mínimo de R$ 500)
  const monthlyObligations = (projectedBalance?.totalExpenses || 0) + (projectedBalance?.creditCardTotal || 0);
  const safetyMargin = Math.max(monthlyObligations * 0.1, 500); // 10% das obrigações ou R$ 500, o que for maior
  
  // Alertas do saldo projetado
  const willBeLow = projectedBalanceAfter !== null && projectedBalanceAfter < 0; // Crítico: negativo
  const willBeVeryLow = projectedBalanceAfter !== null && projectedBalanceAfter > 0 && projectedBalanceAfter < safetyMargin; // Baixo: menor que margem de segurança

  const canDeposit = type === 'deposit' && selectedBank && amountNum > 0 && !hasInsufficientBalance;
  const canWithdraw = type === 'withdraw' && account && amountNum > 0 && amountNum <= account.currentAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {type === 'deposit' ? (
              <>
                <ArrowDown className="h-5 w-5 text-green-500" />
                Depositar na Poupança
              </>
            ) : (
              <>
                <ArrowUp className="h-5 w-5 text-red-500" />
                Retirar da Poupança
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {account && (
              <div className="mt-2">
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  Valor atual: {formatCurrency(account.currentAmount)}
                </p>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <div>
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {type === 'deposit' && selectedBank && parseFloat(amount) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Saldo disponível no banco: {formatCurrency(selectedBank.balance)}
                {parseFloat(amount) > selectedBank.balance && (
                  <span className="text-destructive block mt-1">
                    Saldo insuficiente!
                  </span>
                )}
              </p>
            )}
            {type === 'withdraw' && account && parseFloat(amount) > account.currentAmount && (
              <p className="text-xs text-destructive mt-1">
                Valor maior que o disponível na poupança
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bankId">Banco *</Label>
            <Select value={bankId || 'none'} onValueChange={setBankId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione um banco</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name} - {formatCurrency(bank.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Depósito mensal, Retirada para pagamento"
              rows={2}
            />
          </div>

          {/* Preview do Impacto */}
          {amountNum > 0 && selectedBank && account && (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Preview do Impacto</h4>
                  </div>

                  {/* Banco */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Banco: {selectedBank.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Saldo atual:</span>
                      <span className="font-medium">{formatCurrency(selectedBank.balance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {type === 'deposit' ? 'Após depósito:' : 'Após retirada:'}
                      </span>
                      <span
                        className={`font-bold ${
                          willBeNegative ? 'text-destructive' : 'text-primary'
                        }`}
                      >
                        {formatCurrency(bankBalanceAfter)}
                      </span>
                    </div>
                    {willBeNegative && (
                      <div className="flex items-center gap-2 text-xs text-destructive mt-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Saldo ficará negativo!</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-2"></div>

                  {/* Poupança */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Poupança: {account.name}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Valor atual:</span>
                      <span className="font-medium">{formatCurrency(account.currentAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {type === 'deposit' ? 'Após depósito:' : 'Após retirada:'}
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(savingsAmountAfter)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-2"></div>

                  {/* Saldo Projetado */}
                  {projectedBalanceAfter !== null && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Saldo Projetado (Fase 4)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Atual:</span>
                        <span className="font-medium">
                          {formatCurrency(projectedBalance.phases.phase4.balance)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {type === 'deposit' ? 'Após depósito:' : 'Após retirada:'}
                        </span>
                        <span
                          className={`font-bold ${
                            willBeLow
                              ? 'text-destructive'
                              : willBeVeryLow
                              ? 'text-yellow-600'
                              : 'text-primary'
                          }`}
                        >
                          {formatCurrency(projectedBalanceAfter)}
                        </span>
                      </div>
                      {willBeLow && (
                        <div className="flex items-center gap-2 text-xs text-destructive mt-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Saldo projetado ficará negativo após pagar todas as contas!</span>
                        </div>
                      )}
                      {willBeVeryLow && !willBeLow && (
                        <div className="flex items-center gap-2 text-xs text-yellow-600 mt-1">
                          <AlertTriangle className="h-4 w-4" />
                          <span>
                            Saldo projetado ficará muito baixo. Considere depositar menos.
                          </span>
                        </div>
                      )}
                      {!willBeLow && !willBeVeryLow && (
                        <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>Saldo projetado suficiente para cobrir todas as contas.</span>
                        </div>
                      )}

                      {/* Margem de Segurança */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-muted-foreground">
                              Margem de Segurança:
                            </span>
                            <span className="text-sm font-bold text-primary">
                              {formatCurrency(safetyMargin)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-muted">
                            <div>
                              <span className="font-medium">Cálculo:</span>
                            </div>
                            <div className="pl-2">
                              <div>Obrigações mensais:</div>
                              <div className="pl-2">
                                • Despesas: {formatCurrency(projectedBalance?.totalExpenses || 0)}
                              </div>
                              <div className="pl-2">
                                • Fatura: {formatCurrency(projectedBalance?.creditCardTotal || 0)}
                              </div>
                              <div className="pl-2 font-medium">
                                • Total: {formatCurrency(monthlyObligations)}
                              </div>
                            </div>
                            <div className="pl-2 mt-1">
                              <div>10% das obrigações:</div>
                              <div className="pl-2">
                                {formatCurrency(monthlyObligations * 0.1)}
                              </div>
                            </div>
                            <div className="pl-2 mt-1">
                              <div>Mínimo fixo:</div>
                              <div className="pl-2">
                                {formatCurrency(500)}
                              </div>
                            </div>
                            <div className="pl-2 mt-1 font-semibold text-primary">
                              Margem = Maior entre (10% ou R$ 500) = {formatCurrency(safetyMargin)}
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">
                                Diferença para margem:
                              </span>
                              <span
                                className={`font-semibold ${
                                  projectedBalanceAfter < safetyMargin
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {projectedBalanceAfter < safetyMargin ? '-' : '+'}
                                {formatCurrency(Math.abs(projectedBalanceAfter - safetyMargin))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resumo */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Valor da transação:</span>
                      <span
                        className={`text-lg font-bold ${
                          type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {type === 'deposit' ? '+' : '-'}
                        {formatCurrency(amountNum)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (type === 'deposit' ? !canDeposit : !canWithdraw) ||
                hasInsufficientBalance ||
                hasInsufficientSavings
              }
              variant={willBeLow || willBeNegative ? 'destructive' : 'default'}
            >
              {loading
                ? 'Processando...'
                : type === 'deposit'
                ? 'Confirmar Depósito'
                : 'Confirmar Retirada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

