import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { listClaims } from "@/lib/data/claims";
import { getSummary } from "@/lib/data/summaries";
import { formatMoney, formatMonth, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const claims = await listClaims();
  const summaries = await Promise.all(claims.map((claim) => getSummary(claim.id)));
  return (
    <div className="page">
      <PageHeader eyebrow="Accountant handoff" title="Claim packs" description="Download a structured CSV for reconciliation or a polished PDF for review and filing." />
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Available exports</p><h2>{claims.length} claim{claims.length === 1 ? "" : "s"}</h2></div></div>
        {claims.length ? <div className="claim-list">{claims.map((claim, index) => {
          const summary = summaries[index];
          return <article className="claim-card" key={claim.id}><div><h3>{claim.company.name} · {formatMonth(claim.period_month)}</h3><p>{summary ? `${summary.unmatched_count} unmatched charge${summary.unmatched_count === 1 ? "" : "s"}` : "Generate the summary before final handoff"}</p></div><span className={`status status-${claim.status}`}>{statusLabel(claim.status)}</span><div className="claim-total"><strong>{formatMoney(Number(summary?.total_amount ?? 0))}</strong><small>summary total</small></div><div className="row-actions"><Link href={`/claims/${claim.id}`} className="button small ghost">Review</Link><Link href={`/api/claims/${claim.id}/export/csv`} className="button small secondary">CSV</Link><Link href={`/api/claims/${claim.id}/export/pdf`} className="button small primary">PDF</Link></div></article>;
        })}</div> : <div className="empty-state"><strong>No claims to export</strong><p>Create a monthly claim first.</p><Link href="/claims" className="button primary">Create claim</Link></div>}
      </section>
    </div>
  );
}
