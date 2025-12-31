import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Activity,
  Heart,
  Brain,
  Stethoscope,
  AlertTriangle,
  Clock,
  MessageSquare,
  Target
} from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { API_ENDPOINTS } from '@/config/api';

interface ContextData {
  topic: string;
  subTopic?: string;
  condition: string;
  stage: string;
  score: number;
  messageCount: number;
  urgency: 'normal' | 'urgent' | 'emergency';
  specialty?: string;
}

interface ContextDisplayProps {
  conversationId: string;
  className?: string;
}

const specialtyIcons: Record<string, React.ElementType> = {
  cardiology: Heart,
  neurology: Brain,
  emergency: AlertTriangle,
  surgery: Activity,
  primary: Stethoscope,
};

const urgencyColors: Record<string, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  urgent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  emergency: 'bg-red-100 text-red-800 border-red-200',
};

const stageColors: Record<string, string> = {
  initial: 'bg-gray-100 text-gray-800',
  assessment: 'bg-blue-100 text-blue-800',
  diagnosis: 'bg-purple-100 text-purple-800',
  treatment: 'bg-orange-100 text-orange-800',
  followup: 'bg-green-100 text-green-800',
};

export const ContextDisplay: React.FC<ContextDisplayProps> = ({
  conversationId,
  className = ''
}) => {
  const [context, setContext] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get(API_ENDPOINTS.AI.FRONTEND_CONTEXT(conversationId));
        if (response.data.success) {
          setContext(response.data.data);
        } else {
          setError('Failed to load context');
        }
      } catch (err) {
        console.error('Error fetching context:', err);
        setError('Unable to load context');
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchContext();

      // Refresh context every 30 seconds
      const interval = setInterval(fetchContext, 30000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  if (loading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !context) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Context Unavailable
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const scoreColor = context.score >= 80 ? 'text-green-600' :
    context.score >= 60 ? 'text-yellow-600' : 'text-red-600';

  const IconComponent = context.specialty ? specialtyIcons[context.specialty] : null;

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {IconComponent ? <IconComponent className="h-4 w-4" /> : <Target className="h-4 w-4" />}
            {context.topic}
          </CardTitle>
          <Badge
            variant="outline"
            className={urgencyColors[context.urgency]}
          >
            {context.urgency}
          </Badge>
        </div>
        {context.subTopic && (
          <CardDescription className="text-xs">
            {context.subTopic}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Condition */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600">Condition</p>
          <p className="text-sm">{context.condition}</p>
        </div>

        {/* Conversation Stage */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-600">Stage</p>
          <Badge
            variant="secondary"
            className={stageColors[context.stage] || 'bg-gray-100 text-gray-800'}
          >
            {context.stage}
          </Badge>
        </div>

        {/* Context Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">Context Score</p>
            <span className={`text-xs font-semibold ${scoreColor}`}>
              {context.score}%
            </span>
          </div>
          <Progress value={context.score} className="h-2" />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MessageSquare className="h-3 w-3" />
            <span>{context.messageCount} messages</span>
          </div>
          {context.specialty && (
            <Badge variant="outline" className="text-xs">
              {context.specialty}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ContextDisplay;
