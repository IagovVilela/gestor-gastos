import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardBillsService } from './credit-card-bills.service';

describe('CreditCardBillsService', () => {
  let service: CreditCardBillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditCardBillsService],
    }).compile();

    service = module.get<CreditCardBillsService>(CreditCardBillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
