import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User, Phone, Heart, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";

// Define the Patient interface (matching your backend)
interface Patient {
  id: number;
  patient_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birthdate: string;
  gender: string;
  age: number;
  contact_number?: string;
  email?: string;
  address?: string;
  occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  dental_insurance?: string;
  has_ai_consent?: boolean;
  created_at?: string;
  updated_at?: string;
}

const medicalConditions = [
  "High Blood Pressure",
  "Low Blood Pressure",
  "Heart Disease",
  "Heart Murmur",
  "Diabetes",
  "Epilepsy / Convulsions",
  "AIDS or HIV Infection",
  "Hepatitis / Liver Disease",
  "Rheumatic Fever",
  "Hay Fever / Allergies",
  "Respiratory Problems",
  "Tuberculosis",
  "Kidney Disease",
  "Thyroid Problem",
  "Cancer / Tumors",
  "Anemia",
  "Asthma",
  "Bleeding Problems",
  "Arthritis / Rheumatism",
];

const allergiesList = [
  "Local Anesthetic (Lidocaine)",
  "Penicillin",
  "Antibiotics",
  "Sulfa Drugs",
  "Aspirin",
  "Latex",
];

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    birthdate: "",
    age: "",
    gender: "",
    contact_number: "",
    email: "",
    address: "",
    occupation: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    medical_history: "",
    allergies: "",
    current_medications: "",
    dental_insurance: "",
    has_ai_consent: false,
    selectedConditions: [] as string[],
    selectedAllergies: [] as string[],
  });

  // Load patient data
  useEffect(() => {
    const loadPatient = async () => {
      try {
        setLoading(true);
        
        const response = await api.get(`/patients/read.php?id=${id}`);
        
        // Extract patient data from response
        let patientData: Patient | null = null;
        
        if (response.data && typeof response.data === 'object') {
          if ('data' in response.data) {
            patientData = (response.data as any).data;
          } else {
            patientData = response.data as Patient;
          }
        }

        if (patientData) {
          setPatient(patientData);
          
          // Calculate age from birthdate
          const birthDate = new Date(patientData.birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          setFormData({
            first_name: patientData.first_name || "",
            middle_name: patientData.middle_name || "",
            last_name: patientData.last_name || "",
            birthdate: patientData.birthdate || "",
            age: age.toString(),
            gender: patientData.gender || "",
            contact_number: patientData.contact_number || "",
            email: patientData.email || "",
            address: patientData.address || "",
            occupation: patientData.occupation || "",
            emergency_contact_name: patientData.emergency_contact_name || "",
            emergency_contact_number: patientData.emergency_contact_number || "",
            medical_history: patientData.medical_history || "",
            allergies: patientData.allergies || "",
            current_medications: patientData.current_medications || "",
            dental_insurance: patientData.dental_insurance || "",
            has_ai_consent: patientData.has_ai_consent || false,
            selectedConditions: [], // These might need to be fetched separately
            selectedAllergies: [], // These might need to be fetched separately
          });
        } else {
          throw new Error('Failed to load patient data');
        }
      } catch (error) {
        console.error('Failed to load patient:', error);
        toast({
          title: 'Error',
          description: 'Failed to load patient data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPatient();
    }
  }, [id, toast]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (field === "birthdate" && typeof value === "string") {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age.toString() }));
    }
  };

  const toggleCondition = (condition: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedConditions: prev.selectedConditions.includes(condition)
        ? prev.selectedConditions.filter((c) => c !== condition)
        : [...prev.selectedConditions, condition],
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedAllergies: prev.selectedAllergies.includes(allergy)
        ? prev.selectedAllergies.filter((a) => a !== allergy)
        : [...prev.selectedAllergies, allergy],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    setSaving(true);
    
    try {
      // Use PUT method as required by the backend
      const response = await api.put('/patients/update.php', {
        id: parseInt(id),
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        birthdate: formData.birthdate || null,
        gender: formData.gender || null,
        contact_number: formData.contact_number || null,
        email: formData.email || null,
        address: formData.address || null,
        occupation: formData.occupation || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_number: formData.emergency_contact_number || null,
        medical_history: formData.medical_history || null,
        allergies: formData.allergies || null,
        current_medications: formData.current_medications || null,
        dental_insurance: formData.dental_insurance || null,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Patient information updated successfully',
          duration: 3000,
        });
        
        navigate(`/patients/${id}`);
      } else {
        throw new Error(response.message || 'Failed to update patient');
      }
    } catch (error: any) {
      console.error('Failed to update patient:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update patient',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={() => navigate("/patients")} className="mt-4">
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/patients/${id}`)}>
          <ArrowLeft className="h-5 w-5 " />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Edit Patient
          </h1>
          <p className="text-muted-foreground">
            Update {patient.first_name} {patient.last_name}'s information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4 hidden sm:block" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-2">
              <Phone className="h-4 w-4 hidden sm:block" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="medical" className="gap-2">
              <Heart className="h-4 w-4 hidden sm:block" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="conditions" className="gap-2">
              <AlertTriangle className="h-4 w-4 hidden sm:block" />
              Conditions
            </TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Personal Information</CardTitle>
                <CardDescription>Basic patient demographics</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Middle Name</Label>
                    <Input
                      id="middle_name"
                      value={formData.middle_name}
                      onChange={(e) => handleInputChange("middle_name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthdate">Birthdate</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => handleInputChange("birthdate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" value={formData.age} readOnly className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleInputChange("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) => handleInputChange("occupation", e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_ai_consent"
                    checked={formData.has_ai_consent}
                    onCheckedChange={(checked) => handleInputChange("has_ai_consent", !!checked)}
                  />
                  <Label htmlFor="has_ai_consent" className="text-sm font-normal">
                    Allow patient data to be used for AI training and treatment recommendations
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Information */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Contact Information</CardTitle>
                <CardDescription>Address and contact details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_number">Contact Number</Label>
                    <Input
                      id="contact_number"
                      type="tel"
                      value={formData.contact_number}
                      onChange={(e) => handleInputChange("contact_number", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dental_insurance">Dental Insurance</Label>
                  <Input
                    id="dental_insurance"
                    value={formData.dental_insurance}
                    onChange={(e) => handleInputChange("dental_insurance", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical History */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Medical History</CardTitle>
                <CardDescription>Health information</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={formData.medical_history}
                    onChange={(e) => handleInputChange("medical_history", e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange("allergies", e.target.value)}
                    placeholder="Separate multiple allergies with commas"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_medications">Current Medications</Label>
                  <Textarea
                    id="current_medications"
                    value={formData.current_medications}
                    onChange={(e) => handleInputChange("current_medications", e.target.value)}
                    placeholder="List current medications"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                    <Input
                      id="emergency_contact_number"
                      type="tel"
                      value={formData.emergency_contact_number}
                      onChange={(e) => handleInputChange("emergency_contact_number", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conditions & Allergies - This is separate from the main patient data */}
          <TabsContent value="conditions">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Medical Conditions</CardTitle>
                  <CardDescription>Select all that apply</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                    {medicalConditions.map((condition) => (
                      <div key={condition} className="flex items-center space-x-2">
                        <Checkbox
                          id={condition}
                          checked={formData.selectedConditions.includes(condition)}
                          onCheckedChange={() => toggleCondition(condition)}
                        />
                        <Label htmlFor={condition} className="text-sm font-normal">
                          {condition}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Allergies</CardTitle>
                  <CardDescription>Select all that apply</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allergiesList.map((allergy) => (
                      <div key={allergy} className="flex items-center space-x-2">
                        <Checkbox
                          id={allergy}
                          checked={formData.selectedAllergies.includes(allergy)}
                          onCheckedChange={() => toggleAllergy(allergy)}
                        />
                        <Label htmlFor={allergy} className="text-sm font-normal">
                          {allergy}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate(`/patients/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}