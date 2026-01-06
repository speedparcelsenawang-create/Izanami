/**
 * Database Configuration
 * PostgreSQL Neon Connection for Production
 */

export const databaseConfig = {
    // Connection URL dari Neon
    url: import.meta.env.VITE_DATABASE_URL,
    
    // Database info
    provider: 'postgresql',
    host: 'ep-weathered-grass-ad6a3l3j-pooler.c-2.us-east-1.aws.neon.tech',
    port: 5432,
    database: 'neondb',
    user: 'neondb_owner',
    
    // Pool settings
    pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    
    // SSL settings (required for Neon)
    ssl: {
        rejectUnauthorized: true,
        sslmode: 'require',
        channel_binding: 'require'
    },
    
    // Connection retry settings
    retryAttempts: 3,
    retryDelay: 3000,
};

export const validateDatabaseConfig = () => {
    if (!databaseConfig.url) {
        throw new Error('DATABASE_URL environment variable is not configured');
    }
    
    console.log('✅ Database configuration loaded');
    console.log('Provider:', databaseConfig.provider);
    console.log('Database:', databaseConfig.database);
    
    return databaseConfig;
};

export default databaseConfig;
