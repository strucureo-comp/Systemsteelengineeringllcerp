export type UserRole = 'client' | 'admin';

export type ProjectStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'cancelled';

export type FileType = 'document' | 'voice_note' | 'image' | 'other';

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type PriorityLevel = 'low' | 'medium' | 'high';

export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export type InvoiceStatus =
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type MemberStatus = 'active' | 'inactive';

export type NotificationType = 'project' | 'payment' | 'support' | 'meeting' | 'system';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  attachment_url?: string;
  tax_rate_id?: string;
  currency?: string;
  exchange_rate?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  github_link?: string;
  document_url?: string;
  estimated_cost?: number;
  actual_cost?: number;
  deadline?: string;
  progress_percentage?: number;
  test_asset_url?: string;
  deployment_url?: string; // Kept for backward compatibility or primary link

  // LIVE PREVIEW CONFIG
  live_preview_type?: 'url' | 'image';
  live_preview_url?: string;

  // DYNAMIC TECHNICAL CONFIG
  technical_config?: Array<{
    id: string;
    label: string;
    value: string;
    isLink?: boolean;
    isSecret?: boolean;
    category: 'infra' | 'admin' | 'deploy';
  }>;

  // TICKETS & NOTES
  tickets?: Array<{
    id: string;
    title: string;
    description?: string;
    attachment_url?: string;
    completed: boolean;
    created_at?: string;
  }>;
  notes?: string[];

  // Node-based module data
  labour_data?: unknown;
  inventory_data?: unknown;
  resources_data?: unknown;
  design_data?: unknown;
  expenses_data?: unknown;
  timeline_data?: unknown;

  is_featured?: boolean; // Mark project as featured for portfolio/showcase

  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_type: FileType;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  update_text: string;
  created_by: string;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  project_id?: string;
  client_id: string;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: PriorityLevel;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  support_request_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface MeetingRequest {
  id: string;
  project_id?: string;
  client_id: string;
  requested_date: string;
  duration_minutes: number;
  purpose: string;
  status: MeetingStatus;
  meeting_link?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export type PostingStatus = 'draft' | 'posted' | 'voided';

export interface Invoice {
  id: string;
  project_id?: string; // Made optional
  client_id?: string;  // Made optional
  customer_id?: string; // New
  invoice_number: string;
  amount: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  exchange_rate?: number;
  due_date: string;
  status: InvoiceStatus;
  posting_status: PostingStatus; // New
  description?: string;
  notes?: string;
  payment_qr_url?: string;
  bank_details?: Record<string, any>;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  project?: { title?: string };
  customer?: CustomerAccount; // New
  lines?: InvoiceLine[];
  tax_breakdown?: any;
  terms?: string;

  // Approval workflow
  requires_approval?: boolean;
  approval_role?: string;
  approval_records?: ApprovalRecord[];
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount?: number;
  total_amount: number;
  sort_order: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  monthly_salary: number;
  joined_date: string;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  team_member_id: string;
  amount: number;
  payment_date: string;
  month: string;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  created_at: string;
}



export type QuotationStatus = 'draft' | 'sent' | 'pending_approval' | 'approved' | 'rejected' | 'accepted' | 'expired';

export interface QuotationItem {
  item_code?: string;
  description: string;
  project?: string;
  remarks?: string;
  date_required?: string;
  uom?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ApprovalRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: 'approved' | 'rejected';
  comment?: string;
  timestamp: string;
}

export interface Quotation {
  id: string;
  project_id?: string;
  project_title?: string; // Snapshot or manual
  client_id: string; // Can be empty if manual
  quotation_number: string;
  rev_no?: string;
  rev_date?: string;
  amount: number;
  valid_until: string;
  status: QuotationStatus;
  currency: string;
  description?: string;
  items: QuotationItem[];
  notes?: string;
  terms_and_conditions?: string;

  // Tax Configuration
  tax_mode?: 'auto' | 'manual';
  tax_rate?: number;
  tax_amount?: number;
  manual_tax_adjustment?: number;

  // Approval Workflow
  requires_approval?: boolean;
  approval_role?: string;
  approval_records?: ApprovalRecord[];
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;

  // Manual Client Details (Non-registered)
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  client_address?: string;
  client_city?: string;
  client_country?: string;
  client_tax_id?: string;
  client_is_company?: boolean;
  
  // Shipping and Contact
  contact_person?: string;
  use_custom_ship_to?: boolean;
  ship_to_address?: string;

  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: Record<string, any>;
  updated_at: string;
}

export interface PlanningNote {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'strategy' | 'todo' | 'other';
  created_by: string;
  updated_at: string;
  created_at: string;
}

export type EnquiryStatus = 'new' | 'read' | 'replied' | 'converted';

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

// --- SCM Types (Dynamics 365 Parity) ---

export type ProductType = 'service' | 'goods' | 'digital';

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
  inventory?: InventoryItem[];
  attributes?: ProductAttribute[];
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  type: ProductType;
  category?: string;
  uom: string;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  locations?: Location[];
}

