/**
 * Simple Markdown renderer for bold, italic, and underline
 * Supports:
 * - **text** for bold
 * - *text* for italic
 * - <u>text</u> for underline
 */
export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  
  // Ensure we have a string
  let html = String(text);
  
  // First, protect <u> tags by replacing them with placeholders
  const underlinePlaceholders: string[] = [];
  html = html.replace(/<u>(.*?)<\/u>/gi, (match, content) => {
    const placeholder = `__UNDERLINE_${underlinePlaceholders.length}__`;
    underlinePlaceholders.push(content);
    return placeholder;
  });
  
  // Escape remaining HTML to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Bold: **text** (process first to avoid conflicts)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* (single asterisk, not part of bold)
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  
  // Restore underline tags
  underlinePlaceholders.forEach((content, index) => {
    html = html.replace(`__UNDERLINE_${index}__`, `<u>${content}</u>`);
  });
  
  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

