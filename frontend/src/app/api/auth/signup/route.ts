import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

/**
 * Creates the user directly in the app database (the same `User` table
 * that NextAuth credentials login reads).
 *
 * The previous version forwarded signups to the FastAPI backend at
 * http://localhost:8000 - which does not exist on Vercel, and even when it
 * did, it stored users in a different table than the one login checks,
 * so nobody could ever sign in.
 */
export async function POST(req: NextRequest) {
  try {
    const { full_name, email, password } = await req.json();

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'Full name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        fullName: String(full_name).trim(),
        hashedPassword,
      },
    });

    // Optionally mirror the signup to the FastAPI backend if one is configured
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, email: normalizedEmail, password }),
        });
      } catch (backendError) {
        console.error('Backend signup mirror failed (non-fatal):', backendError);
      }
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
