'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { GoalList } from '@/components/goals/goal-list';

export default function GoalsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Metas Financeiras</h1>
            <p className="text-muted-foreground">
              Gerencie suas metas e acompanhe seu progresso
            </p>
          </div>

          <GoalList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

