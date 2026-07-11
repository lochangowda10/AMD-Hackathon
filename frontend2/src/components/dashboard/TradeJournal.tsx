'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BookOpen, Plus, FileText, Calendar, Loader2, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalEntry {
  id: string;
  tradeId: string;
  entryType: string;
  content: string;
  mood: string;
  followedPlan: boolean;
  createdAt: string;
  trade?: { symbol: string; direction: string; pnl: number | null };
}

export function TradeJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entryType: 'REVIEW', content: '', mood: 'CALM', followedPlan: true });

  useEffect(() => {
    fetch('/api/agents/journal').then(r => r.json()).then(d => {
      if (d.success) setEntries(d.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    try {
      const res = await fetch('/api/agents/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setEntries(prev => [data.data, ...prev]);
        setForm({ entryType: 'REVIEW', content: '', mood: 'CALM', followedPlan: true });
        setShowForm(false);
      }
    } catch (e) { /* handle */ }
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/agents/journal/report');
      const data = await res.json();
      if (data.success) setReport(data.data.recommendations);
    } catch (e) { /* handle */ }
    setReportLoading(false);
  };

  const moodColor = (mood: string) => {
    const colors: Record<string, string> = {
      CONFIDENT: 'border-emerald-400/40 text-emerald-400',
      ANXIOUS: 'border-amber-400/40 text-amber-400',
      FOMO: 'border-red-400/40 text-red-400',
      CALM: 'border-cyan-400/40 text-cyan-400',
      FEARFUL: 'border-red-400/40 text-red-400',
      GREEDY: 'border-orange-400/40 text-orange-400',
    };
    return colors[mood] || 'border-border text-muted-foreground';
  };

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
            {reportLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Award className="w-3 h-3 mr-1" />}
            AI Weekly Report
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground text-xs">
            <Plus className="w-3 h-3 mr-1" /> New Entry
          </Button>
        </div>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.entryType} onValueChange={(v) => setForm(p => ({ ...p, entryType: v }))}>
                <SelectTrigger className="bg-muted/30 border-border text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAN">Plan</SelectItem>
                  <SelectItem value="EXECUTION">Execution</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="EMOTION">Emotion</SelectItem>
                  <SelectItem value="LESSON">Lesson</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.mood} onValueChange={(v) => setForm(p => ({ ...p, mood: v }))}>
                <SelectTrigger className="bg-muted/30 border-border text-xs h-9">
                  <SelectValue />
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
            </div>
            <Textarea
              value={form.content}
              onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="What happened? What did you learn? Did you follow your plan?"
              className="bg-muted/30 border-border text-xs min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={handleSubmit} className="bg-primary text-primary-foreground text-xs">
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
            <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">{report}</pre>
          </CardContent>
        </Card>
      )}

      {/* Journal Entries */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
              </div>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No journal entries yet. Start documenting your trades.</p>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="p-3 rounded-lg bg-muted/20 border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{entry.entryType}</Badge>
                      {entry.trade?.symbol && (
                        <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                          {entry.trade.symbol}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn('text-[9px]', moodColor(entry.mood))}>
                        {entry.mood}
                      </Badge>
                      {!entry.followedPlan && (
                        <Badge variant="outline" className="text-[9px] border-red-400/40 text-red-400">
                          DEVIATED
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}