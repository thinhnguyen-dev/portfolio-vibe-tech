'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HashtagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  editingHashtag?: { hashtagId: string; name: string } | null;
  submitting?: boolean;
  error?: string | null;
}

export function HashtagFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingHashtag = null,
  submitting = false,
  error: externalError = null,
}: HashtagFormModalProps) {
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Defer state updates to avoid cascading renders
      setTimeout(() => {
        if (editingHashtag) {
          setFormName(editingHashtag.name);
        } else {
          setFormName('');
        }
        setFormError(null);
        // Focus input when modal opens
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, editingHashtag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formName.trim()) {
      setFormError('Hashtag name is required');
      inputRef.current?.focus();
      return;
    }

    try {
      await onSubmit(formName.trim());
      // Don't close here - let parent handle it after successful submission
    } catch {
      // Error handling is done in parent component
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isEditMode = Boolean(editingHashtag);

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
              className="bg-background border border-text-secondary/20 rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {isEditMode ? 'Edit Hashtag' : 'Create New Hashtag'}
              </h2>
              <p className="text-sm sm:text-base text-text-secondary mb-4 sm:mb-6">
                {isEditMode 
                  ? 'Update the hashtag name. The ID cannot be changed.' 
                  : 'Enter a name for the new hashtag.'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="hashtag-name-input" className="block text-sm font-medium mb-2 text-foreground">
                    Hashtag Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={inputRef}
                    id="hashtag-name-input"
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="e.g., Web Development"
                    disabled={submitting}
                    required
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    The display name for the hashtag
                  </p>
                </div>

                {(formError || externalError) && (
                  <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {formError ?? externalError}
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="w-full sm:w-auto px-4 py-2 border border-text-secondary/20 text-foreground rounded-md hover:bg-text-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formName.trim() || submitting}
                    className="w-full sm:w-auto px-4 py-2 bg-accent text-foreground rounded-md hover:bg-accent/80 transition-colors disabled:bg-text-secondary/20 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
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

