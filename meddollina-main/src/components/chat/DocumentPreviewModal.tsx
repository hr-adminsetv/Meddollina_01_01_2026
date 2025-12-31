import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  X, 
  FileImage,
  Printer,
  Loader2,
  Sparkles,
  FileDown,
  FileText as FileMedical,
  FileText as FileType,
  FileText as FileType2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  downloadAsPDF, 
  downloadAsText, 
  downloadAsWord, 
  downloadChatAsPDF, 
  downloadChatAsText, 
  downloadChatAsWord,
  DownloadType 
} from '@/utils/downloadUtils';
import { toast } from '@/hooks/use-toast';
import aiService from '@/services/aiService';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DownloadType;
  content: string;
  messages?: Message[];
  logoUrl?: string;
  isFullChat?: boolean;
  conversationId?: string;
  fileName?: string;
  user?: any;
}

export const DocumentPreviewModal = ({ 
  isOpen, 
  onClose, 
  type, 
  content, 
  messages = [],
  fileName, 
  conversationId,
  logoUrl = '',
  isFullChat = false,
  user
}: DocumentPreviewModalProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isGeneratingCaseSheet, setIsGeneratingCaseSheet] = useState(false);
  const [caseSheet, setCaseSheet] = useState<string | null>(null);
  const [showCaseSheet, setShowCaseSheet] = useState(false);
  const [patientInfo, setPatientInfo] = useState({
    age: '',
    gender: '',
    identifier: ''
  });
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf');

  // Auto-generate summary when modal opens with type='summarisation'
  useEffect(() => {
    if (isOpen && type === 'summarisation' && !summary) {
      const generateSummary = async () => {
        console.log('[DocumentPreviewModal] Auto-generating summary on modal open');
        console.log('[DocumentPreviewModal] messages length:', messages?.length || 0);
        
        if (messages && messages.length > 0) {
          console.log('[DocumentPreviewModal] Using current messages for auto-summary');
          
          setIsSummarizing(true);
          try {
            const contentToSummarize = messages
              .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
              .join('\n\n');
            
            console.log('[DocumentPreviewModal] Content length:', contentToSummarize.length);
            
            const result = await aiService.summarizeContent(contentToSummarize, 'medical', 110);
            setSummary(result.summary);
            setShowSummary(true);
            toast({
              title: "Summary generated",
              description: `Compressed ${result.compression_ratio} of original content`,
            });
          } catch (error) {
            console.error('Auto-summarize error:', error);
            toast({
              title: "Summarization failed",
              description: "Could not generate summary",
              variant: "destructive",
            });
          } finally {
            setIsSummarizing(false);
          }
        } else if (conversationId) {
          console.log('[DocumentPreviewModal] Using conversationId fallback:', conversationId);
          setIsSummarizing(true);
          try {
            const result = await aiService.summarize(conversationId, 'medical', 110);
            setSummary(result.summary);
            setShowSummary(true);
            toast({
              title: "Summary generated",
              description: `Compressed ${result.compression_ratio} of original content`,
            });
          } catch (error) {
            console.error('Summarize error:', error);
            toast({
              title: "Summarization failed",
              description: "Could not generate summary",
              variant: "destructive",
            });
          } finally {
            setIsSummarizing(false);
          }
        }
      };
        
      generateSummary();
    }
  }, [isOpen, type, conversationId, summary, messages]);

  // Reset summary when modal closes or type changes
  useEffect(() => {
    if (!isOpen || type !== 'summarisation') {
      setSummary(null);
      setShowSummary(false);
      setIsSummarizing(false);
    }
  }, [isOpen, type]);

  const getTitle = () => {
    if (showCaseSheet && caseSheet) {
      return 'Medical Case Sheet';
    }
    switch (type) {
      case 'casesheet': return 'Case Sheet';
      case 'summarisation': return 'Summarisation';
      case 'chat': return 'Chat History';
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Determine what content to download based on type
      if (type === 'chat') {
        // Download full chat history
        if (selectedFormat === 'pdf') {
          await downloadChatAsPDF(messages, logoUrl, summary);
        } else if (selectedFormat === 'txt') {
          downloadChatAsText(messages, summary);
        } else {
          await downloadChatAsWord(messages, logoUrl, summary);
        }
      } else if (type === 'casesheet' && caseSheet) {
        // Download only the case sheet
        if (selectedFormat === 'pdf') {
          await downloadAsPDF(caseSheet, 'casesheet', logoUrl);
        } else if (selectedFormat === 'txt') {
          downloadAsText(caseSheet, 'casesheet');
        } else {
          await downloadAsWord(caseSheet, 'casesheet', logoUrl);
        }
      } else if (type === 'summarisation' && summary) {
        // Download only the summary
        if (selectedFormat === 'pdf') {
          await downloadAsPDF(summary, 'summarisation', logoUrl);
        } else if (selectedFormat === 'txt') {
          downloadAsText(summary, 'summarisation');
        } else {
          await downloadAsWord(summary, 'summarisation', logoUrl);
        }
      } else {
        // Fallback to chat history
        if (selectedFormat === 'pdf') {
          await downloadChatAsPDF(messages, logoUrl, summary);
        } else if (selectedFormat === 'txt') {
          downloadChatAsText(messages, summary);
        } else {
          await downloadChatAsWord(messages, logoUrl, summary);
        }
      }
      
      const formatName = selectedFormat === 'pdf' ? 'PDF' : selectedFormat === 'txt' ? 'Text' : 'Word';
      toast({
        title: "Downloaded",
        description: `Document downloaded as ${formatName}`,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Download failed",
        description: "Could not download document",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSummarize = async () => {
    console.log('[DocumentPreviewModal] handleSummarize called');
    
    if (messages && messages.length > 0) {
      console.log('[DocumentPreviewModal] Summarizing current messages with Azure OpenAI');
      
      setIsSummarizing(true);
      try {
        const contentToSummarize = messages
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n\n');
        
        const result = await aiService.summarizeContent(contentToSummarize, 'medical', 110);
        console.log('[DocumentPreviewModal] Summary result:', result);
        setSummary(result.summary);
        setShowSummary(true);
        toast({
          title: "Summary generated",
          description: `Compressed ${result.compression_ratio} of original content`,
        });
      } catch (error) {
        console.error('Summarize error:', error);
        toast({
          title: "Summarization failed",
          description: "Could not generate summary",
          variant: "destructive",
        });
      } finally {
        setIsSummarizing(false);
      }
      return;
    }
    
    const testConversationId = conversationId || 'cf8bf188-e30e-4354-b9fb-6abf845ac1f6';
    
    if (!testConversationId) {
      toast({
        title: "Cannot summarize",
        description: "No conversation ID available",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    try {
      const result = await aiService.summarize(testConversationId, 'medical', 110);
      setSummary(result.summary);
      setShowSummary(true);
      toast({
        title: "Summary generated",
        description: `Compressed ${result.compression_ratio} of original content`,
      });
    } catch (error) {
      console.error('Summarize error:', error);
      toast({
        title: "Summarization failed",
        description: "Could not generate summary",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateCaseSheet = async () => {
    console.log('[DocumentPreviewModal] handleGenerateCaseSheet called');
    
    // If we have messages, generate case sheet directly from them
    if (messages && messages.length > 0) {
      console.log('[DocumentPreviewModal] Generating case sheet from current messages with Azure OpenAI');
      
      setIsGeneratingCaseSheet(true);
      try {
        // Combine messages into content
        const contentToAnalyze = messages
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n\n');
        
        console.log('[DocumentPreviewModal] Content length:', contentToAnalyze.length);
        
        // Create the case sheet prompt
        const caseSheetPrompt = `MEDICAL CASE SHEET GENERATION

Based on the following medical conversation, generate a comprehensive case sheet in the specified format.

Patient Information:
- Age: ${patientInfo?.age || 'Not specified'}
- Gender: ${patientInfo?.gender || 'Not specified'}
- Identifier: ${patientInfo?.identifier || 'Anonymous'}

Conversation Content:
${contentToAnalyze}

Generate a structured case sheet with the following sections:

1. PATIENT INFORMATION
- Age, Gender, Identifier
- Relevant demographic details

2. HISTORY
- Chief complaint
- Present illness
- Past medical history
- Family history
- Social history

3. EXAMS
- Physical examination findings
- Vital signs
- Systematic examination

4. DIFFERENTIAL DIAGNOSIS & CONFIDENCE
- Primary diagnosis with confidence level
- Alternative diagnoses
- Reasoning for each

5. MEDICAL CONDITIONS
- Confirmed conditions
- Suspected conditions
- Rule-out conditions

6. HISTORICAL CORRELATION
- Timeline of symptom development
- Correlation with historical events

7. MEDICATIONS
- Current medications
- Previous medications
- Allergies

8. SURGERY
- Previous surgeries
- Recommended surgical interventions

9. PROBLEM REPRESENTATION
- Summary of key problems
- Priority ranking

10. TIMELINE
- Chronological progression
- Key events

11. CLINICAL REASONING
- Diagnostic approach
- Decision-making process

12. RED FLAGS & RULE OUTS
- Critical symptoms
- Conditions ruled out

13. SECURITY STAGING and RISK
- Risk assessment
- Prognosis

14. MULTIDISCIPLINARY
- Consultations needed
- Team approach

15. EVIDENCE and GUIDELINE
- Relevant guidelines
- Evidence-based recommendations

16. PATIENT-CENTRIC LAYER
- Patient concerns
- Education needs

17. PROGNOSIS & FOLLOW-UP STRATEGY
- Expected outcomes
- Follow-up plan

18. ETHICAL & CONSENT NOTES
- Consent obtained
- Ethical considerations

Format each section clearly with headings. Be comprehensive but concise. Use medical terminology appropriately.`;

        // Call Azure OpenAI directly using the aiService
        const generatedCaseSheet = await aiService.generateCaseSheetFromContent(caseSheetPrompt);
        
        console.log('[DocumentPreviewModal] Case sheet generated successfully');
        setCaseSheet(generatedCaseSheet);
        setShowCaseSheet(true);
        toast({
          title: "Case sheet generated",
          description: `Generated from ${messages.length} messages`,
        });
      } catch (error) {
        console.error('Generate case sheet error:', error);
        toast({
          title: "Case sheet generation failed",
          description: "Could not generate case sheet",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingCaseSheet(false);
      }
      return;
    }
    
    // Fallback to conversation ID if no messages
    if (!conversationId) {
      toast({
        title: "Cannot generate case sheet",
        description: "No conversation or messages available",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCaseSheet(true);
    try {
      const result = await aiService.generateCaseSheet(conversationId, patientInfo);
      console.log('[DocumentPreviewModal] Case sheet result:', result);
      setCaseSheet(result.case_sheet);
      setShowCaseSheet(true);
      toast({
        title: "Case sheet generated",
        description: `Generated from ${result.message_count} messages`,
      });
    } catch (error) {
      console.error('Generate case sheet error:', error);
      toast({
        title: "Case sheet generation failed",
        description: "Could not generate case sheet",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaseSheet(false);
    }
  };

  const handlePrint = () => {
    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background: #f97316; padding: 24px; display: flex; align-items: center; gap: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .header img { width: 48px; height: 48px; border-radius: 8px; }
        .header h2 { color: white; font-size: 20px; font-weight: bold; }
        .header p { color: rgba(255,255,255,0.8); font-size: 14px; }
        .content { padding: 24px; }
        .section-title { color: #f97316; font-weight: 600; font-size: 18px; margin-bottom: 8px; }
        .section-line { width: 48px; height: 2px; background: #f97316; margin-bottom: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .message { margin-bottom: 16px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; color: white; margin-bottom: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .badge-user { background: #6b7280; }
        .badge-assistant { background: #f97316; }
        .message-content { padding: 16px; border-radius: 8px; font-size: 14px; color: #374151; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .message-user { background: #f3f4f6; }
        .message-assistant { background: #fff7ed; }
        .text-content { white-space: pre-wrap; font-size: 14px; color: #374151; line-height: 1.6; }
        .footer { border-top: 1px solid rgba(249,115,22,0.3); padding: 12px 24px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
        .text-preview { background: #18181b; padding: 24px; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .text-preview pre { font-family: monospace; color: #4ade80; font-size: 14px; white-space: pre-wrap; }
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
        }
      </style>
    `;

    let htmlContent = '';
    
    if (selectedFormat === 'txt') {
      htmlContent = `
        <div class="text-preview">
          <pre>
${'═'.repeat(40)}
${getTitle().toUpperCase()}
${'═'.repeat(40)}
Generated: ${formatDate()}
${'═'.repeat(40)}
${summary ? `\n${'═'.repeat(40)}
AI-GENERATED SUMMARY
${'═'.repeat(40)}

${summary}

${'═'.repeat(40)}\n` : ''}
${isFullChat ? messages.map(msg => `${msg.role === 'user' ? '👤 YOU' : '🤖 SETV ASSISTANT'}  [${new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}]\n${'─'.repeat(30)}\n${msg.content}\n`).join('\n') : content}

${'═'.repeat(40)}
SETV Medical Intelligence
          </pre>
        </div>
      `;
    } else {
      htmlContent = `
        <div class="header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
          <div>
            <h2>${getTitle()}</h2>
            <p>Generated on ${formatDate()}</p>
          </div>
        </div>
        <div class="content">
          ${summary ? `
            <h3 class="section-title">AI-Generated Summary</h3>
            <div class="section-line"></div>
            <div class="summary-box" style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #0c4a6e; white-space: pre-wrap;">${summary}</p>
            </div>
          ` : ''}
          ${!isFullChat && !summary ? `<h3 class="section-title">Content</h3><div class="section-line"></div>` : ''}
          ${!isFullChat && summary ? `<h3 class="section-title">Full Content</h3><div class="section-line"></div>` : ''}
          ${isFullChat ? messages.map(msg => `
            <div class="message">
              <div class="badge ${msg.role === 'user' ? 'badge-user' : 'badge-assistant'}">
                ${msg.role === 'user' ? 'You' : 'SETV Assistant'}
              </div>
              <span style="font-size: 12px; color: #888; margin-left: 8px;">${new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <div class="message-content ${msg.role === 'user' ? 'message-user' : 'message-assistant'}">
                ${msg.content}
              </div>
            </div>
          `).join('') : `<p class="text-content">${content}</p>`}
        </div>
        <div class="footer">
          <span>SETV Medical Intelligence</span>
          <span>Page 1 of 1</span>
        </div>
      `;
    }

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${getTitle()} - SETV</title>
          ${styles}
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printDocument);
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 100);
      };
    }

    toast({
      title: "Print dialog opened",
      description: "Your print dialog should appear shortly",
    });
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 bg-background overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Document Preview</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Preview and download conversation as PDF, Word, or Text document
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Format:</span>
            <Button
              variant={selectedFormat === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFormat('pdf')}
              className={cn(
                "h-8 gap-1.5",
                selectedFormat === 'pdf' && "bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </Button>
            <Button
              variant={selectedFormat === 'docx' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFormat('docx')}
              className={cn(
                "h-8 gap-1.5",
                selectedFormat === 'docx' && "bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90"
              )}
            >
              <FileType className="w-3.5 h-3.5" />
              Word
            </Button>
            <Button
              variant={selectedFormat === 'txt' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFormat('txt')}
              className={cn(
                "h-8 gap-1.5",
                selectedFormat === 'txt' && "bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90"
              )}
            >
              <FileType2 className="w-3.5 h-3.5" />
              Text
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6">
            <div className={cn(
              "rounded-lg border shadow-sm overflow-hidden transition-all",
              selectedFormat === 'txt' ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"
            )}>
              {selectedFormat === 'txt' ? (
                <div className="p-6 font-mono text-sm text-green-400 whitespace-pre-wrap">
                  <div className="text-gray-500">{'═'.repeat(40)}</div>
                  <div className="text-center text-yellow-400 font-bold my-2">{getTitle().toUpperCase()}</div>
                  <div className="text-gray-500">{'═'.repeat(40)}</div>
                  <div className="text-gray-400 my-2">Generated: {formatDate()}</div>
                  <div className="text-gray-500 mb-4">{'═'.repeat(40)}</div>
                  
                  {isFullChat && messages ? (
                    messages.map((msg, i) => (
                      <div key={i} className="mb-4">
                        <div className="flex items-center gap-2">
                          <span className={msg.role === 'user' ? 'text-blue-400' : 'text-[hsl(var(--brand-coral))]'}>
                            {msg.role === 'user' ? '👤 YOU' : '🤖 SETV ASSISTANT'}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-gray-500">{'─'.repeat(30)}</div>
                        <div className="text-gray-300 mt-1">{msg.content}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-300">{content}</div>
                  )}
                  
                  <div className="text-gray-500 mt-4">{'═'.repeat(40)}</div>
                  <div className="text-gray-400 text-center">SETV Medical Intelligence</div>
                </div>
              ) : (
                <div className="min-h-[400px]">
                  <div className="bg-[hsl(var(--brand-coral))] px-6 py-4 flex items-center gap-4">
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded" />
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
                      <p className="text-white/80 text-sm">Generated on {formatDate()}</p>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {type === 'summarisation' ? (
                      <>
                        {summary ? (
                          <>
                            <h3 className="text-[hsl(var(--brand-coral))] font-semibold text-lg mb-2">AI-Generated Summary</h3>
                            <div className="w-12 h-0.5 bg-[hsl(var(--brand-coral))] mb-4"></div>
                            <div className="text-gray-700">
                              <p className="whitespace-pre-wrap">{summary}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 className="text-[hsl(var(--brand-coral))] font-semibold text-lg mb-2">AI-Generated Summary</h3>
                            <div className="w-12 h-0.5 bg-[hsl(var(--brand-coral))] mb-4"></div>
                            
                            {!summary && !isSummarizing && (
                              <div className="flex justify-center py-8">
                                <Button 
                                  onClick={handleSummarize}
                                  className="gap-2 bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Generate Summary
                                </Button>
                              </div>
                            )}

                            {isSummarizing && (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--brand-coral))]" />
                                <span className="ml-3 text-gray-600">Generating summary...</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : type === 'casesheet' ? (
                      <>
                        {showCaseSheet && caseSheet ? (
                          <>
                            <h3 className="text-[hsl(var(--brand-coral))] font-semibold text-lg mb-2">Medical Case Sheet</h3>
                            <div className="w-12 h-0.5 bg-[hsl(var(--brand-coral))] mb-4"></div>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                                {caseSheet}
                              </pre>
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 className="text-[hsl(var(--brand-coral))] font-semibold text-lg mb-2">Medical Case Sheet Generation</h3>
                            <div className="w-12 h-0.5 bg-[hsl(var(--brand-coral))] mb-4"></div>
                            
                            {conversationId && isFullChat && (
                              <>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                                    <input
                                      type="text"
                                      placeholder="e.g., 70 years"
                                      value={patientInfo.age}
                                      onChange={(e) => setPatientInfo(prev => ({ ...prev, age: e.target.value }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-coral))]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select
                                      value={patientInfo.gender}
                                      onChange={(e) => setPatientInfo(prev => ({ ...prev, gender: e.target.value }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-coral))]"
                                    >
                                      <option value="">Select</option>
                                      <option value="male">Male</option>
                                      <option value="female">Female</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Identifier</label>
                                    <input
                                      type="text"
                                      placeholder="Patient ID"
                                      value={patientInfo.identifier}
                                      onChange={(e) => setPatientInfo(prev => ({ ...prev, identifier: e.target.value }))}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-coral))]"
                                    />
                                  </div>
                                </div>

                                {!caseSheet && !isGeneratingCaseSheet && (
                                  <div className="flex justify-center">
                                    <Button 
                                      onClick={handleGenerateCaseSheet}
                                      className="gap-2 bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90"
                                    >
                                      <FileMedical className="w-4 h-4" />
                                      Generate Case Sheet
                                    </Button>
                                  </div>
                                )}
                                
                                {isGeneratingCaseSheet ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--brand-coral))]" />
                                    <span className="ml-3 text-gray-600">Generating case sheet...</span>
                                  </div>
                                ) : null}
                              </>
                            )}
                            
                            {!conversationId && !isFullChat && (
                              <div className="text-center py-8">
                                <p className="text-gray-500">Case sheet generation requires a full conversation</p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {!isFullChat && (
                          <>
                            <h3 className="text-[hsl(var(--brand-coral))] font-semibold text-lg mb-2">Content</h3>
                            <div className="w-12 h-0.5 bg-[hsl(var(--brand-coral))] mb-4"></div>
                          </>
                        )}
                        
                        {isFullChat && messages ? (
                          type === 'chat' ? (
                            <div className="space-y-4">
                              {messages.map((msg, i) => (
                                <div key={i}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={cn(
                                      "inline-block px-3 py-1 rounded-full text-xs font-medium text-white",
                                      msg.role === 'user' ? "bg-gray-500" : "bg-[hsl(var(--brand-coral))]"
                                    )}>
                                      {msg.role === 'user' ? 'You' : 'SETV Assistant'}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className={cn(
                                    "p-4 rounded-lg text-sm text-gray-700",
                                    msg.role === 'user' ? "bg-gray-100" : "bg-orange-50"
                                  )}>
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                                {caseSheet}
                              </pre>
                            </div>
                          )
                        ) : (
                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="border-t border-[hsl(var(--brand-coral))]/30 px-6 py-3 flex justify-between items-center text-xs text-gray-500">
                    <span>SETV Medical Intelligence</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between items-center">
          <div className="flex gap-3">
            {conversationId && isFullChat && (
              <>
                <Button 
                  variant="outline"
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="gap-2"
                >
                  {isSummarizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Summarizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Summarize
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGenerateCaseSheet}
                  disabled={isGeneratingCaseSheet}
                  className="gap-2"
                >
                  {isGeneratingCaseSheet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileMedical className="w-4 h-4" />
                      Case Sheet
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))]/90 gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
