import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FlashMessage } from "@/components/flash-message";
import { listInvoices } from "@/lib/data/invoices";
import { listCompanies } from "@/lib/data/companies";
import { listClaims } from "@/lib/data/claims";
import { createInvoiceAction, deleteInvoiceAction, updateInvoiceAction } from "@/lib/actions/invoices";
import { formatDate, formatMoney, formatMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [{ notice, error }, invoices, companies, claims] = await Promise.all([searchParams, listInvoices(), listCompanies(), listClaims()]);
  return (
    <div className="page">
      <PageHeader eyebrow="Source documents" title="Invoices" description="Add, categorise, attach, and maintain every document before reconciliation." actions={<a href="#add-invoice" className="button primary">Add invoice</a>} />
      <FlashMessage notice={notice} error={error} />
      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Invoice register</p><h2>{invoices.length} document{invoices.length === 1 ? "" : "s"}</h2></div></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Vendor</th><th>Company / claim</th><th>Category</th><th>Amount</th><th>Match</th><th aria-label="Actions" /></tr></thead><tbody>
            {invoices.map((invoice) => <tr key={invoice.id}>
              <td><span className="table-primary">{invoice.vendor}</span><span className="table-secondary">{formatDate(invoice.invoice_date)} · {invoice.source}{invoice.file_path ? <> · <Link href={`/api/invoices/${invoice.id}/file`}>file</Link></> : null}</span></td>
              <td><span className="table-primary">{invoice.company?.name}</span><span className="table-secondary">{invoice.claim ? <Link href={`/claims/${invoice.claim.id}`}>{formatMonth(invoice.claim.period_month)}</Link> : "Unassigned"}</span></td>
              <td><span className="status status-neutral">{invoice.category}</span></td><td className="numeric"><strong>{formatMoney(Number(invoice.amount), invoice.currency)}</strong></td><td><span className={`status status-${invoice.match_status}`}>{invoice.match_status}</span></td>
              <td><div className="row-actions"><details><summary className="button small ghost">Edit</summary><form action={updateInvoiceAction} className="form-grid" style={{ marginTop: 10, minWidth: 330 }}><input type="hidden" name="id" value={invoice.id} /><input type="hidden" name="returnTo" value="/invoices" /><div className="form-field"><label>Vendor</label><input className="input" name="vendor" defaultValue={invoice.vendor} required /></div><div className="form-field"><label>Amount</label><input className="input" name="amount" type="number" step="0.01" defaultValue={invoice.amount} required /></div><div className="form-field"><label>Currency</label><input className="input" name="currency" defaultValue={invoice.currency} required /></div><div className="form-field"><label>Date</label><input className="input" name="invoice_date" type="date" defaultValue={invoice.invoice_date} required /></div><div className="form-field full"><label>Category</label><select className="select" name="category" defaultValue={invoice.category}><option value="software">Software</option><option value="ads">Ads</option><option value="office">Office</option><option value="other">Other</option></select></div><div className="form-actions"><button className="button small secondary" type="submit">Save changes</button></div></form></details><form action={deleteInvoiceAction}><input type="hidden" name="id" value={invoice.id} /><input type="hidden" name="returnTo" value="/invoices" /><button className="button small danger" type="submit">Delete</button></form></div></td>
            </tr>)}
          </tbody></table></div>
        </section>
        <aside className="panel sticky-panel" id="add-invoice">
          <div className="panel-heading"><div><p className="eyebrow">New source</p><h2>Add invoice</h2></div></div>
          <form action={createInvoiceAction} className="form-grid">
            <input type="hidden" name="returnTo" value="/invoices" />
            <div className="form-field full"><label>Company</label><select className="select" name="company_id" required>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
            <div className="form-field full"><label>Claim (optional)</label><select className="select" name="claim_id" defaultValue=""><option value="">Leave unassigned</option>{claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.company.name} · {formatMonth(claim.period_month)}</option>)}</select></div>
            <div className="form-field full"><label>Vendor</label><input className="input" name="vendor" required /></div><div className="form-field"><label>Amount</label><input className="input" name="amount" type="number" min="0" step="0.01" required /></div><div className="form-field"><label>Currency</label><input className="input" name="currency" defaultValue="USD" required /></div><div className="form-field"><label>Date</label><input className="input" name="invoice_date" type="date" required /></div><div className="form-field"><label>Category</label><select className="select" name="category" defaultValue="auto"><option value="auto">Auto</option><option value="software">Software</option><option value="ads">Ads</option><option value="office">Office</option><option value="other">Other</option></select></div><div className="form-field full"><label>File</label><input className="input" type="file" name="invoice_file" accept="application/pdf,image/png,image/jpeg" /></div><div className="form-actions"><button className="button primary wide" type="submit">Add invoice</button></div>
          </form>
        </aside>
      </div>
    </div>
  );
}
