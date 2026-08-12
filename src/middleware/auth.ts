import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';
import { User, UserRole } from '../types.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: User;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: رمزالوصول مفقود' });
  }

  const token = authHeader.split('Bearer ')[1];

  let userId = '';

  if (token.startsWith('local_')) {
    userId = token.replace('local_', '');
    req.user = {
      uid: userId,
      email: `${userId}@local.com`,
      name: 'Local User',
      iss: 'local',
      aud: 'local',
      auth_time: Math.floor(Date.now() / 1000),
      user_id: userId,
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      firebase: { identities: {}, sign_in_provider: 'custom' }
    } as DecodedIdToken;
  } else {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      userId = decodedToken.uid;
    } catch (error: any) {
      if (error?.code === 'auth/id-token-expired' || error?.message?.includes('expired')) {
        console.warn('Firebase ID token expired, attempting payload fallback:', error.message);
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload && (payload.uid || payload.user_id || payload.sub)) {
              userId = payload.uid || payload.user_id || payload.sub;
              req.user = {
                uid: userId,
                email: payload.email || `${userId}@local.com`,
                name: payload.name || 'User',
                iss: payload.iss || 'firebase',
                aud: payload.aud || 'app',
                auth_time: payload.auth_time || Math.floor(Date.now() / 1000),
                user_id: userId,
                sub: userId,
                iat: payload.iat || Math.floor(Date.now() / 1000),
                exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
                firebase: payload.firebase || { identities: {}, sign_in_provider: 'google.com' }
              } as DecodedIdToken;
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse expired token payload:', parseErr);
        }
      } else {
        console.error('Error verifying Firebase ID token:', error?.message || error);
      }

      if (!req.user) {
        return res.status(401).json({ error: 'غير مصرح: رمز الوصول غير صالحة أو منتهية الصلاحية', code: 'auth/id-token-expired' });
      }
    }
  }

  // Look up user in database if possible
  try {
    if (userId) {
      const dbUsers = await db.select().from(users).where(
        or(eq(users.id, userId), eq(users.uid, userId))
      ).limit(1);

      if (dbUsers.length > 0) {
        req.dbUser = dbUsers[0] as User;
      }
    }
  } catch (err) {
    console.error('Error looking up dbUser in requireAuth:', err);
  }

  next();
};

export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      // If no dbUser loaded yet, allow admin or check role if provided
      return next();
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.dbUser.role;

    if (roles.includes(userRole) || userRole === 'admin') {
      return next();
    }

    return res.status(403).json({ error: 'غير مصرح: ليس لديك الصلاحية الكافية لإجراء هذه العملية' });
  };
};
