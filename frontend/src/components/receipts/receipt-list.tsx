'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReceiptForm } from './receipt-form';
import { ReceiptFilters, ReceiptFiltersProps } from './receipt-filters';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, ArrowUpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/fade-in';
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

interface Receipt {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: {
    name: string;
  } | null;
  isRecurring: boolean;
  recurringType?: string;
  notes?: string;
}

export function ReceiptList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<string | undefined>();
  const [deletingReceipt, setDeletingReceipt] = useState<string | undefined>();
  const [filters, setFilters] = useState<ReceiptFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchReceipts();
  }, []);

  useEffect(() => {
    fetchReceipts(1); // Resetar para página 1 quando filtros mudarem
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', {
        params: { type: 'RECEIPT' },
      });
      setCategories(response.data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchReceipts = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pagination.limit,
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'page') {
          params[key] = value;
        }
      });
      const response = await api.get('/receipts', { params });
      
      // Suportar formato antigo (array) e novo (objeto com paginação)
      if (Array.isArray(response.data)) {
        setReceipts(response.data);
      } else {
        setReceipts(response.data.data || []);
        setPagination(response.data.pagination || pagination);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar receitas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: ReceiptFilters) => {
    setFilters(newFilters);
  };

  const handleDelete = async () => {
    if (!deletingReceipt) return;

    try {
      await api.delete(`/receipts/${deletingReceipt}`);
      toast({
        title: 'Sucesso',
        description: 'Receita deletada com sucesso',
      });
      fetchReceipts();
      setDeletingReceipt(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar receita',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ReceiptFilters onFilterChange={handleFilterChange} categories={categories} />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Receitas</CardTitle>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Receita
          </Button>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma receita registrada
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeira receita
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt, index) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <ArrowUpCircle className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">{receipt.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(receipt.date), "dd 'de' MMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                        {receipt.category && ` • ${receipt.category.name}`}
                        {receipt.isRecurring && ` • Recorrente`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(receipt.amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingReceipt(receipt.id);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingReceipt(receipt.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} receitas
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReceipts(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReceipts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ReceiptForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingReceipt(undefined);
        }}
        onSuccess={() => {
          fetchReceipts(pagination.page);
          setFormOpen(false);
          setEditingReceipt(undefined);
        }}
        receiptId={editingReceipt}
      />

      <AlertDialog
        open={!!deletingReceipt}
        onOpenChange={(open) => !open && setDeletingReceipt(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode
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

