'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { BlogCard } from './BlogCard';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

interface BlogListProps {
  posts: BlogPostMetadata[];
  emptyMessage?: string;
  loading?: boolean;
  loadingMessage?: string;
  onUpdate?: (slug: string, file: File) => void;
  uploading?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export function BlogList({
  posts,
  emptyMessage = 'No blog posts yet.',
  loading = false,
  loadingMessage = 'Loading...',
  onUpdate,
  uploading = false,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
}: BlogListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const listInView = useInView(listRef, { once: true, amount: 0.1 });

  // Only show pagination if total items > 9
  const showPagination = totalItems > 9 && totalPages > 1 && onPageChange;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-text-secondary">{loadingMessage}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        ref={listRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate={listInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {posts.map((post, index) => (
          <motion.div key={post.slug} variants={cardVariants}>
            <BlogCard
              post={post}
              onUpdate={onUpdate}
              uploading={uploading}
            />
          </motion.div>
        ))}
      </motion.div>

      {showPagination && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <IoChevronBack size={20} />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-text-secondary">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    page === currentPage
                      ? 'bg-accent text-foreground font-semibold'
                      : 'bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  aria-label={`Go to page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <span>Next</span>
            <IoChevronForward size={20} />
          </button>
        </div>
      )}
    </>
  );
}

