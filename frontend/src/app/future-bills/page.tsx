'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { FutureBillsList } from '@/components/credit-card-bills/future-bills-list';

export default function FutureBillsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Faturas Futuras</h1>
            <p className="text-muted-foreground">
              Visualize suas faturas futuras e as compras que aparecerão em cada uma
            </p>
          </div>

          <FutureBillsList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}