export interface Location {
  id: string;
  warehouse_id: string;
  code: string;
  name?: string;
  type?: string;
  warehouse?: Warehouse;
}

export interface InventoryItem {
  id: string;
  variant_id: string;
  location_id: string;
  quantity: number;
  variant?: ProductVariant;
  location?: Location;
  updated_at: string;
}

export type InventoryMovementType = 'in' | 'out' | 'transfer' | 'adjustment' | 'count';

export interface InventoryTransaction {
  id: string;
  type: InventoryMovementType;
  variant_id: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  reference?: string;
  date: string;
  created_by: string;

  variant?: ProductVariant;
  user?: { full_name: string };
  project?: { title: string };
}

export type EmployeeLifecycleStatus = 'probation' | 'confirmed' | 'notice_period' | 'resigned' | 'terminated' | 'retired';
export type LeaveStatusType = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type HREventType = 'hiring' | 'appraisal' | 'promotion' | 'transfer' | 'warning' | 'layoff' | 'exit';

export interface HRDepartment {
  id: string;
  code: string;
  name: string;
  head_id?: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employees?: Employee[];
  _count?: { employees: number };
}

export interface HRRole {
  id: string;
  code: string;
  title: string;
  grade?: string;
  min_salary?: number;
  max_salary?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: { employees: number };
}

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  role: string;
  skill_type: string;
  employment_type: string;
  department?: string;
  joining_date: string;
  basic_salary: number;
  overtime_rate: number;
  bank_details?: {
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    iban?: string;
    swift_code?: string;
    branch?: string;
  };
  status: 'active' | 'inactive' | 'on-leave' | 'terminated' | 'resigned' | 'separated';
  // Extended
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  marital_status?: string;
  nationality?: string;
  passport_number?: string;
  visa_status?: string;
  address?: string;
  city?: string;
  country?: string;
  emergency_contacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
    is_primary: boolean;
  }>;
  documents?: Array<{
    type: 'passport' | 'visa' | 'id_card' | 'certificate' | 'contract' | 'other';
    document_number?: string;
    issue_date?: string;
    expiry_date?: string;
    issuing_authority?: string;
    file_url?: string;
    notes?: string;
  }>;
  photo_url?: string;
  lifecycle_status?: EmployeeLifecycleStatus;
  confirmation_date?: string;
  resignation_date?: string;
  exit_date?: string;
  exit_reason?: string;
  pf_number?: string;
  esi_number?: string;
  uan_number?: string;
  pan_number?: string;
  aadhar_number?: string;
  department_id?: string;
  hr_role_id?: string;
  dept?: HRDepartment;
  hr_role?: HRRole;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  doc_type: string;
  file_url?: string;
  file_name?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  overtime_hours: number;
  project_id?: string;
  check_in?: string;
  check_out?: string;
  notes?: string;
  employee?: Employee;
  project?: { title: string };
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  days_per_year: number;
  is_paid: boolean;
  carry_forward: boolean;
  max_carry: number;
  is_active: boolean;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason?: string;
  status: LeaveStatusType;
  approved_by?: string;
  approved_at?: string;
  remarks?: string;
  created_at: string;
  employee?: Employee;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  is_active: boolean;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  effective_from: string;
  basic: number;
  hra: number;
  da: number;
  ta: number;
  special_allowance: number;
  pf_employee: number;
  pf_employer: number;
  esi_employee: number;
  esi_employer: number;
  professional_tax: number;
  tds: number;
  gross_salary: number;
  net_salary: number;
  is_current: boolean;
  notes?: string;
  employee?: Employee;
}

