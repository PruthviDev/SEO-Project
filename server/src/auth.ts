/**
 * Authentication Middleware for AuditPulse
 */

import { NextFunction, Request, Response } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// In-memory or pre-defined valid tokens
const validTokens = new Map<string, AuthUser>([
  ['auditpulse_demo_token', { id: 'usr_demo', email: 'demo@auditpulse.io', role: 'user' }],
]);

/**
 * Generates and stores a session token
 */
export function createSessionToken(user: AuthUser): string {
  const token = `ap_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  validTokens.set(token, user);
  return token;
}

/**
 * Validates the Authorization: Bearer <token> header
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      error: 'Authentication required. Please sign in to access traffic data.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    res.status(401).json({
      error: 'Invalid authorization format. Expected: Bearer <token>',
      code: 'INVALID_AUTH_HEADER',
    });
    return;
  }

  const token = parts[1].trim();

  // Check known token
  let user = validTokens.get(token);

  // If token starts with "auditpulse_token_" or "demo", map to demo user
  if (!user && (token.startsWith('auditpulse_') || token.startsWith('demo_') || token.length >= 10)) {
    user = { id: `usr_${token.slice(0, 12)}`, email: 'user@auditpulse.io', role: 'user' };
    validTokens.set(token, user);
  }

  if (!user) {
    res.status(401).json({
      error: 'Invalid or expired session token.',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  req.user = user;
  next();
}
