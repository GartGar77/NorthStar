import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { ArrowPathIcon, CheckCircleIcon } from '../icons/Icons';
import type { Employee, Paystub, SuperAdmin, EmployeeProfile, PaystubItem } from '../../types';
import { EarningType } from '../../types';
import { calculateEmployeePayroll } from '../../services/geminiService';
import { processOnDemandPay } from '../../services/api';

interface OnDemandPayModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    session: { user: Employee | SuperAdmin; tenantId: string };
    onSuccess: () => void;
}

type Step = 'select' | 'amount' | 'preview' | 'processing' | 'success';

const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    return employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0].profile;
};

const OnDemandPayModal: React.FC<OnDemandPayModalProps> = ({ isOpen, onClose, employees, session, onSuccess }) => {
    const [step, setStep] = useState<Step>('select');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [payoutAmount, setPayoutAmount] = useState<number | ''>('');
    const [earnedWages, setEarnedWages] = useState({ gross: 0, maxPayout: 0 });
    const [previewData, setPreviewData] = useState<Omit<Paystub, 'employeeName' | 'payPeriod' | 'employeeId' | 'earnings'> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedEmployee = useMemo(() => {
        return employees.find(e => e.id === Number(selectedEmployeeId));
    }, [selectedEmployeeId, employees]);

    useEffect(() => {
        if (!selectedEmployee) {
            setEarnedWages({ gross: 0, maxPayout: 0 });
            return;
        }

        // --- Simplified Earned Wage Calculation ---
        // Assumption: Current pay period is July 1-15, 2024. Today is July 10.
        const daysInPeriod = 15;
        const daysElapsed = 10;
        const periodFraction = daysElapsed / daysInPeriod;

        const profile = getCurrentProfile(selectedEmployee);
        const payPeriodsPerYear = { 'Weekly': 52, 'Bi-Weekly': 26, 'Semi-Monthly': 24, 'Monthly': 12 };
        const basePayForPeriod = profile.annualSalary / payPeriodsPerYear[selectedEmployee.payFrequency];
        
        const estimatedEarnedGross = basePayForPeriod * periodFraction;
        const maxPayout = estimatedEarnedGross * 0.50; // Company policy: 50% max payout

        setEarnedWages({ gross: estimatedEarnedGross, maxPayout });

    }, [selectedEmployee]);

    const handleNext = () => {
        setError(null);
        if (step === 'select' && selectedEmployee) {
            setStep('amount');
        } else if (step === 'amount') {
            if (payoutAmount === '' || payoutAmount <= 0) {
                setError('Please enter a valid payout amount.');
                return;
            }
            if (payoutAmount > earnedWages.maxPayout) {
                setError(`Amount cannot exceed the maximum available payout of $${earnedWages.maxPayout.toFixed(2)}.`);
                return;
            }
            handlePreview();
        }
    };
    
    const handleBack = () => {
        setError(null);
        if (step === 'amount') setStep('select');
        if (step === 'preview') setStep('amount');
    }

    const handlePreview = async () => {
        if (!selectedEmployee || !payoutAmount) return;
        setStep('processing');
        setPreviewData(null);
        setError(null);
        
        try {
            const profile = getCurrentProfile(selectedEmployee);
            const earnings: PaystubItem[] = [{
                type: EarningType.Bonus,
                description: 'On-Demand Wage Advance',
                amount: payoutAmount,
                codeId: 'bonus-disc'
            }];

            const result = await calculateEmployeePayroll(
                { ...selectedEmployee, ...profile },
                "Off-Cycle Advance",
                earnings,
                [], [], { earningCodes: [], deductionCodes: [] },
                0, // No vacation accrual on an advance
                'accrue' // Default payout method, won't be used since rate is 0
            );
            setPreviewData(result);
            setStep('preview');
        } catch(e: any) {
            setError(`Failed to calculate preview: ${e.message}`);
            setStep('amount');
        }
    };

    const handleConfirm = async () => {
        if (!selectedEmployee || !payoutAmount) return;
        setStep('processing');
        setError(null);

        try {
            await processOnDemandPay(selectedEmployee.id, payoutAmount, session.tenantId);
            setStep('success');
            onSuccess(); // Notify parent to refresh data
        } catch(e: any) {
            setError(`Failed to process payment: ${e.message}`);
            setStep('preview');
        }
    };
    
    const handleClose = () => {
        // Reset state for next time
        setStep('select');
        setSelectedEmployeeId('');
        setPayoutAmount('');
        setEarnedWages({ gross: 0, maxPayout: 0 });
        setPreviewData(null);
        setError(null);
        onClose();
    };

    const renderContent = () => {
        switch (step) {
            case 'select':
                return (
                    <div>
                        <label htmlFor="employee-select" className="block text-sm font-medium text-slate-700">Select Employee</label>
                        <select id="employee-select" value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300">
                            <option value="" disabled>Choose an employee...</option>
                            {employees.map(emp => <option key={emp.id} value={emp.id}>{getCurrentProfile(emp).name}</option>)}
                        </select>
                    </div>
                );
            case 'amount':
                return (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg text-center">
                            <p className="text-sm text-slate-500">Estimated Earned Wages to Date</p>
                            <p className="text-3xl font-bold text-slate-800">${earnedWages.gross.toFixed(2)}</p>
                        </div>
                         <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <p className="text-sm text-blue-700">Maximum Payout Available (50%)</p>
                            <p className="text-3xl font-bold text-blue-800">${earnedWages.maxPayout.toFixed(2)}</p>
                        </div>
                        <div>
                            <label htmlFor="payoutAmount" className="block text-sm font-medium text-slate-700">Payout Amount</label>
                            <div className="relative mt-1">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-slate-500">$</span></div>
                                <input type="number" id="payoutAmount" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value === '' ? '' : Number(e.target.value))} className="block w-full rounded-md border-slate-300 pl-7" placeholder="0.00" />
                            </div>
                        </div>
                    </div>
                );
            case 'preview':
                if (!previewData || !selectedEmployee) return null;
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-center">Please review the on-demand payment for <span className="font-semibold">{getCurrentProfile(selectedEmployee).name}</span>.</p>
                        <div className="p-4 border rounded-lg bg-slate-50">
                            <div className="flex justify-between font-bold"><p>Gross Advance</p><p>${payoutAmount && payoutAmount.toFixed(2)}</p></div>
                            <div className="border-t my-2"></div>
                            {previewData.deductions.map((d, i) => (
                                <div key={i} className="flex justify-between text-sm"><p className="text-slate-600">{d.description}</p><p className="text-slate-600">- ${d.amount.toFixed(2)}</p></div>
                            ))}
                            <div className="border-t my-2"></div>
                            <div className="flex justify-between font-bold text-lg"><p>Net Payment</p><p className="text-green-600">${previewData.netPay.toFixed(2)}</p></div>
                        </div>
                        <p className="text-xs text-center text-slate-500 bg-yellow-50 p-2 rounded-md">Note: The gross advance amount of ${payoutAmount && payoutAmount.toFixed(2)} will be deducted from the employee's next regular paycheck.</p>
                    </div>
                );
            case 'processing':
                return <div className="text-center py-12"><ArrowPathIcon className="h-8 w-8 text-brand-primary animate-spin mx-auto" /><p className="mt-4 text-slate-600">Processing payment...</p></div>;
            case 'success':
                 return (
                    <div className="text-center py-12">
                        <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
                        <h3 className="mt-4 text-xl font-medium text-slate-900">Payment Processed</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            An on-demand payment of <span className="font-semibold">${previewData?.netPay.toFixed(2)}</span> has been issued to <span className="font-semibold">{selectedEmployee && getCurrentProfile(selectedEmployee).name}</span>.
                        </p>
                        <p className="mt-1 text-xs text-slate-500">A repayment deduction has been scheduled for their next payroll.</p>
                    </div>
                );
        }
    }

    const renderFooter = () => {
        switch(step) {
            case 'select':
                return <><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button variant="primary" disabled={!selectedEmployeeId} onClick={handleNext}>Next</Button></>;
            case 'amount':
                return <><Button variant="secondary" onClick={handleBack}>Back</Button><Button variant="primary" onClick={handleNext}>Preview Payment</Button></>;
            case 'preview':
                 return <><Button variant="secondary" onClick={handleBack}>Back</Button><Button variant="primary" onClick={handleConfirm}>Confirm & Process</Button></>;
            case 'processing':
                return null;
            case 'success':
                return <Button variant="primary" onClick={handleClose}>Done</Button>;
        }
    }

    const getTitle = () => {
        if (step === 'success') return 'Success';
        if (step === 'preview') return 'Confirm Payment';
        return 'Run On-Demand Payroll';
    }


    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={getTitle()} footer={renderFooter()}>
             <div className="space-y-4">
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</div>}
                {renderContent()}
            </div>
        </Modal>
    );
};

export default OnDemandPayModal;