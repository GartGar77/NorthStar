



import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Payroll from './components/Payroll';
import Employees from './components/Employees';
import Integrations from './components/Integrations';
import Reports from './components/Reports';
import Settings from './components/Settings';
import TimeOff from './components/TimeOff';
import Timesheets from './components/Timesheets';
import CompanyCalendar from './components/CompanyCalendar';
import LoginScreen from './LoginScreen';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import EmployeePaystubs from './components/employee/EmployeePaystubs';
import EmployeeTimeOff from './components/employee/EmployeeTimeOff';
import type { View, Employee, SuperAdmin, Partner } from './types';
import { getCompanySettings, getEmployees } from './services/api';
import KnowledgeBase from './components/KnowledgeBase';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import PartnerDashboard from './components/BookkeeperDashboard';
import EmployeeInfo from './components/employee/EmployeeInfo';
import EmployeeDocuments from './components/employee/EmployeeDocuments';
import Approvals from './components/Approvals';

const App: React.FC = () => {
  const [session, setSession] = useState<{ user: Employee | SuperAdmin | Partner | null; tenantId: string | null }>({ user: null, tenantId: null });
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [shouldOpenAddEmployeeModal, setShouldOpenAddEmployeeModal] = useState(false);
  const [branding, setBranding] = useState<{ logoUrl: string | null; primaryColor: string | null; }>({ logoUrl: null, primaryColor: null });

  const { user: currentUser, tenantId } = session;

  const fetchBranding = useCallback(async () => {
    if (!tenantId) return;
    try {
      const settings = await getCompanySettings(tenantId);
      if (settings.branding) {
        setBranding({
          logoUrl: settings.branding.logoUrl || null,
          primaryColor: settings.branding.primaryColor || null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch branding settings:", error);
    }
  }, [tenantId]);

  useEffect(() => {
    if (currentUser && tenantId) {
      fetchBranding();
    }
  }, [currentUser, tenantId, fetchBranding]);

  useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--color-brand-primary', branding.primaryColor);
      root.style.setProperty('--color-brand-secondary', branding.primaryColor);
      root.style.setProperty('--color-brand-dark', branding.primaryColor);
      root.style.setProperty('--color-brand-light', `${branding.primaryColor}20`);
    } else {
      root.style.removeProperty('--color-brand-primary');
      root.style.removeProperty('--color-brand-secondary');
      root.style.removeProperty('--color-brand-dark');
      root.style.removeProperty('--color-brand-light');
    }
  }, [branding.primaryColor]);
  
  const handleLogin = (user: Employee, tenantId: string) => {
    setSession({ user, tenantId });
    setActiveView(user.isAdmin ? 'dashboard' : 'my_dashboard');
  };

  const handleSuperAdminLogin = (user: SuperAdmin) => {
    setSession({ user, tenantId: null });
  };
  
  const handlePartnerLogin = (user: Partner) => {
    setSession({ user, tenantId: null });
  };

  const handleManageTenant = async (tenantId: string) => {
    const { data: employees } = await getEmployees(tenantId, {});
    const firstAdmin = employees.find(e => e.isAdmin);
    if (firstAdmin) {
        setSession({ user: firstAdmin, tenantId });
        setActiveView('dashboard');
    } else if (employees.length > 0) {
        setSession({user: employees[0], tenantId});
        setActiveView('my_dashboard');
    } else {
        alert("This tenant has no users to log in as.");
    }
  };


  const handleLogout = () => {
    setSession({ user: null, tenantId: null });
    setActiveView('dashboard');
  };

  const openAddEmployee = () => {
    setActiveView('employees');
    setShouldOpenAddEmployeeModal(true);
  };

  const renderView = () => {
    // A proper type guard. Checks for SuperAdmin/Partner are already done before this function is called.
    if (!currentUser || 'isSuperAdmin' in currentUser || 'isPartner' in currentUser) return null;

    const employeeSession = { user: currentUser, tenantId: session.tenantId! };

    // Admin Views
    if (currentUser.isAdmin) {
        switch (activeView) {
          case 'dashboard':
            return <Dashboard setActiveView={setActiveView} openAddEmployee={openAddEmployee} session={employeeSession} />;
          case 'payroll':
            return <Payroll session={employeeSession} />;
          case 'timesheets':
            return <Timesheets session={employeeSession} />;
          case 'time_off':
            return <TimeOff session={employeeSession} />;
          case 'company_calendar':
            return <CompanyCalendar session={employeeSession} />;
          case 'employees': {
            const openModal = shouldOpenAddEmployeeModal;
            if (openModal) {
              setShouldOpenAddEmployeeModal(false);
            }
            return <Employees openAddModalOnMount={openModal} session={employeeSession} />;
          }
          case 'integrations':
            return <Integrations session={employeeSession} />;
          case 'reports':
            return <Reports session={employeeSession} />;
          case 'settings':
            return <Settings onBrandingUpdate={fetchBranding} session={employeeSession} />;
          case 'knowledge_base':
            return <KnowledgeBase currentUser={currentUser} />;
          case 'approvals':
            return <Approvals session={employeeSession} />;
          // Admin Self-Service Views
          case 'my_paystubs':
            return <EmployeePaystubs session={employeeSession} />;
          case 'my_time_off':
            return <EmployeeTimeOff session={employeeSession} />;
          case 'my_info':
            return <EmployeeInfo session={employeeSession} />;
          case 'my_documents':
            return <EmployeeDocuments session={employeeSession} />;
          default:
            return <Dashboard setActiveView={setActiveView} openAddEmployee={openAddEmployee} session={employeeSession} />;
        }
    } else {
      // Employee Self-Service Views
      switch(activeView) {
        case 'my_dashboard':
            return <EmployeeDashboard session={employeeSession} setActiveView={setActiveView} />;
        case 'my_paystubs':
            return <EmployeePaystubs session={employeeSession} />;
        case 'timesheets':
            return <Timesheets session={employeeSession} />;
        case 'my_time_off':
            return <EmployeeTimeOff session={employeeSession} />;
        case 'my_info':
            return <EmployeeInfo session={employeeSession} />;
        case 'my_documents':
            return <EmployeeDocuments session={employeeSession} />;
        case 'company_calendar':
            return <CompanyCalendar session={employeeSession} />;
        case 'knowledge_base':
            return <KnowledgeBase currentUser={currentUser} />;
        default:
            return <EmployeeDashboard session={employeeSession} setActiveView={setActiveView} />;
      }
    }
  };
  
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onSuperAdminLogin={handleSuperAdminLogin} onPartnerLogin={handlePartnerLogin} />;
  }

  if ('isSuperAdmin' in currentUser && currentUser.isSuperAdmin) {
    return <SuperAdminDashboard onManageTenant={handleManageTenant} onLogout={handleLogout} />;
  }
  
  if ('isPartner' in currentUser && currentUser.isPartner) {
    return <PartnerDashboard partner={currentUser} onManageTenant={handleManageTenant} onLogout={handleLogout} />;
  }


  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        logoUrl={branding.logoUrl}
        // FIX: Cast currentUser to Employee type, as SuperAdmin/Partner cases are handled above.
        currentUser={currentUser as Employee}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* FIX: Cast currentUser to Employee type, as SuperAdmin/Partner cases are handled above. */}
        <Header activeView={activeView} currentUser={currentUser as Employee} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;