'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Wallet, Star } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { FadeIn } from '@/components/animations/fade-in';
import { StaggerContainer, StaggerItem } from '@/components/animations/stagger-container';
import { HoverScale } from '@/components/animations/hover-scale';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Bank {
  id: string;
  name: string;
  type?: string;
  balance: number;
  isPrimary: boolean;
  color?: string;
}

const bankTypeLabels: Record<string, string> = {
  SALARY_ACCOUNT: 'Conta Salário',
  CURRENT_ACCOUNT: 'Conta Corrente',
  SAVINGS_ACCOUNT: 'Conta Poupança',
  INVESTMENT: 'Conta Investimento',
  CREDIT_CARD: 'Cartão de Crédito',
  DIGITAL_WALLET: 'Carteira Digital',
  OTHER: 'Outros',
};

export function BankBalances() {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBanks();
    fetchTotalBalance();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await api.get('/banks');
      setBanks(response.data);
    } catch (error) {
      console.error('Erro ao carregar bancos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalBalance = async () => {
    try {
      const response = await api.get('/banks/total-balance');
      setTotalBalance(response.data.total);
    } catch (error) {
      console.error('Erro ao carregar saldo total:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (banks.length === 0) {
    return (
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-2xl font-bold mb-2">{formatCurrency(0)}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Nenhum banco cadastrado
              </p>
              <button
                onClick={() => router.push('/banks')}
                className="text-sm text-primary hover:underline"
              >
                Criar primeiro banco →
              </button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Soma de todos os bancos
            </p>
          </CardContent>
        </Card>

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank, index) => (
            <StaggerItem key={bank.id}>
              <HoverScale>
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push('/banks')}
                  style={{
                    borderLeftColor: bank.color || '#8B5CF6',
                    borderLeftWidth: '4px',
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building2
                        className="h-4 w-4"
                        style={{ color: bank.color || '#8B5CF6' }}
                      />
                      <div>
                        <div>{bank.name}</div>
                        {bank.type && (
                          <div className="text-xs text-muted-foreground font-normal">
                            {bankTypeLabels[bank.type] || bank.type}
                          </div>
                        )}
                      </div>
                    </CardTitle>
                    {bank.isPrimary && (
                      <Badge variant="default" className="bg-yellow-500">
                        <Star className="h-3 w-3 mr-1" />
                        Principal
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(bank.balance)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Saldo atual
                    </p>
                  </CardContent>
                </Card>
              </HoverScale>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
}

