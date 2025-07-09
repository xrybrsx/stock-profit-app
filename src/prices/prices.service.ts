import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs   from 'fs';
import * as path from 'path';

// Define the shape of each entry
interface PricePoint {
  timestamp: string;
  price:     number;
}

@Injectable()
export class PricesService implements OnModuleInit {
  private data: PricePoint[] = [];

  // Called once when the app boots
  onModuleInit() {
    const file = path.join(__dirname, '../data/prices.json');
    if (!fs.existsSync(file)) {
      throw new Error(`Price data not found at ${file}`);
    }
    this.data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  // Return all points
  getAll(): PricePoint[] {
    return this.data;
  }

  // Return only those within start…end
  getRange(start: string, end: string): PricePoint[] {
    return this.data.filter(p => start <= p.timestamp && p.timestamp <= end);
  }
}
