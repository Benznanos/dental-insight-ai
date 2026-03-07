import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, Activity, FileCheck, TrendingUp, AlertTriangle, 
  Clock, ArrowRight, Calendar, PieChart, ChevronRight,
  Zap, FileText, LayoutDashboard, StickyNote, Plus, Trash2,
  Info, X
} from 'lucide-react'
import { api } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import StatCard from '@/components/dashboard/StatCard'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// Recharts components
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// Custom hook for media queries
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    window.addEventListener('resize', listener)
    return () => window.removeEventListener('resize', listener)
  }, [matches, query])

  return matches
}

// Filter types
type DateFilter = 'daily' | 'monthly' | 'yearly' | 'all'

interface FilterOption {
  label: string
  shortLabel: string
  value: DateFilter
  description: string
}

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'Today',     shortLabel: 'Today', value: 'daily',   description: "today's data" },
  { label: 'This Month',shortLabel: 'Month', value: 'monthly', description: "this month's data" },
  { label: 'This Year', shortLabel: 'Year',  value: 'yearly',  description: "this year's data" },
  { label: 'All Time',  shortLabel: 'All',   value: 'all',     description: 'all-time data' },
]

interface DashboardStats {
  total_patients: number
  total_treatments: number
  consented_patients: number
  success_rate: number
  recent_treatments: Array<{
    patient_name: string
    treatment_name: string
    treatment_date: string
    outcome_classification: string | null
  }>
  monthly_data: Array<{
    month: number
    count: number
  }>
  top_conditions: Array<{
    condition_name: string
    count: number
  }>
}

interface GenderStats {
  male_count: number
  female_count: number
  total_patients: number
}

interface GenderMonthlyData {
  month: string
  male: number
  female: number
  total: number
}

interface Note {
  id: string
  content: string
  created_at: string
  updated_at: string
  author: string
}

