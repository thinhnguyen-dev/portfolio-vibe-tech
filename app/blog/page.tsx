'use client';

import { useState, useEffect } from 'react';
import { BlogLayout, BlogList } from '@/components/features/blog';
import type { BlogPostMetadata } from '@/lib/blog/utils';

const POSTS_PER_PAGE = 9;

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchPosts = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/blog/posts?page=${page}&limit=${POSTS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure posts is always an array
        setPosts(Array.isArray(data.posts) ? data.posts : []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
      } else {
        setError('Failed to load blog posts');
      }
    } catch (err) {
      setError('An error occurred while loading blog posts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  return (
    <BlogLayout title="Blog">
      {error && (
        <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 mb-4">
          {error}
        </div>
      )}
      <BlogList 
        posts={posts} 
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </BlogLayout>
  );
}

