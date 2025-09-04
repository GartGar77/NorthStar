


import type { Employee, Paystub, Integration, CompanySettings, TimeOffPolicy, TimeOffRequest, EmployeeGarnishment, BankDetails, StatutoryHoliday, AuditLogEntry, Timesheet, PaystubItem } from './types';
import { Province, AccrualMethod, TimeOffRequestStatus, CarryoverTiming, GarnishmentCalculationType, PayFrequency as PayFrequencyEnum, TimesheetStatus, TimeOffRequestUnit, EarningType, DeductionType, DeductionCalculationMethod, CRARemitterType } from './types';


// This is a mock database. In a real application, this would be a database.
export const MOCK_EMPLOYEES: Employee[] = [
  { id: 101, employeeId: 'EMP-101', isAdmin: true, payFrequency: PayFrequencyEnum.SemiMonthly, garnishments: [{ configId: 'court-order-on', amount: 150 }], profileHistory: [ { effectiveDate: '2024-07-10', status: 'Promotion', profile: { name: 'Aisha Khan', role: 'Senior Software Engineer', payType: 'Salaried', annualSalary: 105000, province: Province.ON, dateOfBirth: '1990-05-15', address: { street: '123 Main St', city: 'Toronto', province: Province.ON, postalCode: 'M5V 2N2', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '416-555-0101'}], emails: [{type: 'Work', address: 'aisha.khan@example.com'}], supervisorId: undefined } }, { effectiveDate: '2023-01-01', status: 'Hire', profile: { name: 'Aisha Khan', role: 'Software Engineer', payType: 'Salaried', annualSalary: 95000, province: Province.ON, dateOfBirth: '1990-05-15', address: { street: '123 Main St', city: 'Toronto', province: Province.ON, postalCode: 'M5V 2N2', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '416-555-0101'}], emails: [{type: 'Work', address: 'aisha.khan@example.com'}], supervisorId: undefined } } ], payroll: { canada: { sin: '123456789', td1Federal: 15705, td1Provincial: 12399 } }, bankAccounts: [{ id: 'bank-ak-1', nickname: 'Chequing', institution: '001', transit: '12345', account: '111222333', allocationPercent: 100 }], timeOffBalances: { 'vac-on-2024': 80, 'sick-on-2024': 40 }, recurringEarnings: [], recurringDeductions: [{ codeId: 'health-dental', amount: 75.50 }], ytd: { grossPay: 45000, cpp: 2500, ei: 700, vacationPay: 1800 }, certifications: [ { id: 'cert-1', name: 'Certified Payroll Professional', issuingBody: 'Canadian Payroll Association', issueDate: '2022-06-15', expiryDate: '2025-06-15' }, { id: 'cert-2', name: 'Advanced React', issuingBody: 'Online University', issueDate: '2023-01-20' }, ], education: [ { id: 'edu-1', institution: 'University of Toronto', degree: 'Bachelor of Science', fieldOfStudy: 'Computer Science', completionDate: '2021-05-01' }, ], documents: [ { id: 'doc-101-1', name: 'Offer Letter - 2023.pdf', category: 'Offer Letter', uploadDate: '2023-01-01', uploaderName: 'Admin User', uploadedBy: 'Admin', visibleToEmployee: true, fileUrl: '#' }, { id: 'doc-101-2', name: 'Performance Review Q2 2024.pdf', category: 'Performance Review', uploadDate: '2024-07-05', uploaderName: 'Admin User', uploadedBy: 'Admin', visibleToEmployee: false, fileUrl: '#' }, { id: 'doc-101-3', name: 'Receipt for WFH equipment.pdf', category: 'Other', uploadDate: '2024-07-15', uploaderName: 'Aisha Khan', uploadedBy: 'Employee', visibleToEmployee: true, fileUrl: '#' } ] },
  { id: 102, employeeId: 'EMP-102', payFrequency: PayFrequencyEnum.BiWeekly, garnishments: [], profileHistory: [ { effectiveDate: '2023-03-15', status: 'Hire', profile: { name: 'Ben Carter', role: 'Product Manager', payType: 'Hourly', annualSalary: 72000, province: Province.BC, dateOfBirth: '1988-11-20', address: { street: '456 Oak Ave', city: 'Vancouver', province: Province.BC, postalCode: 'V6Z 1L6', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '604-555-0102'}], emails: [{type: 'Work', address: 'ben.carter@example.com'}], supervisorId: 101, hourlyRate: 34.62, weeklyHours: 40 } } ], payroll: { canada: { sin: '987654321', td1Federal: 15705, td1Provincial: 12537 } }, bankAccounts: [ { id: 'bank-bc-1', nickname: 'Chequing', institution: '002', transit: '54321', account: '444555666', allocationPercent: 70 }, { id: 'bank-bc-2', nickname: 'Savings', institution: '002', transit: '54321', account: '999888777', allocationPercent: 30 } ], timeOffBalances: { 'vac-bc-2024': 92.4 }, recurringEarnings: [], recurringDeductions: [], ytd: { grossPay: 35000, cpp: 1800, ei: 500, vacationPay: 1400 }, certifications: [], education: [], documents: [ { id: 'doc-102-1', name: 'Offer Letter - 2023.pdf', category: 'Offer Letter', uploadDate: '2023-03-15', uploaderName: 'Admin User', uploadedBy: 'Admin', visibleToEmployee: true, fileUrl: '#' } ] },
  { id: 103, employeeId: 'EMP-103', payFrequency: PayFrequencyEnum.Monthly, garnishments: [], profileHistory: [ { effectiveDate: '2022-08-01', status: 'Hire', profile: { name: 'Chloe Davis', role: 'Designer', payType: 'Salaried', annualSalary: 60000, province: Province.QC, dateOfBirth: '1995-02-10', address: { street: '789 Pine Rd', city: 'Montreal', province: Province.QC, postalCode: 'H3G 1T5', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '514-555-0103'}], emails: [{type: 'Work', address: 'chloe.davis@example.com'}], supervisorId: 101 } } ], payroll: { canada: { sin: '111222333', td1Federal: 15705, td1Provincial: 18038 } }, bankAccounts: [{ id: 'bank-cd-1', nickname: 'Main Account', institution: '003', transit: '67890', account: '777888999', allocationPercent: 100 }], timeOffBalances: { 'unpaid-qc-2024': 0 }, recurringEarnings: [], recurringDeductions: [], ytd: { grossPay: 30000, cpp: 1500, ei: 400, vacationPay: 1200 }, certifications: [], education: [] },
  { id: 104, employeeId: 'EMP-104', payFrequency: PayFrequencyEnum.SemiMonthly, garnishments: [], profileHistory: [ { effectiveDate: '2023-09-01', status: 'Hire', profile: { name: 'David Rodriguez', role: 'Junior Developer', payType: 'Salaried', annualSalary: 55000, province: Province.ON, dateOfBirth: '1998-07-25', address: { street: '321 Elm St', city: 'Toronto', province: Province.ON, postalCode: 'M5V 2N3', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '416-555-0104'}], emails: [{type: 'Work', address: 'david.rodriguez@example.com'}], supervisorId: 101 } } ], payroll: { canada: { sin: '444555666', td1Federal: 15705, td1Provincial: 12399 } }, bankAccounts: [{ id: 'bank-dr-1', nickname: 'Primary', institution: '001', transit: '12345', account: '101112131', allocationPercent: 100 }], timeOffBalances: { 'vac-on-2024': 40, 'sick-on-2024': 16 }, recurringEarnings: [], recurringDeductions: [], ytd: { grossPay: 20000, cpp: 1000, ei: 300, vacationPay: 800 }, certifications: [], education: [] },
  { id: 105, employeeId: 'EMP-105', payFrequency: PayFrequencyEnum.BiWeekly, garnishments: [], profileHistory: [ { effectiveDate: '2022-05-20', status: 'Hire', profile: { name: 'Emily White', role: 'HR Coordinator', payType: 'Salaried', annualSalary: 88000, province: Province.ON, dateOfBirth: '1985-09-30', address: { street: '654 Birch Blvd', city: 'Ottawa', province: Province.ON, postalCode: 'K1P 5J2', country: 'Canada' }, phoneNumbers: [{type: 'Cell', number: '613-555-0105'}], emails: [{type: 'Work', address: 'emily.white@example.com'}], supervisorId: 101 } } ], payroll: { canada: { sin: '777888999', td1Federal: 15705, td1Provincial: 12399 } }, bankAccounts: [{ id: 'bank-ew-1', nickname: 'Chequing', institution: '004', transit: '09876', account: '141516171', allocationPercent: 100 }], timeOffBalances: { 'vac-on-2024': 120, 'sick-on-2024': 24 }, recurringEarnings: [{ codeId: 'car-allowance', amount: 500 }], recurringDeductions: [], ytd: { grossPay: 50000, cpp: 2800, ei: 800, vacationPay: 2100 }, certifications: [], education: [] },
];

