'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ExpenseList } from '@/components/expenses/expense-list';

export default function ExpensesPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Despesas</h1>
            <p className="text-muted-foreground">
              Gerencie suas despesas
            </p>
          </div>

          <ExpenseList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

