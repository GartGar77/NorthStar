

import React from 'react';
import type { View, Employee } from '../types';
import { HomeIcon, CurrencyDollarIcon, UsersIcon, ChartBarIcon, Cog6ToothIcon, LinkIcon, CalendarDaysIcon, BuildingOfficeIcon, ClockIcon, QuestionMarkCircleIcon, DocumentTextIcon, IdentificationIcon, CheckBadgeIcon } from './icons/Icons';
import Avatar from './ui/Avatar';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  logoUrl: string | null;
  currentUser: Employee;
}

interface NavItem {
    id: View;
    label: string;
    icon: React.ReactNode;
}

interface NavSection {
    section: string;
    items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, logoUrl, currentUser }) => {

  const getCurrentProfile = (employee: Employee) => {
     const today = new Date().toISOString().split('T')[0];
      return employee.profileHistory
          .filter(p => p.effectiveDate <= today)
          .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0].profile;
  };
  
  const userProfile = getCurrentProfile(currentUser);

  const adminNavItems: NavSection[] = [
    { section: 'main', items: [
        { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
        { id: 'payroll', label: 'Payroll', icon: <CurrencyDollarIcon /> },
        { id: 'employees', label: 'Employees', icon: <UsersIcon /> },
        { id: 'approvals', label: 'Approvals', icon: <CheckBadgeIcon /> },
        { id: 'timesheets', label: 'Timesheets', icon: <ClockIcon /> },
        { id: 'time_off', label: 'Time Off', icon: <CalendarDaysIcon /> },
        { id: 'company_calendar', label: 'Company Calendar', icon: <BuildingOfficeIcon /> },
        { id: 'reports', label: 'Reports', icon: <ChartBarIcon /> },
        { id: 'integrations', label: 'Integrations', icon: <LinkIcon /> },
    ]},
    { section: 'My Portal', items: [
        { id: 'my_info', label: 'My Information', icon: <IdentificationIcon /> },
        { id: 'my_documents', label: 'My Documents', icon: <DocumentTextIcon /> },
        { id: 'my_paystubs', label: 'My Paystubs', icon: <CurrencyDollarIcon /> },
        { id: 'my_time_off', label: 'My Time Off', icon: <CalendarDaysIcon /> },
    ]},
    { section: 'System', items: [
        { id: 'settings', label: 'Settings', icon: <Cog6ToothIcon /> },
        { id: 'knowledge_base', label: 'Knowledge Base', icon: <QuestionMarkCircleIcon /> },
    ]}
  ];
  
  const employeeNavItems: NavSection[] = [
    { section: 'My Portal', items: [
        { id: 'my_dashboard', label: 'My Dashboard', icon: <HomeIcon /> },
        { id: 'my_info', label: 'My Information', icon: <IdentificationIcon /> },
        { id: 'my_documents', label: 'My Documents', icon: <DocumentTextIcon /> },
        { id: 'my_paystubs', label: 'My Paystubs', icon: <CurrencyDollarIcon /> },
        { id: 'my_time_off', label: 'My Time Off', icon: <CalendarDaysIcon /> },
        { id: 'timesheets', label: 'Timesheets', icon: <ClockIcon /> },
    ]},
    { section: 'Company', items: [
         { id: 'company_calendar', label: 'Company Calendar', icon: <BuildingOfficeIcon /> },
    ]},
    { section: 'System', items: [
        { id: 'knowledge_base', label: 'Knowledge Base', icon: <QuestionMarkCircleIcon /> },
    ]}
  ];

  const navItems = currentUser.isAdmin ? adminNavItems : employeeNavItems;

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
      <div className="h-20 flex items-center justify-center border-b border-slate-200 px-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Company Logo" className="max-h-12 w-auto" />
        ) : (
          <h1 className="text-2xl font-bold text-brand-primary">NorthStar HCM</h1>
        )}
      </div>
      <nav className="flex-1 px-4 py-6">
        {navItems.map(section => (
            <div key={section.section}>
                {((section.section !== 'main' && section.section !== 'My Portal') || (currentUser.isAdmin && section.section === 'My Portal')) && (
                    <div className="mt-4 pt-4">
                        <div className="border-t border-slate-200 -mx-4 mb-4"></div>
                    </div>
                )}
                 <span className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{section.section}</span>
                <div className={`space-y-1 mt-2`}>
                    {section.items.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveView(item.id);
                            }}
                            className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 relative ${
                              activeView === item.id
                                ? 'bg-brand-light text-brand-primary'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            {activeView === item.id && <div className="absolute left-0 top-2 bottom-2 w-1 bg-brand-primary rounded-r-full"></div>}
                            <span className="w-6 h-6 mr-3">{item.icon}</span>
                            {item.label}
                        </a>
                    ))}
                </div>
            </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <Avatar name={userProfile.name} src={userProfile.avatarUrl} size="md" />
            <div className="ml-3">
                <p className="text-sm font-semibold text-slate-800">{userProfile.name}</p>
                <p className="text-xs text-slate-500">View Profile</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;