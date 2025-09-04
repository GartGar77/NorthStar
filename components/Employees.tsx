









import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { getEmployees, updateEmployeeProfile, addEmployee, getCompanySettings, updateCompanySettings } from '../services/api';
import { PayFrequency, Province } from '../types';
import type { Employee, EmployeeProfile, EmployeeProfileRecord, Payroll, EmployeeGarnishment, AllocatedBankDetails, CompanySettings, EmployeeEarning, EmployeeDeduction, SuperAdmin, Certification, Education } from '../types';
import EmployeeEditModal from './EmployeeEditModal';
import EmployeeAddModal from './EmployeeAddModal';
import EmployeeDetailModal from './EmployeeDetailModal';
import Avatar from './ui/Avatar';
import { ShieldCheckIcon, ArrowPathIcon } from './icons/Icons';
import TagInput from './ui/TagInput';

// Helper to get the current profile from an employee's history
const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    const currentRecord = employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        // FIX: The argument to localeCompare should be a string (a.effectiveDate), not an EmployeeProfileRecord object (a).
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    
    return currentRecord ? currentRecord.profile : employee.profileHistory[0].profile;
};

interface EmployeesProps {
  openAddModalOnMount?: boolean;
  session: { user: Employee | SuperAdmin | null, tenantId: string | null };
}

