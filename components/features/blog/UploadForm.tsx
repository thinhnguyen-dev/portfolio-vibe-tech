'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown, IoChevronUp } from 'react-icons/io5';

interface UploadFormProps {
  onSubmit: (data: { file: File; title?: string; description?: string; image?: string; thumbnailFile?: File; language?: string }) => Promise<void>;
  uploading: boolean;
}

export function UploadForm({ onSubmit, uploading }: UploadFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    const isMarkdown = selectedFile?.name.toLowerCase().endsWith('.md');
    const isZip = selectedFile?.name.toLowerCase().endsWith('.zip');
    
    if (selectedFile && (isMarkdown || isZip)) {
      setFile(selectedFile);
      
      // Auto-populate title from filename if title is empty
      if (!title) {
        if (isMarkdown) {
          const filenameWithoutExt = selectedFile.name.replace(/\.md$/i, '');
          setTitle(filenameWithoutExt);
        } else if (isZip) {
          const filenameWithoutExt = selectedFile.name.replace(/\.zip$/i, '');
          setTitle(filenameWithoutExt);
        }
      }
      
      // Read file content to auto-generate description (only for markdown files)
      if (isMarkdown) {
        try {
          const content = await selectedFile.text();
          
          // Auto-generate description if empty
          if (!description) {
            // Remove frontmatter if present
            const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
            // Extract first paragraph or first 150 characters
            const excerptMatch = contentWithoutFrontmatter.match(/^[^#\n]+/m);
            let excerpt = excerptMatch ? excerptMatch[0].trim() : '';
            if (excerpt.length > 150) {
              excerpt = excerpt.substring(0, 150) + '...';
            }
            if (excerpt) {
              setDescription(excerpt);
            }
          }
      } catch (err) {
        console.error('Error reading file:', err);
      }
      } else if (isZip) {
        // For ZIP files, we can't read the content client-side
        // The server will extract it and handle everything
        if (!description) {
          setDescription('Blog post with images from ZIP archive');
        }
      }
    }
  };

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

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/blog/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.path) {
        setImage(data.path);
        setImageFile(null);
        setImagePreview('');
        setImageMode('url');
        return data.path;
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      return;
    }

    const finalTitle = title.trim() || file.name.replace(/\.(md|zip)$/i, '');
    const finalDescription = description.trim() || '';
    
    // Determine image handling:
    // - If URL mode: pass the URL directly
    // - If upload mode: pass the file directly (server will upload to Firebase Storage)
    let finalImage: string | undefined;
    let thumbnailFile: File | undefined;
    
    if (imageMode === 'upload' && imageFile) {
      // Pass the file directly - server will handle Firebase Storage upload
      thumbnailFile = imageFile;
    } else if (imageMode === 'url') {
      // Pass the URL
      finalImage = image.trim() || '/default_blog_img.png';
    } else {
      // Default fallback
      finalImage = '/default_blog_img.png';
    }

    await onSubmit({
      file,
      title: finalTitle,
      description: finalDescription,
      image: finalImage,
      thumbnailFile,
      language,
    });
    
    // Reset form on success
    setFile(null);
    setTitle('');
    setDescription('');
    setImage('');
    setImageFile(null);
    setImagePreview('');
    setImageMode('url');
    setLanguage('vi'); // Reset to default language
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const imageFileInput = document.getElementById('image-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    if (imageFileInput) imageFileInput.value = '';
  };

  return (
    <div className="p-4 sm:p-6 border border-text-secondary/20 rounded-lg bg-background/50">
      {/* Header with Collapse/Expand Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Upload New Blog Post</h2>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-text-secondary/10 rounded-md transition-colors"
          aria-label={isExpanded ? 'Collapse form' : 'Expand form'}
          aria-expanded={isExpanded}
        >
          <span className="hidden sm:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? (
            <IoChevronUp size={20} className="text-accent" />
          ) : (
            <IoChevronDown size={20} className="text-accent" />
          )}
        </button>
      </div>
      
      {/* Collapsible Form Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-6 overflow-hidden"
          >
        <div>
          <label htmlFor="language-select" className="block text-sm font-medium mb-2 text-foreground">
            Language <span className="text-text-secondary text-xs">(required)</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language"
                value="vi"
                checked={language === 'vi'}
                onChange={() => setLanguage('vi')}
                disabled={uploading}
                className="cursor-pointer w-5 h-5"
              />
              <span className="text-sm text-foreground">Vietnamese (vi)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="language"
                value="en"
                checked={language === 'en'}
                onChange={() => setLanguage('en')}
                disabled={uploading}
                className="cursor-pointer w-5 h-5"
              />
              <span className="text-sm text-foreground">English (en)</span>
            </label>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Select the language for this blog post. If uploading an English version of an existing Vietnamese blog, select "English" and the system will link them automatically.
          </p>
        </div>

        <div>
          <label htmlFor="file-input" className="block text-sm font-medium mb-2 text-foreground">
            Select ZIP Archive (.zip) containing the Markdown File (.md) and related images 
          </label>
          <input
            id="file-input"
            type="file"
            accept=".md,.zip"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
            disabled={uploading}
          />
          {file && (
            <p className="mt-2 text-sm text-text-secondary">Selected: {file.name}</p>
          )}
          {/* <p className="mt-1 text-xs text-text-secondary">
            ZIP files should contain one .md file and related images. Images will be automatically extracted and linked.
          </p> */}
        </div>

        <div>
          <label htmlFor="title-input" className="block text-sm font-medium mb-2 text-foreground">
            Title <span className="text-text-secondary text-xs">(optional - defaults to filename)</span>
          </label>
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={file ? file.name.replace(/\.(md|zip)$/i, '') : 'Enter blog title...'}
            className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            disabled={uploading}
          />
        </div>

        <div>
          <label htmlFor="description-input" className="block text-sm font-medium mb-2 text-foreground">
            Description <span className="text-text-secondary text-xs">(optional - auto-generated from content)</span>
          </label>
          <textarea
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter blog description..."
            rows={3}
            className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-y"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Cover Image <span className="text-text-secondary text-xs">(optional - defaults to default image)</span>
          </label>
          
          {/* Mode Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-mode"
                value="url"
                checked={imageMode === 'url'}
                onChange={() => {
                  setImageMode('url');
                  setImageFile(null);
                  setImagePreview('');
                }}
                disabled={uploading}
                className="cursor-pointer w-5 h-5"
              />
              <span className="text-sm text-foreground">Enter URL</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-mode"
                value="upload"
                checked={imageMode === 'upload'}
                onChange={() => {
                  setImageMode('upload');
                  setImage('');
                }}
                disabled={uploading}
                className="cursor-pointer w-5 h-5"
              />
              <span className="text-sm text-foreground">Upload File</span>
            </label>
          </div>

          {/* URL Input Mode */}
          {imageMode === 'url' && (
            <>
              <input
                id="image-input"
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/default_blog_img.png"
                className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={uploading}
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
              <div className="flex gap-2">
                <input
                  id="image-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                  disabled={uploading || uploadingImage}
                />
              </div>
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
              {image && imageMode === 'upload' && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">✓ Image uploaded: {image}</p>
              )}
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full sm:w-auto bg-accent text-foreground px-6 py-2 rounded-md hover:bg-accent/80 transition-colors disabled:bg-text-secondary/20 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
              <span>Uploading...</span>
            </>
          ) : (
            'Upload'
          )}
        </button>
      </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

