import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, KeyRound, Lock, Check, Eye, EyeOff } from 'lucide-react';
import authService from '@/services/authService';

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'otp' | 'reset';

const ForgotPasswordModal = ({ open, onOpenChange }: ForgotPasswordModalProps) => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetModal = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setGeneratedOtp('');
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Error", description: "Please enter your email", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authService.sendPasswordResetOTP(email.trim());
      
      toast({
        title: "✅ OTP Sent!",
        description: "A verification code has been sent to your email. Check your inbox!",
      });
      
      setStep('otp');
    } catch (error: any) {
      console.error('Send OTP error:', error);
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to send OTP. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({ title: "Error", description: "Please enter the OTP", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      await authService.verifyPasswordResetOTP(email, otp.trim());
      
      toast({ 
        title: "✅ Verified!", 
        description: "OTP verified successfully. You can now reset your password." 
      });
      
      setStep('reset');
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      toast({ 
        title: "Invalid OTP", 
        description: error.response?.data?.message || "Please enter the correct verification code",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordChecks = {
    minLength: newPassword.length >= 12,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[@#$%^&*]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast({ title: "Error", description: "Password does not meet all requirements", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      await authService.resetPassword(email, otp, newPassword);
      
      toast({
        title: "🎉 Password Reset Successful!",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      
      handleClose();
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to reset password. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {['email', 'otp', 'reset'].map((s, index) => (
        <div key={s} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            step === s 
              ? 'bg-primary text-primary-foreground' 
              : ['email', 'otp', 'reset'].indexOf(step) > index
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
          }`}>
            {['email', 'otp', 'reset'].indexOf(step) > index ? (
              <Check className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < 2 && (
            <div className={`w-8 h-0.5 mx-1 transition-colors ${
              ['email', 'otp', 'reset'].indexOf(step) > index ? 'bg-primary/50' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            {step !== 'email' && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-4 h-8 w-8"
                onClick={() => setStep(step === 'reset' ? 'otp' : 'email')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'reset' && 'Reset Password'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {step === 'email' && 'Enter your email to receive a password reset code'}
            {step === 'otp' && 'Enter the OTP sent to your email'}
            {step === 'reset' && 'Create a new password for your account'}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a verification code
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email / Account ID
              </label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="doctor@meddollina.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 rounded-xl"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </Button>
            
            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code?{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={handleSendOtp}
              >
                Resend
              </button>
            </p>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Create a new password for your account
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Password must have:</p>
                <div className={`flex items-center gap-2 text-xs ${passwordChecks.minLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.minLength ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {passwordChecks.minLength ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                  </div>
                  At least 12 characters
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasUppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.hasUppercase ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {passwordChecks.hasUppercase ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                  </div>
                  At least one uppercase letter (A-Z)
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.hasNumber ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {passwordChecks.hasNumber ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                  </div>
                  At least one number (0-9)
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordChecks.hasSpecial ? 'text-green-500' : 'text-muted-foreground'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordChecks.hasSpecial ? 'bg-green-500/20' : 'bg-muted'}`}>
                    {passwordChecks.hasSpecial ? <Check className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                  </div>
                  At least one special character (@#$%^&*)
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full h-12 rounded-xl"
              disabled={isLoading || !isPasswordValid}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Resetting...
                </div>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;
