import React from 'react';
import { SparklesIcon, ArrowPathIcon } from './icons/Icons';
import Button from './ui/Button';

type Step = 'select' | 'calculating' | 'preview' | 'committed';

interface PayrollAIAgentProps {
  step: Step;
  payPeriod: string;
  selectedEmployeeCount: number;
  totalPayrollCost?: number;
  onNextStep: () => void;
  onCommit: () => void;
  onRunNewPayroll: () => void;
}

const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PayrollAIAgent: React.FC<PayrollAIAgentProps> = ({
  step,
  payPeriod,
  selectedEmployeeCount,
  totalPayrollCost,
  onNextStep,
  onCommit,
  onRunNewPayroll,
}) => {
  
  const getAgentMessage = () => {
    switch (step) {
      case 'select':
        return {
          title: "Let's Get Started",
          message: `Welcome to the payroll run for ${payPeriod}! Please review the ${selectedEmployeeCount} selected employees below. When you're ready, I'll calculate their pay, taxes, and deductions.`,
          action: <Button variant="primary" onClick={onNextStep} disabled={selectedEmployeeCount === 0}>Calculate Payroll</Button>,
        };
      case 'calculating':
        return {
            title: "Calculating...",
            message: `I'm processing the numbers for ${selectedEmployeeCount} employees. I'm double-checking all the latest CRA tax rules, CPP, and EI rates to ensure everything is accurate.`,
            action: <Button variant="primary" disabled icon={<ArrowPathIcon className="animate-spin" />}>Calculating...</Button>
        };
      case 'preview':
        return {
          title: 'Review Payroll',
          message: `Great! Here's the summary. The total cost for this run is ${formatCurrency(totalPayrollCost || 0)}. You can review each employee's paystub below and make adjustments if needed. Everything look correct?`,
          action: <Button variant="primary" onClick={onCommit}>Looks Good, Submit Payroll</Button>,
        };
      case 'committed':
        return {
          title: 'Payroll Submitted!',
          message: "All done! Payroll has been submitted successfully. Your next steps are usually to download the bank file for direct deposits and review the CRA remittance report.",
          action: <Button variant="secondary" onClick={onRunNewPayroll}>Run Another Payroll</Button>,
        };
      default:
        return { title: '', message: '', action: null };
    }
  };
  
  const { title, message, action } = getAgentMessage();

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <SparklesIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <p className="text-sm font-bold text-blue-800">{title}</p>
            <p className="mt-1 text-sm text-blue-700">{message}</p>
          </div>
          <div className="mt-3 md:mt-0 md:ml-6">
            {action}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollAIAgent;
