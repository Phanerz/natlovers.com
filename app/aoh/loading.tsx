// Deliberately NOT the shared DaisyLoader: /aoh is a separate internal tool
// (Alfa Omega Hardware's pricing calculator) with its own dark, monospace
// visual identity, fully scoped under .aoh-page so the storefront's forest/
// sand language never leaks in here. Imposing the Natlovers-branded daisy
// and botanical background on this tool would be the same kind of leak in
// reverse, so this stays a plain, minimal loading state in the tool's own
// idiom instead.
export default function Loading() {
  return (
    <main className="aoh-page flex min-h-[100dvh] items-center justify-center bg-[#12131a] text-[var(--aoh-ink)]">
      <p className="text-sm tracking-wide opacity-70">Loading...</p>
    </main>
  );
}
