import { useState, forwardRef, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, ArrowRight, ArrowLeft, Check, User, Mail, Building2, 
  Stethoscope, FileText, MapPin, Rocket, Shield, Zap, Heart, 
  CheckCircle, Loader2, Share2, MessageCircle, Twitter, Linkedin, Facebook, Copy,
  GraduationCap, Upload, Calendar, Home, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import apiClient from '@/utils/apiClient';
import { API_ENDPOINTS } from '@/config/api';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Country list with codes
const countries = [
  { code: 'AF', name: 'Afghanistan', phoneCode: '+93' },
  { code: 'AL', name: 'Albania', phoneCode: '+355' },
  { code: 'DZ', name: 'Algeria', phoneCode: '+213' },
  { code: 'AR', name: 'Argentina', phoneCode: '+54' },
  { code: 'AU', name: 'Australia', phoneCode: '+61' },
  { code: 'AT', name: 'Austria', phoneCode: '+43' },
  { code: 'BD', name: 'Bangladesh', phoneCode: '+880' },
  { code: 'BE', name: 'Belgium', phoneCode: '+32' },
  { code: 'BR', name: 'Brazil', phoneCode: '+55' },
  { code: 'CA', name: 'Canada', phoneCode: '+1' },
  { code: 'CL', name: 'Chile', phoneCode: '+56' },
  { code: 'CN', name: 'China', phoneCode: '+86' },
  { code: 'CO', name: 'Colombia', phoneCode: '+57' },
  { code: 'CZ', name: 'Czech Republic', phoneCode: '+420' },
  { code: 'DK', name: 'Denmark', phoneCode: '+45' },
  { code: 'EG', name: 'Egypt', phoneCode: '+20' },
  { code: 'FI', name: 'Finland', phoneCode: '+358' },
  { code: 'FR', name: 'France', phoneCode: '+33' },
  { code: 'DE', name: 'Germany', phoneCode: '+49' },
  { code: 'GR', name: 'Greece', phoneCode: '+30' },
  { code: 'HK', name: 'Hong Kong', phoneCode: '+852' },
  { code: 'HU', name: 'Hungary', phoneCode: '+36' },
  { code: 'IN', name: 'India', phoneCode: '+91' },
  { code: 'ID', name: 'Indonesia', phoneCode: '+62' },
  { code: 'IE', name: 'Ireland', phoneCode: '+353' },
  { code: 'IL', name: 'Israel', phoneCode: '+972' },
  { code: 'IT', name: 'Italy', phoneCode: '+39' },
  { code: 'JP', name: 'Japan', phoneCode: '+81' },
  { code: 'KE', name: 'Kenya', phoneCode: '+254' },
  { code: 'KR', name: 'South Korea', phoneCode: '+82' },
  { code: 'KW', name: 'Kuwait', phoneCode: '+965' },
  { code: 'MY', name: 'Malaysia', phoneCode: '+60' },
  { code: 'MX', name: 'Mexico', phoneCode: '+52' },
  { code: 'NL', name: 'Netherlands', phoneCode: '+31' },
  { code: 'NZ', name: 'New Zealand', phoneCode: '+64' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234' },
  { code: 'NO', name: 'Norway', phoneCode: '+47' },
  { code: 'PK', name: 'Pakistan', phoneCode: '+92' },
  { code: 'PH', name: 'Philippines', phoneCode: '+63' },
  { code: 'PL', name: 'Poland', phoneCode: '+48' },
  { code: 'PT', name: 'Portugal', phoneCode: '+351' },
  { code: 'QA', name: 'Qatar', phoneCode: '+974' },
  { code: 'RO', name: 'Romania', phoneCode: '+40' },
  { code: 'RU', name: 'Russia', phoneCode: '+7' },
  { code: 'SA', name: 'Saudi Arabia', phoneCode: '+966' },
  { code: 'SG', name: 'Singapore', phoneCode: '+65' },
  { code: 'ZA', name: 'South Africa', phoneCode: '+27' },
  { code: 'ES', name: 'Spain', phoneCode: '+34' },
  { code: 'LK', name: 'Sri Lanka', phoneCode: '+94' },
  { code: 'SE', name: 'Sweden', phoneCode: '+46' },
  { code: 'CH', name: 'Switzerland', phoneCode: '+41' },
  { code: 'TW', name: 'Taiwan', phoneCode: '+886' },
  { code: 'TH', name: 'Thailand', phoneCode: '+66' },
  { code: 'TR', name: 'Turkey', phoneCode: '+90' },
  { code: 'AE', name: 'United Arab Emirates', phoneCode: '+971' },
  { code: 'GB', name: 'United Kingdom', phoneCode: '+44' },
  { code: 'US', name: 'United States', phoneCode: '+1' },
  { code: 'VN', name: 'Vietnam', phoneCode: '+84' },
  { code: 'OTHER', name: 'Other', phoneCode: '+' },
];

// Steps change based on user type
const getSteps = (userType: string) => {
  if (userType === 'student') {
    return [
      { id: 1, title: 'Welcome', icon: Sparkles },
      { id: 2, title: 'Personal', icon: User },
      { id: 3, title: 'Academic', icon: GraduationCap },
      { id: 4, title: 'Address', icon: Home },
      { id: 5, title: 'College', icon: Building2 },
      { id: 6, title: 'Complete', icon: Rocket },
    ];
  }
  return [
    { id: 1, title: 'Welcome', icon: Sparkles },
    { id: 2, title: 'Personal', icon: User },
    { id: 3, title: 'Professional', icon: Stethoscope },
    { id: 4, title: 'Address', icon: Home },
    { id: 5, title: 'Institution', icon: Building2 },
    { id: 6, title: 'Complete', icon: Rocket },
  ];
};

export const WaitlistModal = forwardRef<HTMLDivElement, WaitlistModalProps>(function WaitlistModal({ isOpen, onClose }, ref) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState<'professional' | 'student' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [waitlistNumber, setWaitlistNumber] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    // Common fields
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: '',
    
    // Professional fields
    profession: '',
    department: '',
    specialization: '',
    yearsOfExperience: '',
    medicalLicenseId: '',
    hospitalName: '',
    hospitalCity: '',
    hospitalCountry: '',
    
    // Student fields
    studentType: '',
    studentId: '',
    collegeName: '',
    collegeCity: '',
    collegeCountry: '',
    yearOfGraduation: '',
    
    // Student address fields
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressState: '',
    addressPostalCode: '',
    addressCountry: '',
  });

  const steps = getSteps(userType);
  const totalSteps = 6;

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Email validation helper
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validation for each step
  const validateStep = (step: number): { valid: boolean; message?: string } => {
    switch (step) {
      case 2:
        if (!formData.firstName.trim()) {
          return { valid: false, message: "Please enter your first name" };
        }
        if (!formData.lastName.trim()) {
          return { valid: false, message: "Please enter your last name" };
        }
        if (!formData.email.trim()) {
          return { valid: false, message: "Please enter your email address" };
        }
        if (!isValidEmail(formData.email)) {
          return { valid: false, message: "Please enter a valid email address" };
        }
        if (!userType) {
          return { valid: false, message: "Please select if you are a Professional or Student" };
        }
        return { valid: true };

      case 3:
        if (userType === 'professional') {
          if (!formData.profession) {
            return { valid: false, message: "Please select your profession" };
          }
          if (!formData.department) {
            return { valid: false, message: "Please select your department" };
          }
          if (!formData.yearsOfExperience) {
            return { valid: false, message: "Please select your years of experience" };
          }
          if (!formData.medicalLicenseId.trim()) {
            return { valid: false, message: "Please enter your license ID" };
          }
        } else if (userType === 'student') {
          if (!formData.studentType) {
            return { valid: false, message: "Please select your program type" };
          }
          if (!formData.studentId.trim()) {
            return { valid: false, message: "Please enter your student ID" };
          }
          if (!studentIdFile) {
            return { valid: false, message: "Please upload your student ID card" };
          }
          if (!formData.yearOfGraduation) {
            return { valid: false, message: "Please select your expected graduation year" };
          }
        }
        return { valid: true };

      case 4:
        // Address validation for both professionals and students
        if (!formData.addressLine1.trim()) {
          return { valid: false, message: "Please enter your address" };
        }
        if (!formData.addressCity.trim()) {
          return { valid: false, message: "Please enter your city" };
        }
        if (!formData.addressState.trim()) {
          return { valid: false, message: "Please enter your state/province" };
        }
        if (!formData.addressPostalCode.trim()) {
          return { valid: false, message: "Please enter your postal code" };
        }
        if (!formData.addressCountry) {
          return { valid: false, message: "Please select your country" };
        }
        return { valid: true };

      case 5:
        if (userType === 'professional') {
          if (!formData.hospitalName.trim()) {
            return { valid: false, message: "Please enter your hospital/institution name" };
          }
          if (!formData.hospitalCity.trim()) {
            return { valid: false, message: "Please enter your city" };
          }
          if (!formData.hospitalCountry) {
            return { valid: false, message: "Please select your country" };
          }
        } else if (userType === 'student') {
          if (!formData.collegeName.trim()) {
            return { valid: false, message: "Please enter your college/university name" };
          }
          if (!formData.collegeCity.trim()) {
            return { valid: false, message: "Please enter your college city" };
          }
          if (!formData.collegeCountry) {
            return { valid: false, message: "Please select your college country" };
          }
        }
        return { valid: true };

      default:
        return { valid: true };
    }
  };

  // Check if current step is valid (for button state)
  const isCurrentStepValid = (): boolean => {
    return validateStep(currentStep).valid;
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        title: "Required Field Missing",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast({
        title: "Required Field Missing",
        description: validation.message,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data for backend
      const waitlistData: any = {
        type: userType === 'professional' ? 'Healthcare Professional' : 'Medical Student',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: `${selectedCountryPhone?.phoneCode || ''} ${formData.phone}`,
      };
      
      // Add professional-specific fields
      if (userType === 'professional') {
        waitlistData.profession = formData.profession;
        waitlistData.department = formData.department;
        waitlistData.specialization = formData.specialization;
        waitlistData.yearsOfExperience = formData.yearsOfExperience;
        waitlistData.licenseId = formData.medicalLicenseId;
        waitlistData.practice = {
          hospitalOrInstitutionName: formData.hospitalName,
          city: formData.hospitalCity,
          country: formData.hospitalCountry,
        };
      }
      
      // Add student-specific fields
      if (userType === 'student') {
        waitlistData.academic = {
          programType: formData.studentType,
          studentIdOrRollNumber: formData.studentId,
          expectedGraduationYear: parseInt(formData.yearOfGraduation) || null,
          collegeOrUniversityName: formData.collegeName,
          collegeCity: formData.collegeCity,
          collegeCountry: formData.collegeCountry,
        };
      }
      
      // Create FormData for file upload
      const submitFormData = new FormData();
      
      // Add all form fields
      submitFormData.append('type', userType === 'professional' ? 'Healthcare Professional' : 'Medical Student');
      submitFormData.append('firstName', formData.firstName);
      submitFormData.append('lastName', formData.lastName);
      submitFormData.append('email', formData.email);
      submitFormData.append('phoneNumber', `${selectedCountryPhone?.phoneCode || ''} ${formData.phone}`);
      
      // Add professional-specific fields
      if (userType === 'professional') {
        submitFormData.append('profession', formData.profession);
        submitFormData.append('department', formData.department);
        submitFormData.append('specialization', formData.specialization);
        submitFormData.append('yearsOfExperience', formData.yearsOfExperience);
        submitFormData.append('licenseId', formData.medicalLicenseId);
        submitFormData.append('practice.hospitalOrInstitutionName', formData.hospitalName);
        submitFormData.append('practice.city', formData.hospitalCity);
        submitFormData.append('practice.country', formData.hospitalCountry);
      }
      
      // Add student-specific fields
      if (userType === 'student') {
        submitFormData.append('academic.programType', formData.studentType);
        submitFormData.append('academic.studentIdOrRollNumber', formData.studentId);
        submitFormData.append('academic.expectedGraduationYear', formData.yearOfGraduation);
        submitFormData.append('academic.collegeOrUniversityName', formData.collegeName);
        submitFormData.append('academic.collegeCity', formData.collegeCity);
        submitFormData.append('academic.collegeCountry', formData.collegeCountry);
        
        // Add student ID file if present
        if (studentIdFile) {
          submitFormData.append('studentIdFile', studentIdFile);
        }
      }
      
      // Send to backend
      const response = await apiClient.post(API_ENDPOINTS.WAITLIST.SUBMIT, submitFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        // Store the waitlist number from the response
        if (response.data.data?.waitlistNumber) {
          setWaitlistNumber(response.data.data.waitlistNumber);
        }
        setCurrentStep(totalSteps);
        toast({
          title: "Success!",
          description: "You've been added to the waitlist!",
        });
      }
    } catch (error: any) {
      console.error('Waitlist submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.response?.data?.message || "Failed to submit waitlist form. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setUserType('');
    setStudentIdFile(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      phoneCountryCode: '',
      profession: '',
      department: '',
      specialization: '',
      yearsOfExperience: '',
      medicalLicenseId: '',
      hospitalName: '',
      hospitalCity: '',
      hospitalCountry: '',
      studentType: '',
      studentId: '',
      collegeName: '',
      collegeCity: '',
      collegeCountry: '',
      yearOfGraduation: '',
      addressLine1: '',
      addressLine2: '',
      addressCity: '',
      addressState: '',
      addressPostalCode: '',
      addressCountry: '',
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setStudentIdFile(file);
      toast({
        title: "File uploaded",
        description: file.name,
      });
    }
  };

  // Generate graduation years (current year to current year + 10)
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 11 }, (_, i) => currentYear + i);

  // Get selected country phone code
  const selectedCountryPhone = countries.find(c => c.code === formData.phoneCountryCode);

  // Check if we're on the final form step (before completion)
  const isFinalFormStep = currentStep === 5;
  const isCompleteStep = currentStep === totalSteps;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={handleClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-5xl mx-4 h-[90vh] max-h-[700px] bg-background rounded-3xl shadow-2xl overflow-hidden flex"
        style={{ animation: 'scaleIn 0.4s ease-out' }}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(var(--primary), 0.3); }
            50% { box-shadow: 0 0 40px rgba(var(--primary), 0.5); }
          }
        `}</style>

        {/* Left Panel - Branding */}
        <div className="hidden lg:flex w-2/5 bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-8 flex-col justify-between relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-20 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-bold text-xl">Meddollina</span>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
              Join the World's First
              <span className="block text-white/90">Healthcare Contextual</span>
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Clinical Intelligence</span>
            </h2>
            
            <p className="text-white/80 text-lg mb-8">
              {userType === 'student' 
                ? "Future physicians shaping the future of medical practice."
                : "Be among the pioneering physicians shaping the future of medical practice."
              }
            </p>

            {/* Benefits */}
            <div className="space-y-4">
              {[
                { icon: Zap, text: 'AI-powered clinical insights' },
                { icon: Shield, text: 'HIPAA compliant & secure' },
                { icon: Heart, text: userType === 'student' ? 'Special student access' : 'Built for physicians, by physicians' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-white/90">
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Steps */}
          <div className="relative z-10">
            <p className="text-white/60 text-sm mb-4">Your progress</p>
            <div className="flex items-center gap-2">
              {steps.slice(0, totalSteps - 1).map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      currentStep > step.id 
                        ? 'bg-white text-primary' 
                        : currentStep === step.id 
                          ? 'bg-white/30 text-white ring-2 ring-white' 
                          : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < totalSteps - 2 && (
                    <div className={`w-6 h-0.5 mx-1 transition-colors duration-300 ${
                      currentStep > step.id ? 'bg-white' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Mobile Progress */}
          <div className="lg:hidden p-4 border-b border-border">
            <div className="flex items-center justify-center gap-2">
              {steps.slice(0, totalSteps - 1).map((step) => (
                <div 
                  key={step.id}
                  className={`h-2 w-10 rounded-full transition-colors ${
                    currentStep >= step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            <AnimatePresence mode="wait">
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col justify-center max-w-md mx-auto text-center"
                >
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                  
                  <h1 className="text-3xl font-bold mb-4">
                    You are About to Make History
                  </h1>
                  
                  <p className="text-muted-foreground text-lg mb-8">
                    Join an exclusive group of forward-thinking healthcare professionals who will be the first to experience the future of clinical intelligence.
                  </p>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { number: '500+', label: 'Members Waiting' },
                      { number: '50+', label: 'Specialties' },
                      { number: '20+', label: 'Countries' },
                    ].map((stat, index) => (
                      <div key={index} className="p-4 rounded-xl bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{stat.number}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <Button size="lg" onClick={nextStep} className="w-full rounded-xl">
                    Begin Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Personal Information + Role Selection */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                    <p className="text-muted-foreground">We would love to know the brilliant mind joining us</p>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => updateForm('firstName', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          placeholder="Smith"
                          value={formData.lastName}
                          onChange={(e) => updateForm('lastName', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={formData.email}
                          onChange={(e) => updateForm('email', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex gap-2">
                        <Select value={formData.phoneCountryCode} onValueChange={(v) => updateForm('phoneCountryCode', v)}>
                          <SelectTrigger className="rounded-xl h-12 w-[140px]">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-[60] max-h-[300px]">
                            {countries.map(country => (
                              <SelectItem key={country.code} value={country.code}>
                                <span className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{country.phoneCode}</span>
                                  <span className="text-xs">{country.code}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="(555) 000-0000"
                            value={formData.phone}
                            onChange={(e) => updateForm('phone', e.target.value)}
                            className="rounded-xl h-12 pl-12"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-2 pt-2">
                      <Label>I am a... *</Label>
                      <Select value={userType} onValueChange={(v) => setUserType(v as 'professional' | 'student')}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60]">
                          <SelectItem value="professional">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4" />
                              <span>Healthcare Professional</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="student">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              <span>Medical Student</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Professional Information (for professionals) */}
              {currentStep === 3 && userType === 'professional' && (
                <motion.div
                  key="step3-professional"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your Medical Expertise</h2>
                    <p className="text-muted-foreground">Help us tailor the experience to your specialty</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Profession *</Label>
                      <Select value={formData.profession} onValueChange={(v) => updateForm('profession', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select your profession" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60]">
                          <SelectItem value="physician">Physician</SelectItem>
                          <SelectItem value="surgeon">Surgeon</SelectItem>
                          <SelectItem value="specialist">Medical Specialist</SelectItem>
                          <SelectItem value="resident">Resident</SelectItem>
                          <SelectItem value="fellow">Fellow</SelectItem>
                          <SelectItem value="nurse-practitioner">Nurse Practitioner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select value={formData.department} onValueChange={(v) => updateForm('department', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60]">
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="neurology">Neurology</SelectItem>
                          <SelectItem value="oncology">Oncology</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="internal-medicine">Internal Medicine</SelectItem>
                          <SelectItem value="emergency">Emergency Medicine</SelectItem>
                          <SelectItem value="surgery">General Surgery</SelectItem>
                          <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="psychiatry">Psychiatry</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        placeholder="e.g., Interventional Cardiology"
                        value={formData.specialization}
                        onChange={(e) => updateForm('specialization', e.target.value)}
                        className="rounded-xl h-12"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Years of Experience *</Label>
                        <Select value={formData.yearsOfExperience} onValueChange={(v) => updateForm('yearsOfExperience', v)}>
                          <SelectTrigger className="rounded-xl h-12">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-[60]">
                            <SelectItem value="0-2">0-2 years</SelectItem>
                            <SelectItem value="3-5">3-5 years</SelectItem>
                            <SelectItem value="6-10">6-10 years</SelectItem>
                            <SelectItem value="11-20">11-20 years</SelectItem>
                            <SelectItem value="20+">20+ years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licenseId">License ID *</Label>
                        <Input
                          id="licenseId"
                          placeholder="ML-XXXX"
                          value={formData.medicalLicenseId}
                          onChange={(e) => updateForm('medicalLicenseId', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Student Information (for students) - WITHOUT experience and license */}
              {currentStep === 3 && userType === 'student' && (
                <motion.div
                  key="step3-student"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <GraduationCap className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your Academic Journey</h2>
                    <p className="text-muted-foreground">Tell us about your medical education</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Program Type *</Label>
                      <Select value={formData.studentType} onValueChange={(v) => updateForm('studentType', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select your program" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60]">
                          <SelectItem value="mbbs">MBBS</SelectItem>
                          <SelectItem value="md">MD (Post Graduate)</SelectItem>
                          <SelectItem value="ms">MS (Post Graduate)</SelectItem>
                          <SelectItem value="bds">BDS</SelectItem>
                          <SelectItem value="mds">MDS</SelectItem>
                          <SelectItem value="bsc-nursing">B.Sc Nursing</SelectItem>
                          <SelectItem value="msc-nursing">M.Sc Nursing</SelectItem>
                          <SelectItem value="pharmacy">B.Pharm / M.Pharm</SelectItem>
                          <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                          <SelectItem value="other">Other Medical Program</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID / Roll Number *</Label>
                      <Input
                        id="studentId"
                        placeholder="e.g., STU-2024-001"
                        value={formData.studentId}
                        onChange={(e) => updateForm('studentId', e.target.value)}
                        className="rounded-xl h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Valid Student ID *</Label>
                      <div 
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                          studentIdFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        {studentIdFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium">{studentIdFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload your student ID
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG or PDF (max 5MB)
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Expected Year of Graduation *</Label>
                      <Select value={formData.yearOfGraduation} onValueChange={(v) => updateForm('yearOfGraduation', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select graduation year" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60]">
                          {graduationYears.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Personal Address (for both professionals and students) */}
              {currentStep === 4 && (
                <motion.div
                  key="step4-student-address"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your Personal Address</h2>
                    <p className="text-muted-foreground">Where should we send you updates?</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="addressLine1"
                          placeholder="Street address, P.O. Box"
                          value={formData.addressLine1}
                          onChange={(e) => updateForm('addressLine1', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        value={formData.addressLine2}
                        onChange={(e) => updateForm('addressLine2', e.target.value)}
                        className="rounded-xl h-12"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addressCity">City *</Label>
                        <Input
                          id="addressCity"
                          placeholder="City"
                          value={formData.addressCity}
                          onChange={(e) => updateForm('addressCity', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addressState">State/Province *</Label>
                        <Input
                          id="addressState"
                          placeholder="State"
                          value={formData.addressState}
                          onChange={(e) => updateForm('addressState', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addressPostalCode">Postal Code *</Label>
                        <Input
                          id="addressPostalCode"
                          placeholder="12345"
                          value={formData.addressPostalCode}
                          onChange={(e) => updateForm('addressPostalCode', e.target.value)}
                          className="rounded-xl h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country *</Label>
                        <Select value={formData.addressCountry} onValueChange={(v) => updateForm('addressCountry', v)}>
                          <SelectTrigger className="rounded-xl h-12">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border border-border z-[60] max-h-[300px]">
                            {countries.map(country => (
                              <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: College Details (for students) */}
              {currentStep === 5 && userType === 'student' && (
                <motion.div
                  key="step5-student"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Your College Details</h2>
                    <p className="text-muted-foreground">Almost there! Just a few more details</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="collegeName">College / University Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="collegeName"
                          placeholder="AIIMS New Delhi"
                          value={formData.collegeName}
                          onChange={(e) => updateForm('collegeName', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="collegeCity">City *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="collegeCity"
                          placeholder="New Delhi"
                          value={formData.collegeCity}
                          onChange={(e) => updateForm('collegeCity', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Select value={formData.collegeCountry} onValueChange={(v) => updateForm('collegeCountry', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60] max-h-[300px]">
                          {countries.map(country => (
                            <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <GraduationCap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Student Benefits</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Medical students get special early access and discounted rates when we launch.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Institution (for professionals) */}
              {currentStep === 5 && userType === 'professional' && (
                <motion.div
                  key="step5-professional"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-md mx-auto"
                >
                  <div className="mb-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Where do you practice?</h2>
                    <p className="text-muted-foreground">Almost there! Just a few more details</p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="hospitalName">Hospital / Institution Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="hospitalName"
                          placeholder="City General Hospital"
                          value={formData.hospitalName}
                          onChange={(e) => updateForm('hospitalName', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hospitalCity">City *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="hospitalCity"
                          placeholder="New York"
                          value={formData.hospitalCity}
                          onChange={(e) => updateForm('hospitalCity', e.target.value)}
                          className="rounded-xl h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Select value={formData.hospitalCountry} onValueChange={(v) => updateForm('hospitalCountry', v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-[60] max-h-[300px]">
                          {countries.map(country => (
                            <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Your data is safe with us</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            We use enterprise-grade encryption and never share your information with third parties.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Final Step: Success */}
              {isCompleteStep && (
                <motion.div
                  key="step-complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col justify-center items-center text-center max-w-md mx-auto"
                >
                  <div className="relative mb-6">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-bounce">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <h1 className="text-2xl font-bold mb-3">
                    Welcome to the Future!
                  </h1>
                  
                  <p className="text-muted-foreground mb-4">
                    {userType === 'student' 
                      ? `${formData.firstName || 'Future Doctor'}, you are officially on the waitlist!`
                      : `Dr. ${formData.firstName || 'Pioneer'}, you are officially on the waitlist!`
                    }
                  </p>

                  <div className="p-3 rounded-xl bg-muted/50 mb-6 w-full">
                    <p className="text-sm text-muted-foreground">
                      Your position: <span className="font-bold text-foreground">#{waitlistNumber || '---'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      We will notify you at {formData.email || 'your email'} when it is your turn
                    </p>
                  </div>

                  {/* Share Section */}
                  <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-violet-500/10 to-primary/5 border border-primary/20 mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Share2 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-sm">Share & Move Up the Queue!</h3>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-4">
                      Invite colleagues and climb up the waitlist faster
                    </p>

                    <div className="flex items-center justify-center gap-3 mb-4">
                      {/* WhatsApp */}
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`🩺 I just joined the waitlist of Meddollina — the world's first Medical Contextual Clinical Intelligence platform!\n\n🚀 Come join me on this journey to the future of healthcare.\n\n👉 ${window.location.origin}/landing-meddollina`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                        className="h-11 w-11 rounded-full bg-[#25D366] hover:bg-[#20BD5A] flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg shadow-[#25D366]/30"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </button>

                      {/* Twitter/X */}
                      <button
                        onClick={() => {
                          const text = encodeURIComponent(`🩺 I just joined the waitlist of @Meddollina — the world's first Medical Contextual Clinical Intelligence platform!\n\n🚀 Join me on this journey to the future of healthcare 👉`);
                          const url = encodeURIComponent(`${window.location.origin}/landing-meddollina`);
                          window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
                        }}
                        className="h-11 w-11 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg shadow-black/30"
                      >
                        <Twitter className="h-5 w-5" />
                      </button>

                      {/* LinkedIn */}
                      <button
                        onClick={() => {
                          const url = encodeURIComponent(`${window.location.origin}/landing-meddollina`);
                          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
                        }}
                        className="h-11 w-11 rounded-full bg-[#0A66C2] hover:bg-[#004182] flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg shadow-[#0A66C2]/30"
                      >
                        <Linkedin className="h-5 w-5" />
                      </button>

                      {/* Facebook */}
                      <button
                        onClick={() => {
                          const url = encodeURIComponent(`${window.location.origin}/landing-meddollina`);
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                        }}
                        className="h-11 w-11 rounded-full bg-[#1877F2] hover:bg-[#0D65D9] flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg shadow-[#1877F2]/30"
                      >
                        <Facebook className="h-5 w-5" />
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/landing-meddollina`);
                          toast({
                            title: "Link copied!",
                            description: "Share it with your colleagues",
                          });
                        }}
                        className="h-11 w-11 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-all hover:scale-110 shadow-lg"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-background/80 border border-border/50">
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        "I just joined the waitlist of Meddollina — the world's first Medical Contextual Clinical Intelligence platform! Come join me on this journey to the future of healthcare."
                      </p>
                    </div>
                  </div>

                  <Button size="lg" className="w-full rounded-xl" onClick={handleClose}>
                    Done
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          {currentStep > 1 && !isCompleteStep && (
            <div className="p-6 border-t border-border bg-background">
              <div className="max-w-md mx-auto flex items-center justify-between">
                <Button variant="ghost" onClick={prevStep} className="rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {!isFinalFormStep ? (
                  <Button 
                    onClick={nextStep}
                    className={`rounded-xl px-8 ${!isCurrentStepValid() ? 'opacity-70' : ''}`}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className={`rounded-xl px-8 bg-gradient-to-r from-primary to-violet-600 ${
                      !isCurrentStepValid() && !isSubmitting ? 'opacity-70' : ''
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        Join Waitlist
                        <Rocket className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
