import { IsString, IsBoolean, IsInt, IsOptional, IsIn, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiProperty({ example: 'BRL', description: 'Moeda padrão', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'DD/MM/YYYY', description: 'Formato de data', required: false })
  @IsString()
  @IsOptional()
  dateFormat?: string;

  @ApiProperty({ example: 'pt-BR', description: 'Formato de número', required: false })
  @IsString()
  @IsOptional()
  numberFormat?: string;

  @ApiProperty({ example: 0, description: 'Primeiro dia da semana (0=Domingo, 1=Segunda)', required: false })
  @IsInt()
  @Min(0)
  @Max(1)
  @IsOptional()
  firstDayOfWeek?: number;

  @ApiProperty({ example: true, description: 'Notificações por email', required: false })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiProperty({ example: true, description: 'Alertas de orçamento', required: false })
  @IsBoolean()
  @IsOptional()
  budgetAlerts?: boolean;

  @ApiProperty({ example: true, description: 'Alertas de metas', required: false })
  @IsBoolean()
  @IsOptional()
  goalAlerts?: boolean;

  @ApiProperty({ example: true, description: 'Alertas de pagamentos recorrentes', required: false })
  @IsBoolean()
  @IsOptional()
  recurringPaymentAlerts?: boolean;

  @ApiProperty({ example: 'MONTHLY', description: 'Frequência de relatórios', required: false })
  @IsString()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'NEVER'])
  @IsOptional()
  reportFrequency?: string;

  @ApiProperty({ example: 'system', description: 'Tema (light, dark, system)', required: false })
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  @IsOptional()
  theme?: string;

  @ApiProperty({ example: 'pt-BR', description: 'Idioma', required: false })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ example: 30, description: 'Timeout de sessão em minutos', required: false })
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  sessionTimeout?: number;

  @ApiProperty({ example: false, description: 'Requer senha para ações sensíveis', required: false })
  @IsBoolean()
  @IsOptional()
  requirePasswordForSensitiveActions?: boolean;
}

