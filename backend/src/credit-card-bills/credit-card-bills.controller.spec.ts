import { Test, TestingModule } from '@nestjs/testing';
import { CreditCardBillsController } from './credit-card-bills.controller';

describe('CreditCardBillsController', () => {
  let controller: CreditCardBillsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditCardBillsController],
    }).compile();

    controller = module.get<CreditCardBillsController>(CreditCardBillsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
