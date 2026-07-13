import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

// DELETE - Remove a journal entry (the journal UI calls this; the route was missing)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Entry id is required' }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    const entry = await db.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }
    if (entry.authorId !== userId) {
      return NextResponse.json({ error: 'Not allowed to delete this entry' }, { status: 403 });
    }

    await db.journalEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Journal delete error:', error);
    return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 });
  }
}
