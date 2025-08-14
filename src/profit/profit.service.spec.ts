// src/profit/profit.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProfitService } from './profit.service';
import { PricesService } from '../prices/prices.service';
import type { PricePoint } from './data-generator.service';

describe('ProfitService', () => {
  let service: ProfitService;

  // simple 2-point stream for testing
  const pts: PricePoint[] = [
    { timestamp: '2024-01-01T09:00:00Z', price: 100 },
    { timestamp: '2024-01-01T10:00:00Z', price: 120 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitService,
        {
          provide: PricesService,
          useValue: {
            getChartData: jest.fn().mockResolvedValue(pts),
            streamRange: jest.fn().mockImplementation(async function* () {
              for (const p of pts) {
                // ensure async iterator behaviour
                yield await Promise.resolve(p);
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ProfitService>(ProfitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate profit for a simple 2-point stream', async () => {
    const result = await service.calculateProfit(
      '2024-01-01T09:00:00Z',
      '2024-01-01T10:00:00Z',
      1000,
    );

    // buy at 100, sell at 120 ⇒ shares=1000/100=10 ⇒ profit=(120-100)*10=200
    expect(result.buyTime).toBe(pts[0].timestamp);
    expect(result.sellTime).toBe(pts[1].timestamp);
    expect(result.netProfit).toBe(200);
  });

  describe('roundToCents()', () => {
    const cases: Array<[number, number]> = [
      [2.344, 2.34],
      [2.345, 2.35],
      [3.3333, 3.33],
      [5.6789, 5.68],
      [123.456, 123.46],
    ];

    it.each(cases)('rounds %p → %p', (input, expected) => {
      const actual = (service as any).roundToCents(input);
      expect(actual).toBe(expected);
    });
  });
});
