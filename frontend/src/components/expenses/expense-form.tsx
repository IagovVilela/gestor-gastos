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
import { ReceiptUpload } from './receipt-upload';

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser um número positivo'
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(['CREDIT', 'DEBIT', 'CASH', 'PIX', 'BANK_TRANSFER', 'OTHER']).optional(),
  categoryId: z.string().optional(),
  bankId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  isFixed: z.boolean().optional(),
  notes: z.string().optional(),
  receiptImageUrl: z.string().optional(),
});

const paymentMethodLabels: Record<string, string> = {
  CREDIT: 'Cartão de Crédito',
  DEBIT: 'Cartão de Débito',
  CASH: 'Dinheiro',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferência Bancária',
  OTHER: 'Outros',
};

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

interface Bank {
  id: string;
  name: string;
  color?: string;
}

export function ExpenseForm({
  open,
  onOpenChange,
  onSuccess,
  expenseId,
}: ExpenseFormProps) {
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
      fetchBanks();
      if (expenseId) {
        fetchExpense();
      } else {
        reset({
          description: '',
          amount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          paymentDate: '',
          paymentMethod: undefined,
          categoryId: '',
          bankId: '',
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

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
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
        paymentDate: expense.paymentDate 
          ? format(new Date(expense.paymentDate), 'yyyy-MM-dd')
          : '',
        paymentMethod: expense.paymentMethod || undefined,
        categoryId: expense.categoryId || '',
        bankId: expense.bankId || '',
        isRecurring: expense.isRecurring || false,
        isFixed: expense.isFixed || false,
        recurringType: expense.recurringType,
        notes: expense.notes || '',
        receiptImageUrl: expense.receiptImageUrl || '',
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
      const payload: any = {
        ...data,
        amount: Number(data.amount),
        date: dateToISOString(data.date),
        categoryId: data.categoryId || undefined,
        recurringType: data.isRecurring ? data.recurringType : undefined,
      };

      // Se paymentDate não foi informado, não enviar (usa a data do lançamento)
      if (data.paymentDate) {
        payload.paymentDate = dateToISOString(data.paymentDate);
      } else {
        payload.paymentDate = undefined;
      }

      // Se paymentMethod não foi informado, não enviar
      if (!data.paymentMethod) {
        payload.paymentMethod = undefined;
      }

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
              className="w-full"
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Select
                value={watch('categoryId') || 'none'}
                onValueChange={(value) => setValue('categoryId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data de Pagamento (Opcional)</Label>
              <Input
                id="paymentDate"
                type="date"
                {...register('paymentDate')}
                placeholder="Deixe vazio para pagar hoje"
              />
              <p className="text-xs text-muted-foreground">
                Se informar, será um lançamento futuro
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={watch('paymentMethod') || 'none'}
                onValueChange={(value) => setValue('paymentMethod', value === 'none' ? undefined : value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
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

          <div className="space-y-2">
            <ReceiptUpload
              value={watch('receiptImageUrl')}
              onChange={(url) => setValue('receiptImageUrl', url || '')}
              disabled={loading}
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