export interface LabourAllocation {
  id: string;
  employee_id: string;
  project_id: string;
  start_date: string;
  end_date?: string;
  status: string;
  employee?: Employee;
  project?: { title: string };
}

export interface Payroll {
  id: string;
  month: string;
  status: string;
  total_amount: number;
  total_deductions?: number;
  total_employer_cost?: number;
  posted_to_finance?: boolean;
  finance_journal_id?: string;
  lines?: PayrollLine[];
  
  // Approval workflow fields
  submitted_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface PayrollLine {
  id: string;
  payroll_id: string;
  employee_id: string;
  basic_pay: number;
  hra?: number;
  da?: number;
  ta?: number;
  special_allowance?: number;
  overtime_pay: number;
  gross_pay?: number;
  pf_deduction?: number;
  esi_deduction?: number;
  professional_tax?: number;
  tds?: number;
  deductions?: number;
  net_pay?: number;
  total_pay: number;
  status: string;
  employee?: Employee;
}

export interface HREvent {
  id: string;
  employee_id: string;
  type: HREventType;
  title: string;
  description?: string;
  event_date: string;
  effective_date?: string;
  metadata?: any;
  created_by?: string;
  created_at: string;
  employee?: Employee;
}

export type BankAccountStatus = 'active' | 'frozen' | 'closed';

export interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
  currency: string;
  current_balance: number;
  type: 'current' | 'savings' | 'petty_cash' | 'credit_card';
  gl_bank_account_id?: string;
  gl_cash_account_id?: string;
  gl_clearing_account_id?: string;
  branch?: string;
  opening_balance_date?: string;
  reconciliation_start_date?: string;
  iban_swift?: string;
  status: BankAccountStatus;
  updated_at: string;
  created_at?: string;
}

export type PaymentMethod = 'bank_transfer' | 'cheque' | 'cash' | 'online' | 'card';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  posting_date?: string;
  reference_no?: string;
  linked_document_type?: 'invoice' | 'expense' | 'payroll' | 'transfer' | 'other';
  linked_document_id?: string;
  counterparty?: string; // Vendor / Customer / Employee
  payment_method?: PaymentMethod;
  category?: string;
  tax_handling?: string;
  attachment_url?: string;
  notes?: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: string; // 'draft' | 'posted'
  posting_status?: PostingStatus;
  bank_account?: BankAccount;
  created_at?: string;
  updated_at?: string;
}

export interface BankTransfer {
  id: string;
  source_account_id: string;
  target_account_id: string;
  amount: number;
  date: string;
  reference_no?: string;
  notes?: string;
  transaction_id: string; // Links both sides
  created_at: string;
}

export interface BankReconciliation {
  id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  outstanding_cheques: number;
  deposits_in_transit: number;
  difference: number;
  status: 'draft' | 'reconciled';
  created_at: string;
  updated_at?: string;
  items?: ReconciliationItem[];
}

