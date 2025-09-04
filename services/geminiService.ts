


import { GoogleGenAI, Type } from "@google/genai";
import type { Employee, Paystub, EmployeeProfile, EmployeeGarnishment, GarnishmentConfiguration, PaystubItem, EarningCode, DeductionCode, EmployeeDeduction, StatutoryHoliday } from '../types';
import { DeductionType, Province } from '../types';
import { FEDERAL_TAX_BRACKETS_2024, PROVINCIAL_TAX_BRACKETS_2024, CPP_EI_RATES_2024 } from './payrollConstants';

if (!process.env.API_KEY) {
  // This is a placeholder check. In a real app, this would be handled by the environment.
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const payrollSchema = {
  type: Type.OBJECT,
  properties: {
    grossPay: { type: Type.NUMBER, description: "The total gross pay for this pay period (sum of all earnings)." },
    totalDeductions: { type: Type.NUMBER, description: "The sum of all deductions (taxes, CPP, EI, garnishments)." },
    netPay: { type: Type.NUMBER, description: "The final net pay (gross pay - total deductions)." },
    accruedVacationPay: { type: Type.NUMBER, description: "The amount of vacation pay accrued this period. This should be calculated if the policy is to 'accrue'. If policy is to 'payout', this amount should be added to earnings instead, and this field should be 0." },
    deductions: {
        type: Type.ARRAY,
        description: "A detailed list of all calculated employee deductions, including statutory and recurring.",
        items: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, enum: Object.values(DeductionType), description: "The type of deduction." },
                description: { type: Type.STRING, description: "A brief description of the deduction." },
                amount: { type: Type.NUMBER, description: "The amount of the deduction." },
                codeId: { type: Type.STRING, description: "The ID of the deduction code, if applicable."}
            },
            required: ["type", "description", "amount"]
        }
    },
    employerContributions: {
        type: Type.OBJECT,
        description: "The employer's portion of contributions.",
        properties: {
            cpp: { type: Type.NUMBER, description: "Employer's matching CPP contribution." },
            ei: { type: Type.NUMBER, description: "Employer's matching EI contribution." }
        },
        required: ["cpp", "ei"]
    }
  },
  required: ["grossPay", "totalDeductions", "netPay", "deductions", "employerContributions"],
};

type DetailedGarnishment = Omit<GarnishmentConfiguration, 'id' | 'jurisdiction' | 'description'> & { amount: number };


