'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryForm } from './category-form';
import api from '@/lib/api';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  name: string;
  description?: string;
  type: string;
  color?: string;
  icon?: string;
  parentId?: string;
  parent?: Category | null;
  subcategories?: Category[];
  _count?: {
    receipts: number;
    expenses: number;
  };
}

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | undefined>();
  const [deletingCategory, setDeletingCategory] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar categorias',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      await api.delete(`/categories/${deletingCategory}`);
      toast({
        title: 'Sucesso',
        description: 'Categoria deletada com sucesso',
      });
      fetchCategories();
      setDeletingCategory(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar categoria',
        variant: 'destructive',
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return 'Receita';
      case 'EXPENSE':
        return 'Despesa';
      case 'BOTH':
        return 'Ambos';
      default:
        return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return 'default';
      case 'EXPENSE':
        return 'destructive';
      case 'BOTH':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const mainCategories = categories.filter((c) => !c.parentId);
  const subcategories = categories.filter((c) => c.parentId);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma categoria registrada
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeira categoria
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {mainCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: category.color || '#6b7280',
                        }}
                      />
                      <div className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <div>
                          <p className="font-medium">{category.name}</p>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={getTypeVariant(category.type) as any}>
                        {getTypeLabel(category.type)}
                      </Badge>
                      {category._count && (
                        <span className="text-sm text-muted-foreground">
                          {category._count.receipts + category._count.expenses}{' '}
                          uso(s)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category.id);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.2 }}
                      className="ml-8 mt-2 space-y-2"
                    >
                      {category.subcategories.map((sub, subIndex) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + subIndex * 0.05 }}
                          className="flex items-center justify-between border rounded-lg p-3 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: sub.color || '#6b7280',
                              }}
                            />
                            <div className="flex items-center gap-2">
                              {sub.icon && <span>{sub.icon}</span>}
                              <span className="text-sm">{sub.name}</span>
                            </div>
                            <Badge variant={getTypeVariant(sub.type) as any} className="text-xs">
                              {getTypeLabel(sub.type)}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingCategory(sub.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setDeletingCategory(sub.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCategory(undefined);
        }}
        onSuccess={() => {
          fetchCategories();
          setFormOpen(false);
          setEditingCategory(undefined);
        }}
        categoryId={editingCategory}
      />

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta categoria? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

