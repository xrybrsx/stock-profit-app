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

  it('should choose earliest and shortest interval when profits are equal', async () => {
    // Mock a scenario with equal profits but different durations
    // We need to create a scenario where the algorithm can find multiple pairs with equal profits
    const equalProfitPts: PricePoint[] = [
      { timestamp: '2024-01-01T09:00:00Z', price: 100 }, // buy at 9:00
      { timestamp: '2024-01-01T09:30:00Z', price: 120 }, // sell at 9:30 (30 min, profit=200)
      { timestamp: '2024-01-01T10:00:00Z', price: 100 }, // buy at 10:00 (same price)
      { timestamp: '2024-01-01T11:00:00Z', price: 120 }, // sell at 11:00 (1 hour, profit=200)
      { timestamp: '2024-01-01T12:00:00Z', price: 100 }, // buy at 12:00 (same price)
      { timestamp: '2024-01-01T13:00:00Z', price: 120 }, // sell at 13:00 (1 hour, profit=200)
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfitService,
        {
          provide: PricesService,
          useValue: {
            getChartData: jest.fn().mockResolvedValue(equalProfitPts),
            streamRange: jest.fn().mockImplementation(async function* () {
              for (const p of equalProfitPts) {
                yield await Promise.resolve(p);
              }
            }),
          },
        },
      ],
    }).compile();

    const equalProfitService = module.get<ProfitService>(ProfitService);
    
    const result = await equalProfitService.calculateProfit(
      '2024-01-01T09:00:00Z',
      '2024-01-01T14:00:00Z',
      1000,
    );

    // Should choose the 30-minute interval (9:00 to 9:30) as it's shortest among equal profits
    expect(result.buyTime).toBe('2024-01-01T09:00:00Z');
    expect(result.sellTime).toBe('2024-01-01T09:30:00Z');
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
