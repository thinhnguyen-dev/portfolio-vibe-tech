'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { BlogLayout, UploadForm, BlogList } from '@/components/features/blog';
import { PasswordModal } from '@/components/common/PasswordModal';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function AdminBlogPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState<{
    file: File;
    title?: string;
    description?: string;
    image?: string;
    thumbnailFile?: File;
  } | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/blog/posts');
      if (response.ok) {
        const data = await response.json();
        // API now returns { posts: [...], pagination: {...} }
        // Extract posts array from the response and ensure it's an array
        const postsData = data.posts || data;
        setPosts(Array.isArray(postsData) ? postsData : []);
      }
    } catch {
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordVerify = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/blog/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      const isValid = response.ok && data.success === true;
      
      // If password is valid, proceed with upload
      if (isValid && pendingUploadData) {
        setShowPasswordModal(false);
        // Perform upload after a short delay to allow modal to close
        setTimeout(async () => {
          await performUpload(pendingUploadData);
          setPendingUploadData(null);
        }, 100);
      }
      
      return isValid;
    } catch {
      return false;
    }
  };

  const performUpload = async (data: { file: File; title?: string; description?: string; image?: string; thumbnailFile?: File }) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.title) {
        formData.append('title', data.title);
      }
      if (data.description) {
        formData.append('description', data.description);
      }
      if (data.image) {
        formData.append('image', data.image);
      }
      if (data.thumbnailFile) {
        formData.append('thumbnailFile', data.thumbnailFile);
      }

      const response = await fetch('/api/blog/upload', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess(responseData.message || 'Blog post uploaded successfully!');
        await fetchPosts();
        // Reload the page after successful upload
        window.location.reload();
      } else {
        setError(responseData.error || 'Failed to upload file');
      }
    } catch {
      setError('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (data: { file: File; title?: string; description?: string; image?: string }) => {
    // Store the upload data and show password modal
    setPendingUploadData(data);
    setShowPasswordModal(true);
  };

  const handleUpdate = async (slug: string, file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', slug);

      const response = await fetch('/api/blog/update', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Blog post updated successfully!');
        await fetchPosts();
      } else {
        setError(data.error || 'Failed to update file');
      }
    } catch {
      setError('An error occurred while updating');
    } finally {
      setUploading(false);
    }
  };

  const uploadRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef<HTMLDivElement>(null);
  const uploadInView = useInView(uploadRef, { once: true, amount: 0.1 });
  const postsInView = useInView(postsRef, { once: true, amount: 0.1 });

  return (
    <BlogLayout
      title="Admin - Blog Management"
      description="Upload new blog posts or update existing ones"
      backLink={{ href: '/blog', label: 'Back to Blog' }}
    >
      {/* Upload Section */}
      <motion.div
        ref={uploadRef}
        className="mb-12"
        variants={itemVariants}
        initial="hidden"
        animate={uploadInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <UploadForm
          onSubmit={handleUpload}
          uploading={uploading}
          error={error}
          success={success}
        />
      </motion.div>

      {/* Existing Posts Section */}
      <motion.div
        ref={postsRef}
        variants={itemVariants}
        initial="hidden"
        animate={postsInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-6">Existing Blog Posts</h2>
        <BlogList
          posts={posts}
          onUpdate={handleUpdate}
          uploading={uploading}
          loading={loading}
          emptyMessage="No blog posts yet. Upload one above to get started!"
        />
      </motion.div>

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingUploadData(null);
        }}
        onVerify={handlePasswordVerify}
        title="Authentication Required"
        message="Please enter the password to upload a blog post"
      />
    </BlogLayout>
  );
}

