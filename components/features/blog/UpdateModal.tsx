'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BlogPostMetadata } from '@/lib/firebase/blog';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    image?: string;
    thumbnailFile?: File;
    zipFile?: File;
  }) => Promise<void>;
  post: BlogPostMetadata | null;
  updating: boolean;
  error: string | null;
}

export function UpdateModal({
  isOpen,
  onClose,
  onSubmit,
  post,
  updating,
  error: externalError,
}: UpdateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title);
      setDescription(post.description || '');
      setImage(post.thumbnail || '');
      setImageFile(null);
      setImagePreview('');
      setImageMode('url');
      setZipFile(null);
      setError(null);
      // Focus title input when modal opens
      setTimeout(() => titleInputRef.current?.focus(), 100);
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

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      image: finalImage,
      thumbnailFile,
      zipFile: zipFile || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
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
            onClick={onClose}
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
              className="bg-background border border-text-secondary/20 rounded-lg shadow-xl max-w-2xl w-full p-6 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">Update Blog Post</h2>
              <p className="text-text-secondary mb-6">Edit the blog post details below</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
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

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">
                    Cover Image
                  </label>
                  
                  {/* Mode Toggle */}
                  <div className="flex gap-4 mb-3">
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

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={updating}
                    className="px-4 py-2 border border-text-secondary/20 text-foreground rounded-md hover:bg-text-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim() || updating}
                    className="px-4 py-2 bg-accent text-foreground rounded-md hover:bg-accent/80 transition-colors disabled:bg-text-secondary/20 disabled:cursor-not-allowed"
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

