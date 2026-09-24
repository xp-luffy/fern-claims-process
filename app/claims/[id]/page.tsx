import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/flash-message";
import { getClaimWorkspace } from "@/lib/data/claims";
import { createInvoiceAction, attachInvoiceAction, deleteInvoiceAction } from "@/lib/actions/invoices";
import { importStatementAction } from "@/lib/actions/statements";
import { autoMatchClaimAction, matchInvoiceAction, unmatchInvoiceAction } from "@/lib/actions/matching";
import { generateSummaryAction } from "@/lib/actions/summaries";
import { updateClaimStatusAction } from "@/lib/actions/claims";
import { bestMatch } from "@/lib/matching";
import { formatDate, formatMoney, formatMonth, statusLabel } from "@/lib/utils";
import type { InvoiceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [{ id }, { notice, error }] = await Promise.all([params, searchParams]);
  const workspace = await getClaimWorkspace(id);
  if (!workspace) notFound();
  const { claim, invoices, statementItems, summary, unassignedInvoices } = workspace;
  const returnTo = `/claims/${id}`;
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const matchedCount = invoices.filter((invoice) => invoice.match_status === "matched").length;
  const unmatchedItems = statementItems.filter((item) => !item.matched);

  return (
    <div className="page">
      <section className="detail-header">
        <div><p className="eyebrow">{claim.company.name}</p><h1>{formatMonth(claim.period_month)} claim</h1><p>{claim.notes || "Monthly expenditure claim"} · <span className={`status status-${claim.status}`}>{statusLabel(claim.status)}</span></p></div>
        <div className="detail-header-actions">
          <Link href={`/api/claims/${id}/export/csv`} className="button ghost">Export CSV</Link>
          <Link href={`/api/claims/${id}/export/pdf`} className="button ghost">Export PDF</Link>
          {claim.status === "draft" ? <form action={updateClaimStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="submitted" /><input type="hidden" name="returnTo" value={returnTo} /><button className="button primary" type="submit">Submit for approval</button></form> : null}
          {claim.status === "submitted" ? <form action={updateClaimStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="approved" /><input type="hidden" name="returnTo" value={returnTo} /><button className="button primary" type="submit">Approve claim</button></form> : null}
          {claim.status === "approved" ? <form action={updateClaimStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="draft" /><input type="hidden" name="returnTo" value={returnTo} /><button className="button ghost" type="submit">Reopen as draft</button></form> : null}
        </div>
      </section>
      <div className="detail-metrics">
        <div className="detail-metric"><span>Claim total</span><strong>{formatMoney(total)}</strong></div>
        <div className="detail-metric"><span>Invoices</span><strong>{invoices.length}</strong></div>
        <div className="detail-metric"><span>Reconciled</span><strong>{matchedCount}/{invoices.length}</strong></div>
        <div className="detail-metric"><span>Unmatched charges</span><strong>{unmatchedItems.length}</strong></div>
      </div>
      <div style={{ marginTop: 28 }}><FlashMessage notice={notice} error={error} /></div>

      <div className="section-stack">
        <section className="panel">
          <div className="panel-heading">
            <div className="section-title"><span className="section-number">1</span><div><h2>Collect invoices</h2><p>Add a manual entry or attach a PDF/image. Vendor rules can categorise it automatically.</p></div></div>
          </div>
          <form action={createInvoiceAction} className="form-grid three">
            <input type="hidden" name="company_id" value={claim.company_id} /><input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} />
            <div className="form-field"><label htmlFor="vendor">Vendor</label><input id="vendor" className="input" name="vendor" placeholder="e.g. Microsoft" required /></div>
            <div className="form-field"><label htmlFor="amount">Amount</label><input id="amount" className="input" name="amount" type="number" min="0" step="0.01" placeholder="0.00" required /></div>
            <div className="form-field"><label htmlFor="currency">Currency</label><input id="currency" className="input" name="currency" defaultValue="USD" pattern="[A-Za-z]{3}" required /></div>
            <div className="form-field"><label htmlFor="invoice-date">Invoice date</label><input id="invoice-date" className="input" name="invoice_date" type="date" required /></div>
            <div className="form-field"><label htmlFor="category">Category</label><select id="category" className="select" name="category" defaultValue="auto"><option value="auto">Auto-categorise</option><option value="software">Software</option><option value="ads">Ads</option><option value="office">Office</option><option value="other">Other</option></select></div>
            <div className="form-field"><label htmlFor="invoice-file">Invoice file</label><input id="invoice-file" className="input" name="invoice_file" type="file" accept="application/pdf,image/png,image/jpeg" /><small className="help-text">Optional · PDF, PNG, or JPEG · 10 MB max</small></div>
            <div className="form-actions"><button className="button primary" type="submit">Add invoice</button></div>
          </form>

          {unassignedInvoices.length ? (
            <form action={attachInvoiceAction} className="inline-form" style={{ marginTop: 18 }}>
              <input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} />
              <label className="field-label" htmlFor="existing-invoice">Or attach existing</label>
              <select id="existing-invoice" className="select" name="invoice_id">{unassignedInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.vendor} · {formatMoney(Number(invoice.amount), invoice.currency)}</option>)}</select>
              <button className="button small secondary" type="submit">Attach</button>
            </form>
          ) : null}

          <div className="table-wrap" style={{ marginTop: 20 }}>
            <table className="data-table"><thead><tr><th>Invoice</th><th>Category</th><th>Source</th><th>Amount</th><th>Match</th><th aria-label="Actions" /></tr></thead>
              <tbody>{invoices.length ? invoices.map((invoice) => {
                const linkedItem = statementItems.find((item) => item.id === invoice.statement_item_id);
                return <tr key={invoice.id}>
                  <td><span className="table-primary">{invoice.vendor}</span><span className="table-secondary">{formatDate(invoice.invoice_date)}{invoice.file_path ? <> · <Link href={`/api/invoices/${invoice.id}/file`} className="muted">View file</Link></> : null}</span></td>
                  <td><span className="status status-neutral">{invoice.category}</span></td><td>{invoice.source}</td><td className="numeric"><strong>{formatMoney(Number(invoice.amount), invoice.currency)}</strong></td>
                  <td>{linkedItem ? <><span className="status status-matched">Matched</span><span className="table-secondary">{linkedItem.merchant}</span></> : <span className={`status status-${invoice.match_status}`}>{invoice.match_status}</span>}</td>
                  <td><div className="row-actions"><form action={deleteInvoiceAction}><input type="hidden" name="id" value={invoice.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button small danger" type="submit">Delete</button></form></div></td>
                </tr>;
              }) : <tr><td colSpan={6}><div className="empty-state"><strong>No invoices attached</strong><p>Add the first invoice above.</p></div></td></tr>}</tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div className="section-title"><span className="section-number">2</span><div><h2>Import card statement</h2><p>Paste a CSV or choose a file. Headers: merchant, amount, date, currency.</p></div></div></div>
          <form action={importStatementAction} className="form-grid">
            <input type="hidden" name="company_id" value={claim.company_id} /><input type="hidden" name="returnTo" value={returnTo} />
            <div className="form-field"><label htmlFor="statement-file">CSV file</label><input id="statement-file" className="input" type="file" name="statement_file" accept=".csv,text/csv" /></div>
            <div className="form-field"><span className="field-label">Expected format</span><pre className="csv-example">merchant,amount,date,currency{"\n"}Microsoft,320.00,2024-10-03,USD</pre></div>
            <div className="form-field full"><label htmlFor="csv">Or paste CSV</label><textarea id="csv" className="textarea" name="csv" placeholder="merchant,amount,date,currency" /></div>
            <div className="form-actions"><button className="button primary" type="submit">Import statement items</button></div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div className="section-title"><span className="section-number">3</span><div><h2>Reconcile invoices</h2><p>Suggestions score exact amount, date proximity, and vendor overlap. Confirm before records are linked.</p></div></div>
            <form action={autoMatchClaimAction}><input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button secondary" type="submit">Confirm all 80+ matches</button></form>
          </div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Invoice</th><th>Best suggestion</th><th>Score</th><th>Confirm match</th></tr></thead><tbody>
            {invoices.length ? invoices.map((invoice) => {
              const current = statementItems.find((item) => item.id === invoice.statement_item_id);
              const suggestion = current ? null : bestMatch(invoice, unmatchedItems);
              return <tr key={invoice.id}><td><span className="table-primary">{invoice.vendor}</span><span className="table-secondary">{formatMoney(Number(invoice.amount), invoice.currency)}</span></td>
                <td>{current ? <><span className="table-primary">{current.merchant}</span><span className="table-secondary">{formatDate(current.transaction_date)}</span></> : suggestion ? <><span className="table-primary">{suggestion.item.merchant}</span><span className="table-secondary">{formatDate(suggestion.item.transaction_date)} · {formatMoney(Number(suggestion.item.amount), suggestion.item.currency)}</span></> : <span className="muted">No candidate</span>}</td>
                <td>{current ? <span className="status status-matched">Confirmed</span> : suggestion ? <span className="score">{suggestion.score}</span> : "—"}</td>
                <td>{current ? <form action={unmatchInvoiceAction}><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button small ghost" type="submit">Remove match</button></form> : unmatchedItems.length ? <form action={matchInvoiceAction} className="inline-form"><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} /><select aria-label={`Statement item for ${invoice.vendor}`} className="select match-suggestion" name="statement_item_id" defaultValue={suggestion?.item.id}>{unmatchedItems.map((item) => <option key={item.id} value={item.id}>{item.merchant} · {formatMoney(Number(item.amount), item.currency)}</option>)}</select><button className="button small primary" type="submit">Confirm</button></form> : <span className="muted tiny">Import unmatched statement items</span>}</td>
              </tr>;
            }) : <tr><td colSpan={4}><div className="empty-state"><strong>Add invoices first</strong></div></td></tr>}
          </tbody></table></div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div className="section-title"><span className="section-number">4</span><div><h2>Executive summary & claim pack</h2><p>Recalculate category totals and surface every unmatched card charge before export.</p></div></div><form action={generateSummaryAction}><input type="hidden" name="claim_id" value={id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button primary" type="submit">Generate summary</button></form></div>
          {summary ? <>
            <div className="summary-grid">{(["software", "ads", "office", "other"] as InvoiceCategory[]).map((category) => <div className="summary-item" key={category}><span>{category}</span><strong>{formatMoney(Number(summary.category_totals?.[category] ?? 0))}</strong></div>)}</div>
            <div className="summary-total"><span>Total expenditure</span><strong>{formatMoney(Number(summary.total_amount))}</strong></div>
            <p className="variance-note"><strong>{summary.unmatched_count} unmatched charge{summary.unmatched_count === 1 ? "" : "s"}.</strong> {summary.variance_notes}</p>
            <div className="form-actions"><Link className="button secondary" href={`/api/claims/${id}/export/csv`}>Download CSV</Link><Link className="button secondary" href={`/api/claims/${id}/export/pdf`}>Download PDF claim pack</Link></div>
          </> : <div className="empty-state"><strong>No generated summary yet</strong><p>Generate it after invoices and statement items are reconciled.</p></div>}
        </section>
      </div>
    </div>
  );
}
