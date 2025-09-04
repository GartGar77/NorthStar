


import React, { useState, useEffect } from 'react';
import { getEmployees, getTenants, getSuperAdmin } from './services/api';
import type { Employee, EmployeeProfile, Tenant, SuperAdmin } from './types';
import Card from './components/ui/Card';
import Avatar from './components/ui/Avatar';
import { ShieldCheckIcon } from './components/icons/Icons';
import Button from './components/ui/Button';

interface LoginScreenProps {
  onLogin: (employee: Employee, tenantId: string) => void;
  onSuperAdminLogin: (user: SuperAdmin) => void;
}

const getCurrentProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    const currentRecord = employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    
    return currentRecord ? currentRecord.profile : employee.profileHistory[0].profile;
};

type TenantWithEmployees = Tenant & { employees: Employee[] };

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onSuperAdminLogin }) => {
  const [tenants, setTenants] = useState<TenantWithEmployees[]>([]);
  const [superAdmin, setSuperAdmin] = useState<SuperAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: tenantList } = await getTenants({limit: 100}); // Fetch all for login screen
        const superAdminUser = await getSuperAdmin();
        setSuperAdmin(superAdminUser);

        const tenantsWithEmployees = await Promise.all(
          tenantList.map(async (tenant) => {
            const { data: employees } = await getEmployees(tenant.id, {});
            return { ...tenant, employees };
          })
        );
        setTenants(tenantsWithEmployees);
      } catch (error) {
        console.error("Failed to fetch data for login screen", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-brand-primary">AcceleroHR</h1>
        <p className="text-slate-600 mt-2">Payroll & HR for Canadian SMBs</p>
      </div>
      <Card title="Log in" className="w-full max-w-4xl">
        {isLoading ? (
          <div className="text-center p-8 text-slate-500">Loading companies and users...</div>
        ) : (
          <div className="space-y-6">
             {superAdmin && (
                 <div className="text-center p-4 bg-slate-100 rounded-lg">
                    <p className="font-semibold text-slate-800">Are you the platform owner?</p>
                    <Button variant="primary" className="mt-2" onClick={() => onSuperAdminLogin(superAdmin)}>
                        Log in as Platform Administrator
                    </Button>
                </div>
             )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {tenants.map(tenant => (
                    <div key={tenant.id}>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">{tenant.name}</h3>
                        <div className="space-y-3">
                        {tenant.employees.map(employee => {
                            const profile = getCurrentProfile(employee);
                            return (
                                <div
                                key={employee.id}
                                onClick={() => onLogin(employee, tenant.id)}
                                className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-brand-light hover:border-brand-primary cursor-pointer transition-all duration-150"
                                >
                                <Avatar name={profile.name} src={profile.avatarUrl} size="md" />
                                <div className="ml-4">
                                    <p className="font-semibold text-slate-800 flex items-center">
                                    {profile.name}
                                    {employee.isAdmin && <ShieldCheckIcon className="h-4 w-4 ml-2 text-blue-500" title="Administrator" />}
                                    </p>
                                    <p className="text-sm text-slate-500">{profile.role}</p>
                                </div>
                                </div>
                            );
                        })}
                         {tenant.employees.length === 0 && (
                            <p className="text-sm text-slate-400 italic text-center py-4">No users in this company.</p>
                         )}
                        </div>
                    </div>
                ))}
            </div>

          </div>
        )}
      </Card>
      <p className="text-xs text-slate-400 mt-8">This is a simulated multi-tenant login. Select a user to enter their portal.</p>
    </div>
  );
};

export default LoginScreen;