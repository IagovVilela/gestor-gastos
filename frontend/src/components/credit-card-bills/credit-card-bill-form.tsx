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
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const creditCardBillSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  closingDay: z.number().min(1).max(31),
  dueDay: z.number().min(1).max(31),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2000).optional(),
  bestPurchaseDay: z.number().min(1).max(31).optional(),
  bankId: z.string().optional(),
  isPaid: z.boolean().optional(),
  notes: z.string().optional(),
});

type CreditCardBillFormData = z.infer<typeof creditCardBillSchema>;

interface CreditCardBillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  billId?: string;
}

export function CreditCardBillForm({ open, onOpenChange, onSuccess, billId }: CreditCardBillFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Array<{ id: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreditCardBillFormData>({
    resolver: zodResolver(creditCardBillSchema),
    defaultValues: {
      description: '',
      closingDay: 15,
      dueDay: 5,
      month: undefined,
      year: undefined,
      bestPurchaseDay: undefined,
      bankId: '',
      isPaid: false,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      fetchBanks();
      if (billId) {
        fetchBill();
      } else {
        reset({
          description: '',
          closingDay: 15,
          dueDay: 5,
          month: undefined,
          year: undefined,
          bestPurchaseDay: undefined,
          bankId: '',
          isPaid: false,
          notes: '',
        });
      }
    }
  }, [open, billId, reset]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchBill = async () => {
    try {
      const response = await api.get(`/credit-card-bills/${billId}`);
      const bill = response.data;
      const closingDate = bill.closingDate ? new Date(bill.closingDate) : null;
      const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
      const bestPurchaseDate = bill.bestPurchaseDate ? new Date(bill.bestPurchaseDate) : null;
      
      reset({
        description: bill.description,
        closingDay: closingDate ? closingDate.getDate() : 15,
        dueDay: dueDate ? dueDate.getDate() : 5,
        month: closingDate ? closingDate.getMonth() + 1 : undefined,
        year: closingDate ? closingDate.getFullYear() : undefined,
        bestPurchaseDay: bestPurchaseDate ? bestPurchaseDate.getDate() : undefined,
        bankId: bill.bankId || '',
        isPaid: bill.isPaid || false,
        notes: bill.notes || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar fatura',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: CreditCardBillFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        bankId: data.bankId || undefined,
      };

      if (billId) {
        await api.patch(`/credit-card-bills/${billId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Fatura atualizada com sucesso',
        });
      } else {
        await api.post('/credit-card-bills', payload);
        toast({
          title: 'Sucesso',
          description: 'Fatura criada com sucesso',
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar fatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{billId ? 'Editar Fatura' : 'Nova Fatura'}</DialogTitle>
          <DialogDescription>
            {billId
              ? 'Atualize as informações da fatura'
              : 'Cadastre uma nova fatura do cartão de crédito'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Fatura Nubank - Janeiro 2026"
              {...register('description')}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closingDay">Dia do Fechamento *</Label>
              <Input
                id="closingDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 15"
                {...register('closingDay', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.closingDay && (
                <p className="text-sm text-destructive">{errors.closingDay.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Dia do mês em que a fatura fecha (1-31)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia do Vencimento *</Label>
              <Input
                id="dueDay"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 5"
                {...register('dueDay', { valueAsNumber: true })}
                disabled={loading}
              />
              {errors.dueDay && (
                <p className="text-sm text-destructive">{errors.dueDay.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Dia do mês em que a fatura vence (1-31)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês (Opcional)</Label>
              <Select
                value={watch('month')?.toString() || 'none'}
                onValueChange={(value) => setValue('month', value === 'none' ? undefined : parseInt(value))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mês atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Mês atual</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2000, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não informado, usa o mês atual
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano (Opcional)</Label>
              <Input
                id="year"
                type="number"
                min="2000"
                placeholder="Ex: 2026"
                {...register('year', { valueAsNumber: true })}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Se não informado, usa o ano atual
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bestPurchaseDay">Dia da Melhor Data para Compra (Opcional)</Label>
            <Input
              id="bestPurchaseDay"
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 16"
              {...register('bestPurchaseDay', { valueAsNumber: true })}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Dia ideal para fazer compras e otimizar o prazo de pagamento (1-31)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankId">Banco do Cartão</Label>
            <Select
              value={watch('bankId') || 'none'}
              onValueChange={(value) => setValue('bankId', value === 'none' ? '' : value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem banco</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPaid"
              checked={watch('isPaid')}
              onCheckedChange={(checked) => setValue('isPaid', checked)}
              disabled={loading}
            />
            <Label htmlFor="isPaid">Fatura Paga</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a fatura..."
              {...register('notes')}
              disabled={loading}
              rows={3}
            />
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
              {loading ? 'Salvando...' : billId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

