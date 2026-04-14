/**
 * UAE WPS (Wages Protection System) Export Service
 * Generates SIF (Salary Information File) compatible with UAE Central Bank requirements
 */

export interface WPSRecord {
  employee_id: string;
  employee_name: string;
  iban: string;
  agent_id: string; // Bank/Exchange house code
  fixed_salary: number;
  variable_salary: number;
  days_off: number;
}

export interface WPSFileHeader {
  employer_id: string; // Establishment ID provided by MOHRE
  bank_code: string;
  file_creation_date: string; // YYYYMMDD
  file_creation_time: string; // HHMM
  salary_month: string; // MMYYYY
  total_salary: number;
  total_records: number;
  currency: string; // Always AED
}

/**
 * Generates a .SIF file content
 */
function getWPSCurrency(): string {
  if (typeof window === 'undefined') {
    return 'AED';
  }

  try {
    const settings = JSON.parse(localStorage.getItem('pdf-settings') || '{}');
    return settings.currency || 'AED';
  } catch {
    return 'AED';
  }
}

export function generateSIFContent(header: WPSFileHeader, records: WPSRecord[]): string {
  const currency = getWPSCurrency();

  // Format Header: EDR,EmployerID,BankCode,FileCreationDate,FileCreationTime,SalaryMonth,TotalSalary,TotalRecords,Currency
  const headerLine = `EDR,${header.employer_id},${header.bank_code},${header.file_creation_date},${header.file_creation_time},${header.salary_month},${currency} ${header.total_salary.toFixed(2)},${header.total_records},${currency}`;

  // Format Records: SCR,EmployeeID,EmployeeName,IBAN,AgentID,FixedSalary,VariableSalary,DaysOff
  const recordLines = records.map(rec => {
    return `SCR,${rec.employee_id},${rec.employee_name},${rec.iban},${rec.agent_id},${currency} ${rec.fixed_salary.toFixed(2)},${currency} ${rec.variable_salary.toFixed(2)},${rec.days_off}`;
  });

  return [headerLine, ...recordLines].join('\n');
}

/**
 * Validates UAE IBAN (starts with AE, 23 characters total)
 */
export function validateUAEIBAN(iban: string): boolean {
  const ibanRegex = /^AE[0-9]{21}$/;
  return ibanRegex.test(iban.replace(/\s/g, ''));
}

/**
 * Calculates UAE End of Service Benefit (EOSB)
 * Based on UAE Labor Law
 */
export function calculateUAE_EOSB(
  basic_salary: number,
  years_of_service: number,
  contract_type: 'limited' | 'unlimited',
  reason: 'resignation' | 'termination'
): number {
  let daily_rate = basic_salary / 30;
  let benefit = 0;

  if (years_of_service < 1) return 0;

  // First 5 years: 21 days per year
  const first5Years = Math.min(5, years_of_service);
  benefit += first5Years * 21 * daily_rate;

  // Beyond 5 years: 30 days per year
  if (years_of_service > 5) {
    const remainingYears = years_of_service - 5;
    benefit += remainingYears * 30 * daily_rate;
  }

  // Limited vs Unlimited resignation rules apply here (simplified for current implementation)
  if (reason === 'resignation' && contract_type === 'unlimited') {
    if (years_of_service >= 1 && years_of_service < 3) benefit *= (1/3);
    else if (years_of_service >= 3 && years_of_service < 5) benefit *= (2/3);
  }

  // Maximum benefit cap: 2 years salary
  return Math.min(benefit, basic_salary * 24);
}
