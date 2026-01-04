import { useState, useEffect } from 'react';
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

interface DashboardData {
  receiptsTotal: MonthlyTotal | null;
  expensesTotal: MonthlyTotal | null;
  expensesByCategory: ExpenseByCategory[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData>({
    receiptsTotal: null,
    expensesTotal: null,
    expensesByCategory: [],
    loading: true,
    error: null,
    refresh: () => {},
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchData = async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [receiptsRes, expensesRes, expensesByCategoryRes] = await Promise.all([
        api.get(`/receipts/monthly/${year}/${month}`),
        api.get(`/expenses/monthly/${year}/${month}`),
        api.get(`/expenses/by-category/${year}/${month}`),
      ]);

      setData({
        receiptsTotal: receiptsRes.data,
        expensesTotal: expensesRes.data,
        expensesByCategory: expensesByCategoryRes.data,
        loading: false,
        error: null,
        refresh: fetchData,
      });
    } catch (error: any) {
      setData({
        receiptsTotal: null,
        expensesTotal: null,
        expensesByCategory: [],
        loading: false,
        error: error.response?.data?.message || 'Erro ao carregar dados',
        refresh: fetchData,
      });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...data,
    refresh: fetchData,
    balance: (data.receiptsTotal?.total || 0) - (data.expensesTotal?.total || 0),
  };
}

