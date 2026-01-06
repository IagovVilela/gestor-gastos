/**
 * Utilitários para manipulação de datas
 * Resolve problemas de timezone onde datas podem ser deslocadas em 1 dia
 */

/**
 * Converte uma string de data ISO para Date preservando o dia
 * 
 * Quando você recebe '2026-01-06T00:00:00.000Z' e faz new Date(),
 * dependendo do timezone do servidor, pode resultar em um dia diferente.
 * 
 * Esta função extrai apenas a parte da data (yyyy-MM-dd) e cria uma Date
 * no timezone local do servidor, garantindo que o dia seja preservado.
 * 
 * @param dateString - String ISO no formato 'yyyy-MM-ddTHH:mm:ss.sssZ' ou 'yyyy-MM-dd'
 * @returns Date preservando o dia especificado
 */
export function parseDatePreservingDay(dateString: string): Date {
  // Extrair apenas a parte da data (sem hora)
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  
  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    // Se não estiver no formato esperado, tentar converter normalmente
    return new Date(dateString);
  }
  
  // Criar data no timezone local do servidor preservando o dia
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  // Criar data local (não UTC) - isso garante que '2026-01-06' permaneça como 06
  // Usar meio-dia para evitar problemas de horário de verão (DST)
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Converte uma string de data ISO para Date preservando o dia (versão para meia-noite)
 * Útil quando você precisa de meia-noite local, não meio-dia
 * 
 * @param dateString - String ISO no formato 'yyyy-MM-ddTHH:mm:ss.sssZ' ou 'yyyy-MM-dd'
 * @returns Date preservando o dia especificado, com hora 00:00:00 no timezone local
 */
export function parseDateAtMidnight(dateString: string): Date {
  // Extrair apenas a parte da data (sem hora)
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  
  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    // Se não estiver no formato esperado, tentar converter normalmente
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  
  // Criar data no timezone local do servidor preservando o dia
  const [year, month, day] = dateOnly.split('-').map(Number);
  
  // Criar data local (não UTC) com meia-noite
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
}


