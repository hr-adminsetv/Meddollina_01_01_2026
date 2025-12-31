import { Stethoscope, Brain, Pill, Scissors, Heart, Activity, FileText, Microscope, Sparkles } from 'lucide-react';
import setvLogo from '@/assets/setv-logo.png';

const capabilities = [
  {
    icon: Stethoscope,
    title: 'Diagnostics',
    description: 'Differential diagnosis, symptom analysis, and clinical reasoning support',
  },
  {
    icon: Brain,
    title: 'Prognostics',
    description: 'Evidence-based outcome predictions and risk assessments',
  },
  {
    icon: Pill,
    title: 'Treatment Planning',
    description: 'Drug interactions, dosing guidance, and protocol recommendations',
  },
  {
    icon: Scissors,
    title: 'Surgical Planning',
    description: 'Pre-operative assessments and surgical approach optimization',
  },
  {
    icon: Heart,
    title: 'Lifestyle & Diet',
    description: 'Personalized patient lifestyle and nutrition recommendations',
  },
  {
    icon: Microscope,
    title: 'Lab Interpretation',
    description: 'Comprehensive lab result analysis and clinical correlations',
  },
];

const suggestions = [
  { icon: Sparkles, text: 'Differential diagnosis for chest pain with elevated troponin' },
  { icon: FileText, text: 'Review treatment protocol for Type 2 Diabetes management' },
  { icon: Sparkles, text: 'Drug interaction check for new prescription' },
  { icon: FileText, text: 'Interpret this lab result panel' },
];

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full text-center">
        {/* Logo & Title */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg shadow-primary/20">
            <img src={setvLogo} alt="SETV Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome to <span className="gradient-text">Meddollina</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered clinical intelligence companion
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 hover:border-primary/30 transition-[background-color,border-color] cursor-pointer group"
            >
              <capability.icon className="w-6 h-6 text-primary mb-2 mx-auto group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-sm mb-1">{capability.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{capability.description}</p>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-4">Try asking:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion.text)}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-[background-color,border-color] text-left group"
              >
                <suggestion.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground leading-relaxed">
                  {suggestion.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <span>Real-time Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <span>Evidence-Based</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            <span>Contextual AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
