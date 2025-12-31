import { Menu, User, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { SubscriptionModal } from './SubscriptionModal';
import { ProfileModal } from './ProfileModal';
import { StudentProfileModal } from './StudentProfileModal';
import { userService, type UserProfile } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';

interface ChatHeaderProps {
  onMenuClick: () => void;
  currentContext?: {
    topic: string;
    score: number;
    messageCount: number;
  } | null;
}

export function ChatHeader({ onMenuClick, currentContext }: ChatHeaderProps) {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Sync state with actual DOM on mount
    setIsDark(document.documentElement.classList.contains('dark'));
    // Fetch user profile
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await userService.getCurrentProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('[ChatHeader] Error fetching user profile:', error);
    }
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="hidden sm:block">
            <h2 className="font-medium text-sm">Clinical Intelligence</h2>
            <p className="text-xs text-muted-foreground">
              {currentContext?.topic ? (
                <span className="flex items-center gap-2">
                  <span>Topic: {currentContext.topic}</span>
                  {currentContext.score < 80 && (
                    <span className="text-orange-500">⚠️</span>
                  )}
                </span>
              ) : (
                'New consultation'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email : 'Loading...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.profession === 'physician' ? 'Physician' :
                   userProfile?.profession === 'nurse' ? 'Nurse' :
                   userProfile?.profession === 'researcher' ? 'Researcher' :
                   userProfile?.department || 'Medical Professional'}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSubscriptionOpen(true)}>Subscription</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open('/help-support', '_blank')}>Help & Support</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SubscriptionModal 
        isOpen={isSubscriptionOpen} 
        onClose={() => setIsSubscriptionOpen(false)} 
      />
      {/* Conditionally render profile modal based on user role */}
      {user?.role === 'student' ? (
        <StudentProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
        />
      ) : (
        <ProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
        />
      )}
    </>
  );
}
