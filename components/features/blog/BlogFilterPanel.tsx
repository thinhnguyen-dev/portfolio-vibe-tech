'use client';

import { HashtagFilter } from './HashtagFilter';

interface BlogFilterPanelProps {
  selectedHashtagIds: string[];
  filterNoHashtags: boolean;
  onHashtagFilterChange: (hashtagIds: string[]) => void;
  onNoHashtagsFilterToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function BlogFilterPanel({
  selectedHashtagIds,
  filterNoHashtags,
  onHashtagFilterChange,
  onNoHashtagsFilterToggle,
  disabled = false,
  className = '',
}: BlogFilterPanelProps) {
  return (
    <div className={`mb-6 p-4 bg-background border border-text-secondary/20 rounded-lg space-y-4 ${className}`}>
      <HashtagFilter
        selectedHashtagIds={selectedHashtagIds}
        onChange={onHashtagFilterChange}
        disabled={filterNoHashtags || disabled}
      />
      
      {/* No Hashtags Filter Toggle */}
      <div className="flex items-center gap-2 pt-2 border-t border-text-secondary/20">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterNoHashtags}
            onChange={onNoHashtagsFilterToggle}
            disabled={disabled}
            className="w-4 h-4 rounded border-text-secondary/20 text-accent focus:ring-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-foreground">
            Show only blogs with no hashtags
          </span>
        </label>
      </div>
    </div>
  );
}

