import { useState, useEffect } from 'react';
import { X, Crown, Calendar, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  
  // Mock user subscription data
  const subscriptionData = {
    userId: 'USR-2024-78945',
    version: 'Select',
    versionTag: 'Free',
    validity: 'Lifetime Access',
    validUntil: 'No Expiry',
    features: [
      'Basic AI Chat Assistant',
      'Standard Response Time',
      'Community Support',
      'Basic Analytics',
    ],
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
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
        className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: isClosing ? 'modalSlideOut 0.2s ease-in forwards' : 'modalSlideIn 0.4s ease-out 0.1s forwards',
          opacity: isClosing ? 1 : 0
        }}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-background/20"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {subscriptionData.version} Version
              </h2>
              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
                {subscriptionData.versionTag}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* User ID */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">User ID</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {subscriptionData.userId}
              </p>
            </div>
          </div>

          {/* Version */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="text-sm font-medium text-foreground">
                {subscriptionData.version} Version
              </p>
            </div>
          </div>

          {/* Validity */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Validity</p>
              <p className="text-sm font-medium text-foreground">
                {subscriptionData.validity}
              </p>
              <p className="text-xs text-muted-foreground">
                {subscriptionData.validUntil}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground mb-3">Included Features</p>
            <ul className="space-y-2">
              {subscriptionData.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground">
              Premium plans coming soon in future drops
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
