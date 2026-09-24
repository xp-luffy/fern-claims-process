"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page"><div className="empty-state"><strong>We could not load this workspace</strong><p>Check the connection and try the request again.</p><button className="button primary" onClick={() => reset()}>Try again</button></div></div>;
}
