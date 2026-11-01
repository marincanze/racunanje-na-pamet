"use strict";
// Računanje na pamet – kratek dnevni trening.
// Vsi podatki so lokalno v brskalniku (localStorage), aplikacija deluje brez povezave.

const STORE_KEY = "racunanje-v1";
const OLD_KEY = "glavca-v1"; // prejšnje ime aplikacije
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuf = (arr) => (Math.random() < 0.5 ? arr : arr.slice().reverse());
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const r4 = (x) => Math.round(x * 10000) / 10000;
const fmt = (x) => String(r4(x)).replace(".", ",").replace("-", "−");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// naključno decimalno število brez ničle na zadnjem mestu
function dec(min, max, places) {
  const f = 10 ** places;
  let v;
  do v = rnd(Math.ceil(min * f), Math.floor(max * f)); while (v % 10 === 0);
  return v / f;
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
function fmtDate(key) {
  const [, m, d] = key.split("-").map(Number);
  return `${d}. ${m}.`;
}

// ---------------------------------------------------------------- naloge

const OPS = {
  add: { name: "Seštevanje", sym: "+", color: "var(--op-add)" },
  sub: { name: "Odštevanje", sym: "−", color: "var(--op-sub)" },
  mul: { name: "Množenje", sym: "×", color: "var(--op-mul)" },
  div: { name: "Deljenje", sym: "÷", color: "var(--op-div)" },
  pct: { name: "Procenti", sym: "%", color: "var(--op-pct)" },
};
const OP_KEYS = Object.keys(OPS);

// Stopnje težavnosti: d = opis, t = ciljni čas v sekundah, g = generator [a, b, vrsta]
const LEVELS = {
  add: [
    { d: "enomestna, vsota do 10", t: 3, g: () => { const a = rnd(1, 9); return [a, rnd(1, Math.max(1, 10 - a))]; } },
    { d: "enomestna s prehodom čez 10", t: 3.5, g: () => { const a = rnd(2, 9); return [a, rnd(11 - a, 9)]; } },
    { d: "dvomestno + enomestno", t: 4, g: () => [rnd(11, 89), rnd(2, 9)] },
    { d: "dvomestno + dvomestno brez prehoda", t: 5, g: () => { let a, b; do { a = rnd(11, 88); b = rnd(11, 88); } while ((a % 10) + (b % 10) >= 10 || a + b >= 100); return [a, b]; } },
    { d: "dvomestno + dvomestno s prehodom", t: 6, g: () => { let a, b; do { a = rnd(12, 89); b = rnd(12, 89); } while ((a % 10) + (b % 10) < 10); return [a, b]; } },
    { d: "trimestno + dvomestno", t: 7, g: () => [rnd(101, 989), rnd(12, 99)] },
    { d: "trimestno + trimestno", t: 9, g: () => [rnd(101, 899), rnd(101, 899)] },
    { d: "štirimestno + trimestno", t: 11, g: () => [rnd(1001, 8999), rnd(101, 999)] },
    { d: "decimalna števila (1 decimalka)", t: 10, g: () => [dec(1, 99.9, 1), dec(1, 99.9, 1)] },
    { d: "štirimestno + štirimestno", t: 13, g: () => [rnd(1001, 4999), rnd(1001, 4999)] },
    { d: "decimalna števila (2 decimalki)", t: 14, g: () => [dec(1, 99.99, 2), dec(1, 99.99, 2)] },
  ],
  sub: [
    { d: "do 10", t: 3, g: () => { const a = rnd(3, 10); return [a, rnd(1, a - 1)]; } },
    { d: "prehod čez 10 (npr. 13 − 5)", t: 4, g: () => { const a = rnd(11, 18); return [a, rnd((a % 10) + 1, 9)]; } },
    { d: "dvomestno − enomestno", t: 4.5, g: () => [rnd(21, 99), rnd(2, 9)] },
    { d: "dvomestno − dvomestno brez prehoda", t: 5, g: () => { let a, b; do { a = rnd(25, 99); b = rnd(11, a - 10); } while (a % 10 < b % 10); return [a, b]; } },
    { d: "dvomestno − dvomestno s prehodom", t: 6, g: () => { let a, b; do { a = rnd(30, 99); b = rnd(12, a - 5); } while (a % 10 >= b % 10); return [a, b]; } },
    { d: "trimestno − dvomestno", t: 7, g: () => [rnd(110, 999), rnd(12, 99)] },
    { d: "trimestno − trimestno", t: 9, g: () => { const a = rnd(300, 999); return [a, rnd(101, a - 20)]; } },
    { d: "z negativnim rezultatom", t: 7, g: () => { const a = rnd(12, 99); return [a, rnd(a + 5, a + 120)]; } },
    { d: "štirimestno − trimestno", t: 11, g: () => [rnd(1001, 9999), rnd(101, 999)] },
    { d: "decimalna števila", t: 11, g: () => { const a = dec(10, 99.9, 1); return [a, dec(1, a - 0.5, 1)]; } },
    { d: "štirimestno − štirimestno", t: 13, g: () => { const a = rnd(3000, 9999); return [a, rnd(1001, a - 100)]; } },
  ],
  mul: [
    { d: "poštevanka z 2, 5 in 10", t: 3, g: () => shuf([pick([2, 5, 10]), rnd(1, 10)]) },
    { d: "poštevanka do 5", t: 3.5, g: () => shuf([rnd(2, 5), rnd(2, 10)]) },
    { d: "cela poštevanka (6–9)", t: 4, g: () => { let a, b; do { a = rnd(2, 9); b = rnd(2, 9); } while (a < 6 && b < 6); return [a, b]; } },
    { d: "poštevanka do 12", t: 5, g: () => shuf([pick([11, 12]), rnd(2, 12)]) },
    { d: "dvomestno × enomestno (do 30)", t: 6, g: () => [rnd(13, 30), rnd(3, 9)] },
    { d: "dvomestno × enomestno", t: 8, g: () => [rnd(31, 99), rnd(3, 9)] },
    { d: "triki: ×11, ×15, ×25, ×desetice", t: 8, g: () => [rnd(12, 99), pick([11, 15, 20, 25, 30, 40, 50])] },
    { d: "najstniška števila (npr. 13 × 17)", t: 10, g: () => [rnd(11, 19), rnd(11, 19)] },
    { d: "trimestno × enomestno", t: 12, g: () => [rnd(101, 999), rnd(3, 9)] },
    { d: "decimalke × enomestno", t: 10, g: () => [dec(0.2, 9.9, 1), rnd(3, 9)] },
    { d: "dvomestno × dvomestno", t: 18, g: () => [rnd(21, 99), rnd(21, 99)] },
  ],
  div: [
    { d: "deljenje z 2, 5 in 10", t: 3, g: () => { const d = pick([2, 5, 10]); return [d * rnd(1, 10), d]; } },
    { d: "deljenje do 5", t: 3.5, g: () => { const d = rnd(2, 5); return [d * rnd(2, 10), d]; } },
    { d: "cela poštevanka", t: 4.5, g: () => { const d = rnd(3, 9); return [d * rnd(3, 9), d]; } },
    { d: "do 12 × 12", t: 5.5, g: () => { const [d, q] = shuf([pick([11, 12]), rnd(2, 12)]); return [d * q, d]; } },
    { d: "dvomestno ÷ enomestno", t: 6, g: () => { const d = rnd(2, 9); return [d * rnd(11, Math.floor(99 / d)), d]; } },
    { d: "trimestno ÷ enomestno", t: 8, g: () => { const d = rnd(3, 9); return [d * rnd(Math.ceil(100 / d), 99), d]; } },
    { d: "triki: ÷15, ÷20, ÷25, ÷50", t: 8, g: () => { const d = pick([15, 20, 25, 50]); return [d * rnd(3, 30), d]; } },
    { d: "deljenje z dvomestnim (11–19)", t: 10, g: () => { const d = rnd(11, 19); return [d * rnd(3, 19), d]; } },
    { d: "decimalni rezultat", t: 9, g: () => { const d = pick([2, 4, 5, 8]); let n; do n = rnd(11, 99); while (n % d === 0); return [n, d]; } },
    { d: "štirimestno ÷ enomestno", t: 13, g: () => { const d = rnd(3, 9); return [d * rnd(Math.ceil(1000 / d), 999), d]; } },
  ],
  pct: [
    { d: "10 % in 50 %", t: 5, g: () => [pick([10, 50]), rnd(2, 60) * 10, "of"] },
    { d: "25 %, 20 % in 1 %", t: 6, g: () => { const p = pick([25, 20, 1]); return [p, p === 25 ? rnd(2, 50) * 4 : p === 20 ? rnd(2, 50) * 5 : rnd(2, 40) * 100, "of"]; } },
    { d: "5 %, 15 %, 30 %, 75 %", t: 7, g: () => [pick([5, 15, 30, 40, 75]), rnd(2, 30) * 20, "of"] },
    { d: "poljubni večkratniki 5 %", t: 8, g: () => [rnd(1, 19) * 5, rnd(2, 40) * 20, "of"] },
    { d: "koliko % je …", t: 9, g: () => { const b = pick([20, 25, 40, 50, 80, 200, 250, 400, 500]); let p; do p = rnd(1, 19) * 5; while ((p * b) % 100); return [(p * b) / 100, b, "what"]; } },
    { d: "povečanje in zmanjšanje za %", t: 10, g: () => [pick([5, 10, 15, 20, 25, 30, 40, 50]), rnd(2, 40) * 20, pick(["inc", "dec"])] },
    { d: "poljubni % od stotic", t: 11, g: () => [rnd(2, 99), rnd(1, 9) * 100, "of"] },
    { d: "zahtevni procenti", t: 14, g: () => [rnd(2, 49), rnd(12, 99), "of"] },
  ],
};
const maxLevel = (op) => LEVELS[op].length;

function makeProblem(op, a, b, kind, lvl) {
  const p = { op, a, b, kind: kind || null, lvl };
  if (op === "add") { p.text = `${fmt(a)} + ${fmt(b)}`; p.ans = r4(a + b); }
  if (op === "sub") { p.text = `${fmt(a)} − ${fmt(b)}`; p.ans = r4(a - b); }
  if (op === "mul") { p.text = `${fmt(a)} × ${fmt(b)}`; p.ans = r4(a * b); }
  if (op === "div") { p.text = `${fmt(a)} ÷ ${fmt(b)}`; p.ans = r4(a / b); }
  if (op === "pct") {
    if (kind === "of") { p.text = `${fmt(a)} % od ${fmt(b)}`; p.ans = r4((a * b) / 100); }
    if (kind === "what") { p.text = `${fmt(a)} je ? % od ${fmt(b)}`; p.ans = r4((a / b) * 100); }
    if (kind === "inc") { p.text = `${fmt(b)} + ${fmt(a)} %`; p.ans = r4(b * (1 + a / 100)); }
    if (kind === "dec") { p.text = `${fmt(b)} − ${fmt(a)} %`; p.ans = r4(b * (1 - a / 100)); }
  }
  p.key = `${op}|${a}|${b}|${p.kind || ""}`;
  return p;
}

function generate(op, lvl) {
  const [a, b, kind] = LEVELS[op][lvl - 1].g();
  return makeProblem(op, a, b, kind, lvl);
}

// ---------------------------------------------------------------- strategije (namigi)

const isInt = (x) => Number.isInteger(x);
function placeParts(n) {
  // 347 → [300, 40, 7]
  const parts = [];
  let m = 1;
  while (n > 0) { const d = n % 10; if (d) parts.unshift(d * m); n = Math.floor(n / 10); m *= 10; }
  return parts;
}
function chain(start, parts, sign) {
  let cur = start;
  const steps = [];
  for (const x of parts) {
    const nx = sign > 0 ? cur + x : cur - x;
    steps.push(`${fmt(cur)} ${sign > 0 ? "+" : "−"} ${fmt(x)} = ${fmt(nx)}`);
    cur = nx;
  }
  return steps.join("\n");
}

function hintFor(p) {
  const { op, a, b, kind, ans } = p;
  if (op === "add") {
    if (!isInt(a) || !isInt(b)) return "Seštej cele dele in decimalke posebej:\n" +
      `${Math.trunc(a)} + ${Math.trunc(b)} = ${Math.trunc(a) + Math.trunc(b)}, ${fmt(r4(a % 1))} + ${fmt(r4(b % 1))} = ${fmt(r4((a % 1) + (b % 1)))}\nskupaj ${fmt(ans)}`;
    const big = Math.max(a, b), small = Math.min(a, b);
    if (big < 10 && ans > 10) { const need = 10 - big; return `Dopolni do 10:\n${big} + ${need} = 10, ostane še ${small - need}\n10 + ${small - need} = ${ans}`; }
    if (small >= 10 && small % 10 >= 7) {
      const up = small + (10 - (small % 10));
      return `Zaokroži in popravi:\n${big} + ${up} = ${big + up}\n${big + up} − ${up - small} = ${ans}`;
    }
    return "Prištevaj po mestih (od največjega):\n" + chain(big, placeParts(small), 1);
  }
  if (op === "sub") {
    if (ans < 0) return `Odštej manjše od večjega in dodaj minus:\n${fmt(b)} − ${fmt(a)} = ${fmt(-ans)} → ${fmt(ans)}`;
    if (!isInt(a) || !isInt(b)) return `Odštevaj po mestih:\n${chain(a, [Math.trunc(b), r4(b % 1)].filter(Boolean), -1)}`;
    if (a < 20 && b < 10 && a - b < 10 && a > 10) { const down = a - 10; return `Najprej do 10:\n${a} − ${down} = 10, ostane še ${b - down}\n10 − ${b - down} = ${ans}`; }
    if (b >= 10 && b % 10 >= 7) {
      const up = b + (10 - (b % 10));
      return `Zaokroži in popravi:\n${a} − ${up} = ${a - up}\n${a - up} + ${up - b} = ${ans}`;
    }
    if (b < 10 && a % 10 < b) return `Najprej do desetice:\n${a} − ${a % 10} = ${a - (a % 10)}\n${a - (a % 10)} − ${b - (a % 10)} = ${ans}`;
    return "Odštevaj po mestih (od največjega):\n" + chain(a, placeParts(b), -1);
  }
  if (op === "mul") {
    if (!isInt(a)) { const f = Math.round(a * 10); return `Računaj brez vejice, nato jo vrni:\n${f} × ${b} = ${f * b}\n${f * b} ÷ 10 = ${fmt(ans)}`; }
    const s = Math.min(a, b), l = Math.max(a, b);
    if (s === 10 || l === 10) return `×10 = pripiši ničlo:\n${s === 10 ? l : s} → ${ans}`;
    if (s === 5 || l === 5) { const o = s === 5 ? l : s; return `×5 = ×10 in deli z 2:\n${o} × 10 = ${o * 10}\n${o * 10} ÷ 2 = ${ans}`; }
    if (b === 25 || a === 25) { const o = b === 25 ? a : b; return `×25 = ×100 in deli s 4:\n${o} × 100 = ${o * 100}\n${o * 100} ÷ 4 = ${ans}`; }
    if (b === 50 || a === 50) { const o = b === 50 ? a : b; return `×50 = ×100 in deli z 2:\n${o} × 100 = ${o * 100}\n${o * 100} ÷ 2 = ${ans}`; }
    if (b === 15 || a === 15) { const o = b === 15 ? a : b; return `×15 = ×10 + polovica tega:\n${o} × 10 = ${o * 10}\n${o * 10} + ${fmt(o * 5)} = ${ans}`; }
    if ((b === 11 || a === 11) && l < 100) { const o = b === 11 ? a : b; return `×11 = ×10 + število samo:\n${o} × 10 = ${o * 10}\n${o * 10} + ${o} = ${ans}`; }
    if (s === 9 || (l === 9)) { const o = s === 9 ? l : s; return `×9 = ×10 − število samo:\n${o} × 10 = ${o * 10}\n${o * 10} − ${o} = ${ans}`; }
    if (s >= 10 && s % 10 === 0) { return `Množi brez ničle, nato jo dodaj:\n${l} × ${s / 10} = ${l * (s / 10)}\n${l * (s / 10)} × 10 = ${ans}`; }
    if (s > 10 && s < 20 && l > 10 && l < 20) {
      const c = l + (s - 10);
      return `Najstniški trik:\n${l} + ${s - 10} = ${c} → ${c} × 10 = ${c * 10}\n${l - 10} × ${s - 10} = ${(l - 10) * (s - 10)}\n${c * 10} + ${(l - 10) * (s - 10)} = ${ans}`;
    }
    if (s === 4) return `×4 = dvakrat podvoji:\n${l} × 2 = ${l * 2}\n${l * 2} × 2 = ${ans}`;
    if (s === 8 && l < 20) return `×8 = trikrat podvoji:\n${l} → ${l * 2} → ${l * 4} → ${ans}`;
    if (l <= 12) {
      if (l === 12 || l === 11) return `Razstavi ${l} = 10 + ${l - 10}:\n${s} × 10 = ${s * 10}\n${s} × ${l - 10} = ${s * (l - 10)}\n${s * 10} + ${s * (l - 10)} = ${ans}`;
      if (l > 5) return `Razstavi ${l} = 5 + ${l - 5}:\n${s} × 5 = ${s * 5}\n${s} × ${l - 5} = ${s * (l - 5)}\n${s * 5} + ${s * (l - 5)} = ${ans}`;
      return `Ponavljaj seštevanje: ${Array(s).fill(l).join(" + ")} = ${ans}`;
    }
    if (s < 10) {
      const parts = placeParts(l);
      return `Razstavi ${l} = ${parts.join(" + ")}:\n` + parts.map((x) => `${x} × ${s} = ${x * s}`).join("\n") + `\nskupaj ${ans}`;
    }
    const t = s - (s % 10), u = s % 10;
    if (u >= 7) return `Zaokroži ${s} na ${t + 10}:\n${l} × ${t + 10} = ${l * (t + 10)}\n${l} × ${10 - u} = ${l * (10 - u)}\n${l * (t + 10)} − ${l * (10 - u)} = ${ans}`;
    return `Razstavi ${s} = ${t} + ${u}:\n${l} × ${t} = ${l * t}\n${l} × ${u} = ${l * u}\n${l * t} + ${l * u} = ${ans}`;
  }
  if (op === "div") {
    if (!isInt(ans)) {
      const q = Math.floor(a / b), r = a - q * b;
      return `Celi del in ostanek:\n${a} ÷ ${b} = ${q}, ostanek ${r}\n${r} ÷ ${b} = ${fmt(r4(r / b))}\nskupaj ${fmt(ans)}`;
    }
    if (ans <= 12 && b <= 12) return `Pomisli na poštevanko:\n${b} × ? = ${a}\n${b} × ${ans} = ${a}`;
    if (b === 5) return `÷5 = ×2 in ÷10:\n${a} × 2 = ${a * 2}\n${a * 2} ÷ 10 = ${ans}`;
    if (b === 25) return `÷25 = ×4 in ÷100:\n${a} × 4 = ${a * 4}\n${a * 4} ÷ 100 = ${ans}`;
    if (b === 50) return `÷50 = ×2 in ÷100:\n${a} × 2 = ${a * 2}\n${a * 2} ÷ 100 = ${ans}`;
    if (b === 20) return `÷20 = ÷10 in ÷2:\n${a} ÷ 10 = ${fmt(a / 10)}\n${fmt(a / 10)} ÷ 2 = ${ans}`;
    if (b === 15) return `÷15 = ÷3 in ÷5:\n${a} ÷ 3 = ${a / 3}\n${a / 3} ÷ 5 = ${ans}`;
    const parts = placeParts(ans).map((q) => q * b);
    if (parts.length < 2) return `Preveri z množenjem:\n${b} × ${ans} = ${a}`;
    return `Razstavi ${a} na kose, deljive z ${b}:\n${a} = ${parts.join(" + ")}\n` + parts.map((x) => `${x} ÷ ${b} = ${x / b}`).join("\n") + `\nskupaj ${ans}`;
  }
  if (op === "pct") {
    if (kind === "what") {
      const k = 100 / b;
      if (isInt(k)) return `Razširi ulomek na stotine:\n${a}/${b} = ${a * k}/100 = ${ans} %`;
      return `Delež × 100:\n${a} ÷ ${b} = ${fmt(a / b)}\n${fmt(a / b)} × 100 = ${fmt(ans)} %`;
    }
    const base = b, pp = a;
    let how;
    if (pp === 10) how = `10 % = deli z 10:\n${base} ÷ 10 = ${fmt(base / 10)}`;
    else if (pp === 50) how = `50 % = polovica:\n${base} ÷ 2 = ${fmt(base / 2)}`;
    else if (pp === 25) how = `25 % = četrtina:\n${base} ÷ 4 = ${fmt(base / 4)}`;
    else if (pp === 20) how = `20 % = petina:\n${base} ÷ 5 = ${fmt(base / 5)}`;
    else if (pp === 1) how = `1 % = deli s 100:\n${base} ÷ 100 = ${fmt(base / 100)}`;
    else if (pp === 75) how = `75 % = 3 četrtine:\n${base} ÷ 4 = ${fmt(base / 4)}\n${fmt(base / 4)} × 3 = ${fmt(r4(base * 0.75))}`;
    else {
      const ten = r4(base / 10), tens = Math.floor(pp / 10), rest = pp % 10;
      const lines = [`10 % od ${base} = ${fmt(ten)}`];
      if (tens > 1) lines.push(`${tens * 10} % = ${tens} × ${fmt(ten)} = ${fmt(r4(ten * tens))}`);
      if (rest === 5) lines.push(`5 % = polovica od 10 % = ${fmt(r4(ten / 2))}`);
      else if (rest) lines.push(`1 % = ${fmt(r4(base / 100))} → ${rest} % = ${fmt(r4((base / 100) * rest))}`);
      lines.push(`skupaj ${pp} % = ${fmt(r4((pp * base) / 100))}`);
      how = lines.join("\n");
      if (base < pp && base <= 50) how += `\n(ali obrni: ${pp} % od ${base} = ${base} % od ${pp})`;
    }
    if (kind === "inc") how += `\n${base} + ${fmt(r4((pp * base) / 100))} = ${fmt(ans)}`;
    if (kind === "dec") how += `\n${base} − ${fmt(r4((pp * base) / 100))} = ${fmt(ans)}`;
    return how;
  }
  return "";
}

// ---------------------------------------------------------------- stanje

const DEFAULT_SETTINGS = { sessionMin: 5, autoSubmit: true, timer: true, vibrate: true, pctFreq: 0.5 };

function freshState() {
  const skills = {};
  for (const op of OP_KEYS) skills[op] = { r: 1, hist: [] };
  return { v: 1, placed: false, skills, sessions: [], review: [], recent: {}, settings: { ...DEFAULT_SETTINGS }, records: { bestStreak: 0, bestCpm: 0 } };
}

let S = load();
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(OLD_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = freshState();
      return { ...base, ...s, settings: { ...base.settings, ...s.settings }, skills: { ...base.skills, ...s.skills }, records: { ...base.records, ...s.records } };
    }
  } catch (e) { /* prazno ali nedostopno */ }
  return freshState();
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { toast("Shranjevanje ni uspelo"); }
}

