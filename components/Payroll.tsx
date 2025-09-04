import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Paystub, Employee, EmployeeProfile, EmployeeProfileRecord, CompanySettings, PaystubItem, EarningCode, DeductionCode, SuperAdmin } from '../types';
import { runPayroll, getEmployees, getCompanySettings, updateCompanySettings, getPayrollHistory, commitPayrollRun } from '../services/api';
import { calculateEmployeePayroll } from '../services/geminiService';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { ArrowPathIcon, DocumentArrowDownIcon, CheckCircleIcon, PencilIcon, BeakerIcon, BoltIcon } from './icons/Icons';
import Avatar from './ui/Avatar';
import { EarningType, DeductionType } from '../types';
import PayrollAIAgent from './PayrollAIAgent';
import PayrollSettings from './payroll/PayrollSettings';
import PayrollVarianceAIAgent from './PayrollVarianceAIAgent';
import PayrollCalculators from './payroll/PayrollCalculators';
import OnDemandPayModal from './payroll/OnDemandPayModal';

interface PayrollProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const getCurrentProfile = (employee: Employee): EmployeeProfileRecord => {
    const today = new Date().toISOString().split('T')[0];
    const currentRecord = employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        // FIX: The argument to localeCompare should be a string (a.effectiveDate), not an EmployeeProfileRecord object (a).
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    
    return currentRecord || employee.profileHistory[0];
};

const getBaseGrossPayForPeriod = (employee: Employee): number => {
    const currentProfile = getCurrentProfile(employee).profile;
    const payPeriodsPerYear: { [key in Employee['payFrequency']]: number } = {
        'Weekly': 52,
        'Bi-Weekly': 26,
        'Semi-Monthly': 24,
        'Monthly': 12,
    };
    return currentProfile.annualSalary / (payPeriodsPerYear[employee.payFrequency] || 24);
};