export interface ReconciliationItem {
  id: string;
  reconciliation_id: string;
  transaction_id: string;
  is_matched: boolean;
  match_type: 'auto' | 'manual';
  amount: number;
  date: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  document_type: string;
  document_id?: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted';
  lines: JournalEntryLine[];
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string; // e.g., 'BankTransaction', 'BankAccount'
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'post';
  user_id: string;
  user_name: string; // Denormalized for quick access
  user_role: string;
  changes?: Record<string, any>;
  created_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company?: string;
  phone?: string;
  status: LeadStatus;
  source?: string;
  potential_value?: number;
  probability?: number;
  notes?: string;
  last_contacted?: string;
  next_follow_up?: string;
  follow_up_notes?: string;
  owner?: { full_name: string; email?: string }; // Added owner
  created_at: string;
  updated_at: string;
}

export interface RFQ {
  id: string;
  rfq_number: string;
  purchase_request_id?: string;
  vendors: string[];
  status: 'draft' | 'sent' | 'received' | 'closed' | 'cancelled';
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
  }>;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

export interface RecurringBill {
  id: string;
  vendor_id: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_bill_date?: string;
  total_amount: number;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  vendor_id?: string;
  vendor?: string;
  description: string;
  amount: number;
  tax_amount?: number;
  total: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  date: string;
  payment_method?: string;
  receipt_url?: string;
  currency: string;
  is_recurring: boolean;
  recurrence_period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  category: string;
  vendor_id?: string;
  vendor?: string;
  description: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface BatchPayment {
  id: string;
  batch_number: string;
  payment_date: string;
  total_amount: number;
  status: 'draft' | 'processed' | 'failed';
  payment_method: string;
  vendor_count: number;
  bill_count: number;
  created_at: string;
}

export type PurchaseStatus = 'pending' | 'approved' | 'ordered' | 'received' | 'billed' | 'paid' | 'cancelled';

export interface PurchaseRequest {
  id: string;
  project_id?: string;
  item_name: string;
  quantity: number;
  unit: string;
  estimated_cost?: number;
  priority: PriorityLevel;
  status: PurchaseStatus;
  requested_by: string;
  needed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  project?: { title: string };
  requester?: { full_name: string };
}

export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_no?: string;
  tax_id?: string; // Alias for vat_no
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  purchase_request_id?: string;
  vendor_id: string;
  total_amount: number;
  status: PurchaseStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  creator?: { full_name: string };
  purchase_request?: PurchaseRequest;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount?: number;
  total_amount: number;
  sort_order: number;
}

export interface GRN {
  id: string;
  grn_number: string;
  purchase_order_id: string;
  received_date: string;
  received_by: string;
  notes?: string;
  created_at: string;
  purchase_order?: PurchaseOrder;
  receiver?: { full_name: string };
}

export interface VendorBill {
  id: string;
  bill_number: string;
  purchase_order_id?: string;
  vendor_id: string;
  amount: number;
  tax_amount?: number;
  total_amount?: number;
  currency?: string;
  due_date: string;
  status: InvoiceStatus;
  posting_status: PostingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  purchase_order?: PurchaseOrder;
  lines?: VendorBillLine[];
  tax_breakdown?: any;
}

export interface VendorBillLine {
  id: string;
  vendor_bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount?: number;
  total_amount: number;
  sort_order: number;
}

export interface VendorPayment {
  id: string;
  vendor_bill_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_no?: string;
  notes?: string;
  created_at: string;
  vendor_bill?: VendorBill;
}

// --- CRM Types (Dynamics 365 Parity) ---

export type OpportunityStage = 'new_lead' | 'contacted' | 'qualified' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note';

