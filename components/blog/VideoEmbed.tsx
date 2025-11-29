'use client';

import { useMemo } from 'react';

interface VideoEmbedProps {
  src: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  allowFullScreen?: boolean;
  className?: string;
  [key: string]: unknown;
}

export function VideoEmbed({
  src,
  title = 'Video player',
  width = 560,
  height = 315,
  allowFullScreen = true,
  className = '',
  ...rest
}: VideoEmbedProps) {
  // Extract video platform and ID from common video URLs
  const videoConfig = useMemo(() => {
    if (!src) return null;

    // YouTube patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = src.match(youtubeRegex);
    
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return {
        platform: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        videoId,
      };
    }

    // Vimeo patterns
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = src.match(vimeoRegex);
    
    if (vimeoMatch) {
      const videoId = vimeoMatch[1];
      return {
        platform: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
        videoId,
      };
    }

    // If it's already an embed URL or direct iframe src, use it as-is
    if (src.includes('embed') || src.includes('player')) {
      return {
        platform: 'custom',
        embedUrl: src,
        videoId: null,
      };
    }

    return null;
  }, [src]);

  // If we couldn't parse the URL, use the src directly
  const embedUrl = videoConfig?.embedUrl || src;

  // Ensure no autoplay (accessibility requirement)
  const safeUrl = useMemo(() => {
    try {
      const url = new URL(embedUrl);
      // Remove autoplay parameter if present
      url.searchParams.delete('autoplay');
      // Ensure no autoplay
      url.searchParams.set('autoplay', '0');
      return url.toString();
    } catch {
      return embedUrl;
    }
  }, [embedUrl]);

  // Calculate aspect ratio from width and height
  const aspectRatio = useMemo(() => {
    const w = typeof width === 'string' ? parseFloat(width) : width;
    const h = typeof height === 'string' ? parseFloat(height) : height;
    
    if (w && h && w > 0 && h > 0) {
      // Calculate percentage for padding-bottom technique
      return (h / w) * 100;
    }
    
    // Default to 16:9 if invalid dimensions
    return 56.25;
  }, [width, height]);

  return (
    <div className={`my-6 w-[${width}px] h-[${height}px] ${className}`}>
      <div 
        className={`relative bg-background/10 rounded-lg overflow-hidden shadow-lg`}
        style={{ paddingBottom: `${aspectRatio}%` }}
      >
        <iframe
          src={safeUrl}
          title={title}
          width={width}
          height={height}
          allowFullScreen={allowFullScreen}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          aria-label={title}
          {...rest}
        />
      </div>
    </div>
  );
}