// ---------------------------------------------------------------- prilagajanje težavnosti
// Stopnica (staircase): pravilno in hitro → majhen korak gor, napaka → večji korak dol.
// Ravnovesje se ustali pri ~85 % točnosti (Wilson in sod., 2019).

const UP = 0.07, DOWN = 0.55; // v simulaciji se ustali pri ~85 % točnosti

function pickLevel(op) {
  const r = S.skills[op].r;
  let L = Math.floor(r);
  if (Math.random() < r - L) L++;
  else if (Math.random() < 0.1) L--; // občasna lažja naloga za utrjevanje
  return clamp(L, 1, maxLevel(op));
}

function updateSkill(op, lvl, ok, t) {
  const sk = S.skills[op];
  const cur = Math.floor(sk.r);
  let d;
  if (ok) {
    const sf = clamp(LEVELS[op][lvl - 1].t / Math.max(t, 0.5), 0.3, 1.5);
    d = UP * sf * (lvl < cur ? 0.4 : 1);
  } else {
    d = -DOWN * (lvl > cur ? 0.6 : 1);
  }
  sk.r = clamp(sk.r + d, 1, maxLevel(op) + 0.99);
  const rec = (S.recent[op] = S.recent[op] || []);
  rec.push(ok ? 1 : 0);
  if (rec.length > 30) rec.shift();
}

