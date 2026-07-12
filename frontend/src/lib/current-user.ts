import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const DEMO_EMAIL = 'demo@navia.ai';

/**
 * Returns the logged-in user's id, or falls back to a shared "Guest Trader"
 * demo account so that dashboard features (voice copilot, vision AI, chat,
 * simulator...) keep working during demos without a login.
 *
 * This also fixes a class of crashes where routes wrote ChatMessage /
 * AnalysisRecord / Trade rows without the required `authorId`, which made
 * Prisma throw and the API return 500 even when the AI call succeeded.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const session = await getServerSession(authOptions as never);
    const id = (session as { user?: { id?: string } } | null)?.user?.id;
    if (id) return id;
  } catch {
    // no session - fall through to demo user
  }

  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          email: DEMO_EMAIL,
          fullName: 'Guest Trader',
          // Not a real bcrypt hash on purpose - this account can never log in.
          hashedPassword: 'demo-account-login-disabled',
        },
      });
    } catch {
      // Concurrent request may have created it first
      user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
    }
  }

  if (!user) throw new Error('Could not resolve a user for this request');
  return user.id;
}
