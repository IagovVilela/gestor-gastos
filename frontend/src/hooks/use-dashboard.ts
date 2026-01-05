import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyTotal {
  total: number;
  count: number;
  year: number;
  month: number;
}

interface ExpenseByCategory {
  category: {
    id: string;
    name: string;
    color?: string;
  } | null;
  total: number;
  count: number;
}

interface CreditCardBill {
  id: string;
  description: string;
  totalAmount: number;
  isPaid: boolean;
  closingDate: string;
  dueDate: string;
  bank?: {
    name: string;
  } | null;
}

interface DashboardData {
  receiptsTotal: MonthlyTotal | null;
  expensesTotal: MonthlyTotal | null;
  expensesByCategory: ExpenseByCategory[];
  creditCardBill: CreditCardBill | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    receiptsTotal: null,
    expensesTotal: null,
    expensesByCategory: [],
    creditCardBill: null,
    loading: true,
    error: null,
    refresh: () => {},
  });
  const [totalBalance, setTotalBalance] = useState<number>(0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchData = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [receiptsRes, expensesRes, expensesByCategoryRes, balanceRes, creditCardBillRes] = await Promise.all([
        api.get(`/receipts/monthly/${year}/${month}`),
        api.get(`/expenses/monthly/${year}/${month}`),
        api.get(`/expenses/by-category/${year}/${month}`),
        api.get('/banks/total-balance'),
        api.get('/credit-card-bills/current-month').catch(() => ({ data: null })), // Pode não ter fatura
      ]);

      const creditCardBill = creditCardBillRes.data
        ? {
            id: creditCardBillRes.data.id,
            description: creditCardBillRes.data.description,
            totalAmount: Number(creditCardBillRes.data.totalAmount),
            isPaid: creditCardBillRes.data.isPaid,
            closingDate: creditCardBillRes.data.closingDate,
            dueDate: creditCardBillRes.data.dueDate,
            bank: creditCardBillRes.data.bank,
          }
        : null;

      setData((prev) => ({
        receiptsTotal: receiptsRes.data,
        expensesTotal: expensesRes.data,
        expensesByCategory: expensesByCategoryRes.data,
        creditCardBill,
        loading: false,
        error: null,
        refresh: fetchData,
      }));
      
      setTotalBalance(balanceRes.data.total || 0);
    } catch (error: any) {
      setData((prev) => ({
        receiptsTotal: null,
        expensesTotal: null,
        expensesByCategory: [],
        creditCardBill: null,
        loading: false,
        error: error.response?.data?.message || 'Erro ao carregar dados',
        refresh: fetchData,
      }));
      setTotalBalance(0);
    }
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    refresh: fetchData,
    balance: totalBalance, // Usar saldo atual dos bancos ao invés de receitas - despesas
  };
}

