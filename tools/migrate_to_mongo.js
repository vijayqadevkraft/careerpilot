import { migrateCsvToMongo, isMongoConfigured } from './db.js';

console.log('====================================================');
console.log('   CareerPilot AI - CSV to MongoDB Atlas Migration   ');
console.log('====================================================');

if (!isMongoConfigured()) {
  console.error('\n[ERROR] MONGODB_URI is not set in your environment variables.');
  console.log('Usage:');
  console.log('  Windows PowerShell:');
  console.log('    $env:MONGODB_URI="mongodb+srv://user:pass@cluster0...mongodb.net/?retryWrites=true&w=majority"');
  console.log('    node tools/migrate_to_mongo.js\n');
  console.log('  Linux/Mac:');
  console.log('    MONGODB_URI="mongodb+srv://user:pass@..." node tools/migrate_to_mongo.js\n');
  process.exit(1);
}

try {
  const result = await migrateCsvToMongo();
  console.log('\n[SUCCESS] Migration Complete!');
  console.log(`Total CSV Jobs: ${result.total}`);
  console.log(`Newly Inserted: ${result.upserted}`);
  console.log(`Existing Matched/Updated: ${result.matched}`);
  console.log('Your MongoDB Atlas collection is now synchronized.\n');
  process.exit(0);
} catch (err) {
  console.error('\n[FAILED] Migration error:', err.message);
  process.exit(1);
}
