import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, BorderStyle, AlignmentType, Header, Footer, PageNumber, NumberFormat } from 'docx';
import { saveAs } from 'file-saver';

export type DownloadType = 'casesheet' | 'summarisation' | 'chat';
export type DownloadFormat = 'pdf' | 'txt' | 'docx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const getTitle = (type: DownloadType) => {
  switch (type) {
    case 'casesheet': return 'Case Sheet';
    case 'summarisation': return 'Summarisation';
    case 'chat': return 'Chat';
  }
};

// Brand colors
const BRAND_COLOR = { r: 230, g: 126, b: 108 }; // Coral color
const BRAND_HEX = 'E67E6C';
const DARK_COLOR = { r: 45, g: 45, b: 45 };

// Helper to load image as base64
const loadImageAsBase64 = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

// Helper to load image as ArrayBuffer for Word docs
const loadImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  return response.arrayBuffer();
};

// Add header with branding to PDF
const addPDFHeader = (doc: jsPDF, title: string, logoBase64?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background bar
  doc.setFillColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Add logo if available
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
  }
  
  // Title text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, logoBase64 ? 48 : 15, 22);
  
  // Subtitle / Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`, logoBase64 ? 48 : 15, 30);
  
  // Reset text color
  doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
  
  return 50; // Return Y position after header
};

// Add footer with page number to PDF
const addPDFFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Footer line
  doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  
  // Footer text
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('SETV Medical Intelligence', 15, pageHeight - 12);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 35, pageHeight - 12);
  
  // Reset
  doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
};

export const downloadAsPDF = async (content: string, type: DownloadType, logoUrl?: string, summary?: string) => {
  const fileName = `${type}-${new Date().toISOString().split('T')[0]}.pdf`;
  const title = getTitle(type);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let logoBase64: string | undefined;
  if (logoUrl) {
    try {
      logoBase64 = await loadImageAsBase64(logoUrl);
    } catch (e) {
      console.log('Could not load logo for PDF');
    }
  }
  
  // Add header
  let yPosition = addPDFHeader(doc, title, logoBase64);
  
  // For single content downloads (case sheet or summary only)
  if (type === 'casesheet' || (type === 'summarisation' && !summary)) {
    // Content section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
    
    const contentSplitText = doc.splitTextToSize(content, pageWidth - 30);
    const lineHeight = 6;
    
    contentSplitText.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, 15, yPosition);
      yPosition += lineHeight;
    });
  } else {
    // Original content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
    
    const contentSplitText = doc.splitTextToSize(content, pageWidth - 30);
    const lineHeight = 6;
    
    contentSplitText.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, 15, yPosition);
      yPosition += lineHeight;
    });
    
    // Add summary section if provided
    if (summary) {
      yPosition += 15; // Add space before summary
      
      // Summary section title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
      doc.text('AI-Generated Summary', 15, yPosition);
      yPosition += 8;
      
      // Decorative line
      doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
      doc.setLineWidth(0.3);
      doc.line(15, yPosition, 60, yPosition);
      yPosition += 10;
      
      // Summary content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
      
      const summarySplitText = doc.splitTextToSize(summary, pageWidth - 30);
      
      summarySplitText.forEach((line: string) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 25;
        }
        doc.text(line, 15, yPosition);
        yPosition += lineHeight;
      });
    }
  }
  
  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPDFFooter(doc, i, totalPages);
  }
  
  doc.save(fileName);
};

