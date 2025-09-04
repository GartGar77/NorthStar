import React, { useState, useMemo } from 'react';
import type { Employee, EmployeeProfile, CompanySettings, SuperAdmin } from '../../types';
import { calculateStatHolidayPay, calculateVacationPay, calculateOvertimePay } from '../../services/geminiService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { ArrowPathIcon } from '../icons/Icons';

interface PayrollCalculatorsProps {
    employees: Employee[];
    settings: CompanySettings | null;
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    return employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0].profile;
};

const PayrollCalculators: React.FC<PayrollCalculatorsProps> = ({ employees, settings, session }) => {
    const [activeCalculator, setActiveCalculator] = useState<'stat' | 'vacation' | 'overtime'>('stat');

    // Shared state
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Calculator-specific inputs
    const [selectedHolidayDate, setSelectedHolidayDate] = useState<string>('');
    const [vacationHours, setVacationHours] = useState<number | ''>('');
    const [totalHoursWorked, setTotalHoursWorked] = useState<number | ''>('');

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
    const holidays = useMemo(() => settings?.configurations?.statutoryHolidays || [], [settings]);

    const resetState = () => {
        setIsLoading(false);
        setResult(null);
        setError(null);
    };

    const handleCalcSelection = (calc: 'stat' | 'vacation' | 'overtime') => {
        resetState();
        setSelectedEmployeeId('');
        setActiveCalculator(calc);
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            setError('Please select an employee.');
            return;
        }

        const employee = employeeMap.get(Number(selectedEmployeeId));
        if (!employee) {
            setError('Could not find selected employee data.');
            return;
        }
        const profile = getCurrentProfile(employee);

        resetState();
        setIsLoading(true);

        try {
            let res;
            if (activeCalculator === 'stat') {
                if (!selectedHolidayDate) {
                    setError('Please select a holiday.');
                    setIsLoading(false);
                    return;
                }
                const holiday = holidays.find(h => h.date === selectedHolidayDate);
                if (!holiday) {
                     setError('Could not find holiday data.');
                     setIsLoading(false);
                     return;
                }
                res = await calculateStatHolidayPay(profile, holiday);
            } else if (activeCalculator === 'vacation') {
                res = await calculateVacationPay(profile, employee.ytd.grossPay, vacationHours || undefined);
            } else if (activeCalculator === 'overtime') {
                 if (!totalHoursWorked) {
                    setError('Please enter the total hours worked.');
                    setIsLoading(false);
                    return;
                }
                res = await calculateOvertimePay(profile, totalHoursWorked);
            }
            setResult(res);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during calculation.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderCalculator = () => {
        const selectedEmployee = selectedEmployeeId ? employeeMap.get(Number(selectedEmployeeId)) : null;
        const profile = selectedEmployee ? getCurrentProfile(selectedEmployee) : null;
        
        switch (activeCalculator) {
            case 'stat':
                return (
                    <>
                        <p className="text-slate-600 mb-4">Calculate an employee's pay for a statutory holiday based on provincial regulations.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Select Holiday</label>
                                <select value={selectedHolidayDate} onChange={e => setSelectedHolidayDate(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300">
                                    <option value="" disabled>Choose a holiday...</option>
                                    {holidays.map(h => <option key={h.date} value={h.date}>{h.name} ({h.date})</option>)}
                                </select>
                            </div>
                        </div>
                    </>
                );
            case 'vacation':
                 return (
                    <>
                        <p className="text-slate-600 mb-4">Calculate total accrued vacation pay based on YTD earnings, or a specific payout amount for vacation hours taken.</p>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Hours to Pay Out (Optional)</label>
                            <input type="number" value={vacationHours} onChange={e => setVacationHours(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full rounded-md border-slate-300" placeholder="e.g., 40" />
                            <p className="text-xs text-slate-500 mt-1">Leave blank to calculate total accrued vacation pay.</p>
                        </div>
                    </>
                );
            case 'overtime':
                 return (
                    <>
                        <p className="text-slate-600 mb-4">Calculate total gross pay for an hourly employee, including regular and overtime earnings based on provincial thresholds.</p>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Total Hours Worked in Period</label>
                            <input type="number" value={totalHoursWorked} onChange={e => setTotalHoursWorked(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 block w-full rounded-md border-slate-300" placeholder="e.g., 48" disabled={!profile || profile.payType !== 'Hourly'} />
                             {!profile && selectedEmployeeId && <p className="text-xs text-red-500 mt-1">Select an employee first.</p>}
                             {profile && profile.payType !== 'Hourly' && <p className="text-xs text-red-500 mt-1">This calculator is only for hourly employees.</p>}
                        </div>
                    </>
                );
            default:
                return null;
        }
    };
    
    return (
        <Card>
            <div className="flex border-b">
                <button onClick={() => handleCalcSelection('stat')} className={`px-4 py-2 text-sm font-medium ${activeCalculator === 'stat' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Stat Holiday Pay</button>
                <button onClick={() => handleCalcSelection('vacation')} className={`px-4 py-2 text-sm font-medium ${activeCalculator === 'vacation' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Vacation Pay</button>
                <button onClick={() => handleCalcSelection('overtime')} className={`px-4 py-2 text-sm font-medium ${activeCalculator === 'overtime' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Overtime</button>
            </div>

            <form onSubmit={handleSubmit} className="pt-6 space-y-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Select Employee</label>
                    <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300">
                        <option value="" disabled>Choose an employee...</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{getCurrentProfile(emp).name}</option>)}
                    </select>
                </div>
                {renderCalculator()}

                <div className="pt-4 border-t flex justify-end">
                    <Button type="submit" variant="primary" disabled={isLoading || !selectedEmployeeId} icon={isLoading ? <ArrowPathIcon className="animate-spin"/> : null}>
                        {isLoading ? 'Calculating...' : 'Calculate'}
                    </Button>
                </div>
            </form>

            {error && <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>}
            
            {result && (
                <div className="mt-6 pt-4 border-t">
                    <h3 className="text-lg font-semibold text-slate-800">Calculation Result</h3>
                    <div className="mt-4 bg-slate-50 p-4 rounded-lg">
                        {activeCalculator === 'overtime' ? (
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div><p className="text-sm text-slate-500">Regular Pay</p><p className="text-2xl font-bold text-slate-800">${result.regularPay.toFixed(2)}</p></div>
                                <div><p className="text-sm text-slate-500">Overtime Pay</p><p className="text-2xl font-bold text-slate-800">${result.overtimePay.toFixed(2)}</p></div>
                                <div className="bg-brand-light rounded-md p-2"><p className="text-sm text-brand-dark font-semibold">Total Pay</p><p className="text-3xl font-bold text-brand-primary">${result.totalPay.toFixed(2)}</p></div>
                            </div>
                        ) : (
                             <div className="text-center">
                                <p className="text-sm text-slate-500">Calculated Amount</p>
                                <p className="text-4xl font-bold text-brand-primary">${result.amount.toFixed(2)}</p>
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t">
                             <h4 className="font-semibold text-slate-700">Explanation</h4>
                             <div className="prose prose-sm max-w-none mt-2 text-slate-600" dangerouslySetInnerHTML={{ __html: result.explanation.replace(/\n/g, '<br />') }} />
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default PayrollCalculators;
