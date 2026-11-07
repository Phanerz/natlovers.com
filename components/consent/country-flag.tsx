import {flagSrc} from "@/lib/countries";

// A country flag, served from this site (public/flags). A real picture rather than an emoji,
// because flag emoji shows as two plain letters on Windows.
export function CountryFlag({code, className = ""}: {code: string; className?: string}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagSrc(code)} alt="" width={24} height={18} loading="lazy" decoding="async" draggable={false} className={`nlc-flag ${className}`} />
  );
}
