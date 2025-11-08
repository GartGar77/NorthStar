
import { GoogleGenAI } from "@google/genai";
import type { Employee, Paystub, EmployeeProfile, EmployeeGarnishment, GarnishmentConfiguration, PaystubItem, EarningCode, DeductionCode, EmployeeDeduction, StatutoryHoliday } from '../types';
import { DeductionType, Province } from '../types';
import { FEDERAL_TAX_BRACKETS_2024, PROVINCIAL_TAX_BRACKETS_2024, CPP_EI_RATES_2024 } from './payrollConstants';

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY! });
