'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import { Button } from '@/components/common/Button';
import { MarkdownImage } from '@/components/blog/MarkdownImage';
import { VideoEmbed } from '@/components/blog/VideoEmbed';
import { CodeBlock } from '@/components/blog/CodeBlock';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { Preview } from '@/components/blog/Preview';
import { IoArrowBackCircle } from 'react-icons/io5';
import { extractTextFromReactChildren, HeadingIdGenerator } from '@/lib/blog/id-utils';

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const idGeneratorRef = useRef<HeadingIdGenerator>(new HeadingIdGenerator());

  useEffect(() => {
    // Check if we're in admin mode by checking query params or referrer
    const fromParam = searchParams?.get('from');
    const isFromAdmin = fromParam === 'admin';
    
    // Also check referrer as fallback
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      const isFromAdminReferrer = Boolean(referrer && referrer.includes('/admin/blog'));
      
      setIsAdminMode(isFromAdmin || isFromAdminReferrer);
    } else {
      setIsAdminMode(isFromAdmin);
    }
  }, [searchParams]);

  // Get language from URL search params or default to 'vi'
  const languageParam = searchParams?.get('language');
  const language = languageParam === 'en' ? 'en' : 'vi';

  useEffect(() => {
    const fetchContent = async () => {
      if (!slug || typeof slug !== 'string') {
        setNotFound(true);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setNotFound(false);
        const response = await fetch(`/api/blog/content/${slug}?language=${language}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Blog not found - redirect to 404 page
            setNotFound(true);
            setLoading(false);
            router.replace('/not-found');
            return;
          } else {
            // Other errors - redirect to 404 as well
            const data = await response.json().catch(() => ({}));
            console.error('Failed to load blog post:', data.error || 'Unknown error');
            setNotFound(true);
            setLoading(false);
            router.replace('/not-found');
            return;
          }
        }
        
        const data = await response.json();
        // Ensure content exists and is a string
        if (data?.content && typeof data.content === 'string') {
          setContent(data.content);
        } else {
          // Invalid content - treat as not found
          setNotFound(true);
          setLoading(false);
          router.replace('/not-found');
        }
      } catch (err) {
        console.error('Error fetching blog content:', err);
        // On error, redirect to 404
        setNotFound(true);
        setLoading(false);
        router.replace('/not-found');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [slug, router, language]);

  // Reset ID generator when content changes
  useEffect(() => {
    idGeneratorRef.current.reset();
  }, [content]);

  // Process content to replace {%preview URL %} with custom HTML
  const processedContent = useMemo(() => {
    if (!content) return content;
    
    // Match {%preview URL %} pattern
    const previewRegex = /\{%preview\s+([^\s}]+)\s*%\}/g;
    
    return content.replace(previewRegex, (match, url) => {
      // Create a custom HTML element that we can handle in the markdown renderer
      return `<div data-preview-url="${url.replace(/"/g, '&quot;')}"></div>`;
    });
  }, [content]);

  const markdownComponents = {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => {
      const { children, ...rest } = props;
      const text = extractTextFromReactChildren(children);
      // const id = idGeneratorRef.current.generate(text);

      return <h1 id={text + '-1'} className="text-2xl sm:text-3xl md:text-4xl font-bold mt-8 sm:mt-10 md:mt-14 mb-4 sm:mb-5 md:mb-7 text-foreground heading-underline scroll-mt-20 sm:scroll-mt-24 heading-glow" {...rest}>
        <span className="text-accent text-2xl sm:text-3xl md:text-4xl leading-tight sm:leading-[38px] md:leading-[42px] font-extrabold w-[16px] sm:w-[18px] md:w-[20px] mr-1 sm:mr-2">#</span>{children}
      </h1>;
    },
    h2: (props: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => {
      const { children, ...rest } = props;
      const text = extractTextFromReactChildren(children);
      // const id = idGeneratorRef.current.generate(text);

      return <h2 id={text + '-2'} className="text-xl sm:text-2xl md:text-3xl font-bold mt-6 sm:mt-8 md:mt-10 mb-3 sm:mb-4 md:mb-5 text-foreground heading-underline scroll-mt-20 sm:scroll-mt-24 heading-glow" {...rest}>
        <span className="text-accent text-xl sm:text-2xl md:text-3xl leading-tight sm:leading-[32px] md:leading-[38px] font-extrabold w-[16px] sm:w-[18px] md:w-[20px] mr-1 sm:mr-2">#</span>
        {children}
      </h2>;
    },
    h3: (props: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => {
      const { children, ...rest } = props;
      const text = extractTextFromReactChildren(children);
      // const id = idGeneratorRef.current.generate(text);
      return <h3 id={text + '-3'} className="text-lg sm:text-xl font-bold mt-5 sm:mt-6 md:mt-8 mb-2 sm:mb-3 md:mb-4 text-foreground scroll-mt-20 sm:scroll-mt-24" {...rest}>{children}</h3>;
    },
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
              : "list-disc list-outside mb-4 space-y-2 text-foreground pl-4 sm:pl-6"
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
      
      return <ol className="list-decimal list-outside mb-4 space-y-2 text-foreground pl-4 sm:pl-6" {...rest}>{children}</ol>;
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
        className="border-l-4 sm:border-l-6 outline-1 border-accent pl-3 sm:pl-4 mb-4 sm:mb-6 italic text-text-secondary rounded-r-md transition-colors text-sm sm:text-base" 
        {...props } 
      />
    ),
    code: (props: React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode; inline?: boolean }) => {
      const { className, children, inline, ...rest } = props;
      const isInline = inline !== false && !className?.includes('language-');
      
      if (isInline) {
        return (
          <code 
            className="px-1.5 py-0.5 rounded text-sm font-mono text-accent border transition-colors" 
            style={{ 
              backgroundColor: 'var(--code-bg)',
              borderColor: 'var(--border-color)'
            }}
            {...rest}
          >
            {children}
          </code>
        );
      }
      
      // Code block - extract language and content
      const codeString = typeof children === 'string' 
        ? children 
        : React.Children.toArray(children).join('');
      
      return (
        <CodeBlock className={className} inline={false}>
          {codeString}
        </CodeBlock>
      );
    },
    pre: (props: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactNode }) => {
      // react-markdown wraps code blocks in pre tags
      // We need to extract the code element and handle it
      const { children, ...rest } = props;
      
      // Check if children is a code element
      if (React.isValidElement(children) && children.type === 'code') {
        const codeProps = children.props as React.HTMLAttributes<HTMLElement> & { className?: string; children?: React.ReactNode };
        const { className, children: codeChildren } = codeProps;
        
        // Extract language and content
        const codeString = typeof codeChildren === 'string' 
          ? codeChildren 
          : React.Children.toArray(codeChildren).join('');
        
        return (
          <CodeBlock className={className} inline={false}>
            {codeString}
          </CodeBlock>
        );
      }
      
      // Fallback for other pre elements
      return (
        <pre 
          className="rounded-md my-8 overflow-x-auto border transition-colors" 
          style={{ 
            backgroundColor: 'var(--code-bg)',
            borderColor: 'var(--border-color)'
          }}
          {...rest}
        >
          {children}
        </pre>
      );
    },
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => 
      <a className="text-accent hover:underline transition-colors px-1" 
        style={{ 
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
      }}{...props} />,
    table: (props: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="my-6 overflow-x-auto">
        <table 
          className="border-collapse w-full rounded-md transition-colors" 
          style={{ borderColor: 'var(--border-color)' }}
          {...props} 
        />
      </div>
    ),
    thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
      <thead {...props} />
    ),
    tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
      <tbody {...props} />
    ),
    tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
      <tr {...props} />
    ),
    th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
      <th 
        className="border px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm font-bold text-left text-foreground transition-colors" 
        style={{
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
        }}
        {...props} 
      />
    ),
    td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
      <td 
        className="border px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm text-foreground transition-colors" 
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
    div: (props: React.HTMLAttributes<HTMLDivElement>) => {
      // Check for data-preview-url attribute (React passes data attributes through)
      const propsWithData = props as { 'data-preview-url'?: string } & React.HTMLAttributes<HTMLDivElement>;
      const previewUrl = propsWithData['data-preview-url'];
      
      if (previewUrl) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { 'data-preview-url': _, ...rest } = propsWithData;
        return <Preview url={previewUrl} {...rest} />;
      }
      
      return <div {...props} />;
    },
  };

  // If not found, show loading while redirecting
  if (notFound) {
    return (
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-7xl py-4 sm:py-6 md:py-8">
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-accent mb-4"></div>
          <p className="text-text-secondary text-sm sm:text-base">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-9xl py-4 sm:py-6 md:py-8">
      <Button href={isAdminMode ? "/admin/blog" : "/blog"} className="mb-4 sm:mb-6">
        Back to Blog
        <IoArrowBackCircle size={20} />
      </Button>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-accent mb-4"></div>
          <p className="text-text-secondary text-sm sm:text-base">Loading blog post...</p>
        </div>
      )}
      
      {content && !loading && (
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Main Article Content */}
          <article 
            className="markdown-content border p-4 sm:p-6 md:p-8 lg:p-12 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl transition-colors flex-1 w-full lg:min-w-0 max-w-full overflow-hidden"
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
              {processedContent || content}
            </ReactMarkdown>
          </article>

          {/* Table of Contents - Hidden on mobile/tablet, shown on desktop */}
          <aside className="hidden xl:block sticky top-24 lg:w-40 xl:w-80 shrink-0 self-start">
            <TableOfContents content={content} />
          </aside>
        </div>
      )}

      {/* Toast Container for code copy notifications */}
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}
