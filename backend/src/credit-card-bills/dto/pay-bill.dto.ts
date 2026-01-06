import { IsArray, ValidateNested, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PaymentPartDto {
  @ApiProperty({ example: 'uuid-do-banco', description: 'ID do banco usado para pagar parte da fatura' })
  @IsString()
  bankId: string;

  @ApiProperty({ example: 500.00, description: 'Valor a ser pago com este banco' })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class PayBillDto {
  @ApiProperty({ 
    type: [PaymentPartDto],
    description: 'Array de pagamentos parciais. Se não fornecido, paga a fatura toda com um único banco.',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentPartDto)
  payments?: PaymentPartDto[];

  @ApiProperty({ 
    example: 'uuid-do-banco', 
    description: 'ID do banco usado para pagar a fatura toda (usado apenas se payments não for fornecido)',
    required: false 
  })
  @IsString()
  @IsOptional()
  paymentBankId?: string;
}


