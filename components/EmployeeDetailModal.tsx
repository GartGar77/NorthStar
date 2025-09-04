







import React, { useState, useMemo, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { Employee, EmployeeProfileRecord, TimelineRecordStatus, TimeOffPolicy, GarnishmentConfiguration, EarningCode, DeductionCode, SuperAdmin, EmployeeDocument, DocumentCategory, CompanySettings } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import Avatar from './ui/Avatar';
import { getTimeOffPolicies, getCompanySettings, uploadEmployeeDocument, deleteEmployeeDocument, updateDocumentVisibility } from '../services/api';
import Checkbox from './ui/Checkbox';

interface EmployeeDetailModalProps {
  employee: Employee;
  onClose: () => void;
  onEdit: (employee: Employee, record: EmployeeProfileRecord) => void;
  // FIX: Add session prop for multi-tenancy context
  session: { user: Employee | SuperAdmin, tenantId?: string };
  settings: CompanySettings | null;
}

// A simple toggle switch component
const ToggleSwitch: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ checked, onChange, disabled, ...props }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        {...props}
      />
      <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
    </label>
  );
};


const getRecordStatus = (effectiveDate: string, today: string, isCurrent: boolean): TimelineRecordStatus => {
  if (isCurrent) return 'CURRENT';
  if (effectiveDate > today) return 'FUTURE';
  return 'PAST';
};

const StatusBadge: React.FC<{ status: TimelineRecordStatus }> = ({ status }) => {
  const styles = {
    CURRENT: 'bg-blue-100 text-blue-800',
    PAST: 'bg-gray-100 text-gray-800',
    FUTURE: 'bg-purple-100 text-purple-800',
  };
  return <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};


