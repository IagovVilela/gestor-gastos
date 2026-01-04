'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FadeIn } from '@/components/animations/fade-in';
import { SlideIn } from '@/components/animations/slide-in';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-4 border-current border-r-transparent"
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <FadeIn delay={0.2}>
          <h1 className="text-4xl font-bold">
            Gestão de Gastos Pessoais
          </h1>
        </FadeIn>
        <SlideIn direction="up" delay={0.4}>
          <p className="text-muted-foreground text-lg">
            Controle suas finanças de forma simples e eficiente
          </p>
        </SlideIn>
        <SlideIn direction="up" delay={0.6}>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button>Entrar</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Criar Conta</Button>
            </Link>
          </div>
        </SlideIn>
      </div>
    </main>
  );
}

