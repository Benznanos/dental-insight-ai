import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  User,
  FileText,
  Phone,
  Pencil,
  Mail,
  Calendar,
  MapPin,
  AlertCircle,
  Pill,
  Clock,
  Heart,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Activity,
  Square,
  Wallet
} from 'lucide-react'
import { api } from '@/services/api'
import { Patient, PatientTreatment } from '@/types'
import { TreatmentForm } from '@/components/forms/TreatmentForm'
import { OutcomeForm } from '@/components/forms/OutcomeForm'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatCurrency } from '@/lib/utils'

// Tooth conditions (same as PatientForm)
type ToothCondition = 
  | 'present'
  | 'missing'
  | 'filled'
  | 'caries'
  | 'root'
  | 'crown'
  | 'bridge'
  | 'implant'

const toothConditions: Record<ToothCondition, { label: string; color: string; description: string }> = {
  present: { label: 'Present', color: '#22c55e', description: 'Healthy tooth present' },
  missing: { label: 'Missing', color: '#ef4444', description: 'Tooth is missing' },
  filled: { label: 'Filled', color: '#3b82f6', description: 'Tooth has filling' },
  caries: { label: 'Caries', color: '#eab308', description: 'Tooth has caries/cavity' },
  root: { label: 'Root', color: '#8b5cf6', description: 'Only root remains' },
  crown: { label: 'Crown', color: '#ec4899', description: 'Tooth has crown' },
  bridge: { label: 'Bridge', color: '#06b6d4', description: 'Part of bridge' },
  implant: { label: 'Implant', color: '#f97316', description: 'Dental implant' },
}

// FDI tooth numbering - permanent teeth
const permanentTeethUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const permanentTeethLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

type ToothStatus = {
  [key: number]: ToothCondition
}

