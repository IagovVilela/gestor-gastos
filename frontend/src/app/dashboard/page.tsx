'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { useAuthStore } from '@/store/auth-store';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ExpensesByCategoryChart } from '@/components/dashboard/expenses-by-category-chart';
import { ReceiptsByCategoryChart } from '@/components/dashboard/receipts-by-category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { MonthlyComparison } from '@/components/dashboard/monthly-comparison';
import { SpendingTrends } from '@/components/dashboard/spending-trends';
import { Insights } from '@/components/dashboard/insights';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerContainer, StaggerItem } from '@/components/animations/stagger-container';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const currentMonth = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Bem-vindo, {user?.name}! • {currentMonth}
              </p>
            </div>
          </FadeIn>

          <SummaryCards />

          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            <StaggerItem>
              <ReceiptsByCategoryChart />
            </StaggerItem>
            <StaggerItem>
              <ExpensesByCategoryChart />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer>
            <StaggerItem>
              <RecentTransactions />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid gap-6 md:grid-cols-2">
            <StaggerItem>
              <MonthlyComparison />
            </StaggerItem>
            <StaggerItem>
              <SpendingTrends />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer>
            <StaggerItem>
              <Insights />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

