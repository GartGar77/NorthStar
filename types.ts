

export enum PayFrequency {
  Weekly = 'Weekly',
  BiWeekly = 'Bi-Weekly',
  SemiMonthly = 'Semi-Monthly',
  Monthly = 'Monthly',
}

export enum Province {
  ON = 'Ontario',
  QC = 'Quebec',
  BC = 'British Columbia',
  AB = 'Alberta',
  MB = 'Manitoba',
  SK = 'Saskatchewan',
  NS = 'Nova Scotia',
  NB = 'New Brunswick',
  NL = 'Newfoundland and Labrador',
  PE = 'Prince Edward Island',
}

// NEW: Garnishment configuration types
export enum GarnishmentCalculationType {
    FixedAmount = 'Fixed Amount',
    PercentageOfGross = '% of Gross Pay',
}

export interface GarnishmentConfiguration {
    id: string; // e.g., 'cra-federal-tax'
    name: string;
    jurisdiction: 'Federal' | Province;
    description: string;
    calculationType: GarnishmentCalculationType;
    priority: number; // Lower number = higher priority
}

// NEW: Represents a garnishment assigned to an employee
export interface EmployeeGarnishment {
    configId: string; // References GarnishmentConfiguration.id
    amount: number; // The specific value (e.g., 150 for fixed, or 20 for percentage)
}

// NEW: Phone number structure
export interface PhoneNumber {
  type: string;
  number: string;
}

// NEW: Email address structure
export interface EmailAddress {
  type: string;
  address: string;
}

// Represents a snapshot of an employee's data at a point in time.
export interface EmployeeProfile {
  name: string;
  role: string;
  payType: 'Salaried' | 'Hourly';
  annualSalary: number;
  province: Province;
  dateOfBirth: string; // YYYY-MM-DD - NEW: Critical for CPP calculations
  address: CompanyAddress; // NEW: Employee's home address for T4s
  phoneNumbers: PhoneNumber[]; // NEW
  emails: EmailAddress[]; // NEW
  avatarUrl?: string;
  supervisorId?: number; // The ID of this employee's supervisor
  supervisorName?: string; // The name of the supervisor, for display purposes
  hourlyRate?: number;
  weeklyHours?: number;
}

export interface EmployeeProfileRecord {
  effectiveDate: string; // YYYY-MM-DD
  status: string; // NEW: Mandatory status for the record (e.g., 'Hire', 'Promotion')
  profile: EmployeeProfile;
}

// NEW: Canadian-specific payroll information
export interface CanadianPayroll {
  sin: string; // Social Insurance Number
  td1Federal: number; // Federal Personal Tax Credits Amount
  td1Provincial: number; // Provincial Personal Tax Credits Amount
}

// NEW: Future-proof payroll structure
export interface Payroll {
  // Using optional properties allows for adding other countries later
  // e.g., unitedStates?: USPayslip;
  canada?: CanadianPayroll;
}

// Represents banking information for direct deposit
export interface BankDetails {
    institution: string; // 3 digits
    transit: string; // 5 digits
    account: string;
}

// NEW: Allocated bank details for direct deposit splitting
export interface AllocatedBankDetails extends BankDetails {
  id: string; // Unique ID for React keys
  nickname?: string;
  allocationPercent: number;
}


// --- NEW: Configurable Earnings & Deductions ---
export interface EmployeeEarning {
    codeId: string; // FK to EarningCode.id
    amount: number;
}

export interface EmployeeDeduction {
    codeId: string; // FK to DeductionCode.id
    amount: number; // For fixed amount. Not used if method is % of gross.
}

// NEW: Certification record
export interface Certification {
  id: string; // Unique ID for the cert record
  name: string;
  issuingBody: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD, optional
}

// NEW: Education record
export interface Education {
  id: string; // Unique ID for the education record
  institution: string;
  degree: string;
  fieldOfStudy: string;
  completionDate: string; // YYYY-MM-DD
}

// NEW: Document Management types
export type DocumentCategory = string;

export interface EmployeeDocument {
    id: string;
    name: string;
    category: DocumentCategory;
    uploadDate: string; // YYYY-MM-DD
    uploaderName: string; // Name of person who uploaded
    uploadedBy: 'Admin' | 'Employee'; // Role of uploader
    visibleToEmployee: boolean; // Visibility toggle
    fileUrl: string; // In a real app, this would be a URL to cloud storage
}


// The main employee record, now with a history of profiles and a payroll section.
export interface Employee {
  id: number;
  employeeId: string;
  isAdmin?: boolean; // Flag for administrator access
  payFrequency: PayFrequency;
  garnishments: EmployeeGarnishment[];
  profileHistory: EmployeeProfileRecord[];
  payroll: Payroll; // NEW
  bankAccounts: AllocatedBankDetails[]; // MODIFIED: For direct deposit splitting
  timeOffBalances: { [policyId: string]: number }; // NEW
  recurringEarnings: EmployeeEarning[]; // NEW
  recurringDeductions: EmployeeDeduction[]; // NEW
  ytd: { // NEW: Year-to-date totals, crucial for contribution maximums
    grossPay: number;
    cpp: number;
    ei: number;
    vacationPay: number;
  };
  certifications?: Certification[]; // NEW
  education?: Education[]; // NEW
  documents?: EmployeeDocument[]; // NEW
}

