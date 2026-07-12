'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTradingStore } from '@/store/trading-store';
import {
  Mic, MicOff, Volume2, VolumeX, Send, Loader2, Cpu,
  AlertTriangle, Info, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { motionVariants } from '@/lib/motion-variants';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function VoiceCopilot() {
  const {
    voiceInput, setVoiceInput, voiceResponse, setVoiceResponse,
    isRecording, setIsRecording, isSpeaking, setIsSpeaking,
  } = useTradingStore();
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string, timestamp: number}>>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Clear errors/success after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Analyze audio for visual feedback
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const scriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.3;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(scriptNode);
      scriptNode.connect(audioContext.destination);

      scriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
          sum += array[i];
        }
        const volume = sum / array.length;
        setVolumeLevel(volume / 255);
      };

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();

        setProcessing(true);
        setIsListening(false);
        setVoiceInput('Transcribing...');

        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await fetch('/api/voice/asr', { method: 'POST', body: formData });

          if (!res.ok) {
            throw new Error(`Transcription failed: ${res.status}`);
          }

          const data = await res.json();

          if (data.success) {
            setVoiceInput(data.transcription);
            await processQuery(data.transcription);
            setSuccess('Transcription completed successfully!');
          } else {
            throw new Error(data.error || 'Transcription failed');
          }
        } catch (e: any) {
          setError(e.message || 'Could not transcribe. Please try again.');
          setVoiceInput('Error in transcription');
        } finally {
          setProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
    } catch (err: any) {
      setError(err.message || 'Microphone access denied or not available');
      console.error('Microphone access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const processQuery = useCallback(async (query: string) => {
    setProcessing(true);
    setError(null);

    try {
      // Extract symbol from query if possible
      const symbolMatch = query.match(/\b([A-Z]{2,6})\b/);
      const symbol = symbolMatch ? symbolMatch[1] : 'UNKNOWN';

      const res = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, symbol }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        const response = `Based on multi-agent analysis: ${data.data.finalDecision} with ${data.data.overallConfidence}% confidence. ${data.data.fusionReasoning}`;
        setVoiceResponse(response);

        // Add to conversation history
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: query, timestamp: Date.now() },
          { role: 'assistant', content: response, timestamp: Date.now() }
        ]);

        setSuccess('Analysis completed successfully!');
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please try again.');
      setVoiceResponse('Analysis failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, []);

  const speakResponse = async () => {
    if (!voiceResponse) return;

    setIsSpeaking(true);
    setError(null);

    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: voiceResponse.substring(0, 1000) }),
      });

      if (!res.ok) {
        throw new Error(`Text-to-speech failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      audioRef.current = new Audio(url);
      audioRef.current.onended = () => {
        setIsSpeaking(false);
        // Clean up object URL
        URL.revokeObjectURL(url);
      };
      audioRef.current.play();
    } catch (e: any) {
      setError(e.message || 'Text-to-speech failed');
      setIsSpeaking(false);
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    setError(null);
    setVoiceInput(textInput);
    processQuery(textInput);
    setTextInput('');
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setVoiceInput('');
    setVoiceResponse('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Status Indicators */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

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
            {/* Visual Feedback for Listening with Motion Variants */}
            {isListening && (
              <motion.div
                variants={motionVariants.pulse}
                className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                initial="hidden"
                animate="visible"
              >
                <div className="w-8 h-8 rounded-full bg-primary/50" style={{ height: `${30 + volumeLevel * 70}%` }}></div>
              </motion.div>
            )}

            {/* Mic Button */}
            <div className="relative">
              {isRecording && (
                <motion.div
                  variants={{
                    hidden: { scale: 1, opacity: 0.5 },
                    visible: {
                      scale: [1, 1.3, 1.2, 1.1, 1],
                      opacity: [0.5, 0.2, 0.4, 0.3, 0.5],
                      transition: {
                        duration: 2,
                        repeat: Infinity
                      }
                    }
                  }}
                  className="absolute inset-0 rounded-full bg-red-400/20"
                  initial="hidden"
                  animate="visible"
                />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={processing}
                className={cn(
                  'relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 motion-variants hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
                  isRecording
                    ? 'bg-red-400/20 border-2 border-red-400 text-red-400'
                    : 'bg-primary/10 border-2 border-primary/40 text-primary hover:bg-primary/20 hover:border-primary',
                )}
                aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                aria-pressed={isRecording}
              >
                {isRecording ? <MicOff className="w-8 h-8" aria-hidden="true" /> : <Mic className="w-8 h-8" aria-hidden="true" />}
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRecording ? 'Listening... Tap to stop' :
               processing ? 'Processing...' :
               isListening ? 'Listening...' :
               'Tap to speak or type below'}
            </p>

            {/* Enhanced Text Input with Accessibility Features */}
            <div className="w-full max-w-lg flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTextSubmit();
                  }
                  // Add keyboard shortcuts
                  if (e.key === 'Enter' && e.ctrlKey) {
                    // Ctrl+Enter to send
                    e.preventDefault();
                    handleTextSubmit();
                  }
                  if (e.key === 'Escape') {
                    // Escape to clear
                    e.preventDefault();
                    setTextInput('');
                  }
                }}
                placeholder="Or type your question here..."
                className="flex-1 h-10 px-3 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                disabled={processing}
                aria-label="Type your trading question"
                aria-multiline="false"
                autoComplete="off"
                spellCheck="true"
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || processing}
                size="sm"
                className="bg-primary text-primary-foreground hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-label="Processing" />
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">Send message</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation History with Improved Accessibility */}
      {conversationHistory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Conversation History
              </CardTitle>
              <Button
                variant="outline"
                size="xs"
                onClick={clearConversation}
                className="text-[10px] px-2 py-1 hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                aria-label="Clear conversation history"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 max-h-60 overflow-y-auto">
            <AnimatePresence>
              <motion.ul
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.2,
                      duration: 0.5
                    }
                  }
                }}
                initial="hidden"
                animate="visible"
                className="space-y-4"
                role="region"
                aria-label="Conversation history"
                aria-live="polite"
              >
                {conversationHistory.map((msg, index) => (
                  <motion.li
                    key={index}
                    variants={{
                      hidden: {
                        x: msg.role === 'user' ? -30 : 30,
                        opacity: 0
                      },
                      visible: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          duration: 0.4,
                          ease: [0.25, 0.1, 0.25, 1.0]
                        }
                      }
                    }}
                    initial="hidden"
                    animate="visible"
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`max-w-xs ${msg.role === 'user' ? 'bg-primary/10' : 'bg-muted/20'} rounded-lg p-3 hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20`}>
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {msg.role === 'user' ? 'You' : 'AI'}
                      </p>
                      <p className="text-xs text-foreground break-words whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'assistant' && (
                      <div className="ml-2">
                        <button
                          onClick={() => {
                            setVoiceInput(msg.content);
                            // Trigger re-processing
                            processQuery(msg.content);
                          }}
                          className="text-[10px] hover:text-primary/70 p-1 rounded hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                          aria-label="Replay this message"
                        >
                          <Mic className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Transcription with Empty State Handling */}
      {(voiceInput || !processing) && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">You said / typed</p>
            {voiceInput ? (
              <p className="text-sm text-foreground break-words whitespace-pre-wrap">&ldquo;{voiceInput}&rdquo;</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No input yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Response with Enhanced Feedback */}
      {voiceResponse && !processing && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-primary uppercase tracking-wider font-semibold">AI Copilot Response</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={speakResponse}
                  disabled={isSpeaking || !voiceResponse}
                  className="hover:bg-primary/10 rounded px-2 py-1 text-[10px] transition-colors hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  aria-label={isSpeaking ? 'Stop speaking' : 'Listen to response'}
                  aria-pressed={isSpeaking}
                >
                  {isSpeaking ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" aria-label="Speaking" />
                      <span className="sr-only">Speaking...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3" aria-hidden="true" />
                      <span className="sr-only">Play audio</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(voiceResponse);
                    setSuccess('Response copied to clipboard!');
                  }}
                  className="hover:bg-primary/10 rounded px-2 py-1 text-[10px] transition-colors hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                  aria-label="Copy response to clipboard"
                >
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  <span className="sr-only">Copy to clipboard</span>
                </button>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">{voiceResponse}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Copy icon (temporary - would normally import from lucide-react)
const Copy = () => (
  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6h4m4 8H6a2 2 0 01-2-2V6h4m4 8H6a2 2 0 01-2-2V6h4m4 8H6a2 2 0 01-2-2V6h4" />
  </svg>
);