'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { Button } from '@/components/common/Button';
import { MdOutlineReadMore } from 'react-icons/md';
import { IoTrashOutline, IoPencilOutline } from 'react-icons/io5';
import { CgCalendarDates } from 'react-icons/cg';
import { TbCategory } from 'react-icons/tb';

interface BlogCardProps {
  post: BlogPostMetadata;
  onUpdate?: (post: BlogPostMetadata) => void;
  onDelete?: (slug: string) => void;
  uploading?: boolean;
}

export function BlogCard({ post, onUpdate, onDelete, uploading = false }: BlogCardProps) {

  return (
    <motion.div
      className="h-full flex flex-col border border-text-secondary hover:border-accent/50 transition-colors group"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Image Section */}
      <div className="w-full aspect-video relative overflow-hidden border-b border-text-secondary shrink-0">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-text-secondary text-sm">Image</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
        {/* Title */}
        <h2 className="text-foreground font-medium text-xl group-hover:text-accent transition-colors line-clamp-2 min-h-14">
          {post.title}
        </h2>

        {/* Meta Information: Date and Category */}
        <div className="flex flex-col gap-3 text-xs text-text-secondary">
          {post.date && (
            <div className="flex items-center gap-1">
              <CgCalendarDates size={16} />

              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
          )}
          <div className="flex items-center gap-1">
            <TbCategory size={16} />

            <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
              {post.category || 'Uncategorized'}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm line-clamp-3 flex-1 min-h-18">
          {post.excerpt}
        </p>

        {/* Buttons */}
        <div className="mt-auto flex gap-2 shrink-0">
          <Button href={`/blog/${post.slug}${onUpdate || onDelete ? '?from=admin' : ''}`}>
            Read more <span className="text-accent"><MdOutlineReadMore size={20} /></span>
          </Button>
          {onUpdate && (
            <button
              onClick={() => onUpdate(post)}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 h-[37px] border border-text-secondary text-text-secondary hover:bg-text-secondary/10 transition-colors text-base leading-[21px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Edit blog post"
            >
              Edit
              <IoPencilOutline size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(post.slug)}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 h-[37px] border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-base leading-[21px] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete blog post"
            >
              <IoTrashOutline size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

