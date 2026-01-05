'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalForm } from './goal-form';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Target, TrendingUp, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { Progress } from '@/components/ui/progress';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  type: string;
  isCompleted: boolean;
  imageUrl?: string;
  purchaseLink?: string;
  remainingAmount?: number;
  monthlySavingsNeeded?: number;
  monthsNeeded?: number;
  estimatedCompletionDate?: string;
  monthlySavingsAverage?: number;
  category?: {
    name: string;
  } | null;
}

export function GoalList() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | undefined>();
  const [deletingGoal, setDeletingGoal] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar metas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;

    try {
      await api.delete(`/goals/${deletingGoal}`);
      toast({
        title: 'Sucesso',
        description: 'Meta deletada com sucesso',
      });
      fetchGoals();
      setDeletingGoal(undefined);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao deletar meta',
        variant: 'destructive',
      });
    }
  };

  const handleCalculateProgress = async (goalId: string) => {
    try {
      await api.post(`/goals/${goalId}/calculate-progress`);
      toast({
        title: 'Sucesso',
        description: 'Progresso calculado com sucesso',
      });
      fetchGoals();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao calcular progresso',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SAVINGS':
        return 'Economia';
      case 'EXPENSE_LIMIT':
        return 'Limite de Gastos';
      case 'CATEGORY_LIMIT':
        return 'Limite por Categoria';
      case 'MONTHLY_BUDGET':
        return 'Orçamento Mensal';
      default:
        return type;
    }
  };

  const getProgress = (goal: Goal) => {
    if (goal.targetAmount <= 0) return 0;
    const progress = (Math.max(0, goal.currentAmount) / goal.targetAmount) * 100;
    return Math.min(Math.max(0, progress), 100); // Garantir que está entre 0 e 100
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Metas Financeiras</CardTitle>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Meta
          </Button>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nenhuma meta registrada
              </p>
              <Button onClick={() => setFormOpen(true)} variant="outline">
                Criar primeira meta
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, index) => {
                const progress = getProgress(goal);
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-4 space-y-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Imagem da meta */}
                      {goal.imageUrl && (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border flex-shrink-0 bg-muted">
                          <img
                            src={
                              goal.imageUrl.startsWith('http')
                                ? goal.imageUrl
                                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${goal.imageUrl}`
                            }
                            alt={goal.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-lg">{goal.title}</h3>
                          {goal.isCompleted && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                              Concluída
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {goal.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Tipo: {getTypeLabel(goal.type)}</span>
                          {goal.category && (
                            <span>Categoria: {goal.category.name}</span>
                          )}
                          {goal.deadline && (
                            <span>
                              Prazo:{' '}
                              {format(new Date(goal.deadline), "dd 'de' MMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                        
                        {/* Informações de economia */}
                        {goal.remainingAmount !== undefined && goal.remainingAmount > 0 && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Falta economizar</p>
                                <p className="font-semibold text-lg text-primary">
                                  {formatCurrency(goal.remainingAmount)}
                                </p>
                              </div>
                            </div>
                            
                            {goal.monthlySavingsNeeded && (
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Por mês</p>
                                  <p className="font-semibold">
                                    {formatCurrency(goal.monthlySavingsNeeded)}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {goal.estimatedCompletionDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Previsão</p>
                                  <p className="font-semibold">
                                    {format(new Date(goal.estimatedCompletionDate), "MMM 'de' yyyy", {
                                      locale: ptBR,
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {goal.monthsNeeded && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Tempo estimado</p>
                                  <p className="font-semibold">
                                    {goal.monthsNeeded} {goal.monthsNeeded === 1 ? 'mês' : 'meses'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Link de compra */}
                        {goal.purchaseLink && (
                          <div className="mt-2">
                            <a
                              href={goal.purchaseLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ver onde comprar
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCalculateProgress(goal.id)}
                          title="Recalcular progresso"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingGoal(goal.id);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">
                          {formatCurrency(Math.max(0, goal.currentAmount))} /{' '}
                          {formatCurrency(goal.targetAmount)} ({progress.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GoalForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingGoal(undefined);
        }}
        onSuccess={() => {
          fetchGoals();
          setFormOpen(false);
          setEditingGoal(undefined);
        }}
        goalId={editingGoal}
      />

      <AlertDialog
        open={!!deletingGoal}
        onOpenChange={(open) => !open && setDeletingGoal(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

