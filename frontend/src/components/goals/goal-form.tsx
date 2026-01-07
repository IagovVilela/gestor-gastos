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
import { GoalImageUpload } from './goal-image-upload';

const goalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  targetAmount: z.string().min(1, 'Valor alvo é obrigatório').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser um número positivo'
  ),
  deadline: z.string().optional(),
  type: z.enum(['SAVINGS', 'EXPENSE_LIMIT', 'CATEGORY_LIMIT', 'MONTHLY_BUDGET']),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional(),
  purchaseLink: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  goalId?: string;
}

interface Category {
  id: string;
  name: string;
}

export function GoalForm({
  open,
  onOpenChange,
  onSuccess,
  goalId,
}: GoalFormProps) {
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
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      type: 'SAVINGS',
    },
  });

  const goalType = watch('type');

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (goalId) {
        fetchGoal();
      } else {
        reset({
          title: '',
          description: '',
          targetAmount: '',
          deadline: '',
          type: 'SAVINGS',
          categoryId: '',
          imageUrl: '',
          purchaseLink: '',
        });
      }
    }
  }, [open, goalId, reset]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchGoal = async () => {
    try {
      const response = await api.get(`/goals/${goalId}`);
      const goal = response.data;
      reset({
        title: goal.title,
        description: goal.description || '',
        targetAmount: String(goal.targetAmount),
        deadline: goal.deadline
          ? format(new Date(goal.deadline), 'yyyy-MM-dd')
          : '',
        type: goal.type,
        categoryId: goal.categoryId || '',
        imageUrl: goal.imageUrl || '',
        purchaseLink: goal.purchaseLink || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar meta',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: GoalFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        targetAmount: Number(data.targetAmount),
        deadline: data.deadline ? dateToISOString(data.deadline) : undefined,
        categoryId: data.categoryId || undefined,
      };

      if (goalId) {
        await api.patch(`/goals/${goalId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Meta atualizada com sucesso',
        });
      } else {
        await api.post('/goals', payload);
        toast({
          title: 'Sucesso',
          description: 'Meta criada com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar meta',
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
          <DialogTitle>{goalId ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          <DialogDescription>
            {goalId
              ? 'Atualize os dados da meta'
              : 'Preencha os dados para criar uma nova meta financeira'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Economizar para viagem"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Descrição da meta (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Valor Alvo *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                {...register('targetAmount')}
                placeholder="0.00"
              />
              {errors.targetAmount && (
                <p className="text-sm text-destructive">
                  {errors.targetAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Data Limite</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Meta *</Label>
            <Select
              value={watch('type')}
              onValueChange={(value: any) => setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAVINGS">Economia</SelectItem>
                <SelectItem value="EXPENSE_LIMIT">Limite de Gastos</SelectItem>
                <SelectItem value="CATEGORY_LIMIT">Limite por Categoria</SelectItem>
                <SelectItem value="MONTHLY_BUDGET">Orçamento Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(goalType === 'CATEGORY_LIMIT' || goalType === 'EXPENSE_LIMIT') && (
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
          )}

          <div className="space-y-2">
            <GoalImageUpload
              value={watch('imageUrl')}
              onChange={(url) => setValue('imageUrl', url || '')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseLink">Link de Compra</Label>
            <Input
              id="purchaseLink"
              {...register('purchaseLink')}
              placeholder="https://example.com/product"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Link onde você pretende comprar esta meta (opcional)
            </p>
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
              {loading ? 'Salvando...' : goalId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

