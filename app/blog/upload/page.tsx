'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.name.endsWith('.md')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a .md file');
      setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/blog/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        router.push('/blog');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload file');
      }
    } catch {
      setError('An error occurred while uploading');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-8">
      <h1 className="text-4xl font-bold mb-8">Upload Blog Post</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium mb-2">
            Select Markdown File (.md)
          </label>
          <input
            id="file-input"
            type="file"
            accept=".md"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={uploading}
          />
        </div>

        {error && (
          <div className="p-4 rounded-md bg-red-50 text-red-800">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}

