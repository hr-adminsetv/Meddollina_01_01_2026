import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import setvLogo from '@/assets/setv-logo.png';
import { toast } from '@/hooks/use-toast';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useAuth } from '@/contexts/AuthContext';

// Accomplishments and prompt examples for the animated background
const FLOATING_TEXTS = [
  "Diagnosed 10,000+ cases accurately",
  "What are the contraindications for metformin?",
  "Reduced diagnosis time by 60%",
  "Explain the pathophysiology of heart failure",
  "Trusted by 500+ healthcare professionals",
  "What's the differential diagnosis for chest pain?",
  "98.7% accuracy in clinical recommendations",
  "Summarize the latest guidelines for hypertension",
  "Processing 1M+ medical queries monthly",
  "What are the side effects of amoxicillin?",
  "Integrated with 50+ medical databases",
  "Help me interpret this ECG finding",
  "Real-time drug interaction alerts",
  "What's the treatment protocol for sepsis?",
  "Evidence-based clinical decision support",
  "Explain pediatric dosing for ibuprofen",
  "24/7 AI-powered medical assistance",
  "What are the symptoms of appendicitis?",
  "Multilingual medical support",
  "Review this patient's lab results",
  "Powering smarter clinical decisions",
  "Instant access to medical knowledge",
  "Your AI clinical companion",
  "Transforming healthcare with AI",
];

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
}

const Login = () => {
  const navigate = useNavigate();
  const { login: authLogin, isAuthenticated, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Generate a random floating text
  const createFloatingText = useCallback(() => {
    const id = Date.now() + Math.random();
    const text = FLOATING_TEXTS[Math.floor(Math.random() * FLOATING_TEXTS.length)];
    return {
      id,
      text,
      x: Math.random() * 80 + 10, // 10-90% from left
      y: Math.random() * 80 + 10, // 10-90% from top
      opacity: 0,
      scale: 0.8 + Math.random() * 0.4, // 0.8-1.2 scale
    };
  }, []);

  // Raindrop animation effect
  useEffect(() => {
    // Initial texts
    const initialTexts = Array.from({ length: 3 }, createFloatingText);
    setFloatingTexts(initialTexts);

    // Add new texts periodically
    const addInterval = setInterval(() => {
      setFloatingTexts(prev => {
        if (prev.length >= 6) return prev; // Max 6 at a time
        return [...prev, createFloatingText()];
      });
    }, 2000);

    // Remove old texts periodically
    const removeInterval = setInterval(() => {
      setFloatingTexts(prev => {
        if (prev.length <= 2) return prev; // Keep at least 2
        const indexToRemove = Math.floor(Math.random() * prev.length);
        return prev.filter((_, i) => i !== indexToRemove);
      });
    }, 3000);

    return () => {
      clearInterval(addInterval);
      clearInterval(removeInterval);
    };
  }, [createFloatingText]);

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chathome', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Don't render login form while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authLogin({ email, password });
      toast({
        title: "Welcome to Meddollina",
        description: "Initializing your clinical intelligence platform...",
      });
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials. Please verify and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Raindrop-style floating text background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating texts with raindrop effect */}
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            className="absolute text-foreground text-sm max-w-xs text-center animate-raindrop z-[5]"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%) scale(${item.scale})`,
            }}
          >
            {item.text}
          </div>
        ))}

        {/* Subtle radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main content - split layout */}
      <div className="relative z-20 min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
          <div className="max-w-md text-center">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl ring-2 ring-border/50">
                <img src={setvLogo} alt="Meddollina" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <h1 className="text-5xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Meddollina
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              The world's first medical contextual intelligence platform
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              {['AI-Powered', 'HIPAA Compliant', 'Evidence-Based'].map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-xl ring-2 ring-border/50">
                <img src={setvLogo} alt="Meddollina" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold">Meddollina</h1>
            </div>

            {/* Login card */}
            <div className="relative">
              <div className="absolute -inset-px bg-gradient-to-b from-primary/20 to-transparent rounded-3xl blur-sm" />
              
              <div className="relative bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-semibold mb-2">Welcome back</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign in to continue to your dashboard
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email / Account ID
                    </label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="doctor@meddollina.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-background/50 border-border/50 focus:border-primary rounded-xl pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Authenticating...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">New here?</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-border/50 hover:bg-primary/5"
                  onClick={() => navigate('/landing-meddollina')}
                >
                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                  Join the Waitlist
                </Button>

                {/* Demo hint */}
                <div className="mt-6 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <p className="text-xs text-center text-muted-foreground">
                    <span className="font-medium text-foreground">Demo:</span>{' '}
                    doctor@meddollina.com / Meddollina2024
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By signing in, you agree to our Terms & Privacy Policy
            </p>
          </div>
        </div>
      </div>

      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 left-6 z-30 text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/landing-meddollina')}
      >
        ← Back
      </Button>

      <ForgotPasswordModal open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />

      <style>{`
        @keyframes raindrop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          10% {
            opacity: 0.1;
          }
          25% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          75% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          90% {
            opacity: 0.1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
        }
        .animate-raindrop {
          animation: raindrop 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
