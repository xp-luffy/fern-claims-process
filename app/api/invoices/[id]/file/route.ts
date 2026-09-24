import { createInvoiceFileUrl, getInvoice } from "@/lib/data/invoices";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice?.file_path) return Response.json({ error: "Invoice file not found" }, { status: 404 });
  const signedUrl = await createInvoiceFileUrl(invoice.file_path);
  return Response.redirect(new URL(signedUrl, request.url));
}
