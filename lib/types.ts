export type ClaimStatus = "draft" | "submitted" | "approved";
export type InvoiceCategory = "software" | "ads" | "office" | "other";
export type InvoiceSource = "manual" | "upload" | "email";
export type MatchStatus = "unmatched" | "matched" | "flagged";

export type Company = {
  id: string;
  name: string;
  created_at: string;
  user_id: string | null;
};

export type Claim = {
  id: string;
  company_id: string;
  period_month: string;
  status: ClaimStatus;
  notes: string | null;
  created_at: string;
  user_id: string | null;
};

export type ClaimWithCompany = Claim & {
  company: Company;
  invoices?: Invoice[];
};

export type Invoice = {
  id: string;
  company_id: string;
  vendor: string;
  amount: number;
  currency: string;
  invoice_date: string;
  category: InvoiceCategory;
  source: InvoiceSource;
  file_path: string | null;
  statement_item_id: string | null;
  match_status: MatchStatus;
  claim_id: string | null;
  created_at: string;
  user_id: string | null;
};

export type InvoiceWithRelations = Invoice & {
  company?: Company;
  claim?: Pick<Claim, "id" | "period_month"> | null;
};

export type StatementItem = {
  id: string;
  company_id: string;
  merchant: string;
  amount: number;
  currency: string;
  transaction_date: string;
  matched_invoice_id: string | null;
  matched: boolean;
  created_at: string;
  user_id: string | null;
};

export type StatementWithCompany = StatementItem & { company?: Company };

export type ExpenditureSummary = {
  id: string;
  claim_id: string;
  total_amount: number;
  category_totals: Record<InvoiceCategory, number>;
  unmatched_count: number;
  variance_notes: string | null;
  narrative: string | null;
  narrative_source: string | null;
  narrative_confidence: number | null;
  narrative_review_status: string;
  created_at: string;
  user_id: string | null;
};

export type ClaimWorkspace = {
  claim: ClaimWithCompany;
  invoices: Invoice[];
  statementItems: StatementItem[];
  summary: ExpenditureSummary | null;
  unassignedInvoices: Invoice[];
};
