'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/fade-in';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Alert {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
  relatedGoalId?: string | null;
  relatedCategoryId?: string | null;
}

export function AlertList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [deletingAlert, setDeletingAlert] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    fetchUnreadCount();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      const params: any = {};
      if (filter === 'read') {
        params.isRead = 'true';
      } else if (filter === 'unread') {
        params.isRead = 'false';
      }

      const response = await api.get('/alerts', { params });
      setAlerts(response.data);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao carregar alertas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/alerts/unread/count');
      setUnreadCount(response.data);
    } catch (error) {
      // Ignorar erro silenciosamente
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);
      toast({
        title: 'Sucesso',
        description: 'Alerta marcado como lido',
      });
      fetchAlerts();
      fetchUnreadCount();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao marcar alerta como lido',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/alerts/read-all');
      toast({
        title: 'Sucesso',
        description: 'Todos os alertas foram marcados como lidos',
      });
      fetchAlerts();
      fetchUnreadCount();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao marcar alertas como lidos',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingAlert) return;

    try {
      await api.delete(`/alerts/${deletingAlert}`);
      toast({
        title: 'Sucesso',
        description: 'Alerta deletado com sucesso',
      });
      fetchAlerts();
      fetchUnreadCount();
      setDeletingAlert(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar alerta',
        variant: 'destructive',
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'ERROR':
        return <Badge variant="destructive">Erro</Badge>;
      case 'WARNING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Aviso</Badge>;
      case 'SUCCESS':
        return <Badge variant="outline" className="border-green-500 text-green-500">Sucesso</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      BUDGET_EXCEEDED: 'Orçamento Excedido',
      GOAL_ACHIEVED: 'Meta Alcançada',
      GOAL_WARNING: 'Aviso de Meta',
      CATEGORY_LIMIT: 'Limite de Categoria',
      RECURRING_PAYMENT: 'Pagamento Recorrente',
      SYSTEM: 'Sistema',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} não lidos
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unread">Não lidos</SelectItem>
                  <SelectItem value="read">Lidos</SelectItem>
                </SelectContent>
              </Select>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todos como lidos
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? 'Nenhum alerta não lido'
                  : filter === 'read'
                  ? 'Nenhum alerta lido'
                  : 'Nenhum alerta encontrado'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <FadeIn key={alert.id} delay={index * 0.05}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className={`border rounded-lg p-4 ${
                      alert.isRead
                        ? 'bg-muted/50 border-muted'
                        : 'bg-background border-primary/20 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">{getSeverityIcon(alert.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className={`font-semibold ${
                                alert.isRead ? 'text-muted-foreground' : ''
                              }`}
                            >
                              {alert.title}
                            </h4>
                            {getSeverityBadge(alert.severity)}
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(alert.type)}
                            </Badge>
                          </div>
                          <p
                            className={`text-sm ${
                              alert.isRead ? 'text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.createdAt), "dd 'de' MMMM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(alert.id)}
                            title="Marcar como lido"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingAlert(alert.id)}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deletingAlert !== undefined}
        onOpenChange={(open) => !open && setDeletingAlert(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este alerta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

