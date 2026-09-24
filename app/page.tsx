import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { listClaims } from "@/lib/data/claims";
import { listCompanies } from "@/lib/data/companies";
import { listInvoices } from "@/lib/data/invoices";
import { listStatementItems } from "@/lib/data/statements";
import { formatMoney, formatMonth, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [claims, companies, invoices, statementItems] = await Promise.all([
    listClaims(),
    listCompanies(),
    listInvoices(),
    listStatementItems(),
  ]);
  const activeClaim = claims.find((claim) => claim.status !== "approved") ?? claims[0];
  const matched = invoices.filter((invoice) => invoice.match_status === "matched").length;
  const claimInvoices = activeClaim ? invoices.filter((invoice) => invoice.claim_id === activeClaim.id) : [];
  const activeTotal = claimInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Monthly close"
        title="Claims workspace"
        description="Collect invoices, reconcile card charges, and hand off a review-ready claim pack."
        actions={<Link href="/claims#new-claim" className="button primary">New monthly claim</Link>}
      />

      <section className="metrics" aria-label="Workspace totals">
        <article className="metric-card"><span>Companies</span><strong>{companies.length}</strong><small>claim entities</small></article>
        <article className="metric-card"><span>Open claims</span><strong>{claims.filter((claim) => claim.status !== "approved").length}</strong><small>awaiting completion</small></article>
        <article className="metric-card"><span>Invoices matched</span><strong>{matched}<em>/{invoices.length}</em></strong><small>statement coverage</small></article>
        <article className="metric-card accent"><span>Imported charges</span><strong>{statementItems.length}</strong><small>across all companies</small></article>
      </section>

      <div className="dashboard-grid">
        <section className="panel workflow-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Core workflow</p><h2>Finish this month’s claim</h2></div>
            {activeClaim ? <span className={`status status-${activeClaim.status}`}>{statusLabel(activeClaim.status)}</span> : null}
          </div>
          {activeClaim ? (
            <>
              <div className="claim-focus">
                <div><span className="muted">{activeClaim.company.name}</span><h3>{formatMonth(activeClaim.period_month)}</h3></div>
                <strong>{formatMoney(activeTotal)}</strong>
              </div>
              <ol className="workflow-steps">
                <li className={claimInvoices.length ? "complete" : "current"}><span>1</span><div><strong>Collect invoices</strong><small>{claimInvoices.length} attached</small></div></li>
                <li className={claimInvoices.length && claimInvoices.every((invoice) => invoice.match_status === "matched") ? "complete" : "current"}><span>2</span><div><strong>Reconcile charges</strong><small>{claimInvoices.filter((invoice) => invoice.match_status === "matched").length} of {claimInvoices.length} matched</small></div></li>
                <li className={activeClaim.status !== "draft" ? "complete" : "current"}><span>3</span><div><strong>Generate & submit</strong><small>Summary and claim pack</small></div></li>
              </ol>
              <Link href={`/claims/${activeClaim.id}`} className="button primary wide">Continue {formatMonth(activeClaim.period_month)} claim</Link>
            </>
          ) : (
            <div className="empty-state"><strong>No claims yet</strong><p>Create a monthly claim to start collecting expenses.</p><Link href="/claims#new-claim" className="button primary">Create first claim</Link></div>
          )}
        </section>

        <aside className="panel attention-panel">
          <div className="panel-heading"><div><p className="eyebrow">Attention</p><h2>Reconciliation queue</h2></div></div>
          <div className="attention-list">
            <Link href="/invoices" className="attention-row"><span className="attention-number warning">{invoices.filter((invoice) => invoice.match_status !== "matched").length}</span><div><strong>Unmatched invoices</strong><small>Review match suggestions</small></div><span aria-hidden="true">→</span></Link>
            <Link href="/statements" className="attention-row"><span className="attention-number">{statementItems.filter((item) => !item.matched).length}</span><div><strong>Unmatched charges</strong><small>May need an invoice</small></div><span aria-hidden="true">→</span></Link>
            <Link href="/claims" className="attention-row"><span className="attention-number cool">{claims.filter((claim) => claim.status === "submitted").length}</span><div><strong>Awaiting approval</strong><small>Director sign-off</small></div><span aria-hidden="true">→</span></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
