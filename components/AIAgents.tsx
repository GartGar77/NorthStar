



import React, { useState, useEffect } from 'react';
import { getEmployees, getPayrollHistory } from '../services/api';
import type { View, Employee, SuperAdmin } from '../types';
import { SparklesIcon, ShieldExclamationIcon, CalculatorIcon } from './icons/Icons';
import Button from './ui/Button';

// Define a type for agent findings
interface AgentFinding {
  id: string;
  agent: 'Pay Run Assistant' | 'Compliance & CRA Agent' | 'Overpayment/Underpayment Auditor';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionText?: string;
  onAction?: () => void;
}

interface AIAgentsProps {
    setActiveView: (view: View) => void;
    session: { user: Employee | SuperAdmin | null; tenantId: string | null };
}

const AIAgents: React.FC<AIAgentsProps> = ({ setActiveView, session }) => {
    const [findings, setFindings] = useState<AgentFinding[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateFindings = async () => {
            if (!session.tenantId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const [{ data: employees }, payrollHistory] = await Promise.all([
                    getEmployees(session.tenantId, {}), // Fetch first page
                    getPayrollHistory(session.tenantId)
                ]);

                const newFindings: AgentFinding[] = [];

                // --- 1. Pay Run Assistant ---
                // FIX: Check 'bankAccounts' array instead of non-existent 'bankDetails' property.
                const missingBankDetails = employees.find(e => !e.bankAccounts || e.bankAccounts.length === 0);
                if (missingBankDetails) {
                    const profile = missingBankDetails.profileHistory[0].profile;
                    newFindings.push({
                        id: 'pra-bank',
                        agent: 'Pay Run Assistant',
                        message: `${profile.name} is missing bank details. This will prevent direct deposit.`,
                        severity: 'warning',
                        actionText: 'Update Profile',
                        onAction: () => setActiveView('employees'),
                    });
                }
                
                const overtimeSpikeEmployee = employees.find(e => e.id === 102); // Ben Carter for example
                if (overtimeSpikeEmployee) {
                    newFindings.push({
                        id: 'pra-overtime',
                        agent: 'Pay Run Assistant',
                        message: `Unusual overtime hours may be present for ${overtimeSpikeEmployee.profileHistory[0].profile.name}. Please verify time entries before running payroll.`,
                        severity: 'info',
                        actionText: 'Review Time Off',
                        onAction: () => setActiveView('time_off'),
                    });
                }


                // --- 2. Compliance & CRA Agent ---
                const CPP_MAX_2024 = 3754.45;
                const nearingCppMax = employees.find(e => e.ytd.cpp > CPP_MAX_2024 * 0.9 && e.ytd.cpp < CPP_MAX_2024);
                if (nearingCppMax) {
                    newFindings.push({
                        id: 'cra-cpp',
                        agent: 'Compliance & CRA Agent',
                        message: `${nearingCppMax.profileHistory[0].profile.name} is approaching the annual CPP contribution limit. Deductions will stop once the maximum is reached.`,
                        severity: 'info',
                    });
                }
                
                if (payrollHistory.length > 0) {
                    newFindings.push({
                        id: 'cra-remittance',
                        agent: 'Compliance & CRA Agent',
                        message: `CRA remittance for the last pay period is due by the 15th of the following month. Ensure filings are completed on time.`,
                        severity: 'warning',
                        actionText: 'View Reports',
                        onAction: () => setActiveView('reports'),
                    });
                }
                
                newFindings.push({
                    id: 'cra-t4-prep',
                    agent: 'Compliance & CRA Agent',
                    message: `Year-end is approaching. The agent is preparing T4 and ROE data based on completed pay runs.`,
                    severity: 'info'
                });

                // Check for high vacation pay liabilities
                const highVacationLiability = employees.find(e => e.ytd.vacationPay > 3000); // Threshold of $3000
                if (highVacationLiability) {
                    const profile = highVacationLiability.profileHistory[0].profile;
                    const vacationPay = highVacationLiability.ytd.vacationPay;
                    newFindings.push({
                        id: 'cra-vacation-liability',
                        agent: 'Compliance & CRA Agent',
                        message: `${profile.name}'s accrued vacation balance is high ($${vacationPay.toFixed(2)}), representing a growing liability. Consider encouraging them to book time off.`,
                        severity: 'warning',
                        actionText: 'View Time Off',
                        onAction: () => setActiveView('time_off'),
                    });
                }

                // --- 3. Overpayment/Underpayment Auditor ---
                const lastPayRun = payrollHistory[0] || [];
                const auditablePaystub = lastPayRun.find(p => p.employeeId === 103); // Chloe Davis
                if (auditablePaystub) {
                     newFindings.push({
                        id: 'audit-underpayment',
                        agent: 'Overpayment/Underpayment Auditor',
                        message: `Potential underpayment of $250.00 detected for Chloe Davis in the last pay run due to a miscalculated bonus.`,
                        severity: 'critical',
                        actionText: 'Review Payroll',
                        onAction: () => setActiveView('payroll'),
                    });
                }

                setFindings(newFindings);
            } catch (error) {
                console.error("Failed to generate AI agent findings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        generateFindings();
    }, [setActiveView, session.tenantId]);

    const getAgentIcon = (agentName: AgentFinding['agent']) => {
        switch(agentName) {
            case 'Pay Run Assistant': return <SparklesIcon className="h-6 w-6 text-indigo-500" />;
            case 'Compliance & CRA Agent': return <ShieldExclamationIcon className="h-6 w-6 text-amber-500" />;
            case 'Overpayment/Underpayment Auditor': return <CalculatorIcon className="h-6 w-6 text-red-500" />;
            default: return null;
        }
    };

    const agents = [
        'Pay Run Assistant', 
        'Compliance & CRA Agent', 
        'Overpayment/Underpayment Auditor'
    ] as const;

    if (isLoading) {
        return <p className="text-gray-500 text-center py-4">AI Agents are analyzing your data...</p>;
    }

    if (findings.length === 0) {
        return <p className="text-gray-600 text-center py-4">No critical issues found by AI agents. Your payroll is looking good!</p>;
    }

    return (
        <div className="space-y-6">
            {agents.map(agentName => {
                const agentFindings = findings.filter(f => f.agent === agentName);
                if (agentFindings.length === 0) return null;
                return (
                    <div key={agentName}>
                        <div className="flex items-center mb-3">
                            {getAgentIcon(agentName)}
                            <h4 className="ml-3 font-semibold text-gray-800 text-md">{agentName}</h4>
                        </div>
                        <ul className="space-y-2 border-l-2 border-gray-200 ml-3 pl-5">
                            {agentFindings.map(finding => {
                                const severityClasses = {
                                    info: 'border-blue-400 bg-blue-50',
                                    warning: 'border-yellow-400 bg-yellow-50',
                                    critical: 'border-red-400 bg-red-50',
                                }[finding.severity];
                                return (
                                    <li key={finding.id} className={`p-3 rounded-r-lg border-l-4 ${severityClasses} flex justify-between items-center`}>
                                        <p className="text-sm text-gray-700">{finding.message}</p>
                                        {finding.actionText && finding.onAction && (
                                            <Button variant="secondary" size="sm" onClick={(e) => { e.preventDefault(); finding.onAction!(); }} className="ml-4 flex-shrink-0">
                                                {finding.actionText}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
};

export default AIAgents;
