import React, { useState, useMemo, useEffect } from 'react';
import type { CompanySettings, EarningCode, DeductionCode, GarnishmentConfiguration, Province as ProvinceEnum } from '../../types';
import { EarningType, DeductionType, DeductionCalculationMethod, Province, GarnishmentCalculationType } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import EarningCodeModal from './EarningCodeModal';
import DeductionCodeModal from './DeductionCodeModal';

interface PayrollSettingsProps {
    settings: CompanySettings | null;
    onSettingsChange: React.Dispatch<React.SetStateAction<CompanySettings | null>>;
    onSave: () => void;
    isSaving: boolean;
    successMessage: string | null;
}

const useUnsavedChangesWarning = (isDirty: boolean) => {
  useEffect(() => {
    const message = 'You have unsaved changes. Are you sure you want to leave?';
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
};

const PayrollSettings: React.FC<PayrollSettingsProps> = ({ settings, onSettingsChange, onSave, isSaving, successMessage }) => {
    const [activeSubTab, setActiveSubTab] = useState<'earnings' | 'deductions' | 'garnishments'>('earnings');
    
    const [isEarningModalOpen, setIsEarningModalOpen] = useState(false);
    const [earningToEdit, setEarningToEdit] = useState<EarningCode | null>(null);
    const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
    const [deductionToEdit, setDeductionToEdit] = useState<DeductionCode | null>(null);
    
    const [newGarnishment, setNewGarnishment] = useState<Omit<GarnishmentConfiguration, 'id'>>({
        name: '', jurisdiction: 'Federal', description: '', calculationType: GarnishmentCalculationType.FixedAmount, priority: 10,
    });
    
    const [initialSettings, setInitialSettings] = useState<CompanySettings | null>(null);

    useEffect(() => {
        // Set initial state only once when the component mounts with valid settings
        if (settings && !initialSettings) {
            setInitialSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [settings, initialSettings]);

    const isDirty = useMemo(() => {
        if (!settings || !initialSettings) return false;
        return JSON.stringify(settings) !== JSON.stringify(initialSettings);
    }, [settings, initialSettings]);

    useUnsavedChangesWarning(isDirty);

    // Reset dirty tracking on successful save from parent
    useEffect(() => {
        if (successMessage) {
            setInitialSettings(JSON.parse(JSON.stringify(settings)));
        }
    }, [successMessage, settings]);
    
    const handleSubTabChange = (tab: 'earnings' | 'deductions' | 'garnishments') => {
        if (isDirty) {
            if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
                return;
            }
        }
        setActiveSubTab(tab);
    };


    const handleSaveEarning = (earning: EarningCode) => {
        onSettingsChange(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            if (!newSettings.configurations.earningCodes) newSettings.configurations.earningCodes = [];
            
            const index = newSettings.configurations.earningCodes.findIndex((c: EarningCode) => c.id === earning.id);
            if (index > -1) {
                newSettings.configurations.earningCodes[index] = earning;
            } else {
                newSettings.configurations.earningCodes.push({ ...earning, id: earning.name.toLowerCase().replace(/\s+/g, '-') + `-${Date.now()}` });
            }
            return newSettings;
        });
        setIsEarningModalOpen(false);
        setEarningToEdit(null);
    };

    const handleSaveDeduction = (deduction: DeductionCode) => {
         onSettingsChange(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            if (!newSettings.configurations.deductionCodes) newSettings.configurations.deductionCodes = [];
            
            const index = newSettings.configurations.deductionCodes.findIndex((c: DeductionCode) => c.id === deduction.id);
            if (index > -1) {
                newSettings.configurations.deductionCodes[index] = deduction;
            } else {
                newSettings.configurations.deductionCodes.push({ ...deduction, id: deduction.name.toLowerCase().replace(/\s+/g, '-') + `-${Date.now()}` });
            }
            return newSettings;
        });
        setIsDeductionModalOpen(false);
        setDeductionToEdit(null);
    };

     const handleAddGarnishment = () => {
        if (!newGarnishment.name || !newGarnishment.jurisdiction) return;
        const newGarn: GarnishmentConfiguration = {
            ...newGarnishment,
            id: newGarnishment.name.toLowerCase().replace(/\s+/g, '-') + `-${new Date().getTime()}`
        };
        onSettingsChange(prev => {
            if (!prev) return null;
            const newSettings = JSON.parse(JSON.stringify(prev));
            if (!newSettings.configurations) newSettings.configurations = { statuses: [] };
            if (!newSettings.configurations.garnishments) newSettings.configurations.garnishments = { canada: [] };
            if (!newSettings.configurations.garnishments.canada) newSettings.configurations.garnishments.canada = [];
            newSettings.configurations.garnishments.canada.push(newGarn);
            newSettings.configurations.garnishments.canada.sort((a: GarnishmentConfiguration, b: GarnishmentConfiguration) => a.priority - b.priority);
            return newSettings;
        });
        setNewGarnishment({ name: '', jurisdiction: 'Federal', description: '', calculationType: GarnishmentCalculationType.FixedAmount, priority: 10 });
    };

    const handleRemoveGarnishment = (idToRemove: string) => {
        onSettingsChange(prev => {
            if (!prev || !prev.configurations?.garnishments?.canada) return prev;
            const newSettings = JSON.parse(JSON.stringify(prev));
            newSettings.configurations.garnishments.canada = newSettings.configurations.garnishments.canada.filter((g: GarnishmentConfiguration) => g.id !== idToRemove);
            return newSettings;
        });
    };

    if (!settings) return <Card title="Payroll Settings"><p>Loading settings...</p></Card>;

    const { earningCodes = [], deductionCodes = [], garnishments } = settings.configurations || {};
    const garnishmentList = garnishments?.canada || [];

    return (
        <div className="space-y-6">
            <Card
                title="Payroll Codes & Garnishments"
                footer={
                    <div className="flex justify-end items-center gap-4">
                        {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
                        <Button variant="primary" onClick={onSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save All Settings'}
                        </Button>
                    </div>
                }
            >
                <div className="flex border-b">
                    <button onClick={() => handleSubTabChange('earnings')} className={`px-4 py-2 text-sm font-medium ${activeSubTab === 'earnings' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Earnings Codes</button>
                    <button onClick={() => handleSubTabChange('deductions')} className={`px-4 py-2 text-sm font-medium ${activeSubTab === 'deductions' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Deductions Codes</button>
                    <button onClick={() => handleSubTabChange('garnishments')} className={`px-4 py-2 text-sm font-medium ${activeSubTab === 'garnishments' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-500'}`}>Garnishments</button>
                </div>

                <div className="pt-6">
                    {activeSubTab === 'earnings' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-slate-600">Define all types of earnings, such as bonuses, allowances, and commissions.</p>
                                <Button variant="primary" onClick={() => { setEarningToEdit(null); setIsEarningModalOpen(true); }}>Add Earning</Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y">
                                    <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Type</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Properties</th><th className="px-4 py-2"></th></tr></thead>
                                    <tbody>
                                        {earningCodes.map(code => (
                                            <tr key={code.id}>
                                                <td className="px-4 py-2 font-medium">{code.name}</td>
                                                <td className="px-4 py-2">{code.type}</td>
                                                <td className="px-4 py-2 text-xs space-x-2">
                                                    <span className={`font-semibold ${code.isTaxable ? 'text-green-600' : 'text-slate-400'}`}>Tax</span>
                                                    <span className={`font-semibold ${code.isPensionable ? 'text-green-600' : 'text-slate-400'}`}>CPP</span>
                                                    <span className={`font-semibold ${code.isInsurable ? 'text-green-600' : 'text-slate-400'}`}>EI</span>
                                                </td>
                                                <td className="px-4 py-2 text-right"><Button variant="secondary" size="sm" onClick={() => { setEarningToEdit(code); setIsEarningModalOpen(true); }}>Edit</Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeSubTab === 'deductions' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-slate-600">Define all deductions, such as RRSP contributions or health premiums.</p>
                                <Button variant="primary" onClick={() => { setDeductionToEdit(null); setIsDeductionModalOpen(true); }}>Add Deduction</Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y">
                                    <thead className="bg-slate-50"><tr><th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Type</th><th className="px-4 py-2 text-left text-xs font-medium uppercase">Method</th><th className="px-4 py-2"></th></tr></thead>
                                    <tbody>
                                        {deductionCodes.map(code => (
                                            <tr key={code.id}>
                                                <td className="px-4 py-2 font-medium">{code.name}</td>
                                                <td className="px-4 py-2">{code.type}</td>
                                                <td className="px-4 py-2">{code.calculationMethod}</td>
                                                <td className="px-4 py-2 text-right"><Button variant="secondary" size="sm" onClick={() => { setDeductionToEdit(code); setIsDeductionModalOpen(true); }}>Edit</Button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeSubTab === 'garnishments' && (
                        <div>
                            <h4 className="text-md font-medium text-slate-800">Defined Garnishments</h4>
                            <div className="border border-slate-200 rounded-md divide-y divide-slate-200 mt-4">
                                {garnishmentList.map(garn => (
                                    <div key={garn.id} className="p-3 flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-slate-900">{garn.name}</p>
                                            <p className="text-sm text-slate-500">{garn.jurisdiction} - Priority {garn.priority} ({garn.calculationType})</p>
                                            <p className="text-xs text-slate-500 mt-1">{garn.description}</p>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveGarnishment(garn.id)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
                                    </div>
                                ))}
                                {garnishmentList.length === 0 && <p className="p-4 text-sm text-slate-500">No garnishments have been configured.</p>}
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <h4 className="text-md font-medium text-slate-800">Add New Garnishment</h4>
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700">Name</label><input type="text" value={newGarnishment.name} onChange={e => setNewGarnishment(p => ({...p, name: e.target.value}))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                    <div><label className="block text-sm font-medium text-slate-700">Jurisdiction</label><select value={newGarnishment.jurisdiction} onChange={e => setNewGarnishment(p => ({...p, jurisdiction: e.target.value as 'Federal' | ProvinceEnum}))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"><option value="Federal">Federal</option>{Object.values(Province).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-slate-700">Calculation Type</label><select value={newGarnishment.calculationType} onChange={e => setNewGarnishment(p => ({...p, calculationType: e.target.value as GarnishmentCalculationType}))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm">{Object.values(GarnishmentCalculationType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium text-slate-700">Priority</label><input type="number" value={newGarnishment.priority} onChange={e => setNewGarnishment(p => ({...p, priority: Number(e.target.value)}))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /><p className="text-xs text-slate-500">Lower number is deducted first.</p></div>
                                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700">Description</label><input type="text" value={newGarnishment.description} onChange={e => setNewGarnishment(p => ({...p, description: e.target.value}))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm" /></div>
                                    <div className="sm:col-span-2 text-right"><Button type="button" variant="secondary" onClick={handleAddGarnishment}>Add Garnishment</Button></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {isEarningModalOpen && (
                <EarningCodeModal
                    isOpen={isEarningModalOpen}
                    onClose={() => setIsEarningModalOpen(false)}
                    onSave={handleSaveEarning}
                    earningToEdit={earningToEdit}
                />
            )}
            {isDeductionModalOpen && (
                <DeductionCodeModal
                    isOpen={isDeductionModalOpen}
                    onClose={() => setIsDeductionModalOpen(false)}
                    onSave={handleSaveDeduction}
                    deductionToEdit={deductionToEdit}
                />
            )}
        </div>
    );
};

export default PayrollSettings;