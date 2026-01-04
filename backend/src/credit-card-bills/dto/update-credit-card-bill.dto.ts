import { PartialType } from '@nestjs/swagger';
import { CreateCreditCardBillDto } from './create-credit-card-bill.dto';

export class UpdateCreditCardBillDto extends PartialType(CreateCreditCardBillDto) {}

