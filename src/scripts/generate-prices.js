import fs from 'fs';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname in ES modules (fix)
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const start = new Date('2025-01-01T10:00:00Z');
const end   = new Date('2025-01-01T11:00:00Z');
const basePrice = 100; // starting stock price
const fluctuation = 0.5; // max +/- 0.5 change in price per second

const data = [];
for (let t = start.getTime(); t <= end.getTime(); t += 1000) {
  const timestamp = new Date(t).toISOString();
  
  // random walk
  const last = data.length
    ? data[data.length - 1].price
    : basePrice;
  // random number (0,1) * 2 - 1 = (-1,1) * 0.5 = (-0.5,0.5)
  const change = (Math.random() * 2 - 1) * fluctuation;
  // add change to last price and round to 2 decimal places (2 decimal places is enough for stock prices)
  const price = parseFloat((last + change).toFixed(2));
  data.push({ timestamp, price });
}

// save to file in data folder
const outPath = join(__dirname, '../data/prices.json');
// create folder if it doesn't exist
mkdirSync(dirname(outPath), { recursive: true });
// write to file with 2 spaces indentation
writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Generated ${data.length} price points to ${outPath}`);
