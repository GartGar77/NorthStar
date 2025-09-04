





import React, { useState, useRef, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { Employee, EmployeeProfile, PayFrequency as PayFrequencyEnum, Payroll, CanadianPayroll, EmployeeGarnishment, AllocatedBankDetails, TimeOffPolicy, EmployeeEarning, EmployeeDeduction, SuperAdmin, CompanySettings, Certification, Education } from '../types';
import { Province, PayFrequency } from '../types';
import EmployeePayrollForm from './EmployeePayrollForm';
import Avatar from './ui/Avatar';
import { getCompanySettings, getTimeOffPolicies, searchEmployeesByName } from '../services/api';


interface EmployeeAddModalProps {
  onClose: () => void;
  onSave: (data: { profile: EmployeeProfile; effectiveDate: string; payFrequency: PayFrequencyEnum; payroll: Payroll; status: string; garnishments: EmployeeGarnishment[]; bankAccounts: AllocatedBankDetails[]; isAdmin: boolean; timeOffBalances: { [policyId: string]: number; }; recurringEarnings: EmployeeEarning[]; recurringDeductions: EmployeeDeduction[]; certifications: Certification[]; education: Education[]; employeeId?: string; }) => void;
  statuses: string[];
  phoneTypes: string[];
  emailTypes: string[];
  settings: CompanySettings | null;
  session: { user: Employee | SuperAdmin, tenantId?: string };
}

const useUnsavedChangesWarning = (isDirty: boolean) => {
  useEffect(() => {
    const message = 'You have unsaved changes. Are you sure you want to leave?';
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
};

const EmployeeAddModal: React.FC<EmployeeAddModalProps> = ({ onClose, onSave, statuses, phoneTypes, emailTypes, settings, session }) => {
  const [profileData, setProfileData] = useState<EmployeeProfile>({
    name: '',
    role: '',
    payType: 'Salaried',
    annualSalary: 80000,
    province: Province.ON,
    dateOfBirth: '',
    address: { street: '', city: '', province: Province.ON, postalCode: '', country: 'Canada' },
    phoneNumbers: [{ type: 'Cell', number: '' }],
    emails: [{ type: 'Work', address: '' }],
    supervisorId: undefined,
    avatarUrl: '',
    hourlyRate: 0,
    weeklyHours: 40,
  });
  const [employeeId, setEmployeeId] = useState('');
  const [payFrequency, setPayFrequency] = useState<PayFrequencyEnum>(PayFrequency.SemiMonthly);
  const [payrollData, setPayrollData] = useState<Payroll>({
    canada: { sin: '', td1Federal: 15705, td1Provincial: 12399 }
  });
  const [bankAccounts, setBankAccounts] = useState<AllocatedBankDetails[]>([{ id: `new-${Date.now()}`, institution: '', transit: '', account: '', allocationPercent: 100 }]);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('Hire');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Supervisor search state
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState('');
  const [supervisorSearchResults, setSupervisorSearchResults] = useState<{ id: number; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useUnsavedChangesWarning(isDirty);
  
  const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary focus:ring-opacity-50 sm:text-sm";

  useEffect(() => {
    if (supervisorSearchTerm.length > 1) {
      const handler = setTimeout(async () => {
        if (!session.tenantId) return;
        setIsSearching(true);
        const results = await searchEmployeesByName(supervisorSearchTerm, session.tenantId);
        setSupervisorSearchResults(results);
        setIsSearching(false);
      }, 500);
      return () => clearTimeout(handler);
    } else {
      setSupervisorSearchResults([]);
    }
  }, [supervisorSearchTerm, session.tenantId]);


  useEffect(() => {
    const { annualSalary, hourlyRate, weeklyHours, payType } = profileData;
    const weeksInYear = 52;

    if (!weeklyHours || weeklyHours <= 0) return;

    if (payType === 'Salaried') {
        const calculatedHourly = annualSalary / (weeklyHours * weeksInYear);
        if (Math.abs(calculatedHourly - (hourlyRate || 0)) > 0.01) {
            setProfileData(prev => ({ ...prev, hourlyRate: parseFloat(calculatedHourly.toFixed(2)) }));
        }
    } else { // 'Hourly'
        const calculatedAnnual = (hourlyRate || 0) * weeklyHours * weeksInYear;
         if (Math.abs(calculatedAnnual - annualSalary) > 0.01) {
            setProfileData(prev => ({ ...prev, annualSalary: parseFloat(calculatedAnnual.toFixed(2)) }));
        }
    }
  }, [profileData.annualSalary, profileData.hourlyRate, profileData.weeklyHours, profileData.payType]);


  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setIsDirty(true);
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
        const addressField = name.split('.')[1];
        setProfileData(prev => ({
            ...prev,
            address: { ...prev.address, [addressField]: value }
        }));
    } else {
        setProfileData(prev => ({
          ...prev,
          [name]: ['annualSalary', 'hourlyRate', 'weeklyHours'].includes(name) ? Number(value) : value,
        }));
    }
  };

  const handlePayrollChange = (updatedCanadianPayroll: CanadianPayroll) => {
    setIsDirty(true);
    setPayrollData({ canada: updatedCanadianPayroll });
  };
  
  const handleBankAccountsChange = (index: number, field: keyof AllocatedBankDetails, value: string | number) => {
    setIsDirty(true);
    const newBankAccounts = [...bankAccounts];
    (newBankAccounts[index] as any)[field] = value;
    setBankAccounts(newBankAccounts);
  };

  const addBankAccount = () => {
    if (bankAccounts.length >= 5) return;
    setIsDirty(true);
    setBankAccounts(prev => [...prev, { id: `new-${Date.now()}`, institution: '', transit: '', account: '', allocationPercent: 0 }]);
  };

  const removeBankAccount = (id: string) => {
    setIsDirty(true);
    setBankAccounts(prev => prev.filter(acc => acc.id !== id));
  };
  
  const selectSupervisor = (supervisor: { id: number; name: string }) => {
    setProfileData(prev => ({ ...prev, supervisorId: supervisor.id }));
    setSupervisorSearchTerm(supervisor.name);
    setSupervisorSearchResults([]);
  };

  const totalAllocation = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => sum + (Number(acc.allocationPercent) || 0), 0);
  }, [bankAccounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAllocation !== 100) {
      alert("Total bank allocation must be exactly 100%.");
      return;
    }
    onSave({
      profile: profileData,
      effectiveDate,
      payFrequency,
      payroll: payrollData,
      status,
      garnishments: [],
      bankAccounts,
      isAdmin,
      timeOffBalances: {},
      recurringEarnings: [],
      recurringDeductions: [],
      certifications: [],
      education: [],
      employeeId: employeeId,
    });
  };

  return (
    <Modal isOpen={true} onClose={handleClose} title="Add New Employee">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <h3 className="text-lg font-medium text-slate-900">Profile & Job</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input type="text" id="name" name="name" value={profileData.name} onChange={handleProfileChange} className="mt-1 block w-full rounded-md border-slate-300" required />
                </div>
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700">Role</label>
                    <input type="text" id="role" name="role" value={profileData.role} onChange={handleProfileChange} className="mt-1 block w-full rounded-md border-slate-300" required />
                </div>
                <div className="relative">
                    <label htmlFor="supervisorId" className="block text-sm font-medium text-slate-700">Supervisor</label>
                    <input
                        type="text"
                        id="supervisorId"
                        value={supervisorSearchTerm}
                        onChange={(e) => {
                            setSupervisorSearchTerm(e.target.value);
                            if(profileData.supervisorId) {
                                setProfileData(p => ({...p, supervisorId: undefined}));
                            }
                        }}
                        className={inputClass}
                        placeholder="Type to search for a supervisor..."
                    />
                    {isSearching && <div className="absolute top-full left-0 w-full p-2 bg-white border shadow-lg rounded-b-md text-sm text-slate-500">Searching...</div>}
                    {supervisorSearchResults.length > 0 && (
                        <ul className="absolute top-full left-0 w-full bg-white border shadow-lg rounded-b-md max-h-48 overflow-y-auto z-10">
                            {supervisorSearchResults.map(emp => (
                                <li key={emp.id} onClick={() => selectSupervisor(emp)} className="px-4 py-2 hover:bg-brand-light cursor-pointer">
                                    {emp.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {settings?.configurations?.employeeIdGeneration?.method === 'manual' && (
                <div className="mt-4">
                    <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700">Employee ID</label>
                    <input 
                        type="text" 
                        id="employeeId" 
                        name="employeeId" 
                        value={employeeId} 
                        onChange={(e) => { setIsDirty(true); setEmployeeId(e.target.value); }} 
                        className="mt-1 block w-full rounded-md border-slate-300 font-mono"
                        required 
                    />
                    <p className="mt-1 text-xs text-slate-500">Employee ID must be unique.</p>
                </div>
            )}
             <div className="mt-4">
                <label htmlFor="payFrequency" className="block text-sm font-medium text-slate-700">Pay Frequency</label>
                <select id="payFrequency" name="payFrequency" value={payFrequency} onChange={(e) => { setIsDirty(true); setPayFrequency(e.target.value as PayFrequencyEnum)}} className="mt-1 block w-full rounded-md border-slate-300">
                    {Object.values(PayFrequency).map(pf => <option key={pf} value={pf}>{pf}</option>)}
                </select>
            </div>
        </div>

        <div className="pt-6 border-t">
            <h3 className="text-lg font-medium text-slate-900">Compensation</h3>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Pay Type</label>
                    <div className="mt-2 flex gap-x-4">
                        <div className="flex items-center">
                            <input id="payTypeSalaried" name="payType" type="radio" value="Salaried" checked={profileData.payType === 'Salaried'} onChange={handleProfileChange} className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"/>
                            <label htmlFor="payTypeSalaried" className="ml-2 block text-sm font-medium text-slate-700">Salaried</label>
                        </div>
                        <div className="flex items-center">
                            <input id="payTypeHourly" name="payType" type="radio" value="Hourly" checked={profileData.payType === 'Hourly'} onChange={handleProfileChange} className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"/>
                            <label htmlFor="payTypeHourly" className="ml-2 block text-sm font-medium text-slate-700">Hourly</label>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 border-t border-slate-200">
                    <div className="md:col-span-3">
                        <label htmlFor="weeklyHours" className="block text-sm font-medium text-slate-700">Standard Weekly Hours</label>
                        <input type="number" name="weeklyHours" id="weeklyHours" value={profileData.weeklyHours || ''} onChange={handleProfileChange} className={inputClass} placeholder="e.g., 40" required />
                        <p className="mt-1 text-xs text-slate-500">Used to calculate the equivalent annual/hourly rate.</p>
                    </div>
                    <div>
                        <label htmlFor="annualSalary" className="block text-sm font-medium text-slate-700">Annual Salary</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-slate-500 sm:text-sm">$</span></div>
                            <input type="number" step="0.01" name="annualSalary" id="annualSalary" value={profileData.annualSalary} onChange={handleProfileChange} disabled={profileData.payType === 'Hourly'} className={`${inputClass} pl-7 disabled:bg-slate-100 disabled:cursor-not-allowed`} placeholder="0.00" required />
                        </div>
                    </div>
                    <div className="text-center text-slate-500 font-semibold pb-2 hidden md:block">=</div>
                    <div>
                        <label htmlFor="hourlyRate" className="block text-sm font-medium text-slate-700">Equivalent Hourly Rate</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-slate-500 sm:text-sm">$</span></div>
                            <input type="number" step="0.01" name="hourlyRate" id="hourlyRate" value={profileData.hourlyRate || ''} onChange={handleProfileChange} disabled={profileData.payType === 'Salaried'} className={`${inputClass} pl-7 disabled:bg-slate-100 disabled:cursor-not-allowed`} placeholder="0.00" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-6 border-t">
            <h3 className="text-lg font-medium text-slate-900">Payroll Information</h3>
            <div className="mt-4">
                <EmployeePayrollForm payroll={payrollData.canada!} onChange={handlePayrollChange} />
            </div>
        </div>
         <div className="pt-6 border-t">
             <h3 className="text-lg font-medium text-slate-900">Bank Details (for Direct Deposit)</h3>
            <div className="space-y-4 mt-4">
                {bankAccounts.map((account, index) => (
                    <div key={account.id} className="p-4 border rounded-lg bg-slate-50 relative">
                         {bankAccounts.length > 1 && (
                            <button type="button" onClick={() => removeBankAccount(account.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600">&times;</button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="text-sm">Account Nickname (Optional)</label><input type="text" value={account.nickname || ''} onChange={e => handleBankAccountsChange(index, 'nickname', e.target.value)} className={inputClass} /></div>
                            <div><label className="text-sm">Institution (3 digits)</label><input type="text" value={account.institution} onChange={e => handleBankAccountsChange(index, 'institution', e.target.value)} className={inputClass} maxLength={3} /></div>
                            <div><label className="text-sm">Transit (5 digits)</label><input type="text" value={account.transit} onChange={e => handleBankAccountsChange(index, 'transit', e.target.value)} className={inputClass} maxLength={5} /></div>
                            <div><label className="text-sm">Account Number</label><input type="text" value={account.account} onChange={e => handleBankAccountsChange(index, 'account', e.target.value)} className={inputClass} /></div>
                            <div>
                                <label className="text-sm">Allocation (%)</label>
                                <div className="relative">
                                    <input type="number" value={account.allocationPercent} onChange={e => handleBankAccountsChange(index, 'allocationPercent', Number(e.target.value))} className={`${inputClass} pr-8`} />
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"><span className="text-slate-500 sm:text-sm">%</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {bankAccounts.length < 5 && (
                    <Button type="button" variant="secondary" size="sm" onClick={addBankAccount}>Add another account</Button>
                )}
                 <div className={`mt-2 text-right font-semibold ${totalAllocation !== 100 ? 'text-red-600' : 'text-green-600'}`}>
                    Total Allocation: {totalAllocation}%
                </div>
            </div>
        </div>

        <div className="flex items-center justify-end pt-6 space-x-2 border-t">
            <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={totalAllocation !== 100}>Add Employee</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeAddModal;