


import React, { useState, useEffect, useMemo } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { getPayrollHistory, getEmployees, getCompanySettings } from '../services/api';
import type { Paystub, Employee, EmployeeProfile, CompanySettings, ROEData, SuperAdmin } from '../types';
import { DeductionType, ROEReasonCode } from '../types';
import { DocumentArrowDownIcon, ArrowPathIcon } from './icons/Icons';
import Checkbox from './ui/Checkbox';
import Modal from './ui/Modal';

interface ReportsProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

interface RemittanceSummary {
    payPeriod: string;
    totalEmployees: number;
    totalGross: number;
    totalIncomeTax: number;
    totalCPP: number;
    totalEI: number;
    employerCPP: number;
    employerEI: number;
    totalRemittance: number;
}

// Helper to get the current profile from an employee's history
const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    const currentRecord = employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    
    return currentRecord ? currentRecord.profile : employee.profileHistory[0].profile;
};

// Available columns for the custom employee report
const EMPLOYEE_REPORT_COLUMNS = [
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'name', label: 'Full Name' },
  { key: 'role', label: 'Role' },
  { key: 'annualSalary', label: 'Annual Salary' },
  { key: 'hourlyRate', label: 'Hourly Rate' },
  { key: 'province', label: 'Province' },
  { key: 'supervisorName', label: 'Supervisor' },
  { key: 'payFrequency', label: 'Pay Frequency' },
  { key: 'sin', label: 'SIN (Masked)' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
];

const Reports: React.FC<ReportsProps> = ({ session }) => {
    const [payrollHistory, setPayrollHistory] = useState<Paystub[][]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRunIndex, setSelectedRunIndex] = useState(0);

    // State for Custom Report Builder
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set(['employeeId', 'name', 'role', 'annualSalary']));
    const [reportData, setReportData] = useState<Record<string, any>[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // State for ROE Generator
    const [selectedRoeEmployeeId, setSelectedRoeEmployeeId] = useState<string>('');
    const [roeReason, setRoeReason] = useState<ROEReasonCode>(ROEReasonCode.K);
    const [lastDayWorked, setLastDayWorked] = useState('');
    const [finalPayPeriodEndDate, setFinalPayPeriodEndDate] = useState('');
    const [isRoeModalOpen, setIsRoeModalOpen] = useState(false);
    const [roeData, setRoeData] = useState<ROEData | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const [history, { data: emps }, settings] = await Promise.all([
                    getPayrollHistory(session.tenantId), 
                    getEmployees(session.tenantId, {}), 
                    getCompanySettings(session.tenantId)
                ]);
                setPayrollHistory(history.sort((a, b) => (b[0]?.payPeriod || '').localeCompare(a[0]?.payPeriod || '')));
                setEmployees(emps);
                setCompanySettings(settings);
                if (emps.length > 0) {
                    setSelectedRoeEmployeeId(String(emps[0].id));
                }
            } catch (error) {
                console.error("Failed to fetch reports data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [session.tenantId]);

    const handleGenerateReport = () => {
        setIsGenerating(true);
        setReportData(null);

        // Simulate processing time
        setTimeout(async () => {
            try {
                // In a real app, this might be a separate API endpoint. Here we fetch all employees for the report.
                const { data: allEmployees } = await getEmployees(session.tenantId, { limit: 200000 }); // Un-paginated for full report
                const employeeNameMap = new Map(allEmployees.map(e => [e.id, getCurrentProfile(e).name]));

                const flattenedData = allEmployees.map(emp => {
                    const currentProfile = getCurrentProfile(emp);
                    const supervisorName = currentProfile.supervisorId ? employeeNameMap.get(currentProfile.supervisorId) : 'N/A';
                    return {
                        id: emp.id,
                        employeeId: emp.employeeId,
                        name: currentProfile.name,
                        role: currentProfile.role,
                        annualSalary: currentProfile.annualSalary,
                        hourlyRate: currentProfile.hourlyRate,
                        province: currentProfile.province,
                        supervisorName: supervisorName,
                        payFrequency: emp.payFrequency,
                        sin: `***-***-${emp.payroll.canada?.sin.slice(-3) || '***'}`,
                        dateOfBirth: currentProfile.dateOfBirth,
                    };
                });
                setReportData(flattenedData);
            } catch (error) {
                console.error("Failed to generate report data", error);
            } finally {
                setIsGenerating(false);
            }
        }, 500);
    };
    
    const handleDownloadCSV = () => {
        if (!reportData || reportData.length === 0 || selectedColumns.size === 0) return;

        const columnsToExport = EMPLOYEE_REPORT_COLUMNS.filter(c => selectedColumns.has(c.key));
        const headers = columnsToExport.map(c => c.label).join(',');

        const rows = reportData.map(row => {
            return columnsToExport.map(col => {
                const value = row[col.key];
                const escaped = ('' + (value ?? '')).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',');
        }).join('\n');

        const csvString = `${headers}\n${rows}`;
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'custom_employee_report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedColumns.size === EMPLOYEE_REPORT_COLUMNS.length) {
            setSelectedColumns(new Set());
        } else {
            setSelectedColumns(new Set(EMPLOYEE_REPORT_COLUMNS.map(c => c.key)));
        }
    };

    const handleGenerateRoe = () => {
        if (!selectedRoeEmployeeId || !lastDayWorked || !finalPayPeriodEndDate || !companySettings) {
            alert("Please fill in all fields for the ROE.");
            return;
        }
        const employee = employees.find(e => e.id === Number(selectedRoeEmployeeId));
        if (!employee) {
            alert("Selected employee not found.");
            return;
        }

        const currentProfile = getCurrentProfile(employee);
        const totalInsurableHours = (currentProfile.weeklyHours || 40) * 52; // Simplified
        const totalInsurableEarnings = Math.min(currentProfile.annualSalary, 63200); // Simplified with 2024 EI max

        const data: ROEData = {
            employee,
            companySettings,
            reasonCode: roeReason,
            lastDayWorked,
            finalPayPeriodEndDate,
            totalInsurableHours,
            totalInsurableEarnings
        };
        setRoeData(data);
        setIsRoeModalOpen(true);
    };


    const remittanceSummary = useMemo((): RemittanceSummary | null => {
        if (!payrollHistory || payrollHistory.length === 0) return null;

        const selectedRun = payrollHistory[selectedRunIndex];
        if (!selectedRun) return null;

        const summary = selectedRun.reduce((acc, paystub) => {
            acc.totalGross += paystub.grossPay;
            const federalTax = paystub.deductions.find(d => d.type === DeductionType.FederalTax)?.amount || 0;
            const provincialTax = paystub.deductions.find(d => d.type === DeductionType.ProvincialTax)?.amount || 0;
            const cpp = paystub.deductions.find(d => d.type === DeductionType.CPP)?.amount || 0;
            const ei = paystub.deductions.find(d => d.type === DeductionType.EI)?.amount || 0;

            acc.totalIncomeTax += federalTax + provincialTax;
            acc.totalCPP += cpp;
            acc.totalEI += ei;
            acc.employerCPP += paystub.employerContributions.cpp;
            acc.employerEI += paystub.employerContributions.ei;
            return acc;
        }, {
            totalGross: 0, totalIncomeTax: 0, totalCPP: 0, totalEI: 0, employerCPP: 0, employerEI: 0
        });

        const totalRemittance = summary.totalIncomeTax + (summary.totalCPP + summary.employerCPP) + (summary.totalEI + summary.employerEI);

        return {
            payPeriod: selectedRun[0].payPeriod, totalEmployees: selectedRun.length, totalGross: summary.totalGross,
            totalIncomeTax: summary.totalIncomeTax, totalCPP: summary.totalCPP, totalEI: summary.totalEI,
            employerCPP: summary.employerCPP, employerEI: summary.employerEI, totalRemittance
        };
    }, [payrollHistory, selectedRunIndex]);

    const handlePreBuiltReport = (reportTitle: string) => {
        alert(`Generating the "${reportTitle}" report is a feature coming soon!`);
    };

    const formatCurrency = (amount: number) => {
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) {
        return <Card title="Reports"><div className="text-center p-8">Loading report data...</div></Card>;
    }

    return (
        <div className="space-y-8">
            <Card title="CRA Remittance Report">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <p className="text-gray-600 max-w-2xl">Summary of payroll deductions and contributions to be remitted to the Canada Revenue Agency (CRA).</p>
                    <div>
                        <label htmlFor="pay-period-select" className="block text-sm font-medium text-gray-700">Select Pay Period</label>
                        <select id="pay-period-select" value={selectedRunIndex} onChange={(e) => setSelectedRunIndex(Number(e.target.value))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md">
                            {payrollHistory.map((run, index) => (<option key={index} value={index}>{run[0].payPeriod}</option>))}
                        </select>
                    </div>
                </div>
                {remittanceSummary ? (
                    <div className="bg-gray-50 rounded-lg p-6 border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-6">
                             <div><p className="text-sm text-gray-500">Employees Paid</p><p className="text-2xl font-bold text-gray-800">{remittanceSummary.totalEmployees}</p></div>
                             <div><p className="text-sm text-gray-500">Total Gross Payroll</p><p className="text-2xl font-bold text-gray-800">{formatCurrency(remittanceSummary.totalGross)}</p></div>
                             <div className="bg-brand-light p-4 rounded-lg"><p className="text-sm text-brand-dark font-semibold">Total Remittance Due</p><p className="text-3xl font-bold text-brand-primary">{formatCurrency(remittanceSummary.totalRemittance)}</p></div>
                        </div>
                        <div className="border-t pt-6">
                             <h4 className="text-lg font-medium text-gray-900 mb-4">Remittance Breakdown</h4>
                             <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="p-3 bg-white rounded-md border"><dt className="text-sm font-medium text-gray-500">Income Tax</dt><dd className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(remittanceSummary.totalIncomeTax)}</dd></div>
                                <div className="p-3 bg-white rounded-md border"><dt className="text-sm font-medium text-gray-500">CPP Contributions</dt><dd className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(remittanceSummary.totalCPP + remittanceSummary.employerCPP)}</dd><dd className="text-xs text-gray-500">Employee: {formatCurrency(remittanceSummary.totalCPP)} + Employer: {formatCurrency(remittanceSummary.employerCPP)}</dd></div>
                                <div className="p-3 bg-white rounded-md border"><dt className="text-sm font-medium text-gray-500">EI Premiums</dt><dd className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(remittanceSummary.totalEI + remittanceSummary.employerEI)}</dd><dd className="text-xs text-gray-500">Employee: {formatCurrency(remittanceSummary.totalEI)} + Employer: {formatCurrency(remittanceSummary.employerEI)}</dd></div>
                             </dl>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">No payroll data available to generate a report.</p>
                )}
            </Card>

            <Card title="Year-End Reports">
                 <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div><h4 className="text-md font-semibold text-gray-800">T4 Slips & Summary</h4><p className="text-sm text-gray-500 mt-1 max-w-2xl">Generate individual T4 slips and a T4 summary for CRA filing at year-end.</p></div>
                    <div className="flex-shrink-0 mt-3 sm:mt-0"><Button variant="secondary" size="sm" onClick={() => handlePreBuiltReport('T4 Slips & Summary')}>Generate T4s</Button></div>
                  </div>
            </Card>

            <Card title="Record of Employment (ROE)">
                <p className="text-gray-600 mb-6 max-w-3xl">Generate a Record of Employment for an employee who has stopped working. The data is based on their profile and a simplified calculation of their last 52 weeks of work.</p>
                <div className="p-6 bg-gray-50 rounded-lg border space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="roe-employee" className="block text-sm font-medium text-gray-700">Employee</label>
                            <select id="roe-employee" value={selectedRoeEmployeeId} onChange={e => setSelectedRoeEmployeeId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{getCurrentProfile(emp).name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="roe-reason" className="block text-sm font-medium text-gray-700">Reason for Issuing ROE</label>
                            <select id="roe-reason" value={roeReason} onChange={e => setRoeReason(e.target.value as ROEReasonCode)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm">
                                {Object.entries(ROEReasonCode).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="last-day-worked" className="block text-sm font-medium text-gray-700">Last Day Worked</label>
                            <input type="date" id="last-day-worked" value={lastDayWorked} onChange={e => setLastDayWorked(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="final-pay-period-end" className="block text-sm font-medium text-gray-700">Final Pay Period End Date</label>
                            <input type="date" id="final-pay-period-end" value={finalPayPeriodEndDate} onChange={e => setFinalPayPeriodEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm" />
                        </div>
                    </div>
                    <div className="text-right pt-2">
                        <Button variant="primary" onClick={handleGenerateRoe}>Generate ROE</Button>
                    </div>
                </div>
            </Card>

             <Card title="Other Reports">
                <div className="divide-y divide-gray-200">
                    <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div><h4 className="text-md font-semibold text-gray-800">Payroll Register</h4><p className="text-sm text-gray-500 mt-1 max-w-2xl">A detailed summary of all employee payments, deductions, and contributions for a selected pay period.</p></div>
                        <div className="flex-shrink-0 mt-3 sm:mt-0"><Button variant="secondary" size="sm" onClick={() => handlePreBuiltReport('Payroll Register')}>Generate Report</Button></div>
                    </div>
                     <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div><h4 className="text-md font-semibold text-gray-800">Employee Directory</h4><p className="text-sm text-gray-500 mt-1 max-w-2xl">A complete list of all active employees with their contact information and job details.</p></div>
                        <div className="flex-shrink-0 mt-3 sm:mt-0"><Button variant="secondary" size="sm" onClick={() => handlePreBuiltReport('Employee Directory')}>Generate Report</Button></div>
                    </div>
                </div>
            </Card>
            <Card title="Custom Report Builder">
                <p className="text-gray-600 mb-6 max-w-3xl">Build your own report by selecting the employee data fields you need. Generate a preview and download the results as a CSV file.</p>
                <div className="p-6 bg-gray-50 rounded-lg border space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-800">1. Select Columns</h4>
                        <div className="flex items-center space-x-4 my-2"><Button variant="secondary" size="sm" onClick={toggleSelectAll}>{selectedColumns.size === EMPLOYEE_REPORT_COLUMNS.length ? 'Deselect All' : 'Select All'}</Button></div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2 border-t">
                            {EMPLOYEE_REPORT_COLUMNS.map(col => (<Checkbox key={col.key} label={col.label} checked={selectedColumns.has(col.key)} onChange={() => toggleColumn(col.key)} />))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-800">2. Generate Report</h4>
                        <Button variant="primary" onClick={handleGenerateReport} disabled={isGenerating || selectedColumns.size === 0} icon={isGenerating ? <ArrowPathIcon className="animate-spin" /> : null} className="mt-2">{isGenerating ? 'Generating...' : 'Generate Report'}</Button>
                    </div>
                </div>
                {reportData && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4"><h4 className="text-lg font-semibold text-gray-800">Report Preview ({reportData.length} records)</h4><Button variant="primary" icon={<DocumentArrowDownIcon />} onClick={handleDownloadCSV}>Download as CSV</Button></div>
                        <div className="overflow-x-auto border rounded-lg max-h-96">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>{EMPLOYEE_REPORT_COLUMNS.filter(c => selectedColumns.has(c.key)).map(col => (<th key={col.key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>))}</tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.map((row, rowIndex) => (<tr key={rowIndex}>{EMPLOYEE_REPORT_COLUMNS.filter(c => selectedColumns.has(c.key)).map(col => (<td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[col.key]}</td>))}</tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Card>
            {roeData && (
                 <Modal isOpen={isRoeModalOpen} onClose={() => setIsRoeModalOpen(false)} title="Record of Employment (ROE) Preview" footer={<><Button variant="secondary" onClick={() => alert('PDF download is a simulated feature.')}>Download as PDF</Button><Button variant="primary" onClick={() => setIsRoeModalOpen(false)}>Close</Button></>}>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 font-sans text-sm">
                        <h2 className="text-center font-bold text-lg mb-4">RECORD OF EMPLOYMENT</h2>
                        <div className="grid grid-cols-2 gap-px bg-gray-300 border border-gray-300">
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">1. Serial No.</strong> SIMULATED</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">2. Pay Period Type</strong> {roeData.employee.payFrequency}</div>
                            <div className="p-2 bg-white col-span-2"><strong className="block text-xs text-gray-500">4. Employer's Name and Address</strong> {roeData.companySettings.legalName}, {roeData.companySettings.address.street}, {roeData.companySettings.address.city} {roeData.companySettings.address.province} {roeData.companySettings.address.postalCode}</div>
                            <div className="p-2 bg-white col-span-2"><strong className="block text-xs text-gray-500">6. CRA Business Number</strong> {roeData.companySettings.jurisdictionInfo.canada?.businessNumber}</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">8. Social Insurance Number</strong> {roeData.employee.payroll.canada?.sin}</div>
                            <div className="p-2 bg-white col-span-2"><strong className="block text-xs text-gray-500">9. Employee's Name and Address</strong> {getCurrentProfile(roeData.employee).name}, {getCurrentProfile(roeData.employee).address.street}, {getCurrentProfile(roeData.employee).address.city} {getCurrentProfile(roeData.employee).address.province} {getCurrentProfile(roeData.employee).address.postalCode}</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">11. Last Day for Which Paid</strong> {roeData.lastDayWorked}</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">12. Final Pay Period Ending Date</strong> {roeData.finalPayPeriodEndDate}</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">15B. Total Insurable Hours</strong> {roeData.totalInsurableHours}</div>
                            <div className="p-2 bg-white"><strong className="block text-xs text-gray-500">15C. Total Insurable Earnings</strong> {formatCurrency(roeData.totalInsurableEarnings)}</div>
                            <div className="p-2 bg-white col-span-2"><strong className="block text-xs text-gray-500">16. Reason for Issuing this ROE</strong> {roeData.reasonCode}</div>
                        </div>
                         <p className="text-xs text-gray-500 mt-4 text-center">This is a simplified, non-official preview for demonstration purposes.</p>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Reports;