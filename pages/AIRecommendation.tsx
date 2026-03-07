import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, TrendingUp, AlertCircle, CheckCircle2, Clock,
  RefreshCw, Search, Eye, Sparkles, Activity, Zap,
  Loader2, Shield, FileText, Info, XCircle, ChevronDown,
  ChevronUp, Download, GitBranch, TreePine, AlertTriangle,
  Lightbulb, ArrowRight, Edit3, Users, UserCheck, BarChart3,
  ChevronRight, Award, Target, HeartPulse, Stethoscope,
  FlaskConical, ShieldCheck, ShieldAlert, TrendingDown,
  CalendarDays, Hash, Star, CheckCheck, RotateCcw
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/services/api'
import MainLayout from '@/components/layout/MainLayout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Patient {
  id: number
  patient_code: string
  name: string
  age: number
  gender: string
  is_consented: boolean
  condition?: string
  severity?: string
  tooth_number?: string
  pain_level?: number
}

interface SimilarCase {
  case_id: number
  patient_code: string
  age: number
  gender: string
  condition_before: string
  severity: string
  tooth_number: string
  pain_level_before: number
  treatment_performed: string
  condition_after: string
  pain_level_after: number
  healing_status: string
  outcome_classification: string
  satisfaction_score: number
  treatment_duration_days: number
  similarity_score: number
}

interface OutcomePrediction {
  if_treated: {
    pain_reduction: number
    healing_improvement: string
    success_probability: number
    estimated_duration_days: number
    expected_outcome: string
  }
  if_not_treated: {
    risk_of_worsening: string
    possible_complications: string[]
    potential_future_procedures: string[]
    urgency_level: 'low' | 'moderate' | 'high' | 'critical'
  }
}

interface FeatureImportance {
  feature: string
  importance: number
  value: string | number
  description: string
  impact_direction: 'positive' | 'negative' | 'neutral'
}

interface Recommendation {
  id: number
  patient_id: number
  patient_code: string
  patient_name: string
  patient_age: number
  patient_gender: string
  current_condition: string
  severity: string
  tooth_number: string
  pain_level: number
  recommended_treatment: string
  recommended_treatment_id: number
  confidence_score: number
  success_probability: number
  risk_level: 'low' | 'moderate' | 'high' | 'very_high'
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  model_version: string
  explanation: string
  feature_importance: FeatureImportance[]
  outcome_prediction: OutcomePrediction
  similar_cases: SimilarCase[]
  tree_votes_for: number
  tree_votes_against: number
  total_trees: number
  alternatives: Array<{
    treatment_name: string
    confidence: number
    rationale: string
  }>
}

interface ModelStats {
  total_predictions: number
  pending_review: number
  approved_today: number
  approval_rate: number
  avg_confidence: number
  accuracy: number
  f1_score: number
  model_version: string
  last_training: string
  total_patients: number
  consented_patients: number
  n_estimators: number
  training_samples: number
}

interface Treatment {
  id: number
  name: string
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

const getRiskConfig = (risk: string) => {
  const cfg: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    low:      { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <ShieldCheck className="h-3 w-3" />, label: 'Low Risk' },
    moderate: { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: <AlertCircle className="h-3 w-3" />,  label: 'Moderate' },
    high:     { color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  icon: <AlertTriangle className="h-3 w-3" />, label: 'High Risk' },
    very_high:{ color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     icon: <ShieldAlert className="h-3 w-3" />,   label: 'Very High' },
  }
  return cfg[risk] || cfg.low
}