function errRate(op) {
  const rec = S.recent[op] || [];
  return rec.length ? 1 - rec.reduce((x, y) => x + y, 0) / rec.length : 0;
}

// ---------------------------------------------------------------- ponavljanje napak (Leitnerjev sistem)

const BOX_GAP = [1, 3, 7];

function reviewMiss(p) {
  const today = dayKey();
  const it = S.review.find((x) => x.key === p.key);
  if (it) { it.box = 0; it.due = addDays(today, 1); it.miss = (it.miss || 1) + 1; }
  else S.review.push({ key: p.key, op: p.op, a: p.a, b: p.b, kind: p.kind, lvl: p.lvl, box: 0, due: addDays(today, 1), miss: 1 });
  if (S.review.length > 120) S.review.shift();
}
function reviewHit(p) {
  const i = S.review.findIndex((x) => x.key === p.key);
  if (i < 0) return;
  const it = S.review[i];
  it.box++;
  if (it.box >= BOX_GAP.length) S.review.splice(i, 1);
  else it.due = addDays(dayKey(), BOX_GAP[it.box]);
}

// ---------------------------------------------------------------- navigacija

const TABBED = ["home", "stats", "tips", "settings"];
const icon = (id) => `<svg><use href="#i-${id}"/></svg>`;

let current = "home";
function show(id) {
  current = id;
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  $("#tabs").classList.toggle("hidden", !TABBED.includes(id));
  $$("#tabs [data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  window.scrollTo(0, 0);
  const render = { home: renderHome, stats: renderStats, tips: renderTips, about: renderAbout, settings: renderSettings, free: renderFree }[id];
  if (render) render();
}
function go(id) {
  if (id === current) return;
  if (id === "home") {
    if (history.state && history.state.s) history.back();
    else show("home");
    return;
  }
  if (history.state && history.state.s) history.replaceState({ s: id }, "");
  else history.pushState({ s: id }, "");
  show(id);
}
window.addEventListener("popstate", () => {
  if (current === "play" && run && !run.done) {
    history.pushState({ s: "play" }, "");
    quitRun();
    return;
  }
  show(S.placed ? "home" : "intro");
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-go], [data-tab]");
  if (b) go(b.dataset.go || b.dataset.tab);
});

