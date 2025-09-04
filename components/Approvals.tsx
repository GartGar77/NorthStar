import React, { useState, useEffect, useCallback } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { getChangeRequests, updateChangeRequestStatus } from '../services/api';
import type { ChangeRequest, Employee, SuperAdmin, AllocatedBankDetails, CompanyAddress, PhoneNumber, EmailAddress } from '../types';
import { ChangeRequestStatus, ChangeRequestType } from '../types';
import Avatar from './ui/Avatar';

interface ApprovalsProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const StatusBadge: React.FC<{ status: ChangeRequestStatus }> = ({ status }) => {
  const styles = {
    [ChangeRequestStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [ChangeRequestStatus.Approved]: 'bg-green-100 text-green-800',
    [ChangeRequestStatus.Rejected]: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
};

const DiffViewer: React.FC<{ request: ChangeRequest }> = ({ request }) => {
    const { type, oldValue, newValue } = request;

    if (type === ChangeRequestType.ProfilePhoto) {
        return (
            <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                <div className="bg-slate-50 p-3 rounded-md text-center">
                    <h4 className="font-semibold text-slate-600 border-b pb-1 mb-2">Previous Photo</h4>
                    <Avatar name={request.employeeName} src={oldValue as string} size="lg" className="mx-auto" />
                </div>
                <div className="bg-green-50 p-3 rounded-md border border-green-200 text-center">
                    <h4 className="font-semibold text-green-700 border-b border-green-200 pb-1 mb-2">New Photo</h4>
                    <Avatar name={request.employeeName} src={newValue as string} size="lg" className="mx-auto" />
                </div>
            </div>
        );
    }

    const renderValue = (value: any, isNew = false) => {
        if (typeof value === 'string') {
            if (type === ChangeRequestType.SIN) return `***-***-${value.slice(-3)}`;
            return value;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) return <p className="text-xs italic">No items.</p>;
            
            if (type === ChangeRequestType.BankDetails) {
                const accounts = value as AllocatedBankDetails[];
                return (
                    <ul className="text-xs space-y-2">
                        {accounts.map((acc, index) => (
                            <li key={acc.id || index} className="border-t pt-2 first:border-t-0 first:pt-0">
                                <p className="font-semibold">{acc.nickname || `Account ${index + 1}`} ({acc.allocationPercent}%)</p>
                                <p>Inst: {acc.institution}, Transit: {acc.transit}, Acct: ...{String(acc.account).slice(-4)}</p>
                            </li>
                        ))}
                    </ul>
                );
            }

            if (type === ChangeRequestType.PhoneNumber || type === ChangeRequestType.EmailAddress) {
                return (
                    <ul className="text-xs space-y-1">
                        {value.map((item: PhoneNumber | EmailAddress, i) => (
                            <li key={i}>
                                <span className="font-semibold">{item.type}:</span> {'number' in item ? item.number : item.address}
                            </li>
                        ))}
                    </ul>
                );
            }
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) { // For Address
            return (
                <ul className="text-xs space-y-1">
                    {Object.entries(value).map(([key, val]) => (
                        <li key={key}><span className="font-semibold capitalize">{key}:</span> {String(val)}</li>
                    ))}
                </ul>
            );
        }
        return 'N/A';
    };

    return (
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
            <div className="bg-slate-50 p-3 rounded-md">
                <h4 className="font-semibold text-slate-600 border-b pb-1 mb-2">Previous Value</h4>
                {renderValue(oldValue)}
            </div>
             <div className="bg-green-50 p-3 rounded-md border border-green-200">
                <h4 className="font-semibold text-green-700 border-b border-green-200 pb-1 mb-2">New Value</h4>
                {renderValue(newValue, true)}
            </div>
        </div>
    );
};

const Approvals: React.FC<ApprovalsProps> = ({ session }) => {
    const [requests, setRequests] = useState<ChangeRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getChangeRequests(session.tenantId);
            setRequests(data.filter(r => r.status === ChangeRequestStatus.Pending));
        } catch (err) {
            setError('Failed to load pending approvals.');
        } finally {
            setIsLoading(false);
        }
    }, [session.tenantId]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleUpdate = async (requestId: string, status: ChangeRequestStatus.Approved | ChangeRequestStatus.Rejected) => {
        try {
            await updateChangeRequestStatus(session.tenantId, requestId, status);
            fetchRequests(); // Refresh the list
        } catch (err) {
            setError(`Failed to ${status.toLowerCase()} the request.`);
        }
    };
    
    return (
        <Card title="Pending Approvals">
            <p className="text-slate-500 mb-6">Review and approve or reject change requests submitted by employees.</p>
            {isLoading && <p className="text-center py-8">Loading requests...</p>}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>}
            
            {!isLoading && requests.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="font-semibold text-slate-700">All caught up!</p>
                    <p className="text-slate-500 mt-1">There are no pending requests to review.</p>
                </div>
            )}

            {!isLoading && requests.length > 0 && (
                <div className="space-y-4">
                    {requests.map(req => (
                        <div key={req.id} className="border rounded-lg p-4 bg-white shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                <div>
                                    <h3 className="font-bold text-slate-800">{req.type} Change Request</h3>
                                    <p className="text-sm text-slate-500">
                                        Submitted by <span className="font-medium">{req.employeeName}</span> on {new Date(req.requestedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                                    <Button variant="danger" size="sm" onClick={() => handleUpdate(req.id, ChangeRequestStatus.Rejected)}>Reject</Button>
                                    <Button variant="primary" size="sm" onClick={() => handleUpdate(req.id, ChangeRequestStatus.Approved)}>Approve</Button>
                                </div>
                            </div>
                            <DiffViewer request={req} />
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default Approvals;