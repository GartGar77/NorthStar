


import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import type { View, Employee, SuperAdmin, EmployeeProfile } from '../types';
import { CurrencyDollarIcon, ClockIcon, UsersIcon } from './icons/Icons';
import AIAgents from './AIAgents';

interface DashboardProps {
  setActiveView: (view: View) => void;
  openAddEmployee: () => void;
  session: { user: Employee | SuperAdmin | null; tenantId: string | null };
}

const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    return employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0].profile;
};


const Dashboard: React.FC<DashboardProps> = ({ setActiveView, openAddEmployee, session }) => {
  const currentUser = session.user as Employee;
  const welcomeName = getCurrentProfile(currentUser).name.split(' ')[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Welcome back, {welcomeName}!</h2>
          <p className="text-slate-500 mt-1">Here's your payroll and HR summary.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="secondary" onClick={openAddEmployee}>Add Employee</Button>
            <Button variant="primary" onClick={() => setActiveView('payroll')}>
              Run Payroll
            </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-brand-light">
               <ClockIcon className="h-8 w-8 text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Next Payroll Run</p>
              <p className="text-2xl font-bold text-slate-800">July 31, 2024</p>
            </div>
          </div>
        </Card>

        <Card>
           <div className="flex items-center space-x-4">
             <div className="p-3 rounded-lg bg-green-100">
               <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
             </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Last Payroll Cost</p>
              <p className="text-2xl font-bold text-slate-800">$21,450.78</p>
            </div>
          </div>
        </Card>

        <Card>
           <div className="flex items-center space-x-4">
             <div className="p-3 rounded-lg bg-purple-100">
               <UsersIcon className="h-8 w-8 text-purple-600" />
             </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Employees</p>
              <p className="text-2xl font-bold text-slate-800">5</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="AI Agent Insights">
        <AIAgents setActiveView={setActiveView} session={session} />
      </Card>

    </div>
  );
};

export default Dashboard;