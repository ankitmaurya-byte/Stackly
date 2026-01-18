import { codeToHtml } from 'shiki';
import type { SupportedLanguage } from './formatter';

/**
 * Map our language names to Shiki language identifiers
 */
const languageToShiki: Record<SupportedLanguage, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  json: 'json',
  html: 'html',
  css: 'css',
};

/**
 * Highlight code using Shiki with VS Code Dark+ theme
 * @param code - The code to highlight
 * @param language - The programming language
 * @returns HTML string with syntax highlighting
 */
export async function highlightCode(
  code: string,
  language: SupportedLanguage
): Promise<string> {
  try {
    const lang = languageToShiki[language] || 'text';

    const html = await codeToHtml(code, {
      lang,
      theme: 'dark-plus',
    });

    return html;
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    // Fallback to plain text if highlighting fails
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
