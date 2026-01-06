'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardBillForm } from './credit-card-bill-form';
import { CreditCardBillDetails } from './credit-card-bill-details';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, CreditCard, Calendar, DollarSign, Filter, Eye, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  bankId?: string | null;
  bank?: { id: string; name: string } | null;
  paidBank?: { id: string; name: string } | null;
  notes?: string | null;
}

export function CreditCardBillList() {
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [currentBills, setCurrentBills] = useState<CreditCardBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<string | undefined>();
  const [deletingBill, setDeletingBill] = useState<string | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [payBillDialogOpen, setPayBillDialogOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<CreditCardBill | null>(null);
  const [banks, setBanks] = useState<Array<{ 
    id: string; 
    name: string; 
    type: string;
    balance: number;
    savingsAccount?: {
      id: string;
      name: string;
      currentAmount: number;
      targetAmount?: number | null;
      description?: string | null;
    } | null;
  }>>([]);
  const [paymentMode, setPaymentMode] = useState<'single' | 'combined'>('single');
  const [billPaymentBankId, setBillPaymentBankId] = useState<string>('');
  const [combinedPayments, setCombinedPayments] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      // Buscar todas as faturas e as faturas atuais
      const [allBillsResponse, currentBillsResponse] = await Promise.all([
        api.get('/credit-card-bills'),
        api.get('/credit-card-bills/current-month/all'),
      ]);
      
      const allBills = allBillsResponse.data || [];
      const currentBillsData = currentBillsResponse.data || [];
      
      setCurrentBills(currentBillsData);
      
      // Filtrar faturas passadas e a fatura atual (não futuras)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Criar um mapa das faturas atuais por bankId para comparação rápida
      const currentBillsMap = new Map<string | null, CreditCardBill>();
      currentBillsData.forEach((cb: CreditCardBill) => {
        const cbBankId = cb.bankId || null;
        currentBillsMap.set(cbBankId, cb);
      });
      
      const pastAndCurrentBills = allBills.filter((bill: CreditCardBill) => {
        const billClosingDate = new Date(bill.closingDate);
        billClosingDate.setHours(0, 0, 0, 0);
        
        // Encontrar a fatura atual do mesmo cartão (mesmo bankId)
        const billBankId = bill.bankId || null;
        const currentBillForCard = currentBillsMap.get(billBankId);
        
        if (currentBillForCard) {
          // Se existe fatura atual, mostrar faturas anteriores ou igual a ela (incluindo a atual)
          const currentBillClosingDate = new Date(currentBillForCard.closingDate);
          currentBillClosingDate.setHours(0, 0, 0, 0);
          return billClosingDate <= currentBillClosingDate;
        } else {
          // Se não existe fatura atual, mostrar faturas com fechamento anterior ou igual a hoje
          return billClosingDate <= today;
        }
      });
      
      setBills(pastAndCurrentBills);
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

  // Filtrar faturas baseado no filtro selecionado
  const filteredBills = bills.filter((bill) => {
    if (filter === 'paid') return bill.isPaid;
    if (filter === 'unpaid') return !bill.isPaid;
    return true; // 'all'
  });

  const bankTypeLabels: Record<string, string> = {
    SALARY_ACCOUNT: 'Conta Salário',
    CURRENT_ACCOUNT: 'Conta Corrente',
    SAVINGS_ACCOUNT: 'Conta Poupança',
    INVESTMENT: 'Conta Investimento',
    CREDIT_CARD: 'Cartão de Crédito',
    DIGITAL_WALLET: 'Carteira Digital',
    OTHER: 'Outros',
  };

  // Agrupar contas por nome do banco
  const groupedBanks = banks.reduce((acc, bank) => {
    const bankName = bank.name;
    if (!acc[bankName]) {
      acc[bankName] = [];
    }
    acc[bankName].push(bank);
    return acc;
  }, {} as Record<string, typeof banks>);

  const handlePayBill = (bill: CreditCardBill) => {
    setSelectedBillForPayment(bill);
    setBillPaymentBankId('');
    setPaymentMode('single');
    setCombinedPayments({});
    setPayBillDialogOpen(true);
  };

  const handleConfirmPayBill = async () => {
    if (!selectedBillForPayment) return;

    const billAmount = Number(selectedBillForPayment.totalAmount) || 0;
    const combinedTotal = Object.values(combinedPayments).reduce((sum, amount) => sum + amount, 0);
    const remainingAmount = billAmount - combinedTotal;

    try {
      if (paymentMode === 'combined') {
        // Validar que o total está correto
        if (Math.abs(remainingAmount) > 0.01) {
          toast({
            title: 'Erro',
            description: remainingAmount > 0 
              ? `Ainda falta distribuir ${formatCurrency(remainingAmount)}`
              : `O valor distribuído excede a fatura em ${formatCurrency(Math.abs(remainingAmount))}`,
            variant: 'destructive',
          });
          return;
        }

        // Criar array de pagamentos
        const payments = Object.entries(combinedPayments)
          .filter(([_, amount]) => amount > 0)
          .map(([bankId, amount]) => ({
            bankId,
            amount,
          }));

        await api.patch(`/credit-card-bills/${selectedBillForPayment.id}/mark-paid`, {
          payments,
        });
      } else {
        await api.patch(`/credit-card-bills/${selectedBillForPayment.id}/mark-paid`, {
          paymentBankId: billPaymentBankId && billPaymentBankId !== 'none' ? billPaymentBankId : undefined,
        });
      }
      
      fetchBills();
      
      // Disparar evento para atualizar saldos em outros componentes
      window.dispatchEvent(new CustomEvent('balanceUpdated'));
      
      toast({
        title: 'Sucesso',
        description: 'Fatura marcada como paga',
      });
      
      setPayBillDialogOpen(false);
      setSelectedBillForPayment(null);
      setBillPaymentBankId('');
      setPaymentMode('single');
      setCombinedPayments({});
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao pagar fatura',
        variant: 'destructive',
      });
    }
  };

  const billAmount = selectedBillForPayment ? Number(selectedBillForPayment.totalAmount) || 0 : 0;
  const combinedTotal = Object.values(combinedPayments).reduce((sum, amount) => sum + amount, 0);
  const remainingAmount = billAmount - combinedTotal;

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
          <div className="flex-1">
            <CardTitle>Minhas Faturas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {bills.length} fatura{bills.length !== 1 ? 's' : ''} • 
              Pagas: {bills.filter(b => b.isPaid).length} • 
              Pendentes: {bills.filter(b => !b.isPaid).length}
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Fatura
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'paid' | 'unpaid')} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todas ({bills.length})</TabsTrigger>
              <TabsTrigger value="paid">Pagas ({bills.filter(b => b.isPaid).length})</TabsTrigger>
              <TabsTrigger value="unpaid">Pendentes ({bills.filter(b => !b.isPaid).length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredBills.length === 0 ? (
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
              {filteredBills.map((bill, index) => (
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
                    {bill.isPaid && bill.paidBank && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Banco usado:</span>
                        <span className="font-medium text-blue-600">
                          {bill.paidBank.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!bill.isPaid && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                        className="flex-1 min-w-[120px]"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Pagar Fatura
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedBillId(bill.id);
                        setDetailsOpen(true);
                      }}
                      className={bill.isPaid ? "flex-1" : ""}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingBill(bill.id);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
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

      <CreditCardBillDetails
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedBillId(null);
        }}
        billId={selectedBillId}
      />

      {/* Diálogo para pagar fatura */}
      <Dialog open={payBillDialogOpen} onOpenChange={(open) => {
        setPayBillDialogOpen(open);
        if (!open) {
          setBillPaymentBankId('');
          setPaymentMode('single');
          setCombinedPayments({});
          setSelectedBillForPayment(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagar Fatura do Cartão</DialogTitle>
            <DialogDescription>
              Valor total da fatura: <span className="font-semibold">{selectedBillForPayment ? formatCurrency(Number(selectedBillForPayment.totalAmount) || 0) : formatCurrency(0)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={paymentMode} onValueChange={(value) => setPaymentMode(value as 'single' | 'combined')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single">Pagamento Único</TabsTrigger>
                <TabsTrigger value="combined">Pagamento Combinado</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-3">
                <Label>Selecione uma conta para pagar a fatura completa</Label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {/* Outros bancos */}
                  {banks.map((bank) => {
                    const isSelected = billPaymentBankId === bank.id;
                    const billAmount = selectedBillForPayment ? Number(selectedBillForPayment.totalAmount) || 0 : 0;
                    const bankBalance = Number(bank.balance || 0);
                    const balanceAfter = bankBalance - billAmount;
                    const isSavingsAccount = bank.type === 'SAVINGS_ACCOUNT';
                    const hasSavings = isSavingsAccount && bank.savingsAccount;

                    return (
                      <div
                        key={bank.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setBillPaymentBankId(bank.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => setBillPaymentBankId(bank.id)}
                                className="mt-1"
                              />
                              <span className="font-semibold">{bank.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {bankTypeLabels[bank.type] || bank.type}
                              </Badge>
                            </div>
                            
                            <div className="ml-6 space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">Saldo atual: </span>
                                <span className={`font-semibold ${bankBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(bankBalance)}
                                </span>
                              </p>
                              
                              <p className="text-sm">
                                <span className="text-muted-foreground">Saldo após pagamento: </span>
                                <span className={`font-semibold ${balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(balanceAfter)}
                                </span>
                              </p>

                              {/* Diagnóstico para poupanças */}
                              {isSavingsAccount && hasSavings && bank.savingsAccount && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                    📊 Diagnóstico da Poupança
                                  </p>
                                  <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                                    <p>
                                      <span className="font-medium">Poupança:</span> {bank.savingsAccount.name}
                                    </p>
                                    <p>
                                      <span className="font-medium">Valor guardado:</span> {formatCurrency(Number(bank.savingsAccount.currentAmount))}
                                    </p>
                                    {bank.savingsAccount.targetAmount && (
                                      <p>
                                        <span className="font-medium">Meta:</span> {formatCurrency(Number(bank.savingsAccount.targetAmount))}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Aviso se saldo ficará negativo */}
                              {!isSavingsAccount && balanceAfter < 0 && (
                                <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                                  ⚠️ Atenção: O saldo ficará negativo após o pagamento!
                                </p>
                              )}

                              {/* Confirmação se saldo é suficiente */}
                              {!isSavingsAccount && balanceAfter >= 0 && bankBalance >= billAmount && (
                                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1">
                                  ✓ Saldo suficiente para pagar a fatura
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Opção sem banco específico */}
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      billPaymentBankId === 'none' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setBillPaymentBankId('none')}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={billPaymentBankId === 'none'}
                        onChange={() => setBillPaymentBankId('none')}
                      />
                      <span className="font-medium">Sem banco específico</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      O saldo não será atualizado automaticamente
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="combined" className="space-y-3">
                <Label>Distribua o pagamento entre múltiplas contas</Label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedBanks).map(([bankName, accounts]) => (
                    <div key={bankName} className="border rounded-lg p-3">
                      <h4 className="font-semibold mb-2 text-lg">{bankName}</h4>
                      <div className="space-y-2">
                        {accounts.map((account) => {
                          const paymentAmount = combinedPayments[account.id] || 0;
                          const accountBalance = Number(account.balance || 0);
                          const balanceAfter = accountBalance - paymentAmount;
                          const isSavingsAccount = account.type === 'SAVINGS_ACCOUNT';
                          const hasSavings = isSavingsAccount && account.savingsAccount;
                          const maxAmount = Math.min(accountBalance, remainingAmount + paymentAmount);

                          return (
                            <div key={account.id} className="p-2 border rounded bg-muted/30">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {bankTypeLabels[account.type] || account.type}
                                  </Badge>
                                  {isSavingsAccount && hasSavings && account.savingsAccount && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                      Poupança: {account.savingsAccount.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Saldo: </span>
                                  <span className={`font-semibold ${accountBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(accountBalance)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor={`amount-${account.id}`} className="text-xs w-24">
                                    Valor a pagar:
                                  </Label>
                                  <Input
                                    id={`amount-${account.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={maxAmount}
                                    value={paymentAmount || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setCombinedPayments({
                                        ...combinedPayments,
                                        [account.id]: Math.min(value, maxAmount),
                                      });
                                    }}
                                    placeholder="0,00"
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setCombinedPayments({
                                        ...combinedPayments,
                                        [account.id]: Math.min(accountBalance, remainingAmount + paymentAmount),
                                      });
                                    }}
                                  >
                                    Máx
                                  </Button>
                                </div>
                                
                                {paymentAmount > 0 && (
                                  <div className="text-xs space-y-1">
                                    <p>
                                      <span className="text-muted-foreground">Saldo após: </span>
                                      <span className={`font-semibold ${balanceAfter >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(balanceAfter)}
                                      </span>
                                    </p>
                                    {balanceAfter < 0 && (
                                      <p className="text-red-600 dark:text-red-400 font-semibold">
                                        ⚠️ Saldo ficará negativo!
                                      </p>
                                    )}
                                  </div>
                                )}

                                {isSavingsAccount && hasSavings && account.savingsAccount && paymentAmount > 0 && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                      📊 Diagnóstico da Poupança
                                    </p>
                                    <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                                      <p>
                                        <span className="font-medium">Valor guardado:</span> {formatCurrency(Number(account.savingsAccount.currentAmount))}
                                      </p>
                                      {account.savingsAccount.targetAmount && (
                                        <p>
                                          <span className="font-medium">Meta:</span> {formatCurrency(Number(account.savingsAccount.targetAmount))}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total distribuído:</span>
                    <span className={`font-bold text-lg ${Math.abs(remainingAmount) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(combinedTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Restante:</span>
                    <span className={`font-semibold ${Math.abs(remainingAmount) < 0.01 ? 'text-green-600' : remainingAmount > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                  {Math.abs(remainingAmount) > 0.01 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {remainingAmount > 0 
                        ? '⚠️ Ainda falta distribuir parte do valor'
                        : '⚠️ O valor distribuído excede o valor da fatura'}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPayBillDialogOpen(false);
                setBillPaymentBankId('');
                setPaymentMode('single');
                setCombinedPayments({});
                setSelectedBillForPayment(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayBill}
              disabled={paymentMode === 'combined' && Math.abs(remainingAmount) > 0.01}
            >
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