// NEW: Earnings and Deductions Codes
export enum EarningType {
    Regular = 'Regular Pay',
    Overtime = 'Overtime',
    Bonus = 'Bonus',
    Vacation = 'Vacation Pay',
    StatHoliday = 'Statutory Holiday Pay',
    // Configurable Types
    Earning = 'Earning',
    TaxableBenefit = 'Taxable Benefit',
    Reimbursement = 'Reimbursement',
}

export enum DeductionType {
    FederalTax = 'Federal Income Tax',
    ProvincialTax = 'Provincial Income Tax',
    CPP = 'Canada Pension Plan',
    EI = 'Employment Insurance',
    Garnishment = 'Garnishment',
     // Configurable Types
    Statutory = 'Statutory',
    PreTax = 'Pre-Tax',
    PostTax = 'Post-Tax',
    OffCycleAdvanceRepayment = 'Off-Cycle Advance Repayment',
}

export enum DeductionCalculationMethod {
    FixedAmount = 'Fixed Amount',
    PercentageOfGross = '% of Gross Pay',
}


// NEW: Represents a single line item on a paystub
export interface PaystubItem {
    type: EarningType | DeductionType | string;
    description: string;
    rate?: number;
    hours?: number;
    amount: number;
    codeId?: string;
}


// MODIFIED: Paystub interface to be more compliant
export interface Paystub {
  employeeId: number;
  employeeName: string;
  payPeriod: string;
  accruedVacationPay?: number;
  
  // Summary Totals
  grossPay: number;
  totalDeductions: number;
  netPay: number;

  // Detailed Breakdowns
  earnings: PaystubItem[];
  deductions: PaystubItem[];

  employerContributions: {
    cpp: number;
    ei: number;
  };
}


export interface Integration {
  name: string;
  description: string;
  status: 'connected' | 'not_connected';
}

export type TimelineRecordStatus = 'PAST' | 'CURRENT' | 'FUTURE';

// NEW: Timesheet types
export enum TimesheetStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface Timesheet {
    id: string;
    employeeId: number;
    weekStartDate: string; // YYYY-MM-DD, always a Monday
    dailyHours: {
        monday: number;
        tuesday: number;
        wednesday: number;
        thursday: number;
        friday: number;
        saturday: number;
        sunday: number;
    };
    totalHours: number;
    status: TimesheetStatus;
}


export type View = 
  | 'dashboard' 
  | 'payroll' 
  | 'employees' 
  | 'reports' 
  | 'settings' 
  | 'integrations' 
  | 'time_off' 
  | 'company_calendar'
  | 'timesheets'
  | 'knowledge_base'
  | 'approvals' // NEW: Admin view for change requests
  // Employee Self-Service Views
  | 'my_dashboard'
  | 'my_paystubs'
  | 'my_time_off'
  | 'my_info' // NEW
  | 'my_documents'; // NEW

// --- NEW: Time Off Interfaces ---

export enum AccrualMethod {
  Annual = 'Annual',
  PerPayPeriod = 'Per Pay Period',
  Unlimited = 'Unlimited',
}

export enum TimeOffRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Denied = 'Denied',
}

export enum CarryoverTiming {
  CalendarYearEnd = 'Calendar Year End',
  AnniversaryDate = 'Anniversary Date',
  CustomDate = 'Custom Date',
}

export interface Jurisdiction {
  country: 'Canada' | 'USA';
  provinceOrState: string; // e.g., 'Ontario' or 'California'
}

export interface TimeOffPolicy {
  id: string; // e.g., 'vacation-2024'
  name: string; // e.g., 'Vacation Time'
  jurisdiction: Jurisdiction;
  accrualMethod: AccrualMethod;
  accrualRate: number; // Hours per year/period
  carryoverLimit: number; // Max hours to carry over
  isPaid: boolean;
  carryoverTiming: CarryoverTiming;
  customCarryoverDate?: string; // MM-DD format
  isVacationPolicy?: boolean;
  vacationPayAccrualPercent?: number;
}

export enum TimeOffRequestUnit {
    Days = 'Days',
    Hours = 'Hours',
}

export interface TimeOffRequest {
  id: string;
  employeeId: number;
  policyId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: TimeOffRequestStatus;
  notes?: string;
  unit: TimeOffRequestUnit;
  hours?: number;
}

// --- NEW: Company Settings Interfaces ---

// NEW: Enum for CRA Remitter Type
export enum CRARemitterType {
    Quarterly = 'Quarterly',
    Monthly = 'Monthly (Regular)',
    Threshold1 = 'Threshold 1 (Accelerated)',
    Threshold2 = 'Threshold 2 (Accelerated)',
}

// Information specific to Canadian business operations
export interface CanadianCompanyInfo {
  businessNumber: string; // CRA Business Number (e.g., 123456789RP0001)
  remitterType?: CRARemitterType; // NEW
}

