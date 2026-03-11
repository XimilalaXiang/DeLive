import { memo, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match?.[1] || ''
  const isInline = !className

  const handleCopy = useCallback(() => {
    const text = typeof children === 'string' ? children : String(children)
    void navigator.clipboard.writeText(text.replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  if (isInline) {
    return (
      <code
        className="rounded-md bg-muted px-1.5 py-0.5 text-[0.85em] font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-lg border border-border bg-muted/50">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/80 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-3 prose-blockquote:border-primary/40 prose-blockquote:text-muted-foreground prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none prose-table:my-3 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: CodeBlock as never,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
