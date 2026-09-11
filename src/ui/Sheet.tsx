'use client';

import { useEffect, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Bottom sheet on a phone, centred dialog on a wide screen. Escape and the backdrop
 * close it; the sheet traps nothing else, because the picker behind it stays reachable.
 */
export function Sheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid="sheet-backdrop"
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="false"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="row row-between">
          <h2>{title}</h2>
          <button className="btn btn-quiet" onClick={onClose} data-testid="sheet-close">
            ×
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
