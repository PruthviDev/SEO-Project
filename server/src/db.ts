/**
 * AuditPulse Database Layer
 * Dual-driver: PostgreSQL (pg) when DATABASE_URL is configured,
 * with full local JSON file persistence fallback (data/auditpulse_db.json).
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';

export class UsageLimitExceededError extends Error {
  readonly statusCode = 429;
  constructor(message = 'Daily call limit exceeded for this user account.') {
    super(message);
    this.name = 'UsageLimitExceededError';
  }
}

export class BudgetExceededError extends Error {
  readonly statusCode = 429;
  constructor(message = 'Daily global budget limit reached for DataForSEO calls.') {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export interface ProviderCacheRecord {
  cache_key: string;
  endpoint: string;
  response: any;
  created_at: string;
  expires_at: string;
}

export interface ProviderUsageRecord {
  user_id: string;
  day: string; // YYYY-MM-DD
  calls: number;
  cost_usd: number;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: string;
}

interface JsonDatabaseSchema {
  users: UserRecord[];
  provider_cache: ProviderCacheRecord[];
  provider_usage: ProviderUsageRecord[];
  projects: any[];
}

const DATABASE_URL = process.env.DATABASE_URL;
let pgPool: pg.Pool | null = null;

// JSON fallback path
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_JSON_PATH = path.join(DATA_DIR, 'auditpulse_db.json');

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Ensure data folder and json file exist for JSON fallback
function initJsonDb(): JsonDatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_JSON_PATH)) {
      const initial: JsonDatabaseSchema = {
        users: [
          {
            id: 'usr_demo',
            email: 'demo@auditpulse.io',
            password_hash: 'demo_token_hash',
            role: 'user',
            created_at: new Date().toISOString(),
          },
        ],
        provider_cache: [],
        provider_usage: [],
        projects: [],
      };
      fs.writeFileSync(DB_JSON_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = JSON.parse(fs.readFileSync(DB_JSON_PATH, 'utf-8'));
    return data;
  } catch (err) {
    console.warn('Fallback JSON db read error, using in-memory state:', err);
    return {
      users: [],
      provider_cache: [],
      provider_usage: [],
      projects: [],
    };
  }
}

function writeJsonDb(data: JsonDatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write JSON fallback db:', err);
  }
}

/**
 * Initialize PostgreSQL tables if PostgreSQL is available
 */
