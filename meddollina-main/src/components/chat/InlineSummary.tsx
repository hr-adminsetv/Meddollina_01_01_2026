/**
 * =============================================================================
 * INLINE SUMMARY DISPLAY COMPONENT
 * =============================================================================
 * 
 * This component displays a summary of the current chat conversation
 * in a collapsible panel that appears below the chat messages.
 * 
 * FEATURES:
 * - Collapsible summary panel
 * - Shows compression statistics
 * - Can be dismissed by user
 * - Smooth animations
 * - Responsive design
 */

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InlineSummaryProps {
  summary: string;
  originalWords: number;
  summaryWords: number;
  compressionRatio: string;
  onClose: () => void;
}

export function InlineSummary({
  summary,
  originalWords,
  summaryWords,
  compressionRatio,
  onClose
}: InlineSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mx-4 mb-4 animate-in slide-in-from-bottom-2 duration-300">
      {/* Summary Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-blue-100/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-blue-900">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">AI Summary</span>
            </div>
            <span className="text-xs text-blue-600 bg-blue-200/50 px-2 py-1 rounded-full">
              {compressionRatio} compression
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-200/50 h-8 px-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show More
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-200/50 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96" : "max-h-24 overflow-hidden"
        )}>
          <div className="p-4 pt-0">
            <div className="bg-white rounded-md p-3 border border-blue-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-blue-600">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{originalWords} words → {summaryWords} words</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Saved:</span>
                <span>{originalWords - summaryWords} words</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