export const downloadAsText = (content: string, type: DownloadType, summary?: string) => {
  const fileName = `${type}-${new Date().toISOString().split('T')[0]}.txt`;
  const title = getTitle(type);
  const divider = '═'.repeat(50);
  
  // For single content downloads (case sheet or summary only)
  if (type === 'casesheet' || (type === 'summarisation' && !summary)) {
    let fullContent = `${divider}
  ${title.toUpperCase()}
${divider}
Generated: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
${divider}

${content}

${divider}
SETV Medical Intelligence
${divider}`;
  
    const blob = new Blob([fullContent], { type: 'text/plain' });
    saveAs(blob, fileName);
    return;
  }
  
  // Original content with summary
  let fullContent = `${divider}
  ${title.toUpperCase()}
${divider}
Generated: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
${divider}

${summary}

${divider}`;
  
  fullContent += `

${divider}
CONTENT
${divider}

${content}

${divider}
SETV Medical Intelligence
${divider}`;
  
  const blob = new Blob([fullContent], { type: 'text/plain' });
  saveAs(blob, fileName);
};

export const downloadAsWord = async (content: string, type: DownloadType, logoUrl?: string, summary?: string) => {
  const fileName = `${type}-${new Date().toISOString().split('T')[0]}.docx`;
  const title = getTitle(type);
  
  const children: Paragraph[] = [];
  
  // Add logo if provided
  if (logoUrl) {
    try {
      const logoBuffer = await loadImageAsArrayBuffer(logoUrl);
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 70, height: 70 },
              type: 'png',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    } catch (e) {
      console.log('Could not load logo for Word');
    }
  }
  
  // Title with styling
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 48,
          color: BRAND_HEX,
          font: 'Arial',
        }),
      ],
      spacing: { after: 100 },
    }),
    // Date
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          italics: true,
          size: 20,
          color: '666666',
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    }),
    // Divider
    new Paragraph({
      border: {
        bottom: { color: BRAND_HEX, size: 6, style: BorderStyle.SINGLE },
      },
      spacing: { after: 400 },
    })
  );
  
  // For single content downloads (case sheet or summary only)
  if (type === 'casesheet' || (type === 'summarisation' && !summary)) {
    // Add content paragraphs
    children.push(
      ...content.split('\n').map(line => 
        new Paragraph({
          children: [
            new TextRun({ 
              text: line || ' ', 
              size: 22,
              font: 'Arial',
            })
          ],
          spacing: { after: 120, line: 276 },
        })
      )
    );
  } else {
    // Add summary section if provided
    if (summary) {
      children.push(
        // Summary section header
        new Paragraph({
          children: [
            new TextRun({
              text: 'AI-Generated Summary',
              bold: true,
              size: 28,
              color: BRAND_HEX,
              font: 'Arial',
            }),
          ],
          spacing: { after: 200 },
        }),
        // Summary paragraphs
        ...summary.split('\n').map(line => 
          new Paragraph({
            children: [
              new TextRun({ 
                text: line || ' ', 
                size: 22,
                italics: true,
                font: 'Arial',
              })
            ],
            spacing: { after: 120, line: 276 },
          })
        ),
        // Divider
        new Paragraph({
          border: {
            bottom: { color: BRAND_HEX, size: 3, style: BorderStyle.SINGLE },
          },
          spacing: { after: 400 },
        })
      );
    }
    
    // Add content paragraphs
    children.push(
      ...content.split('\n').map(line => 
        new Paragraph({
          children: [
            new TextRun({ 
              text: line || ' ', 
              size: 22,
              font: 'Arial',
            })
          ],
          spacing: { after: 120, line: 276 },
        })
      )
    );
  }
  
  // Add main content section
  children.push(
    // Content section header
    new Paragraph({
      children: [
        new TextRun({
          text: summary ? 'Full Content' : 'Content',
          bold: true,
          size: 28,
          color: BRAND_HEX,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    }),
    // Content paragraphs
    ...content.split('\n').map(line => 
      new Paragraph({
        children: [
          new TextRun({ 
            text: line || ' ', 
            size: 22,
            font: 'Arial',
          })
        ],
        spacing: { after: 120, line: 276 },
      })
    )
  );
  
  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'SETV Medical Intelligence',
                  size: 18,
                  color: BRAND_HEX,
                  font: 'Arial',
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Page ',
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  text: ' of ',
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 18,
                  color: '888888',
                }),
              ],
              alignment: AlignmentType.CENTER,
              border: {
                top: { color: BRAND_HEX, size: 6, style: BorderStyle.SINGLE },
              },
            }),
          ],
        }),
      },
      children,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
};

