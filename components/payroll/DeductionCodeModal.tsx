import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { DeductionCode } from '../../types';
import { DeductionType, DeductionCalculationMethod } from '../../types';

interface DeductionCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (code: DeductionCode) => void;
  deductionToEdit: DeductionCode | null;
}

const emptyDeduction: Omit<DeductionCode, 'id'> = {
  name: '',
  type: DeductionType.PreTax,
  calculationMethod: DeductionCalculationMethod.FixedAmount,
  reducesTaxableIncome: true,
  reducesPensionableEarnings: false,
  reducesInsurableEarnings: false,
};

const DeductionCodeModal: React.FC<DeductionCodeModalProps> = ({ isOpen, onClose, onSave, deductionToEdit }) => {
    const [deduction, setDeduction] = useState<DeductionCode>(deductionToEdit || { ...emptyDeduction, id: '' });

    useEffect(() => {
        setDeduction(deductionToEdit || { ...emptyDeduction, id: '' });
    }, [deductionToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setDeduction(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(deduction);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={deductionToEdit ? 'Edit Deduction Code' : 'Add Deduction Code'}
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit}>Save Deduction</Button>
            </>}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Name</label>
                    <input name="name" value={deduction.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Type</label>
                        <select name="type" value={deduction.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300">
                            <option value={DeductionType.PreTax}>Pre-Tax</option>
                            <option value={DeductionType.PostTax}>Post-Tax</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">Calculation Method</label>
                        <select name="calculationMethod" value={deduction.calculationMethod} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300">
                            <option value={DeductionCalculationMethod.FixedAmount}>Fixed Amount</option>
                            <option value={DeductionCalculationMethod.PercentageOfGross}>% of Gross Pay</option>
                        </select>
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-medium">Calculation Rules</h4>
                    <p className="text-xs text-slate-500">Define how this deduction affects statutory calculation bases.</p>
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center"><input type="checkbox" name="reducesTaxableIncome" checked={deduction.reducesTaxableIncome} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Reduces Taxable Income</label></div>
                        <div className="flex items-center"><input type="checkbox" name="reducesPensionableEarnings" checked={deduction.reducesPensionableEarnings} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Reduces Pensionable (CPP) Earnings</label></div>
                        <div className="flex items-center"><input type="checkbox" name="reducesInsurableEarnings" checked={deduction.reducesInsurableEarnings} onChange={handleChange} className="h-4 w-4 rounded" /><label className="ml-2">Reduces Insurable (EI) Earnings</label></div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default DeductionCodeModal;
