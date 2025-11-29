'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import React from 'react';
import { Button } from '@/components/common/Button';
import { MarkdownImage } from '@/components/blog/MarkdownImage';
import { VideoEmbed } from '@/components/blog/VideoEmbed';
import { IoArrowBackCircle } from 'react-icons/io5';

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/blog/content/${slug}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Blog post not found');
          } else {
            const data = await response.json();
            setError(data.error || 'Failed to load blog post');
          }
          return;
        }
        
        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        console.error('Error fetching blog content:', err);
        setError('An error occurred while loading the blog post');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug]);

  const markdownComponents = {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-4xl font-bold mt-14 mb-7 text-foreground heading-underline" {...props} />,
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 className="text-3xl font-bold mt-10 mb-5 text-foreground heading-underline" {...props} />,
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className="text-xl font-bold mt-8 mb-4 text-foreground" {...props} />,
    h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h4 className="text-lg font-bold mt-6 mb-3 text-foreground" {...props} />,
    h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h5 className="text-base font-bold mt-3 mb-2 text-foreground" {...props} />,
    h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h6 className="text-sm font-bold mt-3 mb-2 text-foreground" {...props} />,
    p: (props: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode; className?: string; id?: string }) => {
      const { children, className, id, ...rest } = props;
      const isFootnoteDef = id?.startsWith('fn') || className?.includes('footnote');
      
      if (isFootnoteDef) {
        return (
          <p
            id={id}
            className="footnote-def mb-2 text-text-secondary text-sm"
            {...rest}
          >
            {children}
          </p>
        );
      }
      
      return <p className="mb-4 text-foreground leading-relaxed" {...rest}>{children}</p>;
    },
    ul: (props: React.HTMLAttributes<HTMLUListElement> & { className?: string }) => {
      const { className, ...rest } = props;
      const isTaskList = className?.includes('contains-task-list') || false;
      
      return (
        <ul 
          className={
            isTaskList
              ? "mb-4 space-y-2 text-foreground contains-task-list"
              : "list-disc list-outside mb-4 space-y-2 text-foreground pl-6"
          } 
          {...rest}
        />
      );
    },
    ol: (props: React.HTMLAttributes<HTMLOListElement> & { className?: string; id?: string; children?: React.ReactNode }) => {
      const { className, id, children, ...rest } = props;
      
      const hasBackRefInChildren = React.Children.toArray(children).some((child: unknown) => {
        if (typeof child === 'object' && child !== null && 'props' in child) {
          const childProps = (child as { props?: { children?: React.ReactNode; [key: string]: unknown } }).props;
          const grandChildren = childProps?.children;
          return React.Children.toArray(grandChildren).some((gc: unknown) => {
            if (typeof gc === 'object' && gc !== null && 'props' in gc) {
              return (gc as { props?: { 'data-footnote-backref'?: string; [key: string]: unknown } }).props?.['data-footnote-backref'] !== undefined;
            }
            return false;
          });
        }
        return false;
      });
      
      const isFootnoteList = className?.includes('footnotes') || 
                            id?.includes('footnote') || 
                            hasBackRefInChildren;
      
      if (isFootnoteList) {
        return (
          <ol
            id={id}
            className="footnotes-list list-none mb-4 space-y-2 text-foreground"
            {...rest}
          >
            {children}
          </ol>
        );
      }
      
      return <ol className="list-decimal list-outside mb-4 space-y-2 text-foreground pl-6" {...rest}>{children}</ol>;
    },
    li: (props: React.HTMLAttributes<HTMLLIElement> & { children?: React.ReactNode; className?: string; id?: string }) => {
      const { children, className, id, ...rest } = props;
      const isTaskListItem = className?.includes('task-list-item') || false;
      
      const hasBackRef = React.Children.toArray(children).some((child: unknown) => {
        if (typeof child === 'object' && child !== null && 'props' in child) {
          const childProps = (child as { props?: { 'data-footnote-backref'?: string; [key: string]: unknown } }).props;
          return childProps?.['data-footnote-backref'] !== undefined;
        }
        return false;
      });
      
      const isFootnoteDefItem = id?.startsWith('fn') || 
                                className?.includes('footnote') || 
                                hasBackRef;
      
      if (isFootnoteDefItem && !isTaskListItem) {
        let footnoteNumber = '';
        if (id?.startsWith('fn')) {
          footnoteNumber = id.replace('fn', '');
        } else if (hasBackRef) {
          React.Children.forEach(children, (child: unknown) => {
            if (typeof child === 'object' && child !== null && 'props' in child) {
              const childProps = (child as { props?: { href?: string; [key: string]: unknown } }).props;
              const href = childProps?.href as string;
              if (href?.includes('fnref-')) {
                const match = href.match(/fnref-(\d+)/);
                if (match) footnoteNumber = match[1];
              }
            }
          });
        }
        
        return (
          <li
            id={id}
            className="footnote-def ml-0 mb-2 text-text-secondary text-sm"
            {...rest}
          >
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child) && child.type === 'p') {
                return React.cloneElement(child as React.ReactElement, {
                  'data-footnote-number': footnoteNumber ? `${footnoteNumber}.` : '',
                } as React.HTMLAttributes<HTMLParagraphElement>);
              }
              return child;
            })}
          </li>
        );
      }
      
      if (isTaskListItem) {
        return (
          <li 
            className="ml-0 list-none text-foreground flex items-start gap-2 task-list-item" 
            {...rest}
          >
            {children}
          </li>
        );
      }
      
      return (
        <li className="text-foreground" {...rest}>
          {children}
        </li>
      );
    },
    input: (props: React.InputHTMLAttributes<HTMLInputElement>) => {
      const { type, checked, disabled, ...rest } = props;
      
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked || false}
            disabled={disabled}
            className="task-list-item-checkbox"
            aria-label={checked ? 'Completed task' : 'Incomplete task'}
            tabIndex={0}
            {...rest}
          />
        );
      }
      return <input type={type} {...rest} />;
    },
    blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
      <blockquote 
        className="border-l-4 border-accent pl-4 mb-6 italic text-text-secondary rounded-r-md transition-colors" 
        {...props } 
      />
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => (
      <code 
        className="px-1.5 py-0.5 rounded text-sm font-mono text-accent border transition-colors" 
        style={{ 
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
        }}
        {...props} 
      />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre 
        className="rounded-md p-4 my-4 overflow-x-auto border transition-colors" 
        style={{ 
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
        }}
        {...props} 
      />
    ),
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a className="text-accent hover:underline transition-colors" {...props} />,
    table: (props: React.HTMLAttributes<HTMLTableElement>) => (
      <table 
        className="border-collapse my-4 w-full rounded-md overflow-hidden transition-colors" 
        style={{ borderColor: 'var(--border-color)' }}
        {...props} 
      />
    ),
    th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
      <th 
        className="border px-4 py-2 font-bold text-foreground transition-colors" 
        style={{ 
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
        }}
        {...props} 
      />
    ),
    td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
      <td 
        className="border px-4 py-2 text-foreground transition-colors" 
        style={{ 
          backgroundColor: 'var(--article-bg)',
          borderColor: 'var(--border-color)'
        }}
        {...props} 
      />
    ),
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, title, ...rest } = props;
      const srcString = typeof src === 'string' ? src : null;
      if (!srcString) return null;
      return <MarkdownImage src={srcString} alt={alt || ''} title={title} {...rest} />;
    },
    iframe: (props: React.IframeHTMLAttributes<HTMLIFrameElement>) => {
      const { src, title, width, height, allowFullScreen, ...rest } = props;
      if (!src || typeof src !== 'string') return null;
      return (
        <VideoEmbed
          src={src}
          title={title || 'Video player'}
          width={typeof width === 'string' ? width : width?.toString()}
          height={typeof height === 'string' ? height : height?.toString()}
          allowFullScreen={allowFullScreen !== false}
          {...rest}
        />
      );
    },
    sup: (props: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode; id?: string }) => {
      const { children, id, ...rest } = props;
      const isFootnoteRef = id?.startsWith('fnref');
      
      if (isFootnoteRef) {
        return (
          <sup
            id={id}
            className="footnote-ref"
            {...rest}
          >
            <a
              id={id}
              href={`#${id?.replace('fnref', 'fn')}`}
              className="text-accent hover:underline no-underline font-semibold"
              aria-label={`Footnote ${children}`}
            >
              {children}
            </a>
          </sup>
        );
      }
      
      return <sup {...props} />;
    },
    section: (props: React.HTMLAttributes<HTMLElement> & { className?: string; id?: string }) => {
      const { className, id, ...rest } = props;
      const isFootnoteDef = className?.includes('footnotes') || id?.startsWith('footnote');
      
      if (isFootnoteDef) {
        return (
          <section
            id={id}
            className="footnotes mt-8 pt-6 border-t border-text-secondary/20"
            {...rest}
          />
        );
      }
      
      return <section {...props} />;
    },
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
      <hr 
        className="my-8 border-0 border-t border-text-secondary/20" 
        {...props} 
      />
    ),
  };

  return (
    <div className="container mx-auto px-12 sm:px-14 md:px-16 max-w-7xl p-8">
      <Button href="/blog" className="mb-4">
        Back to Blog
        <IoArrowBackCircle size={20} />
      </Button>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
          <p className="text-text-secondary">Loading blog post...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}
      
      {content && !loading && (
        <article 
          className="markdown-content border p-12 rounded-2xl shadow-2xl transition-colors"
          style={{ 
            backgroundColor: 'var(--article-bg)',
            borderColor: 'var(--border-color)'
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
