import React, { useState } from 'react';
import type { Paystub, Employee, SuperAdmin } from '../types';
import { analyzePayrollVariance } from '../services/geminiService';
import Button from './ui/Button';
import { ChatBubbleLeftRightIcon, ArrowPathIcon } from './icons/Icons';

interface PayrollVarianceAIAgentProps {
    currentRun: Paystub[];
    previousRun: Paystub[];
    employeeMap: Map<number, Employee>;
    session: { user: Employee | SuperAdmin; tenantId: string };
}

const PayrollVarianceAIAgent: React.FC<PayrollVarianceAIAgentProps> = ({ currentRun, previousRun, employeeMap, session }) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        setAnalysis(null);
        try {
            const result = await analyzePayrollVariance(currentRun, previousRun, employeeMap);
            setAnalysis(result);
        } catch (err) {
            setError('The AI agent failed to provide an analysis. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (previousRun.length === 0) {
        return null; // Don't show if there's no previous run to compare against
    }

    return (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
            <div className="flex">
                <div className="flex-shrink-0">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-amber-500" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-amber-800">Variance Analysis</p>
                    <div className="mt-2 text-sm text-amber-700">
                        <p>The total cost has changed since the last payroll run. Would you like me to analyze why?</p>
                        {!isAnalyzing && !analysis && (
                            <div className="mt-3">
                                <Button variant="secondary" size="sm" onClick={handleAnalyze}>
                                    Why the change?
                                </Button>
                            </div>
                        )}
                        {isAnalyzing && (
                            <div className="mt-3 flex items-center space-x-2 text-slate-500">
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                <span>Analyzing...</span>
                            </div>
                        )}
                        {analysis && (
                            <div className="mt-4 pt-3 border-t border-amber-200 prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />').replace(/\* /g, '&bull; ') }} />
                        )}
                        {error && <p className="mt-2 text-red-600">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollVarianceAIAgent;
