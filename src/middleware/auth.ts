import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';
import { User, UserRole } from '../types.ts';
import { verifyLocalSession } from '../lib/localSession.ts';

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
    return res.status(401).json({ error: 'غير مصرح: رمز الوصول مفقود' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return res.status(401).json({ error: 'غير مصرح: رمز الوصول مفقود' });

  let userId = '';

  if (token.startsWith('local_v1.')) {
    const session = verifyLocalSession(token);
    if (!session) return res.status(401).json({ error: 'غير مصرح: الجلسة غير صالحة أو منتهية' });
    userId = session.userId;
    req.user = {
      uid: userId,
      email: `${userId}@local.com`,
      name: 'Local User',
      iss: 'local', aud: 'local',
      auth_time: Math.floor(Date.now() / 1000), user_id: userId,
      sub: userId, iat: Math.floor(Date.now() / 1000), exp: session.expiresAt,
      firebase: { identities: {}, sign_in_provider: 'custom' }
    } as DecodedIdToken;
  } else {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      userId = decodedToken.uid;
    } catch {
      return res.status(401).json({ error: 'غير مصرح: رمز الوصول غير صالح أو منتهي الصلاحية' });
    }
  }

  try {
    const dbUsers = await db.select().from(users).where(
      or(eq(users.id, userId), eq(users.uid, userId))
    ).limit(1);
    if (dbUsers.length === 0) {
      return res.status(403).json({ error: 'الحساب غير مسجل أو بانتظار اعتماد المدير' });
    }
    req.dbUser = dbUsers[0] as User;
    return next();
  } catch (err) {
    console.error('Error looking up dbUser in requireAuth:', err);
    return res.status(503).json({ error: 'تعذر التحقق من الحساب حاليًا' });
  }
};

export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول والتحقق من الحساب أولًا' });
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.dbUser.role;
    if (roles.includes(userRole) || userRole === 'admin') return next();
    return res.status(403).json({ error: 'غير مصرح: ليس لديك الصلاحية الكافية لإجراء هذه العملية' });
  };
};
