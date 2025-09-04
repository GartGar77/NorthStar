import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => {
  const id = props.id || `checkbox-${label.replace(/\s+/g, '-')}`;
  return (
    <div className="relative flex items-start">
      <div className="flex h-5 items-center">
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={id} className="font-medium text-gray-700 cursor-pointer">
          {label}
        </label>
      </div>
    </div>
  );
};

export default Checkbox;