function toast(msg, ms = 2200) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}

// obroč napredka (kot v Macrotractorju)
function ring(frac, inner, cls = "") {
  const r = 82, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 190 190"><circle class="ring-bg" cx="95" cy="95" r="${r}"/>
    <circle class="ring-fg ${cls}" cx="95" cy="95" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(frac, 0, 1))}"/></svg>
    <div class="ring-text">${inner}</div>`;
}

// ---------------------------------------------------------------- domov

const DAY_LETTERS = ["N", "P", "T", "S", "Č", "P", "S"];
const DAY_NAMES = ["nedelja", "ponedeljek", "torek", "sreda", "četrtek", "petek", "sobota"];
const MONTHS = ["januar", "februar", "marec", "april", "maj", "junij", "julij", "avgust", "september", "oktober", "november", "december"];

function practicedDays() {
  const set = new Set();
  for (const s of S.sessions) if (s.n >= 5) set.add(s.d);
  return set;
}
function streak() {
  const days = practicedDays();
  let k = dayKey();
  if (!days.has(k)) k = addDays(k, -1);
  let n = 0;
  while (days.has(k)) { n++; k = addDays(k, -1); }
  return n;
}
function activeToday() {
  const t = dayKey();
  return S.sessions.filter((s) => s.d === t).reduce((x, s) => x + s.dur, 0);
}
function dayWord(n) {
  return n === 1 ? "dan" : n === 2 ? "dneva" : n < 5 ? "dnevi" : "dni";
}

function renderHome() {
  const now = new Date();
  $("#today-label").textContent = `${DAY_NAMES[now.getDay()]}, ${now.getDate()}. ${MONTHS[now.getMonth()]}`;
  const st = streak();
  $("#streak").textContent = `${st} ${dayWord(st)}`;
  $("#hs-streak").textContent = st;

  const days = practicedDays();
  const today = dayKey();
  let wk = "";
  for (let i = 6; i >= 0; i--) {
    const k = addDays(today, -i);
    const [y, m, d] = k.split("-").map(Number);
    const on = days.has(k);
    wk += `<div class="d${i === 0 ? " today" : ""}"><div class="dot${on ? " on" : ""}">${on ? icon("check") : ""}</div>${DAY_LETTERS[new Date(y, m - 1, d).getDay()]}</div>`;
  }
  $("#week").innerHTML = wk;

  const last7 = S.sessions.filter((s) => s.mode !== "test" && s.d > addDays(today, -7));
  const n7 = last7.reduce((x, s) => x + s.n, 0);
  $("#hs-acc").textContent = n7 ? `${Math.round((last7.reduce((x, s) => x + s.c, 0) / n7) * 100)} %` : "–";

  const mins = S.settings.sessionMin;
  const doneSec = activeToday();
  const done = doneSec >= mins * 60 * 0.9;
  $("#home-ring").innerHTML = ring(doneSec / (mins * 60), done
    ? `<div class="ring-num">${icon("check")}</div><div class="ring-sub">opravljeno</div>`
    : `<div class="ring-num">${Math.floor(doneSec / 60)}<small> / ${mins}</small></div><div class="ring-sub">minut danes</div>`, done ? "full" : "");
  $("#btn-daily").classList.toggle("primary", !done);
  $("#btn-daily").classList.toggle("done", done);
  $("#daily-title").textContent = done ? "Še en krog" : doneSec > 0 ? "Nadaljuj trening" : "Začni današnji trening";

  const due = S.review.filter((x) => x.due <= today).length;
  $("#due-note").textContent = due ? `${due} za ponovitev` : "";
  $("#home-skills").innerHTML = OP_KEYS.map((op) => skillRow(op)).join("");
}

function skillRow(op) {
  const r = S.skills[op].r, mx = maxLevel(op);
  return `<div class="lvl-row" style="--c:${OPS[op].color}">
    <div class="lvl-top"><span class="mdot"></span>${OPS[op].name}<span class="num">${Math.floor(r)}<small> / ${mx}</small></span></div>
    <div class="mbar"><i style="width:${Math.max(3, ((r - 1) / mx) * 100)}%"></i></div></div>`;
}

$("#btn-daily").addEventListener("click", () => startRun("daily", OP_KEYS, S.settings.sessionMin));
$("#btn-start-test").addEventListener("click", () => startRun("test", OP_KEYS));

// ---------------------------------------------------------------- prosti trening

let freeOps = new Set(OP_KEYS), freeDur = 3;
function renderFree() {
  $("#free-ops").innerHTML = OP_KEYS.map((op) => `<button class="chip${freeOps.has(op) ? " on" : ""}" data-op="${op}" style="--c:${OPS[op].color}"><i></i>${OPS[op].name}</button>`).join("");
  $("#free-dur").innerHTML = [2, 3, 5, 10].map((m) => `<button class="${freeDur === m ? "on" : ""}" data-m="${m}">${m} min</button>`).join("");
}
$("#free-ops").addEventListener("click", (e) => {
  const b = e.target.closest("[data-op]");
  if (!b) return;
  const op = b.dataset.op;
  if (freeOps.has(op)) { if (freeOps.size > 1) freeOps.delete(op); } else freeOps.add(op);
  renderFree();
});
$("#free-dur").addEventListener("click", (e) => {
  const b = e.target.closest("[data-m]");
  if (b) { freeDur = Number(b.dataset.m); renderFree(); }
});
$("#btn-free-start").addEventListener("click", () => startRun("free", [...freeOps], freeDur));

// ---------------------------------------------------------------- reševanje

const TEST_PLAN = { add: 4, sub: 4, mul: 4, div: 4, pct: 3 };
const TEST_START = { add: 3, sub: 3, mul: 3, div: 3, pct: 2 };
let run = null;

function startRun(mode, ops, minutes) {
  run = {
    mode, ops, durMs: (minutes || 0) * 60000, activeMs: 0, results: [], missedQ: [], usedReview: new Set(),
    before: Object.fromEntries(OP_KEYS.map((op) => [op, S.skills[op].r])), done: false, lastOps: [],
  };
  if (mode === "test") {
    run.test = { order: OP_KEYS.flatMap((op) => Array(TEST_PLAN[op]).fill(op)), i: 0, L: { ...TEST_START }, best: {}, step: {} };
    run.total = run.test.order.length;
  }
  if (history.state && history.state.s) history.replaceState({ s: "play" }, "");
  else history.pushState({ s: "play" }, "");
  show("play");
  nextProblem();
}

function chooseOp() {
  const w = run.ops.map((op) => {
    let x = op === "pct" ? S.settings.pctFreq : op === "div" ? 0.85 : 1;
    x *= 1 + errRate(op); // šibkejše področje dobi več nalog
    const l = run.lastOps;
    if (l.length >= 2 && l[l.length - 1] === op && l[l.length - 2] === op) x *= 0.05; // prepletanje
    return x;
  });
  let s = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { s -= w[i]; if (s <= 0) return run.ops[i]; }
  return run.ops[run.ops.length - 1];
}

function nextProblem() {
  let p = null;
  const n = run.results.length;
  if (run.mode === "test") {
    const op = run.test.order[run.test.i];
    p = generate(op, clamp(run.test.L[op], 1, maxLevel(op)));
  } else {
    // 1) napaka iz te seje (razširjeno ponavljanje)
    const qi = run.missedQ.findIndex((m) => m.at <= n);
    if (qi >= 0) { p = { ...run.missedQ[qi].p, again: true }; run.missedQ.splice(qi, 1); }
    // 2) zapadle ponovitve iz prejšnjih dni
    if (!p && Math.random() < 0.3) {
      const today = dayKey();
      const it = S.review.find((x) => x.due <= today && run.ops.includes(x.op) && !run.usedReview.has(x.key));
      if (it) { run.usedReview.add(it.key); p = { ...makeProblem(it.op, it.a, it.b, it.kind, it.lvl), fromReview: true }; }
    }
    if (!p) {
      const op = chooseOp();
      const prev = run.cur && run.cur.key;
      do p = generate(op, pickLevel(op)); while (p.key === prev);
    }
  }
  run.cur = p;
  run.lastOps.push(p.op);
  run.input = "";
  $("#op-tag").textContent = OPS[p.op].name + (p.fromReview ? " · ponovitev" : p.again ? " · še enkrat" : "");
  $("#op-tag").style.color = OPS[p.op].color;
  const prob = $("#problem");
  prob.textContent = p.text;
  prob.classList.toggle("small", p.text.length > 11);
  $("#feedback").classList.add("hidden");
  $("#keypad").classList.remove("locked", "hidden");
  $("#answer").className = "answer";
  renderInput();
  updateProgress();
  const tb = $("#timebar");
  tb.classList.toggle("hidden", !S.settings.timer);
  const bar = tb.firstElementChild;
  bar.style.transition = "none";
  bar.style.transform = "scaleX(1)";
  void bar.offsetWidth;
  bar.style.transition = `transform ${LEVELS[p.op][p.lvl - 1].t}s linear`;
  bar.style.transform = "scaleX(0)";
  run.shownAt = performance.now();
  run.waiting = false;
}

function renderInput() {
  $("#answer").innerHTML = `${esc(run.input.replace("-", "−"))}<span class="caret"></span>`;
}

function updateProgress() {
  const frac = run.mode === "test" ? run.test.i / run.total : run.activeMs / run.durMs;
  $("#progress-bar").style.width = `${clamp(frac, 0, 1) * 100}%`;
  $("#play-count").textContent = run.results.length;
}

function parseInput(s) {
  if (!s || s === "-" || s === ",") return NaN;
  return Number(s.replace(",", "."));
}

function press(k) {
  if (!run || run.done) return;
  if (run.waiting) { if (k === "ok") advance(); return; }
  if (k === "ok") { if (run.input) submit(); return; }
  if (k === "skip") { submit(true); return; }
  if (k === "del") run.input = run.input.slice(0, -1);
  else if (k === "-") run.input = run.input.startsWith("-") ? run.input.slice(1) : "-" + run.input;
  else if (k === ",") { if (!run.input.includes(",")) run.input = (run.input.replace("-", "") ? run.input : run.input + "0") + ","; }
  else if (run.input.replace(/[-,]/g, "").length < 9) run.input += k;
  renderInput();
  if (S.settings.autoSubmit && Math.abs(parseInput(run.input) - run.cur.ans) < 1e-6 && !run.input.endsWith(",")) submit();
}

function submit(skipped = false) {
  const p = run.cur;
  const t = Math.min((performance.now() - run.shownAt) / 1000, 60);
  const val = parseInput(run.input);
  const ok = !skipped && Math.abs(val - p.ans) < 1e-6;
  run.activeMs += t * 1000;
  run.results.push({ op: p.op, lvl: p.lvl, ok, t, text: p.text, ans: p.ans, again: !!p.again });
  run.waiting = true;

  if (run.mode === "test") {
    const T = run.test, op = p.op, target = LEVELS[op][p.lvl - 1].t;
    T.step[op] = (T.step[op] || 0) + 1;
    if (ok && t <= target * 1.3) { T.best[op] = Math.max(T.best[op] || 0, p.lvl); T.L[op] = p.lvl + (T.step[op] <= 2 ? 2 : 1); }
    else if (ok) { T.best[op] = Math.max(T.best[op] || 0, p.lvl - 0.5); }
    else T.L[op] = Math.max(1, p.lvl - 1);
    T.i++;
  } else if (!p.again) {
    updateSkill(p.op, p.lvl, ok, t);
    if (ok && p.fromReview) reviewHit(p);
  }

  if (!ok && run.mode !== "test") {
    if (!p.again) {
      reviewMiss(p);
      run.missedQ.push({ p, at: run.results.length + 3 }, { p, at: run.results.length + 8 });
    } else if ((p.rep = (p.rep || 0) + 1) < 3) run.missedQ.push({ p, at: run.results.length + 3 });
  }

  const ans = $("#answer");
  ans.classList.add(ok ? "ok" : "no");
  $("#timebar").firstElementChild.style.transition = "none";
  updateProgress();

  if (ok) {
    setTimeout(advance, 280);
  } else {
    if (S.settings.vibrate && navigator.vibrate) navigator.vibrate([50, 40, 50]);
    $("#keypad").classList.add("hidden");
    $("#timebar").classList.add("hidden");
    const fb = $("#feedback");
    fb.innerHTML = `<div class="correct">${skipped ? "" : `Tvoj odgovor: ${esc(fmt(val) === "NaN" ? "–" : fmt(val))} · `}pravilno: <b>${fmt(p.ans)}</b></div>
      ${run.mode === "test" ? "" : `<div class="hint"><div class="hint-h">${icon("bulb")}Strategija</div>${esc(hintFor(p))}</div>`}
      <button id="btn-next" class="btn primary full big">Naprej</button>`;
    fb.classList.remove("hidden");
    $("#btn-next").addEventListener("click", advance);
  }
}

function advance() {
  if (!run || !run.waiting || run.done) return;
  run.waiting = false;
  const finished = run.mode === "test" ? run.test.i >= run.total : run.activeMs >= run.durMs;
  if (finished) finishRun();
  else nextProblem();
}

function quitRun() {
  if (!run || run.done) return;
  const enough = run.mode !== "test" && run.results.length >= 5;
  const msg = run.mode === "test"
    ? "Prekinem test? Začneš lahko znova."
    : enough ? "Končam trening? Rezultati do zdaj bodo shranjeni." : "Končam trening? Premalo nalog za shranjevanje.";
  if (!confirm(msg)) return;
  if (enough) finishRun();
  else { run.done = true; run = null; history.replaceState(null, ""); show(S.placed ? "home" : "intro"); }
}
$("#btn-quit").addEventListener("click", quitRun);

$("#keypad").addEventListener("pointerdown", (e) => {
  const b = e.target.closest("[data-k]");
  if (!b) return;
  e.preventDefault();
  press(b.dataset.k);
});
document.addEventListener("keydown", (e) => {
  if (current !== "play" || !run) return;
  const k = e.key;
  if (/^[0-9]$/.test(k)) press(k);
  else if (k === "Backspace") press("del");
  else if (k === "Enter" || k === " ") { e.preventDefault(); press("ok"); }
  else if (k === "," || k === ".") press(",");
  else if (k === "-") press("-");
  else if (k === "Escape") quitRun();
});

// ---------------------------------------------------------------- konec seje

function finishRun() {
  run.done = true;
  const R = run.results;
  if (run.mode === "test") {
    for (const op of OP_KEYS) {
      const best = run.test.best[op] || 0;
      S.skills[op].r = clamp(best ? best + 0.3 : 1, 1, maxLevel(op) + 0.99);
      S.skills[op].hist = [{ d: dayKey(), r: S.skills[op].r }];
    }
    S.placed = true;
    S.placedAt = dayKey();
  }

  const first = R.filter((r) => !r.again);
  const ok = first.filter((r) => r.ok).length;
  const dur = Math.round(run.activeMs / 1000);
  const perOp = {};
  for (const r of first) {
    const o = (perOp[r.op] = perOp[r.op] || { n: 0, c: 0, t: 0 });
    o.n++; o.c += r.ok ? 1 : 0; o.t += r.t;
  }
  const cpm = dur ? (ok / dur) * 60 : 0;
  const today = dayKey();
  const sess = { d: today, ts: Date.now(), mode: run.mode, dur, n: first.length, c: ok, cpm: Math.round(cpm * 10) / 10, ops: perOp, lv: Object.fromEntries(OP_KEYS.map((op) => [op, Math.round(S.skills[op].r * 100) / 100])) };
  S.sessions.push(sess);
  for (const op of OP_KEYS) {
    const h = S.skills[op].hist;
    const entry = { d: today, r: Math.round(S.skills[op].r * 100) / 100 };
    if (h.length && h[h.length - 1].d === today) h[h.length - 1] = entry; else h.push(entry);
  }
  const st = streak();
  let newRecord = false;
  if (st > S.records.bestStreak) S.records.bestStreak = st;
  if (run.mode !== "test" && dur >= 120 && cpm > S.records.bestCpm) { newRecord = S.records.bestCpm > 0; S.records.bestCpm = Math.round(cpm * 10) / 10; }
  save();

  renderSummary(sess, newRecord, st);
  history.replaceState({ s: "summary" }, "");
  show("summary");
  const finished = run;
  run = null;
  return finished;
}

function kpi(ico, cls, v, l) {
  return `<div class="kpi"><div class="kpi-ico ${cls}">${icon(ico)}</div><div class="v">${v}</div><div class="l">${l}</div></div>`;
}

function renderSummary(sess, newRecord, st) {
  const acc = sess.n ? Math.round((sess.c / sess.n) * 100) : 0;
  const avgT = sess.n ? Object.values(sess.ops).reduce((x, o) => x + o.t, 0) / sess.n : 0;
  let html;
  if (sess.mode === "test") {
    html = `<div class="sum-hero"><div class="empty-ico big">${icon("target")}</div>
        <div><div class="day-label">Test končan</div><p class="muted" style="margin:6px 0 0">Pravilnih ${sess.c} od ${sess.n}. Tu začneš – težavnost se bo odslej sproti prilagajala.</p></div></div>
      <div class="card"><h3>Tvoje začetne ravni</h3><div class="rows">${OP_KEYS.map((op) => {
        const L = Math.floor(S.skills[op].r);
        return `<div class="row" style="--c:${OPS[op].color}"><span><span class="name"><span class="mdot"></span>${OPS[op].name}</span><span class="sub">${LEVELS[op][L - 1].d}</span></span><b>${L}<small> / ${maxLevel(op)}</small></b></div>`;
      }).join("")}</div></div>
      <div class="note">${icon("clock")}<span>Priporočilo: <b>vsak dan ${S.settings.sessionMin} minut</b>. Kratki, redni treningi so učinkovitejši od redkih dolgih.</span></div>`;
  } else {
    const changes = OP_KEYS.filter((op) => sess.ops[op]).map((op) => {
      const b = run.before[op], a = S.skills[op].r, o = sess.ops[op];
      const diff = Math.floor(a) - Math.floor(b);
      const arrow = diff > 0 ? `<span class="up">↑ ${Math.floor(a)}</span>` : diff < 0 ? `<span class="down">↓ ${Math.floor(a)}</span>` : `<b>${Math.floor(a)}</b>`;
      return `<div class="row" style="--c:${OPS[op].color}"><span class="name"><span class="mdot"></span>${OPS[op].name} <small>${o.c}/${o.n}</small></span><span><small>raven</small> ${arrow}</span></div>`;
    }).join("");
    const misses = run.results.filter((r) => !r.ok && !r.again).slice(0, 8);
    let advice;
    if (acc >= 93) advice = "Odlično! Naloge so bile zate morda prelahke – težavnost se dviga.";
    else if (acc >= 75) advice = "Ravno prav – učinkovito učenje poteka okoli 85 % točnosti, kjer so naloge izziv, a obvladljive.";
    else advice = "Danes je bilo zahtevno – težavnost se je malo znižala. Napake se vrnejo v ponovitvah, dokler jih ne utrdiš.";
    html = `<div class="card hero"><div class="ring-wrap">${ring(acc / 100, `<div class="ring-num">${acc}<small> %</small></div><div class="ring-sub">točnost</div>`)}</div>
        ${st ? `<span class="goal-chip">${icon("flame")}${st} ${dayWord(st)} zapored</span>` : ""}</div>
      <div class="kpis three">
        ${kpi("check", "k2", sess.n, "nalog")}
        ${kpi("clock", "k3", `${fmt(Math.round(avgT * 10) / 10)}<small> s</small>`, "povp. čas")}
        ${kpi("bolt", "", fmt(sess.cpm), "pravilnih/min")}
      </div>
      ${newRecord ? `<div class="note">${icon("trophy")}<span>Nov osebni rekord v hitrosti!</span></div>` : ""}
      <div class="note">${icon("bulb")}<span>${advice}</span></div>
      <div class="card"><h3>Po področjih</h3><div class="rows">${changes}</div></div>
      ${misses.length ? `<div class="card"><div class="card-head"><h3>Za ponovitev</h3><small>${icon("repeat")}</small></div><div class="rows">${misses.map((m) => `<div class="row"><span>${esc(m.text)}</span><b>${fmt(m.ans)}</b></div>`).join("")}</div></div>` : ""}`;
  }
  $("#summary-body").innerHTML = html;
  $("#summary-body").style.cssText = "display:flex;flex-direction:column;gap:12px";
}

// ---------------------------------------------------------------- napredek

function renderStats() {
  const ses = S.sessions.filter((s) => s.mode !== "test");
  const totalN = ses.reduce((x, s) => x + s.n, 0);
  const totalC = ses.reduce((x, s) => x + s.c, 0);
  const totalMin = Math.round(ses.reduce((x, s) => x + s.dur, 0) / 60);
  const last7 = ses.filter((s) => s.d > addDays(dayKey(), -7));
  const cpm7 = last7.length ? last7.reduce((x, s) => x + s.cpm, 0) / last7.length : 0;

  let html = `<div class="kpis">
      ${kpi("flame", "k4", `${streak()}<small> ${dayWord(streak())}</small>`, `zapored · rekord ${S.records.bestStreak}`)}
      ${kpi("clock", "k3", `${totalMin}<small> min</small>`, `skupaj · ${ses.length} ${ses.length === 1 ? "trening" : ses.length === 2 ? "treninga" : ses.length < 5 ? "treningi" : "treningov"}`)}
      ${kpi("target", "k2", `${totalN ? Math.round((totalC / totalN) * 100) : 0}<small> %</small>`, `točnost · ${totalN} nalog`)}
      ${kpi("bolt", "", fmt(Math.round(cpm7 * 10) / 10), `pravilnih/min (7 dni) · rekord ${fmt(S.records.bestCpm)}`)}
    </div>`;

  html += OP_KEYS.map((op) => {
    const sk = S.skills[op], L = Math.floor(sk.r);
    return `<div class="card op-card" style="--c:${OPS[op].color}">
      <div class="top"><span class="mdot"></span>${OPS[op].name}<span class="lv">${L}<small> / ${maxLevel(op)}</small></span></div>
      <div class="desc">${LEVELS[op][L - 1].d}</div>
      <div class="mbar"><i style="width:${Math.round((sk.r - L) * 100)}%"></i></div>
      ${sparkline(sk.hist, op)}</div>`;
  }).join("");

  html += `<div class="card chart-card" id="ch-cpm"><h3>Hitrost</h3><div class="sub">Pravilnih odgovorov na minuto · zadnjih 30 treningov</div></div>
    <div class="card chart-card" id="ch-acc"><div class="card-head"><h3>Točnost</h3><span class="legend-mini"><span class="dash"></span>cilj 85 %</span></div><div class="sub">Pri ~85 % je učenje najučinkovitejše</div></div>
    <div class="card"><h3>Zadnjih 12 tednov</h3><div class="heat" id="heat"></div>
      <div class="heat-legend">manj <i style="background:var(--card-2)"></i><i style="background:rgba(157,140,245,.3)"></i><i style="background:rgba(157,140,245,.6)"></i><i style="background:var(--accent)"></i> več</div></div>`;

  const hard = S.review.slice().sort((a, b) => (b.miss || 1) - (a.miss || 1)).slice(0, 10);
  if (hard.length) {
    html += `<div class="card"><div class="card-head"><h3>Težavni primeri</h3><small>${S.review.length} v ponavljanju</small></div><div class="rows">${hard.map((it) => {
      const p = makeProblem(it.op, it.a, it.b, it.kind, it.lvl);
      return `<div class="row" style="--c:${OPS[it.op].color}"><span class="name"><span class="mdot"></span>${esc(p.text)} = <b>${fmt(p.ans)}</b></span><small>${it.due <= dayKey() ? "danes" : fmtDate(it.due)}</small></div>`;
    }).join("")}</div></div>`;
  }
  $("#stats-body").innerHTML = html;
  $("#stats-body").style.cssText = "display:flex;flex-direction:column;gap:12px";

  const recent = ses.slice(-30);
  lineChart($("#ch-cpm"), recent.map((s) => ({ y: s.cpm, tip: `${fmtDate(s.d)} · ${fmt(s.cpm)}/min · ${s.n} nalog` })), { fmtY: (v) => fmt(Math.round(v * 10) / 10) });
  lineChart($("#ch-acc"), recent.map((s) => { const a = s.n ? Math.round((s.c / s.n) * 100) : 0; return { y: a, tip: `${fmtDate(s.d)} · ${a} % (${s.c}/${s.n})` }; }), { yMin: 0, yMax: 100, ref: 85, fmtY: (v) => `${Math.round(v)} %` });

  // toplotni koledar
  const mins = {};
  for (const s of ses) mins[s.d] = (mins[s.d] || 0) + s.dur / 60;
  const today = dayKey();
  const [y, m, d] = today.split("-").map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // pon = 0
  const start = addDays(today, -(7 * 11 + dow));
  let cells = "";
  for (let i = 0; i < 7 * 11 + dow + 1; i++) {
    const k = addDays(start, i), v = mins[k] || 0;
    const cls = v === 0 ? "" : v < 3 ? "l1" : v < 6 ? "l2" : "l3";
    cells += `<div class="${cls}${k === today ? " today" : ""}" title="${fmtDate(k)}: ${Math.round(v)} min"></div>`;
  }
  $("#heat").innerHTML = cells;
}

function sparkline(hist, op) {
  if (!hist || hist.length < 2) return `<div class="spark-empty">Graf ravni se pokaže po nekaj dneh vadbe.</div>`;
  const pts = hist.slice(-60);
  const lo = Math.min(...pts.map((p) => p.r)) - 0.2, hi = Math.max(...pts.map((p) => p.r)) + 0.2;
  const xy = pts.map((p, i) => [4 + (i / (pts.length - 1)) * 292, 38 - ((p.r - lo) / (hi - lo || 1)) * 34]);
  return `<svg class="spark" viewBox="0 0 300 42" preserveAspectRatio="none"><polyline points="${xy.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${OPS[op].color}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