const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ employee, onClose, onEdit, session, settings }) => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const sortedHistory = useMemo(() => 
    [...employee.profileHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)), 
    [employee.profileHistory]
  );
  
  const initialIndex = useMemo(() => {
    // Replicate findLastIndex for broader JS environment compatibility.
    let currentIndex = -1;
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
        if (sortedHistory[i].effectiveDate <= today) {
            currentIndex = i;
            break;
        }
    }
    return currentIndex > -1 ? currentIndex : 0;
  }, [sortedHistory, today]);

  const [historyIndex, setHistoryIndex] = useState(initialIndex);
  const [activeTab, setActiveTab] = useState<'profile' | 'payroll' | 'time_off' | 'additional' | 'documents'>('profile');
  const [policies, setPolicies] = useState<TimeOffPolicy[]>([]);
  const [codeMaps, setCodeMaps] = useState({
    garnishment: new Map<string, GarnishmentConfiguration>(),
    earning: new Map<string, EarningCode>(),
    deduction: new Map<string, DeductionCode>(),
  });

  const documentCategories = settings?.configurations?.documentCategories || ['Other'];

  const [documents, setDocuments] = useState<EmployeeDocument[]>(employee.documents || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string|null>(null);
  const [newDocFile, setNewDocFile] = useState<File|null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>(documentCategories[0]);
  const [newDocVisible, setNewDocVisible] = useState(true);


  useEffect(() => {
    if (!session.tenantId) return;
    Promise.all([
      // FIX: Pass tenantId to API calls
      getTimeOffPolicies(session.tenantId),
      getCompanySettings(session.tenantId)
    ]).then(([policies, settings]) => {
      setPolicies(policies);
      const configs = settings.configurations;
      if (configs) {
        setCodeMaps({
            garnishment: new Map(configs.garnishments?.canada?.map(c => [c.id, c])),
            earning: new Map(configs.earningCodes?.map(c => [c.id, c])),
            deduction: new Map(configs.deductionCodes?.map(c => [c.id, c])),
        });
      }
    }).catch(console.error);
    setDocuments(employee.documents || []);
  }, [session.tenantId, employee]);

  const policyMap = useMemo(() => {
    return policies.reduce((acc, pol) => {
        acc[pol.id] = pol.name;
        return acc;
    }, {} as Record<string, string>);
  }, [policies]);
  
  const currentRecord = sortedHistory[historyIndex];
  const isCurrentActiveRecord = historyIndex === initialIndex;
  const status = getRecordStatus(currentRecord.effectiveDate, today, isCurrentActiveRecord);

  const handlePrev = () => setHistoryIndex(i => Math.max(0, i - 1));
  const handleNext = () => setHistoryIndex(i => Math.min(sortedHistory.length - 1, i + 1));
  
  const canadianPayroll = employee.payroll.canada;
  const supervisorName = currentRecord.profile.supervisorName || 'N/A';
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setNewDocFile(file);
        setNewDocName(file.name); // Pre-fill name with filename
    }
  };

  const handleUploadDocument = async () => {
    if (!newDocFile || !newDocName) {
        setUploadError("Please select a file and provide a document name.");
        return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
        const uploaderName = (session.user as Employee).profileHistory[0].profile.name || 'Admin User';
        const newDocument = await uploadEmployeeDocument(
            employee.id,
            { name: newDocName, category: newDocCategory, file: newDocFile },
            uploaderName,
            'Admin',
            newDocVisible,
            session.tenantId!
        );
        setDocuments(prev => [...prev, newDocument]);
        // Reset form
        setNewDocFile(null);
        setNewDocName('');
        setNewDocCategory(documentCategories[0]);
        setNewDocVisible(true);
    } catch (err) {
        setUploadError("Failed to upload document. Please try again.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm("Are you sure you want to delete this document? This cannot be undone.")) {
        return;
    }
    try {
        await deleteEmployeeDocument(employee.id, docId, session.tenantId!);
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (err) {
        alert("Failed to delete document. Please try again.");
    }
  };
  
  const handleVisibilityChange = async (docId: string, newVisibility: boolean) => {
    // Optimistic UI update
    setDocuments(docs => docs.map(d => d.id === docId ? { ...d, visibleToEmployee: newVisibility } : d));
    try {
        await updateDocumentVisibility(employee.id, docId, newVisibility, session.tenantId!);
    } catch (error) {
        // Revert on error
        setDocuments(docs => docs.map(d => d.id === docId ? { ...d, visibleToEmployee: !newVisibility } : d));
        alert('Failed to update document visibility.');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Employee Details">
      <div className="space-y-4">
        <div className="flex items-center space-x-4 border-b pb-4">
            <Avatar src={currentRecord.profile.avatarUrl} name={currentRecord.profile.name} size="lg" />
            <div>
                <h3 className="text-xl font-bold text-gray-900">{currentRecord.profile.name}</h3>
                <div className="flex items-center gap-x-2 mt-1">
                    <p className="text-md text-gray-600">{currentRecord.profile.role}</p>
                    {currentRecord.profile.payType === 'Hourly' ? (
                        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Hourly
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                            Salaried
                        </span>
                    )}
                </div>
            </div>
        </div>

        {/* Timeline Navigation */}
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <Button size="sm" onClick={handlePrev} disabled={historyIndex === 0} aria-label="Previous record">
                <ChevronLeftIcon className="h-5 w-5" />
            </Button>
            <div className="text-center">
                <div className="font-semibold text-gray-800">
                    Effective: {new Date(currentRecord.effectiveDate + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="mt-1 flex items-center justify-center space-x-2">
                    <StatusBadge status={status} />
                    <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-700">{currentRecord.status}</span>
                </div>
            </div>
            <Button size="sm" onClick={handleNext} disabled={historyIndex === sortedHistory.length - 1} aria-label="Next record">
                <ChevronRightIcon className="h-5 w-5" />
            </Button>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`${activeTab === 'profile' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Profile & Job
                </button>
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`${activeTab === 'payroll' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Payroll
                </button>
                 <button
                    onClick={() => setActiveTab('documents')}
                    className={`${activeTab === 'documents' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Documents
                </button>
                <button
                    onClick={() => setActiveTab('time_off')}
                    className={`${activeTab === 'time_off' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Time Off
                </button>
                 <button
                    onClick={() => setActiveTab('additional')}
                    className={`${activeTab === 'additional' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    Additional Details
                </button>
            </nav>
        </div>


        {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="text-md text-gray-900 font-mono">{employee.employeeId}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Role</label>
                    <p className="text-md text-gray-900">{currentRecord.profile.role}</p>
                </div>
                 <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Annual Salary</label>
                    <p className="text-md text-gray-900">${currentRecord.profile.annualSalary.toLocaleString()}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Hourly Rate</label>
                    <p className="text-md text-gray-900">${currentRecord.profile.hourlyRate?.toFixed(2) || 'N/A'}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Weekly Hours</label>
                    <p className="text-md text-gray-900">{currentRecord.profile.weeklyHours || 'N/A'}</p>
                </div>
                 <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Province</label>
                    <p className="text-md text-gray-900">{currentRecord.profile.province}</p>
                </div>
                 <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Pay Frequency</label>
                    <p className="text-md text-gray-900">{employee.payFrequency}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Supervisor</label>
                    <p className="text-md text-gray-900">{supervisorName}</p>
                </div>
                 <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-md text-gray-900">{new Date(currentRecord.profile.dateOfBirth + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                {currentRecord.profile.address && (
                    <div className="md:col-span-2 border-b pb-2">
                        <label className="block text-sm font-medium text-gray-500">Home Address</label>
                        <address className="text-md text-gray-900 not-italic mt-1">
                            {currentRecord.profile.address.street && <div>{currentRecord.profile.address.street}</div>}
                            <div>{`${currentRecord.profile.address.city}, ${currentRecord.profile.address.province} ${currentRecord.profile.address.postalCode}`}</div>
                            {currentRecord.profile.address.country && <div>{currentRecord.profile.address.country}</div>}
                        </address>
                    </div>
                )}
                <div className="md:col-span-2 border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Phone Numbers</label>
                    {currentRecord.profile.phoneNumbers && currentRecord.profile.phoneNumbers.length > 0 ? (
                        <ul className="mt-1 text-md text-gray-900 space-y-1">
                            {currentRecord.profile.phoneNumbers.map((phone, index) => (
                                <li key={index}><span className="font-semibold">{phone.type}:</span> {phone.number}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-md text-gray-900 mt-1">N/A</p>
                    )}
                </div>
                <div className="md:col-span-2 border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Email Addresses</label>
                    {currentRecord.profile.emails && currentRecord.profile.emails.length > 0 ? (
                        <ul className="mt-1 text-md text-gray-900 space-y-1">
                            {currentRecord.profile.emails.map((email, index) => (
                                <li key={index}><span className="font-semibold">{email.type}:</span> {email.address}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-md text-gray-900 mt-1">N/A</p>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'payroll' && canadianPayroll && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Social Insurance Number</label>
                    <p className="text-md text-gray-900 font-mono tracking-wider">{`***-***-${canadianPayroll.sin.slice(-3)}`}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Pay Frequency</label>
                    <p className="text-md text-gray-900">{employee.payFrequency}</p>
                </div>
                <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Federal TD1 Amount</label>
                    <p className="text-md text-gray-900">${canadianPayroll.td1Federal.toLocaleString()}</p>
                </div>
                 <div className="border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Provincial TD1 Amount</label>
                    <p className="text-md text-gray-900">${canadianPayroll.td1Provincial.toLocaleString()}</p>
                </div>
                <div className="md:col-span-2 border-b pb-2">
                    <label className="block text-sm font-medium text-gray-500">Direct Deposit Accounts</label>
                    <div className="mt-2 space-y-2">
                        {employee.bankAccounts.map(acc => (
                            <div key={acc.id} className="p-2 bg-slate-50 rounded-md text-sm">
                                <p className="font-semibold">{acc.nickname || 'Bank Account'} ({acc.allocationPercent}%)</p>
                                <p className="text-slate-600">Institution: {acc.institution}, Transit: {acc.transit}, Account: ...{acc.account.slice(-4)}</p>
                            </div>
                        ))}
                    </div>
                </div>
                {(employee.recurringEarnings?.length > 0) && (
                     <div className="md:col-span-2 border-b pb-2">
                        <label className="block text-sm font-medium text-gray-500">Recurring Earnings</label>
                        <ul className="list-disc list-inside text-md text-gray-900">
                           {employee.recurringEarnings.map((e, i) => {
                                const code = codeMaps.earning.get(e.codeId);
                                return <li key={i}>{code?.name || 'Unknown Earning'}: ${e.amount.toFixed(2)}</li>
                           })}
                        </ul>
                    </div>
                )}
                 {(employee.recurringDeductions?.length > 0) && (
                     <div className="md:col-span-2 border-b pb-2">
                        <label className="block text-sm font-medium text-gray-500">Recurring Deductions</label>
                        <ul className="list-disc list-inside text-md text-gray-900">
                           {employee.recurringDeductions.map((d, i) => {
                                const code = codeMaps.deduction.get(d.codeId);
                                return <li key={i}>{code?.name || 'Unknown Deduction'}: ${d.amount.toFixed(2)}</li>
                           })}
                        </ul>
                    </div>
                )}
                {employee.garnishments.length > 0 && (
                     <div className="md:col-span-2 border-b pb-2">
                        <label className="block text-sm font-medium text-gray-500">Active Garnishments</label>
                        <ul className="list-disc list-inside text-md text-gray-900">
                           {employee.garnishments.map((g, i) => {
                                const config = codeMaps.garnishment.get(g.configId);
                                if (!config) return <li key={i}>Unknown Garnishment</li>;
                                const isPercent = config.calculationType.includes('%');
                                return <li key={i}>{config.name}: {isPercent ? `${g.amount}%` : `$${g.amount.toFixed(2)}`}</li>
                           })}
                        </ul>
                    </div>
                )}
            </div>
        )}
        
        {activeTab === 'documents' && (
            <div className="pt-4 space-y-6">
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Uploaded Documents</h4>
                    {documents.length === 0 ? (
                        <p className="text-sm text-center py-8 text-gray-500">No documents on file.</p>
                    ) : (
                        <div className="overflow-x-auto border rounded-md">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">Document</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">Uploaded By</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium uppercase">Visible to Employee</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map(doc => (
                                        <tr key={doc.id}>
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-slate-900">{doc.name}</p>
                                                <p className="text-xs text-slate-500">{doc.category} - {doc.uploadDate}</p>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-600">
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${doc.uploadedBy === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                    {doc.uploadedBy}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <ToggleSwitch
                                                    checked={doc.visibleToEmployee}
                                                    onChange={(e) => handleVisibilityChange(doc.id, e.target.checked)}
                                                    disabled={doc.uploadedBy === 'Employee'}
                                                    title={doc.uploadedBy === 'Employee' ? "Employee-uploaded documents are always visible" : "Toggle visibility"}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right space-x-2">
                                                <Button variant="secondary" size="sm" onClick={() => alert(`Simulating download of ${doc.name}`)}>Download</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDeleteDocument(doc.id)}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t">
                    <h4 className="text-md font-semibold text-gray-800">Upload New Document</h4>
                    {uploadError && <p className="text-sm text-red-600 my-2">{uploadError}</p>}
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">File</label>
                            <input type="file" onChange={handleFileChange} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand-primary hover:file:bg-indigo-200"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Document Name</label>
                            <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} className="mt-1 block w-full rounded-md border-slate-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <select value={newDocCategory} onChange={e => setNewDocCategory(e.target.value as DocumentCategory)} className="mt-1 block w-full rounded-md border-slate-300">
                            {documentCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <Checkbox 
                                label="Make visible to employee"
                                checked={newDocVisible}
                                onChange={e => setNewDocVisible(e.target.checked)}
                            />
                        </div>
                        <div className="sm:col-span-2 text-right">
                            <Button type="button" variant="primary" onClick={handleUploadDocument} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : 'Upload Document'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'time_off' && (
            <div className="pt-4 space-y-2">
                <h4 className="text-md font-semibold text-gray-800">Assigned Policies & Balances</h4>
                {Object.keys(employee.timeOffBalances).length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {Object.entries(employee.timeOffBalances).map(([policyId, balance]) => (
                            <li key={policyId} className="py-2 flex justify-between items-center">
                                <span className="text-sm text-gray-700">{policyMap[policyId] || policyId}</span>
                                <span className="text-sm font-medium text-gray-900">{balance} hours</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No time off policies have been assigned to this employee.</p>
                )}
            </div>
        )}

        {activeTab === 'additional' && (
            <div className="pt-4 space-y-6">
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Certifications</h4>
                    {(!employee.certifications || employee.certifications.length === 0) ? (
                        <p className="text-sm text-gray-500 mt-2">No certifications on file.</p>
                    ) : (
                        <ul className="mt-2 divide-y divide-gray-200 border rounded-md">
                            {employee.certifications.map(cert => (
                                <li key={cert.id} className="p-3">
                                    <p className="font-medium text-gray-900">{cert.name}</p>
                                    <p className="text-sm text-gray-600">Issued by: {cert.issuingBody}</p>
                                    <p className="text-sm text-gray-500">
                                        Issued on: {cert.issueDate}
                                        {cert.expiryDate && ` | Expires: ${cert.expiryDate}`}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Education</h4>
                    {(!employee.education || employee.education.length === 0) ? (
                        <p className="text-sm text-gray-500 mt-2">No education records on file.</p>
                    ) : (
                         <ul className="mt-2 divide-y divide-gray-200 border rounded-md">
                            {employee.education.map(edu => (
                                <li key={edu.id} className="p-3">
                                    <p className="font-medium text-gray-900">{edu.degree} in {edu.fieldOfStudy}</p>
                                    <p className="text-sm text-gray-600">{edu.institution}</p>
                                    <p className="text-sm text-gray-500">Completed: {edu.completionDate}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        )}
      </div>
       <div className="flex items-center justify-end pt-6 space-x-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => onEdit(employee, currentRecord)}>Edit this Record</Button>
        </div>
    </Modal>
  );
};

export default EmployeeDetailModal;