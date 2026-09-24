import { PageHeader } from "@/components/page-header";
import { FlashMessage } from "@/components/flash-message";
import { listCompanies } from "@/lib/data/companies";
import { listClaims } from "@/lib/data/claims";
import { listInvoices } from "@/lib/data/invoices";
import { createCompanyAction, deleteCompanyAction, updateCompanyAction } from "@/lib/actions/companies";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [{ notice, error }, companies, claims, invoices] = await Promise.all([searchParams, listCompanies(), listClaims(), listInvoices()]);
  return (
    <div className="page">
      <PageHeader eyebrow="Claim entities" title="Companies" description="Keep claims, invoices, and statement imports separated by legal entity." actions={<a href="#add-company" className="button primary">Add company</a>} />
      <FlashMessage notice={notice} error={error} />
      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Directory</p><h2>{companies.length} compan{companies.length === 1 ? "y" : "ies"}</h2></div></div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>Claims</th><th>Invoices</th><th>Edit</th><th aria-label="Delete" /></tr></thead><tbody>
            {companies.map((company) => <tr key={company.id}>
              <td className="table-primary">{company.name}</td><td>{claims.filter((claim) => claim.company_id === company.id).length}</td><td>{invoices.filter((invoice) => invoice.company_id === company.id).length}</td>
              <td><form action={updateCompanyAction} className="inline-form"><input type="hidden" name="id" value={company.id} /><input type="hidden" name="returnTo" value="/companies" /><input aria-label={`Name for ${company.name}`} className="input" name="name" defaultValue={company.name} required /><button className="button small secondary" type="submit">Save</button></form></td>
              <td><form action={deleteCompanyAction}><input type="hidden" name="id" value={company.id} /><input type="hidden" name="returnTo" value="/companies" /><button className="button small danger" type="submit">Delete</button></form></td>
            </tr>)}
          </tbody></table></div>
        </section>
        <aside className="panel sticky-panel" id="add-company">
          <div className="panel-heading"><div><p className="eyebrow">New entity</p><h2>Add company</h2></div></div>
          <form action={createCompanyAction} className="form-grid"><input type="hidden" name="returnTo" value="/companies" /><div className="form-field full"><label htmlFor="company-name">Company name</label><input id="company-name" className="input" name="name" placeholder="e.g. Fern Holdings" required /></div><div className="form-actions"><button className="button primary wide" type="submit">Add company</button></div></form>
        </aside>
      </div>
    </div>
  );
}
