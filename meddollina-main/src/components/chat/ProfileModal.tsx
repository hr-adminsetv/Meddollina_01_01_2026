import { useState, useEffect } from 'react';
import { X, User, Building2, Stethoscope, FileText, MapPin, Phone, Mail, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    profession: 'Physician',
    department: '',
    specialization: '',
    medicalLicenseId: '',
    licenseExpiryDate: '',
    hospitalName: '',
    hospitalAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    yearsOfExperience: '',
    bio: '',
  });

  // Fetch user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen]);

  const fetchUserProfile = async () => {
    setIsLoading(true);
    try {
      const userData = await userService.getCurrentProfile();
      console.log('[ProfileModal] Fetched user data:', userData);
      
      // Map the MongoDB user data to our profile state
      setProfile({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        profession: userData.profession || 'Physician',
        department: userData.department || '',
        specialization: userData.specialization || '',
        medicalLicenseId: userData.medicalLicenseId || '',
        licenseExpiryDate: userData.licenseExpiryDate ? 
          new Date(userData.licenseExpiryDate).toISOString().split('T')[0] : '',
        hospitalName: userData.hospital?.name || '',
        hospitalAddress: userData.hospital?.streetAddress || '',
        city: userData.hospital?.city || '',
        state: userData.hospital?.state || '',
        zipCode: userData.hospital?.zipCode || '',
        country: userData.hospital?.country || '',
        yearsOfExperience: userData.yearsOfExperience?.toString() || '',
        bio: userData.bio || '',
      });
    } catch (error: any) {
      console.error('[ProfileModal] Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Format the data for backend - convert string years to number and structure hospital object
      const updateData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        profession: profile.profession,
        department: profile.department,
        specialization: profile.specialization,
        medicalLicenseId: profile.medicalLicenseId,
        licenseExpiryDate: profile.licenseExpiryDate,
        yearsOfExperience: profile.yearsOfExperience ? parseInt(profile.yearsOfExperience) : undefined,
        bio: profile.bio,
        hospital: {
          name: profile.hospitalName,
          streetAddress: profile.hospitalAddress,
          city: profile.city,
          state: profile.state,
          zipCode: profile.zipCode,
          country: profile.country
        }
      };
      
      await userService.updateProfile(updateData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('[ProfileModal] Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setIsEditing(false);
      onClose();
    }, 200);
  };

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

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
            <h2 className="text-xl font-bold">Profile Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your professional information</p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
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
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading profile data...</p>
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Profile Avatar Section */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Dr. {profile.firstName} {profile.lastName}</h3>
                <p className="text-sm text-muted-foreground">{profile.specialization}</p>
                <p className="text-xs text-muted-foreground">{profile.hospitalName}</p>
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
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
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
                      onChange={(e) => handleChange('email', e.target.value)}
                      disabled={!isEditing}
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
                      value={profile.phoneNumber}
                      onChange={(e) => handleChange('phoneNumber', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Professional Information */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Stethoscope className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Professional Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="profession" className="text-xs">Profession</Label>
                  <Select
                    value={profile.profession}
                    onValueChange={(value) => handleChange('profession', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select profession" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Physician">Physician</SelectItem>
                      <SelectItem value="Surgeon">Surgeon</SelectItem>
                      <SelectItem value="Nurse Practitioner">Nurse Practitioner</SelectItem>
                      <SelectItem value="Medical Specialist">Medical Specialist</SelectItem>
                      <SelectItem value="Resident">Resident</SelectItem>
                      <SelectItem value="Fellow">Fellow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs">Department</Label>
                  <Select
                    value={profile.department}
                    onValueChange={(value) => handleChange('department', value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cardiology">Cardiology</SelectItem>
                      <SelectItem value="Neurology">Neurology</SelectItem>
                      <SelectItem value="Oncology">Oncology</SelectItem>
                      <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                      <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                      <SelectItem value="General Surgery">General Surgery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="specialization" className="text-xs">Specialization</Label>
                  <Input
                    id="specialization"
                    value={profile.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                    placeholder="e.g., Interventional Cardiology"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearsOfExperience" className="text-xs">Years of Experience</Label>
                  <Input
                    id="yearsOfExperience"
                    type="number"
                    value={profile.yearsOfExperience}
                    onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            {/* License Information */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">License Information</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="medicalLicenseId" className="text-xs">Medical License ID</Label>
                  <Input
                    id="medicalLicenseId"
                    value={profile.medicalLicenseId}
                    onChange={(e) => handleChange('medicalLicenseId', e.target.value)}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="licenseExpiryDate" className="text-xs">License Expiry Date</Label>
                  <Input
                    id="licenseExpiryDate"
                    type="date"
                    value={profile.licenseExpiryDate}
                    onChange={(e) => handleChange('licenseExpiryDate', e.target.value)}
                    disabled
                    className="bg-muted/50 h-9"
                  />
                </div>
              </div>
            </section>

            {/* Hospital/Institution Information */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Hospital / Institution</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="hospitalName" className="text-xs">Hospital / Institution Name</Label>
                  <Input
                    id="hospitalName"
                    value={profile.hospitalName}
                    onChange={(e) => handleChange('hospitalName', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="hospitalAddress" className="text-xs">Street Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="hospitalAddress"
                      className="pl-9 h-9"
                      value={profile.hospitalAddress}
                      onChange={(e) => handleChange('hospitalAddress', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state" className="text-xs">State / Province</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="zipCode" className="text-xs">ZIP / Postal Code</Label>
                  <Input
                    id="zipCode"
                    value={profile.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-xs">Country</Label>
                  <Input
                    id="country"
                    value={profile.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                    disabled={!isEditing}
                    className="h-9"
                  />
                </div>
              </div>
            </section>

            {/* Bio */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold">Professional Bio</h4>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs">About You</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Write a brief professional bio..."
                  />
                </div>
              </div>
            </section>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
