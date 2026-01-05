'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardBillForm } from './credit-card-bill-form';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, CreditCard, Calendar, DollarSign } from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditCardBill {
  id: string;
  description: string;
  closingDate: string;
  dueDate: string;
  bestPurchaseDate?: string | null;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  bank?: { name: string } | null;
  notes?: string | null;
}

export function CreditCardBillList() {
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<string | undefined>();
  const [deletingBill, setDeletingBill] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      // Buscar apenas as faturas atuais de cada cartão
      const response = await api.get('/credit-card-bills/current-month/all');
      setBills(response.data || []);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar faturas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBill) return;

    try {
      await api.delete(`/credit-card-bills/${deletingBill}`);
      toast({
        title: 'Sucesso',
        description: 'Fatura deletada com sucesso',
      });
      fetchBills();
      setDeletingBill(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar fatura',
        variant: 'destructive',
      });
    }
  };

  if (loading && bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Minhas Faturas</CardTitle>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Fatura
          </Button>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma fatura cadastrada
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeira fatura
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bills.map((bill, index) => (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">{bill.description}</h3>
                        {bill.bank && (
                          <p className="text-xs text-muted-foreground">
                            {bill.bank.name}
                          </p>
                        )}
                      </div>
                    </div>
                    {bill.isPaid && (
                      <Badge variant="default" className="bg-green-500">
                        Paga
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fechamento:
                      </span>
                      <span className="font-medium">
                        {format(new Date(bill.closingDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vencimento:
                      </span>
                      <span className="font-medium text-red-600">
                        {format(new Date(bill.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {bill.bestPurchaseDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">💡 Melhor compra:</span>
                        <span className="font-medium text-blue-600">
                          {format(new Date(bill.bestPurchaseDate), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Total:
                      </span>
                      <span className="text-lg font-bold">
                        {formatCurrency(Number(bill.totalAmount) || 0)}
                      </span>
                    </div>
                    {bill.paidAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pago:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(bill.paidAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBill(bill.id);
                        setFormOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingBill(bill.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreditCardBillForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBill(undefined);
        }}
        onSuccess={() => {
          fetchBills();
          setFormOpen(false);
          setEditingBill(undefined);
        }}
        billId={editingBill}
      />

      <AlertDialog
        open={!!deletingBill}
        onOpenChange={(open) => !open && setDeletingBill(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta fatura? Esta ação não pode ser
              desfeita.
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

