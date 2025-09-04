import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from './icons/Icons';
import { getTimesheetsForEmployee, saveTimesheet, getTimeOffRequests, getTimeOffPolicies } from '../services/api';
import type { Timesheet, Employee, TimeOffPolicy, TimeOffRequest, SuperAdmin } from '../types';
import { TimesheetStatus, TimeOffRequestStatus } from '../types';

// Helper functions for date manipulation
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

const addDays = (d: Date, days: number): Date => {
  const date = new Date(d.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

const emptyTimesheet = (employeeId: number, weekStartDate: string): Timesheet => ({
  id: '',
  employeeId,
  weekStartDate,
  dailyHours: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
  totalHours: 0,
  status: TimesheetStatus.Draft,
});

interface TimeOffRow {
  policyName: string;
  dailyHours: { [key in keyof Timesheet['dailyHours']]: number };
}


interface TimesheetsProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const dayKeys: (keyof Timesheet['dailyHours'])[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

const Timesheets: React.FC<TimesheetsProps> = ({ session }) => {
    const currentUser = session.user as Employee;
    const [activeTab, setActiveTab] = useState<'timesheet' | 'settings'>('timesheet');

    const [currentWeekStart, setCurrentWeekStart] = useState(formatDate(getMonday(new Date())));
    const [timesheet, setTimesheet] = useState<Timesheet>(() => emptyTimesheet(currentUser.id, currentWeekStart));
    const [originalTimesheet, setOriginalTimesheet] = useState<Timesheet | null>(null);
    const [timeOffRows, setTimeOffRows] = useState<TimeOffRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Import state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);


    const isDirty = useMemo(() => {
        if (!timesheet || !originalTimesheet) return false;
        // Don't check ID because it's empty on new timesheets
        return JSON.stringify({ ...timesheet, id: null }) !== JSON.stringify({ ...originalTimesheet, id: null });
    }, [timesheet, originalTimesheet]);

    useUnsavedChangesWarning(isDirty);

    const employeeProfile = useMemo(() => {
        return currentUser.profileHistory
            .filter(p => new Date(p.effectiveDate) <= new Date())
            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]?.profile;
    }, [currentUser]);

    const isHourlyEmployee = useMemo(() => {
        return !!employeeProfile?.hourlyRate && employeeProfile.hourlyRate > 0;
    }, [employeeProfile]);

    const fetchWeekData = useCallback(async (weekStart: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const [allTimesheets, allRequests, allPolicies] = await Promise.all([
                getTimesheetsForEmployee(currentUser.id, session.tenantId),
                getTimeOffRequests(session.tenantId),
                getTimeOffPolicies(session.tenantId),
            ]);

            const existingTimesheet = allTimesheets.find(ts => ts.weekStartDate === weekStart);
            const currentSheet = existingTimesheet || emptyTimesheet(currentUser.id, weekStart);
            setTimesheet(currentSheet);
            setOriginalTimesheet(JSON.parse(JSON.stringify(currentSheet)));

            // Process time off data
            const policyMap = new Map(allPolicies.map(p => [p.id, p]));
            const approvedRequests = allRequests.filter(r => r.employeeId === currentUser.id && r.status === TimeOffRequestStatus.Approved);
            
            const dailyWorkHours = (employeeProfile?.weeklyHours || 40) / 5;
            const weekDates = Array.from({ length: 7 }).map((_, i) => formatDate(addDays(new Date(weekStart + 'T00:00:00'), i)));

            const timeOffData: { [policyId: string]: TimeOffRow } = {};

            weekDates.forEach((dateStr, index) => {
                const dayKey = dayKeys[index];
                const dayOfWeek = new Date(dateStr + 'T00:00:00Z').getUTCDay();

                for (const req of approvedRequests) {
                    const policy = policyMap.get(req.policyId);
                    if (policy && policy.isPaid && dateStr >= req.startDate && dateStr <= req.endDate) {
                        if (dayOfWeek > 0 && dayOfWeek < 6) { // Only count weekdays for auto-population
                            if (!timeOffData[req.policyId]) {
                                timeOffData[req.policyId] = {
                                    policyName: policy.name,
                                    dailyHours: { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
                                };
                            }
                            timeOffData[req.policyId].dailyHours[dayKey] += dailyWorkHours;
                            break; 
                        }
                    }
                }
            });
            setTimeOffRows(Object.values(timeOffData));

        } catch (e) {
            setError("Failed to load timesheet data.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.id, employeeProfile, session.tenantId]);

    useEffect(() => {
        if (activeTab === 'timesheet' && isHourlyEmployee) {
            fetchWeekData(currentWeekStart);
        } else if (!isHourlyEmployee) {
            setIsLoading(false);
        }
    }, [currentWeekStart, fetchWeekData, isHourlyEmployee, activeTab]);


    const handleWeekChange = (weeks: number) => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                return;
            }
        }
        const newDate = addDays(new Date(currentWeekStart), weeks * 7);
        setCurrentWeekStart(formatDate(newDate));
    };

    const handleHoursChange = (day: keyof Timesheet['dailyHours'], value: string) => {
        const hours = Number(value);
        if (isNaN(hours) || hours < 0 || hours > 24) return;

        setTimesheet(prev => {
            const newDailyHours = { ...prev.dailyHours, [day]: hours };
            const newTotalHours = Object.values(newDailyHours).reduce((sum, h) => sum + h, 0);
            return { ...prev, dailyHours: newDailyHours, totalHours: newTotalHours };
        });
    };

    const handleSave = async (status: TimesheetStatus) => {
        setIsSaving(true);
        setSuccessMessage(null);
        setError(null);
        try {
            const updatedTimesheet = { ...timesheet, status };
            const saved = await saveTimesheet(updatedTimesheet, session.tenantId);
            setTimesheet(saved);
            setOriginalTimesheet(JSON.parse(JSON.stringify(saved)));
            setSuccessMessage(`Timesheet ${status === TimesheetStatus.Draft ? 'saved' : 'submitted'} successfully!`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (e) {
            setError(`Failed to ${status === TimesheetStatus.Draft ? 'save' : 'submit'} timesheet.`);
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadTemplate = () => {
        setIsDownloading(true);
        const headers = ['employeeId', 'weekStartDate', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
        const exampleRow = ['102', '2024-08-05', '8', '8', '8', '8', '7.5', '0', '0']; // Example for Ben Carter (an hourly employee)
        const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'timesheet_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                setSelectedFile(file);
                setImportStatus('idle');
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
                const expectedHeaders = ['employeeId', 'weekStartDate', 'mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
                
                if (headers.length !== expectedHeaders.length || !expectedHeaders.every((h, i) => h === headers[i])) {
                    throw new Error(`Invalid CSV headers. Expected: ${expectedHeaders.join(', ')}`);
                }

                const dataRows = lines.slice(1);
                const validationErrors: string[] = [];

                dataRows.forEach((line, index) => {
                    const rowNum = index + 2;
                    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                    if (values.length !== headers.length) {
                        validationErrors.push(`Row ${rowNum}: Incorrect number of columns.`);
                        return;
                    }

                    const rowData = headers.reduce((obj, header, i) => ({ ...obj, [header]: values[i] }), {} as Record<string, string>);

                    if (!rowData.employeeId || isNaN(Number(rowData.employeeId))) {
                        validationErrors.push(`Row ${rowNum}: 'employeeId' must be a valid number.`);
                    }
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.weekStartDate)) {
                        validationErrors.push(`Row ${rowNum}: 'weekStartDate' must be in YYYY-MM-DD format.`);
                    } else if (new Date(rowData.weekStartDate + 'T00:00:00').getDay() !== 1) {
                        validationErrors.push(`Row ${rowNum}: 'weekStartDate' must be a Monday.`);
                    }
                    
                    expectedHeaders.slice(2).forEach(dayHeader => {
                        const hours = Number(rowData[dayHeader]);
                        if (isNaN(hours) || hours < 0 || hours > 24) {
                             validationErrors.push(`Row ${rowNum}: '${dayHeader}' must be a number between 0 and 24.`);
                        }
                    });
                });

                if (validationErrors.length > 0) {
                    throw new Error(`Import failed. Please fix these errors:\n\n${validationErrors.slice(0, 5).join('\n')}`);
                }

                setImportStatus('success');
                setImportMessage(`${dataRows.length} timesheet records successfully validated! (Note: Import is a demo and data is not saved).`);
                
            } catch (error: any) {
                setImportStatus('error');
                setImportMessage(error.message);
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
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
    
    const weekDays = useMemo(() => {
        const start = new Date(currentWeekStart + 'T00:00:00');
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, [currentWeekStart]);

    const isSubmitted = timesheet.status === TimesheetStatus.Submitted || timesheet.status === TimesheetStatus.Approved;

    const dailyTotals = useMemo(() => {
        const totals: { [key in keyof Timesheet['dailyHours']]: number } = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
        for (const day of dayKeys) {
            const worked = timesheet.dailyHours[day] || 0;
            const timeOff = timeOffRows.reduce((sum, row) => sum + (row.dailyHours[day] || 0), 0);
            totals[day] = worked + timeOff;
        }
        return totals;
    }, [timesheet.dailyHours, timeOffRows]);

    const grandTotal = useMemo(() => Object.values(dailyTotals).reduce((sum, h) => sum + h, 0), [dailyTotals]);

    const renderMyTimesheet = () => {
         if (currentUser.isAdmin && !isHourlyEmployee) {
             return (
                <Card title="My Timesheet">
                    <div className="text-center py-8">
                        <p className="text-gray-600">As a salaried administrator, your profile does not require a timesheet.</p>
                        <p className="text-sm text-gray-500 mt-2">You can manage company-wide timesheet settings in the "Settings" tab.</p>
                    </div>
                </Card>
            );
        }

        if (!isHourlyEmployee) {
            return (
                <Card title="My Timesheet">
                    <div className="text-center py-8">
                        <p className="text-gray-600">Timesheets are only applicable for hourly employees. Your profile is set up for a salaried position.</p>
                    </div>
                </Card>
            );
        }

        return (
            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <div className="flex items-center space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => handleWeekChange(-1)}><ChevronLeftIcon className="h-5 w-5" /> Previous Week</Button>
                        <Button variant="secondary" size="sm" onClick={() => handleWeekChange(1)}>Next Week <ChevronRightIcon className="h-5 w-5" /></Button>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 text-center">
                        Week of {weekDays[0].toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </h2>
                    <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            timesheet.status === TimesheetStatus.Approved ? 'bg-green-100 text-green-800' :
                            timesheet.status === TimesheetStatus.Submitted ? 'bg-blue-100 text-blue-800' :
                            timesheet.status === TimesheetStatus.Rejected ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {timesheet.status}
                        </span>
                    </div>
                </div>
                {isLoading ? (
                    <div className="text-center p-8">Loading timesheet...</div>
                ) : error ? (
                    <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>
                ) : (
                    <>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full table-fixed">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="w-40 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    {weekDays.map(day => (
                                        <th key={day.toISOString()} scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                                            <span className="block font-normal text-gray-400">{day.toLocaleDateString('en-CA', { day: '2-digit', month: '2-digit' })}</span>
                                        </th>
                                    ))}
                                    <th scope="col" className="w-28 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                    <td className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">Work Hours</td>
                                    {dayKeys.map((dayKey) => (
                                        <td key={dayKey} className="px-2 py-2 whitespace-nowrap">
                                            <input
                                                type="number"
                                                step="0.25"
                                                min="0"
                                                max="24"
                                                value={timesheet.dailyHours[dayKey]}
                                                onChange={(e) => handleHoursChange(dayKey, e.target.value)}
                                                disabled={isSubmitted || isSaving}
                                                className="w-full text-center rounded-md border-gray-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm disabled:bg-gray-100"
                                                aria-label={`Worked hours for ${dayKey}`}
                                            />
                                        </td>
                                    ))}
                                    <td className="px-3 py-4 whitespace-nowrap text-center text-md font-bold text-gray-900 bg-gray-50">
                                        {timesheet.totalHours}
                                    </td>
                                </tr>
                                {timeOffRows.map(row => (
                                    <tr key={row.policyName}>
                                        <td className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">{row.policyName}</td>
                                        {dayKeys.map(dayKey => (
                                            <td key={dayKey} className="px-2 py-2 whitespace-nowrap">
                                                <input 
                                                    type="number"
                                                    value={row.dailyHours[dayKey]}
                                                    disabled
                                                    className="w-full text-center rounded-md border-gray-300 shadow-sm sm:text-sm bg-gray-100"
                                                    aria-label={`${row.policyName} hours for ${dayKey}`}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-3 py-4 whitespace-nowrap text-center text-md font-bold text-gray-900 bg-gray-50">
                                            {Object.values(row.dailyHours).reduce((sum, h) => sum + h, 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100 font-bold">
                                <tr>
                                    <td className="px-3 py-3 text-sm text-gray-900">Daily Totals</td>
                                    {dayKeys.map(dayKey => (
                                        <td key={dayKey} className="px-2 py-3 text-center text-gray-900">
                                            {dailyTotals[dayKey]}
                                        </td>
                                    ))}
                                    <td className="px-3 py-3 text-center text-lg text-brand-primary">
                                        {grandTotal}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
    
                    <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-4">
                        {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
                        {!isSubmitted && (
                            <div className="flex space-x-2">
                                <Button variant="secondary" onClick={() => handleSave(TimesheetStatus.Draft)} disabled={isSaving}>Save as Draft</Button>
                                <Button variant="primary" onClick={() => handleSave(TimesheetStatus.Submitted)} disabled={isSaving}>Submit for Approval</Button>
                            </div>
                        )}
                        {isSubmitted && (
                            <p className="text-sm text-gray-500 italic">This timesheet has been submitted and cannot be edited.</p>
                        )}
                    </div>
                    </>
                )}
            </Card>
        );
    }
    
    const renderSettings = () => {
        return (
            <Card title="Import Timesheets">
                <p className="text-gray-600 mb-6 max-w-3xl">
                    Import weekly timesheets for multiple employees from a single CSV file. 
                    This is useful for migrating data from another system or for managers who track hours offline.
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
        );
    }

    return (
        <div className="space-y-6">
            {currentUser.isAdmin ? (
                <>
                    <div className="border-b border-slate-200">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('timesheet')}
                                className={`${activeTab === 'timesheet' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                My Timesheet
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                Settings
                            </button>
                        </nav>
                    </div>
                    {activeTab === 'timesheet' && renderMyTimesheet()}
                    {activeTab === 'settings' && renderSettings()}
                </>
            ) : (
                renderMyTimesheet()
            )}
        </div>
    );
};

export default Timesheets;