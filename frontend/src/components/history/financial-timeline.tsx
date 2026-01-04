'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpCircle, ArrowDownCircle, Search, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: 'receipt' | 'expense';
  description: string;
  amount: number;
  date: string;
  category?: {
    name: string;
    color?: string;
  } | null;
  isRecurring?: boolean;
  isFixed?: boolean;
}

interface GroupedTransactions {
  month: string;
  year: number;
  monthNumber: number;
  transactions: Transaction[];
  totalReceipts: number;
  totalExpenses: number;
  balance: number;
}

export function FinancialTimeline() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    groupAndFilterTransactions();
  }, [transactions, searchTerm, selectedYear, selectedMonth]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Buscar apenas últimos 6 meses por padrão para melhor performance
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const startDate = sixMonthsAgo.toISOString().split('T')[0];
      
      // Buscar múltiplas páginas se necessário (máximo 100 por página)
      let allReceipts: any[] = [];
      let allExpenses: any[] = [];
      let receiptsPage = 1;
      let expensesPage = 1;
      let hasMoreReceipts = true;
      let hasMoreExpenses = true;
      const maxPages = 5; // Limitar a 5 páginas (500 itens no total)

      // Buscar receitas em páginas
      while (hasMoreReceipts && receiptsPage <= maxPages) {
        const receiptsRes = await api.get('/receipts', {
          params: {
            startDate,
            limit: 100,
            page: receiptsPage,
          },
        });
        
        const receiptsData = Array.isArray(receiptsRes.data) 
          ? receiptsRes.data 
          : (receiptsRes.data.data || []);
        
        allReceipts = [...allReceipts, ...receiptsData];
        
        if (Array.isArray(receiptsRes.data)) {
          hasMoreReceipts = false;
        } else {
          const pagination = receiptsRes.data.pagination;
          hasMoreReceipts = pagination && receiptsPage < pagination.totalPages;
        }
        receiptsPage++;
      }

      // Buscar despesas em páginas
      while (hasMoreExpenses && expensesPage <= maxPages) {
        const expensesRes = await api.get('/expenses', {
          params: {
            startDate,
            limit: 100,
            page: expensesPage,
          },
        });
        
        const expensesData = Array.isArray(expensesRes.data) 
          ? expensesRes.data 
          : (expensesRes.data.data || []);
        
        allExpenses = [...allExpenses, ...expensesData];
        
        if (Array.isArray(expensesRes.data)) {
          hasMoreExpenses = false;
        } else {
          const pagination = expensesRes.data.pagination;
          hasMoreExpenses = pagination && expensesPage < pagination.totalPages;
        }
        expensesPage++;
      }

      const receipts: Transaction[] = allReceipts.map((r: any) => ({
        id: r.id,
        type: 'receipt' as const,
        description: r.description,
        amount: Number(r.amount),
        date: r.date,
        category: r.category,
        isRecurring: r.isRecurring,
      }));

      const expenses: Transaction[] = allExpenses.map((e: any) => ({
        id: e.id,
        type: 'expense' as const,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        category: e.category,
        isRecurring: e.isRecurring,
        isFixed: e.isFixed,
      }));

      const allTransactions = [...receipts, ...expenses].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setTransactions(allTransactions);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupAndFilterTransactions = () => {
    let filtered = transactions;

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por ano
    filtered = filtered.filter((t) => {
      const date = parseISO(t.date);
      return date.getFullYear() === selectedYear;
    });

    // Filtrar por mês
    if (selectedMonth !== 'all') {
      const monthNum = parseInt(selectedMonth);
      filtered = filtered.filter((t) => {
        const date = parseISO(t.date);
        return date.getMonth() === monthNum;
      });
    }

    // Agrupar por mês
    const grouped: { [key: string]: Transaction[] } = {};
    filtered.forEach((transaction) => {
      const date = parseISO(transaction.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    });

    // Converter para array e calcular totais
    const result: GroupedTransactions[] = Object.entries(grouped)
      .map(([key, trans]) => {
        const [year, month] = key.split('-').map(Number);
        const monthDate = new Date(year, month, 1);
        const totalReceipts = trans
          .filter((t) => t.type === 'receipt')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = trans
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          month: format(monthDate, 'MMMM', { locale: ptBR }),
          year,
          monthNumber: month,
          transactions: trans.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
          totalReceipts,
          totalExpenses,
          balance: totalReceipts - totalExpenses,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.monthNumber - a.monthNumber;
      });

    setGroupedTransactions(result);
  };

  const getAvailableYears = () => {
    const years = new Set<number>();
    transactions.forEach((t) => {
      years.add(parseISO(t.date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  <SelectItem value="0">Janeiro</SelectItem>
                  <SelectItem value="1">Fevereiro</SelectItem>
                  <SelectItem value="2">Março</SelectItem>
                  <SelectItem value="3">Abril</SelectItem>
                  <SelectItem value="4">Maio</SelectItem>
                  <SelectItem value="5">Junho</SelectItem>
                  <SelectItem value="6">Julho</SelectItem>
                  <SelectItem value="7">Agosto</SelectItem>
                  <SelectItem value="8">Setembro</SelectItem>
                  <SelectItem value="9">Outubro</SelectItem>
                  <SelectItem value="10">Novembro</SelectItem>
                  <SelectItem value="11">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {groupedTransactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || selectedMonth !== 'all'
                ? 'Nenhuma transação encontrada com os filtros selecionados'
                : 'Nenhuma transação registrada'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedTransactions.map((group, groupIndex) => (
            <FadeIn key={`${group.year}-${group.monthNumber}`} delay={groupIndex * 0.1}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="capitalize">
                        {group.month} de {group.year}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.transactions.length} transação(ões)
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Receitas</p>
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(group.totalReceipts)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Despesas</p>
                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrency(group.totalExpenses)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p
                            className={`text-sm font-bold ${
                              group.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatCurrency(group.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.transactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {transaction.type === 'receipt' ? (
                            <ArrowUpCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{transaction.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(transaction.date), "dd 'de' MMM 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                            {transaction.category && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: transaction.category.color || undefined,
                                  }}
                                >
                                  {transaction.category.name}
                                </Badge>
                              </>
                            )}
                            {transaction.isRecurring && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="secondary" className="text-xs">
                                  Recorrente
                                </Badge>
                              </>
                            )}
                            {transaction.isFixed && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <Badge variant="outline" className="text-xs">
                                  Fixo
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`font-semibold ${
                              transaction.type === 'receipt'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'receipt' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