// --- MOCK INTEGRATIONS DATA ---
// This would come from a database in a real backend.
export const MOCK_INTEGRATIONS: Integration[] = [
  {
    name: 'QuickBooks',
    description: 'Automatically sync your payroll data, including journal entries and employee expenses.',
    status: 'connected',
  },
  {
    name: 'Xero',
    description: 'Sync payroll expenses and create bills to be paid for seamless accounting.',
    status: 'not_connected',
  },
  {
    name: 'Wave',
    description: 'Export payroll data to Wave for easy accounting management for small businesses.',
    status: 'not_connected',
  }
];

// --- MOCK PAYROLL HISTORY ---
export const MOCK_PAYROLL_HISTORY: Paystub[][] = [
    // July 15, 2024 Pay Run
    [
        { employeeId: 101, employeeName: 'Aisha Khan', payPeriod: 'July 1-15, 2024', grossPay: 4126.98, totalDeductions: 1610.11, netPay: 2516.87, earnings: [{type: "Regular Pay", description: "Prorated Salary (Old Rate)", amount: 3166.66}, {type: "Regular Pay", description: "Prorated Salary (New Rate)", amount: 960.32}], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 800.22 }, { type: DeductionType.ProvincialTax, description: 'Ontario Provincial Tax', amount: 375.55 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 242.23 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 68.11 }, { type: DeductionType.Garnishment, description: 'Court Judgment - ON', amount: 150.00 }, ], employerContributions: { cpp: 242.23, ei: 95.35 } },
        { employeeId: 102, employeeName: 'Ben Carter', payPeriod: 'July 1-15, 2024', grossPay: 2769.23, totalDeductions: 867.65, netPay: 1901.58, earnings: [{ type: EarningType.Regular, description: 'Bi-weekly Salary', amount: 2769.23 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 450.78 }, { type: DeductionType.ProvincialTax, description: 'BC Provincial Tax', amount: 210.99 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 162.33 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 43.55 }, ], employerContributions: { cpp: 162.33, ei: 60.97 } },
        { employeeId: 103, employeeName: 'Chloe Davis', payPeriod: 'July 1-15, 2024', grossPay: 5000.00, totalDeductions: 1971.47, netPay: 3028.53, earnings: [{ type: EarningType.Regular, description: 'Monthly Salary', amount: 5000.00 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 1000.00 }, { type: DeductionType.ProvincialTax, description: 'Quebec Provincial Tax', amount: 600.00 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 292.82 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 78.65 }, ], employerContributions: { cpp: 292.82, ei: 110.11 } },
        { employeeId: 104, employeeName: 'David Rodriguez', payPeriod: 'July 1-15, 2024', grossPay: 2291.67, totalDeductions: 700.48, netPay: 1591.19, earnings: [{ type: EarningType.Regular, description: 'Semi-monthly Salary', amount: 2291.67 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 350.00 }, { type: DeductionType.ProvincialTax, description: 'Ontario Provincial Tax', amount: 180.22 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 134.21 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 36.05 }, ], employerContributions: { cpp: 134.21, ei: 50.47 } },
        { employeeId: 105, employeeName: 'Emily White', payPeriod: 'July 1-15, 2024', grossPay: 3384.62, totalDeductions: 1151.96, netPay: 2232.66, earnings: [{ type: EarningType.Regular, description: 'Bi-weekly Salary', amount: 3384.62 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 600.50 }, { type: DeductionType.ProvincialTax, description: 'Ontario Provincial Tax', amount: 300.10 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 198.15 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 53.21 }, ], employerContributions: { cpp: 198.15, ei: 74.49 } },
    ],
    // June 30, 2024 Pay Run
    [
        { employeeId: 101, employeeName: 'Aisha Khan', payPeriod: 'June 16-30, 2024', grossPay: 3958.33, totalDeductions: 1544.24, netPay: 2414.09, earnings: [{ type: EarningType.Regular, description: 'Semi-monthly Salary', amount: 3958.33 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 750.12 }, { type: DeductionType.ProvincialTax, description: 'Ontario Provincial Tax', amount: 350.45 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 231.56 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 62.11 }, { type: DeductionType.Garnishment, description: 'Court Judgment - ON', amount: 150.00 }, ], employerContributions: { cpp: 231.56, ei: 86.95 } },
        { employeeId: 102, employeeName: 'Ben Carter', payPeriod: 'June 16-30, 2024', grossPay: 2769.23, totalDeductions: 867.65, netPay: 1901.58, earnings: [{ type: EarningType.Regular, description: 'Bi-weekly Salary', amount: 2769.23 }], deductions: [ { type: DeductionType.FederalTax, description: 'Federal Income Tax', amount: 450.78 }, { type: DeductionType.ProvincialTax, description: 'BC Provincial Tax', amount: 210.99 }, { type: DeductionType.CPP, description: 'Canada Pension Plan', amount: 162.33 }, { type: DeductionType.EI, description: 'Employment Insurance', amount: 43.55 }, ], employerContributions: { cpp: 162.33, ei: 60.97 } },
    ]
];

