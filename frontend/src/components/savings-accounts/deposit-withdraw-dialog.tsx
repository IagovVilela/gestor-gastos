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
import { ArrowDown, ArrowUp } from 'lucide-react';

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
  const { toast } = useToast();

  useEffect(() => {
    if (open && accountId) {
      fetchAccount();
      fetchBanks();
    } else {
      resetForm();
    }
  }, [open, accountId]);

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
  const canDeposit = type === 'deposit' && selectedBank && parseFloat(amount) > 0;
  const canWithdraw = type === 'withdraw' && account && parseFloat(amount) > 0 && parseFloat(amount) <= account.currentAmount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (type === 'deposit' ? !canDeposit : !canWithdraw)}
            >
              {loading
                ? 'Processando...'
                : type === 'deposit'
                ? 'Depositar'
                : 'Retirar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

