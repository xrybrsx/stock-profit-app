import { Test, TestingModule } from '@nestjs/testing';
import { PricesService } from './prices.service';

describe('PricesService', () => {
  let service: PricesService;

  // before each test, create a new instance of the PricesService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricesService],
    }).compile();

    // get the instance of the PricesService 
    service = module.get<PricesService>(PricesService);
  });

  // test that the PricesService is defined
  it('should be defined', () => {
    expect(service).toBeDefined(); 
  });
});
