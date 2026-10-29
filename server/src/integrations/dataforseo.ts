/**
 * DataForSEO API Client Integration
 * Secure wrapper with HTTP Basic Auth, timeout, error mapping, and strict credential isolation.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load server/.env and root .env
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

export class ProviderNotConfiguredError extends Error {
  readonly statusCode = 503;
  constructor(message = 'Traffic provider not configured') {
    super(message);
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderAuthError extends Error {
  readonly statusCode = 502;
  constructor(message = 'DataForSEO authentication failed. Please verify API credentials.') {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderBillingError extends Error {
  readonly statusCode = 503;
  constructor(message = 'DataForSEO balance or account cost limit exceeded.') {
    super(message);
    this.name = 'ProviderBillingError';
  }
}

export class ProviderRateLimitError extends Error {
  readonly statusCode = 429;
  constructor(message = 'DataForSEO upstream rate limit exceeded.') {
    super(message);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderApiError extends Error {
  readonly statusCode: number;
  readonly providerCode: number;

  constructor(message: string, providerCode = 50000, statusCode = 502) {
    super(message);
    this.name = 'ProviderApiError';
    this.providerCode = providerCode;
    this.statusCode = statusCode;
  }
}

export interface DataForSEOTask<T = any> {
  id?: string;
  status_code: number;
  status_message?: string;
  time?: string;
  cost?: number;
  result_count?: number;
  path?: string[];
  data?: Record<string, any>;
  result?: T[];
}

export interface DataForSEOResponse<T = any> {
  version?: string;
  status_code: number;
  status_message?: string;
  time?: string;
  cost?: number;
  tasks_count?: number;
  tasks_error?: number;
  tasks?: DataForSEOTask<T>[] | null;
}

export interface DfsCallResult<T> {
  result: T;
  cost: number;
}

export interface DataForSEOConfig {
  login: string;
  password: string;
  sandbox: boolean;
  baseUrl: string;
}

/**
 * Returns validated DataForSEO configuration without exposing credentials.
 */
export function getDataForSEOConfig(): DataForSEOConfig {
  const login = (process.env.DATAFORSEO_LOGIN || '').trim();
  const password = (process.env.DATAFORSEO_PASSWORD || '').trim();
  const sandbox = process.env.DATAFORSEO_SANDBOX === 'true' || process.env.DATAFORSEO_SANDBOX === '1';

  const baseUrl = sandbox
    ? 'https://sandbox.dataforseo.com'
    : 'https://api.dataforseo.com';

  return { login, password, sandbox, baseUrl };
}

/**
 * Core wrapper for making requests to DataForSEO API.
 * Uses HTTP Basic Authentication, 30s timeout, and strict error classification.
 */
export async function dfs<T>(path: string, body: unknown): Promise<DfsCallResult<T>> {
  const config = getDataForSEOConfig();

  if (!config.login || !config.password) {
    throw new ProviderNotConfiguredError();
  }

  const endpointUrl = `${config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const authHeader = 'Basic ' + Buffer.from(`${config.login}:${config.password}`).toString('base64');

  let rawResponse: Response;
  try {
    rawResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.code === 23) {
      throw new ProviderApiError('DataForSEO request timed out after 30 seconds', 50400, 504);
    }
    throw new ProviderApiError(`Network error communicating with DataForSEO: ${err.message}`, 50000, 502);
  }

  // Handle HTTP-level status codes
  if (rawResponse.status === 401) {
    throw new ProviderAuthError();
  }
  if (rawResponse.status === 402) {
    throw new ProviderBillingError();
  }
  if (rawResponse.status === 429) {
    throw new ProviderRateLimitError();
  }

  let data: DataForSEOResponse<T>;
  try {
    data = (await rawResponse.json()) as DataForSEOResponse<T>;
  } catch {
    throw new ProviderApiError(
      `Invalid JSON response received from DataForSEO (HTTP ${rawResponse.status})`,
      50000,
      502
    );
  }

  // Check top-level DataForSEO status_code
  if (data.status_code !== 20000) {
    mapAndThrowDfsCode(data.status_code, data.status_message);
  }

  // Check task-level status_code
  if (!data.tasks || data.tasks.length === 0) {
    throw new ProviderApiError('DataForSEO returned 0 tasks in response', 50000, 502);
  }

  const task = data.tasks[0];
  if (task.status_code !== 20000) {
    mapAndThrowDfsCode(task.status_code, task.status_message);
  }

  const cost = Number(task.cost ?? data.cost ?? 0);
  const result = (task.result ?? []) as unknown as T;

  return {
    result,
    cost: isNaN(cost) ? 0 : cost,
  };
}

/**
 * Maps DataForSEO internal status code to the appropriate typed error.
 */
function mapAndThrowDfsCode(code: number, message = 'Unknown DataForSEO error'): never {
  // 40100, 40101 -> Authentication errors
  if (code >= 40100 && code < 40200) {
    throw new ProviderAuthError();
  }
  // 40200, 40201, 40202, 40203 -> Insufficient funds / cost limits
  if (code >= 40200 && code < 40300) {
    throw new ProviderBillingError(`DataForSEO cost or balance limit exceeded: ${message}`);
  }
  // 42900 or rate limit errors
  if (code === 42900 || message.toLowerCase().includes('rate-limit')) {
    throw new ProviderRateLimitError(`DataForSEO rate limit reached: ${message}`);
  }
  // 40400 Not Found / Invalid target
  if (code >= 40400 && code < 40500) {
    throw new ProviderApiError(`DataForSEO resource not found: ${message}`, code, 404);
  }
  // General DataForSEO errors
  throw new ProviderApiError(`DataForSEO error (${code}): ${message}`, code, 502);
}
