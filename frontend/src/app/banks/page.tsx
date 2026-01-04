'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { BankList } from '@/components/banks/bank-list';
import { FadeIn } from '@/components/animations/fade-in';

export default function BanksPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold">Bancos e Contas</h1>
              <p className="text-muted-foreground">
                Gerencie seus bancos e acompanhe o saldo de cada conta.
              </p>
            </div>
          </FadeIn>

          <BankList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