// --- MOCK AUDIT LOG DATA ---
export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
    { id: 'log-1', timestamp: '2024-07-28T14:30:15Z', user: 'Admin User', action: 'User logged in', ipAddress: '203.0.113.10' },
    { id: 'log-2', timestamp: '2024-07-28T14:32:01Z', user: 'Admin User', action: 'Ran payroll', ipAddress: '203.0.113.10', details: '5 employees for period July 1-15, 2024' },
    { id: 'log-3', timestamp: '2024-07-28T14:35:22Z', user: 'Admin User', action: 'Viewed CRA Remittance Report', ipAddress: '203.0.113.10', details: 'Period: July 1-15, 2024' },
    { id: 'log-4', timestamp: '2024-07-27T10:05:45Z', user: 'Admin User', action: 'Updated employee profile', ipAddress: '203.0.113.10', details: 'Employee: Aisha Khan (ID: 101)' },
    { id: 'log-5', timestamp: '2024-07-27T09:50:11Z', user: 'Admin User', action: 'Added new employee', ipAddress: '203.0.113.10', details: 'Employee: Frank Green (ID: 106)' },
    { id: 'log-6', timestamp: '2024-07-26T16:20:00Z', user: 'Admin User', action: 'Updated company branding settings', ipAddress: '198.51.100.22' },
    { id: 'log-7', timestamp: '2024-07-26T11:15:33Z', user: 'Admin User', action: 'User logged in', ipAddress: '198.51.100.22' },
    { id: 'log-8', timestamp: '2024-07-25T18:01:50Z', user: 'Admin User', action: 'Approved time off request', ipAddress: '198.51.100.22', details: 'Employee: Ben Carter (ID: 102)' },
    { id: 'log-9', timestamp: '2024-07-25T17:58:12Z', user: 'Admin User', action: 'Viewed employee details', ipAddress: '198.51.100.22', details: 'Employee: Ben Carter (ID: 102)' },
    { id: 'log-10', timestamp: '2024-07-24T13:00:05Z', user: 'Admin User', action: 'Downloaded employee data template', ipAddress: '198.51.100.22' },
    { id: 'log-11', timestamp: '2024-07-23T09:12:40Z', user: 'Admin User', action: 'User logged out', ipAddress: '203.0.113.10' },
    { id: 'log-12', timestamp: '2024-07-23T09:00:10Z', user: 'Admin User', action: 'User logged in', ipAddress: '203.0.113.10' },
    { id: 'log-13', timestamp: '2024-07-22T15:45:00Z', user: 'Admin User', action: 'Updated payroll schedule settings', ipAddress: '203.0.113.10' },
    { id: 'log-14', timestamp: '2024-07-22T11:30:21Z', user: 'Admin User', action: 'Created new time off policy', ipAddress: '203.0.113.10', details: 'Policy: Bereavement Leave' },
    { id: 'log-15', timestamp: '2024-07-21T10:00:00Z', user: 'Admin User', action: 'Failed login attempt', ipAddress: '192.0.2.14' },
];


