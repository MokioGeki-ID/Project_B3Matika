import { memo, useMemo, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

// Lazy load visualization component
const B3Viz = lazy(() => import('./viz/B3Viz'));

/**
 * Normalize delimiters: \(...\) and \[...\] to $...$ and $$...$$
 */
function normalizeDelimiters(text) {
  if (!text) return '';
  
  // Protect code blocks
  const codeBlocks = [];
  let processed = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Protect inline code
  const inlineCodes = [];
  processed = processed.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // Protect Rupiah
  processed = processed.replace(/Rp\s*[\d.,]+/g, (match) => {
    return match.replace(/\$/g, 'Rp');
  });

  // Normalize LaTeX delimiters
  processed = processed.replace(/\\\((.*?)\\\)/g, '$$$1$$'); // \(...\) -> $...$
  processed = processed.replace(/\\\[(.*?)\\\]/gs, '$$$$$$1$$$$'); // \[...\] -> $$...$$

  // Restore code blocks
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[idx]);
  
  // Restore inline codes
  processed = processed.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => inlineCodes[idx]);

  return processed;
}

/**
 * Safety net: convert common raw notation to LaTeX
 * CONSERVATIVE: only convert obvious math patterns
 */
function convertRawNotation(text) {
  if (!text) return '';

  // Protect URLs
  const urls = [];
  let processed = text.replace(/(https?:\/\/[^\s]+)/g, (match) => {
    urls.push(match);
    return `__URL_${urls.length - 1}__`;
  });

  // Protect dates (dd/mm/yyyy, dd/mm)
  processed = processed.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, (match) => {
    urls.push(match);
    return `__DATE_${urls.length - 1}__`;
  });

  // Protect code blocks and inline code
  const codeBlocks = [];
  processed = processed.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_${codeBlocks.length - 1}__`;
  });

  processed = processed.replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_${codeBlocks.length - 1}__`;
  });

  // Convert sqrt(x) to \sqrt{x}
  processed = processed.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');

  // Convert x^2, x^(n+1) to x^{2}, x^{n+1}
  // Only if not already in LaTeX context
  processed = processed.replace(/(\w+)\^(\d+)/g, '$$$1^{$2}$$');
  processed = processed.replace(/(\w+)\^\(([^)]+)\)/g, '$$$1^{$2}$$');

  // Convert a*b to a \times b (only between alphanumeric)
  processed = processed.replace(/(\w+)\s*\*\s*(\w+)/g, '$$$1 \\times $2$$');

  // Convert inequalities
  processed = processed.replace(/(\w+)\s*<=\s*(\w+)/g, '$$$1 \\leq $2$$');
  processed = processed.replace(/(\w+)\s*>=\s*(\w+)/g, '$$$1 \\geq $2$$');
  processed = processed.replace(/(\w+)\s*!=\s*(\w+)/g, '$$$1 \\neq $2$$');

  // Restore code blocks
  processed = processed.replace(/__CODE_(\d+)__/g, (_, idx) => codeBlocks[idx]);

  // Restore URLs and dates
  processed = processed.replace(/__(?:URL|DATE)_(\d+)__/g, (_, idx) => urls[idx]);

  return processed;
}

/**
 * Check if content contains math
 */
function hasMath(text) {
  if (!text) return false;
  return /\$\$?[^$]+\$\$?/.test(text) || /\\\(|\\\[/.test(text);
}

/**
 * MathContent - Render markdown with KaTeX math and sanitization
 */
function MathContent({ content, className = '' }) {
  // Memoize processed content
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // Step 1: Normalize delimiters
    let processed = normalizeDelimiters(content);
    
    // Step 2: Safety net for raw notation (only if has dollar signs already or looks like math)
    if (hasMath(processed) || /\w\^|sqrt\(|<=|>=|!=|\*/.test(processed)) {
      processed = convertRawNotation(processed);
    }
    
    // Step 3: Sanitize HTML (protect against XSS)
    processed = DOMPurify.sanitize(processed, {
      USE_PROFILES: { html: false }, // No HTML tags
      ALLOWED_TAGS: [], // Only text
      KEEP_CONTENT: true
    });

    return processed;
  }, [content]);

  // Check if contains b3viz blocks
  const hasViz = useMemo(() => {
    return /```b3viz[\s\S]*?```/.test(processedContent);
  }, [processedContent]);

  return (
    <div className={`math-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, {
            trust: false, // Security: disable \url, \href, etc.
            throwOnError: false, // Don't crash on invalid LaTeX
            errorColor: '#cc0000',
            maxSize: 500, // Prevent DoS
            maxExpand: 100,
            strict: false // Allow slightly malformed syntax
          }]
        ]}
        components={{
          // Paragraph
          p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong style={{ color: 'var(--navy, #1e3a8a)', fontWeight: 600 }}>
              {children}
            </strong>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: '4px' }}>{children}</li>
          ),
          
          // Code blocks
          code: ({ inline, children, className }) => {
            const isB3Viz = className === 'language-b3viz';
            
            if (isB3Viz && !inline) {
              return (
                <Suspense fallback={<div className="viz-loading">Memuat visualisasi...</div>}>
                  <B3Viz json={String(children)} />
                </Suspense>
              );
            }

            if (inline) {
              return <code className="inline-code">{children}</code>;
            }

            return (
              <pre className="code-block">
                <code>{children}</code>
              </pre>
            );
          },
          
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="math-quote">{children}</blockquote>
          ),
          
          // Tables (for wide tables, allow horizontal scroll)
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table className="math-table">{children}</table>
            </div>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MathContent);
