import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface MonthlyComparison {
  currentMonth: {
    receipts: number;
    expenses: number;
    balance: number;
  };
  previousMonth: {
    receipts: number;
    expenses: number;
    balance: number;
  };
  receiptsChange: number;
  expensesChange: number;
  balanceChange: number;
  loading: boolean;
  error: string | null;
}

export function useMonthlyComparison() {
  const [data, setData] = useState<MonthlyComparison>({
    currentMonth: { receipts: 0, expenses: 0, balance: 0 },
    previousMonth: { receipts: 0, expenses: 0, balance: 0 },
    receiptsChange: 0,
    expensesChange: 0,
    balanceChange: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchComparison = async () => {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Mês anterior
        const prevDate = new Date(currentYear, currentMonth - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;

        const [
          currentReceiptsRes,
          currentExpensesRes,
          prevReceiptsRes,
          prevExpensesRes,
        ] = await Promise.all([
          api.get(`/receipts/monthly/${currentYear}/${currentMonth}`),
          api.get(`/expenses/monthly/${currentYear}/${currentMonth}`),
          api.get(`/receipts/monthly/${prevYear}/${prevMonth}`),
          api.get(`/expenses/monthly/${prevYear}/${prevMonth}`),
        ]);

        const currentReceipts = currentReceiptsRes.data.total || 0;
        const currentExpenses = currentExpensesRes.data.total || 0;
        const currentBalance = currentReceipts - currentExpenses;

        const prevReceipts = prevReceiptsRes.data.total || 0;
        const prevExpenses = prevExpensesRes.data.total || 0;
        const prevBalance = prevReceipts - prevExpenses;

        // Calcular mudanças percentuais
        const receiptsChange =
          prevReceipts > 0
            ? ((currentReceipts - prevReceipts) / prevReceipts) * 100
            : currentReceipts > 0
            ? 100
            : 0;

        const expensesChange =
          prevExpenses > 0
            ? ((currentExpenses - prevExpenses) / prevExpenses) * 100
            : currentExpenses > 0
            ? 100
            : 0;

        const balanceChange = currentBalance - prevBalance;

        setData({
          currentMonth: {
            receipts: currentReceipts,
            expenses: currentExpenses,
            balance: currentBalance,
          },
          previousMonth: {
            receipts: prevReceipts,
            expenses: prevExpenses,
            balance: prevBalance,
          },
          receiptsChange,
          expensesChange,
          balanceChange,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error.response?.data?.message || 'Erro ao carregar comparação',
        }));
      }
    };

    fetchComparison();
  }, []);

  return data;
}

