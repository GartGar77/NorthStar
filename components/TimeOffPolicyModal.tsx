import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { TimeOffPolicy } from '../types';
import { AccrualMethod, Province, CarryoverTiming } from '../types';
import Checkbox from './ui/Checkbox';

interface TimeOffPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (policy: TimeOffPolicy) => void;
  policyToEdit?: TimeOffPolicy | null;
}

const emptyPolicy: TimeOffPolicy = {
  id: '',
  name: '',
  jurisdiction: { country: 'Canada', provinceOrState: Province.ON },
  accrualMethod: AccrualMethod.Annual,
  accrualRate: 80,
  carryoverLimit: 0,
  isPaid: true,
  carryoverTiming: CarryoverTiming.CalendarYearEnd,
  customCarryoverDate: '',
  isVacationPolicy: false,
  vacationPayAccrualPercent: 0,
};

const TimeOffPolicyModal: React.FC<TimeOffPolicyModalProps> = ({ isOpen, onClose, onSave, policyToEdit }) => {
  const [policy, setPolicy] = useState<TimeOffPolicy>(emptyPolicy);

  useEffect(() => {
    setPolicy(policyToEdit || emptyPolicy);
  }, [policyToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const { checked } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
        setPolicy(p => ({ ...p, [name]: checked }));
    } else if (name === 'isPaid') {
      setPolicy(p => ({ ...p, isPaid: value === 'true' }));
    } else if (name === 'accrualRate' || name === 'carryoverLimit' || name === 'vacationPayAccrualPercent') {
      setPolicy(p => ({ ...p, [name]: Number(value) }));
    } else {
      setPolicy(p => ({ ...p, [name]: value }));
    }
  };
  
  const handleJurisdictionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPolicy(p => ({
        ...p,
        jurisdiction: {
            ...p.jurisdiction,
            [name]: value,
        }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(policy);
  };

  const isUnlimited = policy.accrualMethod === AccrualMethod.Unlimited;
  const provinces = Object.values(Province);
  const usStates = ["Alabama", "Alaska", "California", "Texas", "New York"]; // Abridged for demo

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={policy.id ? 'Edit Time Off Policy' : 'Create New Time Off Policy'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit}>Save Policy</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Policy Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={policy.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
            placeholder="e.g., Vacation, Sick Leave"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                <select id="country" name="country" value={policy.jurisdiction.country} onChange={handleJurisdictionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                    <option>Canada</option>
                    <option>USA</option>
                </select>
            </div>
             <div>
                <label htmlFor="provinceOrState" className="block text-sm font-medium text-gray-700">
                    {policy.jurisdiction.country === 'Canada' ? 'Province' : 'State'}
                </label>
                <select id="provinceOrState" name="provinceOrState" value={policy.jurisdiction.provinceOrState} onChange={handleJurisdictionChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                    {(policy.jurisdiction.country === 'Canada' ? provinces : usStates).map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>
            </div>
        </div>

        <div>
            <label htmlFor="accrualMethod" className="block text-sm font-medium text-gray-700">Accrual Method</label>
            <select name="accrualMethod" id="accrualMethod" value={policy.accrualMethod} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                {Object.values(AccrualMethod).map(method => <option key={method} value={method}>{method}</option>)}
            </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="accrualRate" className="block text-sm font-medium text-gray-700">Accrual Rate (Hours)</label>
                <input
                    type="number"
                    name="accrualRate"
                    id="accrualRate"
                    value={policy.accrualRate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100"
                    disabled={isUnlimited}
                />
                 <p className="mt-1 text-xs text-gray-500">Hours earned per year or pay period.</p>
            </div>
            <div>
                <label htmlFor="carryoverLimit" className="block text-sm font-medium text-gray-700">Carryover Limit (Hours)</label>
                <input
                    type="number"
                    name="carryoverLimit"
                    id="carryoverLimit"
                    value={policy.carryoverLimit}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm disabled:bg-gray-100"
                    disabled={isUnlimited}
                />
                 <p className="mt-1 text-xs text-gray-500">Max hours to carry over to next year.</p>
            </div>
        </div>
        
        <div className="pt-4 border-t mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label htmlFor="carryoverTiming" className="block text-sm font-medium text-gray-700">Carryover Timing</label>
                <select name="carryoverTiming" id="carryoverTiming" value={policy.carryoverTiming} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                    {Object.values(CarryoverTiming).map(timing => <option key={timing} value={timing}>{timing}</option>)}
                </select>
            </div>
            {policy.carryoverTiming === CarryoverTiming.CustomDate && (
                 <div>
                    <label htmlFor="customCarryoverDate" className="block text-sm font-medium text-gray-700">Custom Carryover Date</label>
                    <input
                        type="text"
                        name="customCarryoverDate"
                        id="customCarryoverDate"
                        value={policy.customCarryoverDate}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="MM-DD"
                    />
                     <p className="mt-1 text-xs text-gray-500">Date for carryover to occur.</p>
                </div>
            )}
        </div>


        <div>
            <label className="block text-sm font-medium text-gray-700">Leave Type</label>
             <fieldset className="mt-2">
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input id="paid" name="isPaid" type="radio" value="true" checked={policy.isPaid === true} onChange={handleChange} className="h-4 w-4 border-gray-300 text-brand-primary focus:ring-brand-primary" />
                    <label htmlFor="paid" className="ml-2 block text-sm text-gray-900">Paid</label>
                  </div>
                   <div className="flex items-center">
                    <input id="unpaid" name="isPaid" type="radio" value="false" checked={policy.isPaid === false} onChange={handleChange} className="h-4 w-4 border-gray-300 text-brand-primary focus:ring-brand-primary" />
                    <label htmlFor="unpaid" className="ml-2 block text-sm text-gray-900">Unpaid</label>
                  </div>
                </div>
            </fieldset>
        </div>
        
        <div className="pt-4 border-t mt-4 space-y-4">
            <Checkbox
                name="isVacationPolicy"
                label="This is a primary vacation policy"
                checked={policy.isVacationPolicy || false}
                onChange={handleChange}
            />
            {policy.isVacationPolicy && (
                <div className="pl-6">
                    <label htmlFor="vacationPayAccrualPercent" className="block text-sm font-medium text-gray-700">Vacation Pay Accrual Rate (%)</label>
                    <input
                        type="number"
                        name="vacationPayAccrualPercent"
                        id="vacationPayAccrualPercent"
                        value={policy.vacationPayAccrualPercent}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">e.g., 4% for 2 weeks, 6% for 3 weeks of vacation entitlement.</p>
                </div>
            )}
        </div>

      </form>
    </Modal>
  );
};

export default TimeOffPolicyModal;