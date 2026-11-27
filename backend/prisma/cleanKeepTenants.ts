import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { clearOperationalDataKeepTenants } from '../src/utils/databaseCleanup';

async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error('❌ Safety abort: pass --confirm to delete all operational data while preserving Tenants & Users.');
    console.error('   Example: npx tsx prisma/cleanKeepTenants.ts --confirm');
    process.exit(1);
  }

  console.log('🧹 Cleaning all operational data (preserving Tenants & Users)...');
  const summary = await clearOperationalDataKeepTenants();
  console.log('✅ Cleanup complete:');
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