// Simple Tooth SVG Component (read-only version)
const ToothSVG = ({ 
  toothNumber, 
  condition, 
  size = 40
}: { 
  toothNumber: number
  condition: ToothCondition
  size?: number
}) => {
  const color = toothConditions[condition]?.color || '#22c55e'
  
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Tooth body */}
        <path
          d="M20 5C25 5 30 8 30 15C30 25 25 35 20 35C15 35 10 25 10 15C10 8 15 5 20 5Z"
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="2"
        />
        
        {/* Tooth cusps */}
        <path
          d="M15 10C17 8 18 10 20 10C22 10 23 8 25 10"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      
      {/* Tooth number */}
      <span className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold ${
        condition === 'missing' ? 'text-white' : 'text-gray-800'
      }`}>
        {toothNumber}
      </span>
    </div>
  )
}

export function PatientDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [treatments, setTreatments] = useState<PatientTreatment[]>([])
  const [dentalChart, setDentalChart] = useState<ToothStatus>({})
  const [loading, setLoading] = useState(true)
  const [showAddTreatment, setShowAddTreatment] = useState(false)
  const [showAddOutcome, setShowAddOutcome] = useState(false)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<number | null>(null)

  useEffect(() => {
    if (id) {
      loadPatientData()
    }
  }, [id])

  const loadPatientData = async () => {
    try {
      setLoading(true)
      
      // Load patient details
      const patientResponse = await api.get<Patient>(`/patients/read.php`, { id: Number(id) })
      if (patientResponse.success && patientResponse.data) {
        setPatient(patientResponse.data)
      }

      // Load patient treatments
      const treatmentsResponse = await api.get<PatientTreatment[]>('/treatments/read.php', {
        patient_id: Number(id)
      })
      if (treatmentsResponse.success && treatmentsResponse.data) {
        setTreatments(treatmentsResponse.data)
      }

      // Load dental chart data
      const dentalChartResponse = await api.get<any[]>('/dental-charts/read.php', {
        patient_id: Number(id)
      })
      if (dentalChartResponse.success && dentalChartResponse.data) {
        // Convert array to ToothStatus object
        const chartData: ToothStatus = {}
        dentalChartResponse.data.forEach((item: any) => {
          chartData[item.tooth_number] = item.tooth_condition as ToothCondition
        })
        setDentalChart(chartData)
      }
    } catch (error) {
      console.error('Failed to load patient data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load patient data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTreatmentAdded = () => {
    setShowAddTreatment(false)
    loadPatientData()
    toast({
      title: 'Success',
      description: 'Treatment record added successfully'
    })
  }

  const handleOutcomeAdded = () => {
    setShowAddOutcome(false)
    setSelectedTreatmentId(null)
    loadPatientData()
    toast({
      title: 'Success',
      description: 'Treatment outcome recorded successfully'
    })
  }

  const getOutcomeBadgeVariant = (outcome?: string) => {
    switch (outcome?.toLowerCase()) {
      case 'excellent':
      case 'good':
        return 'default'
      case 'fair':
        return 'secondary'
      case 'poor':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome?.toLowerCase()) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="h-4 w-4 mr-1" />
      case 'fair':
        return <AlertTriangle className="h-4 w-4 mr-1" />
      case 'poor':
        return <AlertCircle className="h-4 w-4 mr-1" />
      default:
        return <Clock className="h-4 w-4 mr-1" />
    }
  }

  const getToothCondition = (toothNumber: number): ToothCondition => {
    return dentalChart[toothNumber] || 'present'
  }

  // Calculate statistics
  const totalCost = treatments.reduce((sum, treatment) => sum + (treatment.actual_cost || 0), 0)
  const completedTreatments = treatments.filter(t => t.outcome_classification).length
  const pendingTreatments = treatments.length - completedTreatments
  const lastTreatment = treatments.length > 0 
    ? treatments.reduce((latest, current) => 
        new Date(current.treatment_date) > new Date(latest.treatment_date) ? current : latest
      )
    : null

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>

        {/* Quick Info Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
        <Button asChild className="mt-4">
          <div onClick={() => navigate('/patients')}>Back to Patients</div>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
  {/* Header */}
  <div className="flex items-center gap-4 animate-slide-in-left">
        <Button variant="ghost" size="icon" onClick={() => navigate('/patients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {patient.first_name} {patient.middle_name} {patient.last_name}
            </h1>
            {patient.has_ai_consent && (
              <Badge className="bg-primary text-primary-foreground">AI Consented</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {patient.age} years old • {patient.gender === 'M' ? 'Male' : 'Female'} • Patient ID: {patient.patient_code}
          </p>
        </div>
        <Button 
  variant="outline" 
  onClick={() => navigate(`/patients/${id}/edit`)}
  className="hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
>
  <Pencil className="h-4 w-4 mr-2" />
  Edit Profile
</Button>
        <Dialog open={showAddTreatment} onOpenChange={setShowAddTreatment}>
          <DialogTrigger asChild>
            <Button className="group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md hover:shadow-primary/30 transition-all duration-200 active:scale-95">
              <Plus className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              Treatment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Treatment Record</DialogTitle>
            </DialogHeader>
            <TreatmentForm patientId={patient.id} onSuccess={handleTreatmentAdded} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-card/50 animate-fade-in animation-delay-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="font-medium text-sm">{patient.contact_number || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 animate-fade-in animation-delay-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-sm truncate">{patient.email || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 animate-fade-in animation-delay-300">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Treatment</p>
              <p className="font-medium text-sm">{lastTreatment ? formatDate(lastTreatment.treatment_date) : "Never"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 animate-fade-in animation-delay-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-warning/10">
              <Wallet className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Cost</p>
              <p className="font-medium text-sm">{formatCurrency(totalCost)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 animate-fade-in animation-delay-300">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><User className="w-4 h-4" />Overview</TabsTrigger>
          <TabsTrigger value="medical" className="gap-2"><Heart className="w-4 h-4" />Medical History</TabsTrigger>
          <TabsTrigger value="treatments" className="gap-2"><Clock className="w-4 h-4" />Treatment History</TabsTrigger>
          <TabsTrigger value="dental-chart" className="gap-2"><FileText className="w-4 h-4" />Dental Chart</TabsTrigger>
          <TabsTrigger value="statistics" className="gap-2"><Activity className="w-4 h-4" />Statistics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Age</p>
                    <p className="font-medium">{patient.age} years old</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="font-medium">{patient.gender === 'M' ? 'Male' : 'Female'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Birthdate</p>
                    <p className="font-medium">{formatDate(patient.birthdate) || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Occupation</p>
                    <p className="font-medium">{patient.occupation || "-"}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p className="font-medium">{patient.address || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Contact Number</p>
                      <p className="font-medium">{patient.contact_number || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{patient.email || "-"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Alerts */}
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
                  Medical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {patient.allergies && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.split(',').map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {allergy.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {patient.medical_history && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Medical History</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{patient.medical_history}</p>
                  </div>
                )}
                {patient.current_medications && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Medications</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Pill className="h-4 w-4 text-primary" />
                      <span>{patient.current_medications}</span>
                    </div>
                  </div>
                )}
                {(!patient.allergies && !patient.medical_history && !patient.current_medications) && (
                  <p className="text-sm text-muted-foreground">No medical alerts</p>
                )}
              </CardContent>
            </Card>

            {/* Treatment Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Treatment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-primary/5">
                    <p className="text-2xl font-bold text-primary">{treatments.length}</p>
                    <p className="text-xs text-muted-foreground">Total Treatments</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/5">
                    <p className="text-2xl font-bold text-success">{completedTreatments}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-warning/5">
                    <p className="text-2xl font-bold text-warning">{pendingTreatments}</p>
                    <p className="text-xs text-muted-foreground">Pending Outcome</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Treatments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Treatments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {treatments.length > 0 ? (
                      treatments.slice(0, 5).map((treatment) => (
                        <div
                          key={treatment.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          {treatment.outcome_classification ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Clock className="h-5 w-5 text-warning" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{treatment.treatment_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {treatment.tooth_number || "N/A"} • {formatDate(treatment.treatment_date)}
                            </p>
                          </div>
                          <span className="text-sm font-medium">
                            {treatment.actual_cost ? formatCurrency(treatment.actual_cost) : "-"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No treatment history</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Medical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Medical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Medical History</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm">{patient.medical_history || 'No medical history recorded'}</p>
                  </div>
                </div>
                 {/* Vital Signs */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Vital Signs</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Blood Type</p>
              <p className="text-sm font-medium">{patient.blood_type || 'Not recorded'}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Blood Pressure</p>
              <p className="text-sm font-medium">{patient.blood_pressure || 'Not recorded'}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Bleeding Time</p>
              <p className="text-sm font-medium">{patient.bleeding_time || 'Not recorded'}</p>
            </div>
          </div>
        </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Dental Insurance</p>
                  <p className="text-sm font-medium">{patient.dental_insurance || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Allergies & Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Allergies & Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Allergies</p>
                  {patient.allergies ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.split(',').map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="text-sm">
                          {allergy.trim()}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No known allergies</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Current Medications</p>
                  {patient.current_medications ? (
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{patient.current_medications}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No current medications</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Emergency Contact Name</p>
                  <p className="text-sm">{patient.emergency_contact_name || 'Not specified'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Emergency Contact Number</p>
                  <p className="text-sm">{patient.emergency_contact_number || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Treatments Tab */}
        <TabsContent value="treatments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Treatment History</CardTitle>
              <CardDescription>All treatments performed for this patient</CardDescription>
            </CardHeader>
            <CardContent>
              {treatments.length > 0 ? (
                <div className="space-y-4">
                  {treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-shrink-0">
                        {treatment.outcome_classification ? (
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        ) : (
                          <Clock className="h-6 w-6 text-warning" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{treatment.treatment_name}</h4>
                          <div className="flex items-center gap-2">
                            {treatment.outcome_classification && (
                              <Badge variant={getOutcomeBadgeVariant(treatment.outcome_classification)}>
                                {getOutcomeIcon(treatment.outcome_classification)}
                                {treatment.outcome_classification}
                              </Badge>
                            )}
                            {!treatment.outcome_classification && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTreatmentId(treatment.id)
                                  setShowAddOutcome(true)
                                }}
                              >
                                Record Outcome
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(treatment.treatment_date)} • Tooth: {treatment.tooth_number || 'N/A'} • Condition: {treatment.condition_name}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                          <span className="text-sm text-muted-foreground">
                            {treatment.dentist_name || 'Unknown dentist'}
                          </span>
                          <span className="font-medium">
                            {treatment.actual_cost ? formatCurrency(treatment.actual_cost) : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No treatment records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dental Chart Tab */}
        <TabsContent value="dental-chart">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Square className="h-5 w-5 text-primary" />
                Dental Chart
              </CardTitle>
              <CardDescription>Current tooth conditions for {patient.first_name} {patient.last_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-8 py-4">
                {/* Upper Teeth */}
                <div className="text-center">
                  <Badge variant="outline" className="mb-4">
                    Upper Arch (Maxillary)
                  </Badge>
                  <div className="flex justify-center gap-1">
                    {permanentTeethUpper.map((toothNum) => (
                      <div key={toothNum} className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground mb-1">{toothNum}</span>
                        <ToothSVG
                          toothNumber={toothNum}
                          condition={getToothCondition(toothNum)}
                          size={40}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full max-w-xl border-t border-dashed border-border" />

                {/* Lower Teeth */}
                <div className="text-center">
                  <div className="flex justify-center gap-1">
                    {permanentTeethLower.map((toothNum) => (
                      <div key={toothNum} className="flex flex-col items-center">
                        <ToothSVG
                          toothNumber={toothNum}
                          condition={getToothCondition(toothNum)}
                          size={40}
                        />
                        <span className="text-[10px] text-muted-foreground mt-1">{toothNum}</span>
                      </div>
                    ))}
                  </div>
                  <Badge variant="outline" className="mt-4">
                    Lower Arch (Mandibular)
                  </Badge>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-3">Chart Legend</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(toothConditions).map(([key, { label, color }]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(toothConditions).map(([key, { label, color }]) => {
                  const count = Object.values(dentalChart).filter(condition => condition === key).length
                  return (
                    <div key={key} className="text-center p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <p className="text-sm font-medium">{label}</p>
                      </div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">teeth</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Treatment Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-primary/5">
                      <p className="text-3xl font-bold text-primary">{treatments.length}</p>
                      <p className="text-sm text-muted-foreground">Total Treatments</p>
                    </div>
                    <div className="p-4 rounded-lg bg-success/5">
                      <p className="text-3xl font-bold text-success">{completedTreatments}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning/5">
                      <p className="text-3xl font-bold text-warning">{pendingTreatments}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Outcome Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['excellent', 'good', 'fair', 'poor'].map((outcome) => {
                    const count = treatments.filter(t => 
                      t.outcome_classification?.toLowerCase() === outcome
                    ).length
                    const percentage = completedTreatments > 0 ? (count / completedTreatments) * 100 : 0
                    
                    return (
                      <div key={outcome} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{outcome}</span>
                          <span className="text-sm text-muted-foreground">
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Outcome Dialog */}
      <Dialog open={showAddOutcome} onOpenChange={setShowAddOutcome}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Treatment Outcome</DialogTitle>
          </DialogHeader>
          {selectedTreatmentId && (
            <OutcomeForm
              treatmentId={selectedTreatmentId}
              onSuccess={handleOutcomeAdded}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}