const getStatusConfig = (status: string) => {
  const cfg: Record<string, { color: string; bg: string; border: string; label: string }> = {
    pending:  { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  label: 'Pending' },
    approved: { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',label: 'Approved' },
    rejected: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    label: 'Rejected' },
    modified: { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', label: 'Modified' },
  }
  return cfg[status] || cfg.pending
}

const getConfidenceTier = (score: number) => {
  if (score >= 90) return { label: 'Very High', color: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (score >= 80) return { label: 'High',      color: 'text-blue-600',    bar: 'bg-blue-500'    }
  if (score >= 70) return { label: 'Moderate',  color: 'text-amber-600',   bar: 'bg-amber-500'   }
  if (score >= 60) return { label: 'Low',       color: 'text-orange-600',  bar: 'bg-orange-500'  }
  return               { label: 'Very Low',  color: 'text-red-600',     bar: 'bg-red-500'     }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const formatShortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// ─── Sub-components ───────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'md' }) => {
  const tier = getConfidenceTier(value)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${tier.color}`}>{value}%</span>
        <span className={`text-xs ${tier.color}`}>{tier.label}</span>
      </div>
      <div className={`w-full ${size === 'sm' ? 'h-1' : 'h-1.5'} bg-muted rounded-full overflow-hidden`}>
        <div
          className={`h-full ${tier.bar} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const cfg = getRiskConfig(risk)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = getStatusConfig(status)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

const StatCard: React.FC<{
  title: string; value: string | number; sub?: string
  icon: React.ReactNode; accent: string
}> = ({ title, value, sub, icon, accent }) => (
  <Card className={`border-l-4 ${accent} hover:shadow-md transition-shadow`}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="opacity-70">{icon}</div>
      </div>
    </CardContent>
  </Card>
)

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIRecommendation() {
  const { toast } = useToast()
  const navigate = useNavigate()

  // Data state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [stats, setStats] = useState<ModelStats | null>(null)
  const [treatments, setTreatments] = useState<Treatment[]>([])

  // UI state
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Detail dialog
  const [selected, setSelected] = useState<Recommendation | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')

  // Review dialog
  const [showReview, setShowReview] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<Recommendation | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'modify'>('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [modifiedTreatment, setModifiedTreatment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // ─── Load Data ───────────────────────────────────────────────────────────

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = { limit: 100 }
      if (filter !== 'all') params.filter = filter
      if (search) params.search = search

      const data = await api.getData<Recommendation[]>('/ai/recommendations/read.php', params)
      setRecommendations(data || [])
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'Failed to load recommendations', variant: 'destructive' })
      setRecommendations([])
    } finally {
      setLoading(false)
    }
  }, [filter, search, toast])

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getData<ModelStats>('/ai/recommendations/stats.php')
      setStats(data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const loadTreatments = useCallback(async () => {
    try {
      const data = await api.getData<Treatment[]>('/treatments/read.php')
      setTreatments(data || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    loadRecommendations()
    loadStats()
    loadTreatments()
  }, [loadRecommendations, loadStats, loadTreatments])

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleTrain = async () => {
    try {
      setTraining(true)
      toast({ title: 'Training Random Forest', description: 'Learning patterns from historical data...' })
      const res = await api.postData<{ accuracy: number; model_version: string; f1_score: number }>('/ai/train.php', { optimize: true })
      toast({
        title: 'Training Complete ✓',
        description: `Accuracy: ${res.accuracy?.toFixed(1)}% | F1: ${res.f1_score?.toFixed(1)}% | ${res.model_version}`
      })
      loadStats()
    } catch (err: any) {
      toast({ title: 'Training Failed', description: err.message || 'Could not train model', variant: 'destructive' })
    } finally {
      setTraining(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      toast({ title: 'Generating Recommendations', description: 'Analyzing consented patients...' })
      const res = await api.postData<{ generated: number; updated: number; errors: number }>('/ai/predictions/generate.php', {})
      toast({
        title: 'Done ✓',
        description: `Generated ${res.generated} new, updated ${res.updated} existing recommendations`
      })
      loadRecommendations()
      loadStats()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleOpenDetail = (rec: Recommendation) => {
    setSelected(rec)
    setDetailTab('overview')
    setShowDetail(true)
  }

  const handleOpenReview = (rec: Recommendation, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setReviewTarget(rec)
    setReviewAction('approve')
    setReviewNotes('')
    setModifiedTreatment('')
    setShowReview(true)
  }

  const handleSubmitReview = async () => {
    if (!reviewTarget) return
    try {
      setSubmittingReview(true)
      const payload: Record<string, any> = {
        id: reviewTarget.id,
        action: reviewAction,
        notes: reviewNotes
      }
      if (reviewAction === 'modify' && modifiedTreatment) {
        payload.modified_treatment_id = parseInt(modifiedTreatment)
      }
      await api.postData('/ai/recommendations/approve.php', payload)
      toast({ title: 'Success', description: `Recommendation ${reviewAction}d successfully` })
      setShowReview(false)
      loadRecommendations()
      loadStats()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to submit review', variant: 'destructive' })
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/backend/ai/reports/clinical.php', { credentials: 'include' })
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai_report_${new Date().toISOString().split('T')[0]}.md`
      a.click()
      toast({ title: 'Report Downloaded', description: 'Clinical report exported successfully' })
    } catch {
      toast({ title: 'Error', description: 'Failed to download report', variant: 'destructive' })
    }
  }

  // ─── Render Sections ──────────────────────────────────────────────────────

  const renderStats = () => {
    if (!stats) return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    )
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={stats.pending_review}
          sub={`of ${stats.total_predictions} total`}
          icon={<Clock className="h-8 w-8 text-amber-500" />}
          accent="border-l-amber-400"
        />
        <StatCard
          title="Model Accuracy"
          value={`${stats.accuracy ?? 0}%`}
          sub={`F1: ${stats.f1_score ?? 0}%`}
          icon={<Target className="h-8 w-8 text-emerald-500" />}
          accent="border-l-emerald-400"
        />
        <StatCard
          title="Avg Confidence"
          value={`${stats.avg_confidence ?? 0}%`}
          sub={`${stats.n_estimators ?? 200} decision trees`}
          icon={<Brain className="h-8 w-8 text-blue-500" />}
          accent="border-l-blue-400"
        />
        <StatCard
          title="Approval Rate"
          value={`${stats.approval_rate ?? 0}%`}
          sub={`${stats.approved_today ?? 0} approved today`}
          icon={<CheckCheck className="h-8 w-8 text-violet-500" />}
          accent="border-l-violet-400"
        />
      </div>
    )
  }

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="h-10 w-10 text-primary/50" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-1">No Recommendations Found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {filter === 'pending'
          ? 'All recommendations have been reviewed. Switch to "All" to see history.'
          : 'Run the model to generate treatment recommendations for consented patients.'}
      </p>
      <div className="flex gap-2">
        {filter !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
            View All
          </Button>
        )}
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Recommendations
        </Button>
      </div>
    </div>
  )

  const renderTable = () => {
    if (loading) return (
      <div className="space-y-3 p-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    )
    if (recommendations.length === 0) return renderEmptyState()

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-6"></TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Recommended Treatment</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map(rec => (
              <React.Fragment key={rec.id}>
                {/* Main Row */}
                <TableRow
                  className={`cursor-pointer transition-colors ${
                    rec.status === 'pending' ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-muted/30'
                  } ${expandedId === rec.id ? 'border-b-0' : ''}`}
                  onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                >
                  <TableCell className="pr-0">
                    {expandedId === rec.id
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(rec.patient_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-tight">{rec.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{rec.patient_code} · {rec.patient_age}y · {rec.patient_gender === 'M' ? 'Male' : 'Female'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{rec.current_condition}</p>
                      <p className="text-xs text-muted-foreground">
                        Tooth #{rec.tooth_number} · Pain {rec.pain_level}/10 · {rec.severity}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-semibold text-primary">{rec.recommended_treatment}</p>
                      {rec.alternatives?.length > 0 && (
                        <p className="text-xs text-muted-foreground">+{rec.alternatives.length} alternatives</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <ConfidenceBar value={rec.confidence_score} size="sm" />
                  </TableCell>
                  <TableCell>
                    <RiskBadge risk={rec.risk_level} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={rec.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatShortDate(rec.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDetail(rec)}>
                              <Lightbulb className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Full AI Explanation</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/patients/${rec.patient_id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View Patient</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {rec.status === 'pending' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 ml-1"
                          onClick={e => handleOpenReview(rec, e)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded Row — Quick AI Summary */}
                {expandedId === rec.id && (
                  <TableRow className={rec.status === 'pending' ? 'bg-amber-50/20' : 'bg-muted/10'}>
                    <TableCell colSpan={9} className="px-6 py-4 border-t border-dashed">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* AI Explanation snippet */}
                        <div className="md:col-span-2 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
                              <Brain className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-blue-700 mb-0.5">AI Reasoning</p>
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                {rec.explanation || 'No explanation available.'}
                              </p>
                            </div>
                          </div>

                          {/* Feature importance mini bars */}
                          {rec.feature_importance?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Key Decision Factors</p>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                {rec.feature_importance.slice(0, 4).map((f, i) => (
                                  <div key={i} className="space-y-0.5">
                                    <div className="flex justify-between text-xs">
                                      <span className="capitalize text-muted-foreground">{f.feature.replace(/_/g, ' ')}</span>
                                      <span className={f.impact_direction === 'positive' ? 'text-emerald-600' : 'text-red-600'}>
                                        {(f.importance * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${f.impact_direction === 'positive' ? 'bg-emerald-500' : f.impact_direction === 'negative' ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${f.importance * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Prediction snapshot */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome Snapshot</p>
                          {rec.outcome_prediction?.if_treated && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Success probability</span>
                                <span className="font-semibold text-emerald-600">{rec.outcome_prediction.if_treated.success_probability}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Pain reduction</span>
                                <span className="font-semibold">{rec.outcome_prediction.if_treated.pain_reduction}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Est. duration</span>
                                <span className="font-semibold">{rec.outcome_prediction.if_treated.estimated_duration_days}d</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Tree vote</span>
                                <span className="font-semibold">{rec.tree_votes_for}/{rec.total_trees}</span>
                              </div>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-7 mt-2"
                            onClick={e => { e.stopPropagation(); handleOpenDetail(rec) }}
                          >
                            Full Explanation
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // ─── Detail Dialog ────────────────────────────────────────────────────────

  const renderDetailDialog = () => {
    if (!selected) return null

    return (
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Dialog Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(selected.patient_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold leading-tight">{selected.patient_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.patient_code} · {selected.patient_age}y · {selected.patient_gender === 'M' ? 'Male' : 'Female'}
                    · Generated {formatShortDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <RiskBadge risk={selected.risk_level} />
                <StatusBadge status={selected.status} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={detailTab} onValueChange={setDetailTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid grid-cols-4 mx-6 mt-4 shrink-0">
              <TabsTrigger value="overview">
                <Brain className="h-3.5 w-3.5 mr-1.5" />Overview
              </TabsTrigger>
              <TabsTrigger value="outcomes">
                <HeartPulse className="h-3.5 w-3.5 mr-1.5" />Outcomes
              </TabsTrigger>
              <TabsTrigger value="evidence">
                <Users className="h-3.5 w-3.5 mr-1.5" />Evidence
              </TabsTrigger>
              <TabsTrigger value="explainability">
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />XAI
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 space-y-6">

                {/* ── OVERVIEW TAB ── */}
                <TabsContent value="overview" className="mt-0 space-y-5">
                  {/* Recommendation card */}
                  <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">AI Recommended Treatment</p>
                        <h3 className="text-2xl font-bold">{selected.recommended_treatment}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
                        <p className="text-3xl font-black text-primary">{selected.confidence_score}%</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ConfidenceBar value={selected.confidence_score} />
                    </div>
                    <Separator className="my-4" />
                    {/* Tree voting */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">{selected.tree_votes_for}</p>
                        <p className="text-xs text-muted-foreground">Trees voted for</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-500">{selected.tree_votes_against}</p>
                        <p className="text-xs text-muted-foreground">Trees voted against</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{selected.total_trees}</p>
                        <p className="text-xs text-muted-foreground">Total trees</p>
                      </div>
                    </div>
                  </div>

                  {/* Patient condition */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          Current Patient Condition
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { label: 'Diagnosis', value: selected.current_condition },
                          { label: 'Severity', value: selected.severity },
                          { label: 'Tooth #', value: selected.tooth_number },
                          { label: 'Pain Level', value: `${selected.pain_level}/10` },
                          { label: 'Model Version', value: selected.model_version },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Alternatives */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          Alternative Treatments
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        {selected.alternatives?.length > 0 ? selected.alternatives.map((alt, i) => (
                          <div key={i} className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{alt.treatment_name}</span>
                              <Badge variant="outline" className="text-xs">{alt.confidence}%</Badge>
                            </div>
                            {alt.rationale && (
                              <p className="text-xs text-muted-foreground">{alt.rationale}</p>
                            )}
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground">No alternatives available</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Reasoning */}
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 font-semibold">Why This Treatment Was Recommended</AlertTitle>
                    <AlertDescription className="text-blue-700 mt-1 leading-relaxed">
                      {selected.explanation || 'Explanation not available for this recommendation.'}
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* ── OUTCOMES TAB ── */}
                <TabsContent value="outcomes" className="mt-0 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* If Treated */}
                    <Card className="border-emerald-200">
                      <CardHeader className="bg-gradient-to-br from-emerald-50 to-transparent pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-5 w-5" />
                          If Treatment Is Applied
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {selected.outcome_prediction?.if_treated ? (
                          <>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Success Probability</span>
                                <span className="font-bold text-emerald-600">{selected.outcome_prediction.if_treated.success_probability}%</span>
                              </div>
                              <Progress value={selected.outcome_prediction.if_treated.success_probability} className="h-2" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pain Reduction</span>
                                <span className="font-bold">{selected.outcome_prediction.if_treated.pain_reduction}%</span>
                              </div>
                              <Progress value={selected.outcome_prediction.if_treated.pain_reduction} className="h-2" />
                            </div>
                            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Expected Outcome</span>
                                <span className="font-medium text-emerald-700">{selected.outcome_prediction.if_treated.expected_outcome}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Healing</span>
                                <span className="font-medium">{selected.outcome_prediction.if_treated.healing_improvement}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Est. Duration</span>
                                <span className="font-medium">{selected.outcome_prediction.if_treated.estimated_duration_days} days</span>
                              </div>
                            </div>
                          </>
                        ) : <p className="text-sm text-muted-foreground">No outcome data available</p>}
                      </CardContent>
                    </Card>

                    {/* If NOT Treated */}
                    <Card className="border-red-200">
                      <CardHeader className="bg-gradient-to-br from-red-50 to-transparent pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-red-700">
                          <XCircle className="h-5 w-5" />
                          If Treatment Is NOT Applied
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {selected.outcome_prediction?.if_not_treated ? (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 p-3">
                              <span className="text-sm text-muted-foreground">Urgency Level</span>
                              <span className={`text-sm font-bold ${
                                selected.outcome_prediction.if_not_treated.urgency_level === 'critical' ? 'text-red-700' :
                                selected.outcome_prediction.if_not_treated.urgency_level === 'high' ? 'text-orange-700' :
                                'text-amber-700'
                              }`}>
                                {selected.outcome_prediction.if_not_treated.urgency_level.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Risk of Worsening</p>
                              <p className="text-sm text-red-700 font-medium">{selected.outcome_prediction.if_not_treated.risk_of_worsening}</p>
                            </div>
                            {selected.outcome_prediction.if_not_treated.possible_complications?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Possible Complications</p>
                                <ul className="space-y-1">
                                  {selected.outcome_prediction.if_not_treated.possible_complications.map((c, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {selected.outcome_prediction.if_not_treated.potential_future_procedures?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Potential Future Procedures</p>
                                <ul className="space-y-1">
                                  {selected.outcome_prediction.if_not_treated.potential_future_procedures.map((p, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                      {p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : <p className="text-sm text-muted-foreground">No risk data available</p>}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ── EVIDENCE TAB (Similar Cases) ── */}
                <TabsContent value="evidence" className="mt-0 space-y-4">
                  <Alert className="border-primary/20 bg-primary/5">
                    <Users className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-semibold">Evidence-Based Comparison</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                      Historical patients with similar conditions who underwent the recommended treatment. All data is anonymized.
                    </AlertDescription>
                  </Alert>

                  {/* Current patient row */}
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-primary text-primary-foreground">Current Patient</Badge>
                        <span className="text-sm font-semibold">{selected.patient_name}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Condition</p><p className="font-medium">{selected.current_condition}</p></div>
                        <div><p className="text-xs text-muted-foreground">Tooth #</p><p className="font-medium">{selected.tooth_number}</p></div>
                        <div><p className="text-xs text-muted-foreground">Pain Level</p><p className="font-medium">{selected.pain_level}/10</p></div>
                        <div><p className="text-xs text-muted-foreground">Recommendation</p><p className="font-medium text-primary">{selected.recommended_treatment}</p></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Similar cases table */}
                  {selected.similar_cases?.length > 0 ? (
                    <div className="rounded-xl border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead>Case</TableHead>
                            <TableHead>Condition Before</TableHead>
                            <TableHead>Treatment Done</TableHead>
                            <TableHead>Condition After</TableHead>
                            <TableHead>Outcome</TableHead>
                            <TableHead>Similarity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.similar_cases.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground">Historical #{i + 1}</p>
                                  <p className="text-xs text-muted-foreground">{c.patient_code} · {c.age}y</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="text-sm">{c.condition_before}</p>
                                  <p className="text-xs text-muted-foreground">Pain {c.pain_level_before}/10 · Tooth #{c.tooth_number}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium text-primary">{c.treatment_performed}</span>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="text-sm">{c.condition_after}</p>
                                  <p className="text-xs text-muted-foreground">Pain reduced to {c.pain_level_after}/10</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <Badge variant="outline" className={`text-xs ${
                                    c.outcome_classification === 'Excellent' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                                    c.outcome_classification === 'Good' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                    'border-amber-300 text-amber-700 bg-amber-50'
                                  }`}>
                                    {c.outcome_classification}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground">{c.healing_status}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 min-w-[70px]">
                                  <p className="text-xs font-semibold text-primary">{(c.similarity_score * 100).toFixed(0)}%</p>
                                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.similarity_score * 100}%` }} />
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No similar historical cases found</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── XAI TAB ── */}
                <TabsContent value="explainability" className="mt-0 space-y-5">
                  {/* Feature importance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Feature Importance (Random Forest)
                      </CardTitle>
                      <CardDescription>
                        How much each patient attribute influenced the recommendation
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selected.feature_importance?.length > 0 ? selected.feature_importance.map((f, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{f.feature.replace(/_/g, ' ')}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">{f.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs">
                                Value: <span className="font-medium text-foreground">{f.value}</span>
                              </span>
                              <span className={`text-xs font-bold ${
                                f.impact_direction === 'positive' ? 'text-emerald-600' :
                                f.impact_direction === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                              }`}>
                                {(f.importance * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                f.impact_direction === 'positive' ? 'bg-emerald-500' :
                                f.impact_direction === 'negative' ? 'bg-red-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${f.importance * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{f.description}</p>
                        </div>
                      )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No feature importance data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Model metadata */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TreePine className="h-4 w-4 text-emerald-600" />
                        Random Forest Model Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Model Version', value: selected.model_version },
                          { label: 'Total Trees', value: selected.total_trees },
                          { label: 'Votes For', value: selected.tree_votes_for },
                          { label: 'Votes Against', value: selected.tree_votes_against },
                        ].map(({ label, value }) => (
                          <div key={label} className="text-center p-3 rounded-lg bg-muted/40">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-lg font-bold mt-1">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ethical notice */}
                  <Alert className="border-slate-200 bg-slate-50">
                    <Shield className="h-4 w-4 text-slate-600" />
                    <AlertTitle className="text-slate-700 font-semibold">Ethical AI Disclosure</AlertTitle>
                    <AlertDescription className="text-slate-600 text-xs leading-relaxed mt-1">
                      This recommendation is generated by a Random Forest Classifier trained exclusively on consented patient data.
                      It serves as a decision-support tool only. The final clinical decision rests entirely with the treating dentist.
                      Historical comparison cases are fully anonymized.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          {/* Dialog Footer */}
          <div className="border-t px-6 py-3 flex items-center justify-between bg-muted/20 shrink-0">
            <div className="text-xs text-muted-foreground">
              Model: {selected.model_version} · Generated {formatDate(selected.created_at)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowDetail(false)}>Close</Button>
              {selected.status === 'pending' && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { setShowDetail(false); handleOpenReview(selected) }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Review & Decide
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Review Dialog ────────────────────────────────────────────────────────

  const renderReviewDialog = () => {
    if (!reviewTarget) return null

    return (
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Clinical Review
            </DialogTitle>
            <DialogDescription>
              Review the AI recommendation and record your clinical decision
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Patient + recommendation summary */}
            <div className="rounded-xl bg-muted/40 border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(reviewTarget.patient_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{reviewTarget.patient_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {reviewTarget.patient_code} · {reviewTarget.patient_age}y · {reviewTarget.patient_gender === 'M' ? 'Male' : 'Female'}
                  </p>
                </div>
                <div className="ml-auto">
                  <RiskBadge risk={reviewTarget.risk_level} />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="font-medium">{reviewTarget.current_condition}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Recommendation</p>
                  <p className="font-semibold text-primary">{reviewTarget.recommended_treatment}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <ConfidenceBar value={reviewTarget.confidence_score} size="sm" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Success Probability</p>
                  <p className="font-semibold text-emerald-600">
                    {reviewTarget.outcome_prediction?.if_treated?.success_probability ?? '—'}%
                  </p>
                </div>
              </div>
            </div>

            {/* High risk warning */}
            {(reviewTarget.risk_level === 'high' || reviewTarget.risk_level === 'very_high') && reviewAction === 'approve' && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">High Risk — Confirm Before Approving</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs mt-1 space-y-1">
                  <p>Please confirm the following before proceeding:</p>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1">
                    <li>Patient has been informed of risks</li>
                    <li>Alternative treatments were discussed</li>
                    <li>Informed consent is documented</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Decision */}
            <div className="space-y-2">
              <Label>Clinical Decision</Label>
              <Select value={reviewAction} onValueChange={(v: any) => setReviewAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Approve — Proceed with recommended treatment
                    </div>
                  </SelectItem>
                  <SelectItem value="reject">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Reject — Do not proceed
                    </div>
                  </SelectItem>
                  <SelectItem value="modify">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-blue-500" />
                      Modify — Choose a different treatment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alternative treatment selector */}
            {reviewAction === 'modify' && (
              <div className="space-y-2">
                <Label>Select Alternative Treatment</Label>
                <Select value={modifiedTreatment} onValueChange={setModifiedTreatment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clinical notes */}
            <div className="space-y-2">
              <Label>Clinical Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="Document your clinical reasoning, observations, or concerns..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)} disabled={submittingReview}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submittingReview || (reviewAction === 'modify' && !modifiedTreatment)}
              className={reviewAction === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {submittingReview ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {submittingReview ? 'Submitting...' : `Confirm ${reviewAction.charAt(0).toUpperCase() + reviewAction.slice(1)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ─── Page Render ──────────────────────────────────────────────────────────

  return (
    <MainLayout
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <span>AI Treatment Recommendations</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleTrain} disabled={training}>
              {training
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              }
              {training ? 'Training...' : 'Retrain Model'}
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              {generating
                ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              }
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      }
      subtitle="Random Forest Classifier — evidence-based dental treatment decision support"
    >
      <div className="space-y-5">

        {/* Ethical notice */}
        <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent py-3">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-semibold text-primary">Clinical Decision Support Only. </span>
            <span className="text-muted-foreground">
              Recommendations are generated from a Random Forest model trained on consented patient data.
              All final treatment decisions remain with the treating dentist.
            </span>
          </AlertDescription>
        </Alert>

        {/* Stats */}
        {renderStats()}

        {/* Model info bar */}
        {stats && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <TreePine className="h-3.5 w-3.5 text-emerald-500" />
              {stats.n_estimators ?? 200} decision trees
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Last trained: {stats.last_training ? formatShortDate(stats.last_training) : 'Never'}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {stats.training_samples ?? 0} training samples
            </span>
            <span className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              {stats.consented_patients ?? 0} consented patients
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              v{stats.model_version}
            </Badge>
          </div>
        )}

        {/* Recommendations table */}
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recommendations</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {stats?.pending_review ?? 0} pending clinical review · Click a row to expand AI summary
                </CardDescription>
              </div>
              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                {(['pending', 'approved', 'rejected', 'all'] as FilterStatus[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filter === f
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, condition, or treatment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {renderTable()}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {renderDetailDialog()}
      {renderReviewDialog()}
    </MainLayout>
  )
}