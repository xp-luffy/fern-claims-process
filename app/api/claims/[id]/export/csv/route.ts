import { getClaimWorkspace } from "@/lib/data/claims";
import { claimCsv } from "@/lib/export/csv";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getClaimWorkspace(id);
  if (!workspace) return Response.json({ error: "Claim not found" }, { status: 404 });
  const filename = `${workspace.claim.company.name}-${workspace.claim.period_month}-claim.csv`
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-");
  return new Response(`\uFEFF${claimCsv(workspace)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
