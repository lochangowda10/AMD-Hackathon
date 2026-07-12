'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BookOpen, Plus, FileText, Calendar, Loader2, Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonText } from '@/components/ui/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/ui/form-field'
import { Label } from '@/components/ui/label'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { RefreshCw, XIcon } from 'lucide-react'

type FormState = {
    entryType: string;
    content: string;
    mood: string;
    followedPlan: boolean;
  }

interface JournalEntry {
  id: string
  tradeId: string
  entryType: string
  content: string
  mood: string
  followedPlan: boolean
  createdAt: string
  trade?: { symbol: string; direction: string; pnl: number | null }
}

export function TradeJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [reportLoading, setReportLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    entryType: 'REVIEW',
    content: '',
    mood: 'CALM',
    followedPlan: true,
  })
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({})

  const validateForm = (values: FormState): Partial<FormState> => {
    const errors: Partial<FormState> = {}

    if (!values.content.trim()) {
      errors.content = 'Content is required'
    } else if (values.content.trim().length < 10) {
      errors.content = 'Please provide more detailed thoughts (minimum 10 characters)'
    }

    if (!values.entryType) {
      errors.entryType = 'Entry type is required'
    }

    if (!values.mood) {
      errors.mood = 'Mood is required'
    }

    return errors
  }

  useEffect(() => {
    fetch('/api/agents/journal')
      .then(r => r.json())
      .then(d => {
        if (d.success) setEntries(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      const res = await fetch('/api/agents/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        setEntries(prev => [data.data, ...prev])
        setForm({ entryType: 'REVIEW', content: '', mood: 'CALM', followedPlan: true })
        setShowForm(false)
        setFormErrors({})
      }
    } catch (e) {
      console.error('Failed to save journal entry:', e)
    }
  }

  const handleDelete = (id: string) => {
    setEntryToDelete(id)
    setShowConfirmation(true)
  }

  const confirmDelete = async () => {
    if (!entryToDelete) return
    try {
      await fetch(`/api/agents/journal/${entryToDelete}`, {
        method: 'DELETE',
      })
      setEntries(prev => prev.filter(entry => entry.id !== entryToDelete))
      setEntryToDelete(null)
      setShowConfirmation(false)
    } catch (e) {
      console.error('Failed to delete journal entry:', e)
    }
  }

  const generateReport = async () => {
    setReportLoading(true)
    try {
      const res = await fetch('/api/agents/journal/report')
      const data = await res.json()
      if (data.success) setReport(data.data.recommendations)
    } catch (e) {
      console.error('Failed to generate journal report:', e)
    }
    setReportLoading(false)
  }

  const moodColor = (mood: string) => {
    const colors: Record<string, string> = {
      CONFIDENT: 'border-emerald-400/40 text-emerald-400',
      ANXIOUS: 'border-amber-400/40 text-amber-400',
      FOMO: 'border-red-400/40 text-red-400',
      CALM: 'border-cyan-400/40 text-cyan-400',
      FEARFUL: 'border-red-400/40 text-red-400',
      GREEDY: 'border-orange-400/40 text-orange-400',
    }
    return colors[mood] || 'border-border text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold">Trade Journal</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateReport}
            disabled={reportLoading}
            className="text-xs"
          >
            {reportLoading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Award className="w-3 h-3 mr-1" />
            )}
            AI Weekly Report
          </Button>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-primary text-primary-foreground text-xs"
          >
            <Plus className="w-3 h-3 mr-1" /> New Entry
          </Button>
        </div>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Entry Type"
                htmlFor="entry-type"
                error={formErrors.entryType}
              >
                <Select
                  defaultValue="REVIEW"
                  onValueChange={(v) => setForm(p => ({ ...p, entryType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAN">Plan</SelectItem>
                    <SelectItem value="EXECUTION">Execution</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                    <SelectItem value="EMOTION">Emotion</SelectItem>
                    <SelectItem value="LESSON">Lesson</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.entryType && (
                  <p className="text-xs text-destructive mt-1">{formErrors.entryType}</p>
                )}
              </FormField>

              <FormField
                label="Mood"
                htmlFor="mood"
                error={formErrors.mood}
              >
                <Select
                  defaultValue="CALM"
                  onValueChange={(v) => setForm(p => ({ ...p, mood: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONFIDENT">Confident</SelectItem>
                    <SelectItem value="CALM">Calm</SelectItem>
                    <SelectItem value="ANXIOUS">Anxious</SelectItem>
                    <SelectItem value="FOMO">FOMO</SelectItem>
                    <SelectItem value="FEARFUL">Fearful</SelectItem>
                    <SelectItem value="GREEDY">Greedy</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.mood && (
                  <p className="text-xs text-destructive mt-1">{formErrors.mood}</p>
                )}
              </FormField>
            </div>

            <FormField
                label="What happened?"
                htmlFor="journal-content"
                error={formErrors.content}
              >
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="What happened? What did you learn? Did you follow your plan?"
                  className="bg-muted/30 border-border text-xs min-h-[80px]"
                />
                {formErrors.content && (
                  <p className="text-xs text-destructive mt-1">{formErrors.content}</p>
                )}
              </FormField>

            <div className="flex items-center space-x-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.followedPlan}
                  onChange={(e) => setForm(p => ({ ...p, followedPlan: e.target.checked }))}
                  className="h-4 w-4 text-primary rounded border-gray-300"
                />
                Followed Plan
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForm(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                className="bg-primary text-primary-foreground text-xs"
              >
                <FileText className="w-3 h-3 mr-1" /> Save Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Weekly Report */}
      {report && (
        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" /> AI Weekly Report
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <Alert variant="info" className="mb-3">
              <AlertDescription>
                {report}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              onClick={generateReport}
              disabled={reportLoading}
              className="text-xs"
            >
              {reportLoading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Refresh Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Journal Entries */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-3">
            {loading ? (
              <div className="space-y-4">
                <SkeletonText lines={3} className="w-full" />
                <SkeletonText lines={2} className="w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                title="No journal entries yet"
                description="Start documenting your trades to build your trading journal and improve your decision-making."
                action={<Button size="sm" onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Add First Entry
                </Button>}
                icon={<BookOpen className="h-5 w-5" />}
              />
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px]">{entry.entryType}</Badge>
                      {entry.trade?.symbol && (
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                          {entry.trade.symbol}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn('text-[9px]', moodColor(entry.mood))}>
                        {entry.mood}
                      </Badge>
                      {!entry.followedPlan && (
                        <Badge variant="destructive" className="text-[9px] border-destructive/40 text-destructive">
                          DEVIATED
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="hover:text-destructive/80 transition-colors p-1 rounded hover:bg-destructive/5"
                      >
                        <XIcon className="h-4 w-4 text-destructive/60" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        trigger={<div />}
        title="Delete Entry"
        description="Are you sure you want to delete this journal entry? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirmation(false)}
        destructiveText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}