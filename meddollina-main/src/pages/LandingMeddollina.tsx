import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Stethoscope, Brain, Pill, Scissors, Heart, Microscope, ArrowRight, Sparkles, Moon, Sun, Menu, X } from 'lucide-react';
import setvLogo from '@/assets/setv-logo.png';
import { AnimatedCard } from '@/components/AnimatedCard';
import { WaitlistModal } from '@/components/WaitlistModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const features = [
  {
    icon: Stethoscope,
    title: 'Diagnostics',
    description: 'Differential diagnosis and symptom analysis',
  },
  {
    icon: Brain,
    title: 'Prognostics',
    description: 'Evidence-based outcome predictions',
  },
  {
    icon: Pill,
    title: 'Treatment Planning',
    description: 'Drug interactions and protocol guidance',
  },
  {
    icon: Scissors,
    title: 'Surgical Planning',
    description: 'Pre-operative assessments',
  },
  {
    icon: Heart,
    title: 'Lifestyle & Diet',
    description: 'Personalized recommendations',
  },
  {
    icon: Microscope,
    title: 'Lab Interpretation',
    description: 'Comprehensive result analysis',
  },
];

const LandingMeddollina = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleJoinWaitlist = () => {
    const scrollTarget = (document.documentElement.scrollHeight - window.innerHeight) / 2;
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    setIsWaitlistOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src={setvLogo} alt="SETV Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight">Meddollina</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button onClick={handleJoinWaitlist} size="sm" className="sm:size-default">
              <Sparkles className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Join Waitlist</span>
            </Button>
            <Button variant="outline" onClick={handleLogin} size="sm" className="sm:size-default">
              <span className="hidden sm:inline">Login</span>
              <span className="sm:hidden">Login</span>
              <ArrowRight className="ml-1 sm:ml-2 w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <Button onClick={() => { handleJoinWaitlist(); setMobileMenuOpen(false); }} className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Join Waitlist
                  </Button>
                  <Button variant="outline" onClick={() => { handleLogin(); setMobileMenuOpen(false); }} className="w-full">
                    Login
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <AnimatedCard delay={0}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden mx-auto mb-6 sm:mb-8 shadow-xl shadow-primary/20">
              <img src={setvLogo} alt="SETV Logo" className="w-full h-full object-cover" />
            </div>
          </AnimatedCard>
          <AnimatedCard delay={100}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
              Your AI-Powered{' '}
              <span className="gradient-text">Clinical Intelligence</span>{' '}
              Companion
            </h1>
          </AnimatedCard>
          <AnimatedCard delay={200}>
            <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Advanced medical AI assistance for healthcare professionals. Get evidence-based insights, 
              diagnostic support, and treatment recommendations in real-time.
            </p>
          </AnimatedCard>
          <AnimatedCard delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8" onClick={handleJoinWaitlist}>
                <Sparkles className="mr-2 w-5 h-5" />
                Join the Waitlist
              </Button>
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8" onClick={handleLogin}>
                Login
              </Button>
            </div>
          </AnimatedCard>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Comprehensive Clinical Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <AnimatedCard key={index} delay={index * 100}>
              <div className="p-6 rounded-2xl border border-border bg-card hover:bg-secondary/30 hover:border-primary/30 transition-[background-color,border-color] duration-200 cursor-pointer group h-full">
                <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="waitlist-form" className="container mx-auto px-4 py-12 sm:py-20">
        <AnimatedCard>
          <div className="max-w-4xl mx-auto text-center p-6 sm:p-12 rounded-3xl gradient-primary">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Transform Your Clinical Practice?
            </h2>
            <p className="text-white/90 text-base sm:text-lg mb-6 sm:mb-8">
              Join healthcare professionals worldwide using AI-assisted clinical intelligence.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={handleJoinWaitlist}
              className="text-base sm:text-lg px-6 sm:px-8"
            >
              Join the Waitlist
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </AnimatedCard>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Meddollina. AI-assisted clinical intelligence.</p>
          <p className="text-sm mt-2">Always verify with clinical judgment and guidelines.</p>
        </div>
      </footer>

      {/* Waitlist Modal */}
      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
    </div>
  );
};

export default LandingMeddollina;
