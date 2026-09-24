import Link from "next/link";

export default function NotFound() {
  return <div className="page"><div className="empty-state"><strong>That record was not found</strong><p>It may have been deleted or the link is no longer valid.</p><Link className="button primary" href="/">Return to workspace</Link></div></div>;
}
