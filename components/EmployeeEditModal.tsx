





import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
// FIX: Import SuperAdmin type
// FIX: Import EmployeeDeduction type
// FIX: Import AllocatedBankDetails to support multiple bank accounts
import type { Employee, EmployeeProfile, EmployeeProfileRecord, Payroll, CanadianPayroll, TimeOffPolicy, EmployeeGarnishment, GarnishmentConfiguration, EmployeeEarning, EarningCode, DeductionCode, EmployeeDeduction, SuperAdmin, CompanySettings, BankDetails, Certification, Education, AllocatedBankDetails } from '../types';
import { Province } from '../types';
import EmployeePayrollForm from './EmployeePayrollForm';
import Avatar from './ui/Avatar';
import { getTimeOffPolicies, getCompanySettings } from '../services/api';

interface EmployeeEditModalProps {
  employee: Employee;
  recordToEdit: EmployeeProfileRecord;
  onClose: () => void;
  onSave: (
    employeeId: number, 
    effectiveDate: string,
    status: string,
    profileUpdate: Partial<EmployeeProfile>,
    payrollUpdate: Payroll,
    timeOffBalances: { [policyId: string]: number },
    garnishments: EmployeeGarnishment[],
    isAdmin: boolean,
    recurringEarnings: EmployeeEarning[],
    recurringDeductions: EmployeeDeduction[],
    employeeIdString: string,
    // FIX: Change parameter from single 'bankDetails' to an array of 'bankAccounts' to match type definitions and support multiple accounts.
    bankAccounts: AllocatedBankDetails[],
    certifications: Certification[],
    education: Education[],
  ) => void;
  allEmployees: Employee[];
  employeeNameMap: Record<number, string>;
  statuses: string[];
  phoneTypes: string[];
  emailTypes: string[];
  settings: CompanySettings | null;
  // FIX: Add session prop for multi-tenancy context
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

const newCertificationTemplate: Omit<Certification, 'id'> = { name: '', issuingBody: '', issueDate: '', expiryDate: '' };
const newEducationTemplate: Omit<Education, 'id'> = { institution: '', degree: '', fieldOfStudy: '', completionDate: '' };

const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ employee, recordToEdit, onClose, onSave, allEmployees, employeeNameMap, statuses, phoneTypes, emailTypes, settings, session }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'payroll' | 'time_off' | 'banking' | 'additional'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState<EmployeeProfile>({
    name: '',
    role: '',
    payType: 'Salaried',
    annualSalary: 0,
    province: Province.ON,
    address: { street: '', city: '', province: Province.ON, postalCode: '', country: 'Canada' },
    phoneNumbers: [],
    emails: [],
    supervisorId: undefined,
    avatarUrl: '',
    dateOfBirth: '',
    weeklyHours: 40,
    hourlyRate: 0,
  });

  const [employeeIdString, setEmployeeIdString] = useState('');
  const [payrollData, setPayrollData] = useState<Payroll>({
      canada: { sin: '', td1Federal: 0, td1Provincial: 0 }
  });
  // FIX: Replace single 'bankDetails' state with 'bankAccounts' array to support multiple accounts.
  const [bankAccounts, setBankAccounts] = useState<AllocatedBankDetails[]>([]);
  
  const [garnishments, setGarnishments] = useState<EmployeeGarnishment[]>([]);
  const [recurringEarnings, setRecurringEarnings] = useState<EmployeeEarning[]>([]);
  const [recurringDeductions, setRecurringDeductions] = useState<EmployeeDeduction[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [education, setEducation] = useState<Education[]>([]);

  const [newCert, setNewCert] = useState(newCertificationTemplate);
  const [newEdu, setNewEdu] = useState(newEducationTemplate);


  const [allGarnishmentConfigs, setAllGarnishmentConfigs] = useState<GarnishmentConfiguration[]>([]);
  const [allEarningCodes, setAllEarningCodes] = useState<EarningCode[]>([]);
  const [allDeductionCodes, setAllDeductionCodes] = useState<DeductionCode[]>([]);

  const codeMaps = useRef({
      garnishment: new Map<string, GarnishmentConfiguration>(),
      earning: new Map<string, EarningCode>(),
      deduction: new Map<string, DeductionCode>(),
  });

  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('');

  const [timeOffBalances, setTimeOffBalances] = useState<{ [policyId: string]: number }>({});
  const [allPolicies, setAllPolicies] = useState<TimeOffPolicy[]>([]);
  const [policyToAdd, setPolicyToAdd] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [originalState, setOriginalState] = useState<any>(null);

  const isDirty = useMemo(() => {
    if (!originalState) return false;
    const currentState = {
        profileData,
        payrollData,
        garnishments,
        recurringEarnings,
        recurringDeductions,
        effectiveDate,
        status,
        timeOffBalances,
        isAdmin,
        employeeIdString,
        // FIX: Use bankAccounts for dirty check.
        bankAccounts,
        certifications,
        education
    };
    return JSON.stringify(currentState) !== JSON.stringify(originalState);
  }, [profileData, payrollData, garnishments, recurringEarnings, recurringDeductions, effectiveDate, status, timeOffBalances, isAdmin, employeeIdString, bankAccounts, certifications, education, originalState]);

  useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    if (!session.tenantId) return;

    if (recordToEdit && employee) {
      const profileWithDefaults = {
        ...recordToEdit.profile,
        payType: recordToEdit.profile.payType || 'Salaried',
        weeklyHours: recordToEdit.profile.weeklyHours || 40,
        address: recordToEdit.profile.address || { street: '', city: '', province: recordToEdit.profile.province, postalCode: '', country: 'Canada' },
        phoneNumbers: recordToEdit.profile.phoneNumbers || [],
        emails: recordToEdit.profile.emails || [],
      };
      setProfileData(profileWithDefaults);
      setEffectiveDate(recordToEdit.effectiveDate);
      setStatus(recordToEdit.status);
      setEmployeeIdString(employee.employeeId);
      setPayrollData(employee.payroll);
      // FIX: Use bankAccounts array from employee object instead of non-existent bankDetails.
      setBankAccounts(employee.bankAccounts || []);
      setTimeOffBalances(employee.timeOffBalances || {});
      setGarnishments(employee.garnishments || []);
      setRecurringEarnings(employee.recurringEarnings || []);
      setRecurringDeductions(employee.recurringDeductions || []);
      setCertifications(employee.certifications || []);
      setEducation(employee.education || []);
      setIsAdmin(employee.isAdmin || false);

      const initialState = {
        profileData: profileWithDefaults,
        effectiveDate: recordToEdit.effectiveDate,
        status: recordToEdit.status,
        payrollData: employee.payroll,
        timeOffBalances: employee.timeOffBalances || {},
        garnishments: employee.garnishments || [],
        recurringEarnings: employee.recurringEarnings || [],
        recurringDeductions: employee.recurringDeductions || [],
        certifications: employee.certifications || [],
        education: employee.education || [],
        isAdmin: employee.isAdmin || false,
        employeeIdString: employee.employeeId,
        // FIX: Use bankAccounts array in original state for dirty checking.
        bankAccounts: employee.bankAccounts || [],
      };
      setOriginalState(JSON.parse(JSON.stringify(initialState)));
    }

    Promise.all([
      // FIX: Pass tenantId to API calls
      getTimeOffPolicies(session.tenantId),
      getCompanySettings(session.tenantId)
    ]).then(([policies, settings]) => {
      setAllPolicies(policies);
      const configs = settings.configurations;
      if (configs) {
        const garnishmentConfs = configs.garnishments?.canada || [];
        const earningConfs = configs.earningCodes || [];
        const deductionConfs = configs.deductionCodes || [];

        setAllGarnishmentConfigs(garnishmentConfs);
        setAllEarningCodes(earningConfs);
        setAllDeductionCodes(deductionConfs);

        codeMaps.current.garnishment = new Map(garnishmentConfs.map(c => [c.id, c]));
        codeMaps.current.earning = new Map(earningConfs.map(c => [c.id, c]));
        codeMaps.current.deduction = new Map(deductionConfs.map(c => [c.id, c]));
      }
    }).catch(console.error);

  }, [recordToEdit, employee, session.tenantId]);
  
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

  const adminCount = useMemo(() => allEmployees.filter(e => e.isAdmin).length, [allEmployees]);
  const isLastAdmin = adminCount === 1 && employee.isAdmin;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
  
  // FIX: Add logic for managing multiple bank accounts, similar to the Add Employee modal.
  const handleBankAccountsChange = (index: number, field: keyof AllocatedBankDetails, value: string | number) => {
    const newBankAccounts = [...bankAccounts];
    (newBankAccounts[index] as any)[field] = value;
    setBankAccounts(newBankAccounts);
  };
  const addBankAccount = () => {
    if (bankAccounts.length >= 5) return;
    setBankAccounts(prev => [...prev, { id: `new-${Date.now()}`, institution: '', transit: '', account: '', nickname: '', allocationPercent: 0 }]);
  };
  const removeBankAccount = (id: string) => {
    setBankAccounts(prev => prev.filter(acc => acc.id !== id));
  };
  const totalAllocation = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => sum + (Number(acc.allocationPercent) || 0), 0);
  }, [bankAccounts]);


  const handleSupervisorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setProfileData(prev => ({ ...prev, supervisorId: value ? Number(value) : undefined }));
  };

  const handlePhoneNumberChange = (index: number, field: 'type' | 'number', value: string) => {
    const newPhoneNumbers = [...profileData.phoneNumbers];
    newPhoneNumbers[index] = { ...newPhoneNumbers[index], [field]: value };
    setProfileData(prev => ({ ...prev, phoneNumbers: newPhoneNumbers }));
  };
  
  const addPhoneNumber = () => {
    setProfileData(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, { type: phoneTypes[0] || 'Other', number: '' }]
    }));
  };
  
  const removePhoneNumber = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== index)
    }));
  };

  const handleEmailChange = (index: number, field: 'type' | 'address', value: string) => {
    const newEmails = [...profileData.emails];
    newEmails[index] = { ...newEmails[index], [field]: value };
    setProfileData(prev => ({ ...prev, emails: newEmails }));
  };
  
  const addEmail = () => {
    setProfileData(prev => ({
      ...prev,
      emails: [...prev.emails, { type: emailTypes[0] || 'Work', address: '' }]
    }));
  };
  
  const removeEmail = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index)
    }));
  };


  const handlePayrollChange = (updatedCanadianPayroll: CanadianPayroll) => {
    setPayrollData(prev => ({
      ...prev,
      canada: updatedCanadianPayroll,
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          avatarUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) {
        alert("Please select a status reason.");
        return;
    }
    // FIX: Validate bank account allocation total.
    if (bankAccounts.length > 0 && totalAllocation !== 100) {
        alert("Total bank account allocation must equal 100%.");
        return;
    }
    // FIX: Pass the 'bankAccounts' array to the onSave handler.
    onSave(employee.id, effectiveDate, status, profileData, payrollData, timeOffBalances, garnishments, isAdmin, recurringEarnings, recurringDeductions, employeeIdString, bankAccounts, certifications, education);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleTimeOffBalanceChange = (policyId: string, balance: string) => {
    setTimeOffBalances(prev => ({
        ...prev,
        [policyId]: Number(balance) || 0,
    }));
  };

  const handleAddPolicy = () => {
    if (policyToAdd && !timeOffBalances.hasOwnProperty(policyToAdd)) {
        setTimeOffBalances(prev => ({
            ...prev,
            [policyToAdd]: 0,
        }));
        setPolicyToAdd('');
    }
  };

  const handleRemovePolicy = (policyId: string) => {
    setTimeOffBalances(prev => {
        const newBalances = { ...prev };
        delete newBalances[policyId];
        return newBalances;
    });
  };

  const handleAddCertification = () => {
    if (!newCert.name || !newCert.issuingBody || !newCert.issueDate) {
        alert("Please fill in all required certification fields.");
        return;
    }
    const certToAdd: Certification = { ...newCert, id: `cert-${Date.now()}` };
    setCertifications(prev => [...prev, certToAdd]);
    setNewCert(newCertificationTemplate);
  };

  const handleRemoveCertification = (id: string) => {
    setCertifications(prev => prev.filter(c => c.id !== id));
  };
  
  const handleAddEducation = () => {
    if (!newEdu.institution || !newEdu.degree || !newEdu.completionDate) {
        alert("Please fill in all required education fields.");
        return;
    }
    const eduToAdd: Education = { ...newEdu, id: `edu-${Date.now()}` };
    setEducation(prev => [...prev, eduToAdd]);
    setNewEdu(newEducationTemplate);
  };

  const handleRemoveEducation = (id: string) => {
    setEducation(prev => prev.filter(e => e.id !== id));
  };


  const availablePolicies = allPolicies.filter(p => !timeOffBalances.hasOwnProperty(p.id));
  const policyMap = Object.fromEntries(allPolicies.map(p => [p.id, p.name]));
  
  const availableGarnishments = allGarnishmentConfigs.filter(
    c => (c.jurisdiction === 'Federal' || c.jurisdiction === profileData.province) && !garnishments.some(g => g.configId === c.id)
  );

  const availableEarnings = allEarningCodes.filter(c => !recurringEarnings.some(e => e.codeId === c.id));
  const availableDeductions = allDeductionCodes.filter(c => !recurringDeductions.some(d => d.codeId === c.id));
  
  const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary focus:ring-opacity-50 sm:text-sm";
  
  const RecurringItemManager = ({ title, items, availableCodes, codeMap, onAdd, onRemove, onChange, unit = '$' } : any) => (
      <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">{title}</h3>
          <div className="space-y-3">
              {items.map((item: any, index: number) => {
                  const config = codeMap.get(item.codeId);
                  if (!config) return null;
                  return (
                      <div key={config.id} className="grid grid-cols-3 gap-x-4 items-center">
                          <label htmlFor={`item-amount-${index}`} className="block text-sm font-medium text-slate-700 col-span-1">{config.name}</label>
                          <div className="relative mt-1 rounded-md shadow-sm col-span-1">
                              {unit === '$' && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-slate-500 sm:text-sm">$</span></div>}
                              <input type="number" step="0.01" id={`item-amount-${index}`} value={item.amount} onChange={e => onChange(index, Number(e.target.value))} className={`${inputClass} pl-7`} />
                          </div>
                          <div className="col-span-1">
                              <button type="button" onClick={() => onRemove(item.codeId)} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                          </div>
                      </div>
                  );
              })}
          </div>
          {availableCodes.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700">Assign New {title.slice(0, -1)}</label>
                  <div className="mt-1 flex items-center space-x-2">
                      <select defaultValue="" onChange={e => onAdd(e.target.value)} className={inputClass}>
                          <option value="" disabled>Select a code...</option>
                          {availableCodes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
              </div>
          )}
      </div>
  );


  return (
    <Modal isOpen={true} onClose={handleClose} title={`Edit ${profileData.name}`}>
      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`${activeTab === 'profile' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Profile & Job
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('payroll')}
                    className={`${activeTab === 'payroll' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Payroll
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('banking')}
                    className={`${activeTab === 'banking' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Banking
                </button>
                 <button
                    type="button"
                    onClick={() => setActiveTab('time_off')}
                    className={`${activeTab === 'time_off' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Time Off
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('additional')}
                    className={`${activeTab === 'additional' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Additional Details
                </button>
            </nav>
        </div>

        <div className="pt-6 space-y-4">
            {activeTab === 'profile' && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Profile Photo</label>
                        <div className="mt-2 flex items-center space-x-4">
                            <Avatar src={profileData.avatarUrl} name={profileData.name} size="lg" />
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                                Change Photo
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="effectiveDate" className="block text-sm font-medium text-slate-700">Effective Date</label>
                            <input type="date" id="effectiveDate" name="effectiveDate" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputClass} required />
                            <p className="mt-1 text-xs text-slate-500">The date this change takes effect.</p>
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status Reason</label>
                            <select id="status" name="status" value={status} onChange={e => setStatus(e.target.value)} className={inputClass} required>
                                <option value="" disabled>Select a reason...</option>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                             <p className="mt-1 text-xs text-slate-500">Reason for this record change.</p>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
                            <input type="text" id="name" name="name" value={profileData.name} onChange={handleProfileChange} className={inputClass} required />
                        </div>
                        <div>
                            <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700">Employee ID</label>
                            <input 
                                type="text" 
                                id="employeeId" 
                                name="employeeId" 
                                value={employeeIdString} 
                                onChange={(e) => setEmployeeIdString(e.target.value)} 
                                className={`${inputClass} font-mono disabled:bg-slate-100 disabled:text-slate-500`}
                                disabled={settings?.configurations?.employeeIdGeneration?.method !== 'manual'}
                                required 
                            />
                            {settings?.configurations?.employeeIdGeneration?.method !== 'manual' && (
                                <p className="mt-1 text-xs text-slate-500">System-generated ID.</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700">Date of Birth</label>
                            <input type="date" id="dateOfBirth" name="dateOfBirth" value={profileData.dateOfBirth} onChange={handleProfileChange} className={inputClass} required />
                        </div>
                    </div>
                     <div className="pt-4 border-t border-slate-200">
                         <h3 className="text-md font-medium text-slate-900">Contact Information</h3>
                         <div className="mt-4 grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                            <div className="sm:col-span-6"><label htmlFor="street" className="block text-sm font-medium text-slate-700">Street address</label><input type="text" name="address.street" id="street" value={profileData.address.street} onChange={handleProfileChange} className={inputClass} /></div>
                            <div className="sm:col-span-2"><label htmlFor="city" className="block text-sm font-medium text-slate-700">City</label><input type="text" name="address.city" id="city" value={profileData.address.city} onChange={handleProfileChange} className={inputClass} /></div>
                            <div className="sm:col-span-2"><label htmlFor="province" className="block text-sm font-medium text-slate-700">Province</label><select id="province" name="address.province" value={profileData.address.province} onChange={handleProfileChange} className={inputClass}>{Object.values(Province).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div className="sm:col-span-2"><label htmlFor="postalCode" className="block text-sm font-medium text-slate-700">Postal code</label><input type="text" name="address.postalCode" id="postalCode" value={profileData.address.postalCode} onChange={handleProfileChange} className={inputClass} /></div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700">Phone Numbers</label>
                            {profileData.phoneNumbers.map((phone, index) => (
                                <div key={index} className="mt-2 flex items-center space-x-2">
                                    <select value={phone.type} onChange={(e) => handlePhoneNumberChange(index, 'type', e.target.value)} className={`block w-1/3 ${inputClass}`}>
                                        {phoneTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <input type="tel" value={phone.number} onChange={(e) => handlePhoneNumberChange(index, 'number', e.target.value)} className={`block w-2/3 ${inputClass}`} placeholder="e.g., 416-555-0199" />
                                    <button type="button" onClick={() => removePhoneNumber(index)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" size="sm" onClick={addPhoneNumber} className="mt-2">
                                Add Phone Number
                            </Button>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700">Email Addresses</label>
                            {profileData.emails.map((email, index) => (
                                <div key={index} className="mt-2 flex items-center space-x-2">
                                    <select value={email.type} onChange={(e) => handleEmailChange(index, 'type', e.target.value)} className={`block w-1/3 ${inputClass}`} >
                                        {emailTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <input type="email" value={email.address} onChange={(e) => handleEmailChange(index, 'address', e.target.value)} className={`block w-2/3 ${inputClass}`} placeholder="e.g., jane.doe@example.com" />
                                    <button type="button" onClick={() => removeEmail(index)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button>
                                </div>
                            ))}
                            <Button type="button" variant="secondary" size="sm" onClick={addEmail} className="mt-2">
                                Add Email Address
                            </Button>
                        </div>
                    </div>


                    <div className="pt-4 border-t border-slate-200">
                         <h3 className="text-md font-medium text-slate-900">Job & Compensation</h3>
                        <div className="mt-4 space-y-4">
                             <div>
                                <label htmlFor="role" className="block text-sm font-medium text-slate-700">Role</label>
                                <input type="text" id="role" name="role" value={profileData.role} onChange={handleProfileChange} className={inputClass} required />
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
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
                            
                            <div>
                                <label htmlFor="province" className="block text-sm font-medium text-slate-700">Work Province</label>
                                <select id="province" name="province" value={profileData.province} onChange={handleProfileChange} className={inputClass} required >
                                    {Object.entries(Province).map(([key, value]) => (<option key={key} value={value}>{value}</option>))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="supervisorId" className="block text-sm font-medium text-slate-700">Supervisor</label>
                                <select id="supervisorId" name="supervisorId" value={profileData.supervisorId || ''} onChange={handleSupervisorChange} className={inputClass} >
                                    <option value="">No Supervisor</option>
                                    {allEmployees.filter(emp => emp.id !== employee.id).map(emp => (<option key={emp.id} value={emp.id}>{employeeNameMap[emp.id]}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                        <h3 className="text-md font-medium text-slate-900">System Access</h3>
                        <div className="mt-4">
                            <div className="relative flex items-start">
                                <div className="flex h-5 items-center">
                                    <input
                                        id="isAdmin"
                                        name="isAdmin"
                                        type="checkbox"
                                        checked={isAdmin}
                                        onChange={(e) => setIsAdmin(e.target.checked)}
                                        disabled={isLastAdmin}
                                        className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary disabled:opacity-50"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="isAdmin" className="font-medium text-slate-700">Administrator Access</label>
                                    <p className="text-slate-500">Grants full access to all system settings and employee records.</p>
                                    {isLastAdmin && <p className="text-xs text-yellow-600 mt-1">Cannot revoke access for the last administrator.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'payroll' && payrollData.canada && (
                <div className="space-y-6">
                    <EmployeePayrollForm payroll={payrollData.canada} onChange={handlePayrollChange} />
                    <RecurringItemManager
                        title="Recurring Earnings"
                        items={recurringEarnings}
                        availableCodes={availableEarnings}
                        codeMap={codeMaps.current.earning}
                        onAdd={(codeId: string) => setRecurringEarnings(prev => [...prev, { codeId, amount: 0 }])}
                        onRemove={(codeId: string) => setRecurringEarnings(prev => prev.filter(e => e.codeId !== codeId))}
                        onChange={(index: number, amount: number) => setRecurringEarnings(prev => prev.map((e, i) => i === index ? { ...e, amount } : e))}
                    />
                    <RecurringItemManager
                        title="Recurring Deductions"
                        items={recurringDeductions}
                        availableCodes={availableDeductions}
                        codeMap={codeMaps.current.deduction}
                        onAdd={(codeId: string) => setRecurringDeductions(prev => [...prev, { codeId, amount: 0 }])}
                        onRemove={(codeId: string) => setRecurringDeductions(prev => prev.filter(d => d.codeId !== codeId))}
                        onChange={(index: number, amount: number) => setRecurringDeductions(prev => prev.map((d, i) => i === index ? { ...d, amount } : d))}
                    />
                    <RecurringItemManager
                        title="Wage Garnishments"
                        items={garnishments}
                        availableCodes={availableGarnishments}
                        codeMap={codeMaps.current.garnishment}
                        onAdd={(configId: string) => setGarnishments(prev => [...prev, { configId, amount: 0 }])}
                        onRemove={(configId: string) => setGarnishments(prev => prev.filter(g => g.configId !== configId))}
                        onChange={(index: number, amount: number) => setGarnishments(prev => prev.map((g, i) => i === index ? { ...g, amount } : g))}
                    />
                </div>
            )}
            
            {/* FIX: Updated Banking tab to handle multiple bank accounts. */}
            {activeTab === 'banking' && (
                <div>
                    <h3 className="text-lg font-medium text-slate-900">Bank Details (for Direct Deposit)</h3>
                     <div className="space-y-4 mt-4">
                        {bankAccounts.map((account, index) => (
                            <div key={account.id} className="p-4 border rounded-lg bg-slate-50 relative">
                                {bankAccounts.length > 1 && (
                                    <button type="button" onClick={() => removeBankAccount(account.id)} className="absolute top-2 right-2 text-slate-400 hover:text-red-600 font-bold text-lg">&times;</button>
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
                        {bankAccounts.length > 0 && (
                            <div className={`mt-2 text-right font-semibold ${totalAllocation !== 100 ? 'text-red-600' : 'text-green-600'}`}>
                                Total Allocation: {totalAllocation}%
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'time_off' && (
                <div className="space-y-4">
                    <h3 className="text-md font-medium text-slate-900">Assigned Policies</h3>
                    {Object.keys(timeOffBalances).length === 0 && <p className="text-sm text-slate-500">No policies assigned.</p>}
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                        {Object.entries(timeOffBalances).map(([policyId, balance]) => (
                            <div key={policyId} className="flex items-center space-x-2">
                                <label htmlFor={`balance-${policyId}`} className="flex-1 text-sm text-slate-700">{policyMap[policyId] || policyId}</label>
                                <input type="number" id={`balance-${policyId}`} value={balance} onChange={(e) => handleTimeOffBalanceChange(policyId, e.target.value)} className={`${inputClass} w-24`} />
                                <span className="text-sm text-slate-500">hours</span>
                                <button type="button" onClick={() => handleRemovePolicy(policyId)} className="text-red-500 hover:text-red-700">&times;</button>
                            </div>
                        ))}
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                        <h3 className="text-md font-medium text-slate-900">Assign New Policy</h3>
                        <div className="mt-2 flex items-center space-x-2">
                            <select
                                value={policyToAdd}
                                onChange={(e) => setPolicyToAdd(e.target.value)}
                                className={`${inputClass} flex-1`}
                            >
                                <option value="" disabled>Select a policy...</option>
                                {availablePolicies.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <Button type="button" variant="secondary" size="sm" onClick={handleAddPolicy} disabled={!policyToAdd}>Add</Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'additional' && (
                <div className="space-y-8">
                    {/* Certifications */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-900">Certifications</h3>
                        <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
                            {certifications.map(cert => (
                                <div key={cert.id} className="p-3 flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-900">{cert.name}</p>
                                        <p className="text-sm text-slate-500">Issued by {cert.issuingBody} on {cert.issueDate}</p>
                                        {cert.expiryDate && <p className="text-xs text-slate-400">Expires: {cert.expiryDate}</p>}
                                    </div>
                                    <button type="button" onClick={() => handleRemoveCertification(cert.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                                </div>
                            ))}
                            {certifications.length === 0 && <p className="p-4 text-sm text-slate-500">No certifications on file.</p>}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-md font-medium">Add New Certification</h4>
                            <div className="mt-2 p-4 bg-slate-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className="block text-sm">Name</label><input type="text" value={newCert.name} onChange={e => setNewCert(p => ({...p, name: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Issuing Body</label><input type="text" value={newCert.issuingBody} onChange={e => setNewCert(p => ({...p, issuingBody: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Issue Date</label><input type="date" value={newCert.issueDate} onChange={e => setNewCert(p => ({...p, issueDate: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Expiry Date (Optional)</label><input type="date" value={newCert.expiryDate} onChange={e => setNewCert(p => ({...p, expiryDate: e.target.value}))} className={inputClass} /></div>
                                <div className="sm:col-span-2 text-right"><Button type="button" variant="secondary" size="sm" onClick={handleAddCertification}>Add Certification</Button></div>
                            </div>
                        </div>
                    </div>

                    {/* Education */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-900">Education</h3>
                         <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
                            {education.map(edu => (
                                <div key={edu.id} className="p-3 flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-slate-900">{edu.degree} - {edu.fieldOfStudy}</p>
                                        <p className="text-sm text-slate-500">{edu.institution} (Completed: {edu.completionDate})</p>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveEducation(edu.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                                </div>
                            ))}
                            {education.length === 0 && <p className="p-4 text-sm text-slate-500">No education records on file.</p>}
                        </div>
                        <div className="mt-4 pt-4 border-t">
                             <h4 className="text-md font-medium">Add New Education Record</h4>
                             <div className="mt-2 p-4 bg-slate-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className="block text-sm">Institution</label><input type="text" value={newEdu.institution} onChange={e => setNewEdu(p => ({...p, institution: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Degree</label><input type="text" value={newEdu.degree} onChange={e => setNewEdu(p => ({...p, degree: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Field of Study</label><input type="text" value={newEdu.fieldOfStudy} onChange={e => setNewEdu(p => ({...p, fieldOfStudy: e.target.value}))} className={inputClass} /></div>
                                <div><label className="block text-sm">Completion Date</label><input type="date" value={newEdu.completionDate} onChange={e => setNewEdu(p => ({...p, completionDate: e.target.value}))} className={inputClass} /></div>
                                <div className="sm:col-span-2 text-right"><Button type="button" variant="secondary" size="sm" onClick={handleAddEducation}>Add Education</Button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="flex items-center justify-end pt-6 space-x-2">
            {isDirty ? (
                <>
                    <Button variant="secondary" type="button" onClick={onClose}>Discard Changes</Button>
                    <Button variant="primary" type="submit">Save Changes</Button>
                </>
            ) : (
                <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
            )}
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeEditModal;