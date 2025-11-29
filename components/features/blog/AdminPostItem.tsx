import Link from 'next/link';
import type { BlogPostMetadata } from '@/lib/blog/utils';

interface AdminPostItemProps {
  post: BlogPostMetadata;
  onUpdate: (slug: string, file: File) => void;
  uploading: boolean;
}

export function AdminPostItem({ post, onUpdate, uploading }: AdminPostItemProps) {
  const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.name.endsWith('.md')) {
      onUpdate(post.slug, selectedFile);
    }
  };

  return (
    <div className="p-6 border border-text-secondary/20 rounded-lg bg-background/50 flex items-center justify-between gap-4">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-foreground mb-1">{post.title}</h3>
        <p className="text-sm text-text-secondary mb-2">Slug: {post.slug}</p>
        <p className="text-text-secondary line-clamp-2">{post.excerpt}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Link
          href={`/blog/${post.slug}`}
          className="text-accent hover:underline text-sm"
        >
          View
        </Link>
        <label className="cursor-pointer">
          <span className="text-accent hover:underline text-sm">Update</span>
          <input
            type="file"
            accept=".md"
            onChange={handleUpdateFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}

