'use client';

import { useEffect, useRef } from 'react';

interface MarkdownContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
}

export default function MarkdownContextMenu({
  x,
  y,
  onClose,
  onBold,
  onItalic,
  onUnderline,
}: MarkdownContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 min-w-[120px]"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        zIndex: 9999
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onBold();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <span className="font-bold">B</span>
        <span>Bold</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onItalic();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <span className="italic">I</span>
        <span>Italic</span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onUnderline();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <span className="underline">U</span>
        <span>Underline</span>
      </button>
    </div>
  );
}

