import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { EarningCode } from '../../types';
import { EarningType } from '../../types';

interface EarningCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: EarningCode) => void;
  earningToEdit: EarningCode | null;
}

const emptyEarning: Omit<EarningCode, 'id'> = {
  name: '',
  type: EarningType.Earning,
  isTaxable: true,
  isPensionable: true,
  isInsurable: true,
};

const EarningCodeModal: React.FC<EarningCodeModalProps> = ({ isOpen, onClose, onSave, earningToEdit }) => {
    const [earning, setEarning] = useState<EarningCode>(earningToEdit || { ...emptyEarning, id: '' });

    useEffect(() => {
        setEarning(earningToEdit || { ...emptyEarning, id: '' });
    }, [earningToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setEarning(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(earning);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={earningToEdit ? 'Edit Earning Code' : 'Add Earning Code'}
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit}>Save Earning</Button>
            </>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Name</label>
                    <input name="name" value={earning.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300" required />
                </div>
                <div>
                    <label className="block text-sm font-medium">Type</label>
                    <select name="type" value={earning.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300">
                        <option value={EarningType.Earning}>Earning</option>
                        <option value={EarningType.TaxableBenefit}>Taxable Benefit</option>
                        <option value={EarningType.Reimbursement}>Reimbursement</option>
                    </select>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium">Taxability Rules</h4>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center"><input type="checkbox" name="isTaxable" checked={earning.isTaxable} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Subject to Income Tax</label></div>
                        <div className="flex items-center"><input type="checkbox" name="isPensionable" checked={earning.isPensionable} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Subject to Canada Pension Plan (CPP)</label></div>
                        <div className="flex items-center"><input type="checkbox" name="isInsurable" checked={earning.isInsurable} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Subject to Employment Insurance (EI)</label></div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default EarningCodeModal;