// scripts/generate-data.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataGeneratorService } from '../profit/data-generator.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // 1) Boot Nest so we can inject the DataGeneratorService
  const app = await NestFactory.createApplicationContext(AppModule);
  const generator = app.get(DataGeneratorService);

  // 2) Choose your 3-month window
  const start = '2025-01-01T00:00:00Z';
  const end = '2025-04-01T00:00:00Z';

  // 3) Stream into a file as NDJSON
  const outPath = path.resolve(__dirname, '../data/3mo-prices.ndjson');
  const out = fs.createWriteStream(outPath, { flags: 'w' });

  console.log(`Generating data from ${start} → ${end} into ${outPath}`);
  let count = 0;

  for await (const pt of generator.generatePriceStream(start, end)) {
    out.write(JSON.stringify(pt) + '\n');
    count++;
    // optional: throttle your console logs
    if (count % 1_000_000 === 0) {
      console.log(`  …${count} points generated`);
    }
  }

  out.end(() => {
    console.log(`Done: ${count} points`);
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
