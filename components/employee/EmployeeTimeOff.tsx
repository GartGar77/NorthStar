import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type { Employee, TimeOffRequest, TimeOffPolicy, SuperAdmin } from '../../types';
import { TimeOffRequestStatus, TimeOffRequestUnit } from '../../types';
import { getTimeOffPolicies, getTimeOffRequests, addTimeOffRequest } from '../../services/api';
import TimeOffRequestModal from './TimeOffRequestModal';
import { SunIcon, HeartIcon, CalendarDaysIcon } from '../icons/Icons';

interface EmployeeTimeOffProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const StatusBadge: React.FC<{ status: TimeOffRequestStatus }> = ({ status }) => {
  const styles = {
    [TimeOffRequestStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [TimeOffRequestStatus.Approved]: 'bg-green-100 text-green-800',
    [TimeOffRequestStatus.Denied]: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};


const EmployeeTimeOff: React.FC<EmployeeTimeOffProps> = ({ session }) => {
    const currentUser = session.user as Employee;

    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [policies, setPolicies] = useState<TimeOffPolicy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [reqs, pols] = await Promise.all([
                getTimeOffRequests(session.tenantId),
                getTimeOffPolicies(session.tenantId)
            ]);
            setRequests(reqs.filter(r => r.employeeId === currentUser.id));
            setPolicies(pols);
        } catch (err) {
            console.error(err);
            setError("Failed to load your time off information.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentUser.id, session.tenantId]);
    
    const policyMap = useMemo(() => {
        return policies.reduce((acc, pol) => {
            acc[pol.id] = pol;
            return acc;
        }, {} as Record<string, TimeOffPolicy>);
    }, [policies]);

    const handleRequestSubmit = async (data: Omit<TimeOffRequest, 'id' | 'status' | 'employeeId'>) => {
        try {
            await addTimeOffRequest({ ...data, employeeId: currentUser.id }, session.tenantId);
            setIsRequestModalOpen(false);
            await fetchData(); // Refresh data
        } catch (err) {
            setError("Failed to submit your request. Please try again.");
        }
    };
    
    const assignedPolicies = useMemo(() => {
        return policies.filter(p => currentUser.timeOffBalances.hasOwnProperty(p.id));
    }, [policies, currentUser.timeOffBalances]);
    
    const getPolicyIcon = (policyName: string = '') => {
        const lowerName = policyName.toLowerCase();
        if (lowerName.includes('vacation')) return <SunIcon className="h-8 w-8 mx-auto text-amber-500" />;
        if (lowerName.includes('sick')) return <HeartIcon className="h-8 w-8 mx-auto text-red-500" />;
        return <CalendarDaysIcon className="h-8 w-8 mx-auto text-slate-500" />;
    }

    return (
        <>
        <div className="space-y-6">
            <Card title="My Time Off Balances" actions={<Button variant="primary" onClick={() => setIsRequestModalOpen(true)}>Request Time Off</Button>}>
                {isLoading && <p>Loading balances...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!isLoading && (
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

            <Card title="My Requests">
                 {isLoading && <p>Loading requests...</p>}
                 {!isLoading && requests.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">You haven't made any requests yet.</p>
                 ) : (
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.id} className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-slate-800">{policyMap[req.policyId]?.name || 'Time Off'}</p>
                                    <p className="text-sm text-slate-500">
                                        {req.unit === TimeOffRequestUnit.Hours
                                            ? `${req.startDate} (${req.hours} hrs)`
                                            : (req.startDate === req.endDate ? req.startDate : `${req.startDate} to ${req.endDate}`)
                                        }
                                    </p>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>
                        ))}
                    </div>
                 )}
            </Card>
        </div>
        
        {isRequestModalOpen && (
            <TimeOffRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                onSubmit={handleRequestSubmit}
                availablePolicies={assignedPolicies}
            />
        )}
        </>
    );
};

export default EmployeeTimeOff;
