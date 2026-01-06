'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PurchaseForm } from './purchase-form';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface Purchase {
  id: string;
  description: string;
  amount: number;
  date: string;
  paymentMethod?: string;
  bank?: {
    name: string;
    color?: string;
  } | null;
  notes?: string;
}

const paymentMethodLabels: Record<string, string> = {
  CREDIT: 'Cartão de Crédito',
  DEBIT: 'Cartão de Débito',
  CASH: 'Dinheiro',
  PIX: 'PIX',
  BANK_TRANSFER: 'Transferência Bancária',
  OTHER: 'Outros',
};

export function PurchaseList() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<string | undefined>();
  const [deletingPurchase, setDeletingPurchase] = useState<string | undefined>();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');
  const { toast } = useToast();

  useEffect(() => {
    fetchPurchases();
  }, [dateFilter]);

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'today':
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
      default:
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        };
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const response = await api.get('/expenses', {
        params: {
          startDate,
          endDate,
          limit: 50,
        },
      });
      setPurchases(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar compras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPurchase) return;

    try {
      await api.delete(`/expenses/${deletingPurchase}`);
      toast({
        title: 'Sucesso',
        description: 'Compra excluída com sucesso',
      });
      fetchPurchases();
      setDeletingPurchase(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir compra',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (purchaseId: string) => {
    setEditingPurchase(purchaseId);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingPurchase(undefined);
    fetchPurchases();
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingPurchase(undefined);
  };

  const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compras</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {formOpen && (
        <div className="mb-6">
          <PurchaseForm
            purchaseId={editingPurchase}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Compras Recentes</CardTitle>
            <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="today">Hoje</TabsTrigger>
                <TabsTrigger value="week">7 dias</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma compra registrada neste período
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total do período:</span>
                  <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              <div className="space-y-3">
                {purchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between border rounded-lg p-4 hover:shadow-md transition-shadow gap-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{purchase.description}</h3>
                        {purchase.paymentMethod && (
                          <Badge variant="outline" className="text-xs">
                            {paymentMethodLabels[purchase.paymentMethod] || purchase.paymentMethod}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {format(new Date(purchase.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                        {purchase.bank && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: purchase.bank.color || '#8B5CF6' }}
                            />
                            {purchase.bank.name}
                          </span>
                        )}
                      </div>
                      {purchase.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {purchase.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">
                        {formatCurrency(purchase.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(purchase.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPurchase(purchase.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deletingPurchase}
        onOpenChange={(open) => !open && setDeletingPurchase(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Compra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

