'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Hashtag } from '@/lib/firebase/hashtags';
import { IoClose, IoPricetagsOutline } from 'react-icons/io5';

interface HashtagSelectorProps {
  selectedHashtagIds: string[];
  onChange: (hashtagIds: string[]) => void;
  disabled?: boolean;
}

export function HashtagSelector({
  selectedHashtagIds,
  onChange,
  disabled = false,
}: HashtagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Hashtag[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch selected hashtag details from Firestore
  useEffect(() => {
    if (selectedHashtagIds.length === 0) {
      setSelectedHashtags([]);
      setLoadingSelected(false);
      return;
    }

    const fetchSelectedHashtags = async () => {
      setLoadingSelected(true);
      try {
        const response = await fetch(`/api/hashtags?ids=${selectedHashtagIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const fetchedHashtags = data.hashtags || [];
          // Ensure we only show hashtags that are still in the selectedHashtagIds array
          // (handles case where hashtag was removed while fetching)
          setSelectedHashtags(
            fetchedHashtags.filter((h: Hashtag) => 
              selectedHashtagIds.includes(h.hashtagId)
            )
          );
        } else {
          console.error('Failed to fetch selected hashtags');
          setSelectedHashtags([]);
        }
      } catch (error) {
        console.error('Error fetching selected hashtags:', error);
        setSelectedHashtags([]);
      } finally {
        setLoadingSelected(false);
      }
    };

    fetchSelectedHashtags();
  }, [selectedHashtagIds]);

  // Search hashtags with debounce
  const searchHashtags = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setHashtags([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/hashtags?q=${encodeURIComponent(term)}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          // Filter out already selected hashtags
          const filtered = (data.hashtags || []).filter(
            (hashtag: Hashtag) => !selectedHashtagIds.includes(hashtag.hashtagId)
          );
          setHashtags(filtered);
        }
      } catch (error) {
        console.error('Error searching hashtags:', error);
        setHashtags([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedHashtagIds]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDropdown && searchTerm.trim()) {
        searchHashtags(searchTerm);
      } else {
        setHashtags([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, showDropdown, searchHashtags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelectHashtag = (hashtag: Hashtag) => {
    if (!selectedHashtagIds.includes(hashtag.hashtagId)) {
      onChange([...selectedHashtagIds, hashtag.hashtagId]);
    }
    setSearchTerm('');
    setShowDropdown(false);
    searchInputRef.current?.focus();
  };

  // Remove hashtag from UI state only - Firestore update happens on form submit
  const handleRemoveHashtag = (hashtagId: string) => {
    // This only updates the local state via onChange callback
    // The actual Firestore update will occur when the form is submitted
    onChange(selectedHashtagIds.filter(id => id !== hashtagId));
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowDropdown(true);
      searchHashtags(searchTerm);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-2 text-foreground">
        Hashtags
      </label>

      {/* Selected hashtags display */}
      {(loadingSelected || selectedHashtags.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {loadingSelected ? (
            <div className="text-xs text-text-secondary">Loading hashtags...</div>
          ) : (
            selectedHashtags.map((hashtag) => (
              <span
                key={hashtag.hashtagId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/20 text-accent border border-accent/30 text-sm font-medium"
              >
                <IoPricetagsOutline size={14} />
              {hashtag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveHashtag(hashtag.hashtagId)}
                  className="ml-1 hover:bg-accent/30 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${hashtag.name}`}
                  title="Remove hashtag (changes will be saved when you click 'Update')"
                >
                  <IoClose size={14} />
                </button>
              )}
              </span>
            ))
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={handleInputFocus}
          placeholder="Search or add hashtags..."
          disabled={disabled}
          className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Dropdown with search results */}
        {showDropdown && !disabled && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-background border border-text-secondary/20 rounded-md shadow-xl max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                Searching...
              </div>
            ) : hashtags.length > 0 ? (
              <div className="py-1">
                {hashtags.map((hashtag) => (
                  <button
                    key={hashtag.hashtagId}
                    type="button"
                    onClick={() => handleSelectHashtag(hashtag)}
                    className="w-full text-left px-4 py-2 hover:bg-text-secondary/10 text-foreground transition-colors flex items-center gap-2"
                  >
                    <IoPricetagsOutline size={16} className="text-accent" />
                    <span className="flex-1">{hashtag.name}</span>
                  </button>
                ))}
              </div>
            ) : searchTerm.trim() ? (
              <div className="p-4 text-center text-text-secondary text-sm">
                <p>No hashtags found for &quot;{searchTerm}&quot;</p>
                <p className="mt-1 text-xs">Create a new hashtag in Hashtag Management</p>
              </div>
            ) : (
              <div className="p-4 text-center text-text-secondary text-sm">
                Start typing to search for hashtags...
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-text-secondary">
        Search existing hashtags or create new ones in Hashtag Management
      </p>
    </div>
  );
}

