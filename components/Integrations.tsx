
import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { getIntegrations, getGovernmentIntegrations, getBenefitsIntegrations } from '../services/api';
import type { Integration, Employee, SuperAdmin } from '../types';
import { CRAIcon, RevenuQuebecIcon } from './icons/Icons';

const IntegrationLogo: React.FC<{ name: string }> = ({ name }) => {
    const renderLogo = () => {
        switch (name) {
            case 'QuickBooks':
                return (
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#2CA01C]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zm-2.5 4a1 1 0 0 1 1.5.832V11h2v-1.668a1 1 0 1 1 2 0V11h.5a1 1 0 1 1 0 2h-.5v1.168a1 1 0 1 1-2 0V13h-2v1.168a1 1 0 1 1-2 0V13h-.5a1 1 0 1 1 0-2h.5V9.332A1 1 0 0 1 9.5 8.5z" /></svg>
                    </div>
                );
            case 'Xero':
                return (
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#13B5EA]">
                         <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm4.243 5.757a1 1 0 0 0-1.414-1.414L12 9.172 9.172 6.343a1 1 0 0 0-1.414 1.414L10.586 10.5l-2.829 2.828a1 1 0 1 0 1.414 1.414L12 11.914l2.828 2.829a1 1 0 0 0 1.414-1.414L13.414 10.5l2.829-2.829z" /></svg>
                    </div>
                );
            case 'Wave':
                return (
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#00A2E0]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M2.33 11.72c-.225-.53.07-1.12.6-1.345l5.58-2.34C9.53 7.61 10.47 8 10.9 8.97l3.2 7.27c.43.98-.26 2.05-1.24 2.1l-5.58 2.34c-1.02.04-1.7-1.02-1.24-2.09l-3.7-8.83zm12.59 1.56c-.22-.53.07-1.12.6-1.34l5.58-2.34c1.02-.43 2.05.26 2.1 1.24l.32 5.58c.04 1.02-1.02 1.7-2.09 1.24l-5.58-2.34c-.53-.22-.83-.82-.93-1.35z" /></svg>
                    </div>
                );
            case 'Canada Revenue Agency (CRA)': return <CRAIcon className="h-12 w-12 text-[#AE1129]" />;
            case 'Revenu Québec': return <RevenuQuebecIcon className="h-12 w-12 text-[#00529B]" />;
            case 'Sun Life': return <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-orange-500 text-white font-bold text-xs">Sun Life</div>;
            case 'Manulife': return <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-green-600 text-white font-bold text-xs">Manulife</div>;
            case 'Canada Life': return <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-red-600 text-white font-bold text-xs">Canada Life</div>;
            default:
                return <div className="h-12 w-12 rounded-lg bg-gray-200" />;
        }
    };
    return renderLogo();
};

const BankLogo: React.FC<{ name: string }> = ({ name }) => {
    const logos: { [key: string]: React.ReactNode } = {
        'RBC': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#005DAA] text-white font-bold text-lg"> RBC </div> ),
        'TD': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#008240] text-white font-bold text-lg"> TD </div> ),
        'BMO': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#0079C1] text-white font-bold text-lg"> BMO </div> ),
        'Scotiabank': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#ED1C24] text-white font-bold text-sm"> Scotia </div> ),
        'CIBC': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#C8102E] text-white font-bold text-lg"> CIBC </div> ),
        'Desjardins': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-[#00847D] text-white font-bold text-xs"> Desjardins </div> )
    };
    return logos[name] || <div className="h-12 w-12 rounded-lg bg-gray-200" />;
};

// NEW: Logo for Payment Rails
// FIX: Add return statement to the component to resolve the type error.
const PaymentRailLogo: React.FC<{ name: string }> = ({ name }) => {
    const logos: { [key: string]: React.ReactNode } = {
        'EFT/ACH': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-slate-700 text-white font-bold text-xs"> EFT </div> ),
        'Interac': ( <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-yellow-400 text-black font-bold text-xs"> Interac </div> ),
    };
    return logos[name] || <div className="h-12 w-12 rounded-lg bg-gray-200" />;
};

interface IntegrationsProps {
    session: { user: Employee | SuperAdmin; tenantId: string };
}

interface IntegrationCardProps {
  integration: Integration;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ integration }) => (
  <div className="py-4 flex items-start space-x-4">
    <div className="flex-shrink-0">
      <IntegrationLogo name={integration.name} />
    </div>
    <div className="flex-1">
      <h3 className="font-semibold text-gray-800">{integration.name}</h3>
      <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
    </div>
    <div className="flex-shrink-0">
      {integration.status === 'connected' ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Connected
        </span>
      ) : (
        <Button variant="secondary" size="sm">Connect</Button>
      )}
    </div>
  </div>
);

const Integrations: React.FC<IntegrationsProps> = ({ session }) => {
  const [accounting, setAccounting] = useState<Integration[]>([]);
  const [government, setGovernment] = useState<Integration[]>([]);
  const [benefits, setBenefits] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntegrations = async () => {
      setIsLoading(true);
      try {
        const [acct, gov, ben] = await Promise.all([
          getIntegrations(session.tenantId),
          getGovernmentIntegrations(session.tenantId),
          getBenefitsIntegrations(session.tenantId),
        ]);
        setAccounting(acct);
        setGovernment(gov);
        setBenefits(ben);
      } catch (error) {
        console.error("Failed to fetch integrations", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIntegrations();
  }, [session.tenantId]);

  if (isLoading) {
    return <Card title="Integrations"><p>Loading integrations...</p></Card>;
  }

  return (
    <div className="space-y-8">
        <Card title="Accounting & Bookkeeping">
          <div className="-mx-6 px-6 divide-y divide-gray-200">
            {accounting.map(int => <IntegrationCard key={int.name} integration={int} />)}
          </div>
        </Card>
        <Card title="Government & Tax Remittance">
            <div className="-mx-6 px-6 divide-y divide-gray-200">
                {government.map(int => <IntegrationCard key={int.name} integration={int} />)}
            </div>
        </Card>
        <Card title="Benefits & Insurance Providers">
             <div className="-mx-6 px-6 divide-y divide-gray-200">
                {benefits.map(int => <IntegrationCard key={int.name} integration={int} />)}
            </div>
        </Card>
    </div>
  );
};

// FIX: Add default export to make the component importable in App.tsx.
export default Integrations;
