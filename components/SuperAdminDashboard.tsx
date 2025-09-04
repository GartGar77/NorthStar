


import React, { useState, useEffect, useCallback } from 'react';
import { getTenants, createTenant, getEmployees, updateTenantStatus, getPartners, createPartner, updatePartner } from '../services/api';
import type { Tenant, TenantAuditLogEntry, Partner } from '../types';
import { TenantStatus } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { BuildingOfficeIcon, UsersIcon, BriefcaseIcon } from './icons/Icons';
import SuperAdminAIAgent from './SuperAdminAIAgent';
import Modal from './ui/Modal';

interface SuperAdminDashboardProps {
  onManageTenant: (tenantId: string) => void;
  onLogout: () => void;
}

type TenantWithEmployeeCount = Tenant & { employeeCount: number };

const StatusBadge: React.FC<{ status: TenantStatus }> = ({ status }) => {
    const statusClasses = {
        [TenantStatus.Active]: 'bg-green-100 text-green-800',
        [TenantStatus.Paused]: 'bg-yellow-100 text-yellow-800',
        [TenantStatus.Locked]: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status]}`}>
            {status}
        </span>
    );
};


const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onManageTenant, onLogout }) => {
  const [tenants, setTenants] = useState<TenantWithEmployeeCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Pagination and search state
  const [totalTenants, setTotalTenants] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const tenantsPerPage = 10;

  // State for status management modal
  const [statusModalState, setStatusModalState] = useState<{ isOpen: boolean; tenant: TenantWithEmployeeCount | null }>({ isOpen: false, tenant: null });
  const [selectedStatus, setSelectedStatus] = useState<TenantStatus>(TenantStatus.Active);
  const [reason, setReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Partner management state
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [isCreatingPartner, setIsCreatingPartner] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [allTenantsForModal, setAllTenantsForModal] = useState<Tenant[]>([]);
  const [assignedTenantIds, setAssignedTenantIds] = useState<Set<string>>(new Set());
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Insights State
  const [insights, setInsights] = useState<{
    totalTenants: number;
    totalEmployees: number;
    avgEmployeesPerTenant: number;
    totalPartners: number;
    avgTenantsPerPartner: number;
    avgEmployeesPerPartner: number;
  } | null>(null);
  const [allTenants, setAllTenants] = useState<TenantWithEmployeeCount[]>([]);


  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all data for insights and full lists
      const [{ data: allTenantsList }, allPartners] = await Promise.all([
        getTenants({ limit: 5000 }),
        getPartners(),
      ]);

      setPartners(allPartners);

      const allTenantsWithCounts = await Promise.all(
        allTenantsList.map(async (tenant) => {
          const { total: employeeCount } = await getEmployees(tenant.id, { limit: 1 });
          return { ...tenant, employeeCount };
        })
      );
      setAllTenants(allTenantsWithCounts); // For AI agent

      // Calculate insights
      const totalTenantsCount = allTenantsList.length;
      const totalEmployeesCount = allTenantsWithCounts.reduce((sum, t) => sum + t.employeeCount, 0);
      const totalPartnersCount = allPartners.length;
      const totalTenantAssignments = allPartners.reduce((sum, p) => sum + p.tenantIds.length, 0);

      setInsights({
        totalTenants: totalTenantsCount,
        totalEmployees: totalEmployeesCount,
        avgEmployeesPerTenant: totalTenantsCount > 0 ? totalEmployeesCount / totalTenantsCount : 0,
        totalPartners: totalPartnersCount,
        avgTenantsPerPartner: totalPartnersCount > 0 ? totalTenantAssignments / totalPartnersCount : 0,
        avgEmployeesPerPartner: totalPartnersCount > 0 ? totalEmployeesCount / totalPartnersCount : 0,
      });
      
      // Filter and paginate for display list
      let displayTenants = allTenantsWithCounts;
      if (debouncedSearchTerm) {
        displayTenants = allTenantsWithCounts.filter(t => t.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      }
      setTotalTenants(displayTenants.length);
      const paginatedTenants = displayTenants.slice((currentPage - 1) * tenantsPerPage, currentPage * tenantsPerPage);
      setTenants(paginatedTenants);
      
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, tenantsPerPage, debouncedSearchTerm]);


  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1); 
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    
    setIsCreating(true);
    try {
      await createTenant(newTenantName.trim());
      setNewTenantName('');
      await fetchDashboardData(); // Refresh all data
    } catch (error) {
      console.error("Failed to create tenant", error);
      alert("Error creating tenant. See console for details.");
    } finally {
      setIsCreating(false);
    }
  };

  const openStatusModal = (tenant: TenantWithEmployeeCount) => {
    setStatusModalState({ isOpen: true, tenant });
    setSelectedStatus(tenant.status);
    setReason('');
    setStatusError('');
  };

  const closeStatusModal = () => {
    setStatusModalState({ isOpen: false, tenant: null });
  };

  const handleUpdateStatus = async () => {
    if (!statusModalState.tenant) return;
    if (selectedStatus !== TenantStatus.Active && !reason.trim()) {
        setStatusError('A reason is required to pause or lock a tenant.');
        return;
    }
    
    setIsUpdatingStatus(true);
    setStatusError('');
    try {
        await updateTenantStatus(statusModalState.tenant.id, selectedStatus, reason);
        await fetchDashboardData();
        closeStatusModal();
    } catch (error) {
        console.error("Failed to update tenant status", error);
        setStatusError('An unexpected error occurred. Please try again.');
    } finally {
        setIsUpdatingStatus(false);
    }
  };
  
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;
    setIsCreatingPartner(true);
    try {
      await createPartner(newPartnerName.trim());
      setNewPartnerName('');
      await fetchDashboardData();
    } catch (error) {
      console.error("Failed to create partner", error);
    } finally {
      setIsCreatingPartner(false);
    }
  };

  const openPartnerModal = async (partner: Partner) => {
    setSelectedPartner(partner);
    setAssignedTenantIds(new Set(partner.tenantIds));
    try {
        const { data } = await getTenants({limit: 1000}); // Get all tenants for assignment
        setAllTenantsForModal(data);
        setIsPartnerModalOpen(true);
    } catch (error) {
        console.error("Failed to load tenants for modal", error);
    }
  };

  const handleAssignmentChange = (tenantId: string) => {
    setAssignedTenantIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(tenantId)) {
            newSet.delete(tenantId);
        } else {
            newSet.add(tenantId);
        }
        return newSet;
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedPartner) return;
    setIsSavingAssignments(true);
    try {
        await updatePartner(selectedPartner.id, Array.from(assignedTenantIds));
        await fetchDashboardData();
        setIsPartnerModalOpen(false);
    } catch (error) {
        console.error("Failed to save assignments", error);
    } finally {
        setIsSavingAssignments(false);
    }
  };


  const totalPages = Math.ceil(totalTenants / tenantsPerPage);


  return (
    <>
      <div className="min-h-screen bg-slate-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">
              Platform Administration
            </h1>
            <Button variant="secondary" onClick={onLogout}>Log Out</Button>
          </div>
        </header>
        <main className="py-8">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-8">
                <Card title="Customer Insights">
                   {isLoading || !insights ? (
                        <p className="text-center text-slate-500 py-8">Calculating platform metrics...</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-blue-100 rounded-md"><BuildingOfficeIcon className="h-6 w-6 text-blue-600"/></div><div><p className="text-sm text-slate-500">Total Tenants</p><p className="text-3xl font-bold text-slate-800">{insights.totalTenants}</p></div></div>
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-green-100 rounded-md"><UsersIcon className="h-6 w-6 text-green-600"/></div><div><p className="text-sm text-slate-500">Total Employees</p><p className="text-3xl font-bold text-slate-800">{insights.totalEmployees.toLocaleString()}</p></div></div>
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-green-100 rounded-md"><UsersIcon className="h-6 w-6 text-green-600"/></div><div><p className="text-sm text-slate-500">Avg. Employees / Tenant</p><p className="text-3xl font-bold text-slate-800">{insights.avgEmployeesPerTenant.toFixed(1)}</p></div></div>
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-purple-100 rounded-md"><BriefcaseIcon className="h-6 w-6 text-purple-600"/></div><div><p className="text-sm text-slate-500">Total Partners</p><p className="text-3xl font-bold text-slate-800">{insights.totalPartners}</p></div></div>
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-purple-100 rounded-md"><BuildingOfficeIcon className="h-6 w-6 text-purple-600"/></div><div><p className="text-sm text-slate-500">Avg. Tenants / Partner</p><p className="text-3xl font-bold text-slate-800">{insights.avgTenantsPerPartner.toFixed(1)}</p></div></div>
                            <div className="p-4 bg-slate-50 rounded-lg flex items-start space-x-3"><div className="p-2 bg-purple-100 rounded-md"><UsersIcon className="h-6 w-6 text-purple-600"/></div><div><p className="text-sm text-slate-500">Avg. Employees / Partner</p><p className="text-3xl font-bold text-slate-800">{insights.avgEmployeesPerPartner.toFixed(1)}</p></div></div>
                        </div>
                    )}
                </Card>

                <Card>
                    <div className="p-4 flex justify-between items-center border-b -mx-6 -mt-6 mb-6 px-6">
                        <h3 className="text-lg font-semibold text-slate-800">Customer Tenants</h3>
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full max-w-xs rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm"
                        />
                    </div>
                  {isLoading ? (
                    <p className="text-center text-slate-500 py-8">Loading tenants...</p>
                  ) : (
                    <>
                    <div className="divide-y divide-slate-200 -mx-6">
                      {tenants.map(tenant => (
                        <div key={tenant.id} className={`p-4 px-6 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-slate-50 ${tenant.status !== TenantStatus.Active ? 'opacity-60' : ''}`}>
                          <div className="flex items-center mb-3 sm:mb-0">
                            <div className="p-3 bg-brand-light rounded-lg">
                              <BuildingOfficeIcon className="h-6 w-6 text-brand-primary" />
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center gap-x-2">
                                <p className="font-semibold text-slate-900">{tenant.name}</p>
                                <StatusBadge status={tenant.status} />
                              </div>
                              <p className="text-sm text-slate-500">{tenant.employeeCount} employees</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 self-end sm:self-center">
                            <Button variant="secondary" size="sm" onClick={() => openStatusModal(tenant)}>
                              Set Status
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => onManageTenant(tenant.id)} disabled={tenant.status !== TenantStatus.Active}>
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                       {tenants.length === 0 && <p className="text-center py-8 text-slate-500 px-6">No tenants found.</p>}
                    </div>
                     {totalPages > 1 && (
                        <div className="pt-4 flex justify-between items-center">
                            <span className="text-sm text-slate-700">
                                Page {currentPage} of {totalPages} ({totalTenants} total tenants)
                            </span>
                             <div className="space-x-2">
                                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    Previous
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                    </>
                  )}
                </Card>
                
                <Card title="Partner Management">
                    <div className="divide-y divide-slate-200 -mx-6">
                        {partners.map(p => (
                            <div key={p.id} className="p-4 px-6 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-slate-900">{p.name}</p>
                                    <p className="text-sm text-slate-500">{p.tenantIds.length} tenants assigned</p>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => openPartnerModal(p)}>
                                    Manage Tenants
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
              </div>
              {/* Sidebar column */}
              <div className="space-y-8">
                <Card title="Create New Tenant">
                  <form onSubmit={handleCreateTenant}>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="tenant-name" className="block text-sm font-medium text-slate-700">Company Name</label>
                        <input
                          type="text"
                          id="tenant-name"
                          value={newTenantName}
                          onChange={(e) => setNewTenantName(e.target.value)}
                          className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary/50"
                          placeholder="e.g., Example Corp"
                        />
                      </div>
                      <Button type="submit" variant="primary" disabled={isCreating || !newTenantName.trim()}>
                        {isCreating ? 'Creating...' : 'Create Tenant'}
                      </Button>
                    </div>
                  </form>
                </Card>
                <Card title="Create New Partner">
                    <form onSubmit={handleCreatePartner}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="partner-name" className="block text-sm font-medium text-slate-700">Partner Name</label>
                                <input
                                    type="text"
                                    id="partner-name"
                                    value={newPartnerName}
                                    onChange={(e) => setNewPartnerName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                                    placeholder="e.g., Brenda's Bookkeeping"
                                />
                            </div>
                            <Button type="submit" variant="primary" disabled={isCreatingPartner || !newPartnerName.trim()}>
                                {isCreatingPartner ? 'Creating...' : 'Create Partner'}
                            </Button>
                        </div>
                    </form>
                </Card>
                <Card title="Platform AI Assistant">
                  <SuperAdminAIAgent tenants={allTenants} />
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {statusModalState.isOpen && statusModalState.tenant && (
        <Modal
            isOpen={statusModalState.isOpen}
            onClose={closeStatusModal}
            title={`Update Status for ${statusModalState.tenant.name}`}
            footer={
                <>
                    <Button variant="secondary" onClick={closeStatusModal}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateStatus} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? 'Saving...' : 'Save Changes'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {statusError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{statusError}</p>}
                <div>
                    <label className="block text-sm font-medium text-slate-700">Tenant Status</label>
                    <fieldset className="mt-2">
                        <div className="space-y-2">
                            {Object.values(TenantStatus).map(status => (
                                <div key={status} className="flex items-center">
                                    <input
                                        id={status}
                                        name="tenant-status"
                                        type="radio"
                                        checked={selectedStatus === status}
                                        onChange={() => setSelectedStatus(status)}
                                        className="h-4 w-4 text-brand-primary border-slate-300 focus:ring-brand-primary"
                                    />
                                    <label htmlFor={status} className="ml-3 block text-sm font-medium text-slate-700">{status}</label>
                                </div>
                            ))}
                        </div>
                    </fieldset>
                </div>
                {selectedStatus !== TenantStatus.Active && (
                    <div>
                         <label htmlFor="reason" className="block text-sm font-medium text-slate-700">
                            Reason for Change <span className="text-red-500">*</span>
                         </label>
                         <textarea
                            id="reason"
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-primary focus:ring-brand-primary"
                            placeholder="e.g., Customer account delinquent."
                         />
                    </div>
                )}
                <div>
                    <h4 className="text-sm font-semibold text-slate-800 border-t pt-4 mt-4">Recent Audit History</h4>
                    <ul className="mt-2 space-y-2 text-xs text-slate-500 max-h-32 overflow-y-auto pr-2">
                        {statusModalState.tenant.auditLog.slice().reverse().map(log => (
                             <li key={log.timestamp}>
                                <span className="font-medium">{new Date(log.timestamp).toLocaleString()}:</span> Account status set to <span className="font-semibold">{log.action}</span>. Reason: {log.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Modal>
      )}

      {isPartnerModalOpen && selectedPartner && (
          <Modal
              isOpen={isPartnerModalOpen}
              onClose={() => setIsPartnerModalOpen(false)}
              title={`Assign Tenants to ${selectedPartner.name}`}
              footer={
                  <>
                      <Button variant="secondary" onClick={() => setIsPartnerModalOpen(false)}>Cancel</Button>
                      <Button variant="primary" onClick={handleSaveAssignments} disabled={isSavingAssignments}>
                          {isSavingAssignments ? 'Saving...' : 'Save Assignments'}
                      </Button>
                  </>
              }
          >
              <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allTenantsForModal.map(tenant => (
                      <div key={tenant.id} className="flex items-center p-2 rounded-md hover:bg-slate-100">
                          <input
                              type="checkbox"
                              id={`tenant-${tenant.id}`}
                              checked={assignedTenantIds.has(tenant.id)}
                              onChange={() => handleAssignmentChange(tenant.id)}
                              className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                          />
                          <label htmlFor={`tenant-${tenant.id}`} className="ml-3 text-sm font-medium text-slate-700">
                              {tenant.name}
                          </label>
                      </div>
                  ))}
              </div>
          </Modal>
      )}

    </>
  );
};

export default SuperAdminDashboard;