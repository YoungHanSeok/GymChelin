import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative w-full max-w-md rounded bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="닫기"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}
