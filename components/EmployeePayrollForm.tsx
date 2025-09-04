import React from 'react';
import type { CanadianPayroll } from '../types';

interface EmployeePayrollFormProps {
  payroll: CanadianPayroll;
  onChange: (updatedPayroll: CanadianPayroll) => void;
}

const EmployeePayrollForm: React.FC<EmployeePayrollFormProps> = ({ payroll, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({
      ...payroll,
      [name]: name.startsWith('td1') ? Number(value) : value,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Canadian Payroll Details</h3>
      <div>
        <label htmlFor="sin" className="block text-sm font-medium text-gray-700">Social Insurance Number (SIN)</label>
        <input
          type="text"
          id="sin"
          name="sin"
          value={payroll.sin}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
          placeholder="000-000-000"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="td1Federal" className="block text-sm font-medium text-gray-700">Federal TD1 Amount</label>
          <div className="relative mt-1 rounded-md shadow-sm">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
             </div>
             <input
                type="number"
                name="td1Federal"
                id="td1Federal"
                value={payroll.td1Federal}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                placeholder="0.00"
                required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Federal Personal Tax Credits Amount.</p>
        </div>
        <div>
          <label htmlFor="td1Provincial" className="block text-sm font-medium text-gray-700">Provincial TD1 Amount</label>
           <div className="relative mt-1 rounded-md shadow-sm">
             <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
             </div>
             <input
                type="number"
                name="td1Provincial"
                id="td1Provincial"
                value={payroll.td1Provincial}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                placeholder="0.00"
                required
            />
          </div>
           <p className="mt-1 text-xs text-gray-500">Provincial Personal Tax Credits Amount.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayrollForm;
