'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Bell, Save } from 'lucide-react';

interface NotificationSettings {
  emailNotifications: boolean;
  budgetAlerts: boolean;
  goalAlerts: boolean;
  recurringPaymentAlerts: boolean;
  reportFrequency: string;
}

export function NotificationsSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    budgetAlerts: true,
    goalAlerts: true,
    recurringPaymentAlerts: true,
    reportFrequency: 'MONTHLY',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings({
          emailNotifications: response.data.emailNotifications ?? true,
          budgetAlerts: response.data.budgetAlerts ?? true,
          goalAlerts: response.data.goalAlerts ?? true,
          recurringPaymentAlerts: response.data.recurringPaymentAlerts ?? true,
          reportFrequency: response.data.reportFrequency || 'MONTHLY',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.patch('/settings', settings);
      toast({
        title: 'Sucesso',
        description: 'Configurações de notificações salvas com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <CardTitle>Notificações</CardTitle>
        </div>
        <CardDescription>
          Configure suas preferências de notificações e alertas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações por email
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Orçamento</Label>
              <p className="text-sm text-muted-foreground">
                Alertar quando o orçamento for excedido
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.budgetAlerts}
              onChange={(e) =>
                setSettings({ ...settings, budgetAlerts: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Metas</Label>
              <p className="text-sm text-muted-foreground">
                Alertar sobre progresso de metas
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.goalAlerts}
              onChange={(e) =>
                setSettings({ ...settings, goalAlerts: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Pagamentos Recorrentes</Label>
              <p className="text-sm text-muted-foreground">
                Alertar sobre pagamentos recorrentes próximos
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.recurringPaymentAlerts}
              onChange={(e) =>
                setSettings({ ...settings, recurringPaymentAlerts: e.target.checked })
              }
              className="rounded border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportFrequency">Frequência de Relatórios</Label>
            <Select
              value={settings.reportFrequency}
              onValueChange={(value) =>
                setSettings({ ...settings, reportFrequency: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Diário</SelectItem>
                <SelectItem value="WEEKLY">Semanal</SelectItem>
                <SelectItem value="MONTHLY">Mensal</SelectItem>
                <SelectItem value="NEVER">Nunca</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </CardContent>
    </Card>
  );
}

