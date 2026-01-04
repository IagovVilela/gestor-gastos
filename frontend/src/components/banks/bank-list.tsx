'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BankForm } from './bank-form';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, Building2, Star } from 'lucide-react';
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

interface Bank {
  id: string;
  name: string;
  type?: string;
  balance: number;
  isPrimary: boolean;
  color?: string;
  icon?: string;
}

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

export function BankList() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<string | undefined>();
  const [deletingBank, setDeletingBank] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar bancos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBank) return;

    try {
      await api.delete(`/banks/${deletingBank}`);
      toast({
        title: 'Sucesso',
        description: 'Banco deletado com sucesso',
      });
      fetchBanks();
      setDeletingBank(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar banco',
        variant: 'destructive',
      });
    }
  };

  if (loading && banks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bancos</CardTitle>
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
          <CardTitle>Meus Bancos</CardTitle>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Banco
          </Button>
        </CardHeader>
        <CardContent>
          {banks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhum banco cadastrado
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeiro banco
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {banks.map((bank, index) => (
                <motion.div
                  key={bank.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  style={{
                    borderLeftColor: bank.color || '#8B5CF6',
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2
                        className="h-5 w-5"
                        style={{ color: bank.color || '#8B5CF6' }}
                      />
                      <div>
                        <h3 className="font-semibold">{bank.name}</h3>
                        {bank.type && (
                          <p className="text-xs text-muted-foreground">
                            {bankTypeLabels[bank.type] || bank.type}
                          </p>
                        )}
                      </div>
                    </div>
                    {bank.isPrimary && (
                      <Badge variant="default" className="bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Principal
                      </Badge>
                    )}
                  </div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold">
                      {formatCurrency(bank.balance)}
                    </p>
                    <p className="text-sm text-muted-foreground">Saldo atual</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBank(bank.id);
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
                      onClick={() => setDeletingBank(bank.id)}
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

      <BankForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingBank(undefined);
        }}
        onSuccess={() => {
          fetchBanks();
          setFormOpen(false);
          setEditingBank(undefined);
        }}
        bankId={editingBank}
      />

      <AlertDialog
        open={!!deletingBank}
        onOpenChange={(open) => !open && setDeletingBank(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este banco? Esta ação não pode ser
              desfeita. Se houver transações associadas, você precisará removê-las primeiro.
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

