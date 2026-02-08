import { Pool, PoolConfig } from 'pg';
import { config } from './index';

// PostgreSQL connection pool configuration
const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20,                    // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection fails
};

// Create the connection pool
export const pool = new Pool(poolConfig);

// Test the connection
pool.on('connect', () => {
  console.log('📦 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

// Helper function to execute queries
export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (config.logLevel === 'debug') {
    console.log(`📝 Query executed in ${duration}ms:`, { text: text.substring(0, 100) });
  }
  
  return result.rows as T[];
}

// Helper function for single row queries
export async function queryOne<T>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('📦 PostgreSQL pool closed');
}

export default pool;