// --- MOCK COMPANY SETTINGS DATA ---
export const MOCK_COMPANY_SETTINGS: CompanySettings = {
    legalName: 'NorthStar HCM Inc.',
    address: {
        street: '123 Maple Street',
        city: 'Toronto',
        province: Province.ON,
        postalCode: 'M5H 2N2',
        country: 'Canada',
    },
    payrollContact: {
        name: 'Admin User',
        email: 'admin@northstarhcm.com',
        phone: '416-555-1234',
    },
    bankDetails: {
        institution: '001',
        transit: '11111',
        account: '123456789',
    },
    jurisdictionInfo: {
        canada: {
            businessNumber: '123456789RP0001',
            remitterType: CRARemitterType.Monthly,
        },
    },
    branding: {
        logoUrl: '',
        primaryColor: '#0052cc', // Default brand color
    },
    configurations: {
        statuses: ['Hire', 'Promotion', 'Job Change', 'Termination', 'Leave of Absence'],
        phoneTypes: ['Cell', 'Home', 'Work', 'Other'],
        emailTypes: ['Work', 'Personal'],
        documentCategories: ['Offer Letter', 'Performance Review', 'Policy Acknowledgement', 'Certification', 'Other'],
        employeeIdGeneration: {
            method: 'system',
            prefix: 'EMP-',
            nextNumber: 106,
        },
        earningCodes: [
            { id: 'reg-pay', name: 'Regular Pay', type: EarningType.Earning, isTaxable: true, isPensionable: true, isInsurable: true },
            { id: 'overtime', name: 'Overtime', type: EarningType.Earning, isTaxable: true, isPensionable: true, isInsurable: true },
            { id: 'bonus-disc', name: 'Discretionary Bonus', type: EarningType.Earning, isTaxable: true, isPensionable: true, isInsurable: true },
            // FIX: The type for a configurable earning code cannot be a system type like 'Vacation Pay'. It should be a general 'Earning'.
            { id: 'vacation-payout', name: 'Vacation Payout', type: EarningType.Earning, isTaxable: true, isPensionable: true, isInsurable: true },
            { id: 'car-allowance', name: 'Car Allowance', type: EarningType.TaxableBenefit, isTaxable: true, isPensionable: true, isInsurable: true },
            { id: 'internet-reimburse', name: 'Internet Reimbursement', type: EarningType.Reimbursement, isTaxable: false, isPensionable: false, isInsurable: false },
        ],
        deductionCodes: [
            { id: 'rrsp-match', name: 'Group RRSP', type: DeductionType.PreTax, calculationMethod: DeductionCalculationMethod.FixedAmount, reducesTaxableIncome: true, reducesPensionableEarnings: false, reducesInsurableEarnings: false },
            { id: 'union-dues', name: 'Union Dues', type: DeductionType.PreTax, calculationMethod: DeductionCalculationMethod.FixedAmount, reducesTaxableIncome: true, reducesPensionableEarnings: false, reducesInsurableEarnings: false },
            { id: 'health-dental', name: 'Health & Dental Premium', type: DeductionType.PostTax, calculationMethod: DeductionCalculationMethod.FixedAmount, reducesTaxableIncome: false, reducesPensionableEarnings: false, reducesInsurableEarnings: false },
            { id: 'on-demand-repayment', name: 'Earned Wage Advance Repayment', type: DeductionType.PostTax, calculationMethod: DeductionCalculationMethod.FixedAmount, reducesTaxableIncome: false, reducesPensionableEarnings: false, reducesInsurableEarnings: false },
        ],
        vacationPayoutMethod: 'accrue',
        garnishments: {
            canada: [
                { id: 'cra-federal-tax', name: 'CRA - Federal Tax Debt', jurisdiction: 'Federal', description: 'Garnishment for unpaid federal income taxes.', calculationType: GarnishmentCalculationType.FixedAmount, priority: 1 },
                { id: 'family-support-on', name: 'Family Support Order - ON', jurisdiction: Province.ON, description: 'Deductions for court-ordered family support (e.g., child or spousal support).', calculationType: GarnishmentCalculationType.FixedAmount, priority: 2 },
                { id: 'court-order-on', name: 'Court Judgment - ON', jurisdiction: Province.ON, description: 'Garnishment to pay off a civil court judgment.', calculationType: GarnishmentCalculationType.FixedAmount, priority: 3 },
                { id: 'provincial-tax-qc', name: 'Revenu Québec - Tax Debt', jurisdiction: Province.QC, description: 'Garnishment for unpaid Quebec provincial taxes.', calculationType: GarnishmentCalculationType.PercentageOfGross, priority: 1 },
            ]
        },
        payrollSchedule: {
            frequency: PayFrequencyEnum.SemiMonthly,
            dayOfMonth1: 15,
            dayOfMonth2: 'last',
        },
        statutoryHolidays: [
            { date: '2024-01-01', name: "New Year's Day", provinces: 'all' },
            { date: '2024-03-29', name: 'Good Friday', provinces: 'all' },
            { date: '2024-05-20', name: 'Victoria Day', provinces: 'all' },
            { date: '2024-07-01', name: 'Canada Day', provinces: 'all' },
            { date: '2024-09-02', name: 'Labour Day', provinces: 'all' },
            { date: '2024-10-14', name: 'Thanksgiving Day', provinces: 'all' },
            { date: '2024-12-25', name: 'Christmas Day', provinces: 'all' },
        ]
    }
};


