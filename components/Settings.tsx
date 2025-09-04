


import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { getCompanySettings, updateCompanySettings, getAuditLogs } from '../services/api';
import type { CompanySettings, GarnishmentConfiguration, StatutoryHoliday, Province as ProvinceEnum, AuditLogEntry, PayFrequency as PayFrequencyEnum, Employee, SuperAdmin, CRARemitterType as CRARemitterTypeEnum } from '../types';
import { Province, GarnishmentCalculationType, PayFrequency, CRARemitterType } from '../types';
import TagInput from './ui/TagInput';

interface SettingsProps {
  onBrandingUpdate: () => void;
  session: { user: Employee | SuperAdmin; tenantId: string };
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


const Settings: React.FC<SettingsProps> = ({ onBrandingUpdate, session }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'branding' | 'configs' | 'security'>('info');
  
  // State for Audit Log
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState<string|null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;
  
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const isDirty = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    if (activeTab === 'security') {
        setAuditLogsLoading(true);
        setAuditLogError(null);
        getAuditLogs(session.tenantId)
            .then(data => setAuditLogs(data))
            .catch(err => setAuditLogError('Failed to load audit logs.'))
            .finally(() => setAuditLogsLoading(false));
    }
  }, [activeTab, session.tenantId]);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCompanySettings(session.tenantId);
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError("Failed to load company settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const keys = name.split('.');

    setSettings(prev => {
      if (!prev) return null;
      
      const newSettings = JSON.parse(JSON.stringify(prev)); 

      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = current[keys[i]] || {};
      }
      
      const finalKey = keys[keys.length - 1];
      const isNumeric = e.target.type === 'number' && value !== '';

      current[finalKey] = isNumeric ? Number(value) : value;

      return newSettings;
    });
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFrequency = e.target.value as PayFrequencyEnum;
    setSettings(prev => {
      if (!prev) return null;
      const newSettings = JSON.parse(JSON.stringify(prev));
      // Reset schedule object when frequency changes to avoid stale data
      if (!newSettings.configurations) newSettings.configurations = { statuses: [] };
      newSettings.configurations.payrollSchedule = { frequency: newFrequency };
      return newSettings;
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => {
          if (!prev) return null;
          const newSettings = JSON.parse(JSON.stringify(prev));
          if (!newSettings.branding) {
            newSettings.branding = { logoUrl: '', primaryColor: '' };
          }
          newSettings.branding.logoUrl = reader.result as string;
          return newSettings;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updatedSettingsData = await updateCompanySettings(settings, session.tenantId);
      setSettings(updatedSettingsData);
      setOriginalSettings(JSON.parse(JSON.stringify(updatedSettingsData)));
      onBrandingUpdate();
      setSuccessMessage("Company settings updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTabChange = (tab: 'info' | 'branding' | 'configs' | 'security') => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes that will be lost. Are you sure you want to switch tabs?')) {
        return;
      }
    }
    setActiveTab(tab);
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log =>
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [auditLogs, searchTerm]);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  }, [filteredLogs, currentPage, logsPerPage, indexOfFirstLog, indexOfLastLog]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const TabButton: React.FC<{tab: 'info' | 'branding' | 'configs' | 'security', label: string}> = ({ tab, label }) => (
     <button
        type="button"
        onClick={() => handleTabChange(tab)}
        className={`${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
    >
        {label}
    </button>
  );
  
  const saveButtonFooter = (
    <div className="flex justify-end">
      <Button variant="primary" type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );

  if (isLoading) return <Card title="Company Settings"><div className="text-center p-8">Loading settings...</div></Card>;
  if (error) return <Card title="Company Settings"><div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{error}</div></Card>;
  if (!settings) return <Card title="Company Settings"><div className="text-center p-8">No settings found.</div></Card>;

  const currentSchedule = settings.configurations?.payrollSchedule;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Settings</h2>
         <div className="flex items-center space-x-4">
            {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
          </div>
      </div>
      
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <TabButton tab="info" label="Company Info" />
            <TabButton tab="branding" label="Branding" />
            <TabButton tab="security" label="Security & Audit" />
        </nav>
      </div>

      {activeTab === 'info' && (
        <Card
          footer={saveButtonFooter}
        >
            <div className="space-y-8 divide-y divide-slate-200">
              <div>
                <h3 className="text-lg font-medium leading-6 text-slate-900">Company Information</h3>
                <p className="mt-1 text-sm text-slate-500">Used for tax forms and official documents.</p>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-4"><label htmlFor="legalName" className="block text-sm font-medium text-slate-700">Legal Company Name</label><input type="text" name="legalName" id="legalName" value={settings.legalName} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50 sm:text-sm" /></div>
                  <div className="sm:col-span-4"><label htmlFor="businessNumber" className="block text-sm font-medium text-slate-700">CRA Business Number (BN)</label><input type="text" name="jurisdictionInfo.canada.businessNumber" id="businessNumber" value={settings.jurisdictionInfo.canada?.businessNumber || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g. 123456789RP0001" /><p className="mt-1 text-xs text-slate-500">9-digit number plus the 2-letter, 4-digit payroll program account (RP).</p></div>
                  <div className="sm:col-span-2">
                    <label htmlFor="remitterType" className="block text-sm font-medium text-slate-700">CRA Remitter Type</label>
                    <select name="jurisdictionInfo.canada.remitterType" id="remitterType" value={settings.jurisdictionInfo.canada?.remitterType || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">
                        <option value="" disabled>Select a type...</option>
                        {Object.values(CRARemitterType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">Determines your remittance frequency.</p>
                  </div>
                </div>
              </div>

               <div className="pt-8">
                <h3 className="text-lg font-medium leading-6 text-slate-900">Payroll Schedule</h3>
                <p className="mt-1 text-sm text-slate-500">Define the company-wide pay schedule.</p>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="payrollFrequency" className="block text-sm font-medium text-slate-700">Pay Frequency</label>
                    <select id="payrollFrequency" value={currentSchedule?.frequency || ''} onChange={handleFrequencyChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">
                      {Object.values(PayFrequency).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  
                  {currentSchedule?.frequency === PayFrequency.Weekly && (
                    <div className="sm:col-span-2">
                      <label htmlFor="payrollDayOfWeek" className="block text-sm font-medium text-slate-700">Payday</label>
                      <select name="configurations.payrollSchedule.dayOfWeek" id="payrollDayOfWeek" value={currentSchedule?.dayOfWeek || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">
                        <option value="" disabled>Select day...</option>
                        {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </div>
                  )}

                  {currentSchedule?.frequency === PayFrequency.BiWeekly && (
                    <>
                      <div className="sm:col-span-2">
                        <label htmlFor="payrollDayOfWeek" className="block text-sm font-medium text-slate-700">Payday</label>
                        <select name="configurations.payrollSchedule.dayOfWeek" id="payrollDayOfWeek" value={currentSchedule?.dayOfWeek || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">
                           <option value="" disabled>Select day...</option>
                           {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="payrollAnchorDate" className="block text-sm font-medium text-slate-700">A Recent Pay Date</label>
                        <input type="date" name="configurations.payrollSchedule.anchorDate" id="payrollAnchorDate" value={currentSchedule?.anchorDate || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" />
                        <p className="mt-1 text-xs text-slate-500">Used to establish the two-week cycle.</p>
                      </div>
                    </>
                  )}

                   {currentSchedule?.frequency === PayFrequency.SemiMonthly && (
                    <>
                      <div className="sm:col-span-2">
                        <label htmlFor="payrollDayOfMonth1" className="block text-sm font-medium text-slate-700">First Payday (Day)</label>
                        <input type="number" name="configurations.payrollSchedule.dayOfMonth1" id="payrollDayOfMonth1" value={currentSchedule?.dayOfMonth1 || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" min="1" max="31" />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="payrollDayOfMonth2" className="block text-sm font-medium text-slate-700">Second Payday (Day)</label>
                        <input type="text" name="configurations.payrollSchedule.dayOfMonth2" id="payrollDayOfMonth2" value={currentSchedule?.dayOfMonth2 || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g. 31 or 'last'" />
                      </div>
                    </>
                  )}
                  
                  {currentSchedule?.frequency === PayFrequency.Monthly && (
                    <div className="sm:col-span-2">
                      <label htmlFor="payrollDayOfMonth1" className="block text-sm font-medium text-slate-700">Payday (Day of Month)</label>
                      <input type="text" name="configurations.payrollSchedule.dayOfMonth1" id="payrollDayOfMonth1" value={currentSchedule?.dayOfMonth1 || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g. 31 or 'last'" />
                    </div>
                  )}

                </div>
              </div>

               <div className="pt-8">
                <h3 className="text-lg font-medium leading-6 text-slate-900">Employee ID Generation</h3>
                <p className="mt-1 text-sm text-slate-500">Choose how unique Employee IDs are assigned.</p>
                <div className="mt-6">
                    <fieldset>
                        <legend className="text-sm font-medium text-slate-900">Method</legend>
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                                <input id="id-system" name="configurations.employeeIdGeneration.method" type="radio" value="system" checked={settings.configurations?.employeeIdGeneration?.method === 'system'} onChange={handleChange} className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary" />
                                <label htmlFor="id-system" className="ml-3 block text-sm font-medium text-slate-700">System Generated</label>
                            </div>
                            <div className="flex items-center">
                                <input id="id-manual" name="configurations.employeeIdGeneration.method" type="radio" value="manual" checked={settings.configurations?.employeeIdGeneration?.method === 'manual'} onChange={handleChange} className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary" />
                                <label htmlFor="id-manual" className="ml-3 block text-sm font-medium text-slate-700">Manual Entry</label>
                            </div>
                        </div>
                    </fieldset>
                    
                    {settings.configurations?.employeeIdGeneration?.method === 'system' && (
                        <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-200">
                            <div>
                                <label htmlFor="id-prefix" className="block text-sm font-medium text-slate-700">ID Prefix</label>
                                <input type="text" name="configurations.employeeIdGeneration.prefix" id="id-prefix" value={settings.configurations?.employeeIdGeneration?.prefix || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" placeholder="e.g., EMP-" />
                            </div>
                            <div>
                                <label htmlFor="id-next" className="block text-sm font-medium text-slate-700">Next Number</label>
                                <input type="number" name="configurations.employeeIdGeneration.nextNumber" id="id-next" value={settings.configurations?.employeeIdGeneration?.nextNumber || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" />
                            </div>
                        </div>
                    )}
                </div>
              </div>

              <div className="pt-8">
                <h3 className="text-lg font-medium leading-6 text-slate-900">Headquarters Address</h3>
                <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6"><label htmlFor="street" className="block text-sm font-medium text-slate-700">Street address</label><input type="text" name="address.street" id="street" value={settings.address.street} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                    <div className="sm:col-span-2"><label htmlFor="city" className="block text-sm font-medium text-slate-700">City</label><input type="text" name="address.city" id="city" value={settings.address.city} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                    <div className="sm:col-span-2"><label htmlFor="province" className="block text-sm font-medium text-slate-700">Province</label><select id="province" name="address.province" value={settings.address.province} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50">{Object.values(Province).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                    <div className="sm:col-span-2"><label htmlFor="postalCode" className="block text-sm font-medium text-slate-700">Postal code</label><input type="text" name="address.postalCode" id="postalCode" value={settings.address.postalCode} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                </div>
              </div>
               <div className="pt-8">
                <h3 className="text-lg font-medium leading-6 text-slate-900">Company Bank Account</h3>
                 <p className="mt-1 text-sm text-slate-500">Used for processing payroll payments via ACH/EFT.</p>
                 <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-2"><label htmlFor="institution" className="block text-sm font-medium text-slate-700">Institution Number</label><input type="text" name="bankDetails.institution" id="institution" value={settings.bankDetails?.institution || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g., 001" maxLength={3} /></div>
                    <div className="sm:col-span-2"><label htmlFor="transit" className="block text-sm font-medium text-slate-700">Transit Number</label><input type="text" name="bankDetails.transit" id="transit" value={settings.bankDetails?.transit || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g., 12345" maxLength={5} /></div>
                    <div className="sm:col-span-2"><label htmlFor="account" className="block text-sm font-medium text-slate-700">Account Number</label><input type="text" name="bankDetails.account" id="account" value={settings.bankDetails?.account || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="e.g., 987654321" /></div>
                 </div>
              </div>
              <div className="pt-8">
                <h3 className="text-lg font-medium leading-6 text-slate-900">Payroll Contact</h3>
                <p className="mt-1 text-sm text-slate-500">The primary person responsible for payroll inquiries.</p>
                 <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3"><label htmlFor="contactName" className="block text-sm font-medium text-slate-700">Full Name</label><input type="text" name="payrollContact.name" id="contactName" value={settings.payrollContact.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                    <div className="sm:col-span-3"><label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700">Email address</label><input type="email" name="payrollContact.email" id="contactEmail" value={settings.payrollContact.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                    <div className="sm:col-span-3"><label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700">Phone Number</label><input type="tel" name="payrollContact.phone" id="contactPhone" value={settings.payrollContact.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" /></div>
                </div>
              </div>
            </div>
        </Card>
      )}

      {activeTab === 'branding' && (
        <Card title="Branding" footer={saveButtonFooter}>
            <p className="mt-1 text-sm text-slate-500 mb-6">Customize the look and feel of your HR portal.</p>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
               <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700">Company Logo</label>
                <div className="mt-1 flex items-center">
                  <span className="inline-block h-12 w-32 overflow-hidden rounded-md bg-slate-100 flex items-center justify-center mr-4 border border-slate-200">
                    {settings.branding?.logoUrl ? <img src={settings.branding.logoUrl} alt="Logo Preview" className="h-full w-auto" /> : <svg className="h-full w-full text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                  </span>
                  <Button variant="secondary" type="button" onClick={() => fileInputRef.current?.click()}>Change Logo</Button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={handleLogoChange} />
                </div>
              </div>
               <div className="sm:col-span-3">
                <label htmlFor="primaryColor" className="block text-sm font-medium text-slate-700">Primary Brand Color</label>
                <div className="mt-1 flex items-center">
                    <input type="color" name="branding.primaryColor" id="primaryColor" value={settings.branding?.primaryColor || '#000000'} onChange={handleChange} className="h-10 w-10 rounded-md border-slate-300" />
                    <input type="text" value={settings.branding?.primaryColor || ''} onChange={handleChange} name="branding.primaryColor" className="ml-2 block w-full max-w-xs rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50" placeholder="#4f46e5" />
                </div>
              </div>
            </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card title="Audit Log">
            <p className="text-sm text-slate-500 mb-6">Review important security-related events that have occurred in your account.</p>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search logs by user, action, IP..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="block w-full sm:w-1/3 rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50 sm:text-sm"
                />
            </div>
            
            {auditLogsLoading ? (
                <div className="text-center p-8">Loading logs...</div>
            ) : auditLogError ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{auditLogError}</div>
            ) : (
                <>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {paginatedLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(log.timestamp).toLocaleString('en-CA')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{log.user}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {log.action}
                                            {log.details && <span className="block text-xs text-slate-400">{log.details}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{log.ipAddress}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredLogs.length === 0 && <p className="text-center text-slate-500 py-6">No logs found.</p>}

                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-sm text-slate-700">
                                Showing {Math.min(indexOfFirstLog + 1, filteredLogs.length)} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} results
                            </span>
                            <div className="space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    Previous
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
      )}
    </form>
  );
};

export default Settings;