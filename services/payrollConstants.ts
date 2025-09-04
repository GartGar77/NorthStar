import { Province } from '../types';

export interface TaxBracket {
  rate: number;
  threshold: number;
}

export const FEDERAL_TAX_BRACKETS_2024: TaxBracket[] = [
  { rate: 0.15, threshold: 0 },
  { rate: 0.205, threshold: 55867 },
  { rate: 0.26, threshold: 111733 },
  { rate: 0.29, threshold: 173205 },
  { rate: 0.33, threshold: 246752 },
];

export const PROVINCIAL_TAX_BRACKETS_2024: { [key in Province]: TaxBracket[] } = {
  [Province.ON]: [
    { rate: 0.0505, threshold: 0 },
    { rate: 0.0915, threshold: 51446 },
    { rate: 0.1116, threshold: 102894 },
    { rate: 0.1216, threshold: 150000 },
    { rate: 0.1316, threshold: 220000 },
  ],
  [Province.QC]: [ // Note: Quebec has its own system (QPP/QPIP) but we include tax brackets for consistency.
    { rate: 0.14, threshold: 0 },
    { rate: 0.19, threshold: 51780 },
    { rate: 0.24, threshold: 103545 },
    { rate: 0.2575, threshold: 126000 },
  ],
  [Province.BC]: [
    { rate: 0.0506, threshold: 0 },
    { rate: 0.077, threshold: 47937 },
    { rate: 0.105, threshold: 95875 },
    { rate: 0.1229, threshold: 110076 },
    { rate: 0.147, threshold: 133664 },
    { rate: 0.168, threshold: 181232 },
    { rate: 0.205, threshold: 252753 },
  ],
  [Province.AB]: [
    { rate: 0.10, threshold: 0 },
    { rate: 0.12, threshold: 148269 },
    { rate: 0.13, threshold: 177922 },
    { rate: 0.14, threshold: 237230 },
    { rate: 0.15, threshold: 355845 },
  ],
  [Province.MB]: [
    { rate: 0.108, threshold: 0 },
    { rate: 0.1275, threshold: 47000 },
    { rate: 0.174, threshold: 100000 },
  ],
  [Province.SK]: [
    { rate: 0.105, threshold: 0 },
    { rate: 0.125, threshold: 52057 },
    { rate: 0.145, threshold: 148734 },
  ],
  [Province.NS]: [
    { rate: 0.0879, threshold: 0 },
    { rate: 0.1495, threshold: 29590 },
    { rate: 0.1667, threshold: 59180 },
    { rate: 0.175, threshold: 93000 },
    { rate: 0.21, threshold: 150000 },
  ],
  [Province.NB]: [
    { rate: 0.094, threshold: 0 },
    { rate: 0.14, threshold: 49958 },
    { rate: 0.16, threshold: 99916 },
    { rate: 0.17, threshold: 184576 },
  ],
  [Province.NL]: [
    { rate: 0.087, threshold: 0 },
    { rate: 0.145, threshold: 43457 },
    { rate: 0.158, threshold: 86914 },
    { rate: 0.178, threshold: 155169 },
    { rate: 0.198, threshold: 217228 },
    { rate: 0.208, threshold: 275870 },
    { rate: 0.213, threshold: 551739 },
    { rate: 0.218, threshold: 1103479 },
  ],
  [Province.PE]: [
    { rate: 0.098, threshold: 0 },
    { rate: 0.138, threshold: 32500 },
    { rate: 0.167, threshold: 65000 },
  ],
};

export const CPP_EI_RATES_2024 = {
    CPP_MAX_PENSIONABLE_EARNINGS: 68500.00,
    CPP_BASIC_EXEMPTION: 3500.00,
    CPP_EMPLOYEE_RATE: 0.0595,
    CPP_MAX_CONTRIBUTION: 3867.50,
    // Note: CPP2 rates for earnings between 68,500 and 73,200 are out of scope for this simplified model but would be added here in a full implementation.

    EI_MAX_INSURABLE_EARNINGS: 63200.00,
    EI_EMPLOYEE_RATE: 0.0166, // National rate, excluding Quebec
    EI_EMPLOYER_MULTIPLIER: 1.4,
    EI_MAX_PREMIUM: 1049.12,

    // Quebec-specific rates
    QPIP_EMPLOYEE_RATE: 0.00494, // Quebec Parental Insurance Plan
    QPP_EMPLOYEE_RATE: 0.064, // Quebec Pension Plan
};