export function Dashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [genderStats, setGenderStats] = useState<GenderStats | null>(null)
  const [genderMonthlyData, setGenderMonthlyData] = useState<GenderMonthlyData[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeFilter, setActiveFilter] = useState<DateFilter>('all')
  const [filterAlertDismissed, setFilterAlertDismissed] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Colors for charts
  const GENDER_COLORS = { male: '#3b82f6', female: '#ec4899' }

  useEffect(() => {
    const showWelcome = sessionStorage.getItem('showWelcome')
    
    if (showWelcome === 'true') {
      setTimeout(() => {
        toast({
          title: "Welcome!",
          description: "You have successfully logged in.",
          duration: 2000,
          variant: "success",
        })
      }, 100)
  
      sessionStorage.removeItem('showWelcome')
    }

    loadGenderData()
    loadNotes()
  }, [toast])

  // Reload dashboard data when filter changes
  useEffect(() => {
    loadDashboardData()
    setFilterAlertDismissed(false)
  }, [activeFilter])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get<DashboardStats>('/reports/dashboard.php', {
        range: activeFilter
      })
      
      if (response.success && response.data) {
        setStats(response.data)
      } else {
        throw new Error('Failed to load dashboard data')
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error)
      setError(error.message || 'Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadGenderData = async () => {
    try {
      const genderResponse = await api.get<GenderStats>('/reports/gender_stats.php')
      if (genderResponse.success && genderResponse.data) {
        setGenderStats(genderResponse.data)
      }

      const monthlyResponse = await api.get<GenderMonthlyData[]>('/reports/gender_monthly_stats.php', {
        range: '12months'
      })
      if (monthlyResponse.success && monthlyResponse.data) {
        setGenderMonthlyData(monthlyResponse.data)
      }
    } catch (error) {
      console.error('Failed to load gender data:', error)
    }
  }

  const loadNotes = async () => {
    try {
      const response = await api.get<Note[]>('/notes/list.php')
      if (response.success && response.data) {
        setNotes(response.data)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const getInitials = (patientName: string) => {
    const nameParts = patientName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts[nameParts.length - 1] || ''
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast({
        title: "Error",
        description: "Note content cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post('/notes/create.php', {
        content: newNoteContent
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Note added successfully",
          duration: 3000,
        })
        setNewNoteContent('')
        setIsAddNoteOpen(false)
        loadNotes()
      } else {
        throw new Error(response.message || 'Failed to add note')
      }
    } catch (error: any) {
      console.error('Failed to add note:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to add note',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNoteId) return

    setIsSubmitting(true)
    try {
      const response = await api.delete('/notes/delete.php', {
        id: selectedNoteId
      })

      if (response.success) {
        toast({
          title: "Success",
          description: "Note deleted successfully",
          duration: 3000,
        })
        setIsDeleteDialogOpen(false)
        setSelectedNoteId(null)
        loadNotes()
      } else {
        throw new Error(response.message || 'Failed to delete note')
      }
    } catch (error: any) {
      console.error('Failed to delete note:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to delete note',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = (noteId: string) => {
    setSelectedNoteId(noteId)
    setIsDeleteDialogOpen(true)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOutcomeBadgeVariant = (outcome: string | null) => {
    if (!outcome) return 'outline'
    switch (outcome.toLowerCase()) {
      case 'excellent': return 'success'
      case 'good': return 'default'
      case 'pending': return 'secondary'
      case 'fair': return 'secondary'
      default: return 'destructive'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: isMobile ? 'numeric' : 'short', 
      day: 'numeric' 
    })
  }

  // Get human-readable label for current filter
  const getFilterLabel = () => {
    return FILTER_OPTIONS.find(f => f.value === activeFilter)?.description || 'all-time data'
  }

  // Get the date range description for the alert
  const getFilterDateRange = () => {
    const now = new Date()
    switch (activeFilter) {
      case 'daily':
        return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      case 'monthly':
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'yearly':
        return `January 1 – December 31, ${now.getFullYear()}`
      default:
        return 'All records in the system'
    }
  }

  const statCards = stats ? [
    {
      title: 'Total Patients',
      value: stats.total_patients,
      change: 'Registered in system',
      changeType: 'neutral' as const,
      changeColor: 'text-blue-600',
      changeBg: 'bg-blue-50', 
      icon: Users,
      iconColor: "text-blue-600"
    },
    {
      title: 'Total Treatments',
      value: stats.total_treatments,
      change: 'Procedure performed',
      changeType: 'neutral' as const,
      changeColor: 'text-blue-600',
      changeBg: 'bg-blue-50', 
      icon: Activity,
    },
    {
      title: 'Consented Patients',
      value: stats.consented_patients,
      change: stats.total_patients > 0 
        ? `${Math.round((stats.consented_patients / stats.total_patients) * 100)}% of patients`
        : 'No patients yet',
      changeType: stats.consented_patients > 0 ? 'positive' as const : 'negative' as const,
      changeColor: stats.consented_patients > 0 ? 'text-green-600' : 'text-amber-600',
      changeBg: stats.consented_patients > 0 ? 'bg-green-50' : 'bg-amber-50',
      icon: FileText,
    },
    {
      title: 'Success Rate',
      value: `${stats.success_rate}%`,
      change: 'Treatment outcomes',
      changeType: stats.success_rate > 70 ? 'positive' as const : 
                stats.success_rate > 50 ? 'neutral' as const : 'negative' as const,
      changeColor: stats.success_rate > 70 ? 'text-green-600' : 
                  stats.success_rate > 50 ? 'text-blue-600' : 'text-red-600',
      changeBg: stats.success_rate > 70 ? 'bg-green-50' : 
                stats.success_rate > 50 ? 'bg-blue-50' : 'bg-red-50',
      icon: TrendingUp,
    },
  ] : []

  const genderPieData = genderStats ? [
    { name: 'Male', value: genderStats.male_count, color: GENDER_COLORS.male },
    { name: 'Female', value: genderStats.female_count, color: GENDER_COLORS.female },
  ] : []

  const totalGenderPatients = genderStats ? genderStats.male_count + genderStats.female_count : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}: {entry.value} visits
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderPieLabel = (entry: any) => {
    const percent = entry.percent || 0
    return `${entry.name} ${(percent * 100).toFixed(0)}%`
  }

  const renderMobileTreatments = () => (
    <div className="divide-y">
      {stats?.recent_treatments && stats.recent_treatments.length > 0 ? (
        stats.recent_treatments.slice(0, 5).map((treatment, index) => (
          <div 
            key={index} 
            className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
            style={{ animationDelay: `${500 + index * 50}ms` }}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary/10 text-primary">
                {getInitials(treatment.patient_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-foreground truncate">{treatment.patient_name}</p>
                  <Badge 
                    variant={getOutcomeBadgeVariant(treatment.outcome_classification)} 
                    className="ml-2 shrink-0"
                  >
                    {treatment.outcome_classification || 'Pending'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate">{treatment.treatment_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-11">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(treatment.treatment_date)}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          No treatments found for {getFilterLabel()}
        </div>
      )}
    </div>
  )

  const renderDesktopTreatments = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold whitespace-nowrap">Patient</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Treatment</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Date</TableHead>
            <TableHead className="font-semibold text-right whitespace-nowrap">Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats?.recent_treatments && stats.recent_treatments.length > 0 ? (
            stats.recent_treatments.slice(0, 5).map((treatment, index) => (
              <TableRow 
                key={index} 
                className="transition-all duration-200 hover:bg-primary/5 hover:scale-[1.01] cursor-default group"
                style={{ animationDelay: `${500 + index * 50}ms` }}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary/10 text-primary">
                      {getInitials(treatment.patient_name)}
                    </div>
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {treatment.patient_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{treatment.treatment_name}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(treatment.treatment_date)}
                </TableCell>
                <TableCell className="text-right">
                  {treatment.outcome_classification ? (
                    <Badge 
                      variant={getOutcomeBadgeVariant(treatment.outcome_classification)} 
                      className="font-medium transition-all duration-200 group-hover:scale-105"
                    >
                      {treatment.outcome_classification}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-medium">Pending</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No treatments found for {getFilterLabel()}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  if (loading) {
    return (
      <MainLayout 
        title={
          <div className="flex items-center justify-between w-full">
            <span>Dashboard</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="sm:hidden">
                {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
              </span>
            </div>
          </div>
        } 
        subtitle="Loading your practice overview..."
      >
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-lg sm:rounded-xl border shadow-sm p-4 sm:p-6 animate-pulse">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="h-8 sm:h-10 w-8 sm:w-10 bg-muted rounded-lg" />
                  <div className="h-5 sm:h-6 w-16 sm:w-20 bg-muted rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-muted rounded" />
                  <div className="h-6 sm:h-8 w-12 sm:w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-card rounded-lg sm:rounded-xl border shadow-sm animate-pulse">
                <div className="p-4 sm:p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 sm:h-5 w-24 sm:w-32 bg-muted rounded" />
                      <div className="h-3 sm:h-4 w-32 sm:w-48 bg-muted rounded" />
                    </div>
                    <div className="h-6 sm:h-8 w-16 sm:w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-3 sm:h-4 w-24 sm:w-32 bg-muted rounded" />
                        <div className="h-2 sm:h-3 w-20 sm:w-24 bg-muted rounded" />
                      </div>
                      <div className="h-5 sm:h-6 w-12 sm:w-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout 
        title={
          <div className="flex items-center justify-between w-full">
            <span>Dashboard</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        } 
        subtitle="Overview of your dental practice management system"
      >
        <Alert variant="destructive" className="mx-4 sm:mx-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </MainLayout>
    )
  }

  if (!stats) {
    return (
      <MainLayout 
        title={<div className="flex items-center justify-between w-full"><span>Dashboard</span></div>}
        subtitle="Overview of your dental practice management system"
      >
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <span>Dashboard</span>
          </div>

          {/* Date + Filter — right side of title bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`
                    inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium
                    border transition-all duration-200
                    ${activeFilter === option.value
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                    }
                  `}
                >
                  {isMobile ? option.shortLabel : option.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border hidden sm:block" />

            {/* Calendar date */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="sm:hidden">
                {new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      }  
      subtitle="Overview of your dental practice management system"
    >

      {/* ── Filter Active Alert ── */}
      {activeFilter !== 'all' && !filterAlertDismissed && (
        <div
          className="mb-4 sm:mb-5 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Info className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="flex-1 text-sm text-foreground leading-snug">
              <span className="font-semibold text-primary">
                {FILTER_OPTIONS.find(f => f.value === activeFilter)?.label} view active.
              </span>{' '}
              All statistics below are filtered to{' '}
              <span className="font-medium">{getFilterDateRange()}</span>.{' '}
              Patient counts and Gender Distribution always reflect all-time totals.
            </p>
            <button
              onClick={() => setFilterAlertDismissed(true)}
              className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        {statCards.map((stat, index) => (
          <div 
            key={stat.title} 
            className="opacity-0 animate-fade-in-up"
            style={{ 
              animationDelay: `${150 + index * 100}ms`,
              animationFillMode: 'forwards' 
            }}
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {/* Recent Treatments */}
          <Card className="opacity-0 animate-slide-in-left overflow-hidden" 
                style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-4 px-4 sm:px-6">
              <div>
                <CardTitle className="text-base sm:text-lg">Recent Treatments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {activeFilter === 'all'
                    ? isMobile ? 'Latest procedures' : 'Latest treatment procedures performed'
                    : `Treatments for ${getFilterLabel()}`}
                </CardDescription>
              </div>
              <Link to="/treatments">
                <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-primary hover:text-primary/80 hover:bg-primary/10 group text-xs sm:text-sm">
                  {isMobile ? 'View' : 'View All'}
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isMobile ? renderMobileTreatments() : renderDesktopTreatments()}
            </CardContent>
            {stats.recent_treatments && stats.recent_treatments.length > 5 && (
              <CardFooter className="border-t px-4 sm:px-6 py-2 sm:py-3">
                <Link to="/treatments" className="ml-auto">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary group text-xs sm:text-sm">
                    View all {stats.recent_treatments.length} treatments
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* Demographic Insights */}
          <Card className="opacity-0 animate-scale-in overflow-hidden border shadow-sm" 
                style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
            <CardHeader className="px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg leading-tight">
                      Demographic Insights
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      Gender distribution and monthly trends — all-time totals
                    </CardDescription>
                  </div>
                </div>
                {totalGenderPatients > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-semibold bg-primary/10 text-primary border-0 rounded-full px-3"
                  >
                    {totalGenderPatients} total
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pt-4 pb-2">
              <Tabs defaultValue="distribution" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/40 p-1 rounded-xl h-9">
                  <TabsTrigger 
                    value="distribution" 
                    className="text-xs sm:text-sm rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium transition-all"
                  >
                    <PieChart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Distribution
                  </TabsTrigger>
                  <TabsTrigger 
                    value="trend" 
                    className="text-xs sm:text-sm rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-medium transition-all"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Monthly Trend
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="distribution" className="mt-0 space-y-4">
                  {genderPieData.length > 0 && totalGenderPatients > 0 ? (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                          <Pie
                            data={genderPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                            label={renderPieLabel}
                            labelLine={false}
                          >
                            {genderPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [`${value} patients`, 'Count']}
                            contentStyle={{ 
                              fontSize: '12px', 
                              borderRadius: '10px',
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1)',
                              padding: '8px 12px'
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                      <div className="p-4 rounded-full bg-muted/50">
                        <Users className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">No gender data available</p>
                    </div>
                  )}

                  {totalGenderPatients > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-transparent p-4">
                        <div className="absolute -top-3 -right-3 h-14 w-14 rounded-full bg-blue-100/60 dark:bg-blue-900/20" />
                        <div className="absolute -bottom-4 -left-2 h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/20" />
                        <p className="text-xs text-muted-foreground font-medium mb-2 relative z-10">Male</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 relative z-10 leading-none">
                          {genderStats?.male_count || 0}
                        </p>
                        <div className="mt-2 relative z-10">
                          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
                            {genderStats ? Math.round((genderStats.male_count / totalGenderPatients) * 100) : 0}%
                          </span>
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-xl border border-pink-100 dark:border-pink-900/40 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-transparent p-4">
                        <div className="absolute -top-3 -right-3 h-14 w-14 rounded-full bg-pink-100/60 dark:bg-pink-900/20" />
                        <div className="absolute -bottom-4 -left-2 h-10 w-10 rounded-full bg-pink-50 dark:bg-pink-950/20" />
                        <p className="text-xs text-muted-foreground font-medium mb-2 relative z-10">Female</p>
                        <p className="text-3xl font-bold text-pink-600 dark:text-pink-400 relative z-10 leading-none">
                          {genderStats?.female_count || 0}
                        </p>
                        <div className="mt-2 relative z-10">
                          <span className="inline-flex items-center rounded-full bg-pink-100 dark:bg-pink-900/50 px-2 py-0.5 text-xs font-semibold text-pink-600 dark:text-pink-300">
                            {genderStats ? Math.round((genderStats.female_count / totalGenderPatients) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="trend" className="mt-0">
                  {genderMonthlyData.length > 0 ? (
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={genderMonthlyData.slice(-6)} 
                          margin={{ top: 15, right: 15, left: 0, bottom: 30 }}
                        >
                          <defs>
                            <linearGradient id="maleGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="femaleGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} opacity={0.8} />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                            dx={-5}
                          />
                          <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                          <Legend 
                            iconSize={8}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', paddingTop: '8px', bottom: 0 }}
                            verticalAlign="bottom"
                            height={32}
                          />
                          <Line 
                            type="linear"
                            dataKey="male" 
                            stroke="#3b82f6" 
                            name="Male"
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: "#fff", stroke: "#3b82f6", strokeWidth: 2 }}
                            activeDot={{ r: 5, fill: "#3b82f6", stroke: '#fff', strokeWidth: 2 }}
                          />
                          <Line 
                            type="linear"
                            dataKey="female" 
                            stroke="#ec4899" 
                            name="Female"
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: "#fff", stroke: "#ec4899", strokeWidth: 2 }}
                            activeDot={{ r: 5, fill: "#ec4899", stroke: '#fff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                      <div className="p-4 rounded-full bg-muted/50">
                        <TrendingUp className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">No monthly trend data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="border-t bg-muted/10 px-4 sm:px-6 py-2.5">
              <Link to="/reports?tab=demographics" className="w-full">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full gap-2 group text-xs sm:text-sm hover:bg-primary/5 text-primary h-8"
                >
                  View Detailed Demographics
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Top Conditions */}
          {stats.top_conditions && stats.top_conditions.length > 0 && (
            <Card className="opacity-0 animate-scale-in overflow-hidden border shadow-sm" 
                  style={{ animationDelay: '550ms', animationFillMode: 'forwards' }}>
              <CardHeader className="px-4 sm:px-6 py-4 border-b bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <PieChart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg leading-tight">
                        Most Common Conditions
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-0.5">
                        {activeFilter === 'all'
                          ? isMobile ? 'Top conditions treated' : 'Top dental conditions treated'
                          : `Top conditions for ${getFilterLabel()}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-semibold bg-primary/10 text-primary border-0 rounded-full px-3"
                  >
                    {stats.top_conditions.length} conditions
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 py-5">
                {(() => {
                  const top = stats.top_conditions[0]
                  return (
                    <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">#1</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">Most Frequent</p>
                          <p className="text-sm font-semibold truncate">{top.condition_name}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-2xl font-bold text-primary">{top.count}</p>
                        <p className="text-xs text-muted-foreground">cases</p>
                      </div>
                    </div>
                  )
                })()}

                <div 
                  style={{ 
                    height: isMobile 
                      ? `${3 * 48}px` 
                      : `${Math.min(5, stats.top_conditions.length) * 48}px` 
                  }}
                  className="w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={stats.top_conditions.slice(0, isMobile ? 3 : 5)}
                      margin={{ top: 0, right: 45, left: 0, bottom: 0 }}
                      barSize={12}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="condition_name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={115}
                        tickFormatter={(value) => 
                          value.length > 17 ? `${value.substring(0, 17)}...` : value
                        }
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted) / 0.5)', radius: 6 }}
                        contentStyle={{
                          fontSize: '12px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 8px 16px -4px rgb(0 0 0 / 0.1)',
                          padding: '8px 12px'
                        }}
                        formatter={(value) => [`${value} cases`, 'Count']}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))"
                        radius={6}
                        background={{ fill: 'hsl(var(--muted))', radius: 6 }}
                        label={{ 
                          position: 'right', 
                          fontSize: 11, 
                          fill: '#6b7280',
                          fontWeight: 600,
                          formatter: (value: any) => `${value}`
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {isMobile ? Math.min(3, stats.top_conditions.length) : Math.min(5, stats.top_conditions.length)} of {stats.top_conditions.length} conditions
                  </span>
                  <span className="font-medium">
                    {stats.top_conditions.slice(0, isMobile ? 3 : 5).reduce((sum, c) => sum + c.count, 0)} total cases
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-6">

          {/* System Alerts */}
          <div className="space-y-3 sm:space-y-4">
            {stats.total_patients === 0 && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 opacity-0 animate-fade-in-up p-3 sm:p-4" 
                     style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                <AlertDescription className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                  <strong className="block sm:inline">Welcome to Dental Insight AI!</strong> 
                  <span className="block sm:inline sm:ml-1">
                    {isMobile ? 'Add patients to start.' : 'Start by adding patients, recording treatments, and granting consent for AI training.'}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {stats.total_patients > 0 && stats.consented_patients === 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 opacity-0 animate-fade-in-up p-3 sm:p-4"
                     style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600 shrink-0" />
                <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                  <strong>AI Training Available:</strong> 
                  <span className="block sm:inline sm:ml-1">
                    {isMobile 
                      ? `${stats.total_patients} patients. Enable consent.`
                      : `You have ${stats.total_patients} patients registered. Visit the Consent page to enable AI training.`}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {stats.consented_patients >= 10 && (
              <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-3 sm:p-5 shadow-sm">
                <div className="absolute top-0 right-0 h-24 sm:h-32 w-24 sm:w-32 -mr-8 -mt-8 rounded-full bg-primary/5" />
                <div className="absolute bottom-0 left-0 h-16 sm:h-24 w-16 sm:w-24 -ml-8 -mb-8 rounded-full bg-primary/5" />
                
                <div className="relative flex items-start gap-2 sm:gap-4">
                  <div className="relative flex h-8 sm:h-10 w-8 sm:w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping opacity-75" />
                    <Zap className="h-4 sm:h-5 w-4 sm:w-5 text-primary relative z-10" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1 sm:gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-primary">Ready for AI Training</h4>
                      <span className="inline-flex h-4 sm:h-5 items-center rounded-full border border-primary/20 bg-primary/5 px-1.5 sm:px-2 text-xs font-medium text-primary">
                        {stats.consented_patients} consented
                      </span>
                    </div>
                    
                    <p className="mb-2 sm:mb-3 text-xs sm:text-sm text-muted-foreground">
                      {isMobile 
                        ? `${stats.consented_patients} patients consented.`
                        : `You have ${stats.consented_patients} patients who consented. Visit AI Recommendations to train your model.`}
                    </p>
                    
                    <Link to="/ai-recommendation">
                      <Button size="sm" className="h-7 sm:h-8 gap-1 sm:gap-1.5 text-xs">
                        <TrendingUp className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                        {isMobile ? 'AI Recs' : 'Go to AI Recommendations'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Practice Overview */}
          <Card className="opacity-0 animate-scale-in" 
                style={{ animationDelay: '650ms', animationFillMode: 'forwards' }}>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Practice Overview
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {activeFilter === 'all'
                  ? isMobile ? 'Key metrics' : 'Key metrics and performance indicators'
                  : `Key metrics for ${getFilterLabel()}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4 sm:space-y-6">
              {/* Consent Rate */}
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FileCheck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Consent Rate</span>
                  </div>
                  <span className="font-bold text-sm sm:text-lg">
                    {stats.total_patients > 0 
                      ? `${Math.round((stats.consented_patients / stats.total_patients) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="relative h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out"
                    style={{ 
                      width: stats.total_patients > 0 ? `${(stats.consented_patients / stats.total_patients) * 100}%` : '0%',
                      animation: 'slideIn 1s ease-out'
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.consented_patients} of {stats.total_patients} patients
                </p>
              </div>

              <Separator />

              {/* Success Rate */}
              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Success Rate</span>
                  </div>
                  <span className="font-bold text-sm sm:text-lg">{stats.success_rate}%</span>
                </div>
                <div className="relative h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out ${
                      stats.success_rate > 70 ? 'bg-green-500' :
                      stats.success_rate > 50 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${stats.success_rate}%`, animation: 'slideIn 1s ease-out 0.2s' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {stats.total_treatments} treatments
                </p>
              </div>

              <Separator />

              {/* Monthly Performance */}
              {stats.monthly_data && stats.monthly_data.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    <span>Monthly Performance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="bg-muted/50 rounded-lg p-2 sm:p-3 hover:bg-muted/70 transition-colors">
                      <p className="text-xs text-muted-foreground">Current Month</p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {stats.monthly_data[stats.monthly_data.length - 1]?.count || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">treatments</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 sm:p-3 hover:bg-muted/70 transition-colors">
                      <p className="text-xs text-muted-foreground">Monthly Avg</p>
                      <p className="text-lg sm:text-2xl font-bold">
                        {Math.round(stats.monthly_data.reduce((acc, curr) => acc + curr.count, 0) / stats.monthly_data.length)}
                      </p>
                      <p className="text-xs text-muted-foreground">treatments</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-0.5 sm:space-y-1 hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground">Total Patients</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.total_patients}</p>
                </div>
                <div className="space-y-0.5 sm:space-y-1 hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground">Total Treatments</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.total_treatments}</p>
                </div>
                <div className="space-y-0.5 sm:space-y-1 hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground">Consented</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.consented_patients}</p>
                </div>
                <div className="space-y-0.5 sm:space-y-1 hover:scale-105 transition-transform">
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                  <p className="text-lg sm:text-xl font-bold">{stats.success_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="opacity-0 animate-scale-in overflow-hidden shadow-md"
                style={{ animationDelay: '700ms', animationFillMode: 'forwards', borderTop: '3px solid hsl(var(--primary))', borderRadius: '14px' }}>
            <CardHeader className="px-4 sm:px-6 py-3 flex flex-row items-center justify-between border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 ring-1 ring-primary/20">
                  <StickyNote className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg leading-tight">Notes</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/70 mt-0.5">
                    Add and manage personal notes
                  </CardDescription>
                </div>
              </div>
              <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5 bg-primary/90 hover:bg-primary shadow-sm text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Note</DialogTitle>
                    <DialogDescription>
                      Create a new note. You can delete it anytime.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Textarea
                      placeholder="Enter your note here..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={5}
                      className="resize-none focus-visible:ring-1 focus-visible:ring-primary bg-muted/20 border-muted-foreground/20"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddNote} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
                      {isSubmitting ? 'Saving...' : 'Save Note'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 py-0">
              {notes.length > 0 ? (
                <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                  {notes.map((note, index) => (
                    <div
                      key={note.id}
                      className={`group py-3.5 px-2 rounded-lg my-1 ${
                        index !== notes.length - 1 ? 'border-b border-muted-foreground/10' : ''
                      } hover:bg-muted/40 transition-all duration-150`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-foreground/90">{note.content}</p>
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/60">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatDateTime(note.created_at)}</span>
                            {note.created_at !== note.updated_at && (
                              <>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="italic text-muted-foreground/50">edited</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive rounded-full"
                          onClick={() => confirmDelete(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-primary/8 p-3.5 rounded-full mb-3 ring-1 ring-primary/10">
                    <StickyNote className="h-7 w-7 text-primary/30" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground/50 mt-1 max-w-[180px] leading-relaxed">
                    Click "Add Note" to create your first note
                  </p>
                </div>
              )}
            </CardContent>

            {notes.length > 0 && (
              <CardFooter className="border-t bg-muted/10 px-4 sm:px-6 py-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground/60">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} total
                </p>
              </CardFooter>
            )}
          </Card>

          {/* View Detailed Reports */}
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '750ms', animationFillMode: 'forwards' }}>
            <Link to="/reports" className="w-full block">
              <Button variant="outline" className="w-full gap-2 group text-primary">
                View Detailed Reports
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Delete Note Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteNote}
              disabled={isSubmitting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes slideIn {
          from { width: 0; opacity: 0.5; }
          to { width: var(--target-width); opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.5s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </MainLayout>
  )
}