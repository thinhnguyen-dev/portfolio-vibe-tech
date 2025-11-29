'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  inline?: boolean;
}

export function MathRenderer({ math, inline = false }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement | HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      katex.render(math, containerRef.current, {
        throwOnError: false,
        displayMode: !inline,
        strict: false,
        trust: false,
      });
    } catch (error) {
      if (containerRef.current) {
        containerRef.current.textContent = math;
      }
    }
  }, [math, inline]);

  const Component = inline ? 'span' : 'div';
  const className = inline
    ? 'katex-inline'
    : 'katex-block my-4 overflow-x-auto';

  return (
    <Component
      ref={containerRef as never}
      className={className}
      style={{
        color: 'var(--foreground)',
      }}
    />
  );
}

