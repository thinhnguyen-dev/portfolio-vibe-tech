'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { Button } from '@/components/common/Button';
import { MdOutlineReadMore } from 'react-icons/md';

interface BlogCardProps {
  post: BlogPostMetadata;
  onUpdate?: (slug: string, file: File) => void;
  uploading?: boolean;
}

export function BlogCard({ post, onUpdate, uploading = false }: BlogCardProps) {
  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.name.endsWith('.md') && onUpdate) {
      onUpdate(post.slug, selectedFile);
    }
  };

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

        {/* Description */}
        <p className="text-text-secondary text-sm line-clamp-3 flex-1 min-h-18">
          {post.excerpt}
        </p>

        {/* Buttons */}
        <div className="mt-auto flex gap-2 shrink-0">
          <Button href={`/blog/${post.slug}`}>
            Read more <span className="text-accent"><MdOutlineReadMore size={20} /></span>
          </Button>
          {onUpdate && (
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2.5 px-4 py-2 h-[37px] border border-text-secondary text-text-secondary hover:bg-text-secondary/10 transition-colors text-base leading-[21px] font-medium whitespace-nowrap">
                Update
              </span>
              <input
                type="file"
                accept=".md"
                onChange={handleUpdateFileChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>
    </motion.div>
  );
}