export const downloadChatAsPDF = async (messages: Message[], logoUrl?: string, additionalContent?: string, contentType?: 'summary' | 'casesheet') => {
  const fileName = `chat-${new Date().toISOString().split('T')[0]}.pdf`;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let logoBase64: string | undefined;
  if (logoUrl) {
    try {
      logoBase64 = await loadImageAsBase64(logoUrl);
    } catch (e) {
      console.log('Could not load logo for PDF');
    }
  }
  
  // Add header
  let yPosition = addPDFHeader(doc, 'Chat History', logoBase64);
  
  // Add additional content section if provided (summary or case sheet)
  if (additionalContent) {
    // Section title based on content type
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
    
    const sectionTitle = contentType === 'casesheet' ? 'Medical Case Sheet' : 'AI-Generated Summary';
    doc.text(sectionTitle, 15, yPosition);
    yPosition += 8;
    
    // Decorative line
    doc.setDrawColor(BRAND_COLOR.r, BRAND_COLOR.g, BRAND_COLOR.b);
    doc.setLineWidth(0.3);
    doc.line(15, yPosition, 60, yPosition);
    yPosition += 10;
    
    // Additional content
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
    
    const contentSplitText = doc.splitTextToSize(additionalContent, pageWidth - 30);
    const lineHeight = 6;
    
    contentSplitText.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, 15, yPosition);
      yPosition += lineHeight;
    });
    
    yPosition += 15; // Add space before messages
  }
  
  // Messages
  messages.forEach((msg, index) => {
    const isUser = msg.role === 'user';
    const role = isUser ? 'You' : 'SETV Assistant';
    const timestamp = new Date(msg.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    // Check for page break
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 25;
    }
    
    // Role badge background
    const badgeWidth = isUser ? 20 : 50;
    doc.setFillColor(isUser ? 100 : BRAND_COLOR.r, isUser ? 100 : BRAND_COLOR.g, isUser ? 100 : BRAND_COLOR.b);
    doc.roundedRect(15, yPosition - 5, badgeWidth, 8, 2, 2, 'F');
    
    // Role text
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(role, 17, yPosition + 1);
    
    // Timestamp
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(timestamp, pageWidth - 50, yPosition + 1);
    yPosition += 12;
    
    // Message content with background
    doc.setFillColor(isUser ? 245 : 250, isUser ? 245 : 248, isUser ? 245 : 252);
    const splitText = doc.splitTextToSize(msg.content, pageWidth - 40);
    const contentHeight = splitText.length * 6 + 10;
    doc.roundedRect(15, yPosition - 5, pageWidth - 30, contentHeight, 3, 3, 'F');
    
    // Content text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK_COLOR.r, DARK_COLOR.g, DARK_COLOR.b);
    
    splitText.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, 20, yPosition + 2);
      yPosition += 6;
    });
    
    yPosition += 15;
  });
  
  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPDFFooter(doc, i, totalPages);
  }
  
  doc.save(fileName);
};

