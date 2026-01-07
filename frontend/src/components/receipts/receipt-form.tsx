'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { dateToISOString } from '@/lib/formatters';

const receiptSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser um número positivo'
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.string().optional(),
  bankId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  notes: z.string().optional(),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

interface ReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  receiptId?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Bank {
  id: string;
  name: string;
  color?: string;
}

export function ReceiptForm({
  open,
  onOpenChange,
  onSuccess,
  receiptId,
}: ReceiptFormProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
    },
  });

  const isRecurring = watch('isRecurring');

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchBanks();
      if (receiptId) {
        fetchReceipt();
      } else {
        reset({
          description: '',
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          categoryId: '',
          bankId: '',
          isRecurring: false,
          recurringType: undefined,
          notes: '',
        });
      }
    }
  }, [open, receiptId, reset]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', {
        params: { type: 'RECEIPT' },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
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

  const fetchReceipt = async () => {
    try {
      const response = await api.get(`/receipts/${receiptId}`);
      const receipt = response.data;
      reset({
        description: receipt.description,
        amount: String(receipt.amount),
        date: format(new Date(receipt.date), 'yyyy-MM-dd'),
        categoryId: receipt.categoryId || '',
        bankId: receipt.bankId || '',
        isRecurring: receipt.isRecurring || false,
        recurringType: receipt.recurringType,
        notes: receipt.notes || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar receita',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ReceiptFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: dateToISOString(data.date),
        categoryId: data.categoryId || undefined,
        recurringType: data.isRecurring ? data.recurringType : undefined,
      };

      if (receiptId) {
        await api.patch(`/receipts/${receiptId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Receita atualizada com sucesso',
        });
      } else {
        await api.post('/receipts', payload);
        toast({
          title: 'Sucesso',
          description: 'Receita criada com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar receita',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {receiptId ? 'Editar Receita' : 'Nova Receita'}
          </DialogTitle>
          <DialogDescription>
            {receiptId
              ? 'Atualize os dados da receita'
              : 'Preencha os dados para criar uma nova receita'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Ex: Salário"
              className="text-base"
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
              <Label htmlFor="categoryId">Categoria</Label>
              <Select
                value={watch('categoryId') || 'none'}
                onValueChange={(value) => setValue('categoryId', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
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

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              {...register('isRecurring')}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isRecurring">Receita recorrente</Label>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurringType">Tipo de Recorrência</Label>
              <Select
                value={watch('recurringType') || ''}
                onValueChange={(value: any) =>
                  setValue('recurringType', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diária</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionais (opcional)"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : receiptId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