const Employees: React.FC<EmployeesProps> = ({ openAddModalOnMount = false, session }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingRecord, setEditingRecord] = useState<{employee: Employee, record: EmployeeProfileRecord} | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'directory' | 'settings'>('directory');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for import functionality
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);


  const employeeNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    employees.forEach(emp => map[emp.id] = getCurrentProfile(emp).name);
    return map;
  }, [employees]);

  useEffect(() => {
    if (openAddModalOnMount) {
      setIsAddModalOpen(true);
    }
  }, [openAddModalOnMount]);


  const fetchEmployeesAndSettings = useCallback(async () => {
    if (!session.tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [empData, settingsData] = await Promise.all([
          getEmployees(session.tenantId),
          getCompanySettings(session.tenantId),
      ]);
      setEmployees(empData.data);
      setSettings(settingsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setError("Could not load data. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, [session.tenantId]);

  useEffect(() => {
    fetchEmployeesAndSettings();
  }, [fetchEmployeesAndSettings]);

  const handleSaveEmployee = async (
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
    bankAccounts: AllocatedBankDetails[],
    certifications: Certification[],
    education: Education[]
  ) => {
    try {
      await updateEmployeeProfile(employeeId, effectiveDate, status, profileUpdate, payrollUpdate, timeOffBalances, garnishments, isAdmin, recurringEarnings, recurringDeductions, employeeIdString, bankAccounts, certifications, education, session.tenantId!);
      setEditingRecord(null); // Close modal on success
      await fetchEmployeesAndSettings(); // Refresh data
    } catch (e: any) {
      setError(e.message || "Failed to save employee changes.");
    }
  };

  const handleAddEmployee = async (data: { profile: EmployeeProfile; effectiveDate: string; payFrequency: PayFrequency; payroll: Payroll; status: string; garnishments: EmployeeGarnishment[]; bankAccounts: AllocatedBankDetails[]; isAdmin: boolean; timeOffBalances: { [policyId: string]: number; }; recurringEarnings: EmployeeEarning[]; recurringDeductions: EmployeeDeduction[]; certifications: Certification[]; education: Education[]; employeeId?: string }) => {
    try {
      await addEmployee(data, session.tenantId!);
      setIsAddModalOpen(false); // Close modal on success
      await fetchEmployeesAndSettings(); // Refresh data
    } catch (e: any) {
      setError(e.message || "Failed to add new employee.");
    }
  };

  const handleEditRecord = (employee: Employee, record: EmployeeProfileRecord) => {
    setViewingEmployee(null); // Close detail modal
    setEditingRecord({ employee, record }); // Open edit modal
  };
  
  const handleStatusesChange = (newStatuses: string[]) => {
    setSettings(prev => {
        if (!prev) return null;
        const newSettings = JSON.parse(JSON.stringify(prev));
        if (!newSettings.configurations) newSettings.configurations = { statuses: [] };
        newSettings.configurations.statuses = newStatuses;
        return newSettings;
    });
  };

  const handlePhoneTypesChange = (newPhoneTypes: string[]) => {
    setSettings(prev => {
        if (!prev) return null;
        const newSettings = JSON.parse(JSON.stringify(prev));
        if (!newSettings.configurations) newSettings.configurations = { statuses: [], phoneTypes: [] };
        if (!newSettings.configurations.phoneTypes) newSettings.configurations.phoneTypes = [];
        newSettings.configurations.phoneTypes = newPhoneTypes;
        return newSettings;
    });
  };
  
  const handleEmailTypesChange = (newEmailTypes: string[]) => {
    setSettings(prev => {
        if (!prev) return null;
        const newSettings = JSON.parse(JSON.stringify(prev));
        if (!newSettings.configurations) newSettings.configurations = { statuses: [], emailTypes: [] };
        if (!newSettings.configurations.emailTypes) newSettings.configurations.emailTypes = [];
        newSettings.configurations.emailTypes = newEmailTypes;
        return newSettings;
    });
  };

  const handleDocumentCategoriesChange = (newCategories: string[]) => {
    setSettings(prev => {
        if (!prev) return null;
        const newSettings = JSON.parse(JSON.stringify(prev));
        if (!newSettings.configurations) newSettings.configurations = { statuses: [], documentCategories: [] };
        if (!newSettings.configurations.documentCategories) newSettings.configurations.documentCategories = [];
        newSettings.configurations.documentCategories = newCategories;
        return newSettings;
    });
  };

   const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateCompanySettings(settings, session.tenantId!);
      setSuccessMessage("Configuration saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportStatus('idle'); // Reset status when a new file is selected
        setImportMessage('');
      } else {
        setSelectedFile(null);
        setImportStatus('error');
        setImportMessage('Please select a valid .csv file.');
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = () => {
    if (!selectedFile) return;

    setImportStatus('importing');
    setImportMessage('Validating CSV file...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string;
        const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
          throw new Error("CSV file is empty or contains only a header.");
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const expectedHeaders = ['id', 'name', 'role', 'annualSalary', 'hourlyRate', 'weeklyHours', 'province', 'dateOfBirth', 'supervisorId', 'payFrequency', 'sin', 'td1Federal', 'td1Provincial'];
        
        // Header validation
        if (headers.length !== expectedHeaders.length || !expectedHeaders.every((h, i) => h === headers[i])) {
            throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`);
        }

        const dataRows = lines.slice(1);
        const validationErrors: string[] = [];
        const validProvinces = Object.values(Province);
        const validPayFrequencies = Object.values(PayFrequency);

        dataRows.forEach((line, index) => {
          const rowNum = index + 2;
          // Simple CSV parsing assuming no commas within quoted fields
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          
          if(values.length !== headers.length) {
              validationErrors.push(`Row ${rowNum}: Incorrect number of columns. Expected ${headers.length}, found ${values.length}.`);
              return; // Skip further validation for this malformed row
          }

          const rowData = headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
          }, {} as Record<string, string>);

          // Field validation
          if (!rowData.name) {
            validationErrors.push(`Row ${rowNum}: 'name' is a required field.`);
          }
          if (rowData.annualSalary === '' || isNaN(Number(rowData.annualSalary))) {
            validationErrors.push(`Row ${rowNum}: 'annualSalary' must be a valid number.`);
          }
           if (!validProvinces.includes(rowData.province as any)) { // 'any' because it's a string from CSV
              validationErrors.push(`Row ${rowNum}: '${rowData.province}' is not a valid province.`);
          }
          if (!validPayFrequencies.includes(rowData.payFrequency as any)) {
              validationErrors.push(`Row ${rowNum}: '${rowData.payFrequency}' is not a valid pay frequency.`);
          }
          if (rowData.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(rowData.dateOfBirth)) {
              validationErrors.push(`Row ${rowNum}: 'dateOfBirth' must be in YYYY-MM-DD format.`);
          }
        });

        if (validationErrors.length > 0) {
          // Join the first few errors for a concise message
          const errorMessage = `Import failed. Please fix the following errors:\n\n${validationErrors.slice(0, 5).join('\n')}`;
          throw new Error(errorMessage);
        }

        // If validation passes
        setImportStatus('success');
        setImportMessage(`${dataRows.length} employee records successfully validated and are ready for import!`);
        // In a real app, here you would call an API with the parsed data.
        
      } catch (error: any) {
        setImportStatus('error');
        setImportMessage(error.message);
      } finally {
        // Reset file input so user can re-upload the same file after fixing it
        if(fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setSelectedFile(null);
      }
    };
    
    reader.onerror = () => {
        setImportStatus('error');
        setImportMessage('Failed to read the file.');
        setSelectedFile(null);
    };

    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
        const { data: employees } = await getEmployees(session.tenantId!);

        const flattenedData = employees.map(emp => {
            const currentProfileRecord = getCurrentProfile(emp);
            const profile = currentProfileRecord;
            const canadaPayroll = emp.payroll.canada || { sin: '', td1Federal: 0, td1Provincial: 0 };

            return {
                id: emp.id,
                name: profile.name,
                role: profile.role,
                annualSalary: profile.annualSalary,
                hourlyRate: profile.hourlyRate || 0,
                weeklyHours: profile.weeklyHours || 40,
                province: profile.province,
                dateOfBirth: profile.dateOfBirth,
                supervisorId: profile.supervisorId || '',
                payFrequency: emp.payFrequency,
                sin: canadaPayroll.sin,
                td1Federal: canadaPayroll.td1Federal,
                td1Provincial: canadaPayroll.td1Provincial,
            };
        });
        
        if (flattenedData.length === 0) {
            alert("No employee data available to export.");
            return;
        }

        const headers = Object.keys(flattenedData[0]);
        const csvRows = [headers.join(',')]; // Header row

        for (const row of flattenedData) {
            const values = headers.map(header => {
                const value = row[header as keyof typeof row];
                // Handle commas and quotes in data by replacing " with "" and wrapping in quotes
                const escaped = ('' + value).replace(/"/g, '""'); 
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'northstar_hcm_employee_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Failed to download employee template:", error);
        alert("An error occurred while preparing the download. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };


  return (
    <>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`${activeTab === 'directory' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Directory
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Settings
          </button>
        </nav>
      </div>
      
      {error && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
         </div>
      )}

      {activeTab === 'directory' && (
        <div className="mt-6 space-y-6">
            <Card title="Employee Directory" actions={<Button variant="primary" onClick={() => setIsAddModalOpen(true)}>Add Employee</Button>}>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                          <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee ID</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pay Type</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supervisor</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Salary</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Province</th>
                              <th scope="col" className="relative px-6 py-3">
                                  <span className="sr-only">View Details</span>
                              </th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                          {isLoading ? (
                              <tr>
                                  <td colSpan={8} className="text-center py-10">
                                      <div className="text-slate-500">Loading employees...</div>
                                  </td>
                              </tr>
                          ) : (
                              employees.map((employee) => {
                                const currentProfile = getCurrentProfile(employee);
                                const supervisorName = currentProfile.supervisorId ? employeeNameMap[currentProfile.supervisorId] : 'N/A';
                                return (
                                  <tr key={employee.id} onClick={() => setViewingEmployee(employee)} className="hover:bg-slate-50 cursor-pointer">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0">
                                            <Avatar src={currentProfile.avatarUrl} name={currentProfile.name} size="md" />
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900 flex items-center">
                                              {currentProfile.name}
                                              {employee.isAdmin && <ShieldCheckIcon className="h-4 w-4 ml-2 text-blue-500" title="Administrator" />}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{employee.employeeId}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-500">{currentProfile.role}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{currentProfile.payType}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-500">{supervisorName}</div>
                                      </td>
                                       <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-slate-500">${currentProfile.annualSalary.toLocaleString()}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                              {currentProfile.province}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          <span className="text-brand-primary hover:text-brand-dark">View</span>
                                      </td>
                                  </tr>
                                )
                              })
                          )}
                      </tbody>
                  </table>
              </div>
            </Card>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="space-y-6 mt-6">
            <form onSubmit={handleSaveSettings}>
                <Card 
                    title="Data Configuration"
                    footer={
                        <div className="flex justify-end items-center gap-4">
                            {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
                            <Button variant="primary" type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    }
                >
                  <p className="text-sm text-slate-500 mb-6">Manage custom dropdown values used for employee profiles.</p>
                  {isLoading && <p>Loading configurations...</p>}
                  {settings && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Employee Statuses</label>
                            <p className="text-xs text-slate-500 mb-2">Define the list of available statuses for employee record changes (e.g., Hire, Promotion).</p>
                            <TagInput
                                tags={settings.configurations?.statuses || []}
                                onTagsChange={handleStatusesChange}
                                placeholder="Add a status and press Enter"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number Types</label>
                            <p className="text-xs text-slate-500 mb-2">Define the list of available phone types (e.g., Home, Cell, Work).</p>
                            <TagInput
                                tags={settings.configurations?.phoneTypes || []}
                                onTagsChange={handlePhoneTypesChange}
                                placeholder="Add a phone type and press Enter"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address Types</label>
                            <p className="text-xs text-slate-500 mb-2">Define the list of available email types (e.g., Work, Personal).</p>
                            <TagInput
                                tags={settings.configurations?.emailTypes || []}
                                onTagsChange={handleEmailTypesChange}
                                placeholder="Add an email type and press Enter"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Document Categories</label>
                            <p className="text-xs text-slate-500 mb-2">Define the categories available when uploading employee documents.</p>
                            <TagInput
                                tags={settings.configurations?.documentCategories || []}
                                onTagsChange={handleDocumentCategoriesChange}
                                placeholder="Add a category and press Enter"
                            />
                        </div>
                    </div>
                  )}
                </Card>
            </form>

            <Card title="Import into NorthStar HCM">
                <p className="text-gray-600 mb-6 max-w-3xl">
                Quickly onboard your team by importing all employee records from a single file.
                Download our template to ensure your data is in the correct format, then upload the completed file.
                </p>
                
                <div className="p-6 bg-gray-50 rounded-lg border">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 text-center sm:text-left">
                        <h4 className="font-semibold text-gray-800">
                        {selectedFile ? `Selected File: ${selectedFile.name}` : 'No file selected'}
                        </h4>
                        {selectedFile && <p className="text-sm text-gray-500">{Math.round(selectedFile.size / 1024)} KB</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="secondary" onClick={handleDownloadTemplate} disabled={isDownloading}>
                        {isDownloading ? 'Preparing...' : 'Download Template'}
                        </Button>
                        <Button variant="primary" onClick={handleUploadClick}>
                        {selectedFile ? 'Change File' : 'Upload CSV File'}
                        </Button>
                        <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".csv"
                        />
                    </div>
                </div>
                
                {selectedFile && (
                    <div className="mt-6 pt-4 border-t text-right">
                    <Button
                        variant="primary"
                        onClick={handleImport}
                        disabled={importStatus === 'importing'}
                        icon={importStatus === 'importing' ? <ArrowPathIcon className="animate-spin h-5 w-5" /> : null}
                    >
                        {importStatus === 'importing' ? 'Importing...' : 'Import Data'}
                    </Button>
                    </div>
                )}
                
                {importMessage && (
                    <div className={`mt-4 text-sm text-left p-3 rounded-md whitespace-pre-wrap ${
                    importStatus === 'success' ? 'bg-green-100 text-green-700' : ''
                    } ${
                    importStatus === 'error' ? 'bg-red-100 text-red-700' : ''
                    } ${
                    importStatus === 'importing' ? 'bg-blue-100 text-blue-700' : ''
                    }`}>
                    {importMessage}
                    </div>
                )}

                </div>
            </Card>
        </div>
      )}

      {viewingEmployee && (
        <EmployeeDetailModal
          employee={viewingEmployee}
          onClose={() => setViewingEmployee(null)}
          onEdit={handleEditRecord}
          session={session as { user: Employee, tenantId: string }}
          settings={settings}
        />
      )}

      {editingRecord && (
        <EmployeeEditModal
          employee={editingRecord.employee}
          recordToEdit={editingRecord.record}
          onClose={() => setEditingRecord(null)}
          onSave={handleSaveEmployee}
          allEmployees={employees}
          employeeNameMap={employeeNameMap}
          statuses={settings?.configurations?.statuses || []}
          phoneTypes={settings?.configurations?.phoneTypes || []}
          emailTypes={settings?.configurations?.emailTypes || []}
          settings={settings}
          session={session as { user: Employee, tenantId: string }}
        />
      )}

      {isAddModalOpen && (
        <EmployeeAddModal
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddEmployee}
            statuses={settings?.configurations?.statuses || []}
            phoneTypes={settings?.configurations?.phoneTypes || []}
            emailTypes={settings?.configurations?.emailTypes || []}
            settings={settings}
            session={session as { user: Employee, tenantId: string }}
        />
      )}
    </>
  );
};

export default Employees;