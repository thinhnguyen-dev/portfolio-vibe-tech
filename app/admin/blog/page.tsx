'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { BlogPostMetadata as FirebaseBlogPostMetadata } from '@/lib/firebase/blog';
import type { BlogPostMetadata } from '@/lib/blog/utils';
import { BlogLayout, UploadForm, BlogList, UpdateModal, BlogFilterPanel } from '@/components/features/blog';
import { PasswordModal } from '@/components/common/PasswordModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useRouter } from 'next/navigation';
import { IoPricetagsOutline } from 'react-icons/io5';

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
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpdatePasswordModal, setShowUpdatePasswordModal] = useState(false);
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState<string | null>(null);
  const [pendingUpdatePost, setPendingUpdatePost] = useState<FirebaseBlogPostMetadata | null>(null);
  const [pendingUpdateSlug, setPendingUpdateSlug] = useState<string | null>(null);
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedHashtagIds, setSelectedHashtagIds] = useState<string[]>([]);
  const [filterNoHashtags, setFilterNoHashtags] = useState(false);
  const [pendingUploadData, setPendingUploadData] = useState<{
    file: File;
    title?: string;
    description?: string;
    image?: string;
    thumbnailFile?: File;
  } | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [selectedHashtagIds, filterNoHashtags]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add no-hashtags filter if enabled
      if (filterNoHashtags) {
        params.append('noHashtags', 'true');
      } else if (selectedHashtagIds.length > 0) {
        // Add hashtag filter if any hashtags are selected (only if not filtering no hashtags)
        params.append('hashtags', selectedHashtagIds.join(','));
      }
      
      const response = await fetch(`/api/blog/posts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // API now returns { posts: [...], pagination: {...} }
        // Extract posts array from the response and ensure it's an array
        const postsData = data.posts || data;
        setPosts(Array.isArray(postsData) ? postsData : []);
      } else {
        toast.error('Failed to load blog posts');
      }
    } catch {
      toast.error('Failed to load blog posts');
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
        toast.success(responseData.message || 'Blog post uploaded successfully!');
        await fetchPosts();
        // Reload the page after successful upload
        window.location.reload();
      } else {
        toast.error(responseData.error || 'Failed to upload file');
      }
    } catch {
      toast.error('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (data: { file: File; title?: string; description?: string; image?: string }) => {
    // Store the upload data and show password modal
    setPendingUploadData(data);
    setShowPasswordModal(true);
  };

  const handleUpdateClick = (post: BlogPostMetadata) => {
    // Store the slug and show password modal first
    setPendingUpdateSlug(post.slug);
    setShowUpdatePasswordModal(true);
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
      
      // If password is valid, fetch metadata and show update modal
      if (isValid && pendingUpdateSlug) {
        setVerifiedPassword(password);
        setShowUpdatePasswordModal(false);
        
        // Fetch full Firebase metadata for the post via API
        try {
          const metadataResponse = await fetch(`/api/blog/metadata/${pendingUpdateSlug}`);
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            // Convert ISO strings back to Date objects to match FirebaseBlogPostMetadata type
            const fullPost: FirebaseBlogPostMetadata = {
              blogId: metadataData.blogId,
              uuid: metadataData.uuid,
              title: metadataData.title,
              description: metadataData.description,
              thumbnail: metadataData.thumbnail,
              slug: metadataData.slug,
              createdAt: new Date(metadataData.createdAt),
              modifiedAt: new Date(metadataData.modifiedAt),
              publishDate: metadataData.publishDate ? new Date(metadataData.publishDate) : undefined,
              category: metadataData.category,
              hashtagIds: metadataData.hashtagIds || [],
            };
            setPendingUpdatePost(fullPost);
            setShowUpdateModal(true);
          } else {
            const errorData = await metadataResponse.json();
            toast.error(errorData.error || 'Could not load blog post details');
            setVerifiedPassword(null);
            setPendingUpdateSlug(null);
            return false;
          }
        } catch {
          toast.error('Failed to load blog post details');
          setVerifiedPassword(null);
          setPendingUpdateSlug(null);
          return false;
        }
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
    publishDate?: Date;
    hashtagIds?: string[];
  }) => {
    if (!pendingUpdatePost || !verifiedPassword) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('slug', pendingUpdatePost.slug);
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('password', verifiedPassword);
      
      if (data.image) {
        formData.append('image', data.image);
      }
      
      if (data.thumbnailFile) {
        formData.append('thumbnailFile', data.thumbnailFile);
      }
      
      if (data.zipFile) {
        formData.append('zipFile', data.zipFile);
      }
      
      if (data.publishDate) {
        // Convert Date to ISO string format (YYYY-MM-DD)
        const dateStr = data.publishDate.toISOString().split('T')[0];
        formData.append('publishDate', dateStr);
      }
      
      // Always send hashtagIds if provided (even if empty array to remove all)
      if (data.hashtagIds !== undefined) {
        formData.append('hashtagIds', JSON.stringify(data.hashtagIds));
      }

      const response = await fetch('/api/blog/update', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success(responseData.message || 'Blog post updated successfully!');
        setShowUpdateModal(false);
        setPendingUpdatePost(null);
        setPendingUpdateSlug(null);
        setVerifiedPassword(null);
        await fetchPosts();
      } else {
        toast.error(responseData.error || 'Failed to update blog post');
        // If password error, close modal and reset
        if (responseData.error?.toLowerCase().includes('password')) {
          setShowUpdateModal(false);
          setPendingUpdatePost(null);
          setPendingUpdateSlug(null);
          setVerifiedPassword(null);
        }
      }
    } catch {
      toast.error('An error occurred while updating');
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

    try {
      const response = await fetch(`/api/blog/delete?slug=${pendingDeleteSlug}&password=${encodeURIComponent(password)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Blog post deleted successfully!');
        setShowDeleteModal(false);
        setPendingDeleteSlug(null);
        await fetchPosts();
      } else {
        const errorMsg = data.error || 'Failed to delete blog post';
        toast.error(errorMsg);
        setError(errorMsg);
        // Don't close modal on error, let user try again
      }
    } catch {
      const errorMsg = 'An error occurred while deleting';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleHashtagManagementClick = () => {
    router.push('/admin/hashtags');
  };

  const handleHashtagFilterChange = (hashtagIds: string[]) => {
    setSelectedHashtagIds(hashtagIds);
    setFilterNoHashtags(false); // Clear no-hashtags filter when selecting hashtags
  };

  const handleNoHashtagsFilterToggle = () => {
    setFilterNoHashtags(!filterNoHashtags);
    setSelectedHashtagIds([]); // Clear hashtag selection when filtering no hashtags
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Existing Blog Posts</h2>
          <button
            onClick={handleHashtagManagementClick}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent/20 text-accent rounded-md hover:bg-accent/30 transition-colors border border-accent/30 w-full sm:w-auto"
          >
            <IoPricetagsOutline size={20} />
            <span>Hashtag Management</span>
          </button>
        </div>
        
        {/* Blog Filter Panel */}
        <BlogFilterPanel
          selectedHashtagIds={selectedHashtagIds}
          filterNoHashtags={filterNoHashtags}
          onHashtagFilterChange={handleHashtagFilterChange}
          onNoHashtagsFilterToggle={handleNoHashtagsFilterToggle}
          disabled={uploading || deleting}
        />
        
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
          setPendingUpdateSlug(null);
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
          setPendingUpdateSlug(null);
          setVerifiedPassword(null);
          setError(null);
        }}
        onSubmit={handleUpdate}
        post={pendingUpdatePost}
        updating={uploading}
        error={error}
      />

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="min-w-[280px] sm:min-w-[320px]"
      />
    </BlogLayout>
  );
}

