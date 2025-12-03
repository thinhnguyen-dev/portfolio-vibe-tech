'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/navigation';
import { BlogLayout } from '@/components/features/blog';
import { PasswordModal } from '@/components/common/PasswordModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { HashtagFormModal } from '@/components/common/HashtagFormModal';
import { HashtagSearch } from '@/components/common/HashtagSearch';
import { IoAdd, IoPencil, IoTrash, IoChevronBack, IoChevronForward } from 'react-icons/io5';
import type { Hashtag } from '@/lib/firebase/hashtags';

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

const HASHTAGS_PER_PAGE = 10;

/**
 * Format date to DD:MM:YYYY format
 */
const formatDate = (date: Date | string): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function AdminHashtagsPage() {
  const router = useRouter();
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  
  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingHashtag, setEditingHashtag] = useState<Hashtag | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Password and delete modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'update' | 'delete' | null>(null);
  const [pendingFormName, setPendingFormName] = useState<string>('');

  // Track if password verification succeeded to prevent modal from reopening
  const passwordVerificationSucceeded = useRef(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const tableInView = useInView(tableRef, { once: true, amount: 0.1 });

  const fetchHashtags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (activeSearchTerm.trim()) {
        // If searching, use search endpoint
        params.append('q', activeSearchTerm.trim());
        params.append('limit', '100'); // Get more results when searching
      } else {
        // Otherwise, use pagination
        params.append('page', currentPage.toString());
        params.append('limit', HASHTAGS_PER_PAGE.toString());
      }
      
      const response = await fetch(`/api/hashtags?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        // Convert date strings to Date objects
        const hashtagsWithDates: Hashtag[] = Array.isArray(data.hashtags) 
          ? data.hashtags.map((hashtag: unknown) => {
              const h = hashtag as Hashtag & { createdAt: string | Date; updatedAt: string | Date };
              return {
                ...h,
                createdAt: h.createdAt instanceof Date 
                  ? h.createdAt 
                  : new Date(h.createdAt as string),
                updatedAt: h.updatedAt instanceof Date 
                  ? h.updatedAt 
                  : new Date(h.updatedAt as string),
              } as Hashtag;
            })
          : [];
        
        setHashtags(hashtagsWithDates);
        
        // Update pagination info
        if (activeSearchTerm.trim()) {
          // When searching, show all results on one page
          setTotalPages(1);
          setTotalCount(hashtagsWithDates.length);
        } else {
          setTotalPages(data.pagination?.totalPages || 1);
          setTotalCount(data.pagination?.total || 0);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load hashtags');
        toast.error(errorData.error || 'Failed to load hashtags');
      }
    } catch (err) {
      const errorMsg = 'An error occurred while loading hashtags';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeSearchTerm]);

  useEffect(() => {
    fetchHashtags();
  }, [fetchHashtags]);

  // Scroll to top when component mounts (initial page load or route change)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Track if component has mounted and if we just changed pages
  const hasMountedRef = useRef(false);
  const prevPageRef = useRef(currentPage);
  const pageChangedRef = useRef(false);

  // Scroll to top when page number changes (after initial mount)
  useEffect(() => {
    if (hasMountedRef.current && prevPageRef.current !== currentPage) {
      // Mark that we've changed pages
      pageChangedRef.current = true;
      // Scroll immediately when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevPageRef.current = currentPage;
    } else if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevPageRef.current = currentPage;
    }
  }, [currentPage]);

  // Also scroll after loading completes if we just changed pages
  useEffect(() => {
    if (hasMountedRef.current && !loading && pageChangedRef.current) {
      // Reset the flag and scroll again to ensure it sticks
      pageChangedRef.current = false;
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

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
      
      if (isValid) {
        // Mark verification as succeeded to prevent modal from reopening
        passwordVerificationSucceeded.current = true;
        
        // Capture the action before clearing state
        const action = pendingAction;
        const formName = pendingFormName;
        const hashtag = editingHashtag;
        
        // Clear all state immediately to prevent password modal's onClose from reopening form
        setPendingAction(null);
        setPendingFormName('');
        setShowPasswordModal(false);
        setShowFormModal(false); // Ensure form modal stays closed
        
        // Execute pending action with password passed directly
        if (action === 'create') {
          await performCreate(password, formName);
        } else if (action === 'update' && hashtag) {
          await performUpdate(password, formName);
        } else if (action === 'delete' && pendingDeleteId) {
          await performDelete(password);
        }
      } else {
        passwordVerificationSucceeded.current = false;
        toast.error('Invalid password. Please try again.');
      }
      
      return isValid;
    } catch (err) {
      passwordVerificationSucceeded.current = false;
      toast.error('An error occurred while verifying password');
      console.error(err);
      return false;
    }
  };

  const handleCreateClick = () => {
    setEditingHashtag(null);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleEditClick = (hashtag: Hashtag) => {
    setEditingHashtag(hashtag);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDeleteClick = (hashtagId: string) => {
    setPendingDeleteId(hashtagId);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (name: string) => {
    setFormError(null);
    setPendingFormName(name);
    
    // Show password modal
    setPendingAction(editingHashtag ? 'update' : 'create');
    setShowFormModal(false);
    setShowPasswordModal(true);
  };

  const performCreate = async (password: string, name: string) => {
    if (!password || !name) {
      toast.error('Password and name are required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/hashtags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Hashtag created successfully!');
        setShowFormModal(false);
        // Clear all state - modals are already closed
        setPendingAction(null);
        setPendingFormName('');
        setEditingHashtag(null);
        setFormError(null);
        // Reset to first page and clear search
        setCurrentPage(1);
        setActiveSearchTerm('');
        await fetchHashtags();
      } else {
        const errorMsg = data.error || 'Failed to create hashtag';
        setFormError(errorMsg);
        toast.error(errorMsg);
        // Reopen modal with error
        setShowFormModal(true);
      }
    } catch (err) {
      const errorMsg = 'An error occurred while creating hashtag';
      setFormError(errorMsg);
      toast.error(errorMsg);
      // Reopen modal with error
      setShowFormModal(true);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const performUpdate = async (password: string, name: string) => {
    if (!password || !editingHashtag) {
      toast.error('Password and hashtag are required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const updates: { name?: string } = {};
      if (name.trim() !== editingHashtag.name) {
        updates.name = name.trim();
      }

      if (Object.keys(updates).length === 0) {
        const errorMsg = 'No changes to save';
        setFormError(errorMsg);
        toast.warning(errorMsg);
        setSubmitting(false);
        // Reopen modal with error
        setShowFormModal(true);
        return;
      }

      const response = await fetch(`/api/hashtags/${editingHashtag.hashtagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Hashtag updated successfully!');
        // Clear all state - ensure modals stay closed
        setEditingHashtag(null);
        setPendingAction(null);
        setPendingFormName('');
        setFormError(null);
        setShowFormModal(false); // Explicitly close modal
        // Refresh hashtags (total count remains the same for update)
        await fetchHashtags();
      } else {
        const errorMsg = data.error || 'Failed to update hashtag';
        setFormError(errorMsg);
        toast.error(errorMsg);
        // Reopen modal with error
        setShowFormModal(true);
      }
    } catch (err) {
      const errorMsg = 'An error occurred while updating hashtag';
      setFormError(errorMsg);
      toast.error(errorMsg);
      // Reopen modal with error
      setShowFormModal(true);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const performDelete = async (password: string) => {
    if (!password || !pendingDeleteId) {
      toast.error('Password and hashtag ID are required');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/hashtags/${pendingDeleteId}?password=${encodeURIComponent(password)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Hashtag deleted successfully!');
        setShowDeleteModal(false);
        setPendingDeleteId(null);
        setPendingAction(null);
        // Refresh the list - if we're on a page that becomes empty, go to previous page
        const currentHashtagsCount = hashtags.length;
        if (currentHashtagsCount === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
          // fetchHashtags will be called automatically via useEffect when currentPage changes
        } else {
          // Refresh hashtags (this will update total count)
          await fetchHashtags();
        }
      } else {
        const errorMsg = data.error || 'Failed to delete hashtag';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'An error occurred while deleting hashtag';
      toast.error(errorMsg);
      setError(errorMsg);
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      // Scroll will be handled by useEffect watching currentPage
    }
  };

  const handleSearchSubmit = (term: string) => {
    // Set the active search term which will trigger fetchHashtags via useEffect
    setActiveSearchTerm(term);
    // Reset to page 1 when performing a new search
    setCurrentPage(1);
  };

  const handleHashtagSelect = (hashtag: Hashtag) => {
    // Set the active search term to trigger search
    setActiveSearchTerm(hashtag.name);
    // Reset to page 1 when selecting a hashtag
    setCurrentPage(1);
  };

  const handleBlogCountClick = (hashtagId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // Navigate to blog page with hashtag filter
    router.push(`/admin/blog?hashtags=${hashtagId}`);
  };


  return (
    <BlogLayout
      title="Admin - Hashtag Management"
      description="Create, update, and manage hashtags for your blog posts"
      backLink={{ href: '/admin/blog', label: 'Back to Blog Admin' }}
    >
      {/* Hashtags Table */}
      <motion.div
        ref={tableRef}
        variants={itemVariants}
        initial="hidden"
        animate={tableInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            All Hashtags {totalCount > 0 && `(${totalCount})`}
          </h2>
          <div className="w-full sm:w-auto sm:max-w-md">
            <HashtagSearch
              onSelect={handleHashtagSelect}
              onSearchSubmit={handleSearchSubmit}
              placeholder="Search hashtags by name..."
              disabled={submitting || deleting}
            />
          </div>
          <button
            onClick={handleCreateClick}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-foreground rounded-md hover:bg-accent/80 transition-colors w-full sm:w-auto"
          >
            <IoAdd size={20} />
            <span>New Hashtag</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading hashtags...</p>
          </div>
        ) : error && hashtags.length === 0 ? (
          <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
            {error}
          </div>
        ) : hashtags.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">No hashtags yet. Create one above to get started!</p>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Loading overlay during page transition */}
              {loading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                    <p className="text-sm text-text-secondary">Loading hashtags...</p>
                  </div>
                </div>
              )}
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto border border-text-secondary/20 rounded-lg">
                <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-text-secondary/20" style={{ backgroundColor: 'var(--code-bg)' }}>
                    <th className="px-4 py-3 text-left text-sm font-bold text-foreground">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Linked Blogs</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-foreground">Updated</th>
                    <th className="px-4 py-3 text-center text-sm font-bold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hashtags.map((hashtag) => (
                    <tr
                      key={hashtag.hashtagId}
                      className="border-b border-text-secondary/20 hover:bg-background/50 transition-colors"
                      style={{ backgroundColor: 'var(--article-bg)' }}
                    >
                      <td className="px-4 py-3 text-sm text-foreground font-mono">
                        {hashtag.hashtagId?.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground font-medium">
                        {hashtag.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={(e) => handleBlogCountClick(hashtag.hashtagId, e)}
                          disabled={!hashtag.linkedBlogIds || hashtag.linkedBlogIds.length === 0}
                          className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-md text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50
                            bg-accent/10 text-accent hover:bg-accent/20 hover:scale-105 active:scale-95
                            disabled:bg-text-secondary/10 disabled:text-text-secondary disabled:hover:bg-text-secondary/10 disabled:hover:scale-100
                            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                          title={hashtag.linkedBlogIds && hashtag.linkedBlogIds.length > 0 
                            ? `Click to view ${hashtag.linkedBlogIds.length} linked blog${hashtag.linkedBlogIds.length !== 1 ? 's' : ''}`
                            : 'No linked blogs'}
                        >
                          {hashtag.linkedBlogIds?.length || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(hashtag.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(hashtag.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(hashtag)}
                            disabled={submitting || deleting}
                            className="p-2 text-accent hover:bg-accent/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit hashtag"
                          >
                            <IoPencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(hashtag.hashtagId)}
                            disabled={submitting || deleting}
                            className="p-2 text-red-500 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete hashtag"
                          >
                            <IoTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {hashtags.map((hashtag) => (
                  <div
                    key={hashtag.hashtagId}
                    className="border border-text-secondary/20 rounded-lg p-4 bg-background/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate mb-1">
                          {hashtag.name}
                        </h3>
                        <p className="text-xs text-text-secondary font-mono truncate">
                          ID: {hashtag.hashtagId}
                        </p>
                        <div className="mt-2">
                          <button
                            onClick={(e) => handleBlogCountClick(hashtag.hashtagId, e)}
                            disabled={!hashtag.linkedBlogIds || hashtag.linkedBlogIds.length === 0}
                            className="inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50
                              bg-accent/10 text-accent hover:bg-accent/20 hover:scale-105 active:scale-95
                              disabled:bg-text-secondary/10 disabled:text-text-secondary disabled:hover:bg-text-secondary/10 disabled:hover:scale-100
                              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                            title={hashtag.linkedBlogIds && hashtag.linkedBlogIds.length > 0 
                              ? `Click to view ${hashtag.linkedBlogIds.length} linked blog${hashtag.linkedBlogIds.length !== 1 ? 's' : ''}`
                              : 'No linked blogs'}
                          >
                            <span className="font-semibold">{hashtag.linkedBlogIds?.length || 0}</span>
                            <span className="ml-1 text-[10px] opacity-75">blog{hashtag.linkedBlogIds && hashtag.linkedBlogIds.length !== 1 ? 's' : ''}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => handleEditClick(hashtag)}
                          disabled={submitting || deleting}
                          className="p-2 text-accent hover:bg-accent/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Edit hashtag"
                        >
                          <IoPencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(hashtag.hashtagId)}
                          disabled={submitting || deleting}
                          className="p-2 text-red-500 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete hashtag"
                        >
                          <IoTrash size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary pt-3 border-t border-text-secondary/20">
                      <div>
                        <span className="font-medium text-foreground">Created:</span>{' '}
                        {formatDate(hashtag.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Updated:</span>{' '}
                        {formatDate(hashtag.updatedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center gap-4">
                {/* Page Info */}
                <div className="text-xs sm:text-sm text-text-secondary">
                  Page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
                  <span className="font-semibold text-foreground">{totalPages}</span>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 w-full">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    aria-label="Previous page"
                  >
                    <IoChevronBack size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>

                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      if (!showPage) {
                        if (page === currentPage - 2 || page === currentPage + 2) {
                          return (
                            <span key={page} className="px-1 sm:px-2 text-text-secondary text-sm">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          disabled={loading}
                          className={`px-3 sm:px-4 py-2 rounded-md transition-colors text-sm ${
                            page === currentPage
                              ? 'bg-accent text-foreground font-semibold'
                              : 'bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={`Go to page ${page}`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-md bg-background border border-text-secondary/20 text-foreground hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <IoChevronForward size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Hashtag Form Modal */}
      <HashtagFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingHashtag(null);
          setFormError(null);
          setPendingFormName('');
        }}
        onSubmit={handleFormSubmit}
        editingHashtag={editingHashtag}
        submitting={submitting}
        error={formError}
      />

      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          // Check if verification succeeded using ref (synchronous check)
          const verificationSucceeded = passwordVerificationSucceeded.current;
          
          // Reset the flag for next time
          passwordVerificationSucceeded.current = false;
          
          setShowPasswordModal(false);
          
          // Only reopen form modal if user manually cancelled (not after successful verification)
          if (!verificationSucceeded) {
            const action = pendingAction;
            if (action === 'create' || action === 'update') {
              // User cancelled password entry - reopen form modal with existing data
              setShowFormModal(true);
            } else {
              // Clear any remaining state
              setPendingAction(null);
              setPendingFormName('');
            }
          }
          // If verification succeeded, don't reopen modal - it's already closed
        }}
        onVerify={handlePasswordVerify}
        title="Authentication Required"
        message="Please enter the password to continue"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteId(null);
          setError(null);
        }}
        onConfirm={async () => {
          // This will be called after password verification
        }}
        title="Delete Hashtag"
        message="Are you sure you want to delete this hashtag? This action is irreversible."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        loading={deleting}
        requirePassword={true}
        onPasswordVerify={async (password: string) => {
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
            
            if (isValid && pendingDeleteId) {
              setPendingAction('delete');
              await performDelete(password);
              return true;
            } else if (!isValid) {
              toast.error('Invalid password. Please try again.');
            }
            return false;
          } catch (err) {
            toast.error('An error occurred while verifying password');
            console.error(err);
            return false;
          }
        }}
        passwordError={error && (error.includes('password') || error.includes('Invalid')) ? error : null}
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

