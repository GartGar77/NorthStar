// FIX: Added Tenant and SuperAdmin to imports
import type { Employee, Paystub, Integration, EmployeeProfile, PayFrequency, Payroll, CompanySettings, TimeOffPolicy, TimeOffRequest, EmployeeGarnishment, BankDetails, StatutoryHoliday, AuditLogEntry, Timesheet, PaystubItem, EmployeeEarning, EmployeeDeduction, Tenant, SuperAdmin, TenantStatus, TenantAuditLogEntry, Partner, Certification, Education, ChangeRequest, AllocatedBankDetails, EmployeeDocument, DocumentCategory, PhoneNumber, EmailAddress, CompanyAddress } from '../types';
// FIX: Added EarningType to imports
import { PayFrequency as PayFrequencyEnum, TimesheetStatus, TimeOffRequestStatus, EarningType, TenantStatus as TenantStatusEnum, ChangeRequestStatus, ChangeRequestType, DeductionType } from '../types';
import { calculateEmployeePayroll } from './geminiService';
import { 
    MOCK_EMPLOYEES,
    MOCK_INTEGRATIONS,
    MOCK_PAYROLL_HISTORY,
    MOCK_AUDIT_LOGS,
    MOCK_COMPANY_SETTINGS,
    MOCK_TIME_OFF_POLICIES,
    MOCK_TIME_OFF_REQUESTS,
    MOCK_TIMESHEETS
} from '../constants';

// FIX: Add mock data for multi-tenancy
const MOCK_TENANTS: (Tenant & { employeeIds: number[] })[] = [
  { 
    id: 'tenant-1', 
    name: 'NorthStar HCM Inc.', 
    employeeIds: MOCK_EMPLOYEES.map(e => e.id),
    status: TenantStatusEnum.Active,
    auditLog: [{
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        action: 'Created',
        reason: 'Initial tenant creation.',
        adminId: 'system'
    }]
  },
];
const MOCK_SUPER_ADMIN: SuperAdmin = { id: 'super-admin-001', name: 'Platform Admin', isSuperAdmin: true };
// NEW: Add mock data for Partners
const MOCK_PARTNERS: Partner[] = [
    { id: 'bk-1', name: 'Brenda\'s Bookkeeping', isPartner: true, tenantIds: ['tenant-1'] },
    { id: 'bk-2', name: 'Accountable Accounting', isPartner: true, tenantIds: [] }
];

// NEW: Mock data for Government Integrations
const MOCK_GOVERNMENT_INTEGRATIONS: Integration[] = [
  {
    name: 'Canada Revenue Agency (CRA)',
    description: 'Connect your CRA My Business Account to remit federal & provincial taxes (except Quebec) in real-time.',
    status: 'not_connected',
  },
  {
    name: 'Revenu Québec',
    description: 'Connect your My Account for businesses to remit Quebec provincial taxes and QPP contributions.',
    status: 'not_connected',
  }
];

// NEW: Mock data for Benefits Integrations
const MOCK_BENEFITS_INTEGRATIONS: Integration[] = [
  {
    name: 'Sun Life',
    description: 'Automate employee enrollment and sync deductions for Sun Life Financial group benefits plans.',
    status: 'not_connected',
  },
  {
    name: 'Manulife',
    description: 'Connect with Manulife to manage group retirement and benefits plans seamlessly.',
    status: 'not_connected',
  },
  {
    name: 'Canada Life',
    description: 'Formerly Great-West Life, integrate to streamline your benefits and insurance administration.',
    status: 'not_connected',
  },
];


// This is a mock database. In a real application, this would be a database.
let employeesDB = [...MOCK_EMPLOYEES];
let integrationsDB = [...MOCK_INTEGRATIONS];
let payrollHistoryDB = [...MOCK_PAYROLL_HISTORY];
let auditLogsDB = [...MOCK_AUDIT_LOGS];
let companySettingsDB = { ...MOCK_COMPANY_SETTINGS };
let timeOffPoliciesDB = [...MOCK_TIME_OFF_POLICIES];
let timeOffRequestsDB = [...MOCK_TIME_OFF_REQUESTS];
let timesheetsDB = [...MOCK_TIMESHEETS];
let tenantsDB = [...MOCK_TENANTS];
let superAdminDB = MOCK_SUPER_ADMIN;
let partnersDB = [...MOCK_PARTNERS];
let governmentIntegrationsDB = [...MOCK_GOVERNMENT_INTEGRATIONS];
let benefitsIntegrationsDB = [...MOCK_BENEFITS_INTEGRATIONS];
// NEW: Mock DB for Change Requests
let changeRequestsDB: ChangeRequest[] = [];

