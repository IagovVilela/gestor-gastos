'use client';

import { AuthGuard } from '@/components/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { CategoryList } from '@/components/categories/category-list';

export default function CategoriesPage() {
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie suas categorias e subcategorias
            </p>
          </div>

          <CategoryList />
        </div>
      </MainLayout>
    </AuthGuard>
  );
}

