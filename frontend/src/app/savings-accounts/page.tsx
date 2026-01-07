'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { SavingsAccountsList } from '@/components/savings-accounts/savings-accounts-list';
import { FadeIn } from '@/components/animations/fade-in';

export default function SavingsAccountsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold">Poupanças</h1>
              <p className="text-muted-foreground">
                Gerencie suas poupanças e acompanhe o crescimento de cada uma.
              </p>
            </div>
          </FadeIn>

          <SavingsAccountsList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}