// --- MOCK TIME OFF DATA ---
export const MOCK_TIME_OFF_POLICIES: TimeOffPolicy[] = [
    {
        id: 'vac-on-2024',
        name: 'Vacation (Ontario)',
        jurisdiction: { country: 'Canada', provinceOrState: 'Ontario' },
        accrualMethod: AccrualMethod.Annual,
        accrualRate: 120, // 15 days in hours
        carryoverLimit: 40,
        isPaid: true,
        carryoverTiming: CarryoverTiming.CalendarYearEnd,
        isVacationPolicy: true,
        vacationPayAccrualPercent: 6,
    },
    {
        id: 'sick-on-2024',
        name: 'Sick Days (Ontario)',
        jurisdiction: { country: 'Canada', provinceOrState: 'Ontario' },
        accrualMethod: AccrualMethod.Annual,
        accrualRate: 40, // 5 days
        carryoverLimit: 0,
        isPaid: true,
        carryoverTiming: CarryoverTiming.AnniversaryDate,
    },
    {
        id: 'vac-bc-2024',
        name: 'Vacation (British Columbia)',
        jurisdiction: { country: 'Canada', provinceOrState: 'British Columbia' },
        accrualMethod: AccrualMethod.PerPayPeriod,
        accrualRate: 4.62, // Approx 3 weeks/year for bi-weekly pay
        carryoverLimit: 40,
        isPaid: true,
        carryoverTiming: CarryoverTiming.CustomDate,
        customCarryoverDate: '04-01',
        isVacationPolicy: true,
        vacationPayAccrualPercent: 4,
    },
    {
        id: 'unpaid-qc-2024',
        name: 'Unpaid Leave (Quebec)',
        jurisdiction: { country: 'Canada', provinceOrState: 'Quebec' },
        accrualMethod: AccrualMethod.Unlimited,
        accrualRate: 0,
        carryoverLimit: 0,
        isPaid: false,
        carryoverTiming: CarryoverTiming.CalendarYearEnd,
    },
];

