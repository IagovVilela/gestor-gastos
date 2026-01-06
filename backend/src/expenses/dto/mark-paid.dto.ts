import { IsOptional, IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class PaymentDto {
  @ApiProperty({ example: 'uuid-do-banco', description: 'ID do banco usado para pagar parte da despesa' })
  @IsString()
  bankId: string;

  @ApiProperty({ example: 100.50, description: 'Valor a ser pago com este banco' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class MarkPaidDto {
  @ApiProperty({ 
    example: 'uuid-do-banco', 
    description: 'ID do banco usado para pagar a despesa. Se não informado, usa o banco da despesa ou não atualiza saldo.',
    required: false 
  })
  @IsString()
  @IsOptional()
  paymentBankId?: string;

  @ApiProperty({
    type: [PaymentDto],
    description: 'Array de pagamentos parciais para pagamento combinado. Se fornecido, ignora paymentBankId.',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  @IsOptional()
  payments?: PaymentDto[];
}



