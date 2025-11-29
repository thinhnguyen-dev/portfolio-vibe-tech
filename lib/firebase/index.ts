// Export all Firebase utilities and services
export {
  initializeFirebase,
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  getFirebaseStorage,
  getFirebaseConfig,
} from './config';

// Export blog-related Firebase utilities
export {
  saveBlogPostMetadata,
  getBlogPostMetadata,
  getAllBlogPostsMetadata,
  getPaginatedBlogPostsMetadata,
  getBlogPostsCount,
  uploadImageToStorage,
  deleteImageFromStorage,
  getBlogThumbnailPath,
  getBlogImagePath,
  uploadBlogImagesToStorage,
  getBlogMarkdownPath,
  uploadMarkdownToStorage,
  downloadMarkdownFromStorage,
  deleteBlogPost,
  type BlogPostFirestoreData,
  type BlogPostMetadata as BlogPostFirestoreMetadata,
} from './blog';

// Re-export Firebase types for convenience
export type { FirebaseApp } from 'firebase/app';
export type { Auth } from 'firebase/auth';
export type { Firestore } from 'firebase/firestore';
export type { FirebaseStorage } from 'firebase/storage';

