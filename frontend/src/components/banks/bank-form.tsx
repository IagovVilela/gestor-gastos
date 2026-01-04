'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const bankTypeEnum = z.enum([
  'SALARY_ACCOUNT',
  'CURRENT_ACCOUNT',
  'SAVINGS_ACCOUNT',
  'INVESTMENT',
  'CREDIT_CARD',
  'DIGITAL_WALLET',
  'OTHER',
]);

const bankSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: bankTypeEnum.optional(),
  balance: z.number().min(0, 'Saldo não pode ser negativo').optional(),
  isPrimary: z.boolean().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

type BankFormData = z.infer<typeof bankSchema>;

interface BankFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bankId?: string;
}

export function BankForm({ open, onOpenChange, onSuccess, bankId }: BankFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      name: '',
      type: 'CURRENT_ACCOUNT',
      balance: 0,
      isPrimary: false,
      color: '#8B5CF6',
      icon: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (bankId) {
        fetchBank();
      } else {
        reset({
          name: '',
          type: 'CURRENT_ACCOUNT',
          balance: 0,
          isPrimary: false,
          color: '#8B5CF6',
          icon: '',
        });
      }
    }
  }, [open, bankId, reset]);

  const fetchBank = async () => {
    try {
      const response = await api.get(`/banks/${bankId}`);
      const bank = response.data;
      reset({
        name: bank.name,
        type: bank.type || 'CURRENT_ACCOUNT',
        balance: Number(bank.balance),
        isPrimary: bank.isPrimary,
        color: bank.color || '#8B5CF6',
        icon: bank.icon || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar banco',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: BankFormData) => {
    setLoading(true);
    try {
      if (bankId) {
        await api.patch(`/banks/${bankId}`, data);
        toast({
          title: 'Sucesso',
          description: 'Banco atualizado com sucesso',
        });
      } else {
        await api.post('/banks', data);
        toast({
          title: 'Sucesso',
          description: 'Banco criado com sucesso',
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar banco',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{bankId ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
          <DialogDescription>
            {bankId
              ? 'Atualize as informações do banco'
              : 'Adicione um novo banco para gerenciar seus saldos'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Banco *</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank, Banco do Brasil"
              {...register('name')}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Conta</Label>
            <Select
              value={watch('type') || 'CURRENT_ACCOUNT'}
              onValueChange={(value) => setValue('type', value as any)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de conta" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(bankTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Inicial</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('balance', { valueAsNumber: true })}
              disabled={loading}
            />
            {errors.balance && (
              <p className="text-sm text-destructive">{errors.balance.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    watch('color') === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                />
              ))}
            </div>
            <Input
              id="color"
              type="text"
              placeholder="#8B5CF6"
              {...register('color')}
              disabled={loading}
              className="mt-2"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPrimary"
              checked={watch('isPrimary')}
              onCheckedChange={(checked) => setValue('isPrimary', checked)}
              disabled={loading}
            />
            <Label htmlFor="isPrimary">Banco Principal</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : bankId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