// Represents the physical address of the company
export interface CompanyAddress {
  street: string;
  city: string;
  province: Province;
  postalCode: string;
  country: string; // For now, will be 'Canada'
}

// Contact person for payroll inquiries
export interface PayrollContact {
  name: string;
  email: string;
  phone: string;
}

// NEW: Branding information
export interface CompanyBranding {
  logoUrl: string; // Could be a public URL or a Base64 data URI
  primaryColor: string; // Hex color code, e.g., '#4A90E2'
}

// NEW: Calendar configuration
export interface PayrollSchedule {
    frequency: PayFrequency;
    dayOfMonth1?: number | 'last';
    dayOfMonth2?: number | 'last';
    dayOfWeek?: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    anchorDate?: string; // YYYY-MM-DD
}

export interface StatutoryHoliday {
    date: string; // YYYY-MM-DD
    name: string;
    provinces: Province[] | 'all';
}

// --- NEW: Payroll Code Definitions ---
export interface EarningCode {
    id: string;
    name: string;
    type: EarningType.Earning | EarningType.TaxableBenefit | EarningType.Reimbursement;
    isTaxable: boolean;
    isPensionable: boolean; // Subject to CPP
    isInsurable: boolean; // Subject to EI
}

export interface DeductionCode {
    id: string;
    name: string;
    type: DeductionType.PreTax | DeductionType.PostTax;
    calculationMethod: DeductionCalculationMethod;
    reducesTaxableIncome: boolean;
    // Some pre-tax deductions like RRSP do not reduce CPP/EI base
    reducesPensionableEarnings: boolean;
    reducesInsurableEarnings: boolean;
}


// NEW: Configurable system values
export interface CompanyConfigurations {
  statuses: string[];
  phoneTypes?: string[];
  emailTypes?: string[];
  documentCategories?: string[];
  employeeIdGeneration?: {
    method: 'system' | 'manual';
    prefix?: string;
    nextNumber?: number;
  };
  garnishments?: {
      canada?: GarnishmentConfiguration[];
      // usa?: GarnishmentConfiguration[]; // Future proofing
  };
  earningCodes?: EarningCode[];
  deductionCodes?: DeductionCode[];
  vacationPayoutMethod?: 'accrue' | 'payout';
  payrollSchedule?: PayrollSchedule;
  statutoryHolidays?: StatutoryHoliday[];
}

// Main company settings structure, designed for future-proofing
export interface CompanySettings {
  legalName: string;
  address: CompanyAddress;
  payrollContact: PayrollContact;
  bankDetails?: BankDetails;
  branding?: CompanyBranding;
  configurations?: CompanyConfigurations; // NEW
  // Country-specific details are nested
  jurisdictionInfo: {
    canada?: CanadianCompanyInfo;
    // unitedStates?: USCompanyInfo; // Example for future expansion
  };
}

// NEW: Audit Log Entry
export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601 format
  user: string;
  action: string;
  ipAddress: string;
  details?: string;
}

// NEW: For Record of Employment
export enum ROEReasonCode {
    A = 'A - Shortage of work / End of contract or season',
    E = 'E - Quit',
    M = 'M - Dismissal or termination',
    D = 'D - Illness or injury',
    F = 'F - Maternity',
    H = 'H - Work-sharing',
    K = 'K - Other / Change of payroll provider',
}

export interface ROEData {
  employee: Employee;
  companySettings: CompanySettings;
  reasonCode: ROEReasonCode;
  lastDayWorked: string;
  finalPayPeriodEndDate: string;
  totalInsurableHours: number;
  totalInsurableEarnings: number;
}

// FIX: Add SuperAdmin and Tenant types for multi-tenancy support
export interface SuperAdmin {
  id: string;
  name: string;
  isSuperAdmin: true;
}

// NEW: Add Partner type for accountants, bookkeepers, etc.
export interface Partner {
  id: string;
  name: string;
  isPartner: true;
  tenantIds: string[];
}


export enum TenantStatus {
  Active = 'Active',
  Paused = 'Paused',
  Locked = 'Locked',
}

export interface TenantAuditLogEntry {
  timestamp: string;
  action: TenantStatus | 'Created' | 'Reactivated';
  reason: string;
  adminId: string;
}

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  auditLog: TenantAuditLogEntry[];
}

// --- NEW: Employee Change Request Interfaces ---
export enum ChangeRequestType {
  Address = 'Address',
  SIN = 'Social Insurance Number',
  BankDetails = 'Bank Details',
  PhoneNumber = 'Phone Number',
  EmailAddress = 'Email Address',
  ProfilePhoto = 'Profile Photo',
}

export enum ChangeRequestStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface ChangeRequest {
  id: string;
  employeeId: number;
  employeeName: string;
  tenantId: string;
  type: ChangeRequestType;
  status: ChangeRequestStatus;
  requestedAt: string; // ISO 8601
  resolvedAt?: string; // ISO 8601
  oldValue: Partial<CompanyAddress> | AllocatedBankDetails[] | string | PhoneNumber[] | EmailAddress[];
  newValue: Partial<CompanyAddress> | AllocatedBankDetails[] | string | PhoneNumber[] | EmailAddress[];
}