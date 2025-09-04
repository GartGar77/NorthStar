
import React from 'react';

// FIX: Extend CardProps with React.HTMLAttributes<HTMLDivElement> to allow passing down standard DOM props like onClick.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}

// FIX: Destructure `...props` and spread them onto the root div element.
const Card: React.FC<CardProps> = ({ title, children, className = '', actions, footer, ...props }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden ${className}`} {...props}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
