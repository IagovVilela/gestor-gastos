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
import { useForm } from 'react-hook-form';

interface SavingsAccountFormProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
}

interface Bank {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  title: string;
}

interface FormData {
  name: string;
  description?: string;
  targetAmount?: number;
  bankId?: string;
  goalId?: string;
  color?: string;
  icon?: string;
}

export function SavingsAccountForm({ open, onClose, accountId }: SavingsAccountFormProps) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>();

  useEffect(() => {
    if (open) {
      fetchBanks();
      fetchGoals();
      if (accountId) {
        fetchAccount();
      } else {
        reset({
          name: '',
          description: '',
          targetAmount: undefined,
          bankId: undefined,
          goalId: undefined,
          color: undefined,
          icon: undefined,
        });
      }
    }
  }, [open, accountId]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const fetchAccount = async () => {
    if (!accountId) return;
    try {
      const response = await api.get(`/savings-accounts/${accountId}`);
      const account = response.data;
      reset({
        name: account.name,
        description: account.description || '',
        targetAmount: account.targetAmount ? Number(account.targetAmount) : undefined,
        bankId: account.bank?.id || undefined,
        goalId: account.goal?.id || undefined,
        color: account.color || undefined,
        icon: account.icon || undefined,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar poupança',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (accountId) {
        await api.patch(`/savings-accounts/${accountId}`, data);
        toast({
          title: 'Sucesso',
          description: 'Poupança atualizada com sucesso',
        });
      } else {
        await api.post('/savings-accounts', data);
        toast({
          title: 'Sucesso',
          description: 'Poupança criada com sucesso',
        });
      }
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar poupança',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accountId ? 'Editar Poupança' : 'Nova Poupança'}
          </DialogTitle>
          <DialogDescription>
            {accountId
              ? 'Atualize as informações da poupança'
              : 'Crie uma nova poupança para guardar seu dinheiro'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder="Ex: Reserva de Emergência"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva o objetivo desta poupança"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetAmount">Meta de Valor (opcional)</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                min="0"
                {...register('targetAmount', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="bankId">Banco (opcional)</Label>
              <Select
                value={watch('bankId') || 'none'}
                onValueChange={(value) => setValue('bankId', value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="goalId">Meta Associada (opcional)</Label>
            <Select
              value={watch('goalId') || 'none'}
              onValueChange={(value) => setValue('goalId', value === 'none' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Cor (opcional)</Label>
              <Input
                id="color"
                type="color"
                {...register('color')}
                className="h-10"
              />
            </div>

            <div>
              <Label htmlFor="icon">Ícone (opcional)</Label>
              <Input
                id="icon"
                {...register('icon')}
                placeholder="Ex: 🏠, 💰, ✈️"
                maxLength={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : accountId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}






