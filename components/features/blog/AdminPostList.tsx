import type { BlogPostMetadata } from '@/lib/blog/utils';
import { AdminPostItem } from './AdminPostItem';

interface AdminPostListProps {
  posts: BlogPostMetadata[];
  onUpdate: (slug: string, file: File) => void;
  uploading: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

export function AdminPostList({
  posts,
  onUpdate,
  uploading,
  loading = false,
  emptyMessage = 'No blog posts yet. Upload one above to get started!',
}: AdminPostListProps) {
  if (loading) {
    return <p className="text-text-secondary">Loading...</p>;
  }

  if (posts.length === 0) {
    return <p className="text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <AdminPostItem
          key={post.slug}
          post={post}
          onUpdate={onUpdate}
          uploading={uploading}
        />
      ))}
    </div>
  );
}

