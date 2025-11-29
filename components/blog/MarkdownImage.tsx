'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface MarkdownImageProps {
  src: string;
  alt?: string;
  title?: string;
  [key: string]: unknown;
}

export function MarkdownImage({ src, alt, title, ...rest }: MarkdownImageProps) {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Determine if image is external (HTTP/HTTPS) or local
  // Local images start with '/' and are served from the public directory
  // External images start with 'http://' or 'https://'
  const isExternal = src.startsWith('http://') || src.startsWith('https://');

  useEffect(() => {
    const img = new window.Image();
    
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsLoading(false);
    };
    
    img.onerror = () => {
      // Fallback dimensions if image fails to load
      setDimensions({ width: 800, height: 186 });
      setIsLoading(false);
    };
    
    img.src = src;
  }, [src]);

  if (isLoading || !dimensions) {
    // Use a span skeleton for the placeholder (valid inside <p> tags)
    const placeholderColor = typeof window !== 'undefined' 
      ? (document.documentElement.classList.contains('light') ? '#E5E7EB' : '#374151')
      : '#374151';
    
    return (
      <span
        className="rounded animate-pulse inline-image"
        style={{
          width: '100%',
          maxWidth: '100%',
          height: '200px',
          aspectRatio: '16/9',
          backgroundColor: placeholderColor,
          display: 'inline-block',
          margin: '1rem 0',
          verticalAlign: 'middle',
        }}
        aria-label="Loading image..."
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt || ''}
      title={title}
      width={dimensions.width}
      height={dimensions.height}
      className="rounded inline-image"
      style={{ maxWidth: '100%', height: 'auto' }}
      // Only unoptimize external images; local images can be optimized by Next.js
      unoptimized={isExternal}
      // For local images, Next.js will handle optimization
      // For external images, we need unoptimized=true
      {...rest}
    />
  );
}

