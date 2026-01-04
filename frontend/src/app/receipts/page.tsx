'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ReceiptList } from '@/components/receipts/receipt-list';

export default function ReceiptsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Receitas</h1>
            <p className="text-muted-foreground">
              Gerencie suas receitas
            </p>
          </div>

          <ReceiptList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

