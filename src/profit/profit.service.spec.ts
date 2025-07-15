import { Test, TestingModule } from '@nestjs/testing';
import { ProfitService } from './profit.service';
import { PricesService } from '../prices/prices.service';

describe('ProfitService', () => {
  let service: ProfitService;
  let pricesService: PricesService;

  // before each test, create a new instance of the ProfitService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitService,
        {
          provide: PricesService,
          useValue: {
            getRange: () => [
              { timestamp: '2024-01-01T09:00:00Z', price: 100 },
              { timestamp: '2024-01-01T10:00:00Z', price: 120 },
            ],
            getChartData: () => [],
            getAll: () => [
              { timestamp: '2024-01-01T09:00:00Z', price: 100 },
              { timestamp: '2024-01-01T10:00:00Z', price: 120 },
            ],
          },
        },
      ],
    }).compile();

    service = module.get<ProfitService>(ProfitService);
    pricesService = module.get<PricesService>(PricesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // test that the profit service can calculate profit for a simple case
  it('should calculate profit for a simple case', () => {
    const result = service.calculateProfit(
      '2024-01-01T09:00:00Z',
      '2024-01-01T10:00:00Z',
      1000
    );
    // test that the result has the expected properties
    expect(result).toHaveProperty('buyTime');
    expect(result).toHaveProperty('sellTime');
    expect(result.netProfit).toBeGreaterThan(0);
  });
}); 