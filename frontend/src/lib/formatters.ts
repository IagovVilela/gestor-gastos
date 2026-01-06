/**
 * Utilitários de formatação compartilhados
 */

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata um valor numérico como moeda brasileira sem decimais
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata uma porcentagem
 */
export function formatPercentage(value: number, showSign: boolean = true): string {
  const sign = showSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Formata um número com separadores de milhar
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/**
 * Converte uma string de data (yyyy-MM-dd) para ISO string preservando o dia local
 * Evita problemas de timezone onde a data pode ser deslocada em 1 dia
 * 
 * Quando você faz `new Date('2026-01-06')`, o JavaScript interpreta como UTC meia-noite,
 * o que pode resultar em um dia anterior em timezones negativos (ex: UTC-3 no Brasil).
 * 
 * Esta função simplesmente retorna a data como meia-noite UTC do dia especificado,
 * sem fazer conversões de timezone que possam alterar o dia.
 * 
 * @param dateString - String no formato 'yyyy-MM-dd' ou 'yyyy-MM-ddTHH:mm:ss'
 * @returns String ISO no formato 'yyyy-MM-ddTHH:mm:ss.sssZ' preservando o dia
 */
export function dateToISOString(dateString: string): string {
  // Se a string já contém hora, extrair apenas a parte da data
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  
  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    // Se não estiver no formato esperado, tentar converter normalmente
    return new Date(dateString).toISOString();
  }
  
  // Retornar como meia-noite UTC do dia especificado
  // Isso garante que o backend receba exatamente o dia que o usuário selecionou
  // sem conversões de timezone que possam alterar o dia
  return `${dateOnly}T00:00:00.000Z`;
}

