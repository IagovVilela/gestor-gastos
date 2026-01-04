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

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['RECEIPT', 'EXPENSE', 'BOTH']),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export function CategoryForm({
  open,
  onOpenChange,
  onSuccess,
  categoryId,
}: CategoryFormProps) {
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
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      type: 'BOTH',
    },
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
      if (categoryId) {
        fetchCategory();
      } else {
        reset({
          name: '',
          description: '',
          type: 'BOTH',
          color: '',
          icon: '',
          parentId: '',
        });
      }
    }
  }, [open, categoryId, reset]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.filter((c: Category) => c.id !== categoryId));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchCategory = async () => {
    try {
      const response = await api.get(`/categories/${categoryId}`);
      const category = response.data;
      reset({
        name: category.name,
        description: category.description || '',
        type: category.type,
        color: category.color || '',
        icon: category.icon || '',
        parentId: category.parentId || '',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar categoria',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        parentId: data.parentId || undefined,
      };

      if (categoryId) {
        await api.patch(`/categories/${categoryId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Categoria atualizada com sucesso',
        });
      } else {
        await api.post('/categories', payload);
        toast({
          title: 'Sucesso',
          description: 'Categoria criada com sucesso',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar categoria',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {categoryId ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription>
            {categoryId
              ? 'Atualize os dados da categoria'
              : 'Preencha os dados para criar uma nova categoria'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ex: Alimentação"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Descrição da categoria (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={watch('type')}
                onValueChange={(value: any) => setValue('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIPT">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                  <SelectItem value="BOTH">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Categoria Pai</Label>
              <Select
                value={watch('parentId') || 'none'}
                onValueChange={(value) => setValue('parentId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma (categoria principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Cor (hex)</Label>
              <Input
                id="color"
                type="color"
                {...register('color')}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ícone</Label>
              <Input
                id="icon"
                {...register('icon')}
                placeholder="Ex: 🍔"
                maxLength={2}
              />
            </div>
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
              {loading ? 'Salvando...' : categoryId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

