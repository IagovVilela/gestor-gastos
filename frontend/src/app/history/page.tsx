'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { FinancialTimeline } from '@/components/history/financial-timeline';

export default function HistoryPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Histórico Financeiro</h1>
            <p className="text-muted-foreground">
              Visualize todas as suas transações em uma timeline completa
            </p>
          </div>

          <FinancialTimeline />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}


