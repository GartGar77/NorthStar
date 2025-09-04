import React, { useState, useEffect, useCallback } from 'react';
import { getTenants, getEmployees } from '../services/api';
import type { Tenant, Partner } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { BuildingOfficeIcon } from './icons/Icons';

interface PartnerDashboardProps {
  partner: Partner;
  onManageTenant: (tenantId: string) => void;
  onLogout: () => void;
}

type TenantWithEmployeeCount = Tenant & { employeeCount: number };

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ partner, onManageTenant, onLogout }) => {
  const [managedTenants, setManagedTenants] = useState<TenantWithEmployeeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchManagedTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: allTenants } = await getTenants({ limit: 1000 }); // Fetch all to filter from
      const tenantsToFetch = allTenants.filter(t => partner.tenantIds.includes(t.id));

      const tenantsWithCounts = await Promise.all(
        tenantsToFetch.map(async (tenant) => {
          const { total: employeeCount } = await getEmployees(tenant.id, { limit: 1 });
          return { ...tenant, employeeCount };
        })
      );
      setManagedTenants(tenantsWithCounts);
    } catch (error) {
      console.error("Failed to fetch managed tenants", error);
    } finally {
      setIsLoading(false);
    }
  }, [partner.tenantIds]);

  useEffect(() => {
    fetchManagedTenants();
  }, [fetchManagedTenants]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Partner Portal</h1>
            <p className="text-sm text-slate-500">Welcome, {partner.name}</p>
          </div>
          <Button variant="secondary" onClick={onLogout}>Log Out</Button>
        </div>
      </header>
      <main className="py-8">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <Card title="Assigned Customer Tenants">
            {isLoading ? (
              <p className="text-center text-slate-500 py-8">Loading assigned tenants...</p>
            ) : managedTenants.length === 0 ? (
              <p className="text-center py-8 text-slate-500 px-6">You have not been assigned to any tenants yet.</p>
            ) : (
              <div className="divide-y divide-slate-200 -mx-6">
                {managedTenants.map(tenant => (
                  <div key={tenant.id} className="p-4 px-6 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-slate-50">
                    <div className="flex items-center mb-3 sm:mb-0">
                      <div className="p-3 bg-brand-light rounded-lg">
                        <BuildingOfficeIcon className="h-6 w-6 text-brand-primary" />
                      </div>
                      <div className="ml-4">
                        <p className="font-semibold text-slate-900">{tenant.name}</p>
                        <p className="text-sm text-slate-500">{tenant.employeeCount} employees</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <Button variant="primary" size="sm" onClick={() => onManageTenant(tenant.id)}>
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PartnerDashboard;