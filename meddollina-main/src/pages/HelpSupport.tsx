import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles, BookOpen, Lightbulb, Heart, MessageCircle, Rocket, Star, CheckCircle, ArrowRight, Send, Upload, X, FileText, Zap, Shield, CreditCard, Settings, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import setvLogo from '@/assets/setv-logo.png';

// Positive, solution-focused content
const quickWins = [
  {
    icon: Rocket,
    title: "Getting Started",
    description: "Begin your journey with Meddollina",
    color: "from-violet-500 to-purple-600",
    tips: [
      "Start with simple queries to understand AI responses",
      "Explore the chat interface features",
      "Set up your profile for personalized experience",
      "Check out keyboard shortcuts for faster navigation"
    ]
  },
  {
    icon: Sparkles,
    title: "Pro Tips",
    description: "Unlock the full potential",
    color: "from-amber-500 to-orange-600",
    tips: [
      "Use specific medical terminology for better results",
      "Break complex cases into focused questions",
      "Save important consultations for quick reference",
      "Use dark mode for comfortable late-night sessions"
    ]
  },
  {
    icon: Shield,
    title: "Your Data, Protected",
    description: "Security you can trust",
    color: "from-emerald-500 to-teal-600",
    tips: [
      "All data is encrypted end-to-end",
      "Enable 2FA for extra protection",
      "Your conversations remain private",
      "We never share data with third parties"
    ]
  },
  {
    icon: Heart,
    title: "Best Practices",
    description: "Get the most accurate insights",
    color: "from-rose-500 to-pink-600",
    tips: [
      "Include relevant patient history in queries",
      "Specify the type of guidance needed",
      "Cross-reference AI suggestions with guidelines",
      "Use follow-up questions for deeper insights"
    ]
  },
];

const learningPaths = [
  {
    icon: BookOpen,
    title: "Mastering AI Consultations",
    subtitle: "Learn to get precise, helpful responses",
    topics: [
      {
        title: "Crafting effective queries",
        content: "The key to great AI responses is specificity. Include relevant details like patient demographics, symptoms duration, and any relevant history. Instead of asking 'What causes headaches?', try 'What are differential diagnoses for a 45-year-old male with recurring temporal headaches and visual aura?'"
      },
      {
        title: "Understanding AI capabilities",
        content: "Our AI excels at synthesizing medical literature, suggesting differentials, and providing evidence-based recommendations. Use it as a knowledgeable colleague for brainstorming and verification, while maintaining your clinical judgment as the final decision-maker."
      },
      {
        title: "Handling complex cases",
        content: "For multi-system cases, break down your query into focused questions. Start with the primary concern, then explore related aspects. This helps the AI provide more thorough, organized responses that are easier to apply clinically."
      },
      {
        title: "Saving and organizing insights",
        content: "Use the conversation history to track your consultations. Star important responses for quick access. Export detailed conversations for documentation or further review with colleagues."
      }
    ]
  },
  {
    icon: User,
    title: "Account & Profile Mastery",
    subtitle: "Personalize your experience",
    topics: [
      {
        title: "Setting up your professional profile",
        content: "A complete profile helps tailor responses to your specialty. Add your department, specialization, and years of experience. This context helps the AI provide more relevant suggestions for your practice area."
      },
      {
        title: "Managing notification preferences",
        content: "Customize what updates you receive and how. Access Settings from your profile menu to adjust email notifications, in-app alerts, and digest preferences to match your workflow."
      },
      {
        title: "Theme and accessibility options",
        content: "Toggle between light and dark themes using the sun/moon icon in the header. The interface automatically respects your system preferences, or you can set it manually for your comfort."
      },
      {
        title: "Keeping credentials updated",
        content: "Your name and license information are verified for compliance. To update these, our team will verify the changes within 24-48 hours to maintain platform integrity and trust."
      }
    ]
  },
  {
    icon: Zap,
    title: "Speed & Performance Tips",
    subtitle: "Optimize your workflow",
    topics: [
      {
        title: "Keyboard shortcuts for power users",
        content: "Press '/' to quickly focus the search, 'N' for new chat, and 'Esc' to close modals. These shortcuts help you navigate faster without reaching for the mouse."
      },
      {
        title: "Optimizing for slow connections",
        content: "If you are on a slower network, the app automatically adjusts. You can also reduce browser tabs and disable unnecessary extensions to improve performance."
      },
      {
        title: "Mobile optimization",
        content: "The app is fully responsive. For the best mobile experience, use the latest Chrome (Android) or Safari (iOS). Add to home screen for an app-like experience."
      },
      {
        title: "Managing conversation history",
        content: "Archive old conversations you do not need regularly. This keeps your workspace clean and improves app performance. Archived chats remain searchable when needed."
      }
    ]
  },
  {
    icon: CreditCard,
    title: "Subscription & Billing",
    subtitle: "Understand your plan",
    topics: [
      {
        title: "Current plan: Select Version",
        content: "You are on the Select Version - our foundational tier that includes AI consultations, standard response times, and community support. Premium features with advanced capabilities are coming in future updates."
      },
      {
        title: "Understanding your usage",
        content: "Track your consultation count and feature usage in Account Settings. The Select Version includes generous limits suitable for regular clinical use."
      },
      {
        title: "Future premium features",
        content: "We are developing advanced features including priority response times, extended conversation memory, specialized modules, and team collaboration tools. Stay tuned for announcements."
      },
      {
        title: "Billing and receipts",
        content: "Access your billing history and download receipts anytime from Account Settings > Billing. All transactions are secure and encrypted."
      }
    ]
  },
];

