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
  private dataLoaded = false;
  private readonly MAX_CHART_POINTS = 1000; // Limit chart data for performance

  // Called once when the app boots
  onModuleInit() {
    this.loadData();
  }

  private loadData() {
    if (this.dataLoaded) return;
    
    const file = path.join(__dirname, '../data/prices.json');
    if (!fs.existsSync(file)) {
      throw new Error(`Price data not found at ${file}`);
    }
    
    console.log('Loading price data...');
    const startTime = Date.now();
    
    this.data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    
    const loadTime = Date.now() - startTime;
    console.log(`Loaded ${this.data.length} price points in ${loadTime}ms`);
    
    this.dataLoaded = true;
  }

  getMinTimestamp(): string {
    this.loadData();
    return this.data[0].timestamp;
  }
  
  getMaxTimestamp(): string {
    this.loadData();
    return this.data[this.data.length - 1].timestamp;
  }

  // Return all points
  getAll(): PricePoint[] {
    this.loadData();
    return this.data;
  }

  // Return only those within start…end with optional limit
  getRange(start: string, end: string, limit?: number): PricePoint[] {
    this.loadData();
    
    // filter data to only include points within the start and end timestamps
    const filtered = this.data.filter(p => start <= p.timestamp && p.timestamp <= end);
    
    // Apply limit if specified
    if (limit && filtered.length > limit) {
      const step = Math.ceil(filtered.length / limit);
      const sampled: PricePoint[] = [];
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push(filtered[i]);
      }
      return sampled;
    }
    
    return filtered;
  }

  // Optimized method for chart data - returns sampled data for large ranges
  getChartData(start: string, end: string): PricePoint[] {
    this.loadData();

    // filter data to only include points within the start and end timestamps
    const filtered = this.data.filter(p => start <= p.timestamp && p.timestamp <= end); 
    
    // If we have too many points, sample them
    if (filtered.length > this.MAX_CHART_POINTS) {
      const step = Math.ceil(filtered.length / this.MAX_CHART_POINTS);
      const sampled: PricePoint[] = [];
      for (let i = 0; i < filtered.length; i += step) {
        sampled.push(filtered[i]);
      }
      return sampled;
    }
    
    return filtered;
  }

  // Get data statistics for performance monitoring
  getStats() {
    this.loadData();
    return {
      totalPoints: this.data.length,
      dateRange: {
        start: this.data[0].timestamp,
        end: this.data[this.data.length - 1].timestamp
      },
      // get the min and max price
      priceRange: {
        min: Math.min(...this.data.map(p => p.price)),
        max: Math.max(...this.data.map(p => p.price))
      }
    };
  }
}