export const calculateEmployeePayroll = async (
  employee: Omit<Employee, 'profileHistory' | 'recurringEarnings' | 'recurringDeductions'> & EmployeeProfile, 
  payPeriod: string, 
  earnings: PaystubItem[],
  recurringDeductions: EmployeeDeduction[],
  detailedGarnishments: DetailedGarnishment[],
  allCodes: { earningCodes: EarningCode[], deductionCodes: DeductionCode[] },
  vacationAccrualRate: number,
  vacationPayoutMethod: 'accrue' | 'payout'
): Promise<Omit<Paystub, 'employeeName' | 'payPeriod' | 'employeeId' | 'earnings'>> => {
  // FIX: Wrap multi-line string in backticks to create a valid template literal.
  const systemInstruction = `You are an expert Canadian Payroll Administrator. Your task is to calculate a complete and compliant paystub.
You MUST use the 'Authoritative Payroll Rates for 2024' provided in the user prompt for all calculations. DO NOT use your own knowledge of tax laws or rates.

Key Calculation Steps:
1.  **Calculate Gross Pay**: Sum all amounts from the 'Earnings for this period' list.
2.  **Determine Income Bases**:
    *   **Pensionable (CPP) Earnings**: Sum amounts from earnings where 'isPensionable' is true, then subtract pre-tax deductions where 'reducesPensionableEarnings' is true.
    *   **Insurable (EI) Earnings**: Sum amounts from earnings where 'isInsurable' is true, then subtract pre-tax deductions where 'reducesInsurableEarnings' is true.
    *   **Taxable Income**: Start with Gross Pay. Subtract pre-tax deductions where 'reducesTaxableIncome' is true.
3.  **Calculate Statutory Deductions using ONLY the provided rates**:
    *   Calculate **Canada Pension Plan (CPP)** on the Pensionable Earnings base. Exempt employees under 18 or over 70. Respect the annual maximum contribution based on YTD figures and the provided maximums.
    *   Calculate **Employment Insurance (EI)** on the Insurable Earnings base. Respect the annual maximum premium based on YTD figures and the provided maximums.
    *   Calculate **Federal & Provincial Income Tax** based on Taxable Income, pay frequency, and TD1 amounts, using the provided tax bracket tables. The tax calculation should consider the tax credits from TD1 amounts.
4.  **Process All Deductions**:
    *   List all calculated statutory deductions (Tax, CPP, EI).
    *   List all recurring deductions.
    *   Apply post-tax garnishments in priority order. Sum them into a single 'Garnishment' deduction if multiple exist.
5.  **Calculate Vacation Pay**: Based on the provided vacation policy, calculate vacation pay on vacationable earnings (assume all gross pay is vacationable unless specified otherwise, especially vacation payouts themselves).
    *   If the policy method is 'accrue', calculate the amount and return it in the \`accruedVacationPay\` field. Do NOT add it to the gross pay earnings.
    *   If the policy method is 'payout', calculate the amount and add it as a 'Vacation Pay' line item to the earnings list. This will increase the gross pay. The \`accruedVacationPay\` field should be 0 in this case.
6.  **Final Calculations**:
    *   Calculate Employer Contributions using the provided rates: CPP (1x employee's portion) and EI (1.4x employee's portion).
    *   Calculate Total Deductions and the final Net Pay.
    *   Ensure all deductions are itemized in the final 'deductions' array, referencing their codeId if applicable.`;

  const earningsText = earnings.map(e => `- ${e.description}: ${e.hours ? `${e.hours.toFixed(2)} hrs @ $${e.rate?.toFixed(2)}/hr = ` : ''}$${e.amount.toFixed(2)} (CodeID: ${e.codeId})`).join('\n    ');
  
  const deductionCodeMap = new Map(allCodes.deductionCodes.map(c => [c.id, c]));
  const recurringDeductionsText = recurringDeductions.map(d => {
    const code = deductionCodeMap.get(d.codeId);
    return `- ${code?.name || 'Unknown Deduction'}: $${d.amount.toFixed(2)} (CodeID: ${d.codeId})`;
  }).join('\n    ') || 'None';

  const garnishmentsText = detailedGarnishments.length > 0
    ? `Apply these post-tax garnishments in priority order (lower number first): ${detailedGarnishments.map(g => `${g.name} (Priority: ${g.priority}, Type: ${g.calculationType}, Value: ${g.amount}${g.calculationType.includes('%') ? '%' : ''})`).join('; ')}.`
    : "No wage garnishments.";
    
  const td1Text = employee.payroll.canada
    ? `Use the following tax credit amounts for calculations: Federal TD1: $${employee.payroll.canada.td1Federal}, Provincial TD1: $${employee.payroll.canada.td1Provincial}.`
    : `Assume standard Personal Tax Credits (TD1) for all calculations.`;

  const provincialBrackets = PROVINCIAL_TAX_BRACKETS_2024[employee.province as Province] || PROVINCIAL_TAX_BRACKETS_2024[Province.ON];

  const prompt = `
    Please calculate the payroll for employee ID ${employee.id} for the pay period "${payPeriod}".

    ---
    Authoritative Payroll Rates for 2024 (USE THESE VALUES ONLY):
    - Federal Tax Brackets: ${JSON.stringify(FEDERAL_TAX_BRACKETS_2024)}
    - Provincial Tax Brackets for ${employee.province}: ${JSON.stringify(provincialBrackets)}
    - CPP/EI Rates: ${JSON.stringify(CPP_EI_RATES_2024)}
    ---

    Code Definitions:
    - Earning Codes: ${JSON.stringify(allCodes.earningCodes)}
    - Deduction Codes: ${JSON.stringify(allCodes.deductionCodes)}

    Employee Details:
    - Pay Frequency: ${employee.payFrequency}
    - Province of Employment: ${employee.province}
    - Date of Birth: ${employee.dateOfBirth}
    - Tax Credits: ${td1Text}
    - Year-to-Date Totals: Gross Pay $${employee.ytd.grossPay.toFixed(2)}, CPP Contributions $${employee.ytd.cpp.toFixed(2)}, EI Premiums $${employee.ytd.ei.toFixed(2)}, Vacation Pay Balance $${employee.ytd.vacationPay.toFixed(2)}.
    - Vacation Policy: ${vacationAccrualRate}% accrual rate. Method: ${vacationPayoutMethod}.

    Earnings for this period:
    ${earningsText}

    Recurring Deductions for this period:
    ${recurringDeductionsText}

    Garnishments: ${garnishmentsText}

    Based on all the above information, perform the calculation as per the system instructions and return the paystub JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      // FIX: Updated model from prohibited 'gemini-1.5-flash' to 'gemini-2.5-flash'
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: payrollSchema,
        temperature: 0,
      },
    });

    const jsonText = response.text.trim();
    const calculatedData = JSON.parse(jsonText);
    
    if (!payrollSchema.required.every(key => key in calculatedData)) {
      throw new Error("Gemini response is missing required fields.");
    }

    return calculatedData as Omit<Paystub, 'employeeName' | 'payPeriod' | 'employeeId' | 'earnings'>;

  } catch (error) {
    console.error(`Error calculating payroll for employee ${employee.id}:`, error);
    if (error instanceof Error && error.message.includes('JSON')) {
       console.error("Invalid JSON response from Gemini:", (error as any).response?.text);
    }
    throw new Error(`Failed to calculate payroll for ${employee.name}. Please check the console for details.`);
  }
};

export const analyzePayrollVariance = async (
    currentRun: Paystub[],
    previousRun: Paystub[],
    employeeMap: Map<number, Employee>
): Promise<string> => {
    const systemInstruction = `You are a Canadian payroll expert. Your task is to analyze the variance between two payroll runs and provide a concise, insightful explanation. Focus on the most likely causes based on Canadian payroll best practices.

    Analysis Checklist:
    1.  **Headcount Changes**: Note any new employees in the current run or terminated employees from the previous run.
    2.  **Significant Pay Differences**: Identify any employees with a large change in gross pay (e.g., >10%) and suggest possible reasons (e.g., overtime, bonus, promotion, unpaid leave).
    3.  **One-Time Payments**: Look for earnings labeled as 'Bonus' or 'adjustment' that could skew the total.
    4.  **Overall Summary**: Provide a brief, bulleted summary of the key drivers for the change in total payroll cost.`;

    const currentTotal = currentRun.reduce((sum, p) => sum + p.grossPay, 0);
    const previousTotal = previousRun.reduce((sum, p) => sum + p.grossPay, 0);

    const currentIds = new Set(currentRun.map(p => p.employeeId));
    const previousIds = new Set(previousRun.map(p => p.employeeId));

    const newHires = [...currentIds].filter(id => !previousIds.has(id)).map(id => employeeMap.get(id)?.profileHistory[0].profile.name);
    const terminations = [...previousIds].filter(id => !currentIds.has(id)).map(id => employeeMap.get(id)?.profileHistory[0].profile.name);

    const individualChanges = currentRun
        .map(currentPaystub => {
            const previousPaystub = previousRun.find(p => p.employeeId === currentPaystub.employeeId);
            if (!previousPaystub) return null;

            const variance = currentPaystub.grossPay - previousPaystub.grossPay;
            const percentChange = previousPaystub.grossPay > 0 ? (variance / previousPaystub.grossPay) * 100 : 0;

            if (Math.abs(percentChange) > 10) { // Threshold for significant change
                return `${currentPaystub.employeeName}: Gross pay changed by ${percentChange.toFixed(1)}% (${variance > 0 ? '+' : ''}$${variance.toFixed(2)}).`;
            }
            return null;
        })
        .filter(Boolean)
        .join('\n- ');
    
    const prompt = `
        Analyze the variance between these two payroll runs.

        **Previous Run Summary:**
        - Total Gross Pay: $${previousTotal.toFixed(2)}
        - Employee Count: ${previousRun.length}

        **Current Run Summary:**
        - Total Gross Pay: $${currentTotal.toFixed(2)}
        - Employee Count: ${currentRun.length}
        
        **Detailed Changes:**
        - New Hires: ${newHires.length > 0 ? newHires.join(', ') : 'None'}
        - Terminations: ${terminations.length > 0 ? terminations.join(', ') : 'None'}
        - Significant Individual Pay Changes:
        - ${individualChanges || 'None'}

        Based on this data, provide a brief, bullet-pointed analysis explaining the primary reasons for the variance in total payroll cost.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing payroll variance:", error);
        return "An error occurred while analyzing the data. The AI agent could not determine the cause of the variance.";
    }
};

