import fs from 'fs';
import path from 'path';

const blogDirectory = path.join(process.cwd(), 'content/blog');

export interface BlogPostMetadata {
  slug: string;
  title: string;
  excerpt: string;
  date?: string;
  tags?: string[];
  image?: string;
  blogId?: string; // Optional UUID for unique identification
  category?: string; // Optional category for grouping blog posts
  hashtagIds?: string[]; // Array of hashtag IDs for fetching hashtag names
}

export function getAllBlogSlugs(): string[] {
  if (!fs.existsSync(blogDirectory)) {
    return [];
  }
  
  return fs.readdirSync(blogDirectory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''));
}

export function getBlogPostPath(slug: string): string | null {
  const filePath = path.join(blogDirectory, `${slug}.md`);
  return fs.existsSync(filePath) ? filePath : null;
}

export function getBlogPostMetadata(slug: string): BlogPostMetadata {
  const filePath = getBlogPostPath(slug);
  if (!filePath) {
    return {
      slug,
      title: slug,
      excerpt: '',
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract metadata from frontmatter if present
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  let title: string = slug;
  let excerpt: string = '';
  let date: string | undefined;
  let tags: string[] | undefined;
  let image: string | undefined;
  let category: string | undefined;
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    
    // Extract title from frontmatter
    const titleMatch = frontmatter.match(/title:\s*(.+)/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Extract description from frontmatter
    const descriptionMatch = frontmatter.match(/description:\s*(.+)/);
    if (descriptionMatch) {
      excerpt = descriptionMatch[1].trim();
    }
    
    const dateMatch = frontmatter.match(/date:\s*(.+)/);
    if (dateMatch) {
      date = dateMatch[1].trim();
    }
    
    const tagsMatch = frontmatter.match(/tags:\s*(.+)/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map(tag => tag.trim());
    }
    
    const imageMatch = frontmatter.match(/image:\s*(.+)/);
    if (imageMatch) {
      image = imageMatch[1].trim();
    }
    
    const categoryMatch = frontmatter.match(/category:\s*(.+)/);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
    }
  }
  
  // If no title from frontmatter, extract from first h1 or use slug
  if (title === slug) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    }
  }

  // If no excerpt from frontmatter, extract from content
  if (!excerpt) {
    // Remove frontmatter for content extraction
    const contentWithoutFrontmatter = frontmatterMatch 
      ? content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
      : content;
    
    // Extract excerpt (first paragraph or first 150 characters)
    const excerptMatch = contentWithoutFrontmatter.match(/^[^#\n]+/m);
    excerpt = excerptMatch ? excerptMatch[0].trim() : '';
    if (excerpt.length > 150) {
      excerpt = excerpt.substring(0, 150) + '...';
    }
  }

  return {
    slug,
    title,
    excerpt: excerpt || 'No description available.',
    date,
    tags,
    image: image || '/default_blog_img.png',
    category,
  };
}

export function getAllBlogPosts(): BlogPostMetadata[] {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => getBlogPostMetadata(slug));
}

