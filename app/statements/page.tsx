import { PageHeader } from "@/components/page-header";
import { FlashMessage } from "@/components/flash-message";
import { listStatementItems } from "@/lib/data/statements";
import { listCompanies } from "@/lib/data/companies";
import { deleteStatementItemAction, importStatementAction, updateStatementItemAction } from "@/lib/actions/statements";
import { formatDate, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [{ notice, error }, items, companies] = await Promise.all([searchParams, listStatementItems(), listCompanies()]);
  return (
    <div className="page">
      <PageHeader eyebrow="Card reconciliation" title="Statements" description="Import statement lines, correct messy merchant data, and track reconciliation status." actions={<a href="#import-statement" className="button primary">Import CSV</a>} />
      <FlashMessage notice={notice} error={error} />
      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Imported charges</p><h2>{items.length} statement item{items.length === 1 ? "" : "s"}</h2></div></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Merchant</th><th>Company</th><th>Date</th><th>Amount</th><th>Status</th><th aria-label="Actions" /></tr></thead><tbody>
            {items.map((item) => <tr key={item.id}><td className="table-primary">{item.merchant}</td><td>{item.company?.name}</td><td>{formatDate(item.transaction_date)}</td><td className="numeric"><strong>{formatMoney(Number(item.amount), item.currency)}</strong></td><td><span className={`status status-${item.matched ? "matched" : "unmatched"}`}>{item.matched ? "Matched" : "Unmatched"}</span></td><td><div className="row-actions"><details><summary className="button small ghost">Edit</summary><form action={updateStatementItemAction} className="form-grid" style={{ marginTop: 10, minWidth: 330 }}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="returnTo" value="/statements" /><div className="form-field full"><label>Merchant</label><input className="input" name="merchant" defaultValue={item.merchant} required /></div><div className="form-field"><label>Amount</label><input className="input" name="amount" type="number" step="0.01" defaultValue={item.amount} required /></div><div className="form-field"><label>Currency</label><input className="input" name="currency" defaultValue={item.currency} required /></div><div className="form-field full"><label>Date</label><input className="input" name="transaction_date" type="date" defaultValue={item.transaction_date} required /></div><div className="form-actions"><button className="button small secondary" type="submit">Save changes</button></div></form></details><form action={deleteStatementItemAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="returnTo" value="/statements" /><button className="button small danger" type="submit">Delete</button></form></div></td></tr>)}
          </tbody></table></div>
        </section>
        <aside className="panel sticky-panel" id="import-statement">
          <div className="panel-heading"><div><p className="eyebrow">New import</p><h2>Paste or upload CSV</h2></div></div>
          <form action={importStatementAction} className="form-grid">
            <input type="hidden" name="returnTo" value="/statements" />
            <div className="form-field full"><label>Company</label><select className="select" name="company_id" required>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
            <div className="form-field full"><label>CSV file</label><input className="input" type="file" name="statement_file" accept=".csv,text/csv" /></div>
            <div className="form-field full"><label>Or paste rows</label><textarea className="textarea" name="csv" placeholder={"merchant,amount,date,currency\nMicrosoft,320.00,2024-10-03,USD"} /></div>
            <div className="form-field full"><pre className="csv-example">merchant,amount,date,currency{"\n"}Microsoft,320.00,2024-10-03,USD</pre></div>
            <div className="form-actions"><button className="button primary wide" type="submit">Import statement</button></div>
          </form>
        </aside>
      </div>
    </div>
  );
}
