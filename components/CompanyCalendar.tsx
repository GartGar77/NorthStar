



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import { getCompanyHolidays, getTimeOffRequests, getEmployees, getCompanySettings, updateCompanySettings } from '../services/api';
import type { TimeOffRequest, Employee, CompanySettings, StatutoryHoliday, Province as ProvinceEnum, SuperAdmin } from '../types';
import { TimeOffRequestStatus, PayFrequency, Province } from '../types';

interface CalendarEvent {
  title: string;
  type: 'time_off' | 'holiday' | 'payroll';
}

const newHolidayTemplate: Omit<StatutoryHoliday, 'provinces'> = {
  name: '',
  date: '',
};

const EventBadge: React.FC<{ event: CalendarEvent }> = ({ event }) => {
    const typeClasses = {
        time_off: 'bg-green-100 text-green-800',
        holiday: 'bg-red-100 text-red-800',
        payroll: 'bg-yellow-100 text-yellow-800',
    };
    return (
        <div className={`text-xs p-1 rounded-md truncate ${typeClasses[event.type]}`}>
            {event.title}
        </div>
    );
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

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

interface CompanyCalendarProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const CompanyCalendar: React.FC<CompanyCalendarProps> = ({ session }) => {
    const currentUser = session.user as Employee;
    const [activeTab, setActiveTab] = useState<'calendar' | 'settings'>('calendar');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Settings State
    const [settings, setSettings] = useState<CompanySettings | null>(null);
    const [initialSettings, setInitialSettings] = useState<CompanySettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [newHoliday, setNewHoliday] = useState(newHolidayTemplate);
    const [newHolidayProvinces, setNewHolidayProvinces] = useState<ProvinceEnum[]>([]);
    const [newHolidayAllProvinces, setNewHolidayAllProvinces] = useState(true);

    const isDirty = useMemo(() => {
        if (activeTab !== 'settings' || !settings || !initialSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings, activeTab]);

    useUnsavedChangesWarning(isDirty);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [holidays, requests, { data: employees }, companySettings] = await Promise.all([
                getCompanyHolidays(session.tenantId),
                getTimeOffRequests(session.tenantId),
                getEmployees(session.tenantId),
                getCompanySettings(session.tenantId),
            ]);
            setSettings(companySettings);
            setInitialSettings(JSON.parse(JSON.stringify(companySettings)));

            const employeeMap = employees.reduce((acc, emp) => {
                const currentProfile = emp.profileHistory
                    .filter(p => new Date(p.effectiveDate) <= new Date())
                    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];
                acc[emp.id] = currentProfile?.profile.name || `Employee #${emp.id}`;
                return acc;
            }, {} as Record<number, string>);

            const newEvents: Record<string, CalendarEvent[]> = {};

            // Process Holidays
            holidays.forEach(holiday => {
                if (!newEvents[holiday.date]) newEvents[holiday.date] = [];
                newEvents[holiday.date].push({ title: holiday.name, type: 'holiday' });
            });

            // Process Approved Time Off
            requests
              .filter(req => req.status === TimeOffRequestStatus.Approved)
              .forEach(req => {
                let d = new Date(req.startDate + 'T00:00:00');
                const endDate = new Date(req.endDate + 'T00:00:00');
                while (d <= endDate) {
                    const dateStr = d.toISOString().split('T')[0];
                    if (!newEvents[dateStr]) newEvents[dateStr] = [];
                    newEvents[dateStr].push({ title: `${employeeMap[req.employeeId]} - Off`, type: 'time_off' });
                    d.setDate(d.getDate() + 1);
                }
            });

            // Process Payroll Dates from settings
            const schedule = companySettings.configurations?.payrollSchedule;
            if (schedule) {
                const year = new Date().getFullYear();
                const addPayDay = (dateStr: string) => {
                    if (!newEvents[dateStr]) newEvents[dateStr] = [];
                    // Avoid duplicate "Pay Day" events if logic overlaps
                    if (!newEvents[dateStr].some(e => e.type === 'payroll')) {
                        newEvents[dateStr].push({ title: 'Pay Day', type: 'payroll' });
                    }
                };

                const getPayDateForMonth = (month: number, day: number | 'last') => {
                    if (day === 'last') {
                        return new Date(year, month + 1, 0);
                    }
                    return new Date(year, month, day as number);
                };

                switch (schedule.frequency) {
                    case PayFrequency.Weekly:
                        if (schedule.dayOfWeek) {
                            const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(schedule.dayOfWeek);
                            if (dayIndex > -1) {
                                let date = new Date(year, 0, 1);
                                date.setDate(date.getDate() + (dayIndex - date.getDay() + 7) % 7);
                                while (date.getFullYear() === year) {
                                    addPayDay(formatDate(date));
                                    date.setDate(date.getDate() + 7);
                                }
                            }
                        }
                        break;
                    case PayFrequency.BiWeekly:
                        if (schedule.anchorDate) {
                            let payDate = new Date(schedule.anchorDate + 'T00:00:00');
                            // Normalize to a date within the cycle, but before our target year
                            while (payDate.getFullYear() >= year) {
                                payDate.setDate(payDate.getDate() - 14);
                            }
                            // Iterate forward from this pre-year date
                            payDate.setDate(payDate.getDate() + 14);
                            while (payDate.getFullYear() === year) {
                                addPayDay(formatDate(payDate));
                                payDate.setDate(payDate.getDate() + 14);
                            }
                        }
                        break;
                    case PayFrequency.Monthly:
                        if (schedule.dayOfMonth1) {
                            for (let month = 0; month < 12; month++) {
                                const payDate = getPayDateForMonth(month, schedule.dayOfMonth1);
                                addPayDay(formatDate(payDate));
                            }
                        }
                        break;
                    case PayFrequency.SemiMonthly:
                        if (schedule.dayOfMonth1 && schedule.dayOfMonth2) {
                            for (let month = 0; month < 12; month++) {
                                addPayDay(formatDate(getPayDateForMonth(month, schedule.dayOfMonth1)));
                                addPayDay(formatDate(getPayDateForMonth(month, schedule.dayOfMonth2)));
                            }
                        }
                        break;
                }
            }


            setEvents(newEvents);

        } catch (e) {
            console.error(e);
            setError("Failed to load calendar data.");
        } finally {
            setIsLoading(false);
        }
    }, [session.tenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const changeMonth = (delta: number) => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            newDate.setMonth(newDate.getMonth() + delta);
            return newDate;
        });
    };

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const grid = [];
        // Fill start with blanks
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push(null);
        }
        // Fill with days
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push(new Date(year, month, i));
        }
        return grid;
    }, [currentDate]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // --- Settings Logic ---
    const handleTabChange = (tab: 'calendar' | 'settings') => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes that will be lost. Are you sure you want to switch tabs?')) {
                return;
            }
        }
        setActiveTab(tab);
    };

    const handleAddHoliday = () => {
        if (!newHoliday.name || !newHoliday.date) return;
        const holidayToAdd: StatutoryHoliday = {
        ...newHoliday,
        provinces: newHolidayAllProvinces ? 'all' : newHolidayProvinces,
        };

        setSettings(prev => {
        if (!prev) return null;
        const newSettings = JSON.parse(JSON.stringify(prev));
        if (!newSettings.configurations) newSettings.configurations = { statuses: [] };
        if (!newSettings.configurations.statutoryHolidays) newSettings.configurations.statutoryHolidays = [];
        newSettings.configurations.statutoryHolidays.push(holidayToAdd);
        newSettings.configurations.statutoryHolidays.sort((a: StatutoryHoliday, b: StatutoryHoliday) => a.date.localeCompare(b.date));
        return newSettings;
        });

        setNewHoliday(newHolidayTemplate);
        setNewHolidayProvinces([]);
        setNewHolidayAllProvinces(true);
    };
    
    const handleRemoveHoliday = (dateToRemove: string) => {
        setSettings(prev => {
            if (!prev || !prev.configurations?.statutoryHolidays) return prev;
            const newSettings = JSON.parse(JSON.stringify(prev));
            newSettings.configurations.statutoryHolidays = newSettings.configurations.statutoryHolidays.filter((h: StatutoryHoliday) => h.date !== dateToRemove);
            return newSettings;
        });
    };

    const handleProvinceSelection = (province: ProvinceEnum) => {
        setNewHolidayProvinces(prev => 
        prev.includes(province) 
            ? prev.filter(p => p !== province) 
            : [...prev, province]
        );
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updatedSettings = await updateCompanySettings(settings, session.tenantId);
            await fetchData(); // Refresh calendar events with new settings
            setSettings(updatedSettings);
            setInitialSettings(JSON.parse(JSON.stringify(updatedSettings)));
            setSuccessMessage("Calendar settings updated successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            setError("Failed to save settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => handleTabChange('calendar')}
                        className={`${activeTab === 'calendar' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Calendar
                    </button>
                    {currentUser.isAdmin && (
                        <button
                            onClick={() => handleTabChange('settings')}
                            className={`${activeTab === 'settings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Settings
                        </button>
                    )}
                </nav>
            </div>
            
            {activeTab === 'calendar' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Company Events</h2>
                        <div className="flex items-center space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => changeMonth(-1)}>
                                <ChevronLeftIcon className="h-5 w-5" />
                            </Button>
                            <span className="text-lg font-semibold w-32 text-center">
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <Button variant="secondary" size="sm" onClick={() => changeMonth(1)}>
                                <ChevronRightIcon className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 mb-4 text-sm">
                        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-green-100 mr-2 border border-green-200"></span>Time Off</div>
                        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-red-100 mr-2 border border-red-200"></span>Holiday</div>
                        <div className="flex items-center"><span className="h-3 w-3 rounded-full bg-yellow-100 mr-2 border border-yellow-200"></span>Payroll</div>
                    </div>

                    {isLoading && <div className="text-center p-8">Loading calendar...</div>}
                    {error && <div className="text-center p-8 text-red-600">{error}</div>}

                    {!isLoading && !error && (
                        <div className="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200 rounded-lg overflow-hidden">
                            {weekDays.map(day => (
                                <div key={day} className="text-center font-semibold py-2 bg-gray-50 text-sm text-gray-600">{day}</div>
                            ))}
                            {calendarGrid.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} className="bg-gray-50"></div>;
                                const dateStr = day.toISOString().split('T')[0];
                                const dayEvents = events[dateStr] || [];
                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                
                                return (
                                    <div key={dateStr} className="bg-white p-2 min-h-[120px] flex flex-col">
                                        <time
                                            dateTime={dateStr}
                                            className={`font-semibold ${isToday ? 'bg-brand-primary text-white rounded-full h-6 w-6 flex items-center justify-center' : 'text-gray-900'}`}
                                        >
                                            {day.getDate()}
                                        </time>
                                        <div className="mt-2 space-y-1 overflow-y-auto">
                                            {dayEvents.map((event, i) => <EventBadge key={i} event={event} />)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'settings' && currentUser.isAdmin && (
                 <form onSubmit={handleSave}>
                    {isLoading && <Card><div className="text-center p-8">Loading settings...</div></Card>}
                    {error && <Card><div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{error}</div></Card>}
                    {settings && (
                        <Card footer={
                            <div className="flex justify-end items-center gap-4">
                               {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
                                <Button variant="primary" type="submit" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        }>
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-gray-900">Statutory Holidays</h3>
                                    <p className="mt-1 text-sm text-gray-500">Manage the list of official company holidays.</p>
                                    <div className="mt-4 border rounded-md divide-y max-h-72 overflow-y-auto">
                                        {settings.configurations?.statutoryHolidays?.map(holiday => (
                                            <div key={holiday.date} className="p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-900">{holiday.name}</p>
                                                <p className="text-sm text-gray-500">{new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })} - <span className="italic">{holiday.provinces === 'all' ? 'All Provinces' : holiday.provinces.join(', ')}</span></p>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveHoliday(holiday.date)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-6 border-t">
                                        <h4 className="text-md font-medium text-gray-800">Add New Holiday</h4>
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-gray-700">Holiday Name</label><input type="text" value={newHoliday.name} onChange={e => setNewHoliday(p => ({...p, name: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                                            <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={newHoliday.date} onChange={e => setNewHoliday(p => ({...p, date: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                                            <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Applicable Provinces</label>
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center"><input id="all-prov" type="checkbox" checked={newHolidayAllProvinces} onChange={e => setNewHolidayAllProvinces(e.target.checked)} className="h-4 w-4 rounded border-gray-300" /><label htmlFor="all-prov" className="ml-2 text-sm text-gray-900">All Provinces</label></div>
                                                {!newHolidayAllProvinces && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2 border-t">
                                                    {Object.values(Province).map(p => (
                                                        <div key={p} className="flex items-center"><input id={p} type="checkbox" checked={newHolidayProvinces.includes(p)} onChange={() => handleProvinceSelection(p)} className="h-4 w-4 rounded border-gray-300" /><label htmlFor={p} className="ml-2 text-sm text-gray-900">{p}</label></div>
                                                    ))}
                                                    </div>
                                                )}
                                            </div>
                                            </div>
                                            <div className="sm:col-span-2 text-right"><Button type="button" variant="secondary" onClick={handleAddHoliday}>Add Holiday</Button></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </form>
            )}
        </div>
    );
};

export default CompanyCalendar;