export const downloadChatAsText = (messages: Message[], additionalContent?: string, contentType?: 'summary' | 'casesheet') => {
  const fileName = `chat-${new Date().toISOString().split('T')[0]}.txt`;
  
  let content = `CHAT HISTORY
====================
Generated on: ${new Date().toLocaleString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
====================

`;

  // Add additional content if provided
  if (additionalContent) {
    const sectionTitle = contentType === 'casesheet' ? 'MEDICAL CASE SHEET' : 'AI-GENERATED SUMMARY';
    content += `${sectionTitle}
====================

${additionalContent}

====================

`;
  }

  content += `
FULL CONVERSATION
====================
`;

  const divider = '═════════════════════════';

  messages.forEach((msg, index) => {
    const isUser = msg.role === 'user';
    const role = isUser ? '👤 YOU' : '🤖 SETV ASSISTANT';
    const timestamp = new Date(msg.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    const msgDivider = isUser ? '─────────────────' : '─────────────────';
    
    content += `
${role}  [${timestamp}]
${msgDivider}
${msg.content}`;
  });
  
  content += `

${divider}
SETV Medical Intelligence
${divider}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  saveAs(blob, fileName);
};

export const downloadChatAsWord = async (messages: Message[], logoUrl?: string, additionalContent?: string, contentType?: 'summary' | 'casesheet') => {
  const fileName = `chat-${new Date().toISOString().split('T')[0]}.docx`;
  
  const paragraphs: Paragraph[] = [];
  
  // Add logo if provided
  if (logoUrl) {
    try {
      const logoBuffer = await loadImageAsArrayBuffer(logoUrl);
      paragraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 70, height: 70 },
              type: 'png',
            }),
          ],
          spacing: { after: 200 },
        })
      );
    } catch (e) {
      console.log('Could not load logo for Word');
    }
  }
  
  // Title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'CHAT HISTORY',
          bold: true,
          size: 32,
          color: BRAND_HEX,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated on: ${new Date().toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`,
          italics: true,
          size: 20,
          color: '666666',
          font: 'Arial',
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      border: {
        bottom: { color: BRAND_HEX, size: 6, style: BorderStyle.SINGLE },
      },
      spacing: { after: 400 },
    })
  );
  
  // Add additional content section if provided
  if (additionalContent) {
    const sectionTitle = contentType === 'casesheet' ? 'Medical Case Sheet' : 'AI-Generated Summary';
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: sectionTitle,
            bold: true,
            size: 28,
            color: BRAND_HEX,
            font: 'Arial',
          }),
        ],
        spacing: { after: 200 },
      }),
      ...additionalContent.split('\n').map(line => 
        new Paragraph({
          children: [
            new TextRun({ 
              text: line || ' ', 
              size: 22,
              font: 'Arial',
            })
          ],
          spacing: { after: 120, line: 276 },
        })
      ),
      new Paragraph({
        border: {
          bottom: { color: BRAND_HEX, size: 3, style: BorderStyle.SINGLE },
        },
        spacing: { after: 400 },
      })
    );
  }
  
  // Messages
  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const role = isUser ? 'You' : 'SETV Assistant';
    const timestamp = new Date(msg.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    // Role header with timestamp
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: role,
            bold: true,
            size: 24,
            color: isUser ? '555555' : BRAND_HEX,
            font: 'Arial',
          }),
          new TextRun({
            text: `  •  ${timestamp}`,
            size: 18,
            color: '888888',
            font: 'Arial',
          }),
        ],
        spacing: { before: 300, after: 100 },
        shading: {
          fill: isUser ? 'F5F5F5' : 'FFF5F3',
        },
        border: {
          left: { 
            color: isUser ? '888888' : BRAND_HEX, 
            size: 12, 
            style: BorderStyle.SINGLE 
          },
        },
      })
    );
    
    // Message content
    msg.content.split('\n').forEach(line => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: line || ' ', 
              size: 22,
              font: 'Arial',
            })
          ],
          spacing: { after: 80, line: 276 },
          indent: { left: 200 },
        })
      );
    });
  });
  
  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'SETV Medical Intelligence',
                  size: 18,
                  color: BRAND_HEX,
                  font: 'Arial',
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Page ',
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  text: ' of ',
                  size: 18,
                  color: '888888',
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  size: 18,
                  color: '888888',
                }),
              ],
              alignment: AlignmentType.CENTER,
              border: {
                top: { color: BRAND_HEX, size: 6, style: BorderStyle.SINGLE },
              },
            }),
          ],
        }),
      },
      children: paragraphs,
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
};