function lineChart(el, data, o) {
  if (data.length < 2) { el.insertAdjacentHTML("beforeend", `<p class="chart-empty">Graf se pokaže po dveh treningih.</p>`); return; }
  const W = Math.max(260, el.clientWidth - 40), H = 170, L = 36, Rp = 8, T = 10, B = 22;
  const ys = data.map((d) => d.y);
  const yMin = o.yMin ?? 0, yMax = o.yMax ?? Math.max(1, Math.ceil(Math.max(...ys) * 1.15));
  const X = (i) => L + (i / (data.length - 1)) * (W - L - Rp);
  const Y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  let g = "";
  for (let k = 0; k <= 3; k++) {
    const v = yMin + ((yMax - yMin) * k) / 3;
    g += `<line class="grid" x1="${L}" x2="${W - Rp}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${o.fmtY(v)}</text>`;
  }
  if (o.ref != null) g += `<line class="target" x1="${L}" x2="${W - Rp}" y1="${Y(o.ref)}" y2="${Y(o.ref)}"/>`;
  const line = data.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(d.y).toFixed(1)}`).join("");
  const area = `${line}L${X(data.length - 1).toFixed(1)},${H - B}L${L},${H - B}Z`;
  const last = data.length - 1;
  const gid = `g-${el.id}`;
  const svg = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9d8cf5" stop-opacity=".28"/><stop offset="1" stop-color="#9d8cf5" stop-opacity="0"/></linearGradient></defs>
    ${g}<path d="${area}" fill="url(#${gid})"/>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${X(last)}" cy="${Y(data[last].y)}" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>
    <line class="cross" y1="${T}" y2="${H - B}" stroke="rgba(255,255,255,.25)" stroke-width="1" visibility="hidden"/>
    <circle class="hov" r="5" fill="var(--accent)" stroke="var(--card)" stroke-width="2" visibility="hidden"/>
    <text x="${L}" y="${H - 5}">starejši</text><text x="${W - Rp}" y="${H - 5}" text-anchor="end">zadnji</text></svg>`;
  el.insertAdjacentHTML("beforeend", svg + `<div class="tip hidden"></div>`);
  const s = el.querySelector("svg.chart"), tip = el.querySelector(".tip"), cross = s.querySelector(".cross"), hov = s.querySelector(".hov");
  const showAt = (clientX) => {
    const rect = s.getBoundingClientRect();
    const i = clamp(Math.round(((clientX - rect.left - L) / (W - L - Rp)) * last), 0, last);
    cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
    hov.setAttribute("cx", X(i)); hov.setAttribute("cy", Y(data[i].y)); hov.setAttribute("visibility", "visible");
    tip.textContent = data[i].tip;
    tip.style.left = `${clamp(s.offsetLeft + X(i), 90, el.clientWidth - 90)}px`;
    tip.style.top = `${s.offsetTop + Y(data[i].y) - 4}px`;
    tip.classList.remove("hidden");
  };
  const hide = () => { cross.setAttribute("visibility", "hidden"); hov.setAttribute("visibility", "hidden"); tip.classList.add("hidden"); };
  s.addEventListener("pointermove", (e) => showAt(e.clientX));
  s.addEventListener("pointerdown", (e) => showAt(e.clientX));
  s.addEventListener("pointerleave", hide);
}

