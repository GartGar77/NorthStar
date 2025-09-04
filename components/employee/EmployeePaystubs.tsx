import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import type { Employee, Paystub, SuperAdmin } from '../../types';
import { getPaystubsForEmployee } from '../../services/api';
import Button from '../ui/Button';
import PaystubDetailModal from './PaystubDetailModal';

interface EmployeePaystubsProps {
  session: { user: Employee | SuperAdmin; tenantId: string };
}

const EmployeePaystubs: React.FC<EmployeePaystubsProps> = ({ session }) => {
  const [paystubs, setPaystubs] = useState<Paystub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaystub, setSelectedPaystub] = useState<Paystub | null>(null);
  const currentUser = session.user as Employee;

  useEffect(() => {
    const fetchPaystubs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPaystubsForEmployee(currentUser.id, session.tenantId);
        setPaystubs(data.sort((a,b) => b.payPeriod.localeCompare(a.payPeriod)));
      } catch (err) {
        console.error(err);
        setError('Could not load your paystubs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaystubs();
  }, [currentUser.id, session.tenantId]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <Card title="My Paystubs">
        {isLoading && <div className="text-center p-8">Loading your paystubs...</div>}
        {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">{error}</div>}
        
        {!isLoading && !error && paystubs.length === 0 && (
          <p className="text-gray-500 text-center py-8">You do not have any paystubs yet.</p>
        )}

        {!isLoading && !error && paystubs.length > 0 && (
          <div className="space-y-3">
            {paystubs.map(p => (
              <div key={p.payPeriod} className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{p.payPeriod}</p>
                  <div className="flex items-center space-x-4 text-sm mt-1 text-slate-600">
                    <span>Gross: {formatCurrency(p.grossPay)}</span>
                    <span>Deductions: {formatCurrency(p.totalDeductions)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                   <div className="flex-1 text-right">
                       <p className="text-sm text-slate-500">Net Pay</p>
                       <p className="font-bold text-lg text-green-600">{formatCurrency(p.netPay)}</p>
                   </div>
                   <Button variant="secondary" size="sm" onClick={() => setSelectedPaystub(p)}>View Details</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <PaystubDetailModal 
        paystub={selectedPaystub}
        onClose={() => setSelectedPaystub(null)}
      />
    </>
  );
};

export default EmployeePaystubs;
