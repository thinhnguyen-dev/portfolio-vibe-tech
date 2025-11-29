'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { BlogPostMetadata as FirebaseBlogPostMetadata } from '@/lib/firebase/blog';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { BlogLayout, UploadForm, BlogList, UpdateModal } from '@/components/features/blog';
import { PasswordModal } from '@/components/common/PasswordModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState<string | null>(null);
  const [pendingUpdatePost, setPendingUpdatePost] = useState<FirebaseBlogPostMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
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

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', () => {
        // Progress tracking can be implemented here if needed
        // For now, we'll handle it in the UploadForm component itself
      });

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

  const handleUpdateClick = async (post: BlogPostMetadata) => {
    // Fetch full Firebase metadata for the post via API
    try {
      const response = await fetch(`/api/blog/metadata/${post.slug}`);
      if (response.ok) {
        const data = await response.json();
        // Convert ISO strings back to Date objects to match FirebaseBlogPostMetadata type
        const fullPost: FirebaseBlogPostMetadata = {
          blogId: data.blogId,
          uuid: data.uuid,
          title: data.title,
          description: data.description,
          thumbnail: data.thumbnail,
          slug: data.slug,
          createdAt: new Date(data.createdAt),
          modifiedAt: new Date(data.modifiedAt),
        };
        setPendingUpdatePost(fullPost);
        // Show password modal first before showing update modal
        setShowUpdatePasswordModal(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Could not load blog post details');
      }
    } catch {
      setError('Failed to load blog post details');
    }
  };

  const handleUpdatePasswordVerify = async (password: string): Promise<boolean> => {
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
      
      // If password is valid, show update modal
      if (isValid) {
        setShowUpdatePasswordModal(false);
        setShowUpdateModal(true);
      }
      
      return isValid;
    } catch {
      return false;
    }
  };

  const handleUpdate = async (data: {
    title: string;
    description: string;
    image?: string;
    thumbnailFile?: File;
    zipFile?: File;
  }) => {
    if (!pendingUpdatePost) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('slug', pendingUpdatePost.slug);
      formData.append('title', data.title);
      formData.append('description', data.description);
      
      if (data.image) {
        formData.append('image', data.image);
      }
      
      if (data.thumbnailFile) {
        formData.append('thumbnailFile', data.thumbnailFile);
      }
      
      if (data.zipFile) {
        formData.append('zipFile', data.zipFile);
      }

      const response = await fetch('/api/blog/update', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccess(responseData.message || 'Blog post updated successfully!');
        setShowUpdateModal(false);
        setPendingUpdatePost(null);
        await fetchPosts();
      } else {
        setError(responseData.error || 'Failed to update blog post');
      }
    } catch {
      setError('An error occurred while updating');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (slug: string) => {
    setPendingDeleteSlug(slug);
    setShowDeleteModal(true);
  };

  const handleDeletePasswordVerify = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/blog/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      return response.ok && data.success === true;
    } catch {
      return false;
    }
  };

  const handleDeleteWithPassword = async (password: string) => {
    if (!pendingDeleteSlug) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/blog/delete?slug=${pendingDeleteSlug}&password=${encodeURIComponent(password)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Blog post deleted successfully!');
        setShowDeleteModal(false);
        setPendingDeleteSlug(null);
        await fetchPosts();
      } else {
        setError(data.error || 'Failed to delete blog post');
        // Don't close modal on error, let user try again
      }
    } catch {
      setError('An error occurred while deleting');
    } finally {
      setDeleting(false);
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
          onUpdate={handleUpdateClick}
          onDelete={handleDeleteClick}
          uploading={uploading || deleting}
          loading={loading}
          emptyMessage="No blog posts yet. Upload one above to get started!"
        />
      </motion.div>

      {/* Password Modal for Upload */}
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

      {/* Password Modal for Update */}
      <PasswordModal
        isOpen={showUpdatePasswordModal}
        onClose={() => {
          setShowUpdatePasswordModal(false);
          setPendingUpdatePost(null);
        }}
        onVerify={handleUpdatePasswordVerify}
        title="Authentication Required"
        message="Please enter the password to update this blog post"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteSlug(null);
          setError(null);
        }}
        onConfirm={async () => {
          // This will be called after password verification in the modal
          // The actual deletion happens in onPasswordVerify callback
        }}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This action is irreversible and will permanently delete the post, markdown file, and all related images."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        loading={deleting}
        requirePassword={true}
        onPasswordVerify={async (password: string) => {
          const isValid = await handleDeletePasswordVerify(password);
          if (isValid && pendingDeleteSlug) {
            // Password is valid, proceed with deletion
            await handleDeleteWithPassword(password);
            return true;
          }
          return false;
        }}
        passwordError={error && (error.includes('password') || error.includes('Invalid')) ? error : null}
      />

      {/* Update Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setPendingUpdatePost(null);
          setError(null);
        }}
        onSubmit={handleUpdate}
        post={pendingUpdatePost}
        updating={uploading}
        error={error}
      />
    </BlogLayout>
  );
}