export const MOCK_TIME_OFF_REQUESTS: TimeOffRequest[] = [
    {
        id: 'req-1',
        employeeId: 101,
        policyId: 'vac-on-2024',
        startDate: '2024-08-12',
        endDate: '2024-08-16',
        status: TimeOffRequestStatus.Pending,
        notes: 'Family trip.',
        unit: TimeOffRequestUnit.Days,
    },
    {
        id: 'req-2',
        employeeId: 104,
        policyId: 'sick-on-2024',
        startDate: '2024-07-29',
        endDate: '2024-07-29',
        status: TimeOffRequestStatus.Pending,
        notes: 'Feeling unwell.',
        unit: TimeOffRequestUnit.Days,
    },
     {
        id: 'req-3',
        employeeId: 102,
        policyId: 'vac-bc-2024',
        startDate: '2024-09-02',
        endDate: '2024-09-06',
        status: TimeOffRequestStatus.Approved,
        unit: TimeOffRequestUnit.Days,
    },
];

// --- MOCK TIMESHEETS DATA ---
export const MOCK_TIMESHEETS: Timesheet[] = [
    {
        id: 'ts-1',
        employeeId: 102, // Ben Carter
        weekStartDate: '2024-07-15', // Monday
        dailyHours: { monday: 8, tuesday: 8, wednesday: 8, thursday: 7.5, friday: 6, saturday: 0, sunday: 0 },
        totalHours: 37.5,
        status: TimesheetStatus.Approved,
    },
    {
        id: 'ts-2',
        employeeId: 102,
        weekStartDate: '2024-07-22', // Monday
        dailyHours: { monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 7.5, saturday: 0, sunday: 0 },
        totalHours: 39.5,
        status: TimesheetStatus.Approved,
    },
    {
        id: 'ts-3',
        employeeId: 102,
        weekStartDate: '2024-07-29', // Monday
        dailyHours: { monday: 8, tuesday: 4, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 },
        totalHours: 12,
        status: TimesheetStatus.Draft,
    },
];