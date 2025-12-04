'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PasswordModal } from '@/components/common/PasswordModal';

const SESSION_STORAGE_KEY = 'admin_auth_verified';
const PASSWORD_VERIFY_ENDPOINT = '/api/blog/verify-password';

/**
 * Admin Layout Component
 * 
 * This layout protects all routes under /admin/* by requiring password verification.
 * The authentication state is stored in sessionStorage (tab-level only).
 * 
 * Features:
 * - Automatic password modal on /admin routes
 * - Tab-level session storage (clears on tab close)
 * - Works with both direct navigation and client-side routing
 * - Redirects to home if user closes modal without authenticating
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [verificationJustSucceeded, setVerificationJustSucceeded] = useState(false);

  // Check if current path is an admin route
  const isAdminRoute = pathname?.startsWith('/admin') ?? false;

  // Check authentication status from sessionStorage
  useEffect(() => {
    // Only check auth if we're on an admin route
    if (!isAdminRoute) {
      setIsCheckingAuth(false);
      setIsAuthenticated(false);
      setShowPasswordModal(false);
      return;
    }

    // Check sessionStorage for authentication
    const checkAuth = () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          setIsAuthenticated(false);
          setShowPasswordModal(true);
          setIsCheckingAuth(false);
          return;
        }

        const authState = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (authState === 'true') {
          setIsAuthenticated(true);
          setShowPasswordModal(false);
        } else {
          setIsAuthenticated(false);
          setShowPasswordModal(true);
        }
      } catch (error) {
        // If sessionStorage is not available (e.g., private browsing), show modal
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setShowPasswordModal(true);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Small delay to ensure we're in browser context
    if (typeof window !== 'undefined') {
      checkAuth();
    } else {
      setIsCheckingAuth(false);
    }
  }, [pathname, isAdminRoute]);

  // Handle password verification
  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch(PASSWORD_VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store authentication state in sessionStorage
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
          }
          // Mark that verification just succeeded before closing modal
          setVerificationJustSucceeded(true);
          setIsAuthenticated(true);
          setShowPasswordModal(false);
          // Reset the flag after a short delay to allow modal to close
          setTimeout(() => {
            setVerificationJustSucceeded(false);
          }, 100);
          return true;
        } catch (storageError) {
          console.error('Error storing authentication:', storageError);
          // Still return true if password was correct, even if storage failed
          setVerificationJustSucceeded(true);
          setIsAuthenticated(true);
          setShowPasswordModal(false);
          setTimeout(() => {
            setVerificationJustSucceeded(false);
          }, 100);
          return true;
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  // Handle modal close - redirect away from admin if not authenticated
  // But don't redirect if verification just succeeded (user should stay on admin page)
  const handleCloseModal = () => {
    // If verification just succeeded, don't redirect - user should stay on admin page
    if (verificationJustSucceeded) {
      setShowPasswordModal(false);
      return;
    }

    // Check sessionStorage directly as source of truth (avoids race condition with state)
    const isAuthInStorage = typeof window !== 'undefined' 
      ? sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true'
      : false;

    // Only redirect if user explicitly cancelled (not authenticated in storage)
    if (!isAuthInStorage && isAdminRoute) {
      // Redirect to home page if user closes modal without authenticating
      router.push('/');
    } else {
      setShowPasswordModal(false);
    }
  };

  // Show loading state while checking authentication (only on admin routes)
  if (isCheckingAuth && isAdminRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-text-secondary">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show password modal if not authenticated on admin routes
  if (isAdminRoute && !isAuthenticated) {
    return (
      <>
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={handleCloseModal}
          onVerify={handleVerifyPassword}
          title="Admin Access Required"
          message="Please enter the password to access the admin panel"
        />
        {/* Show blank screen behind modal when not authenticated */}
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center">
            <p className="text-text-secondary">Authentication required</p>
          </div>
        </div>
      </>
    );
  }

  // Render children if authenticated or not an admin route
  return <>{children}</>;
}

