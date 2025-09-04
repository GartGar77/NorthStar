
import React from 'react';
import { XMarkIcon } from './icons/XMarkIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-60 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" id="my-modal">
      <div className="relative mx-auto w-full max-w-3xl shadow-lg rounded-xl bg-white">
        <div className="flex justify-between items-start p-5 rounded-t border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            className="text-slate-400 bg-transparent hover:bg-slate-200 hover:text-slate-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            onClick={onClose}
            aria-label="Close modal"
          >
            <XMarkIcon />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end p-5 space-x-2 rounded-b border-t border-slate-200 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;