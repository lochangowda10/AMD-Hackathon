import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const bytes = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(bytes).toString('base64');

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    const transcription = response.text || '';

    // Save to chat
    const { db } = await import('@/lib/db');
    await db.chatMessage.create({
      data: {
        sessionId: 'voice-copilot',
        role: 'USER',
        content: transcription,
        agentType: 'VOICE_ASR',
      },
    });

    return NextResponse.json({ success: true, transcription });
  } catch (error) {
    console.error('ASR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Speech recognition failed' },
      { status: 500 }
    );
  }
}