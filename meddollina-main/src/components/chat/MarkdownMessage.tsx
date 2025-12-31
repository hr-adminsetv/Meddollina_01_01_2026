import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * MarkdownMessage Component
 * 
 * Renders AI responses with proper markdown formatting using react-markdown.
 * Converts **bold**, ### headings, and other markdown to properly formatted HTML.
 */

interface MarkdownMessageProps {
  content: string;
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  console.log('[MarkdownMessage] Render:', {
    contentLength: content?.length || 0,
    contentPreview: content?.substring(0, 100) || 'NO CONTENT'
  });
  
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
        // Style h3 headings
        h3: ({children, ...props}) => (
          <h3 className="text-base font-bold mt-3 mb-2" {...props}>
            {children}
          </h3>
        ),
        // Style h2 headings  
        h2: ({children, ...props}) => (
          <h2 className="text-lg font-bold mt-4 mb-2" {...props}>
            {children}
          </h2>
        ),
        // Style strong/bold text
        strong: ({children, ...props}) => (
          <strong className="font-semibold" {...props}>
            {children}
          </strong>
        ),
        // Style paragraphs
        p: ({children, ...props}) => (
          <p className="text-sm leading-relaxed mb-2" {...props}>
            {children}
          </p>
        ),
        // Style lists
        ul: ({children, ...props}) => (
          <ul className="list-disc list-inside space-y-1 mb-2 text-sm" {...props}>
            {children}
          </ul>
        ),
        li: ({children, ...props}) => (
          <li className="leading-relaxed text-sm" {...props}>
            {children}
          </li>
        ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