export interface CustomerAccount {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  owner?: { full_name: string };
  contacts?: Contact[];
  opportunities?: Opportunity[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  account_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  title?: string;
  account?: CustomerAccount;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Site Visit';
  scheduledAt: string;
  status: 'Pending' | 'Completed' | 'Missed';
  notes: string;
  priority: 'Low' | 'Medium' | 'High';
}

export interface Opportunity {
  id: string;
  // Lead fields (for opportunities that started as leads)
  is_lead?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  // Opportunity fields
  account_id?: string; // Optional now - leads won't have this until converted
  name: string;
  amount: number;
  stage: OpportunityStage;
  probability: number;
  close_date?: string;
  notes?: string;
  owner?: { full_name: string };
  account?: CustomerAccount;
  followUps?: FollowUp[];
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  lead_id?: string;
  account_id?: string;
  contact_id?: string;
  opportunity_id?: string;
  user?: { full_name: string };
  created_at: string;
}

// --- Fixed Assets Types ---

export type AssetStatus = 'active' | 'disposed' | 'written_off';

export interface FixedAsset {
  id: string;
  name: string;
  asset_number: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  accumulated_depreciation: number;
  current_book_value: number;
  last_depreciation_date?: string;
  status: AssetStatus;
  location?: string;
  serial_number?: string;
  asset_account_id: string;
  depreciation_account_id: string;
  expense_account_id: string;
  created_at: string;
  updated_at: string;
  depreciation_schedule?: DepreciationSchedule[];
}

export interface DepreciationSchedule {
  id: string;
  fixed_asset_id: string;
  date: string;
  amount: number;
  is_posted: boolean;
  journal_entry_id?: string;
}

// --- Credit Notes Types ---

export type CreditNoteStatus = 'draft' | 'posted' | 'applied' | 'refunded' | 'voided';

export interface CreditNote {
  id: string;
  number: string;
  customer_id: string;
  invoice_id?: string;
  date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  reason?: string;
  status: CreditNoteStatus;
  posting_status: PostingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; tax_id?: string };
  invoice?: { id: string; invoice_number: string; total_amount: number };
  lines?: CreditNoteLine[];
  applications?: CreditNoteApplication[];
  remaining_amount?: number;
  applied_amount?: number;
}

export interface CreditNoteLine {
  id: string;
  credit_note_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface CreditNoteApplication {
  id: string;
  credit_note_id: string;
  invoice_id: string;
  amount: number;
  date: string;
  invoice?: { id: string; invoice_number: string };
}

// --- Debit Notes Types ---

export type DebitNoteStatus = 'draft' | 'posted' | 'applied' | 'refunded' | 'voided';

export interface DebitNote {
  id: string;
  number: string;
  vendor_id: string;
  vendor_bill_id?: string;
  date: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  reason?: string;
  status: DebitNoteStatus;
  posting_status: PostingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  vendor?: { id: string; name: string; tax_id?: string };
  vendor_bill?: { id: string; bill_number: string; total_amount: number };
  lines?: DebitNoteLine[];
  applications?: DebitNoteApplication[];
  remaining_amount?: number;
  applied_amount?: number;
}

export interface DebitNoteLine {
  id: string;
  debit_note_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  tax_rate_id?: string;
  tax_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface DebitNoteApplication {
  id: string;
  debit_note_id: string;
  vendor_bill_id: string;
  amount: number;
  date: string;
  vendor_bill?: { id: string; bill_number: string };
}

// --- Stock Journal Types ---

export type StockJournalType = 'adjustment' | 'transfer' | 'count' | 'damage' | 'obsolete' | 'revaluation';
export type ValuationMethod = 'fifo' | 'lifo' | 'weighted_average' | 'standard_cost';

export interface StockJournal {
  id: string;
  number: string;
  date: string;
  type: StockJournalType;
  reference?: string;
  reason?: string;
  posting_status: PostingStatus;
  total_value: number;
  valuation_method: ValuationMethod;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: { id: string; full_name: string };
  lines?: StockJournalLine[];
  gl_entries?: StockJournalGLEntry[];
}

export interface StockJournalLine {
  id: string;
  stock_journal_id: string;
  variant_id: string;
  from_location_id?: string;
  to_location_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  lot_number?: string;
  expiry_date?: string;
  notes?: string;
  sort_order: number;
  variant?: {
    id: string;
    sku: string;
    product?: { id: string; name: string };
  };
}

export interface StockJournalGLEntry {
  id: string;
  stock_journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  created_at: string;
  account?: { id: string; code: string; name: string; type: string };
}

