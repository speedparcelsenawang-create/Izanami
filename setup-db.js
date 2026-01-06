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
  console.error('Make sure .env file exists and has VITE_DATABASE_URL');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup...\n');

    // Create Route table
    console.log('📋 Creating Route table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "Route" (
        id BIGSERIAL PRIMARY KEY,
        route TEXT NOT NULL,
        shift TEXT NOT NULL,
        warehouse TEXT NOT NULL,
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Route table created\n');

    // Create Location table
    console.log('📍 Creating Location table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "Location" (
        id SERIAL PRIMARY KEY,
        "routeId" BIGINT NOT NULL REFERENCES "Route"(id) ON DELETE CASCADE,
        location TEXT NOT NULL,
        code TEXT,
        no INTEGER,
        delivery TEXT,
        "powerMode" TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        address TEXT,
        description TEXT,
        images TEXT[] DEFAULT '{}',
        "websiteLink" TEXT,
        "qrCodeImageUrl" TEXT,
        "qrCodeDestinationUrl" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Location table created\n');

    // Create indexes
    console.log('📇 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_location_routeId ON "Location"("routeId")`;
    await sql`CREATE INDEX IF NOT EXISTS idx_route_name ON "Route"(route)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_location_name ON "Location"(location)`;
    console.log('✅ Indexes created\n');

    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
