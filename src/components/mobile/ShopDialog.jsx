import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Native modal supplies focus containment, Escape handling, and an inert page behind it.
export default function ShopDialog({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  return createPortal(<dialog ref={ref} className={`shop-dialog ${className}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="shop-dialog-inner">
      <header className="shop-dialog-heading"><h2>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}><X aria-hidden="true" /></button></header>
      {children}
    </div>
  </dialog>, document.body);
}
