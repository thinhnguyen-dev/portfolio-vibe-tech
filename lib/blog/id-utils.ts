/**
 * Shared utility functions for generating consistent IDs for blog headings
 */

import React from 'react';

/**
 * Extract plain text content from React children, excluding specific element types
 * This extracts text from React elements that react-markdown has already processed
 */
export function extractTextFromReactChildren(children: React.ReactNode): string {
  const plainText = React.Children.toArray(children)
    .filter((child) => {
      // Filter out span elements (like the # symbol)
      if (React.isValidElement(child) && child.type === 'span') {
        return false;
      }
      return true;
    })
    .map((child) => {
      if (typeof child === 'string') {
        return child;
      }
      if (React.isValidElement(child)) {
        const props = child.props as { children?: React.ReactNode };
        if (props?.children) {
          return extractTextFromReactChildren(props.children);
        }
      }
      return '';
    })
    .join('')
    .trim();
  
  // Normalize the text (remove any potential markdown artifacts, normalize whitespace)
  return plainText.replace(/\s+/g, ' ').trim();
}

/**
 * Extract plain text from markdown header text (removes markdown formatting)
 */
export function extractTextFromMarkdown(text: string): string {
  // Remove markdown formatting like **bold**, *italic*, [links](url), etc.
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold: **text**
    .replace(/\*([^*]+)\*/g, '$1') // Italic: *text*
    .replace(/__([^_]+)__/g, '$1') // Bold: __text__
    .replace(/_([^_]+)_/g, '$1') // Italic: _text_
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links: [text](url)
    .replace(/`([^`]+)`/g, '$1') // Inline code: `code`
    .trim();
}

/**
 * Generate a URL-safe ID from text
 * This function normalizes text to create consistent IDs for headings
 * Works with both plain text and text that may contain markdown formatting
 */
export function generateHeadingId(text: string): string {
  // If text might contain markdown formatting, strip it first
  // (this handles both markdown strings and already-plain strings)
  const plainText = extractTextFromMarkdown(text);
  
  // Generate base ID: lowercase, replace spaces with hyphens, remove special chars
  const baseId = plainText
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();

  return baseId || 'heading'; // Fallback if text becomes empty after processing
}

/**
 * Extract headers from markdown content, excluding headers inside code blocks, blockquotes, etc.
 * Returns an array of { level, text } objects for root-level headers only.
 */
export function extractHeadersFromMarkdown(content: string): Array<{ level: number; text: string }> {
  if (!content) return [];

  const lines = content.split('\n');
  const headers: Array<{ level: number; text: string }> = [];
  
  let inCodeBlock = false;
  let codeBlockFence = ''; // Track the fence type (``` or ~~~)
  let inBlockquote = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for code block fences (``` or ~~~)
    const codeBlockMatch = trimmedLine.match(/^(```+|~~~+)/);
    if (codeBlockMatch) {
      const fence = codeBlockMatch[1];
      if (inCodeBlock && fence === codeBlockFence) {
        // Closing fence - exit code block
        inCodeBlock = false;
        codeBlockFence = '';
      } else if (!inCodeBlock) {
        // Opening fence - enter code block
        inCodeBlock = true;
        codeBlockFence = fence;
      }
      continue;
    }
    
    // Skip if inside a code block
    if (inCodeBlock) {
      continue;
    }
    
    // Check for blockquote (lines starting with >)
    // Blockquotes start with > and can continue with lazy continuation (just >)
    const isBlockquoteLine = trimmedLine.startsWith('>');
    if (isBlockquoteLine) {
      inBlockquote = true;
      continue;
    }
    
    // Blockquote ends when we encounter a non-blockquote, non-empty line
    // Empty lines inside blockquotes are still part of the blockquote (lazy continuation)
    if (inBlockquote) {
      if (trimmedLine === '') {
        // Empty line - continue blockquote (lazy continuation)
        continue;
      } else {
        // Non-empty, non-blockquote line ends the blockquote
        inBlockquote = false;
      }
    }
    
    // Skip if inside a blockquote
    if (inBlockquote) {
      continue;
    }
    
    // Match headers: # Header, ## Header, ### Header, etc.
    // Must be at the start of the line (after trimming)
    const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const rawText = headerMatch[2].trim();
      
      // Only include h1, h2, h3
      if (level <= 3) {
        headers.push({
          level,
          text: rawText,
        });
      }
    }
  }
  
  return headers;
}

/**
 * Generate unique IDs with duplicate handling
 * Use this when you need to track and handle duplicate IDs
 */
export class HeadingIdGenerator {
  private idCounts = new Map<string, number>();

  generate(text: string): string {
    const baseId = generateHeadingId(text);
    
    // Handle duplicate IDs by appending a counter
    const count = this.idCounts.get(baseId) || 0;
    this.idCounts.set(baseId, count + 1);
    
    return count > 0 ? `${baseId}-${count}` : baseId;
  }

  reset(): void {
    this.idCounts.clear();
  }
}