// FIX: Add new API functions for multi-tenancy
export const getTenants = async (options?: { page?: number; limit?: number; searchTerm?: string }): Promise<{data: Tenant[], total: number}> => {
  console.log('API: Fetching tenants with options...', options);
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const { page = 1, limit = 10, searchTerm = '' } = options || {};

  let filteredTenants = tenantsDB.map(({ employeeIds, ...rest }) => rest);

  if (searchTerm) {
    filteredTenants = filteredTenants.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const total = filteredTenants.length;
  const paginatedData = filteredTenants.slice((page - 1) * limit, page * limit);

  return Promise.resolve({ data: JSON.parse(JSON.stringify(paginatedData)), total });
};

export const createTenant = async (name: string): Promise<Tenant> => {
  console.log(`API: Creating tenant ${name}`);
  await new Promise(resolve => setTimeout(resolve, 300));
  const newTenant: (Tenant & { employeeIds: number[] }) = { 
    id: `tenant-${Date.now()}`, 
    name, 
    employeeIds: [],
    status: TenantStatusEnum.Active,
    auditLog: [{
        timestamp: new Date().toISOString(),
        action: 'Created',
        reason: 'Initial tenant creation by platform admin.',
        adminId: superAdminDB.id,
    }]
  };
  tenantsDB.push(newTenant);
  const { employeeIds, ...tenantData } = newTenant;
  return Promise.resolve(tenantData);
};

export const updateTenantStatus = async (tenantId: string, status: TenantStatus, reason: string): Promise<Tenant> => {
    console.log(`API: Updating status for tenant ${tenantId} to ${status}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const tenantIndex = tenantsDB.findIndex(t => t.id === tenantId);
    if (tenantIndex === -1) {
        throw new Error("Tenant not found");
    }

    const tenant = tenantsDB[tenantIndex];
    tenant.status = status;
    
    const logEntry: TenantAuditLogEntry = {
        timestamp: new Date().toISOString(),
        action: status,
        reason,
        adminId: superAdminDB.id,
    };
    tenant.auditLog.push(logEntry);
    
    tenantsDB[tenantIndex] = tenant;
    const { employeeIds, ...tenantData } = tenant;
    return Promise.resolve(JSON.parse(JSON.stringify(tenantData)));
};


export const getSuperAdmin = async (): Promise<SuperAdmin> => {
  console.log('API: Fetching super admin...');
  await new Promise(resolve => setTimeout(resolve, 100));
  return Promise.resolve(JSON.parse(JSON.stringify(superAdminDB)));
}

// --- NEW: Partner API Functions ---

export const getPartners = async (): Promise<Partner[]> => {
    console.log('API: Fetching partners...');
    await new Promise(resolve => setTimeout(resolve, 200));
    return Promise.resolve(JSON.parse(JSON.stringify(partnersDB)));
};

export const createPartner = async (name: string): Promise<Partner> => {
    console.log(`API: Creating partner ${name}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const newPartner: Partner = {
        id: `partner-${Date.now()}`,
        name,
        isPartner: true,
        tenantIds: []
    };
    partnersDB.push(newPartner);
    return Promise.resolve(newPartner);
};

export const updatePartner = async (partnerId: string, tenantIds: string[]): Promise<Partner> => {
    console.log(`API: Updating partner ${partnerId} with tenants`, tenantIds);
    await new Promise(resolve => setTimeout(resolve, 400));
    const partnerIndex = partnersDB.findIndex(b => b.id === partnerId);
    if (partnerIndex === -1) {
        throw new Error("Partner not found");
    }
    partnersDB[partnerIndex].tenantIds = tenantIds;
    return Promise.resolve(JSON.parse(JSON.stringify(partnersDB[partnerIndex])));
};


/**
 * Returns the most recent profile for an employee based on today's date.
 */
const getCurrentEmployeeProfile = (employee: Employee): EmployeeProfile => {
    const today = new Date().toISOString().split('T')[0];
    // Find the latest profile that is effective on or before today
    const currentRecord = employee.profileHistory
        .filter(p => p.effectiveDate <= today)
        // FIX: The argument to localeCompare should be a string (a.effectiveDate), not an EmployeeProfileRecord object (a).
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return currentRecord.profile;
};


/**
 * Fetches the list of all employees with pagination and search.
 */
export const getEmployees = async (tenantId: string, options?: { page?: number; limit?: number; searchTerm?: string }): Promise<{data: Employee[], total: number}> => {
  console.log(`API: Fetching employees for tenant ${tenantId} with options...`, options);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { page = 1, limit = 10, searchTerm = '' } = options || {};
  
  const tenant = tenantsDB.find(t => t.id === tenantId);
  if (!tenant) {
    return Promise.resolve({ data: [], total: 0 });
  }

  const allTenantEmployees = employeesDB.filter(e => tenant.employeeIds.includes(e.id));
  const employeeNameMap = new Map(allTenantEmployees.map(e => [e.id, getCurrentEmployeeProfile(e).name]));
  
  let filteredEmployees = allTenantEmployees;

  if (searchTerm) {
    const lowercasedTerm = searchTerm.toLowerCase();
    filteredEmployees = allTenantEmployees.filter(e => {
        const profile = getCurrentEmployeeProfile(e);
        return profile.name.toLowerCase().includes(lowercasedTerm) || 
               profile.role.toLowerCase().includes(lowercasedTerm) ||
               e.employeeId.toLowerCase().includes(lowercasedTerm);
    });
  }

  const total = filteredEmployees.length;
  const paginatedData = filteredEmployees.slice((page - 1) * limit, page * limit);

  // Augment data with supervisor name for display
  const augmentedData = paginatedData.map(e => {
      const profile = getCurrentEmployeeProfile(e);
      if (profile.supervisorId) {
          profile.supervisorName = employeeNameMap.get(profile.supervisorId) || 'Unknown';
      }
      return e;
  });

  return Promise.resolve({ data: JSON.parse(JSON.stringify(augmentedData)), total });
};

/**
 * Fetches a single employee by ID.
 */
export const getEmployeeById = async (employeeId: number, tenantId: string): Promise<Employee | null> => {
    console.log(`API: Fetching employee ${employeeId} for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 150));
    const tenant = tenantsDB.find(t => t.id === tenantId);
    if (!tenant || !tenant.employeeIds.includes(employeeId)) {
        return Promise.resolve(null);
    }
    const employee = employeesDB.find(e => e.id === employeeId);
    return Promise.resolve(employee ? JSON.parse(JSON.stringify(employee)) : null);
};


/**
 * Searches for employees by name (for autocomplete).
 */
// FIX: The return type of an async function should be a single Promise wrapping the array type.
export const searchEmployeesByName = async (searchTerm: string, tenantId: string): Promise<(Pick<Employee, 'id'> & { name: string })[]> => {
    if (!searchTerm) return [];
    console.log(`API: Searching employees matching "${searchTerm}" in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    const tenant = tenantsDB.find(t => t.id === tenantId);
    if (!tenant) return [];
    
    const lowercasedTerm = searchTerm.toLowerCase();
    const results = employeesDB
        .filter(e => tenant.employeeIds.includes(e.id) && getCurrentEmployeeProfile(e).name.toLowerCase().includes(lowercasedTerm))
        .map(e => ({ id: e.id, name: getCurrentEmployeeProfile(e).name }))
        .slice(0, 10); // Return top 10 matches for performance

    return Promise.resolve(results);
};


/**
 * Updates an employee's profile and payroll information.
 */
export const updateEmployeeProfile = async (
    employeeIdToUpdate: number,
    effectiveDate: string,
    status: string,
    profileUpdate: Partial<EmployeeProfile>,
    payrollUpdate: Payroll,
    timeOffBalancesUpdate: { [policyId: string]: number },
    garnishmentsUpdate: EmployeeGarnishment[],
    isAdminUpdate: boolean,
    recurringEarningsUpdate: EmployeeEarning[],
    recurringDeductionsUpdate: EmployeeDeduction[],
    employeeIdStringUpdate: string,
    bankAccountsUpdate: AllocatedBankDetails[],
    certificationsUpdate: Certification[],
    educationUpdate: Education[],
    tenantId?: string // Added tenantId for context
): Promise<Employee> => {
    console.log(`API: Updating profile for employee ${employeeIdToUpdate} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));

    const isIdTaken = employeesDB.some(e => e.id !== employeeIdToUpdate && e.employeeId === employeeIdStringUpdate);
    if (isIdTaken) {
        throw new Error(`Employee ID "${employeeIdStringUpdate}" is already in use. Please choose a unique ID.`);
    }
    
    const employeeIndex = employeesDB.findIndex(e => e.id === employeeIdToUpdate);
    if (employeeIndex === -1) {
        throw new Error("Employee not found");
    }

    const employee = employeesDB[employeeIndex];

    if (employee.isAdmin && !isAdminUpdate) {
        const adminCount = employeesDB.filter(e => e.isAdmin).length;
        if (adminCount <= 1) {
            throw new Error("Cannot revoke access for the last administrator.");
        }
    }

    employee.employeeId = employeeIdStringUpdate;
    employee.payroll = payrollUpdate;
    employee.timeOffBalances = timeOffBalancesUpdate;
    employee.garnishments = garnishmentsUpdate;
    employee.isAdmin = isAdminUpdate;
    employee.recurringEarnings = recurringEarningsUpdate;
    employee.recurringDeductions = recurringDeductionsUpdate;
    employee.bankAccounts = bankAccountsUpdate;
    employee.certifications = certificationsUpdate;
    employee.education = educationUpdate;

    const existingProfileIndex = employee.profileHistory.findIndex(p => p.effectiveDate === effectiveDate);

    if (existingProfileIndex > -1) {
        employee.profileHistory[existingProfileIndex].profile = {
            ...employee.profileHistory[existingProfileIndex].profile,
            ...profileUpdate
        };
        employee.profileHistory[existingProfileIndex].status = status;
    } else {
        const latestProfile = getCurrentEmployeeProfile(employee);
        employee.profileHistory.push({
            effectiveDate,
            status,
            profile: { ...latestProfile, ...profileUpdate }
        });
    }

    employee.profileHistory.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    
    employeesDB[employeeIndex] = employee;
    
    return Promise.resolve(JSON.parse(JSON.stringify(employee)));
};

/**
 * Adds a new employee to the database.
 */
export const addEmployee = async (
    data: { profile: EmployeeProfile; effectiveDate: string; payFrequency: PayFrequency; payroll: Payroll; status: string; garnishments: EmployeeGarnishment[]; bankAccounts: AllocatedBankDetails[]; isAdmin: boolean; timeOffBalances: { [policyId: string]: number }; recurringEarnings: EmployeeEarning[]; recurringDeductions: EmployeeDeduction[]; employeeId?: string; certifications: Certification[]; education: Education[]; },
    tenantId: string // Added tenantId
): Promise<Employee> => {
    console.log(`API: Adding new employee ${data.profile.name} to tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const tenant = tenantsDB.find(t => t.id === tenantId);
    if (!tenant) {
        throw new Error("Tenant not found");
    }
    
    const settings = companySettingsDB; // Using the global mock settings
    const idGenerationConfig = settings.configurations?.employeeIdGeneration || { method: 'system' };
    
    let newEmployeeId: string;

    if (idGenerationConfig.method === 'manual') {
        if (!data.employeeId || !data.employeeId.trim()) {
            throw new Error("Employee ID is required for manual entry.");
        }
        const isIdTaken = employeesDB.some(e => e.employeeId === data.employeeId);
        if (isIdTaken) {
            throw new Error(`Employee ID "${data.employeeId}" is already in use. Please choose a unique ID.`);
        }
        newEmployeeId = data.employeeId;
    } else { // System generated
        const prefix = idGenerationConfig.prefix || 'EMP-';
        const nextNumber = idGenerationConfig.nextNumber || employeesDB.length + 101;
        newEmployeeId = `${prefix}${nextNumber}`;
        
        // "save" the updated next number
        if (settings.configurations?.employeeIdGeneration) {
            settings.configurations.employeeIdGeneration.nextNumber = nextNumber + 1;
        }
    }


    const existingIds = employeesDB.map(e => e.id);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 101;

    const newEmployee: Employee = {
        id: newId,
        employeeId: newEmployeeId,
        isAdmin: data.isAdmin,
        payFrequency: data.payFrequency,
        garnishments: data.garnishments,
        bankAccounts: data.bankAccounts,
        profileHistory: [
            {
                effectiveDate: data.effectiveDate,
                status: data.status,
                profile: data.profile,
            }
        ],
        payroll: data.payroll,
        timeOffBalances: data.timeOffBalances,
        recurringEarnings: data.recurringEarnings,
        recurringDeductions: data.recurringDeductions,
        certifications: data.certifications || [],
        education: data.education || [],
        documents: [], // Initialize with empty documents array
        ytd: {
            grossPay: 0,
            cpp: 0,
            ei: 0,
            vacationPay: 0,
        },
    };

    employeesDB.push(newEmployee);
    tenant.employeeIds.push(newId);
    
    return Promise.resolve(JSON.parse(JSON.stringify(newEmployee)));
};

// --- NEW: Document Management API Functions ---
export const uploadEmployeeDocument = async (
    employeeId: number,
    documentData: { name: string; category: DocumentCategory; file: File },
    uploaderName: string,
    uploadedBy: 'Admin' | 'Employee',
    visibleToEmployee: boolean,
    tenantId: string
): Promise<EmployeeDocument> => {
    console.log(`API: Uploading document for employee ${employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 600));

    const employeeIndex = employeesDB.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
        throw new Error("Employee not found");
    }

    const newDoc: EmployeeDocument = {
        id: `doc-${employeeId}-${Date.now()}`,
        name: documentData.name,
        category: documentData.category,
        uploadDate: new Date().toISOString().split('T')[0],
        uploaderName,
        uploadedBy,
        visibleToEmployee,
        fileUrl: '#', // Simulated URL
    };

    if (!employeesDB[employeeIndex].documents) {
        employeesDB[employeeIndex].documents = [];
    }
    employeesDB[employeeIndex].documents!.push(newDoc);

    return Promise.resolve(newDoc);
};

export const updateDocumentVisibility = async (
    employeeId: number,
    documentId: string,
    isVisible: boolean,
    tenantId: string
): Promise<EmployeeDocument> => {
    console.log(`API: Setting visibility for doc ${documentId} to ${isVisible} for employee ${employeeId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const employeeIndex = employeesDB.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
        throw new Error("Employee not found");
    }

    const employee = employeesDB[employeeIndex];
    const docIndex = employee.documents?.findIndex(doc => doc.id === documentId);

    if (docIndex === undefined || docIndex === -1 || !employee.documents) {
        throw new Error("Document not found");
    }

    employee.documents[docIndex].visibleToEmployee = isVisible;
    employeesDB[employeeIndex] = employee;

    return Promise.resolve(JSON.parse(JSON.stringify(employee.documents[docIndex])));
};

export const deleteEmployeeDocument = async (
    employeeId: number,
    documentId: string,
    tenantId: string
): Promise<void> => {
    console.log(`API: Deleting document ${documentId} for employee ${employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const employeeIndex = employeesDB.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
        throw new Error("Employee not found");
    }

    const employee = employeesDB[employeeIndex];
    if (employee.documents) {
        employee.documents = employee.documents.filter(doc => doc.id !== documentId);
        employeesDB[employeeIndex] = employee;
    }

    return Promise.resolve();
};



/**
 * Fetches the list of available financial integrations.
 */
 export const getIntegrations = async (tenantId?: string): Promise<Integration[]> => {
    console.log(`API: Fetching integrations for tenant ${tenantId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return Promise.resolve(integrationsDB);
 };

/**
 * NEW: Fetches the list of available government integrations.
 */
export const getGovernmentIntegrations = async (tenantId?: string): Promise<Integration[]> => {
    console.log(`API: Fetching government integrations for tenant ${tenantId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return Promise.resolve(governmentIntegrationsDB);
};

/**
 * NEW: Fetches the list of available benefits provider integrations.
 */
export const getBenefitsIntegrations = async (tenantId?: string): Promise<Integration[]> => {
    console.log(`API: Fetching benefits integrations for tenant ${tenantId}...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return Promise.resolve(benefitsIntegrationsDB);
};



const getWorkdaysInPeriod = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Sunday=0, Saturday=6
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count;
};

const parsePayPeriod = (payPeriod: string): { start: Date, end: Date } => {
    const [startStr, endStr] = payPeriod.split(' - ');
    const year = new Date().getFullYear(); // Assume current year for simplicity
    const start = new Date(`${startStr}, ${year}`);
    const end = new Date(`${endStr}, ${year}`);
    return { start, end };
};


/**
 * Simulates running payroll.
 */
export const runPayroll = async (
    employees: Employee[], 
    payPeriod: string,
    tenantId: string,
    onProgress?: (progress: number) => void
): Promise<Paystub[]> => {
    console.log(`API: Running payroll for ${employees.length} employees in tenant ${tenantId}...`);
    
    const settings = await getCompanySettings(tenantId);
    const policies = await getTimeOffPolicies(tenantId);
    const policyMap = new Map(policies.map(p => [p.id, p]));

    const garnishmentConfigs = new Map(settings.configurations?.garnishments?.canada?.map(g => [g.id, g]));
    const earningCodeMap = new Map(settings.configurations?.earningCodes?.map(c => [c.id, c]));

    const { start: payPeriodStart, end: payPeriodEnd } = parsePayPeriod(payPeriod);
    
    const results: Paystub[] = [];
    for (const [index, employee] of employees.entries()) {
        const profile = getCurrentEmployeeProfile(employee);
        const employeeForCalc = { ...employee, ...profile };

        // 1. Determine base earnings
        const payPeriodsPerYear = { [PayFrequencyEnum.Weekly]: 52, [PayFrequencyEnum.BiWeekly]: 26, [PayFrequencyEnum.SemiMonthly]: 24, [PayFrequencyEnum.Monthly]: 12 };
        const basePayForPeriod = profile.annualSalary / (payPeriodsPerYear[employee.payFrequency] || 24);

        const earnings: PaystubItem[] = [{
            codeId: 'reg-pay',
            type: EarningType.Regular,
            description: 'Regular Pay',
            amount: basePayForPeriod
        }];

        // 2. Add recurring earnings
        employee.recurringEarnings?.forEach(re => {
            const code = earningCodeMap.get(re.codeId);
            if (code) {
                earnings.push({
                    codeId: re.codeId,
                    type: code.type,
                    description: code.name,
                    amount: re.amount,
                });
            }
        });

        // 3. Determine vacation accrual rate and method from policy
        const assignedVacationPolicy = policies.find(p => p.isVacationPolicy && employee.timeOffBalances.hasOwnProperty(p.id));
        const vacationAccrualRate = assignedVacationPolicy?.vacationPayAccrualPercent || 0;
        const vacationPayoutMethod = settings.configurations?.vacationPayoutMethod || 'accrue';

        // 4. Gather garnishment details
        const detailedGarnishments = employee.garnishments.map(empGarn => {
            const config = garnishmentConfigs.get(empGarn.configId);
            if (!config) return null;
            return { name: config.name, calculationType: config.calculationType, priority: config.priority, amount: empGarn.amount };
        }).filter((g): g is NonNullable<typeof g> => g !== null);

        // Simulate a delay for each employee to make progress bar visible
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const calculatedData = await calculateEmployeePayroll(
                employeeForCalc,
                payPeriod,
                earnings,
                employee.recurringDeductions,
                detailedGarnishments,
                {
                    earningCodes: settings.configurations?.earningCodes || [],
                    deductionCodes: settings.configurations?.deductionCodes || [],
                },
                vacationAccrualRate,
                vacationPayoutMethod
            );

            // Add vacation payout to earnings if method is 'payout'
            if (vacationPayoutMethod === 'payout' && calculatedData.accruedVacationPay && calculatedData.accruedVacationPay > 0) {
                 earnings.push({
                    type: EarningType.Vacation,
                    description: "Vacation Payout",
                    amount: calculatedData.accruedVacationPay,
                    codeId: 'vacation-payout'
                });
            }


            results.push({
                ...calculatedData,
                employeeId: employee.id,
                employeeName: profile.name,
                payPeriod: payPeriod,
                earnings,
            });

        } catch (e) {
            console.error(`Failed to calculate payroll for ${profile.name}`, e);
            // In a real app, you might want to handle this more gracefully,
            // e.g., by adding an error state to the paystub.
            // For this simulation, we'll just re-throw to fail the whole run.
            throw e;
        }

        if (onProgress) {
            onProgress(((index + 1) / employees.length) * 100);
        }
    } // End of for loop

    return Promise.resolve(results);
};

/**
 * NEW: Finalizes a payroll run by updating YTD totals and storing history.
 */
export const commitPayrollRun = async (paystubs: Paystub[], tenantId: string): Promise<void> => {
    console.log(`API: Committing payroll run for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update employee YTD values
    paystubs.forEach(p => {
        const employeeIndex = employeesDB.findIndex(e => e.id === p.employeeId);
        if (employeeIndex > -1) {
            const employee = employeesDB[employeeIndex];
            employee.ytd.grossPay += p.grossPay;
            employee.ytd.cpp += p.deductions.find(d => d.type === DeductionType.CPP)?.amount || 0;
            employee.ytd.ei += p.deductions.find(d => d.type === DeductionType.EI)?.amount || 0;
            
            // Handle vacation pay: accrue or payout
            const vacationPayout = p.earnings.find(e => e.type === EarningType.Vacation)?.amount || 0;
            if (p.accruedVacationPay) { // Accrued
                employee.ytd.vacationPay += p.accruedVacationPay;
            }
            if (vacationPayout > 0) { // Paid out
                employee.ytd.vacationPay -= vacationPayout;
            }

            employeesDB[employeeIndex] = employee;
        }
    });

    // Add to payroll history (at the beginning of the array)
    payrollHistoryDB.unshift(paystubs);

    return Promise.resolve();
};

/**
 * Fetches payroll history.
 */
export const getPayrollHistory = async (tenantId: string): Promise<Paystub[][]> => {
    console.log(`API: Fetching payroll history for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return Promise.resolve(JSON.parse(JSON.stringify(payrollHistoryDB)));
};

/**
 * Fetches all paystubs for a specific employee.
 */
export const getPaystubsForEmployee = async (employeeId: number, tenantId: string): Promise<Paystub[]> => {
    console.log(`API: Fetching paystubs for employee ${employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    const allStubs = payrollHistoryDB.flat();
    const employeeStubs = allStubs.filter(p => p.employeeId === employeeId);
    return Promise.resolve(JSON.parse(JSON.stringify(employeeStubs)));
};

/**
 * Fetches company settings.
 */
export const getCompanySettings = async (tenantId: string): Promise<CompanySettings> => {
    console.log(`API: Fetching company settings for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return Promise.resolve(JSON.parse(JSON.stringify(companySettingsDB)));
};

/**
 * Updates company settings.
 */
export const updateCompanySettings = async (settings: CompanySettings, tenantId: string): Promise<CompanySettings> => {
    console.log(`API: Updating company settings for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    companySettingsDB = { ...settings };
    return Promise.resolve(JSON.parse(JSON.stringify(companySettingsDB)));
};

// --- Time Off APIs ---

export const getTimeOffPolicies = async (tenantId: string): Promise<TimeOffPolicy[]> => {
    console.log(`API: Fetching time off policies for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 250));
    return Promise.resolve(JSON.parse(JSON.stringify(timeOffPoliciesDB)));
};

export const saveTimeOffPolicy = async (policy: TimeOffPolicy, tenantId: string): Promise<TimeOffPolicy> => {
    console.log(`API: Saving time off policy for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 350));
    const index = timeOffPoliciesDB.findIndex(p => p.id === policy.id);
    if (index > -1) {
        timeOffPoliciesDB[index] = policy;
    } else {
        policy.id = `policy-${Date.now()}`;
        timeOffPoliciesDB.push(policy);
    }
    return Promise.resolve(policy);
};

export const getTimeOffRequests = async (tenantId: string): Promise<TimeOffRequest[]> => {
    console.log(`API: Fetching time off requests for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return Promise.resolve(JSON.parse(JSON.stringify(timeOffRequestsDB)));
};

export const addTimeOffRequest = async (request: Omit<TimeOffRequest, 'id' | 'status'>, tenantId: string): Promise<TimeOffRequest> => {
    console.log(`API: Adding time off request for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const newRequest: TimeOffRequest = {
        ...request,
        id: `req-${Date.now()}`,
        status: TimeOffRequestStatus.Pending,
    };
    timeOffRequestsDB.push(newRequest);
    return Promise.resolve(newRequest);
};

export const updateTimeOffRequestStatus = async (requestId: string, status: TimeOffRequestStatus, tenantId: string): Promise<TimeOffRequest> => {
    console.log(`API: Updating time off request ${requestId} to ${status} for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const index = timeOffRequestsDB.findIndex(r => r.id === requestId);
    if (index === -1) {
        throw new Error("Request not found");
    }
    timeOffRequestsDB[index].status = status;
    return Promise.resolve(timeOffRequestsDB[index]);
};


// --- Timesheets APIs ---

export const getTimesheetsForEmployee = async (employeeId: number, tenantId: string): Promise<Timesheet[]> => {
    console.log(`API: Fetching timesheets for employee ${employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    const employeeSheets = timesheetsDB.filter(ts => ts.employeeId === employeeId);
    return Promise.resolve(JSON.parse(JSON.stringify(employeeSheets)));
};

export const saveTimesheet = async (timesheet: Timesheet, tenantId: string): Promise<Timesheet> => {
    console.log(`API: Saving timesheet for employee ${timesheet.employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = timesheetsDB.findIndex(ts => ts.id === timesheet.id);
    if (index > -1) {
        timesheetsDB[index] = timesheet;
        return Promise.resolve(timesheet);
    } else {
        const newTimesheet = { ...timesheet, id: `ts-${Date.now()}` };
        timesheetsDB.push(newTimesheet);
        return Promise.resolve(newTimesheet);
    }
};


// --- Government & Statutory APIs ---

export const getCompanyHolidays = async (tenantId: string): Promise<StatutoryHoliday[]> => {
    console.log(`API: Fetching company holidays for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return Promise.resolve(JSON.parse(JSON.stringify(companySettingsDB.configurations?.statutoryHolidays || [])));
};

// --- Security APIs ---

export const getAuditLogs = async (tenantId: string): Promise<AuditLogEntry[]> => {
    console.log(`API: Fetching audit logs for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 600));
    return Promise.resolve(JSON.parse(JSON.stringify(auditLogsDB)));
};


// --- On-Demand Payroll ---
export const processOnDemandPay = async (employeeId: number, amount: number, tenantId: string): Promise<void> => {
    console.log(`API: Processing on-demand pay of $${amount} for employee ${employeeId} in tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 800));

    const employeeIndex = employeesDB.findIndex(e => e.id === employeeId);
    if (employeeIndex === -1) {
        throw new Error("Employee not found");
    }

    // Add a one-time, post-tax deduction for the next pay run
    const repaymentDeduction: EmployeeDeduction = {
        codeId: 'on-demand-repayment',
        amount: amount,
    };
    
    // In a real app, this would be a one-time deduction for the *next* run, not a recurring one.
    // For this mock, we'll add it to recurring and assume it gets cleared after the next run.
    employeesDB[employeeIndex].recurringDeductions.push(repaymentDeduction);

    return Promise.resolve();
};

// --- Employee Change Requests ---
export const getChangeRequests = async (tenantId: string, employeeId?: number): Promise<ChangeRequest[]> => {
    console.log(`API: Fetching change requests for tenant ${tenantId}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    let requests = changeRequestsDB.filter(r => r.tenantId === tenantId);
    if (employeeId) {
        requests = requests.filter(r => r.employeeId === employeeId);
    }
    return Promise.resolve(JSON.parse(JSON.stringify(requests)));
};

export const createChangeRequest = async (tenantId: string, data: Omit<ChangeRequest, 'id' | 'status' | 'requestedAt' | 'tenantId' | 'employeeName'>): Promise<ChangeRequest> => {
    console.log(`API: Creating change request for employee ${data.employeeId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const employee = employeesDB.find(e => e.id === data.employeeId);
    if (!employee) throw new Error("Employee not found");

    const newRequest: ChangeRequest = {
        id: `cr-${Date.now()}`,
        employeeId: data.employeeId,
        employeeName: getCurrentEmployeeProfile(employee).name,
        tenantId,
        type: data.type,
        status: ChangeRequestStatus.Pending,
        requestedAt: new Date().toISOString(),
        oldValue: data.oldValue,
        newValue: data.newValue,
    };
    changeRequestsDB.push(newRequest);
    return Promise.resolve(newRequest);
};

export const updateChangeRequestStatus = async (tenantId: string, requestId: string, status: ChangeRequestStatus.Approved | ChangeRequestStatus.Rejected): Promise<ChangeRequest> => {
    console.log(`API: Updating request ${requestId} to ${status}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    const requestIndex = changeRequestsDB.findIndex(r => r.id === requestId);
    if (requestIndex === -1) throw new Error("Request not found");
    
    const request = changeRequestsDB[requestIndex];
    request.status = status;
    request.resolvedAt = new Date().toISOString();

    if (status === ChangeRequestStatus.Approved) {
        const employeeIndex = employeesDB.findIndex(e => e.id === request.employeeId);
        if (employeeIndex > -1) {
            const employee = employeesDB[employeeIndex];
            const today = new Date().toISOString().split('T')[0];
            
            // Find the most recent profile record to update
            const profileRecords = employee.profileHistory.filter(p => p.effectiveDate <= today);
            const latestProfileRecord = profileRecords.length > 0 
                ? profileRecords.sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]
                : employee.profileHistory[0];
            
            const latestProfileIndex = employee.profileHistory.findIndex(p => p.effectiveDate === latestProfileRecord.effectiveDate);

            switch(request.type) {
                case ChangeRequestType.Address:
                    employee.profileHistory[latestProfileIndex].profile.address = { ...employee.profileHistory[latestProfileIndex].profile.address, ...(request.newValue as Partial<CompanyAddress>) };
                    break;
                case ChangeRequestType.SIN:
                    if (employee.payroll.canada) employee.payroll.canada.sin = request.newValue as string;
                    break;
                case ChangeRequestType.BankDetails:
                    employee.bankAccounts = request.newValue as AllocatedBankDetails[];
                    break;
                case ChangeRequestType.PhoneNumber:
                     employee.profileHistory[latestProfileIndex].profile.phoneNumbers = request.newValue as PhoneNumber[];
                     break;
                case ChangeRequestType.EmailAddress:
                    employee.profileHistory[latestProfileIndex].profile.emails = request.newValue as EmailAddress[];
                    break;
                case ChangeRequestType.ProfilePhoto:
                    employee.profileHistory[latestProfileIndex].profile.avatarUrl = request.newValue as string;
                    break;
            }
            employeesDB[employeeIndex] = employee;
        }
    }
    
    changeRequestsDB[requestIndex] = request;
    return Promise.resolve(request);
};
