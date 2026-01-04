'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { ProfileSection } from '@/components/settings/profile-section';
import { PreferencesSection } from '@/components/settings/preferences-section';
import { NotificationsSection } from '@/components/settings/notifications-section';
import { ExportSection } from '@/components/settings/export-section';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerContainer, StaggerItem } from '@/components/animations/stagger-container';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-3xl font-bold">Configurações</h1>
              <p className="text-muted-foreground">
                Configure suas preferências e gerencie sua conta
              </p>
            </div>
          </FadeIn>

          <StaggerContainer className="space-y-6">
            <StaggerItem>
              <ProfileSection />
            </StaggerItem>

            <StaggerItem>
              <PreferencesSection />
            </StaggerItem>

            <StaggerItem>
              <NotificationsSection />
            </StaggerItem>

            <StaggerItem>
              <ExportSection />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}


