'use client';

import { useRef, useEffect, useState } from 'react';
import { renderMarkdown } from '@/lib/markdown';

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>) => void;
}

export default function MarkdownTextarea({
  value,
  onChange,
  placeholder,
  required,
  className = '',
  style,
  onContextMenu,
}: MarkdownTextareaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [markdownValue, setMarkdownValue] = useState(value);
  const isUpdatingRef = useRef(false);
  const isFormattingRef = useRef(false);

  // Update markdown value when prop changes (when not focused)
  useEffect(() => {
    // Only update from prop when NOT focused and NOT formatting to avoid overwriting user edits/formatting
    if (value !== markdownValue && !isFocused && !isUpdatingRef.current && !isFormattingRef.current) {
      setMarkdownValue(value);
      if (editorRef.current) {
        const html = renderMarkdown(value) || '<br>';
        const currentHtml = editorRef.current.innerHTML.trim();
        // Only update if significantly different (not just whitespace)
        if (currentHtml !== html && currentHtml !== renderMarkdown(markdownValue)) {
          editorRef.current.innerHTML = html;
        }
      }
    }
  }, [value, isFocused, markdownValue]);

  // Sync height - expand to show all content or minimize to one line if empty
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.style.height = 'auto';
      const scrollHeight = editorRef.current.scrollHeight;
      if (markdownValue.trim() || editorRef.current.textContent?.trim()) {
        editorRef.current.style.height = `${Math.max(scrollHeight, 40)}px`; // At least 40px (one line)
      } else {
        editorRef.current.style.height = '40px'; // One line height when empty
      }
    }
  }, [markdownValue, isFocused]);

  const htmlToMarkdown = (html: string): string => {
    if (!html || html === '<br>' || html === '<br/>') return '';
    
    let markdown = html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '')
      .replace(/<p>/g, '\n')
      .replace(/<\/p>/g, '');
    
    // Clean up extra newlines
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    return markdown;
  };

  const handleInput = () => {
    if (!editorRef.current || !isFocused || isUpdatingRef.current) return;
    
    // Get HTML content - preserve it for display
    const html = editorRef.current.innerHTML;
    
    // Convert HTML back to markdown for storage, but keep HTML visible
    const markdown = htmlToMarkdown(html);
    
    // Only update if markdown actually changed to avoid unnecessary re-renders
    if (markdown !== markdownValue) {
      isUpdatingRef.current = true;
      setMarkdownValue(markdown);
      onChange(markdown);
      
      // IMPORTANT: Don't reset innerHTML here - keep the HTML formatting visible
      // The HTML should remain in the contenteditable div while editing
      // Immediately verify and restore HTML if it was lost
      requestAnimationFrame(() => {
        if (editorRef.current && isFocused) {
          const currentHtml = editorRef.current.innerHTML;
          // If HTML was lost and we had formatting, restore it
          if (html !== currentHtml && (html.includes('<strong>') || html.includes('<em>') || html.includes('<u>'))) {
            console.log('Restoring lost HTML formatting:', html);
            // Save cursor position
            const selection = window.getSelection();
            const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            
            // Restore the formatted HTML
            editorRef.current.innerHTML = html;
            
            // Restore cursor position if possible
            if (range && selection) {
              try {
                selection.removeAllRanges();
                selection.addRange(range);
              } catch (e) {
                // Ignore cursor restoration errors
              }
            }
          }
        }
        // Update height - expand to show all content or minimize to one line if empty
        if (editorRef.current) {
          editorRef.current.style.height = 'auto';
          const scrollHeight = editorRef.current.scrollHeight;
          const hasContent = markdown.trim() || editorRef.current.textContent?.trim();
          if (hasContent) {
            editorRef.current.style.height = `${Math.max(scrollHeight, 40)}px`;
          } else {
            editorRef.current.style.height = '40px';
          }
        }
        isUpdatingRef.current = false;
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleFocus = () => {
    if (isUpdatingRef.current) return;
    
    setIsFocused(true);
    if (editorRef.current) {
      // When focusing, show the rendered markdown as HTML for editing
      // But preserve any existing HTML formatting that might have been applied
      const currentHtml = editorRef.current.innerHTML.trim();
      const renderedHtml = renderMarkdown(markdownValue) || '<br>';
      
      // Only update if there's no content or if current content doesn't have formatting
      if (currentHtml === '' || currentHtml === '<br>' || currentHtml === '<br/>') {
        editorRef.current.innerHTML = renderedHtml;
      } else if (!currentHtml.includes('<strong>') && !currentHtml.includes('<em>') && !currentHtml.includes('<u>')) {
        // Only update if there's no existing formatting tags
        if (currentHtml !== renderedHtml) {
          editorRef.current.innerHTML = renderedHtml;
        }
      }
      // Otherwise, keep the existing HTML (which may have formatting applied via context menu)
    }
  };

  const handleBlur = () => {
    if (isUpdatingRef.current) return;
    
    setIsFocused(false);
    if (editorRef.current) {
      // On blur, convert HTML back to markdown and re-render
      const html = editorRef.current.innerHTML;
      const markdown = htmlToMarkdown(html);
      
      isUpdatingRef.current = true;
      setMarkdownValue(markdown);
      onChange(markdown);
      
      // Re-render the markdown
      setTimeout(() => {
        if (editorRef.current) {
          const renderedHtml = renderMarkdown(markdown) || '<br>';
          editorRef.current.innerHTML = renderedHtml;
          // Update height after re-rendering
          editorRef.current.style.height = 'auto';
          const scrollHeight = editorRef.current.scrollHeight;
          if (markdown.trim()) {
            editorRef.current.style.height = `${Math.max(scrollHeight, 40)}px`;
          } else {
            editorRef.current.style.height = '40px';
          }
        }
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const html = renderMarkdown(markdownValue) || '<br>';
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, []);

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContextMenu={onContextMenu ? (e: React.MouseEvent<HTMLDivElement>) => onContextMenu(e as React.MouseEvent<HTMLElement>) : undefined}
        className={`${className} w-full border border-gray-300 rounded p-2 resize-none overflow-hidden`}
        style={{
          ...style,
          minHeight: style?.minHeight || '2.5rem',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          outline: 'none',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style dangerouslySetInnerHTML={{ __html: `
        div[contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        div[contenteditable]:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }
        div[contenteditable] strong,
        div[contenteditable] b {
          font-weight: bold !important;
          font-style: normal;
        }
        div[contenteditable] em,
        div[contenteditable] i {
          font-style: italic !important;
        }
        div[contenteditable] u {
          text-decoration: underline !important;
        }
      `}} />
    </div>
  );
}

