'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { dateToISOString } from '@/lib/formatters';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const purchaseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser um número positivo'
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  paymentMethod: z.enum(['CREDIT', 'DEBIT', 'CASH', 'PIX', 'BANK_TRANSFER', 'OTHER']).optional(),
  bankId: z.string().optional(),
  notes: z.string().optional(),
});

const paymentMethodLabels: Record<string, string> = {
  CREDIT: 'Cartão de Crédito',
  DEBIT: 'Cartão de Débito',
  CASH: 'Dinheiro',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferência Bancária',
  OTHER: 'Outros',
};

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  onSuccess: () => void;
  purchaseId?: string;
  onCancel?: () => void;
  showCard?: boolean;
}

interface Bank {
  id: string;
  name: string;
  color?: string;
}

export function PurchaseForm({ onSuccess, purchaseId, onCancel, showCard = true }: PurchaseFormProps) {
  const { toast } = useToast();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    fetchBanks();
    if (purchaseId) {
      fetchPurchase();
    } else {
      reset({
        description: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: undefined,
        bankId: '',
        notes: '',
      });
    }
  }, [purchaseId, reset]);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchPurchase = async () => {
    try {
      const response = await api.get(`/expenses/${purchaseId}`);
      const expense = response.data;
      reset({
        description: expense.description,
        amount: String(expense.amount),
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        paymentMethod: expense.paymentMethod || undefined,
        bankId: expense.bankId || '',
        notes: expense.notes || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar compra',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: PurchaseFormData) => {
    setLoading(true);
    try {
      const payload: any = {
        description: data.description,
        amount: Number(data.amount),
        date: dateToISOString(data.date),
        paymentMethod: data.paymentMethod || undefined,
        bankId: data.bankId || undefined,
        notes: data.notes || undefined,
      };

      if (purchaseId) {
        await api.patch(`/expenses/${purchaseId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Compra atualizada com sucesso',
        });
      } else {
        await api.post('/expenses', payload);
        toast({
          title: 'Sucesso',
          description: 'Compra registrada com sucesso',
        });
        // Limpar formulário após sucesso
        reset({
          description: '',
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          paymentMethod: undefined,
          bankId: '',
          notes: '',
        });
      }

      // Disparar evento para atualizar saldos
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar compra',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Ex: Supermercado, Farmácia..."
              className="w-full text-base"
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
                className="text-base"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input 
                id="date" 
                type="date" 
                {...register('date')} 
                className="text-base"
              />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={watch('paymentMethod') || 'none'}
                onValueChange={(value) => setValue('paymentMethod', value === 'none' ? undefined : value as any)}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankId">Banco</Label>
              <Select
                value={watch('bankId') || 'none'}
                onValueChange={(value) => setValue('bankId', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Selecione um banco" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            {purchaseId && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading} className={purchaseId && onCancel ? 'flex-1' : 'w-full'}>
              {loading ? 'Salvando...' : purchaseId ? 'Atualizar Compra' : 'Registrar Compra'}
            </Button>
          </div>
        </form>
  );

  if (!showCard) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {purchaseId ? 'Editar Compra' : 'Nova Compra'}
          </h2>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          {purchaseId ? 'Editar Compra' : 'Nova Compra'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}

