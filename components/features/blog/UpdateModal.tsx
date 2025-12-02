'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BlogPostMetadata } from '@/lib/firebase/blog';
import { HashtagSelector } from './HashtagSelector';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    image?: string;
    thumbnailFile?: File;
    zipFile?: File;
    publishDate?: Date;
    hashtagIds?: string[];
  }) => Promise<void>;
  post: BlogPostMetadata | null;
  updating: boolean;
  error: string | null;
}

// Helper function to get initial publish date
function getInitialPublishDate(post: BlogPostMetadata | null): string {
  if (!post) {
    return new Date().toISOString().split('T')[0];
  }
  if (post.publishDate) {
    return new Date(post.publishDate).toISOString().split('T')[0];
  }
  if (post.createdAt) {
    return new Date(post.createdAt).toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export function UpdateModal({
  isOpen,
  onClose,
  onSubmit,
  post,
  updating,
  error: externalError,
}: UpdateModalProps) {
  // Initialize state with values from post prop
  const [title, setTitle] = useState(() => post?.title || '');
  const [description, setDescription] = useState(() => post?.description || '');
  const [image, setImage] = useState(() => post?.thumbnail || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [publishDate, setPublishDate] = useState(() => getInitialPublishDate(post));
  const [hashtagIds, setHashtagIds] = useState<string[]>(() => post?.hashtagIds || []);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formKey = post?.blogId || '';

  // Reset form when post changes or modal opens - batch updates using startTransition
  // This ensures fresh data from Firestore is loaded when modal opens
  useEffect(() => {
    if (isOpen && post) {
      startTransition(() => {
        // Reset all form fields to the original post values from Firestore
        setTitle(post.title);
        setDescription(post.description || '');
        setImage(post.thumbnail || '');
        setPublishDate(getInitialPublishDate(post));
        setImageFile(null);
        setImagePreview('');
        setImageMode('url');
        setZipFile(null);
        // Reset hashtags to original values from Firestore
        // Use a fresh array to ensure reference equality triggers HashtagSelector update
        setHashtagIds(post.hashtagIds ? [...post.hashtagIds] : []);
        setError(null);
      });
    } else if (!isOpen) {
      // Reset form when modal closes to prevent stale data
      startTransition(() => {
        setTitle('');
        setDescription('');
        setImage('');
        setPublishDate(new Date().toISOString().split('T')[0]);
        setImageFile(null);
        setImagePreview('');
        setImageMode('url');
        setZipFile(null);
        setHashtagIds([]);
        setError(null);
      });
    }
  }, [isOpen, formKey, post]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && post) {
      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, post]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setImageFile(selectedFile);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isZip = selectedFile.name.toLowerCase().endsWith('.zip');
      if (isZip) {
        setZipFile(selectedFile);
      } else {
        setError('Only ZIP files are allowed for blog content updates');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Determine image handling
    let finalImage: string | undefined;
    let thumbnailFile: File | undefined;

    if (imageMode === 'upload' && imageFile) {
      thumbnailFile = imageFile;
    } else if (imageMode === 'url') {
      finalImage = image.trim() || post?.thumbnail || '/default_blog_img.png';
    } else {
      finalImage = post?.thumbnail || '/default_blog_img.png';
    }

    // Parse publish date
    const publishDateObj = publishDate ? new Date(publishDate) : undefined;

    // Submit form data including hashtagIds
    // Note: All hashtag changes (additions/removals) made via UI are only in local state
    // The actual Firestore update happens in the API route when this form is submitted
    // If the user cancels or reloads, the original hashtagIds from Firestore will be restored
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      image: finalImage,
      thumbnailFile,
      zipFile: zipFile || undefined,
      publishDate: publishDateObj,
      hashtagIds: hashtagIds, // Only sent to Firestore when Update button is clicked
    });
  };

  // Handle modal close - reset all local state changes
  // The parent component will fetch fresh data from Firestore when reopening
  const handleClose = () => {
    // Reset all form fields to original post values before closing
    if (post) {
      setTitle(post.title);
      setDescription(post.description || '');
      setImage(post.thumbnail || '');
      setPublishDate(getInitialPublishDate(post));
      setImageFile(null);
      setImagePreview('');
      setImageMode('url');
      setZipFile(null);
      setHashtagIds(post.hashtagIds || []);
      setError(null);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!post) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute top-1.5 bg-background border border-text-secondary/20 rounded-lg shadow-xl max-w-2xl w-full p-4 sm:p-6 my-4 sm:my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Update Blog Post</h2>
              <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">Edit the blog post details below</p>
              
              <form key={formKey} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="update-title-input" className="block text-sm font-medium mb-2 text-foreground">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    id="update-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter blog title"
                    disabled={updating}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="update-description-input" className="block text-sm font-medium mb-2 text-foreground">
                    Description
                  </label>
                  <textarea
                    id="update-description-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-y"
                    placeholder="Enter blog description"
                    disabled={updating}
                  />
                </div>

                {/* Publish Date */}
                <div>
                  <label htmlFor="update-publish-date-input" className="block text-sm font-medium mb-2 text-foreground">
                    Publish Date
                  </label>
                  <input
                    id="update-publish-date-input"
                    type="date"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed date-input-custom"
                    disabled={updating}
                    aria-label="Select publish date"
                  />
                </div>

                {/* Hashtags */}
                <HashtagSelector
                  key={formKey} // Force remount when post changes to prevent stale hashtag data
                  selectedHashtagIds={hashtagIds}
                  onChange={setHashtagIds}
                  disabled={updating}
                />

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Cover Image
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="update-image-mode"
                        value="url"
                        checked={imageMode === 'url'}
                        onChange={() => {
                          setImageMode('url');
                          setImageFile(null);
                          setImagePreview('');
                        }}
                        disabled={updating}
                        className="cursor-pointer w-5 h-5"
                      />
                      <span className="text-sm text-foreground">Enter URL</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="update-image-mode"
                        value="upload"
                        checked={imageMode === 'upload'}
                        onChange={() => {
                          setImageMode('upload');
                          setImage('');
                        }}
                        disabled={updating}
                        className="cursor-pointer w-5 h-5"
                      />
                      <span className="text-sm text-foreground">Upload File</span>
                    </label>
                  </div>

                  {/* URL Input Mode */}
                  {imageMode === 'url' && (
                    <>
                      <input
                        id="update-image-input"
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="/default_blog_img.png"
                        className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                        disabled={updating}
                      />
                      {image && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={image} 
                            alt="Preview" 
                            className="max-w-xs max-h-32 object-cover rounded border border-text-secondary/20"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* File Upload Mode */}
                  {imageMode === 'upload' && (
                    <>
                      <input
                        id="update-image-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                        disabled={updating}
                      />
                      {imageFile && (
                        <p className="mt-2 text-sm text-text-secondary">Selected: {imageFile.name}</p>
                      )}
                      {imagePreview && (
                        <div className="mt-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-xs max-h-32 object-cover rounded border border-text-secondary/20"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* ZIP File Upload */}
                <div>
                  <label htmlFor="update-zip-input" className="block text-sm font-medium mb-2 text-foreground">
                    Upload New ZIP File <span className="text-text-secondary text-xs">(optional - will replace existing content)</span>
                  </label>
                  <input
                    id="update-zip-input"
                    type="file"
                    accept=".zip"
                    onChange={handleZipFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                    disabled={updating}
                  />
                  {zipFile && (
                    <p className="mt-2 text-sm text-text-secondary">Selected: {zipFile.name}</p>
                  )}
                  <p className="mt-1 text-xs text-text-secondary">
                    Uploading a new ZIP file will replace the existing markdown file and all images. Old resources will be deleted.
                  </p>
                </div>

                {(error || externalError) && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {error || externalError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={updating}
                    className="w-full sm:w-auto px-4 py-2 border border-text-secondary/20 text-foreground rounded-md hover:bg-text-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || updating}
                    className="w-full sm:w-auto px-4 py-2 bg-accent text-foreground rounded-md hover:bg-accent/80 transition-colors disabled:bg-text-secondary/20 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

