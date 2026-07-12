import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech, hasAIProvider } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, voice, speed = 1.0 } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Keep it responsive: speak the first ~1000 characters
    const maxLen = 1000;
    const sentences: string[] = text.match(/[^.!?]+[.!?]+/g) || [text];
    let chunkToSpeak = '';
    for (const sentence of sentences) {
      if ((chunkToSpeak + sentence).length > maxLen) break;
      chunkToSpeak += sentence;
    }
    if (!chunkToSpeak) chunkToSpeak = text.substring(0, maxLen);

    if (!hasAIProvider()) {
      return NextResponse.json({ success: false, fallback: 'browser' }, { status: 200 });
    }

    const result = await synthesizeSpeech(chunkToSpeak.trim(), { voice, speed });

    if (!result) {
      // Provider (e.g. Fireworks) has no TTS - browser speechSynthesis takes over
      return NextResponse.json({ success: false, fallback: 'browser' }, { status: 200 });
    }

    return new NextResponse(Buffer.from(result.audio), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    // Never hard-fail voice output - the client falls back to browser TTS
    return NextResponse.json(
      {
        success: false,
        fallback: 'browser',
        error: error instanceof Error ? error.message : 'TTS generation failed',
      },
      { status: 200 }
    );
  }
}
