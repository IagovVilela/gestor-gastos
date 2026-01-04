'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { AlertList } from '@/components/alerts/alert-list';

export default function AlertsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Alertas</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie seus alertas financeiros
            </p>
          </div>

          <AlertList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

