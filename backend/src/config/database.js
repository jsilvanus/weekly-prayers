import pg from 'pg';

const { Pool } = pg;

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'prayers',
  password: process.env.DB_PASSWORD || 'prayers_secret',
  database: process.env.DB_NAME || 'weekly_prayers',
  max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

pool.on('connect', () => {
  console.log('Database pool: new client connected');
});

export const query = (text, params) => pool.query(text, params);

export const getClient = () => pool.connect();

export const checkConnection = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    return { connected: true, timestamp: result.rows[0].now };
  } finally {
    client.release();
  }
};

export default pool;
