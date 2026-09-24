export function FlashMessage({ notice, error }: { notice?: string; error?: string }) {
  if (!notice && !error) return null;
  return <div className={`flash ${error ? "flash-error" : "flash-success"}`} role="status">{error ?? notice}</div>;
}
