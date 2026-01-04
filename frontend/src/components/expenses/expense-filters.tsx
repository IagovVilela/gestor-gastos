'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { debounce } from '@/lib/debounce';

interface ExpenseFiltersProps {
  onFilterChange: (filters: ExpenseFilters) => void;
  categories: Array<{ id: string; name: string }>;
}

export interface ExpenseFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  isFixed?: boolean;
  isRecurring?: boolean;
}

export function ExpenseFilters({ onFilterChange, categories }: ExpenseFiltersProps) {
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof ExpenseFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: ExpenseFilters = {};
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const applyQuickFilter = (type: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case 'thisMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    const newFilters = {
      ...filters,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Busca e Filtros Rápidos */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter('thisMonth')}
              >
                Este Mês
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickFilter('lastMonth')}
              >
                Mês Passado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {showAdvanced ? 'Menos' : 'Mais'}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros Avançados */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) =>
                    handleFilterChange('startDate', e.target.value || undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) =>
                    handleFilterChange('endDate', e.target.value || undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={filters.categoryId || ''}
                  onValueChange={(value) =>
                    handleFilterChange('categoryId', value || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={
                    filters.isFixed === true
                      ? 'fixed'
                      : filters.isFixed === false
                      ? 'variable'
                      : filters.isRecurring === true
                      ? 'recurring'
                      : filters.isRecurring === false
                      ? 'non-recurring'
                      : ''
                  }
                  onValueChange={(value) => {
                    if (value === 'fixed') {
                      handleFilterChange('isFixed', true);
                      handleFilterChange('isRecurring', undefined);
                    } else if (value === 'variable') {
                      handleFilterChange('isFixed', false);
                      handleFilterChange('isRecurring', undefined);
                    } else if (value === 'recurring') {
                      handleFilterChange('isRecurring', true);
                      handleFilterChange('isFixed', undefined);
                    } else if (value === 'non-recurring') {
                      handleFilterChange('isRecurring', false);
                      handleFilterChange('isFixed', undefined);
                    } else {
                      handleFilterChange('isFixed', undefined);
                      handleFilterChange('isRecurring', undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os tipos</SelectItem>
                    <SelectItem value="fixed">Fixos</SelectItem>
                    <SelectItem value="variable">Variáveis</SelectItem>
                    <SelectItem value="recurring">Recorrentes</SelectItem>
                    <SelectItem value="non-recurring">Não recorrentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