// ---------------------------------------------------------------- triki

const TIPS = [
  ["add", "Dopolni do 10", "Pri prehodu čez desetico najprej dopolni do okrogle številke.", "8 + 5 = 8 + 2 + 3 = 13\n47 + 6 = 47 + 3 + 3 = 53"],
  ["add", "Zaokroži in popravi", "Ko se število konča na 7, 8 ali 9, prištej okroglo število in odštej razliko.", "56 + 39 = 56 + 40 − 1 = 95\n245 + 198 = 245 + 200 − 2 = 443"],
  ["add", "Od leve proti desni", "Na pamet je lažje računati od največjega mesta navzdol – vmesni rezultat imaš ves čas v glavi.", "347 + 236:\n347 + 200 = 547 → 547 + 30 = 577 → 577 + 6 = 583"],
  ["sub", "Odštevaj okroglo, prištej razliko", "Odštej preveč in nato popravi.", "83 − 29 = 83 − 30 + 1 = 54\n512 − 197 = 512 − 200 + 3 = 315"],
  ["sub", "Dopolnjevanje (kot pri vračilu denarja)", "Koliko manjka od manjšega do večjega števila?", "1000 − 365: 365 → 400 (+35) → 1000 (+600) = 635"],
  ["sub", "Enaka razlika", "Če obema številoma prišteješ isto, se razlika ne spremeni.", "73 − 48 = 75 − 50 = 25"],
  ["mul", "×5, ×25, ×50", "Pomnoži z 10 ali 100 in deli.", "×5:  64 × 5 = 640 ÷ 2 = 320\n×25: 36 × 25 = 3600 ÷ 4 = 900\n×50: 46 × 50 = 4600 ÷ 2 = 2300"],
  ["mul", "×9 in ×11", "Pomnoži z 10 in odštej ali prištej število.", "×9:  27 × 9 = 270 − 27 = 243\n×11: 43 × 11 = 430 + 43 = 473\n     (ali: 4 _ 3 → 4 (4+3) 3 = 473)"],
  ["mul", "Podvajanje in razpolavljanje", "Eno število razpolovi, drugo podvoji – zmnožek ostane enak.", "16 × 35 = 8 × 70 = 560\n4 × 27 = 2 × 54 = 108"],
  ["mul", "Razstavljanje", "Razbij večje število na desetice in enice.", "47 × 6 = 40×6 + 7×6 = 240 + 42 = 282\n34 × 26 = 34×20 + 34×6 = 680 + 204 = 884"],
  ["mul", "Najstniška števila", "Prvemu prištej enice drugega, ×10, prištej zmnožek enic.", "13 × 17: 13 + 7 = 20 → 200\n3 × 7 = 21 → 200 + 21 = 221"],
  ["mul", "Kvadrati okoli okroglega števila", "(a − b)(a + b) = a² − b²", "48 × 52 = 50² − 2² = 2500 − 4 = 2496\n29 × 31 = 900 − 1 = 899"],
  ["mul", "Kvadrat števila na 5", "Desetice pomnoži z naslednikom in pripiši 25.", "35² : 3 × 4 = 12 → 1225\n75² : 7 × 8 = 56 → 5625"],
  ["div", "Pomisli na množenje", "Deljenje je obratna operacija: 56 ÷ 7 = ? ⇔ 7 × ? = 56.", "72 ÷ 8 → 8 × 9 = 72 → 9"],
  ["div", "÷5, ÷25, ÷50", "Pomnoži z 2 ali 4 in deli z 10 oz. 100.", "÷5:  85 ÷ 5 = 170 ÷ 10 = 17\n÷25: 350 ÷ 25 = 1400 ÷ 100 = 14"],
  ["div", "Razstavi deljenec", "Razbij število na kose, ki se lepo delijo.", "156 ÷ 4 = 120÷4 + 36÷4 = 30 + 9 = 39\n378 ÷ 6 = 360÷6 + 18÷6 = 60 + 3 = 63"],
  ["div", "Deli po korakih", "Deli zaporedno z manjšimi števili.", "÷4 = dvakrat ÷2: 312 ÷ 4 → 156 → 78\n÷12 = ÷2 ÷6: 252 → 126 → 21"],
  ["pct", "10 % je izhodišče", "10 % = deli z 10. Iz tega sestaviš skoraj vse.", "30 % od 80 = 3 × 8 = 24\n15 % od 60 = 6 + 3 = 9\n5 % = polovica od 10 %"],
  ["pct", "Obrni procent", "x % od y = y % od x – izberi lažjo stran.", "8 % od 50 = 50 % od 8 = 4\n4 % od 75 = 75 % od 4 = 3"],
  ["pct", "Ulomki", "50 % = 1/2, 25 % = 1/4, 20 % = 1/5, 12,5 % = 1/8, 75 % = 3/4", "25 % od 64 = 64 ÷ 4 = 16\n75 % od 120 = 3 × 30 = 90"],
  ["pct", "Povečanje in popust", "Izračunaj procent in prištej/odštej – ali pomnoži s faktorjem.", "80 + 25 % = 80 + 20 = 100 (= 80 × 1,25)\n240 − 15 % = 240 − 36 = 204 (= 240 × 0,85)"],
];

