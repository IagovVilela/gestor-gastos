'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { useAuthStore } from '@/store/auth-store';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ProjectedBalance } from '@/components/dashboard/projected-balance';
import { BankBalances } from '@/components/dashboard/bank-balances';
import { CreditCardBill } from '@/components/dashboard/credit-card-bill';
import { ReceiptsChart } from '@/components/dashboard/receipts-chart';
import { ExpensesChart } from '@/components/dashboard/expenses-chart';
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
        <div className="space-y-4 sm:space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Bem-vindo, {user?.name}! • {currentMonth}
              </p>
            </div>
          </FadeIn>

          <SummaryCards />

          <ProjectedBalance />

          <BankBalances />

          <StaggerContainer>
            <StaggerItem>
              <CreditCardBill />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <StaggerItem>
              <ReceiptsChart />
            </StaggerItem>
            <StaggerItem>
              <ExpensesChart />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer>
            <StaggerItem>
              <RecentTransactions />
            </StaggerItem>
          </StaggerContainer>

          <StaggerContainer className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
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

