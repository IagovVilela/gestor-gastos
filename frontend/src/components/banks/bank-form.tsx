'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const bankTypeEnum = z.enum([
  'SALARY_ACCOUNT',
  'CURRENT_ACCOUNT',
  'SAVINGS_ACCOUNT',
  'INVESTMENT',
  'CREDIT_CARD',
  'DIGITAL_WALLET',
  'OTHER',
]);

const bankSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: bankTypeEnum.optional(),
  balance: z.number().min(0, 'Saldo não pode ser negativo').optional(),
  isPrimary: z.boolean().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  // Campos específicos para contas poupança
  savingsName: z.string().optional(),
  savingsDescription: z.string().optional(),
  savingsGoalId: z.string().optional(),
  existingSavingsAccountId: z.string().optional(),
});

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

type BankFormData = z.infer<typeof bankSchema>;

interface BankFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bankId?: string;
}

export function BankForm({ open, onOpenChange, onSuccess, bankId }: BankFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<Array<{ id: string; title: string }>>([]);
  const [savingsAccounts, setSavingsAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [savingsOption, setSavingsOption] = useState<'new' | 'existing' | 'general'>('new');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      name: '',
      type: 'CURRENT_ACCOUNT',
      balance: 0,
      isPrimary: false,
      color: '#8B5CF6',
      icon: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (bankId) {
        fetchBank();
      } else {
        reset({
          name: '',
          type: 'CURRENT_ACCOUNT',
          balance: 0,
          isPrimary: false,
          color: '#8B5CF6',
          icon: '',
        savingsName: '',
        savingsDescription: '',
        savingsGoalId: undefined,
        existingSavingsAccountId: undefined,
      });
      setSavingsOption('new');
      }
    }
  }, [open, bankId, reset]);

  // Buscar poupanças e metas quando o tipo mudar para SAVINGS_ACCOUNT
  const accountType = watch('type');
  useEffect(() => {
    if (open && accountType === 'SAVINGS_ACCOUNT') {
      fetchGoals();
      fetchSavingsAccounts();
    }
  }, [open, accountType]);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/goals');
      setGoals(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const fetchSavingsAccounts = async () => {
    try {
      console.log('Buscando poupanças...');
      const response = await api.get('/savings-accounts');
      console.log('Resposta completa do endpoint:', response);
      console.log('response.data:', response.data);
      
      // O endpoint retorna { savingsAccounts: [], totalAmount: number, count: number }
      let data: Array<{ id: string; name: string }> = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          // Se for array direto
          data = response.data.map((item: any) => ({ id: item.id, name: item.name }));
        } else if (response.data.savingsAccounts && Array.isArray(response.data.savingsAccounts)) {
          // Se for objeto com savingsAccounts (formato correto)
          data = response.data.savingsAccounts.map((item: any) => ({ id: item.id, name: item.name }));
        } else if (Array.isArray(response.data.data)) {
          // Se for objeto com data
          data = response.data.data.map((item: any) => ({ id: item.id, name: item.name }));
        }
      }
      
      console.log('Poupanças extraídas:', data);
      console.log('Quantidade de poupanças:', data.length);
      setSavingsAccounts(data);
    } catch (error: any) {
      console.error('Erro ao carregar poupanças:', error);
      console.error('Status do erro:', error.response?.status);
      console.error('Detalhes do erro:', error.response?.data);
      setSavingsAccounts([]);
    }
  };

  const fetchBank = async () => {
    try {
      const response = await api.get(`/banks/${bankId}`);
      const bank = response.data;
      
      // Verificar se tem poupança associada
      const associatedSavings = bank.savingsAccounts && bank.savingsAccounts.length > 0 
        ? bank.savingsAccounts[0] 
        : null;

      reset({
        name: bank.name,
        type: bank.type || 'CURRENT_ACCOUNT',
        balance: Number(bank.balance),
        isPrimary: bank.isPrimary,
        color: bank.color || '#8B5CF6',
        icon: bank.icon || '',
        savingsName: '',
        savingsDescription: '',
        savingsGoalId: undefined,
        existingSavingsAccountId: associatedSavings?.id,
      });

      // Se tem poupança associada, definir a opção correta
      if (bank.type === 'SAVINGS_ACCOUNT') {
        if (associatedSavings) {
          setSavingsOption('existing');
          // Buscar poupanças para garantir que está na lista
          fetchSavingsAccounts();
        } else {
          setSavingsOption('general');
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar banco',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: BankFormData) => {
    setLoading(true);
    let payload: any = {};
    
    try {
      if (bankId) {
        // Para UPDATE: campos básicos do banco + campos de poupança se for conta poupança
        payload = {
          name: data.name,
          type: data.type || 'CURRENT_ACCOUNT',
          balance: data.balance || 0,
          isPrimary: data.isPrimary || false,
        };

        // Adicionar campos opcionais apenas se tiverem valores
        if (data.color) payload.color = data.color;
        if (data.icon) payload.icon = data.icon;

        // Campos específicos para contas poupança (apenas no UPDATE se tipo for SAVINGS_ACCOUNT)
        if (data.type === 'SAVINGS_ACCOUNT') {
          // Se for associar a poupança existente
          if (savingsOption === 'existing' && data.existingSavingsAccountId) {
            payload.existingSavingsAccountId = data.existingSavingsAccountId;
          }
          // Se for saldo geral ou não especificou, não envia existingSavingsAccountId
        }

        await api.patch(`/banks/${bankId}`, payload);
        toast({
          title: 'Sucesso',
          description: 'Banco atualizado com sucesso',
        });
      } else {
        // Para CREATE: incluir campos de poupança se necessário
        payload = {
          name: data.name,
          type: data.type || 'CURRENT_ACCOUNT',
          balance: data.balance || 0,
          isPrimary: data.isPrimary || false,
        };

        // Adicionar campos opcionais apenas se tiverem valores
        if (data.color) payload.color = data.color;
        if (data.icon) payload.icon = data.icon;

        // Campos específicos para contas poupança (apenas no CREATE)
        if (data.type === 'SAVINGS_ACCOUNT') {
          // Se for associar a poupança existente
          if (savingsOption === 'existing' && data.existingSavingsAccountId) {
            payload.existingSavingsAccountId = data.existingSavingsAccountId;
          }
          // Se for criar nova poupança
          else if (savingsOption === 'new') {
            if (data.savingsName) payload.savingsName = data.savingsName;
            if (data.savingsDescription) payload.savingsDescription = data.savingsDescription;
            if (data.savingsGoalId) payload.savingsGoalId = data.savingsGoalId;
          }
          // Se for saldo geral, não envia nenhum campo de poupança
        }

        await api.post('/banks', payload);
        toast({
          title: 'Sucesso',
          description: 'Banco criado com sucesso',
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar banco:', error);
      console.error('Payload enviado:', payload);
      console.error('Resposta do servidor:', error.response?.data);
      toast({
        title: 'Erro',
        description: error.response?.data?.message?.[0] || error.response?.data?.message || 'Erro ao salvar banco',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#6366F1', // Indigo
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col w-[95vw] sm:w-full">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{bankId ? 'Editar Banco' : 'Novo Banco'}</DialogTitle>
          <DialogDescription>
            {bankId
              ? 'Atualize as informações do banco'
              : 'Adicione um novo banco para gerenciar seus saldos'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Banco *</Label>
            <Input
              id="name"
              placeholder="Ex: Nubank, Banco do Brasil"
              {...register('name')}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Conta</Label>
            <Select
              value={watch('type') || 'CURRENT_ACCOUNT'}
              onValueChange={(value) => setValue('type', value as any)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de conta" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(bankTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Inicial</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('balance', { valueAsNumber: true })}
              disabled={loading}
            />
            {errors.balance && (
              <p className="text-sm text-destructive">{errors.balance.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    watch('color') === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                />
              ))}
            </div>
            <Input
              id="color"
              type="text"
              placeholder="#8B5CF6"
              {...register('color')}
              disabled={loading}
              className="mt-2"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPrimary"
              checked={watch('isPrimary')}
              onCheckedChange={(checked) => setValue('isPrimary', checked)}
              disabled={loading}
            />
            <Label htmlFor="isPrimary">Banco Principal</Label>
          </div>

          {/* Campos específicos para Conta Poupança */}
          {watch('type') === 'SAVINGS_ACCOUNT' && (
            <>
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>O que fazer com o saldo desta conta?</Label>
                  <Select
                    value={savingsOption}
                    onValueChange={(value: 'new' | 'existing' | 'general') => {
                      setSavingsOption(value);
                      if (value === 'existing') {
                        setValue('savingsName', undefined);
                        setValue('savingsDescription', undefined);
                        setValue('savingsGoalId', undefined);
                      } else if (value === 'general') {
                        setValue('savingsName', undefined);
                        setValue('savingsDescription', undefined);
                        setValue('savingsGoalId', undefined);
                        setValue('existingSavingsAccountId', undefined);
                      } else {
                        setValue('existingSavingsAccountId', undefined);
                      }
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Criar nova poupança</SelectItem>
                      <SelectItem value="existing">Associar a poupança existente</SelectItem>
                      <SelectItem value="general">Adicionar ao saldo geral da poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {savingsOption === 'existing' && (
                  <div className="space-y-2">
                    <Label htmlFor="existingSavingsAccountId">Selecionar Poupança</Label>
                    <Select
                      value={watch('existingSavingsAccountId') || 'none'}
                      onValueChange={(value) => setValue('existingSavingsAccountId', value === 'none' ? undefined : value)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma poupança" />
                      </SelectTrigger>
                      <SelectContent>
                        {savingsAccounts.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhuma poupança disponível
                          </SelectItem>
                        ) : (
                          savingsAccounts.map((savings) => (
                            <SelectItem key={savings.id} value={savings.id}>
                              {savings.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O saldo desta conta será adicionado à poupança selecionada
                    </p>
                  </div>
                )}

                {savingsOption === 'new' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="savingsName">Nome da Poupança</Label>
                      <Input
                        id="savingsName"
                        placeholder="Ex: Reserva de Emergência"
                        {...register('savingsName')}
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Se não informado, será usado: &quot;{watch('name')} - Poupança&quot;
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="savingsDescription">Descrição da Poupança (opcional)</Label>
                      <Input
                        id="savingsDescription"
                        placeholder="Ex: Poupança para emergências médicas"
                        {...register('savingsDescription')}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="savingsGoalId">Associar a uma Meta (opcional)</Label>
                      <Select
                        value={watch('savingsGoalId') || 'none'}
                        onValueChange={(value) => setValue('savingsGoalId', value === 'none' ? undefined : value)}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma meta (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma meta</SelectItem>
                          {goals.map((goal) => (
                            <SelectItem key={goal.id} value={goal.id}>
                              {goal.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        O valor desta conta será direcionado para a poupança associada à meta selecionada
                      </p>
                    </div>
                  </>
                )}

                {savingsOption === 'general' && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      O saldo desta conta será adicionado ao saldo total das poupanças, sem criar ou associar a nenhuma poupança específica.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          </div>
          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : bankId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

