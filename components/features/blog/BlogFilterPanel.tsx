'use client';

import { HashtagFilter } from './HashtagFilter';

interface BlogFilterPanelProps {
  selectedHashtagIds: string[];
  filterNoHashtags: boolean;
  onHashtagFilterChange: (hashtagIds: string[]) => void;
  onNoHashtagsFilterToggle: () => void;
  selectedLanguage: 'vi' | 'en';
  onLanguageChange: (language: 'vi' | 'en') => void;
  disabled?: boolean;
  className?: string;
}

export function BlogFilterPanel({
  selectedHashtagIds,
  filterNoHashtags,
  onHashtagFilterChange,
  onNoHashtagsFilterToggle,
  selectedLanguage,
  onLanguageChange,
  disabled = false,
  className = '',
}: BlogFilterPanelProps) {
  return (
    <div className={`mb-6 p-4 bg-background border border-text-secondary/20 rounded-lg space-y-4 ${className}`}>
      {/* Language Filter - Required, no "All" option */}
      <div className="flex flex-col gap-2 pb-2 border-b border-text-secondary/20">
        <label className="text-sm font-medium text-foreground">Language <span className="text-text-secondary text-xs">(required)</span></label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="language-filter"
              value="vi"
              checked={selectedLanguage === 'vi'}
              onChange={() => onLanguageChange('vi')}
              disabled={disabled}
              className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-foreground">Vietnamese (vi)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="language-filter"
              value="en"
              checked={selectedLanguage === 'en'}
              onChange={() => onLanguageChange('en')}
              disabled={disabled}
              className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-foreground">English (en)</span>
          </label>
        </div>
      </div>

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

