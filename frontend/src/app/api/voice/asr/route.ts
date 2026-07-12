import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio, hasAIProvider } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!hasAIProvider()) {
      // Tell the client to use the browser's built-in speech recognition instead
      return NextResponse.json(
        {
          success: false,
          fallback: 'browser',
          error: 'No AI provider configured on the server. Set FIREWORKS_API_KEY / GROQ_API_KEY / OPENAI_API_KEY.',
        },
        { status: 200 }
      );
    }

    const transcription = await transcribeAudio(audioFile, audioFile.name || 'recording.webm');

    // Save to chat history (non-fatal - never fail the transcription over a DB hiccup)
    try {
      const { db } = await import('@/lib/db');
      const { getCurrentUserId } = await import('@/lib/current-user');
      const authorId = await getCurrentUserId();
      await db.chatMessage.create({
        data: {
          sessionId: 'voice-copilot',
          role: 'USER',
          content: transcription,
          agentType: 'VOICE_ASR',
          authorId,
        },
      });
    } catch (dbError) {
      console.error('ASR history save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, transcription });
  } catch (error) {
    console.error('ASR error:', error);
    return NextResponse.json(
      {
        success: false,
        fallback: 'browser',
        error: error instanceof Error ? error.message : 'Speech recognition failed',
      },
      { status: 500 }
    );
  }
}