const Payroll: React.FC<PayrollProps> = ({ session }) => {
    // Payroll run state
    const [step, setStep] = useState<'select' | 'calculating' | 'preview' | 'committed'>('select');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isAdjusting, setIsAdjusting] = useState<number | null>(null); // employeeId
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());
    const [payrollData, setPayrollData] = useState<Paystub[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState('');
    const [progress, setProgress] = useState(0);
    
    const [editingPaystub, setEditingPaystub] = useState<Paystub | null>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
    const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'vacation'>('bonus');
    const [adjustmentError, setAdjustmentError] = useState<string | null>(null);
    
    const payPeriod = "July 16 - July 31, 2024";

    // New state for tabs and settings
    const [activeTab, setActiveTab] = useState<'run' | 'settings' | 'calculators'>('run');
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [previousPayRun, setPreviousPayRun] = useState<Paystub[]>([]);

    const [isOnDemandModalOpen, setIsOnDemandModalOpen] = useState(false);


    const employeeMap = useMemo(() => 
        new Map(employees.map(e => [e.id, e])), 
    [employees]);

    const codeMaps = useMemo(() => {
        if (!settings?.configurations) return { earningCodes: new Map(), deductionCodes: new Map() };
        return {
            earningCodes: new Map(settings.configurations.earningCodes?.map(c => [c.id, c])),
            deductionCodes: new Map(settings.configurations.deductionCodes?.map(c => [c.id, c])),
            garnishmentConfigs: new Map(settings.configurations.garnishments?.canada?.map(g => [g.id, g])),
        };
    }, [settings]);

    useEffect(() => {
        setIsInitialLoading(true);
        Promise.all([
            getEmployees(session.tenantId, { limit: 500 }), // Fetch up to 500 employees for a payroll run
            getCompanySettings(session.tenantId),
            getPayrollHistory(session.tenantId),
        ]).then(([{ data: emps }, companySettings, history]) => {
            setEmployees(emps);
            setSelectedEmployeeIds(new Set(emps.map(e => e.id)));
            setSettings(companySettings);
            if (history && history.length > 0) {
                setPreviousPayRun(history[0]);
            }
        }).catch(err => {
            console.error("Failed to load initial data for payroll", err);
            setError("Could not load employee or company data. Please refresh the page.");
        }).finally(() => {
            setIsInitialLoading(false);
        });
    }, [session.tenantId]);

    const handleToggleEmployee = (employeeId: number) => {
        setSelectedEmployeeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        setSelectedEmployeeIds(new Set(employees.map(e => e.id)));
    };

    const handleDeselectAll = () => {
        setSelectedEmployeeIds(new Set());
    };

    const handlePreviewPayroll = useCallback(async () => {
        const selectedEmployees = employees.filter(e => selectedEmployeeIds.has(e.id));
        if (selectedEmployees.length === 0) {
            setError("Please select at least one employee to run payroll for.");
            return;
        }

        setStep('calculating');
        setError(null);
        setPayrollData(null);
        setProgress(0);

        try {
            const results = await runPayroll(
                selectedEmployees, 
                payPeriod, 
                session.tenantId, 
                (p) => setProgress(p)
            );
            setPayrollData(results);
            setStep('preview');
        } catch (e: any) {
            setError(e.message || "An unknown error occurred while running payroll.");
            setStep('select');
        }
    }, [employees, selectedEmployeeIds, payPeriod, session.tenantId]);

    const handleAdjustPayroll = async () => {
        if (!editingPaystub || !settings?.configurations) return;

        const employee = employeeMap.get(editingPaystub.employeeId);
        if (!employee) {
            setError("Could not find employee to adjust.");
            return;
        }

        if (adjustmentType === 'vacation') {
            const availableBalance = employee.ytd.vacationPay || 0;
            if (adjustmentAmount > availableBalance) {
                setAdjustmentError(`Payout cannot exceed available balance of $${availableBalance.toFixed(2)}.`);
                return;
            }
        }

        setIsAdjusting(editingPaystub.employeeId);
        setAdjustmentError(null);

        try {
            const currentProfile = getCurrentProfile(employee).profile;
            const employeeForCalc = { ...employee, ...currentProfile };

            const { garnishmentConfigs, earningCodes, deductionCodes } = codeMaps;

            const detailedGarnishments = employee.garnishments.map(empGarn => {
                const config = garnishmentConfigs.get(empGarn.configId);
                if (!config) return null;
                return { name: config.name, calculationType: config.calculationType, priority: config.priority, amount: empGarn.amount };
            }).filter((g): g is NonNullable<typeof g> => g !== null);

            const baseGrossPay = getBaseGrossPayForPeriod(employee);
            const earnings: PaystubItem[] = [{
                codeId: 'reg-pay',
                type: EarningType.Regular,
                description: 'Salary',
                amount: baseGrossPay
            }];
            
            if (adjustmentAmount !== 0) {
                const newEarning: PaystubItem = {
                    codeId: adjustmentType === 'bonus' ? 'bonus-disc' : 'vacation-payout',
                    type: adjustmentType === 'bonus' ? EarningType.Bonus : EarningType.Vacation,
                    description: adjustmentType === 'bonus' ? 'One-time adjustment' : 'Vacation Payout',
                    amount: adjustmentAmount,
                };
                earnings.push(newEarning);
            }

            const result = await calculateEmployeePayroll(
                employeeForCalc, 
                payPeriod, 
                earnings,
                employee.recurringDeductions, 
                detailedGarnishments, 
                {
                    earningCodes: settings.configurations.earningCodes || [],
                    deductionCodes: settings.configurations.deductionCodes || [],
                },
                0, // Vacation rate is handled by backend in runPayroll, not needed for single recalc
                'accrue'
            );
            
            const newPaystub: Paystub = { 
                ...result, 
                employeeId: editingPaystub.employeeId,
                employeeName: currentProfile.name, 
                payPeriod,
                earnings,
            };

            setPayrollData(prevData => 
                prevData?.map(p => p.employeeId === newPaystub.employeeId ? newPaystub : p) || null
            );
            setEditingPaystub(null);

        } catch (e: any) {
            console.error(`Error recalculating payroll for ${editingPaystub.employeeName}:`, e);
            setAdjustmentError('Recalculation failed. Please check the network and try again.');
        } finally {
            setIsAdjusting(null);
        }
    };

    const confirmCommitPayroll = async () => {
        setIsConfirmModalOpen(false);
        if (!payrollData) {
            setError("Cannot commit, payroll data is missing.");
            return;
        }
        try {
            await commitPayrollRun(payrollData, session.tenantId);
            setStep('committed');
        } catch (e) {
            setError("Failed to commit payroll run. Please try again.");
        }
    };

    const handleGenerateExport = () => {
        if (!payrollData) return;
        const header = "RecordType,PayorName,FileCreationNumber,PaymentDate,PayeeBankDetails,PayeeName,Amount\n";
        const rows = payrollData.map((p) => {
            const employee = employeeMap.get(p.employeeId);
            const bankDetails = employee?.bankAccounts?.[0];
            const bankString = bankDetails ? `${bankDetails.institution}-${bankDetails.transit}-${bankDetails.account}` : 'MISSING_BANK_DETAILS';
            const payorName = settings?.legalName.replace(/[, ]/g, '') || 'NorthStar_HCM_Inc';
            return `C,${payorName},001,20240731,${bankString},${p.employeeName.replace(' ', '_')},${(p.netPay * 100).toFixed(0)}`;
        }).join('\n');
        setExportData(header + rows);
        setIsExportModalOpen(true);
    };

    const resetPayroll = () => {
        setStep('select');
        setPayrollData(null);
        setError(null);
        if (employees.length > 0) {
             setSelectedEmployeeIds(new Set(employees.map(e => e.id)));
        }
    };

    const totalCost = useMemo(() => {
        if (!payrollData) return 0;
        return payrollData.reduce((sum, p) => {
            const employerCpp = p.employerContributions?.cpp || 0;
            const employerEi = p.employerContributions?.ei || 0;
            return sum + p.grossPay + employerCpp + employerEi;
        }, 0);
    }, [payrollData]);

    const openAdjustmentModal = (paystub: Paystub) => {
        const employee = employeeMap.get(paystub.employeeId);
        if(employee) {
            const adjustment = paystub.earnings.find(e => e.type === EarningType.Bonus || e.type === EarningType.Vacation)?.amount || 0;
            setAdjustmentAmount(adjustment);
            setAdjustmentType(paystub.earnings.some(e => e.type === EarningType.Vacation) ? 'vacation' : 'bonus');
            setEditingPaystub(paystub);
            setAdjustmentError(null);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updatedSettings = await updateCompanySettings(settings, session.tenantId);
            setSettings(updatedSettings);
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    const renderSelectStep = () => (
        <Card title="Step 1 of 3: Select Employees">
            <div className="mb-6">
                <p className="text-slate-500">Select employees to include in this payroll run for the period: <span className="font-medium text-slate-700">{payPeriod}</span>.</p>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-12"><span className="sr-only">Select</span></th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {employees.map(emp => {
                            const profile = getCurrentProfile(emp).profile;
                            return (
                            <tr key={emp.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary" checked={selectedEmployeeIds.has(emp.id)} onChange={() => handleToggleEmployee(emp.id)} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <Avatar name={profile.name} src={profile.avatarUrl} size="md" />
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900">{profile.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{profile.role}</td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={handleSelectAll}>Select All</Button>
                    <Button variant="secondary" size="sm" onClick={handleDeselectAll}>Deselect All</Button>
                </div>
                <div className="text-sm font-medium text-slate-700">
                    {selectedEmployeeIds.size} of {employees.length} employees selected.
                </div>
            </div>
        </Card>
    );

    const renderCalculatingStep = () => (
        <Card title="Step 2 of 3: Calculating Payroll">
            <div className="text-center py-12">
                <ArrowPathIcon className="h-12 w-12 text-brand-primary animate-spin mx-auto" />
                <h3 className="mt-4 text-xl font-medium text-slate-900">Calculating...</h3>
                <p className="mt-2 text-sm text-slate-500">Please wait while we process payroll for {selectedEmployeeIds.size} employees.</p>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-6 max-w-md mx-auto">
                    <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
                </div>
                <p className="mt-2 text-sm font-semibold text-brand-primary">{Math.round(progress)}% Complete</p>
            </div>
        </Card>
    );

    const renderPreviewStep = () => {
        const previousTotalCost = previousPayRun.reduce((sum, p) => sum + p.grossPay + p.employerContributions.cpp + p.employerContributions.ei, 0);
        const variance = totalCost - previousTotalCost;
        const variancePercent = previousTotalCost > 0 ? (variance / previousTotalCost) * 100 : 0;

        return (
            <Card title="Step 2 of 3: Preview & Adjust Payroll">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-center border-b border-slate-200 pb-6">
                    <div><p className="text-sm text-slate-500">Pay Period</p><p className="text-xl font-bold text-slate-800">{payPeriod}</p></div>
                    <div><p className="text-sm text-slate-500">Employees Paid</p><p className="text-xl font-bold text-slate-800">{payrollData?.length}</p></div>
                    <div><p className="text-sm text-slate-500">Total Payroll Cost</p><p className="text-xl font-bold text-slate-800">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                    <div>
                        <p className="text-sm text-slate-500">Variance vs. Last Run</p>
                        <p className={`text-xl font-bold ${variance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {variance >= 0 ? '+' : '-'}${Math.abs(variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({variancePercent.toFixed(1)}%)
                        </p>
                    </div>
                </div>

                {variance !== 0 && (
                    <PayrollVarianceAIAgent
                        currentRun={payrollData || []}
                        previousRun={previousPayRun}
                        employeeMap={employeeMap}
                        session={session}
                    />
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Employee', 'Gross Pay', 'Vacation Accrued', 'Deductions', 'Net Pay', 'Employer Costs', 'Actions'].map(h => (
                                    <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {payrollData?.map((p) => (
                                <tr key={p.employeeId} className={`${isAdjusting === p.employeeId ? 'opacity-50' : ''} hover:bg-slate-50`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.employeeName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${p.grossPay.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-500">${(p.accruedVacationPay || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500">-${p.totalDeductions.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">${p.netPay.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <div>CPP: ${p.employerContributions.cpp.toFixed(2)}</div>
                                    <div>EI: ${p.employerContributions.ei.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Button variant="secondary" size="sm" onClick={() => openAdjustmentModal(p)} disabled={isAdjusting !== null}>
                                            <PencilIcon className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-between">
                    <Button variant="secondary" onClick={() => { setStep('select'); setPayrollData(null); setError(null); }}>Back</Button>
                </div>
            </Card>
        )
    };

    const renderCommittedStep = () => (
        <Card title="Step 3 of 3: Payroll Submitted Successfully!">
             <div className="text-center py-8">
                 <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                 <h3 className="mt-4 text-xl font-medium text-slate-900">Payroll Confirmed</h3>
                 <p className="mt-2 text-sm text-slate-500">Payroll for {payPeriod} has been successfully submitted for {payrollData?.length} employees.</p>
                 <p className="mt-1 text-lg font-semibold text-slate-800">Total Cost: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
             </div>
             <div className="mt-6 flex justify-center space-x-4">
                <Button variant="primary" icon={<DocumentArrowDownIcon />} onClick={handleGenerateExport}>
                    Export Bank File (CPA-005)
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('run')}
                        className={`${activeTab === 'run' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Run Payroll
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('calculators')}
                        className={`${activeTab === 'calculators' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-x-2`}
                    >
                        <BeakerIcon className="h-5 w-5" />
                        Calculators
                    </button>
                    <button
                        onClick={() => setIsOnDemandModalOpen(true)}
                        className={`border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-x-2`}
                    >
                        <BoltIcon className="h-5 w-5" />
                        On-Demand Pay
                    </button>
                </nav>
            </div>
            
            {activeTab === 'run' && (
                <>
                    <PayrollAIAgent
                        step={step}
                        payPeriod={payPeriod}
                        selectedEmployeeCount={selectedEmployeeIds.size}
                        totalPayrollCost={totalCost}
                        onNextStep={handlePreviewPayroll}
                        onCommit={() => setIsConfirmModalOpen(true)}
                        onRunNewPayroll={resetPayroll}
                    />

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    
                    {isInitialLoading && <div className="text-center py-12 text-slate-500">Loading employees...</div>}

                    {!isInitialLoading && (
                        <>
                            {step === 'select' && renderSelectStep()}
                            {step === 'calculating' && renderCalculatingStep()}
                            {step === 'preview' && renderPreviewStep()}
                            {step === 'committed' && renderCommittedStep()}
                        </>
                    )}
                </>
            )}

            {activeTab === 'settings' && (
                <PayrollSettings
                    settings={settings}
                    onSettingsChange={setSettings}
                    onSave={handleSaveSettings}
                    isSaving={isSaving}
                    successMessage={successMessage}
                />
            )}
            
            {activeTab === 'calculators' && (
                <PayrollCalculators 
                    employees={employees}
                    settings={settings}
                    session={session}
                />
            )}


            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirm Payroll Submission"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={confirmCommitPayroll}>Confirm & Submit</Button>
                    </>
                }
            >
                <p>You are about to finalize payroll for <span className="font-semibold">{payrollData?.length} employees</span> for the period <span className="font-semibold">{payPeriod}</span>.</p>
                <p className="mt-2">Total payroll cost will be <span className="font-semibold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>.</p>
                <p className="mt-4 font-medium">This action cannot be undone. Are you sure you want to proceed?</p>
            </Modal>
            
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Generated Bank File (CPA-005 Format)"
                footer={<Button variant="primary" onClick={() => setIsExportModalOpen(false)}>Close</Button>}
            >
                <p className="text-sm text-slate-600 mb-4">This is a simulation of the generated file for your bank. In a real application, this would be a file download.</p>
                <pre className="bg-slate-100 p-4 rounded-md text-xs overflow-x-auto">
                    <code>{exportData}</code>
                </pre>
            </Modal>

            {editingPaystub && (
                <Modal
                    isOpen={!!editingPaystub}
                    onClose={() => setEditingPaystub(null)}
                    title={`Adjust Pay for ${editingPaystub.employeeName}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setEditingPaystub(null)}>Cancel</Button>
                            <Button variant="primary" onClick={handleAdjustPayroll} disabled={isAdjusting !== null} icon={isAdjusting ? <ArrowPathIcon className="animate-spin"/> : null}>
                                {isAdjusting ? 'Recalculating...' : 'Recalculate & Save'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-4">
                        {adjustmentError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
                                <span className="block sm:inline">{adjustmentError}</span>
                            </div>
                        )}
                        <div>
                            <label htmlFor="adjustmentType" className="block text-sm font-medium text-slate-700">Adjustment Type</label>
                            <select
                                id="adjustmentType"
                                value={adjustmentType}
                                onChange={(e) => setAdjustmentType(e.target.value as 'bonus' | 'vacation')}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                            >
                                <option value="bonus">Bonus / Other Adjustment</option>
                                <option value="vacation">Vacation Payout</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="adjustmentAmount" className="block text-sm font-medium text-slate-700">Amount</label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><span className="text-slate-500 sm:text-sm">$</span></div>
                                <input
                                    type="number"
                                    id="adjustmentAmount"
                                    value={adjustmentAmount}
                                    onChange={e => setAdjustmentAmount(Number(e.target.value))}
                                    className="block w-full rounded-md border-slate-300 pl-7 pr-12 focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            {adjustmentType === 'vacation' && (
                                <p className="mt-1 text-xs text-slate-500">Available vacation balance: <span className="font-medium">${(employeeMap.get(editingPaystub.employeeId)?.ytd.vacationPay || 0).toFixed(2)}</span></p>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                           <p className="text-sm text-slate-600">Base Pay for Period: <span className="font-medium">${(getBaseGrossPayForPeriod(employeeMap.get(editingPaystub.employeeId)!) || 0).toFixed(2)}</span></p>
                           <p className="text-md font-semibold text-slate-800 mt-1">New Gross Pay: <span className="font-bold">${(getBaseGrossPayForPeriod(employeeMap.get(editingPaystub.employeeId)!) + (adjustmentType === 'bonus' ? adjustmentAmount : 0)).toFixed(2)}</span></p>
                        </div>
                    </div>
                </Modal>
            )}
            
            {isOnDemandModalOpen && (
                <OnDemandPayModal
                    isOpen={isOnDemandModalOpen}
                    onClose={() => setIsOnDemandModalOpen(false)}
                    employees={employees}
                    session={session}
                    onSuccess={() => {
                        // Refetch employee data after an advance is processed to get the new deduction
                        getEmployees(session.tenantId, { limit: 500 }).then(({ data: emps }) => {
                            setEmployees(emps);
                        });
                    }}
                />
            )}
        </div>
    );
};

export default Payroll;