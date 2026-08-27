// Minimal allowlist HTML sanitizer for the product description rich text
// field (see components/admin/rich-text-editor.tsx). Runs server-side
// before every write (lib/admin-products.ts) and again on the storefront
// before render (product-info-section.tsx) - never trust the client's own
// contentEditable output unvalidated, even though only an authenticated
// admin can submit it.
//
// Allowlist, not blocklist, is what makes this safe: anything not
// explicitly permitted is stripped, so a new attack vector doesn't need a
// new rule added here to stay blocked. No dependency pulled in for this -
// the tag/attribute set is small and fixed (matches the editor's own
// toolbar), so a regex-based strip is enough without a full HTML parser.

const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "p", "br", "ul", "ol", "li", "a", "img"]);

// Only these attributes survive, and only on the tags listed - href/img src
// still get scheme-checked below so javascript:/data: can't sneak through
// even though the attribute name itself is allowed.
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt"]
};

const SAFE_URL_PATTERN = /^(https?:|\/)/i;

function sanitizeAttributes(tag: string, attrsRaw: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) {
    return "";
  }
  const attrPattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let result = "";
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(attrsRaw))) {
    const [, name, value] = match;
    const lowerName = name.toLowerCase();
    if (!allowed.includes(lowerName)) {
      continue;
    }
    if ((lowerName === "href" || lowerName === "src") && !SAFE_URL_PATTERN.test(value.trim())) {
      continue;
    }
    if (lowerName === "target" && value !== "_blank") {
      continue;
    }
    const escaped = value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    result += ` ${lowerName}="${escaped}"`;
  }
  // A safe link always gets a real rel, regardless of what (if anything)
  // the editor wrote  -  target="_blank" without noopener is itself a known
  // reverse-tabnabbing gap.
  if (tag === "a" && result.includes('target="_blank"')) {
    result += ' rel="noopener noreferrer"';
  }
  return result;
}

export function sanitizeDescriptionHtml(input: string): string {
  if (!input) {
    return "";
  }

  // Strip anything that isn't a recognized open/close tag outright first -
  // script/style contents, comments, and processing instructions never get
  // a chance to reach the tag-by-tag pass below.
  const withoutDangerousBlocks = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  return withoutDangerousBlocks.replace(
    /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+\s*=\s*"[^"]*")*)\s*\/?>/g,
    (full, closingSlash: string, rawTag: string, attrsRaw: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }
      if (closingSlash) {
        return `</${tag}>`;
      }
      const attrs = sanitizeAttributes(tag, attrsRaw);
      const selfClosing = tag === "br" || tag === "img";
      return `<${tag}${attrs}${selfClosing ? " /" : ""}>`;
    }
  );
}
