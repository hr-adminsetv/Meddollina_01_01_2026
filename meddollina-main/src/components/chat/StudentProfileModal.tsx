import React, { useState, useEffect, ReactNode } from 'react';
import { X, User, GraduationCap, MapPin, Phone, Mail, Calendar, Building2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import apiClient from '@/utils/apiClient';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StudentProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profession: string;
  department: string;
  specialization: string;
  bio: string;
  academic: {
    programType: string;
    studentIdOrRollNumber: string;
    expectedGraduationYear: number;
    collegeOrUniversityName: string;
    collegeCity: string;
    collegeCountry: string;
  };
}

export function StudentProfileModal({ isOpen, onClose }: StudentProfileModalProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  // Fetch student profile when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStudentProfile();
    }
  }, [isOpen]);

  const fetchStudentProfile = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/auth/student-profile');
      
      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to load student profile",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('[StudentProfileModal] Error fetching profile:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{
        animation: isClosing ? 'overlayFadeOut 0.2s ease-in forwards' : 'overlayFadeIn 0.3s ease-out forwards'
      }}
    >
      <style>{`
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes overlayFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes modalSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
        }
        .gradient-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }
      `}</style>
      
      {/* Backdrop click to close */}
      <div 
        className="absolute inset-0" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          animation: isClosing ? 'modalSlideOut 0.2s ease-in forwards' : 'modalSlideIn 0.4s ease-out 0.1s forwards',
          opacity: isClosing ? 1 : 0
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h2 className="text-xl font-bold">Student Profile</h2>
            <p className="text-sm text-muted-foreground">Manage your academic information</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading profile data...</p>
              </div>
            </div>
          ) : profile ? (
          <div className="space-y-6">
            {/* Profile Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{profile.firstName} {profile.lastName}</h3>
                <p className="text-sm text-muted-foreground">{profile.specialization || 'Medical Student'}</p>
                <p className="text-xs text-muted-foreground">{profile.academic.collegeOrUniversityName}</p>
              </div>
            </div>

            {/* Personal Information */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Personal Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9 h-9"
                      value={profile.email}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      className="pl-9 h-9"
                      value={profile.phoneNumber || 'Not provided'}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Academic Information */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Academic Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="programType" className="text-xs">Program</Label>
                  <Input
                    id="programType"
                    value={profile.academic.programType || 'Not specified'}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="studentId" className="text-xs">Student ID / Roll Number</Label>
                  <Input
                    id="studentId"
                    value={profile.academic.studentIdOrRollNumber || 'Not provided'}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="graduationYear" className="text-xs">Expected Graduation Year</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="graduationYear"
                      className="pl-9 h-9"
                      value={profile.academic.expectedGraduationYear || 'Not specified'}
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs">Department</Label>
                  <Input
                    id="department"
                    value={profile.department || 'Not specified'}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="university" className="text-xs">College/University</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="university"
                      className="pl-9 h-9"
                      value={profile.academic.collegeOrUniversityName || 'Not specified'}
                      disabled
                    />
                  </div>
                  {profile.academic.collegeCity && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {profile.academic.collegeCity}{profile.academic.collegeCountry && `, ${profile.academic.collegeCountry}`}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Bio */}
            {profile.bio && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold">About</h4>
                </div>
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <Textarea
                    value={profile.bio}
                    disabled
                    className="bg-muted/50 min-h-[80px] resize-none"
                  />
                </div>
              </section>
            )}
          </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No profile data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
