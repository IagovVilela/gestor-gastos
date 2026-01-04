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

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser um número positivo'
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  categoryId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  isFixed: z.boolean().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  expenseId?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSuccess,
  expenseId,
}: ExpenseFormProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      isFixed: false,
    },
  });

  const isRecurring = watch('isRecurring');

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (expenseId) {
        fetchExpense();
      } else {
        reset({
          description: '',
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          categoryId: '',
          isRecurring: false,
          isFixed: false,
          recurringType: undefined,
          notes: '',
        });
      }
    }
  }, [open, expenseId, reset]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', {
        params: { type: 'EXPENSE' },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchExpense = async () => {
    try {
      const response = await api.get(`/expenses/${expenseId}`);
      const expense = response.data;
      reset({
        description: expense.description,
        amount: String(expense.amount),
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        categoryId: expense.categoryId || '',
        isRecurring: expense.isRecurring || false,
        isFixed: expense.isFixed || false,
        recurringType: expense.recurringType,
        notes: expense.notes || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar despesa',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        amount: Number(data.amount),
        date: new Date(data.date).toISOString(),
        categoryId: data.categoryId || undefined,
        recurringType: data.isRecurring ? data.recurringType : undefined,
      };

      if (expenseId) {
        await api.patch(`/expenses/${expenseId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Despesa atualizada com sucesso',
        });
      } else {
        await api.post('/expenses', payload);
        toast({
          title: 'Sucesso',
          description: 'Despesa criada com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar despesa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expenseId ? 'Editar Despesa' : 'Nova Despesa'}
          </DialogTitle>
          <DialogDescription>
            {expenseId
              ? 'Atualize os dados da despesa'
              : 'Preencha os dados para criar uma nova despesa'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Ex: Supermercado"
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount')}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select
              value={watch('categoryId') || ''}
              onValueChange={(value) => setValue('categoryId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem categoria</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isFixed"
              {...register('isFixed')}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isFixed">Gasto fixo</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isRecurring"
              {...register('isRecurring')}
              className="rounded border-gray-300"
            />
            <Label htmlFor="isRecurring">Despesa recorrente</Label>
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
              {loading ? 'Salvando...' : expenseId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

