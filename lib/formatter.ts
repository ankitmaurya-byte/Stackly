import prettier from 'prettier';

export type SupportedLanguage = 'javascript' | 'typescript' | 'json' | 'html' | 'css';

/**
 * Map language names to Prettier parser names
 */
const languageToParser: Record<SupportedLanguage, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  json: 'json',
  html: 'html',
  css: 'css',
};

/**
 * Format code using Prettier based on the selected language
 * @param code - The code to format
 * @param language - The programming language
 * @returns Formatted code
 * @throws Error if formatting fails
 */
export async function formatCode(
  code: string,
  language: SupportedLanguage
): Promise<string> {
  try {
    const parser = languageToParser[language];

    if (!parser) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const formatted = await prettier.format(code, {
      parser,
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 80,
      arrowParens: 'always',
    });

    return formatted;
  } catch (error) {
    // Re-throw with a more user-friendly message
    if (error instanceof Error) {
      throw new Error(`Formatting error: ${error.message}`);
    }
    throw new Error('An unknown error occurred during formatting');
  }
}

/**
 * Validate if a language is supported
 */
export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return language in languageToParser;
}