function renderTips() {
  $("#tips-body").innerHTML = `<p class="muted" style="margin:0 4px">Dobri računarji na pamet so <b>prilagodljivi</b> – za vsako nalogo izberejo primerno strategijo. Ob napaki ti aplikacija pokaže strategijo za tisto nalogo.</p>` +
    OP_KEYS.map((op) => `<div class="tip-group" style="--c:${OPS[op].color}"><span class="mdot"></span>${OPS[op].name}</div>` +
      TIPS.filter((t) => t[0] === op).map(([, title, text, ex]) => `<div class="card tip-card" style="--c:${OPS[op].color}"><h4>${title}</h4><p>${text}</p><code>${esc(ex)}</code></div>`).join("")).join("");
  $("#tips-body").style.cssText = "display:flex;flex-direction:column;gap:12px";
}

// ---------------------------------------------------------------- o metodi

function renderAbout() {
  $("#about-body").innerHTML = `
  <p>Trening je zgrajen na ugotovitvah kognitivne psihologije in raziskav poučevanja matematike. Na kratko:</p>
  <h3>1. Kratko in vsak dan</h3>
  <p><b>Razporejena vadba</b> (spacing) je eden najbolj zanesljivih učinkov v psihologiji učenja: enak čas, razdeljen na več krajših sej, prinese boljše in trajnejše znanje kot ena dolga seja. Zato je privzeti trening 5 minut na dan, s sledenjem zaporednih dni.</p>
  <p class="ref">Cepeda, Pashler, Vul, Wixted & Rohrer (2006), Psychological Bulletin – metaanaliza razporejene vadbe; Dunlosky in sod. (2013), Psychological Science in the Public Interest.</p>
  <h3>2. Priklic namesto ponavljanja</h3>
  <p>Ko rezultat prikličeš iz spomina (namesto da ga prebereš), se ga bolje naučiš – <b>učinek testiranja</b>. Vsaka naloga je kratek priklic, z <b>takojšnjo povratno informacijo</b>.</p>
  <p class="ref">Roediger & Karpicke (2006), Psychological Science; Hattie & Timperley (2007), Review of Educational Research.</p>
  <h3>3. Prepletanje operacij</h3>
  <p>Mešane naloge (seštevanje, odštevanje, množenje, deljenje, procenti) so med vadbo težje, a na kasnejših testih dajejo bistveno boljše rezultate kot vadba ene vrste nalog naenkrat – ker se učiš tudi <i>izbrati</i> pravi postopek.</p>
  <p class="ref">Rohrer & Taylor (2007), Instructional Science; Rohrer, Dedrick & Stershic (2015), Journal of Educational Psychology.</p>
  <h3>4. Prava težavnost (~85 %)</h3>
  <p>Učenje je najhitrejše, ko so naloge ravno prav težke. Teoretična in eksperimentalna analiza je pokazala optimum pri približno <b>85 % točnosti</b>. Aplikacija uporablja »stopnico«: hiter pravilen odgovor težavnost malo dvigne, napaka jo bolj spusti, zato se težavnost sama ustali okoli 85 %.</p>
  <p class="ref">Wilson, Shenhav, Straccia & Cohen (2019), Nature Communications – »The Eighty Five Percent Rule for optimal learning«; Bjork (1994) – »zaželene težave«.</p>
  <h3>5. Tekočnost in čas</h3>
  <p>Vadba z merjenjem časa izboljša tekočnost osnovnih računskih dejstev, a časovni pritisk lahko pri nekaterih poveča tesnobo. Zato ni trdih časovnih omejitev – le diskretna črta, hitrost pa vpliva na napredovanje. Črto lahko izklopiš v nastavitvah.</p>
  <p class="ref">Codding, Burns & Lukito (2011), Learning Disabilities Research & Practice – metaanaliza intervencij za tekočnost; Ashcraft (2002), Current Directions in Psychological Science – matematična tesnoba.</p>
  <h3>6. Ponavljanje napak</h3>
  <p>Napačno rešena naloga se vrne še v isti seji (po 3 in po 8 nalogah), nato pa po Leitnerjevem sistemu čez 1, 3 in 7 dni, dokler je ne rešiš trikrat zapored.</p>
  <p class="ref">Burns (2005) – »incremental rehearsal«; Karpicke & Roediger (2007) – razširjeno ponavljanje.</p>
  <h3>7. Strategije, ne le dejstva</h3>
  <p>Dobri računarji uporabljajo prilagodljive strategije (razstavljanje, zaokroževanje in popravek, podvajanje …). Ob napaki dobiš namig s strategijo, v razdelku <b>Triki</b> pa jih najdeš zbrane.</p>
  <p class="ref">Verschaffel, Luwel, Torbeyns & Van Dooren (2009), European Journal of Psychology of Education – prilagodljivo strokovno znanje v aritmetiki.</p>
  <h3>Pošteno opozorilo</h3>
  <p>Trening izboljša prav to, kar treniraš – računanje na pamet. Raziskave »treninga možganov« ne kažejo, da bi se to preneslo na splošno inteligenco ali druge nepovezane sposobnosti.</p>
  <p class="ref">Simons in sod. (2016), Psychological Science in the Public Interest.</p>`;
}

