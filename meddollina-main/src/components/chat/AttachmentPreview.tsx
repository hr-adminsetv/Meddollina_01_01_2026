/**
 * AttachmentPreview Component
 * Displays file attachments in chat messages with download and OCR status
 */

import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Attachment } from '@/services/chatService';
import chatService from '@/services/chatService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AttachmentPreviewProps {
  attachment: Attachment;
  messageId?: string;
}

/**
 * AttachmentPreview Component
 * Shows file information, OCR status, and download capability
 */
export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  attachment,
  messageId 
}) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  /**
   * Get file icon based on type
   */
  const getFileIcon = () => {
    if (attachment.type === 'image') {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-orange-500" />;
  };

  /**
   * Get OCR status badge
   */
  const getOcrStatusBadge = () => {
    if (attachment.ocrError) {
      return (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span>OCR Failed</span>
        </div>
      );
    }

    if (attachment.ocrProcessed) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>Text Extracted</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-xs text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  };

  /**
   * Handle file download
   */
  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Debug: Log the full attachment object
      console.log('[Download] Full attachment:', attachment);
      
      // Use blobName from attachment if available, otherwise extract from URL
      let blobName, container;
      
      if (attachment.blobName && attachment.container) {
        // Use stored values
        blobName = attachment.blobName;
        container = attachment.container;
        console.log('[Download] Using stored blobName:', blobName);
        console.log('[Download] Using stored container:', container);
      } else {
        // Extract from blobUrl - need to get the full path after container
        // URL format: https://account.blob.core.windows.net/container/userId/conversationId/filename
        const url = new URL(attachment.blobUrl);
        const pathParts = url.pathname.split('/').filter(p => p);
        container = pathParts[0]; // First part is container
        blobName = pathParts.slice(1).join('/'); // Everything after container is blobName
        
        console.log('[Download] Extracted from URL:');
        console.log('  - Full URL:', attachment.blobUrl);
        console.log('  - Path parts:', pathParts);
        console.log('  - Container:', container);
        console.log('  - BlobName:', blobName);
      }
      
      console.log('[Download] Making request to backend...');

      // Download file from backend
      const blob = await chatService.downloadFile(blobName, container);
      console.log('[Download] Received blob:', blob);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `Downloading ${attachment.originalName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border bg-muted/30",
      "hover:bg-muted/50 transition-colors"
    )}>
      {/* File Icon */}
      <div className="flex-shrink-0">
        {getFileIcon()}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {attachment.originalName}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.size)}
          </p>
          <span className="text-xs text-muted-foreground">•</span>
          {getOcrStatusBadge()}
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={cn(
          "flex-shrink-0 p-2 rounded-md",
          "hover:bg-muted transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        title="Download file"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

/**
 * AttachmentList Component
 * Displays multiple attachments in a grid
 */
interface AttachmentListProps {
  attachments: Attachment[];
  messageId?: string;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({ 
  attachments, 
  messageId 
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          messageId={messageId}
        />
      ))}
    </div>
  );
};

export default AttachmentPreview;
