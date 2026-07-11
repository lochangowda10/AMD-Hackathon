'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTradingStore } from '@/store/trading-store';
import {
  Mic, MicOff, Volume2, VolumeX, Send, Loader2, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function VoiceCopilot() {
  const {
    voiceInput, setVoiceInput, voiceResponse, setVoiceResponse,
    isRecording, setIsRecording, isSpeaking, setIsSpeaking,
  } = useTradingStore();
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setProcessing(true);
        setVoiceInput('Transcribing...');

        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/voice/asr', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.success) {
            setVoiceInput(data.transcription);
            await processQuery(data.transcription);
          }
        } catch (e) {
          setVoiceInput('Could not transcribe. Try again.');
        }
        setProcessing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processQuery = async (query: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, symbol: query.match(/\b([A-Z]{2,6})\b/)?.[1] || 'UNKNOWN' }),
      });
      const data = await res.json();
      if (data.success) {
        const response = `Based on multi-agent analysis: ${data.data.finalDecision} with ${data.data.overallConfidence}% confidence. ${data.data.fusionReasoning}`;
        setVoiceResponse(response);
      }
    } catch (e) {
      setVoiceResponse('Analysis failed. Please try again.');
    }
    setProcessing(false);
  };

  const speakResponse = async () => {
    if (!voiceResponse) return;
    setIsSpeaking(true);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceResponse.substring(0, 1000) }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsSpeaking(false);
      audioRef.current.play();
    } catch (e) {
      setIsSpeaking(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setVoiceInput(textInput);
    processQuery(textInput);
    setTextInput('');
  };

  return (
    <div className="space-y-6">
      {/* Voice Input Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            Voice / Text Input
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6">
          <div className="flex flex-col items-center gap-6">
            {/* Mic Button */}
            <div className="relative">
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-400/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={processing}
                className={cn(
                  'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300',
                  isRecording
                    ? 'bg-red-400/20 border-2 border-red-400 text-red-400'
                    : 'bg-primary/10 border-2 border-primary/40 text-primary hover:bg-primary/20 hover:border-primary',
                )}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRecording ? 'Listening... Tap to stop' : processing ? 'Processing...' : 'Tap to speak or type below'}
            </p>

            {/* Text Input */}
            <div className="w-full max-w-lg flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Or type your question here..."
                className="flex-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || processing}
                size="sm"
                className="bg-primary text-primary-foreground"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transcription */}
      {voiceInput && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">You said / typed</p>
            <p className="text-sm text-foreground">&ldquo;{voiceInput}&rdquo;</p>
          </CardContent>
        </Card>
      )}

      {/* AI Response */}
      {voiceResponse && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">AI Copilot Response</p>
              <button
                onClick={speakResponse}
                disabled={isSpeaking}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{voiceResponse}</p>
          </CardContent>
        </Card>
      )}

      {/* Demo prompt */}
      {!voiceResponse && !processing && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center mb-3">Try asking:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Can I buy Infosys tomorrow?', 'Is Reliance good for swing trade?', 'What is the risk in TCS right now?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setTextInput(q); }}
                  className="text-[10px] px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <audio ref={audioRef} />
    </div>
  );
}