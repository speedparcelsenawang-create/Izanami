import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Simple .env parser
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          envVars[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('❌ Failed to load .env file:', error.message);
    return {};
  }
}

const envVars = loadEnv();
const DATABASE_URL = envVars.VITE_DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env or environment variables');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigration() {
  try {
    console.log('🚀 Running migration: Change routeId to BIGINT...\n');

    // First, check current data types
    console.log('📊 Current column types:');
    const beforeTypes = await sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_name IN ('Route', 'Location')
        AND column_name IN ('id', 'routeId')
      ORDER BY table_name, column_name
    `;
    console.table(beforeTypes);

    // Change the routeId column type in Location table
    console.log('\n🔄 Changing Location.routeId from INTEGER to BIGINT...');
    await sql`ALTER TABLE "Location" ALTER COLUMN "routeId" TYPE BIGINT`;
    console.log('✅ Location.routeId updated to BIGINT');

    // Change the id column type in Route table
    console.log('\n🔄 Changing Route.id from INTEGER to BIGINT...');
    await sql`ALTER TABLE "Route" ALTER COLUMN "id" TYPE BIGINT`;
    console.log('✅ Route.id updated to BIGINT');

    // Verify the changes
    console.log('\n📊 Updated column types:');
    const afterTypes = await sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_name IN ('Route', 'Location')
        AND column_name IN ('id', 'routeId')
      ORDER BY table_name, column_name
    `;
    console.table(afterTypes);

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
