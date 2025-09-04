





import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import type { TimeOffRequest, TimeOffPolicy, Employee, EmployeeProfileRecord, SuperAdmin, CompanySettings } from '../types';
import { TimeOffRequestStatus, CarryoverTiming, TimeOffRequestUnit } from '../types';
import { getTimeOffRequests, updateTimeOffRequestStatus, getTimeOffPolicies, getEmployees, saveTimeOffPolicy, getCompanySettings, updateCompanySettings } from '../services/api';
import TimeOffPolicyModal from './TimeOffPolicyModal';

type ActiveTab = 'requests' | 'settings';

interface TimeOffProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const getCurrentProfileRecord = (employee: Employee): EmployeeProfileRecord | null => {
    const sortedHistory = employee.profileHistory
        .filter(p => new Date(p.effectiveDate) <= new Date())
        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    return sortedHistory.length > 0 ? sortedHistory[0] : null;
}

const TimeOff: React.FC<TimeOffProps> = ({ session }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('requests');
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [policies, setPolicies] = useState<TimeOffPolicy[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [policyToEdit, setPolicyToEdit] = useState<TimeOffPolicy | null>(null);
    
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [initialSettings, setInitialSettings] = useState<CompanySettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    const currentUser = session.user as Employee;

    const isDirty = useMemo(() => {
        if (activeTab !== 'settings' || !settings || !initialSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings, activeTab]);


    const employeeMap = useMemo(() => {
        return employees.reduce((acc, emp) => {
            const currentProfileRecord = getCurrentProfileRecord(emp);
            acc[emp.id] = currentProfileRecord?.profile.name || `Employee #${emp.id}`;
            return acc;
        }, {} as Record<number, string>);
    }, [employees]);

    const policyMap = useMemo(() => {
        return policies.reduce((acc, pol) => {
            acc[pol.id] = pol.name;
            return acc;
        }, {} as Record<string, string>);
    }, [policies]);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [reqs, pols, { data: emps }, companySettings] = await Promise.all([
                getTimeOffRequests(session.tenantId),
                getTimeOffPolicies(session.tenantId),
                getEmployees(session.tenantId),
                getCompanySettings(session.tenantId),
            ]);
            setRequests(reqs);
            setPolicies(pols);
            setEmployees(emps);
            setSettings(companySettings);
            setInitialSettings(JSON.parse(JSON.stringify(companySettings)));
        } catch (err) {
            console.error(err);
            setError('Failed to load time off data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [session.tenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRequestStatusUpdate = async (requestId: string, status: TimeOffRequestStatus) => {
        try {
            await updateTimeOffRequestStatus(requestId, status, session.tenantId);
            await fetchData();
        } catch (err) {
            setError('Failed to update request status.');
        }
    };

    const handleSavePolicy = async (policy: TimeOffPolicy) => {
        try {
            await saveTimeOffPolicy(policy, session.tenantId);
            setIsPolicyModalOpen(false);
            setPolicyToEdit(null);
            await fetchData();
        } catch (err) {
            setError('Failed to save the policy.');
        }
    };
    
    const handleSaveSettings = async () => {
        if (!settings) return;
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await updateCompanySettings(settings, session.tenantId);
            setSettings(updated);
            setInitialSettings(JSON.parse(JSON.stringify(updated)));
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (e) {
            setError("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleVacationMethodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSettings(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            if (!newSettings.configurations) newSettings.configurations = { statuses: [] };
            newSettings.configurations.vacationPayoutMethod = value;
            return newSettings;
        });
    };

    const openPolicyModal = (policy?: TimeOffPolicy) => {
        setPolicyToEdit(policy || null);
        setIsPolicyModalOpen(true);
    };

    const pendingRequests = useMemo(() => {
        const allPending = requests.filter(r => r.status === TimeOffRequestStatus.Pending);

        // Admins can see and approve all requests.
        if (currentUser.isAdmin) {
            return allPending;
        }

        // For non-admin managers, filter for their direct reports.
        const supervisedEmployeeIds = employees
            .filter(emp => {
                const currentProfileRecord = getCurrentProfileRecord(emp);
                return currentProfileRecord?.profile.supervisorId === currentUser.id;
            })
            .map(emp => emp.id);

        return allPending.filter(req => supervisedEmployeeIds.includes(req.employeeId));
    }, [requests, currentUser, employees]);


    return (
        <>
            <div className="space-y-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`${activeTab === 'requests' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Requests {pendingRequests.length > 0 && <span className="ml-2 inline-block py-0.5 px-2.5 rounded-full text-xs font-medium bg-brand-light text-brand-primary">{pendingRequests.length}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Settings
                        </button>
                    </nav>
                </div>

                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{error}</div>}

                {isLoading && <div className="text-center p-8">Loading...</div>}

                {!isLoading && activeTab === 'requests' && (
                    <Card title="Pending Time Off Requests">
                        {pendingRequests.length === 0 ? (
                            <p className="text-gray-500">There are no pending requests for you to review.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['Employee', 'Type', 'Dates', 'Notes'].map(h => (
                                                <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {pendingRequests.map(req => (
                                            <tr key={req.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employeeMap[req.employeeId] || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{policyMap[req.policyId] || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {req.unit === TimeOffRequestUnit.Hours
                                                        ? `${req.startDate} (${req.hours} hrs)`
                                                        : (req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`)
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{req.notes || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <Button variant="secondary" size="sm" onClick={() => handleRequestStatusUpdate(req.id, TimeOffRequestStatus.Denied)}>Deny</Button>
                                                    <Button variant="primary" size="sm" onClick={() => handleRequestStatusUpdate(req.id, TimeOffRequestStatus.Approved)}>Approve</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                )}

                {!isLoading && activeTab === 'settings' && (
                    <div className="space-y-6">
                        <Card title="Time Off Policies" actions={<Button variant="primary" onClick={() => openPolicyModal()}>Add Policy</Button>}>
                            <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Policy Name', 'Jurisdiction', 'Accrual Method', 'Paid', 'Carryover Timing'].map(h => (
                                            <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {policies.map(pol => (
                                        <tr key={pol.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pol.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pol.jurisdiction.provinceOrState}, {pol.jurisdiction.country}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pol.accrualMethod}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pol.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {pol.isPaid ? 'Paid' : 'Unpaid'}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {pol.carryoverTiming}
                                                    {pol.carryoverTiming === CarryoverTiming.CustomDate && pol.customCarryoverDate && (
                                                        <span className="block text-xs text-gray-400">({pol.customCarryoverDate})</span>
                                                    )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button variant="secondary" size="sm" onClick={() => openPolicyModal(pol)}>Edit</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </Card>
                         <Card title="Vacation Pay Settings" footer={
                             <div className="flex justify-end items-center gap-4">
                                {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
                                <Button variant="primary" onClick={handleSaveSettings} disabled={isSaving || !isDirty}>
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </div>
                         }>
                             <p className="text-sm text-slate-500 mb-4">Set the company-wide policy for how vacation pay is handled on payroll.</p>
                             <div>
                                <label className="block text-sm font-medium text-slate-700">Accrual Method</label>
                                <fieldset className="mt-2 space-y-2">
                                    <div className="flex items-start">
                                        <input
                                            id="method-accrue"
                                            type="radio"
                                            name="vacationPayoutMethod"
                                            value="accrue"
                                            checked={settings?.configurations?.vacationPayoutMethod === 'accrue'}
                                            onChange={handleVacationMethodChange}
                                            className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                                        />
                                        <div className="ml-3">
                                            <label htmlFor="method-accrue" className="text-sm font-medium text-slate-700">Accrue in a bank</label>
                                            <p className="text-xs text-slate-500">Vacation pay is banked for the employee to use later. This is the most common method.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <input
                                            id="method-payout"
                                            type="radio"
                                            name="vacationPayoutMethod"
                                            value="payout"
                                            checked={settings?.configurations?.vacationPayoutMethod === 'payout'}
                                            onChange={handleVacationMethodChange}
                                            className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                                        />
                                        <div className="ml-3">
                                            <label htmlFor="method-payout" className="text-sm font-medium text-slate-700">Pay out each period</label>
                                            <p className="text-xs text-slate-500">Vacation pay is calculated and added to every paycheque. The employee does not maintain a balance.</p>
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                         </Card>
                    </div>
                )}
            </div>
            
            <TimeOffPolicyModal
                isOpen={isPolicyModalOpen}
                onClose={() => setIsPolicyModalOpen(false)}
                onSave={handleSavePolicy}
                policyToEdit={policyToEdit}
            />
        </>
    );
};

export default TimeOff;