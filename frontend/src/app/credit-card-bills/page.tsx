'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { CreditCardBillList } from '@/components/credit-card-bills/credit-card-bill-list';
import { FadeIn } from '@/components/animations/fade-in';

export default function CreditCardBillsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold">Faturas de Cartão</h1>
              <p className="text-muted-foreground">
                Gerencie as faturas do seu cartão de crédito, defina datas de fechamento, vencimento e melhor data para compras.
              </p>
            </div>
          </FadeIn>

          <CreditCardBillList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

