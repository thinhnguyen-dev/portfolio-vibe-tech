'use client';

import { useState, useEffect } from 'react';
import { IoOpenOutline, IoLinkOutline } from 'react-icons/io5';

interface PreviewProps {
  url: string;
  className?: string;
}

export function Preview({ url, className = '' }: PreviewProps) {
  const [previewData, setPreviewData] = useState<{
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!url) {
        setError('No URL provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Use a proxy API route to fetch the preview data (to avoid CORS issues)
        const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch preview');
        }
        
        const data = await response.json();
        setPreviewData(data);
      } catch (err) {
        console.error('Error fetching preview:', err);
        setError('Failed to load preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div
        className={`my-6 border rounded-lg overflow-hidden transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--article-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="p-4 animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div
        className={`my-6 border rounded-lg overflow-hidden transition-colors ${className}`}
        style={{
          backgroundColor: 'var(--article-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="block p-4 hover:bg-opacity-50 transition-colors group"
          style={{
            backgroundColor: 'var(--code-bg)',
          }}
        >
          <div className="flex items-center gap-2 text-accent">
            <IoLinkOutline size={20} />
            <span className="font-medium group-hover:underline">{url}</span>
            <IoOpenOutline size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </a>
      </div>
    );
  }

  return (
    <div
      className={`my-6 border rounded-lg overflow-hidden transition-colors hover:shadow-lg ${className}`}
      style={{
        backgroundColor: 'var(--article-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block group"
      >
        {previewData.image && (
          <div className="w-full h-48 overflow-hidden" style={{ backgroundColor: 'var(--code-bg)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewData.image}
              alt={previewData.title || 'Preview image'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="p-4">
          {previewData.siteName && (
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {previewData.siteName}
            </div>
          )}
          {previewData.title && (
            <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {previewData.title}
            </h3>
          )}
          {previewData.description && (
            <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {previewData.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-accent">
            <IoLinkOutline size={16} />
            <span className="truncate">{new URL(url).hostname}</span>
            <IoOpenOutline size={14} className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
          </div>
        </div>
      </a>
    </div>
  );
}

