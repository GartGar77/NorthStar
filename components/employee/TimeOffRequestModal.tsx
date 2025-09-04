import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { TimeOffPolicy, TimeOffRequest } from '../../types';
import { TimeOffRequestUnit } from '../../types';

interface TimeOffRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TimeOffRequest, 'id' | 'status' | 'employeeId'>) => void;
  availablePolicies: TimeOffPolicy[];
}

const TimeOffRequestModal: React.FC<TimeOffRequestModalProps> = ({ isOpen, onClose, onSubmit, availablePolicies }) => {
  const [policyId, setPolicyId] = useState<string>(availablePolicies[0]?.id || '');
  const [unit, setUnit] = useState<TimeOffRequestUnit>(TimeOffRequestUnit.Days);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!policyId || !startDate) {
      setError("Please fill out all required fields.");
      return;
    }

    let requestData: Omit<TimeOffRequest, 'id' | 'status' | 'employeeId'>;
    
    if (unit === TimeOffRequestUnit.Days) {
        if (new Date(endDate) < new Date(startDate)) {
            setError("End date cannot be before the start date.");
            return;
        }
        requestData = { policyId, startDate, endDate, notes, unit, hours: undefined };
    } else { // Hours
        if (hours <= 0 || hours > 24) {
            setError("Please enter a valid number of hours (0.25-24).");
            return;
        }
        requestData = { policyId, startDate: startDate, endDate: startDate, notes, unit, hours };
    }

    onSubmit(requestData);
  };
  
  if (availablePolicies.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Request Time Off"
        footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
      >
        <div className="text-center p-4">
          <p className="text-lg font-semibold text-slate-800">No Time Off Policies Assigned</p>
          <p className="mt-2 text-slate-600">You do not have any time off policies assigned to your profile. Please contact your manager or HR department for assistance.</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Time Off"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" onClick={handleSubmit}>Submit Request</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
        
        <div>
          <label htmlFor="policyId" className="block text-sm font-medium text-gray-700">Leave Type</label>
          <select
            id="policyId"
            value={policyId}
            onChange={e => setPolicyId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
            required
          >
            {availablePolicies.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Request In</label>
          <div className="mt-1 grid grid-cols-2 gap-x-1 rounded-lg bg-gray-200 p-1">
            {(Object.values(TimeOffRequestUnit)).map((unitValue) => (
              <button
                key={unitValue}
                type="button"
                onClick={() => setUnit(unitValue)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${unit === unitValue ? 'bg-white shadow text-brand-primary' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {unitValue}
              </button>
            ))}
          </div>
        </div>

        {unit === TimeOffRequestUnit.Days ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                required
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="requestDate" className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                id="requestDate"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setEndDate(e.target.value); // Keep them in sync for hourly
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700">Hours</label>
              <input
                type="number"
                id="hours"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                required
              />
            </div>
          </div>
        )}
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
            placeholder="e.g., Family vacation"
          />
        </div>

      </form>
    </Modal>
  );
};

export default TimeOffRequestModal;
