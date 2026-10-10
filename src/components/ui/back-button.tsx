'use client';

/**
 * BackButton — consistent back-navigation control for Engineer Saathi.
 *
 * Usage:
 *   <BackButton onClick={handleBack} />
 *   <BackButton onClick={handleBack} label="Setup" />
 *   <BackButton onClick={handleBack} className="absolute top-4 left-4" />
 *
 * Design contract:
 * - ArrowLeft icon + label ("Back" by default)
 * - Matches the app's dark glassmorphism design tokens
 * - Consistent hover, focus, and disabled states
 * - Never navigates to an external URL or a blank page
 */

import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Called when the user clicks the button. Implement all navigation logic here. */
  onClick: () => void;
  /** Button label. Defaults to "Back". */
  label?: string;
  /** Additional class names for custom positioning. */
  className?: string;
  /** Disable the button (e.g. while saving). */
  disabled?: boolean;
}

export function BackButton({ onClick, label = 'Back', className, disabled }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        // Base
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
        // Colors — subtle ghost style matching the dark glassmorphism palette
        'text-white/60 hover:text-white',
        'bg-transparent hover:bg-white/10',
        'border border-transparent hover:border-white/10',
        // Transitions
        'transition-all duration-150',
        // Focus ring
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-blue-950',
        // Disabled
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/**
 * ExitConfirmDialog — modal guard for destructive navigation out of an active interview.
 *
 * Shows a dialog asking the user to confirm before leaving. The interview
 * continues uninterrupted until the user explicitly confirms.
 */
interface ExitConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmDialog({
  open,
  title = 'Leave interview?',
  description = 'Your progress so far will be saved, but the current active interview session will end.',
  confirmLabel = 'Yes, exit',
  cancelLabel = 'Stay',
  onConfirm,
  onCancel,
}: ExitConfirmDialogProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-blue-950/95 p-6 shadow-2xl backdrop-blur-xl">
        <h2 id="exit-dialog-title" className="text-lg font-bold text-white mb-2">
          {title}
        </h2>
        <p className="text-sm text-white/60 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-500/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
