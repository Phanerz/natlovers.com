// Product descriptions are stored as (sanitised) rich-text HTML, but some
// places  -  the shopping bag, the search results  -  show a short readable
// line. This turns that HTML into plain text for display, without a DOM so it
// works on the server and in the browser alike.
//
// The result is only ever rendered as a React text node (which escapes it), so
// this is about readability, not security: it removes tags, turns block
// boundaries into spaces and decodes the handful of entities the editor emits.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…"
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function htmlToPlainText(html: string | null | undefined, options: {firstParagraph?: boolean} = {}): string {
  if (!html) {
    return "";
  }

  let source = html;
  if (options.firstParagraph) {
    // The text up to the end of the first non-empty paragraph / block.
    const blocks = source.split(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/i);
    source = blocks.find((block) => block.replace(/<[^>]*>/g, "").trim() !== "") ?? source;
  }

  let text = source
    // Block boundaries become a space so words never run together.
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, " ")
    .replace(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, " ");

  // Strip tags; repeat until stable so nested/malformed markup like "<<b>b>"
  // can't leave a tag behind.
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, "");
  } while (text !== previous);

  return decodeEntities(text).replace(/\s+/g, " ").trim();
}
