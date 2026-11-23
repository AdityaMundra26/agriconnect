// Loads (or removes) the sample demo data. The data itself lives in
// src/services/demoData.js, shared with the "Load sample data" button.
//
//   node db/seed.js            load / refresh demo data
//   node db/seed.js --remove   remove all demo data
//
// Only touches accounts ending in @demo.com. Password for all: demo1234
import 'dotenv/config';
import pg from 'pg';
import { seedDemoData, removeDemoData } from '../src/services/demoData.js';

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const q = (sql, values) => client.query(sql, values);
  try {
    if (process.argv.includes('--remove')) {
      const removed = await removeDemoData(q);
      console.log(`Demo data removed (${removed} demo accounts and everything they owned).`);
      return;
    }
    const started = Date.now();
    const counts = await seedDemoData(q);
    console.log(`Demo data seeded in ${((Date.now() - started) / 1000).toFixed(1)}s:`);
    for (const [k, v] of Object.entries(counts)) console.log(`  ${v} ${k}`);
    console.log('\nLog in with any of these (password: demo1234):');
    console.log('  farmer   farmer@demo.com   (Ravi Kumar, Karnataka - richest demo account)');
    console.log('  buyer    buyer@demo.com    (Anil Sharma, FreshMart)');
    console.log('  admin    admin@demo.com');
    console.log('  also     farmer2-6@demo.com, buyer2-4@demo.com');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
