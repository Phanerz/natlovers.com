const fs = require("fs");

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex, 16);
  return {r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255};
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return {h, s: s * 100, l: l * 100};
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const raw = fs.readFileSync(process.argv[2], "utf8");
const lines = raw.split("\n").filter(Boolean);
const rows = [];
for (const line of lines) {
  const m = line.trim().match(/^(\d+)\s+(bg|text|border|from|via|to|ring|divide|placeholder|decoration|outline|fill|stroke|shadow|caret)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\]$/);
  if (!m) continue;
  const [, count, prefix, valueRaw] = m;
  let hex = null, alpha = 1;
  if (valueRaw.startsWith("#")) {
    hex = valueRaw.length === 9 ? valueRaw.slice(0, 7) : valueRaw;
  } else {
    const rgbaMatch = valueRaw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    const [, r, g, b, a] = rgbaMatch;
    hex = hslToHex(...Object.values(rgbToHsl(+r, +g, +b)));
    alpha = a !== undefined ? +a : 1;
  }
  const {r, g, b} = hexToRgb(hex);
  const {h, s, l} = rgbToHsl(r, g, b);
  rows.push({count: +count, prefix, valueRaw, hex, h, s, l, alpha});
}

// ---- dark-mode surface tiers (neutral bg) ----
function surfaceTier(l) {
  if (l < 70) return null; // already dark enough, leave
  if (l < 80) return "#2a2b21";
  if (l < 88) return "#302f25";
  if (l < 95) return "#37352a";
  return "#3e3b2e";
}
function isGreenHue(h) { return h >= 85 && h <= 145; }
function isBlueHue(h) { return h >= 185 && h <= 230; }
function isRoseHue(h) { return h >= 340 || h <= 25; }
function isCreamHue(h) { return h > 25 && h < 60; }

function classifyBg(row) {
  const {h, s, l} = row;
  if (l < 70) return {action: "keep"};
  if (s >= 30 && isGreenHue(h)) return {action: "set", value: hslToHex(h, Math.min(s, 45), 18)};
  if (s >= 20 && isBlueHue(h)) return {action: "set", value: hslToHex(h, Math.min(s, 45), 18)};
  if (s >= 30 && isRoseHue(h) && !isCreamHue(h)) return {action: "set", value: hslToHex(h < 60 ? h : h, Math.min(s, 45), 18)};
  return {action: "set", value: surfaceTier(l)};
}
function classifyBorder(row) {
  const {l} = row;
  if (l < 70) return {action: "keep"};
  return {action: "set", value: "rgba(230,222,199,0.16)"};
}
function neutralTextTier(l) {
  if (l < 25) return "var(--dm-text-primary)";
  if (l < 45) return "var(--dm-text-secondary)";
  return "var(--dm-text-tertiary)";
}
function classifyText(row) {
  const {h, s, l} = row;
  if (s < 20) {
    if (l >= 90) return {action: "keep"};
    return {action: "set", value: neutralTextTier(l)};
  }
  if (l >= 58) return {action: "keep"};
  const targetL = Math.max(60, Math.min(74, 80 - s * 0.28));
  const targetS = Math.max(35, Math.min(s, 70));
  return {action: "set", value: hslToHex(h, targetS, targetL)};
}

const out = [];
for (const row of rows) {
  let result;
  if (row.prefix === "bg" || row.prefix === "from" || row.prefix === "via" || row.prefix === "to") {
    result = classifyBg(row);
  } else if (row.prefix === "border" || row.prefix === "divide" || row.prefix === "ring" || row.prefix === "outline") {
    result = classifyBorder(row);
  } else if (row.prefix === "text" || row.prefix === "fill" || row.prefix === "stroke" || row.prefix === "caret" || row.prefix === "placeholder" || row.prefix === "decoration") {
    result = classifyText(row);
  } else {
    result = {action: "keep"};
  }
  out.push({...row, ...result});
}

out.sort((a, b) => a.prefix.localeCompare(b.prefix) || b.count - a.count);
for (const row of out) {
  const prop = {bg: "background-color", from: "--tw-gradient-from", via: "--tw-gradient-via", to: "--tw-gradient-to",
    border: "border-color", divide: "border-color", ring: "--tw-ring-color", outline: "outline-color",
    text: "color", fill: "fill", stroke: "stroke", caret: "caret-color", placeholder: "color", decoration: "text-decoration-color"}[row.prefix];
  if (row.action === "keep") {
    console.log(`/* keep  */ ${row.prefix}-[${row.valueRaw}]  H:${row.h.toFixed(0)} S:${row.s.toFixed(0)} L:${row.l.toFixed(0)} n=${row.count}`);
  } else {
    console.log(`.dark [class*="${row.prefix}-[${row.valueRaw}]"] { ${prop}: ${row.value}; }  /* was H:${row.h.toFixed(0)} S:${row.s.toFixed(0)} L:${row.l.toFixed(0)} n=${row.count} */`);
  }
}
