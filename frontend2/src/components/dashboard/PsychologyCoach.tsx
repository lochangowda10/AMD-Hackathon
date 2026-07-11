'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTradingStore } from '@/store/trading-store'
import {
  Brain, Send, Loader2, User, Bot, Heart, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SkeletonText } from '@/components/ui/skeleton-text'
import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'

export function PsychologyCoach() {
  const { psychologyMessages, addPsychologyMessage, psychologyLoading, setPsychologyLoading } = useTradingStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [psychologyMessages])

  const sendMessage = async () => {
    if (!input.trim() || psychologyLoading) return
    const userMsg = input.trim()
    setInput('')

    addPsychologyMessage({
      id: `psy_${Date.now()}`,
      role: 'USER',
      content: userMsg,
      timestamp: new Date(),
    })

    setPsychologyLoading(true)
    try {
      const res = await fetch('/api/agents/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      })
      const data = await res.json()
      if (data.success) {
        addPsychologyMessage({
          id: `psy_${Date.now()}_r`,
          role: 'ASSISTANT',
          content: data.response,
          timestamp: new Date(),
        })
      }
    } catch (e) {
      addPsychologyMessage({
        id: `psy_${Date.now()}_e`,
        role: 'ASSISTANT',
        content: 'I am here to help you with your trading psychology. Please try again.',
        timestamp: new Date(),
      })
    }
    setPsychologyLoading(false)
  }

  const quickPrompts = [
    'I lost ₹20,000 today.',
    'I feel like revenge trading.',
    'Should I enter this trade or am I being greedy?',
    'I keep exiting winning trades too early.',
    'Market is crashing, should I panic sell?',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      <Card className="bg-card border-border flex-1 flex flex-col">
        <CardHeader className="pb-3 pt-4 px-4 shrink-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-pink-400" />
            Trading Psychology Coach
            <span className="text-[10px] text-muted-foreground font-normal ml-2">Empathetic but firm AI mentor</span>
          </CardTitle>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-2" ref={scrollRef}>
          {psychologyMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-pink-400/10 flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-pink-400" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Your Trading Psychology Coach</p>
              <p className="text-xs text-muted-foreground max-w-sm mb-6">
                I help you manage emotions, avoid cognitive biases, and make disciplined trading decisions.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    className="text-[10px] px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-pink-400/40 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {psychologyMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3 mb-4', msg.role === 'USER' ? 'flex-row-reverse' : '')}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'USER' ? 'bg-primary/10' : 'bg-pink-400/10'
              )}>
                {msg.role === 'USER'
                  ? <User className="w-3.5 h-3.5 text-primary" />
                  : <Brain className="w-3.5 h-3.5 text-pink-400" />}
              </div>
              <div className={cn(
                'max-w-[80%] p-3 rounded-xl text-xs leading-relaxed',
                msg.role === 'USER'
                  ? 'bg-primary/10 border border-primary/20 text-foreground'
                  : 'bg-muted/30 border border-border text-foreground'
              )}>
                {msg.content}
              </div>
            </motion.div>
          ))}

          {psychologyLoading && (
            <div className="flex gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-pink-400/10 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-pink-400 animate-spin" />
                  <span className="text-xs text-muted-foreground">Analyzing your emotional state...</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex gap-2">
            <FormField>
              <label htmlFor="psychology-input" className="block text-xs text-muted-foreground mb-1">
                Share what's on your mind...
              </label>
              <textarea
                id="psychology-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Share what's on your mind..."
                className="flex-1 min-h-[40px] max-h-[100px] bg-muted/30 border-border text-xs resize-none"
                rows={1}
              />
            </FormField>
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || psychologyLoading}
              className="bg-pink-500 hover:bg-pink-600 text-white h-10 w-10 p-0 shrink-0 flex items-center justify-center"
            >
              {psychologyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}