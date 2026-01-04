'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';

export function ExportSection() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExportJSON = async () => {
    setExporting(true);
    try {
      const response = await api.get('/settings/export');
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gestao-gastos-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'Dados exportados em JSON com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao exportar dados',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/settings/export');
      const data = response.data;

      // Converter para CSV
      let csv = 'Tipo,Descrição,Valor,Data,Categoria\n';

      // Receitas
      data.receipts.forEach((receipt: any) => {
        csv += `Receita,"${receipt.description}",${receipt.amount},"${receipt.date}",${receipt.categoryId || 'Sem categoria'}\n`;
      });

      // Despesas
      data.expenses.forEach((expense: any) => {
        csv += `Despesa,"${expense.description}",${expense.amount},"${expense.date}",${expense.categoryId || 'Sem categoria'}\n`;
      });

      const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gestao-gastos-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'Sucesso',
        description: 'Dados exportados em CSV com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao exportar dados',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          <CardTitle>Exportar Dados</CardTitle>
        </div>
        <CardDescription>
          Exporte seus dados financeiros para backup ou análise
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleExportJSON}
            disabled={exporting}
            variant="outline"
            className="flex-1"
          >
            <FileJson className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            variant="outline"
            className="flex-1"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {exporting
            ? 'Exportando dados...'
            : 'Escolha o formato desejado para exportar seus dados. O JSON inclui todas as informações, enquanto o CSV é ideal para planilhas.'}
        </p>
      </CardContent>
    </Card>
  );
}

