'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { PurchaseForm } from '@/components/purchases/purchase-form';
import { PurchaseList } from '@/components/purchases/purchase-list';
import { DailyBalanceTimeline } from '@/components/purchases/daily-balance-timeline';
import { useState } from 'react';

export default function PurchasesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    // Disparar evento para atualizar saldos
    window.dispatchEvent(new CustomEvent('balanceUpdated'));
  };

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Compras</h1>
            <p className="text-muted-foreground">
              Registre seus gastos diários de forma rápida e simples
            </p>
          </div>

          <PurchaseForm key={`form-${refreshKey}`} onSuccess={handleSuccess} />

          <DailyBalanceTimeline key={`timeline-${refreshKey}`} />

          <PurchaseList key={`list-${refreshKey}`} />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

