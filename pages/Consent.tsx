import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { 
  Search, FileCheck, AlertTriangle, CheckCircle2, Printer, 
  Users, Shield, Scale, Eye, Clock, UserCheck, XCircle, Info, FileText
} from 'lucide-react'
import { api } from '@/services/api'
import { Patient } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface ConsentStats {
  total_patients: number
  consented_patients: number
  non_consented_patients: number
}

export function Consent() {
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ConsentStats>({
    total_patients: 0,
    consented_patients: 0,
    non_consented_patients: 0
  })
  const [showConsentForm, setShowConsentForm] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  useEffect(() => {
    loadData()
  }, [search])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const patientsResponse = await api.get<Patient[]>('/patients/read.php', {
        limit: 100,
        search
      })
      if (patientsResponse.success && patientsResponse.data) {
        setPatients(patientsResponse.data)
      }

      const statsResponse = await api.get<ConsentStats>('/consent/read.php')
      if (statsResponse.success && statsResponse.data) {
        setStats({
          total_patients: statsResponse.data.total_patients || 0,
          consented_patients: statsResponse.data.consented_patients || 0,
          non_consented_patients: statsResponse.data.non_consented_patients || 0
        })
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load consent data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGrantConsent = async (patient: Patient) => {
    try {
      const response = await api.post('/consent/create.php', {
        patient_id: patient.id,
        consent_type: 'ai_training',
        consent_given: true,
        consent_date: new Date().toISOString().split('T')[0]
      })

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Consent recorded successfully',
          variant: 'success'
        })
        loadData()
        setShowConsentForm(false)
        setSelectedPatient(null)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record consent',
        variant: 'destructive'
      })
    }
  }

  const handlePrintConsent = (patient: Patient) => {
    setSelectedPatient(patient)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const consentRate = stats.total_patients > 0 
    ? Math.round((stats.consented_patients / stats.total_patients) * 100) 
    : 0

  return (
   <div className="space-y-6 animate-fade-in">
  {/* Header Section with Animation */}
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-down">
    <div>
      <div className="flex items-center gap-2">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Consent Management</h1>
      </div>
      <p className="text-muted-foreground mt-1">
        Manage patient consent for AI training and data usage
      </p>
    </div>
        <Badge variant="outline" className="px-3 py-1.5 bg-primary/5 border-primary/20 animate-pulse-soft">
          <Shield className="h-3.5 w-3.5 mr-1 text-primary" />
          HIPAA Compliant
        </Badge>
      </div>

      {/* Ethical Notice with Animation */}
      <Alert className="border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-sm animate-scale-in">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-300 font-semibold flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Ethical AI Commitment
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          <span className="font-medium">Full Transparency:</span> This system only uses data from patients who have explicitly consented to AI training. 
          Patient privacy and data protection are our highest priorities. Consent can be withdrawn at any time.
        </AlertDescription>
      </Alert>

      {/* Stats Cards with Staggered Animation */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Patients Card */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-primary animate-slide-up" 
              style={{ animationDelay: '0.1s' }}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Patients</CardTitle>
              <CardDescription className="text-xs">Registered in system</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-soft">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold animate-count-up">{stats.total_patients}</span>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                <UserCheck className="h-3 w-3 mr-1" />
                Total
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Consented Card */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-green-500 animate-slide-up" 
              style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Consented</CardTitle>
              <CardDescription className="text-xs">AI Training approved</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse-soft">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600 animate-count-up">{stats.consented_patients}</span>
              <Badge className="bg-green-600 hover:bg-green-700">
                {consentRate}%
              </Badge>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <Progress value={consentRate} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">consent rate</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Not Consented Card */}
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-amber-500 animate-slide-up" 
              style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">Not Consented</CardTitle>
              <CardDescription className="text-xs">Pending approval</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse-soft">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-amber-600 animate-count-up">{stats.non_consented_patients}</span>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient List with Animation */}
      <Card className="border-none shadow-lg animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-t-lg border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Patient Consent Status
              </CardTitle>
              <CardDescription>Review and manage AI training consent for all patients</CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {patients.length} patients
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Search Bar with Animation */}
          <div className="mb-6 group animate-slide-down" style={{ animationDelay: '0.5s' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                placeholder="Search patients by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-muted/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading patient data...</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold">Patient Information</TableHead>
                    <TableHead className="font-semibold">Code</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.length > 0 ? (
                    patients.map((patient, index) => (
                      <TableRow 
                        key={patient.id} 
                        className="hover:bg-muted/50 transition-colors group animate-fade-in"
                        style={{ animationDelay: `${0.7 + index * 0.05}s` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <UserCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {patient.first_name} {patient.middle_name} {patient.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {patient.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono bg-muted/30">
                            {patient.patient_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {patient.has_ai_consent ? (
                            <Badge className="bg-green-600 hover:bg-green-700 transition-all hover:scale-105">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Consented
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 transition-all hover:scale-105">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Consented
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {patient.has_ai_consent ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:scale-110 transition-transform">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 animate-scale-in">
                                <DropdownMenuItem onClick={() => handlePrintConsent(patient)} className="cursor-pointer hover:scale-105 transition-transform">
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print Consent Form
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer hover:scale-105 transition-transform">
                                  <FileCheck className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive cursor-pointer hover:scale-105 transition-transform">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Revoke Consent
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 transition-all hover:scale-105"
                              onClick={() => {
                                setSelectedPatient(patient)
                                setShowConsentForm(true)
                              }}
                            >
                              <FileCheck className="h-4 w-4 mr-2" />
                              Grant Consent
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
                          <Users className="h-12 w-12 mb-3 opacity-20 animate-bounce-soft" />
                          <p className="text-lg font-medium">No patients found</p>
                          <p className="text-sm mt-1">
                            {search ? 'Try adjusting your search terms' : 'Add patients to manage consent'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consent Dialog with Animation */}
      <Dialog open={showConsentForm} onOpenChange={setShowConsentForm}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-primary to-primary/60 p-6 text-white">
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <Scale className="h-5 w-5" />
              AI Training Consent Form
            </DialogTitle>
            <p className="text-sm text-white/80 mt-1">Tolentino-Jagdon Dental Care Service</p>
          </div>
          
          {selectedPatient && (
            <div className="p-6 space-y-6">
              {/* Patient Information */}
              <div className="bg-muted/30 rounded-lg p-4 border animate-slide-down">
                <h3 className="font-semibold flex items-center gap-2 mb-3 text-primary">
                  <Info className="h-4 w-4" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">
                      {selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Code</p>
                    <p className="font-medium font-mono">{selectedPatient.patient_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Consent</p>
                    <p className="font-medium">{new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Consent Statement */}
              <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="font-semibold flex items-center gap-2 text-primary">
                  <FileCheck className="h-4 w-4" />
                  Consent Statement
                </h3>
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                  <p className="text-sm leading-relaxed text-justify">
                    I hereby grant consent to <span className="font-semibold">Tolentino-Jagdon Dental Care Service</span> to use my dental
                    treatment data, including conditions, procedures, and outcomes, for the purpose of
                    training artificial intelligence models to improve treatment recommendations.
                  </p>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="font-semibold text-sm">I understand and acknowledge that:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">My data will be anonymized before use</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Data used solely for improving dental care</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">I may withdraw consent at any time</span>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-sm">Treatment unaffected by consent status</span>
                  </div>
                </div>
              </div>

              <Separator className="animate-fade-in" style={{ animationDelay: '0.3s' }} />

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <Button variant="outline" onClick={() => setShowConsentForm(false)} className="hover:scale-105 transition-transform">
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleGrantConsent(selectedPatient)}
                  className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform"
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  Confirm & Grant Consent
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Consent Form */}
      <div className="hidden print:block print:p-8">
        {selectedPatient && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="text-center border-b-2 border-primary pb-4">
              <h1 className="text-3xl font-bold text-primary">TOLENTINO-JAGDON DENTAL CARE SERVICE</h1>
              <p className="text-sm mt-1">Blk N14 Lot 10 Brgy. Emmanuel Bergado 1</p>
              <p className="text-sm">Contact: (046) 484-01-29 | 09616370319</p>
            </div>

            <h2 className="text-2xl font-bold text-center uppercase tracking-wide">
              CONSENT FOR AI TRAINING AND DATA USAGE
            </h2>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Patient Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-medium">{selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Patient Code</p>
                  <p className="font-medium">{selectedPatient.patient_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-justify leading-relaxed">
                I hereby grant consent to <strong>Tolentino-Jagdon Dental Care Service</strong> to use my dental
                treatment data, including conditions, procedures, and outcomes, for the purpose of
                training artificial intelligence models to improve treatment recommendations.
              </p>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold mb-2">I understand and acknowledge that:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>My personal information will be anonymized before being used for AI training</li>
                  <li>The data will be used exclusively for improving dental care quality and treatment outcomes</li>
                  <li>I have the right to withdraw this consent at any time without affecting my treatment</li>
                  <li>My medical treatment will not be influenced by my consent status</li>
                  <li>The clinic maintains strict data security and privacy protocols in compliance with data protection regulations</li>
                </ol>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-12">
              <div>
                <p className="text-sm mb-2">Patient Signature:</p>
                <div className="border-b border-black h-8"></div>
                <p className="text-xs text-gray-500 mt-1">Printed Name: {selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-xs text-gray-500">Date: ____________________</p>
              </div>
              <div>
                <p className="text-sm mb-2">Witness/Dentist Signature:</p>
                <div className="border-b border-black h-8"></div>
                <p className="text-xs text-gray-500 mt-1">Printed Name: ____________________</p>
                <p className="text-xs text-gray-500">Date: ____________________</p>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
              <p>This document serves as official consent for AI training data usage.</p>
              <p>Form ID: CONS-{selectedPatient.patient_code}-{new Date().getFullYear()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Animation Keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes pulseSoft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        @keyframes bounceSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes countUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .animate-slide-down {
          animation: slideDown 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-slide-up {
          animation: slideUp 0.5s ease-out forwards;
          opacity: 0;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        .animate-pulse-soft {
          animation: pulseSoft 2s ease-in-out infinite;
        }
        
        .animate-bounce-soft {
          animation: bounceSoft 2s ease-in-out infinite;
        }
        
        .animate-count-up {
          animation: countUp 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  )
}