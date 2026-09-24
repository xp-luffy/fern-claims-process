import Link from "next/link";

const navigation = [
  { href: "/", label: "Overview", mark: "O" },
  { href: "/claims", label: "Claims", mark: "C" },
  { href: "/invoices", label: "Invoices", mark: "I" },
  { href: "/statements", label: "Statements", mark: "S" },
  { href: "/companies", label: "Companies", mark: "Co" },
  { href: "/exports", label: "Exports", mark: "E" },
];

function Navigation() {
  return (
    <nav className="nav-list" aria-label="Primary navigation">
      {navigation.map((item) => (
        <Link href={item.href} key={item.href} className="nav-link">
          <span className="nav-mark" aria-hidden="true">{item.mark}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Fern Claims Process home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span><strong>Fern</strong><small>Claims process</small></span>
        </Link>
        <Navigation />
        <div className="sidebar-note">
          <span className="pulse-dot" aria-hidden="true" />
          Demo workspace
          <small>Open read and write access</small>
        </div>
      </aside>
      <div className="mobile-bar">
        <Link href="/" className="brand compact"><span className="brand-mark">F</span><strong>Fern</strong></Link>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu</summary>
          <div className="mobile-menu-panel"><Navigation /></div>
        </details>
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
