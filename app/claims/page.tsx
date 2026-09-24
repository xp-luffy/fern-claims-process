import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FlashMessage } from "@/components/flash-message";
import { listClaims } from "@/lib/data/claims";
import { listCompanies } from "@/lib/data/companies";
import { listInvoices } from "@/lib/data/invoices";
import { createClaimAction, deleteClaimAction } from "@/lib/actions/claims";
import { formatMoney, formatMonth, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [{ notice, error }, claims, companies, invoices] = await Promise.all([
    searchParams,
    listClaims(),
    listCompanies(),
    listInvoices(),
  ]);

  return (
    <div className="page">
      <PageHeader eyebrow="Monthly bundles" title="Claims" description="Create one bundle per company and month, then work it through reconciliation and approval." actions={<a href="#new-claim" className="button primary">New claim</a>} />
      <FlashMessage notice={notice} error={error} />
      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">All periods</p><h2>{claims.length} claim{claims.length === 1 ? "" : "s"}</h2></div></div>
          {claims.length ? (
            <div className="claim-list">
              {claims.map((claim) => {
                const attached = invoices.filter((invoice) => invoice.claim_id === claim.id);
                const total = attached.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
                return (
                  <article className="claim-card" key={claim.id}>
                    <div><h3><Link href={`/claims/${claim.id}`}>{claim.company.name} · {formatMonth(claim.period_month)}</Link></h3><p>{attached.length} invoices · {attached.filter((invoice) => invoice.match_status === "matched").length} matched</p></div>
                    <span className={`status status-${claim.status}`}>{statusLabel(claim.status)}</span>
                    <div className="claim-total"><strong>{formatMoney(total)}</strong><small>attached total</small></div>
                    <div className="row-actions">
                      <Link href={`/claims/${claim.id}`} className="button small secondary">Open claim</Link>
                      <form action={deleteClaimAction}>
                        <input type="hidden" name="id" value={claim.id} />
                        <input type="hidden" name="returnTo" value="/claims" />
                        <button className="button small danger" type="submit">Delete</button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <div className="empty-state"><strong>No claims yet</strong><p>Use the form to start the first monthly bundle.</p></div>}
        </section>

        <aside className="panel sticky-panel" id="new-claim">
          <div className="panel-heading"><div><p className="eyebrow">Start a period</p><h2>New monthly claim</h2></div></div>
          {companies.length ? (
            <form action={createClaimAction} className="form-grid">
              <div className="form-field full"><label htmlFor="claim-company">Company</label><select className="select" id="claim-company" name="company_id" required>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></div>
              <div className="form-field full"><label htmlFor="claim-month">Claim month</label><input className="input" id="claim-month" name="period_month" type="month" defaultValue={new Date().toISOString().slice(0, 7)} required /></div>
              <div className="form-field full"><label htmlFor="claim-notes">Notes</label><textarea className="textarea" id="claim-notes" name="notes" placeholder="Purpose, approver context, or month-end notes" /></div>
              <div className="form-actions"><button type="submit" className="button primary wide">Create and add invoices</button></div>
            </form>
          ) : <div className="empty-state"><strong>Add a company first</strong><p>Claims must belong to a company.</p><Link href="/companies" className="button primary">Go to companies</Link></div>}
        </aside>
      </div>
    </div>
  );
}
