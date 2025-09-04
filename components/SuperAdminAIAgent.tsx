
import React, { useState, useEffect } from 'react';
import type { Tenant } from '../types';
import { SparklesIcon, ShieldExclamationIcon, BuildingOfficeIcon } from './icons/Icons';

type TenantWithEmployeeCount = Tenant & { employeeCount: number };

interface SuperAdminAIAgentProps {
    tenants: TenantWithEmployeeCount[];
}

interface AgentFinding {
  id: string;
  agent: 'Platform Health Monitor' | 'Onboarding Assistant';
  message: string;
  severity: 'info' | 'warning';
  icon: React.ReactNode;
}

const SuperAdminAIAgent: React.FC<SuperAdminAIAgentProps> = ({ tenants }) => {
    const [findings, setFindings] = useState<AgentFinding[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateFindings = () => {
            setIsLoading(true);
            const newFindings: AgentFinding[] = [];

            if (tenants.length > 0) {
                // --- 1. Platform Health Monitor ---
                const totalEmployees = tenants.reduce((sum, t) => sum + t.employeeCount, 0);
                newFindings.push({
                    id: 'phm-summary',
                    agent: 'Platform Health Monitor',
                    message: `Platform overview: ${tenants.length} active tenants managing a total of ${totalEmployees} employees.`,
                    severity: 'info',
                    icon: <BuildingOfficeIcon className="h-6 w-6 text-indigo-500" />,
                });

                const emptyTenants = tenants.filter(t => t.employeeCount === 0);
                emptyTenants.forEach(tenant => {
                    newFindings.push({
                        id: `phm-empty-${tenant.id}`,
                        agent: 'Platform Health Monitor',
                        message: `Tenant "${tenant.name}" has no employees. Consider following up to assist with their onboarding process.`,
                        severity: 'warning',
                        icon: <ShieldExclamationIcon className="h-6 w-6 text-amber-500" />,
                    });
                });
            }

            // --- 2. Onboarding Assistant ---
            newFindings.push({
                id: 'oa-create',
                agent: 'Onboarding Assistant',
                message: `Ready to grow? Use the form on the right to create a new tenant profile and begin onboarding another company.`,
                severity: 'info',
                icon: <SparklesIcon className="h-6 w-6 text-green-500" />,
            });
            
            setFindings(newFindings);
            setIsLoading(false);
        };

        // Simulate analysis time
        const timer = setTimeout(generateFindings, 500);
        return () => clearTimeout(timer);

    }, [tenants]);


    if (isLoading) {
        return <p className="text-slate-500 text-center py-4">AI Assistant is analyzing platform data...</p>;
    }
    
    return (
        <div className="space-y-6">
            {findings.map(finding => (
                 <div key={finding.id} className="flex items-start">
                    <div className="flex-shrink-0">
                      {finding.icon}
                    </div>
                    <div className="ml-3">
                        <h4 className={`text-sm font-semibold ${finding.severity === 'warning' ? 'text-amber-800' : 'text-slate-800'}`}>{finding.agent}</h4>
                        <p className="mt-1 text-sm text-slate-600">{finding.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SuperAdminAIAgent;
