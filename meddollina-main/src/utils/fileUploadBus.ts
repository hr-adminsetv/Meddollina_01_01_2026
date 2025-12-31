/**
 * File Upload Event Bus
 * 
 * A global event system to bypass React's prop system
 * which is mysteriously stripping the files parameter.
 * 
 * This uses a simple pub-sub pattern to pass files
 * directly from ChatInput to Chat without going through props.
 */

import { AttachedFile } from '@/components/chat/ChatInput';

class FileUploadBus {
  private pendingFiles: AttachedFile[] | undefined = undefined;
  private listeners: ((files: AttachedFile[] | undefined) => void)[] = [];

  /**
   * Store files to be picked up by the next message send
   */
  setFiles(files: AttachedFile[] | undefined) {
    console.log('[FileUploadBus] Storing files:', files);
    this.pendingFiles = files;
    // Notify all listeners
    this.listeners.forEach(listener => listener(files));
  }

  /**
   * Get and clear pending files (consume once)
   */
  getAndClearFiles(): AttachedFile[] | undefined {
    const files = this.pendingFiles;
    console.log('[FileUploadBus] Retrieving files:', files);
    this.pendingFiles = undefined;
    return files;
  }

  /**
   * Check if files are pending without consuming
   */
  hasFiles(): boolean {
    return this.pendingFiles !== undefined && this.pendingFiles.length > 0;
  }

  /**
   * Subscribe to file changes
   */
  subscribe(listener: (files: AttachedFile[] | undefined) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all pending files
   */
  clear() {
    this.pendingFiles = undefined;
    this.listeners.forEach(listener => listener(undefined));
  }
}

// Create a singleton instance
export const fileUploadBus = new FileUploadBus();

// For debugging - expose to window
if (typeof window !== 'undefined') {
  (window as any).fileUploadBus = fileUploadBus;
}