const successStories = [
  {
    quote: "The AI helped me consider a rare differential I might have missed. Patient was diagnosed early and treated successfully.",
    author: "Dr. Sarah Chen",
    role: "Internal Medicine",
    avatar: "SC"
  },
  {
    quote: "Having instant access to evidence-based recommendations has transformed my consultation efficiency.",
    author: "Dr. Michael Roberts",
    role: "Emergency Medicine",
    avatar: "MR"
  },
  {
    quote: "The interface is intuitive and the responses are remarkably relevant to my cardiology practice.",
    author: "Dr. Priya Sharma",
    role: "Cardiology",
    avatar: "PS"
  }
];

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPath, setExpandedPath] = useState<number | null>(0);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedWin, setExpandedWin] = useState<number | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: '',
    message: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [typingText, setTypingText] = useState('');
  const fullText = "What would you like to learn today?";

  // Typing animation effect
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypingText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Filter content based on search
  const filteredPaths = learningPaths.filter(path =>
    path.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    path.topics.some(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 3 - attachments.length);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Please complete the form",
        description: "Subject and message are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Message sent! 🎉",
      description: "We will get back to you within 24 hours.",
    });
    
    setContactForm({ subject: '', category: '', message: '' });
    setAttachments([]);
    setIsSubmitting(false);
    setShowContact(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-violet-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={setvLogo} alt="SETV Logo" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold">Knowledge Hub</h1>
              <p className="text-xs text-muted-foreground">Learn & Grow</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowContact(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Chat with us</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.close()}>
              Back to App
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          {/* Floating Icons */}
          <div className="relative mb-8">
            <div className="absolute -top-4 left-1/4 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute -top-2 right-1/4 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="absolute top-8 left-1/3 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '1s' }}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="absolute top-6 right-1/3 animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Heart className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Star className="h-4 w-4" />
            Everything you need to succeed
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
            {typingText}
            <span className="animate-pulse">|</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Discover tips, master features, and unlock the full potential of your clinical AI assistant
          </p>

          {/* Search Bar */}
          <div className={`relative max-w-2xl mx-auto transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-primary/20 via-violet-500/20 to-primary/20 rounded-2xl blur-xl transition-opacity duration-300 ${searchFocused ? 'opacity-100' : 'opacity-0'}`} />
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search guides, tips, and answers..."
                className="pl-14 pr-6 h-14 text-lg rounded-2xl border-2 border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-20 space-y-20 relative z-10">
        {/* Quick Wins Section */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Quick Wins</h2>
            <p className="text-muted-foreground">Instant tips to enhance your experience</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickWins.map((win, index) => (
              <div
                key={index}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${win.color} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 blur-xl`} />
                <div 
                  className="relative h-full border border-border/50 rounded-2xl bg-card/50 backdrop-blur-sm p-5 cursor-pointer hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  onClick={() => setExpandedWin(expandedWin === index ? null : index)}
                >
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${win.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <win.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{win.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{win.description}</p>
                  
                  <div className={`overflow-hidden transition-all duration-300 ${expandedWin === index ? 'max-h-48' : 'max-h-0'}`}>
                    <div className="pt-3 border-t border-border/50 space-y-2">
                      {win.tips.map((tip, tipIndex) => (
                        <div key={tipIndex} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-primary text-sm mt-2">
                    <span>{expandedWin === index ? 'Show less' : 'Learn more'}</span>
                    <ArrowRight className={`h-4 w-4 transition-transform ${expandedWin === index ? 'rotate-90' : ''}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Learning Paths Section */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Learning Paths</h2>
            <p className="text-muted-foreground">Deep dive into every aspect of the platform</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {filteredPaths.map((path, pathIndex) => (
              <div
                key={pathIndex}
                className="border border-border/50 rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 transition-all duration-300"
              >
                {/* Path Header */}
                <button
                  className="w-full p-5 text-left flex items-center gap-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedPath(expandedPath === pathIndex ? null : pathIndex)}
                >
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                    <path.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{path.title}</h3>
                    <p className="text-sm text-muted-foreground">{path.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{path.topics.length} topics</span>
                    {expandedPath === pathIndex ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Topics */}
                {expandedPath === pathIndex && (
                  <div className="border-t border-border/50">
                    {path.topics.map((topic, topicIndex) => {
                      const topicKey = `${pathIndex}-${topicIndex}`;
                      const isExpanded = expandedTopic === topicKey;
                      
                      return (
                        <div key={topicIndex} className="border-b border-border/30 last:border-b-0">
                          <button
                            className="w-full p-4 pl-8 text-left flex items-center gap-3 hover:bg-muted/20 transition-colors"
                            onClick={() => setExpandedTopic(isExpanded ? null : topicKey)}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <span className="text-sm font-medium">{topicIndex + 1}</span>
                            </div>
                            <span className="flex-1 font-medium">{topic.title}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          {isExpanded && (
                            <div className="px-8 pb-4">
                              <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30">
                                <p className="text-muted-foreground leading-relaxed">{topic.content}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {searchQuery && filteredPaths.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No results for "{searchQuery}"</h3>
                <p className="text-muted-foreground text-sm">Try different keywords or browse the sections above</p>
              </div>
            )}
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">What Doctors Say</h2>
            <p className="text-muted-foreground">Join thousands of healthcare professionals</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {successStories.map((story, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">"{story.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white font-semibold text-sm">
                    {story.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{story.author}</p>
                    <p className="text-xs text-muted-foreground">{story.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Still Need Help - Positive CTA */}
        <section className="max-w-2xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-violet-500/10 to-primary/10 border border-primary/20 p-8 text-center">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Want to chat with us?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Our team loves hearing from you. Whether it is a question, feedback, or just saying hi - we are here for you.
              </p>
              <Button 
                size="lg" 
                className="rounded-full px-8 bg-gradient-to-r from-primary to-violet-600 hover:opacity-90"
                onClick={() => setShowContact(true)}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Start a conversation
              </Button>
              <p className="text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2">
                <Clock className="h-3 w-3" />
                Usually responds within 24 hours
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Contact Modal */}
      {showContact && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowContact(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.3s ease-out forwards' }}
          >
            <style>{`
              @keyframes modalSlideIn {
                from { opacity: 0; transform: scale(0.95) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>

            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-violet-500/10 border-b border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-8 w-8 rounded-full"
                onClick={() => setShowContact(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Send us a message</h3>
                  <p className="text-sm text-muted-foreground">We would love to hear from you</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What is this about?"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Select
                  value={contactForm.category}
                  onValueChange={(value) => setContactForm(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="question">General Question</SelectItem>
                    <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="other">Something Else</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more..."
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Attachments (optional)</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={attachments.length >= 3}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      Add files
                    </div>
                  </label>
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-sm">
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Message
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/20 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Made with ❤️ for healthcare professionals
          </p>
          <p className="text-xs text-muted-foreground">
            © 2024 Meddollina. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