export async function initDb(): Promise<void> {
  if (DATABASE_URL) {
    try {
      pgPool = new pg.Pool({ connectionString: DATABASE_URL });
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS provider_cache (
          cache_key TEXT PRIMARY KEY,
          endpoint TEXT NOT NULL,
          response JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE TABLE IF NOT EXISTS provider_usage (
          user_id TEXT NOT NULL,
          day DATE NOT NULL,
          calls INT NOT NULL DEFAULT 0,
          cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
          PRIMARY KEY (user_id, day)
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          domain TEXT NOT NULL,
          url TEXT NOT NULL,
          data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      console.log('PostgreSQL database connected and initialized.');
      return;
    } catch (err) {
      console.warn('Could not connect to PostgreSQL. Falling back to local JSON database.', err);
      pgPool = null;
    }
  }

  // Fallback mode
  initJsonDb();
}

/**
 * Cache operations
 */
export async function getProviderCache(cacheKey: string): Promise<any | null> {
  const now = new Date();

  if (pgPool) {
    try {
      const res = await pgPool.query(
        'SELECT response, expires_at FROM provider_cache WHERE cache_key = $1',
        [cacheKey]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (new Date(row.expires_at) > now) {
          return row.response;
        }
      }
      return null;
    } catch (err) {
      console.error('PostgreSQL getProviderCache error:', err);
    }
  }

  // JSON fallback
  const db = initJsonDb();
  const entry = db.provider_cache.find((c) => c.cache_key === cacheKey);
  if (entry && new Date(entry.expires_at) > now) {
    return entry.response;
  }
  return null;
}

export async function setProviderCache(
  cacheKey: string,
  endpoint: string,
  response: any,
  ttlSeconds: number
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO provider_cache (cache_key, endpoint, response, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cache_key) DO UPDATE
         SET response = EXCLUDED.response, expires_at = EXCLUDED.expires_at`,
        [cacheKey, endpoint, JSON.stringify(response), now, expiresAt]
      );
      return;
    } catch (err) {
      console.error('PostgreSQL setProviderCache error:', err);
    }
  }

  // JSON fallback
  const db = initJsonDb();
  const index = db.provider_cache.findIndex((c) => c.cache_key === cacheKey);
  const record: ProviderCacheRecord = {
    cache_key: cacheKey,
    endpoint,
    response,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  if (index >= 0) {
    db.provider_cache[index] = record;
  } else {
    db.provider_cache.push(record);
  }
  writeJsonDb(db);
}

/**
 * Usage tracking & budget guard operations
 */
export async function checkAndRecordUsage(
  userId: string,
  costToRecord?: number
): Promise<{ userCalls: number; userCost: number; globalCost: number }> {
  const today = getTodayString();
  const maxUserCalls = parseInt(process.env.DFS_DAILY_CALLS_PER_USER || '30', 10);
  const maxGlobalBudget = parseFloat(process.env.DFS_DAILY_BUDGET_USD || '5');

  let userCalls = 0;
  let userCost = 0;
  let globalCost = 0;

  if (pgPool) {
    try {
      // Query user's current day usage
      const userRes = await pgPool.query(
        'SELECT calls, cost_usd FROM provider_usage WHERE user_id = $1 AND day = $2',
        [userId, today]
      );
      if (userRes.rows.length > 0) {
        userCalls = Number(userRes.rows[0].calls) || 0;
        userCost = Number(userRes.rows[0].cost_usd) || 0;
      }

      // Query global day cost
      const globalRes = await pgPool.query(
        'SELECT SUM(cost_usd) as total_cost FROM provider_usage WHERE day = $1',
        [today]
      );
      if (globalRes.rows.length > 0 && globalRes.rows[0].total_cost !== null) {
        globalCost = Number(globalRes.rows[0].total_cost) || 0;
      }
    } catch (err) {
      console.error('PostgreSQL usage check error:', err);
    }
  } else {
    // JSON fallback
    const db = initJsonDb();
    const userRow = db.provider_usage.find((u) => u.user_id === userId && u.day === today);
    if (userRow) {
      userCalls = userRow.calls;
      userCost = Number(userRow.cost_usd);
    }
    globalCost = db.provider_usage
      .filter((u) => u.day === today)
      .reduce((sum, u) => sum + Number(u.cost_usd), 0);
  }

  // Pre-call validation (when checking before a call is made)
  if (costToRecord === undefined) {
    if (userCalls >= maxUserCalls) {
      throw new UsageLimitExceededError(
        `Daily DataForSEO call limit exceeded for this user account (limit: ${maxUserCalls} calls/day, used: ${userCalls}).`
      );
    }
    if (globalCost >= maxGlobalBudget) {
      throw new BudgetExceededError(
        `Global daily DataForSEO budget reached ($${maxGlobalBudget.toFixed(2)} USD). Please try again tomorrow.`
      );
    }
    return { userCalls, userCost, globalCost };
  }

  // Recording usage after a paid call completes
  const cost = Number(costToRecord || 0);
  userCalls += 1;
  userCost += cost;
  globalCost += cost;

  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO provider_usage (user_id, day, calls, cost_usd)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (user_id, day) DO UPDATE
         SET calls = provider_usage.calls + 1,
             cost_usd = provider_usage.cost_usd + $3`,
        [userId, today, cost]
      );
    } catch (err) {
      console.error('PostgreSQL record usage error:', err);
    }
  } else {
    const db = initJsonDb();
    const row = db.provider_usage.find((u) => u.user_id === userId && u.day === today);
    if (row) {
      row.calls += 1;
      row.cost_usd = Number((row.cost_usd + cost).toFixed(4));
    } else {
      db.provider_usage.push({
        user_id: userId,
        day: today,
        calls: 1,
        cost_usd: Number(cost.toFixed(4)),
      });
    }
    writeJsonDb(db);
  }

  return { userCalls, userCost, globalCost };
}

/**
 * User helpers for authentication
 */
export async function findUserById(id: string): Promise<UserRecord | null> {
  if (pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } catch (err) {
      console.error('Error finding user:', err);
    }
  }
  const db = initJsonDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  if (pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
      return res.rows[0] || null;
    } catch (err) {
      console.error('Error finding user by email:', err);
    }
  }
  const db = initJsonDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}
