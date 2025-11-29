'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  loading?: boolean;
  requirePassword?: boolean;
  onPasswordVerify?: (password: string) => Promise<boolean>;
  passwordError?: string | null;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  loading = false,
  requirePassword = false,
  onPasswordVerify,
  passwordError: externalPasswordError = null,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setPasswordError(null);
      // Focus password input if required, otherwise focus confirm button
      setTimeout(() => {
        if (requirePassword && passwordInputRef.current) {
          passwordInputRef.current.focus();
        } else if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, requirePassword]);

  useEffect(() => {
    if (externalPasswordError) {
      setPasswordError(externalPasswordError);
    }
  }, [externalPasswordError]);

  const handleConfirm = async () => {
    if (requirePassword && onPasswordVerify) {
      if (!password.trim()) {
        setPasswordError('Password is required');
        passwordInputRef.current?.focus();
        return;
      }

      setVerifying(true);
      setPasswordError(null);

      try {
        const isValid = await onPasswordVerify(password);
        if (isValid) {
          setPassword('');
          onConfirm();
        } else {
          setPasswordError('Invalid password. Please try again.');
          setPassword('');
          passwordInputRef.current?.focus();
        }
      } catch (err) {
        setPasswordError('An error occurred. Please try again.');
      } finally {
        setVerifying(false);
      }
    } else {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !requirePassword) {
      handleConfirm();
    }
  };

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-background border border-text-secondary/20 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
              <p className="text-text-secondary mb-6">{message}</p>
              
              {requirePassword && (
                <div className="mb-6">
                  <label htmlFor="delete-password-input" className="block text-sm font-medium mb-2 text-foreground">
                    Enter Password to Confirm Deletion
                  </label>
                  <input
                    ref={passwordInputRef}
                    id="delete-password-input"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password.trim()) {
                        handleConfirm();
                      }
                    }}
                    className="w-full px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    placeholder="Enter password"
                    disabled={loading || verifying}
                    autoComplete="off"
                  />
                  {(passwordError || externalPasswordError) && (
                    <div className="mt-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                      {passwordError || externalPasswordError}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading || verifying}
                  className="px-4 py-2 border border-text-secondary/20 text-foreground rounded-md hover:bg-text-secondary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading || verifying || (requirePassword && !password.trim())}
                  className={`px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
                >
                  {loading || verifying ? 'Processing...' : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