// ---------------------------------------------------------------- nastavitve

function renderSettings() {
  const st = S.settings;
  const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${st[key] === v ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const sw = (key) => `<button class="switch${st[key] ? " on" : ""}" data-sw="${key}" aria-pressed="${!!st[key]}"></button>`;
  $("#settings-body").innerHTML = `<div class="card">
    <div class="set-col" style="border-top:0;padding-top:0"><div class="lbl">Dnevni trening<small>trajanje ene seje</small></div>${seg("sessionMin", [[3, "3 min"], [5, "5 min"], [10, "10 min"], [15, "15 min"]])}</div>
    <div class="set-col"><div class="lbl">Procenti<small>kako pogosto se pojavijo</small></div>${seg("pctFreq", [[0.25, "redko"], [0.5, "občasno"], [1, "pogosto"]])}</div>
  </div>
  <div class="card">
    <div class="set-row"><span class="lbl">Samodejna potrditev<small>pravilen odgovor potrdi brez OK</small></span>${sw("autoSubmit")}</div>
    <div class="set-row"><span class="lbl">Časovna črta<small>prikaz ciljnega časa</small></span>${sw("timer")}</div>
    <div class="set-row"><span class="lbl">Vibracija ob napaki</span>${sw("vibrate")}</div>
  </div>
  <div class="card btn-stack">
    <button class="btn full" id="btn-retest">Ponovi začetni test</button>
    <button class="btn full" id="btn-export">Izvozi podatke</button>
    <button class="btn full" id="btn-import">Uvozi podatke</button>
    <input type="file" id="file-import" accept="application/json,.json" class="hidden">
    <button class="btn full danger" id="btn-reset">Izbriši vse podatke</button>
    <p class="muted small" style="margin:4px 0 0">Podatki so shranjeni samo na tej napravi. Občasno naredi izvoz kot varnostno kopijo.</p>
  </div>`;
  $("#settings-body").style.cssText = "display:flex;flex-direction:column;gap:12px";
}
$("#settings-body").addEventListener("click", (e) => {
  const segBtn = e.target.closest(".seg button");
  if (segBtn) { const key = segBtn.parentElement.dataset.key; S.settings[key] = Number(segBtn.dataset.v); save(); renderSettings(); return; }
  const sw = e.target.closest("[data-sw]");
  if (sw) { S.settings[sw.dataset.sw] = !S.settings[sw.dataset.sw]; save(); renderSettings(); return; }
  const id = e.target.id;
  if (id === "btn-retest") { if (confirm("Ponovim začetni test? Tvoje ravni se bodo nastavile znova, zgodovina ostane.")) startRun("test", OP_KEYS); }
  if (id === "btn-export") {
    const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `racunanje-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  if (id === "btn-import") $("#file-import").click();
  if (id === "btn-reset" && confirm("Res izbrišem vse podatke? Tega ni mogoče razveljaviti.")) {
    S = freshState(); save(); history.replaceState(null, ""); show("intro");
  }
});
$("#settings-body").addEventListener("change", async (e) => {
  if (e.target.id !== "file-import" || !e.target.files[0]) return;
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!data.skills || !Array.isArray(data.sessions)) throw new Error("format");
    S = { ...freshState(), ...data };
    save();
    toast("Podatki uvoženi");
    renderSettings();
  } catch (err) { toast("Datoteka ni veljavna"); }
});

// ---------------------------------------------------------------- zagon

show(S.placed ? "home" : "intro");
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
