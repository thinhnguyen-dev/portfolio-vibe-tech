'use client';

import { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { Button } from '@/components/common/Button';
import { useHashtags } from './HashtagContext';
import { MdOutlineReadMore } from 'react-icons/md';
import { IoTrashOutline, IoPencilOutline, IoPricetagsOutline } from 'react-icons/io5';
import { CgCalendarDates } from 'react-icons/cg';

interface BlogCardProps {
  post: BlogPostMetadata;
  onUpdate?: (post: BlogPostMetadata) => void;
  onDelete?: (slug: string) => void;
  uploading?: boolean;
}

export function BlogCard({ post, onUpdate, onDelete, uploading = false }: BlogCardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { getHashtags, isLoading } = useHashtags();

  // Determine if we're in admin mode based on pathname or props
  const isAdminMode = pathname?.startsWith('/admin') || !!onUpdate || !!onDelete;
  const blogBasePath = isAdminMode ? '/admin/blog' : '/blog';

  // Get hashtags from context
  const hashtags = useMemo(() => {
    if (!post.hashtagIds || post.hashtagIds.length === 0) {
      return [];
    }
    return getHashtags(post.hashtagIds);
  }, [post.hashtagIds, getHashtags]);

  // Check if hashtags are still loading
  const loadingHashtags = useMemo(() => {
    if (!post.hashtagIds || post.hashtagIds.length === 0) {
      return false;
    }
    return isLoading(post.hashtagIds);
  }, [post.hashtagIds, isLoading]);

  const handleHashtagClick = (hashtagId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to blog page with hashtag filter applied
    // Special case for filtering blogs with no hashtags
    if (hashtagId === '__no_hashtags__') {
      router.push(`${blogBasePath}?noHashtags=true`);
    } else {
      router.push(`${blogBasePath}?hashtags=${hashtagId}`);
    }
  };

  return (
    <motion.div
      className="h-full flex flex-col border border-text-secondary sm:hover:border-accent/50 transition-colors group"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image Section */}
      <div className="w-full aspect-video relative overflow-hidden border-b border-text-secondary shrink-0">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover sm:group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-text-secondary text-sm">Image</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 flex-1 min-h-0">
        {/* Title */}
        <h2 className="text-foreground font-medium text-lg sm:text-xl sm:group-hover:text-accent transition-colors line-clamp-2 min-h-14">
          {post.title}
        </h2>

        {/* Meta Information: Date and Category */}
        <div className="flex flex-col gap-2 sm:gap-3 text-sm text-text-secondary">
          {post.date && (
            <div className="flex items-center gap-1.5">
              <CgCalendarDates size={14} className="sm:w-4 sm:h-4" />

              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
          )}
          {/* Hashtags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <IoPricetagsOutline size={14} className="sm:w-4 sm:h-4 shrink-0" />
            {loadingHashtags ? (
              <span className="text-text-secondary text-xs">Loading hashtags...</span>
            ) : hashtags.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                {hashtags.slice(0, 5).map((hashtag) => (
                  <button
                    key={hashtag.hashtagId}
                    type="button"
                    onClick={(e) => handleHashtagClick(hashtag.hashtagId, e)}
                    className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium text-sm hover:bg-accent/20 transition-colors cursor-pointer"
                    title={`Filter blogs by ${hashtag.name}`}
                  >
                    {hashtag.name}
                  </button>
                ))}
                {hashtags.length > 5 && (
                  <div className="relative">
                    <span 
                      className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium text-sm cursor-help hover:bg-accent/20 transition-colors peer"
                      title={hashtags.map((h) => h.name).join(', ')}
                    >
                      +{hashtags.length - 5} more
                    </span>
                    {/* Tooltip - appears on hover of the "+X more" element only */}
                    <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible transition-opacity duration-200 z-50 w-64 max-w-[calc(100vw-2rem)] p-3 bg-background border border-text-secondary/20 rounded-md shadow-xl text-xs text-foreground">
                      <div className="font-semibold mb-2 text-foreground">All hashtags:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {hashtags.map((hashtag) => (
                          <button
                            key={hashtag.hashtagId}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHashtagClick(hashtag.hashtagId, e);
                            }}
                            className="px-2 py-1 rounded bg-accent/10 text-accent font-medium hover:bg-accent/20 transition-colors cursor-pointer"
                            title={`Filter blogs by ${hashtag.name}`}
                          >
                            {hashtag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleHashtagClick('__no_hashtags__', e)}
                className="px-2 py-0.5 rounded bg-accent/10 text-red-500 font-medium text-sm hover:bg-accent/20 transition-colors cursor-pointer"
                title="Filter blogs with no hashtags"
              >
                No hashtags
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm line-clamp-3 flex-1 min-h-18">
          {post.excerpt}
        </p>

        {/* Buttons */}
        <div className="mt-auto flex flex-col sm:flex-row gap-2 shrink-0 min-w-0">
          <Button 
            href={`/blog/${post.slug}?language=${post.language || 'vi'}${onUpdate || onDelete ? '&from=admin' : ''}`}
            className="w-full sm:w-auto sm:min-w-0 justify-center"
          >
            <span className="text-accent shrink-0"><MdOutlineReadMore size={20} /></span>
            <span className="inline md:hidden 2xl:inline">Read more</span>
          </Button>
          {(onUpdate || onDelete) && (
            <div className="flex gap-2 min-w-0 shrink-0">
              {onUpdate && (
                <button
                  onClick={() => onUpdate(post)}
                  disabled={uploading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 md:gap-1 2xl:gap-2 px-3 md:px-3 2xl:px-4 py-2 h-[37px] border border-text-secondary text-text-secondary hover:bg-text-secondary/10 active:bg-text-secondary/20 transition-colors text-xs md:text-base leading-[21px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shrink-0"
                  aria-label="Edit blog post"
                >
                  <span className="inline md:hidden 2xl:inline">Edit</span>
                  <IoPencilOutline size={18} className="shrink-0" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(post.slug)}
                  disabled={uploading}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 md:gap-1 2xl:gap-2 px-3 md:px-3 2xl:px-4 py-2 h-[37px] border border-red-500/50 text-red-500 hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-xs md:text-base leading-[21px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation shrink-0"
                  aria-label="Delete blog post"
                >
                  <span className="inline md:hidden 2xl:inline">Delete</span>
                  <IoTrashOutline size={18} className="shrink-0" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

