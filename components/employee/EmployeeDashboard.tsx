import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { Employee, View, TimeOffPolicy } from '../../types';
import { getTimeOffPolicies } from '../../services/api';
import { SunIcon, HeartIcon, IdentificationIcon, DocumentTextIcon, CurrencyDollarIcon, CalendarDaysIcon } from '../icons/Icons';

interface EmployeeDashboardProps {
  session: { user: Employee; tenantId: string };
  setActiveView: (view: View) => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ session, setActiveView }) => {
  const { user: currentUser, tenantId } = session;
  const currentProfile = currentUser.profileHistory[0].profile;

  const [policies, setPolicies] = useState<TimeOffPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
        setIsLoading(false);
        return;
    }
    const fetchPolicies = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pols = await getTimeOffPolicies(tenantId);
            setPolicies(pols);
        } catch (err) {
            console.error(err);
            setError("Could not load time off policies.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchPolicies();
  }, [tenantId]);

  const policyMap = useMemo(() => {
    return policies.reduce((acc, pol) => {
        acc[pol.id] = pol;
        return acc;
    }, {} as Record<string, TimeOffPolicy>);
  }, [policies]);

  const getPolicyIcon = (policyName: string = '') => {
    const lowerName = policyName.toLowerCase();
    if (lowerName.includes('vacation')) return <SunIcon className="h-8 w-8 mx-auto text-amber-500" />;
    if (lowerName.includes('sick')) return <HeartIcon className="h-8 w-8 mx-auto text-red-500" />;
    return <CalendarDaysIcon className="h-8 w-8 mx-auto text-slate-500" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Welcome back, {currentProfile.name.split(' ')[0]}!</h2>
        <p className="text-slate-500 mt-1">This is your personal dashboard.</p>
      </div>

      <Card title="My Time Off Balances">
          {isLoading ? (
              <p className="text-slate-500">Loading balances...</p>
          ) : error ? (
              <p className="text-red-600">{error}</p>
          ) : Object.keys(currentUser.timeOffBalances).length === 0 ? (
              <p className="text-slate-500 text-center py-4">No time off policies assigned to you.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(currentUser.timeOffBalances).map(([policyId, balance]) => {
                const policy = policyMap[policyId];
                if (!policy) return null;
                return (
                  <div key={policyId} className="bg-slate-50 p-4 rounded-lg border text-center">
                    {getPolicyIcon(policy.name)}
                    <p className="mt-2 text-sm text-slate-500">{policy.name}</p>
                    <p className="text-3xl font-bold text-slate-800">{balance} <span className="text-xl font-normal text-slate-600">hours</span></p>
                  </div>
                )
              })}
            </div>
          )}
      </Card>
      
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => setActiveView('my_info')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-brand-light transition-colors group">
                <IdentificationIcon className="h-8 w-8 text-slate-500 group-hover:text-brand-primary" />
                <p className="mt-2 text-sm font-semibold text-slate-700 group-hover:text-brand-primary">My Information</p>
            </button>
             <button onClick={() => setActiveView('my_paystubs')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-brand-light transition-colors group">
                <CurrencyDollarIcon className="h-8 w-8 text-slate-500 group-hover:text-brand-primary" />
                <p className="mt-2 text-sm font-semibold text-slate-700 group-hover:text-brand-primary">My Paystubs</p>
            </button>
             <button onClick={() => setActiveView('my_documents')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-brand-light transition-colors group">
                <DocumentTextIcon className="h-8 w-8 text-slate-500 group-hover:text-brand-primary" />
                <p className="mt-2 text-sm font-semibold text-slate-700 group-hover:text-brand-primary">My Documents</p>
            </button>
             <button onClick={() => setActiveView('my_time_off')} className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg hover:bg-brand-light transition-colors group">
                <CalendarDaysIcon className="h-8 w-8 text-slate-500 group-hover:text-brand-primary" />
                <p className="mt-2 text-sm font-semibold text-slate-700 group-hover:text-brand-primary">Request Time Off</p>
            </button>
        </div>
      </Card>

    </div>
  );
};

export default EmployeeDashboard;