// --- NEW: Payroll Calculators ---

const singleValueCalculationSchema = {
    type: Type.OBJECT,
    properties: {
        amount: { type: Type.NUMBER, description: "The final calculated pay amount." },
        explanation: { type: Type.STRING, description: "A step-by-step explanation of how the amount was calculated, formatted for clarity." }
    },
    required: ["amount", "explanation"],
};

export const calculateStatHolidayPay = async (
    employeeProfile: EmployeeProfile,
    holiday: StatutoryHoliday
): Promise<{ amount: number; explanation: string; }> => {
    const systemInstruction = `You are a Canadian Statutory Holiday Pay expert. Your task is to accurately calculate the statutory holiday pay for an employee based on their province's specific rules.
    Provide the final amount and a clear, step-by-step explanation of the calculation.
    Common rules include:
    - **Ontario**: Total regular wages in the 4 weeks before the holiday week, divided by 20.
    - **BC**: Total wages in the 30 calendar days before the holiday, divided by the number of days worked.
    - **Alberta**: Average daily wage from the 4 weeks immediately preceding the holiday.
    Assume 'regular wages' includes salary and hourly pay but excludes overtime, bonuses, etc., unless provincial law states otherwise.
    `;

    const prompt = `
        Please calculate the statutory holiday pay for ${employeeProfile.name} for the holiday "${holiday.name}" on ${holiday.date}.
        
        **Employee Details:**
        - Province of Employment: ${employeeProfile.province}
        - Pay Type: ${employeeProfile.payType}
        - Annual Salary: $${employeeProfile.annualSalary}
        - Hourly Rate: $${employeeProfile.hourlyRate || 0}
        - Standard Weekly Hours: ${employeeProfile.weeklyHours || 40}

        For the purpose of this calculation, assume the employee's earnings over the relevant preceding period are consistent with their stated salary or hourly rate.
        For example, for a 4-week look-back period, the earnings would be (Annual Salary / 52) * 4.

        Calculate the stat holiday pay according to the rules for **${employeeProfile.province}**.
        Return the final amount and a detailed explanation of the formula used and the steps taken.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: singleValueCalculationSchema,
                temperature: 0,
            },
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error calculating stat holiday pay:", error);
        throw new Error("AI calculation for Statutory Holiday Pay failed.");
    }
};

export const calculateVacationPay = async (
    employeeProfile: EmployeeProfile,
    ytdGross: number,
    hoursToPayOut?: number
): Promise<{ amount: number; explanation: string; }> => {
     const systemInstruction = `You are a Canadian Vacation Pay expert. Your task is to calculate vacation pay based on provincial rules and employee data.
    - The standard vacation pay rate is 4% of gross wages for employees with less than 5 years of service, and 6% for those with 5 or more years. Assume less than 5 years unless stated otherwise.
    - If calculating a payout for a specific number of hours, first determine the employee's effective hourly rate from their salary, then multiply.
    - If calculating total accrued pay, use the YTD gross earnings and the provincial percentage.
    Provide the final amount and a step-by-step explanation.`;

    const prompt = `
        Please perform a vacation pay calculation for ${employeeProfile.name}.

        **Employee Details:**
        - Province of Employment: ${employeeProfile.province}
        - Pay Type: ${employeeProfile.payType}
        - Annual Salary: $${employeeProfile.annualSalary}
        - YTD Gross Pay: $${ytdGross.toFixed(2)}
        - Standard Weekly Hours: ${employeeProfile.weeklyHours || 40}
    
        **Calculation Request:**
        ${hoursToPayOut
            ? `Calculate the vacation payout amount for ${hoursToPayOut} hours.`
            : `Calculate the total accrued vacation pay based on the YTD gross earnings, assuming a 4% accrual rate.`
        }
        
        Return the final amount and a clear explanation of the calculation.
    `;
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: singleValueCalculationSchema,
                temperature: 0,
            },
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error calculating vacation pay:", error);
        throw new Error("AI calculation for Vacation Pay failed.");
    }
};

export const calculateOvertimePay = async (
    employeeProfile: EmployeeProfile,
    totalHours: number
): Promise<{ regularPay: number; overtimePay: number; totalPay: number; explanation: string }> => {
    const overtimeSchema = {
        type: Type.OBJECT,
        properties: {
            regularPay: { type: Type.NUMBER },
            overtimePay: { type: Type.NUMBER },
            totalPay: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
        },
        required: ["regularPay", "overtimePay", "totalPay", "explanation"],
    };

    const systemInstruction = `You are a Canadian Overtime Pay expert. Your task is to calculate the gross pay for an hourly employee, separating regular and overtime pay.
    - Overtime is paid at 1.5 times the regular hourly rate.
    - The overtime threshold varies by province. Assume the following thresholds: ON (44 hrs/wk), BC (40 hrs/wk), AB (44 hrs/wk). Use 44 hours as a default for other provinces.
    - The calculation should clearly separate the earnings from regular hours and overtime hours.
    Provide the breakdown and a step-by-step explanation.`;

    const prompt = `
        Please calculate the gross pay for ${employeeProfile.name}, an hourly employee.

        **Employee Details:**
        - Province of Employment: ${employeeProfile.province}
        - Regular Hourly Rate: $${employeeProfile.hourlyRate?.toFixed(2)}
        
        **Hours Worked:**
        - Total hours for the week: ${totalHours}

        Based on the rules for **${employeeProfile.province}**, calculate the following:
        1. Regular hours and overtime hours.
        2. Pay for regular hours.
        3. Pay for overtime hours (at 1.5x rate).
        4. Total gross pay for the week.

        Return the results in the specified JSON format, including a clear explanation.
    `;
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: overtimeSchema,
                temperature: 0,
            },
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error calculating overtime pay:", error);
        throw new Error("AI calculation for Overtime Pay failed.");
    }
};