import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AlertType, AlertSeverity } from '@prisma/client';

export class CreateAlertDto {
  @ApiProperty({ example: 'Orçamento excedido', description: 'Título do alerta' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Você ultrapassou o limite de gastos deste mês', description: 'Mensagem do alerta' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ enum: AlertType, example: AlertType.BUDGET_EXCEEDED, description: 'Tipo do alerta' })
  @IsEnum(AlertType)
  @IsNotEmpty()
  type: AlertType;

  @ApiProperty({ enum: AlertSeverity, example: AlertSeverity.WARNING, description: 'Severidade do alerta', required: false })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiProperty({ example: null, description: 'ID da meta relacionada', required: false })
  @IsString()
  @IsOptional()
  relatedGoalId?: string;

  @ApiProperty({ example: null, description: 'ID da categoria relacionada', required: false })
  @IsString()
  @IsOptional()
  relatedCategoryId?: string;
}

