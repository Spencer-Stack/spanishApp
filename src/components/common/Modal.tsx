import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ onClose, children, width = 480 }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-neutral-950/30 pt-[10vh] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="animate-slide-up max-h-[78vh] overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0 shadow-xl"
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-neutral-150 px-5 py-4">
      <h2 className="text-[13px] font-semibold text-neutral-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[12px] text-neutral-500">{subtitle}</p>}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-neutral-150 px-5 py-3.5">
      {children}
    </div>
  );
}
