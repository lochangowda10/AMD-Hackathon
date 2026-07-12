import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'tongtong', speed = 1.0 } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Split text into chunks if needed (max 1024 chars)
    const chunks: string[] = [];
    const maxLen = 1000;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length <= maxLen) {
        current += sentence;
      } else {
        if (current) chunks.push(current.trim());
        current = sentence;
      }
    }
    if (current) chunks.push(current.trim());

    // Use first chunk for TTS (for real-time responsiveness)
    const chunkToSpeak = chunks[0] || text.substring(0, 1000);

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.audio.tts.create({
      input: chunkToSpeak,
      voice,
      speed: Math.max(0.5, Math.min(2.0, speed)),
      response_format: 'wav',
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS generation failed' },
      { status: 500 }
    );
  }
}