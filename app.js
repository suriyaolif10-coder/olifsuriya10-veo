/* ห้องคุมงานรายงานประจำเดือน — ไฟล์เดียว ไม่ต้องมี server ข้อมูลเก็บใน localStorage ของเครื่อง */
(() => {
  "use strict";

  const STORE_KEY = "cdd-control-room-v1";
  const MAX_STAFF = 4;

  const STATUSES = [
    { k: "none", label: "ยังไม่ส่ง" },
    { k: "doing", label: "กำลังทำ" },
    { k: "sent", label: "ส่งแล้ว" },
    { k: "ok", label: "ตรวจแล้ว" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.k, s.label]));
  const STATUS_COLOR = { none: "#8792b8", doing: "#ffb43d", sent: "#3da5ff", ok: "#37d67a", late: "#ff4d6a" };
  const PALETTE = ["#7c6cff", "#34c77b", "#ff5a6e", "#ffb02e", "#3dc6ff", "#ff7ad9", "#9be15d", "#c08bff"];
  const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const TH_MON = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const TH_DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const pad = n => String(n).padStart(2, "0");
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  /* ---------------- state ---------------- */
  function seed() {
    const staff = [
      { id: uid(), name: "พลอย", color: PALETTE[0] },
      { id: uid(), name: "เบล", color: PALETTE[1] },
      { id: uid(), name: "ต้น", color: PALETTE[2] },
      { id: uid(), name: "ฝน", color: PALETTE[3] },
    ];
    const R = (i, title, dueDay) => ({ id: uid(), staffId: staff[i].id, title, dueDay });
    const reports = [
      R(0, "รายงานผลการดำเนินงานประจำเดือน", 5),
      R(0, "รายงาน กข.คจ.", 10),
      R(1, "รายงานกลุ่มออมทรัพย์เพื่อการผลิต", 10),
      R(1, "รายงานกองทุนพัฒนาบทบาทสตรี", 15),
      R(2, "รายงาน OTOP / ผู้ประกอบการ", 20),
      R(2, "รายงานผลการเบิกจ่ายงบประมาณ", 25),
      R(3, "รายงานหมู่บ้านเศรษฐกิจพอเพียง", 15),
      R(3, "รายงานสรุปหนังสือรับ-ส่ง", 28),
    ];
    // ตัวอย่างสถานะของเดือนปัจจุบัน ให้เห็นภาพการใช้งาน
    const demo = ["ok", "sent", "ok", "doing", "doing", "none", "none", "none"];
    const mk = monthKey(new Date());
    const months = { [mk]: {} };
    reports.forEach((r, i) => { months[mk][r.id] = { s: demo[i], note: "", t: Date.now() }; });
    return {
      version: 1,
      office: { title: "ห้องคุมงาน สพอ.", sub: "สำนักงานพัฒนาชุมชนอำเภอ · รายงานประจำเดือน" },
      staff, reports, months, log: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (valid(data)) return data;
      }
    } catch (e) { /* ใช้ค่าเริ่มต้น */ }
    return seed();
  }
  function valid(d) {
    return d && Array.isArray(d.staff) && Array.isArray(d.reports) && d.months && typeof d.months === "object";
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast("บันทึกในเครื่องไม่ได้ (เบราว์เซอร์ปิดการเก็บข้อมูล)"); }
  }

  let state = load();
  state.log = state.log || [];
  state.office = state.office || { title: "ห้องคุมงาน สพอ.", sub: "" };
  let viewDate = new Date();
  viewDate.setDate(1);

  /* ---------------- report helpers ---------------- */
  const mk = () => monthKey(viewDate);
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  function dueDate(r) {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    return new Date(y, m, Math.min(Math.max(1, r.dueDay | 0), daysIn(y, m)));
  }
  function entry(r) { return (state.months[mk()] || {})[r.id] || { s: "none", note: "" }; }
  function isLate(r) {
    const e = entry(r);
    return (e.s === "none" || e.s === "doing") && startOfDay(new Date()) > dueDate(r);
  }
  function effective(r) { return isLate(r) ? "late" : entry(r).s; }
  const reportsOf = sid => state.reports.filter(r => r.staffId === sid).sort((a, b) => a.dueDay - b.dueDay);

  function deskStatus(s) {
    const rs = reportsOf(s.id);
    if (!rs.length) return { k: "none", text: "ว่าง", done: 0, total: 0 };
    const eff = rs.map(effective);
    const done = eff.filter(x => x === "sent" || x === "ok").length;
    const late = eff.filter(x => x === "late").length;
    const base = { done, total: rs.length };
    if (late) return { ...base, k: "late", text: `ค้างส่ง ${late} เรื่อง` };
    if (eff.every(x => x === "ok")) return { ...base, k: "ok", text: "ตรวจครบแล้ว" };
    if (done === rs.length) return { ...base, k: "sent", text: "ส่งครบ รอตรวจ" };
    if (eff.includes("doing")) return { ...base, k: "doing", text: "กำลังทำรายงาน" };
    return { ...base, k: "none", text: `รอส่ง ${rs.length - done} เรื่อง` };
  }

  function dueText(r) {
    const diff = Math.round((startOfDay(dueDate(r)) - startOfDay(new Date())) / 864e5);
    const e = entry(r);
    if (e.s === "sent" || e.s === "ok") return "";
    if (diff < 0) return `เลยกำหนด ${-diff} วัน`;
    if (diff === 0) return "ครบกำหนดวันนี้";
    return `อีก ${diff} วัน`;
  }
  const fmtDue = r => { const d = dueDate(r); return `${d.getDate()} ${TH_MON[d.getMonth()]}`; };
  const fmtTime = t => { const d = new Date(t); return `${d.getDate()} ${TH_MON[d.getMonth()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  function setStatus(r, s) {
    const key = mk();
    state.months[key] = state.months[key] || {};
    const prev = state.months[key][r.id] || { s: "none", note: "" };
    if (prev.s === s) return;
    state.months[key][r.id] = { ...prev, s, t: Date.now() };
    const who = state.staff.find(x => x.id === r.staffId);
    state.log.unshift({ t: Date.now(), who: who ? who.name : "", what: r.title, to: s, month: key });
    state.log = state.log.slice(0, 60);
    save();
  }

  /* ---------------- isometric room ---------------- */
  const O = { x: 500, y: 150 }, TW = 32, TH = 16, ZS = 32, N = 13;
  const iso = (x, y, z = 0) => [O.x + (x - y) * TW, O.y + (x + y) * TH - z * ZS];
  const pts = arr => arr.map(p => iso(...p).map(v => v.toFixed(1)).join(",")).join(" ");
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => Math.max(0, Math.min(255, Math.round(f < 0 ? c * (1 + f) : c + (255 - c) * f))));
    return `rgb(${ch.join(",")})`;
  }
  function box(x, y, z, w, d, h, col, extra = "") {
    return `<g ${extra}>
      <polygon points="${pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}" fill="${shade(col, -0.35)}"/>
      <polygon points="${pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${shade(col, -0.18)}"/>
      <polygon points="${pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${col}"/>
    </g>`;
  }
  function plant(x, y) {
    const [px, py] = iso(x, y, 0);
    return `${box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.55, "#c9d3f0")}
      <g transform="translate(${px},${py - 30})">
        <circle cx="0" cy="-14" r="17" fill="#1f9d57"/><circle cx="-12" cy="-4" r="12" fill="#25b866"/>
        <circle cx="12" cy="-5" r="12" fill="#1c8d4e"/><circle cx="2" cy="-28" r="11" fill="#2fcf75"/>
      </g>`;
  }
  // จัดวางโต๊ะ 4 ตัว (หน่วยเป็นช่องพื้น)
  const DESKS = [{ x: 1.5, y: 2.5 }, { x: 7, y: 2.5 }, { x: 1.5, y: 8 }, { x: 7, y: 8 }];

  function person(px, py, color, cls, opts = {}) {
    const late = cls.includes("late");
    return `<g class="person ${cls}" style="transform-box:fill-box">
      <ellipse cx="${px}" cy="${py + 4}" rx="20" ry="8" fill="rgba(0,0,0,.35)"/>
      <path d="M${px - 15},${py} q0,-30 15,-32 q15,2 15,32 z" fill="${color}"/>
      <path d="M${px - 15},${py} q0,-30 15,-32 q15,2 15,32 z" fill="url(#bodyShade)"/>
      <circle cx="${px}" cy="${py - 44}" r="12" fill="#f0c39c"/>
      <path d="M${px - 12.5},${py - 46} a12.5,12.5 0 0 1 25,0 q-5,-6 -12.5,-6 q-7.5,0 -12.5,6z" fill="${opts.hair || "#2b2140"}"/>
      ${late ? `<g class="alert"><circle cx="${px + 18}" cy="${py - 64}" r="9" fill="${STATUS_COLOR.late}"/><text x="${px + 18}" y="${py - 59.5}" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Prompt">!</text></g>` : ""}
      ${cls.includes("ok") ? `<g><circle cx="${px + 18}" cy="${py - 64}" r="9" fill="${STATUS_COLOR.ok}"/><path d="M${px + 13.5},${py - 64} l3,3 l6,-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>` : ""}
    </g>`;
  }

  function workstation(dx, dy, s, idx) {
    const st = deskStatus(s);
    const scr = STATUS_COLOR[st.k];
    const [lx, ly] = [dx + 2.4, dy + 2.4];
    let g = "";
    // โซนพื้นเรืองแสงตามสีเจ้าหน้าที่
    g += `<polygon points="${pts([[dx - 0.5, dy - 0.5, 0], [lx, dy - 0.5, 0], [lx, ly, 0], [dx - 0.5, ly, 0]])}" fill="${s.color}" fill-opacity=".07" stroke="${s.color}" stroke-opacity=".75" stroke-width="2" class="neon" style="color:${s.color}"/>`;
    // ขาโต๊ะ
    [[dx + 0.05, dy + 0.05], [dx + 1.95, dy + 0.05], [dx + 0.05, dy + 0.95], [dx + 1.95, dy + 0.95]].forEach(([x, y]) => {
      const a = iso(x, y, 0), b = iso(x, y, 0.72);
      g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#aeb8da" stroke-width="3"/>`;
    });
    g += box(dx, dy, 0.72, 2, 1, 0.1, "#eef1fb");
    // จอคอม: หน้าจอหันมาทางผู้ชม เปลี่ยนสีตามสถานะ
    g += box(dx + 0.55, dy + 0.12, 0.82, 0.9, 0.08, 0.55, "#2a3150");
    g += `<polygon class="screen ${st.k === "doing" ? "doing" : ""}" points="${pts([[dx + 0.62, dy + 0.205, 0.88], [dx + 1.38, dy + 0.205, 0.88], [dx + 1.38, dy + 0.205, 1.31], [dx + 0.62, dy + 0.205, 1.31]])}" fill="${scr}" opacity=".9"/>`;
    // แฟ้มรายงานบนโต๊ะ (จำนวนที่ส่งแล้ว)
    for (let i = 0; i < Math.min(st.done, 5); i++) g += box(dx + 1.55, dy + 0.35, 0.82 + i * 0.07, 0.35, 0.45, 0.06, ["#ffd166", "#7ad7ff", "#ff9ec7", "#b4f08c", "#c9b6ff"][i]);
    // เก้าอี้ + คน
    g += box(dx + 0.7, dy + 1.35, 0.35, 0.6, 0.6, 0.1, "#3a4472");
    const [px, py] = iso(dx + 1, dy + 1.65, 0.45);
    g += person(px, py, s.color, st.k);
    return { svg: g, px, py, st };
  }

  function tag(s, px, py, st, idx) {
    const w = 176, h = 68, x = px - w / 2, y = py - 150;
    const col = STATUS_COLOR[st.k];
    const name = s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name;
    return `<g class="desk-hit" data-staff="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(s.name)}: ${esc(st.text)}">
      <rect x="${px - 50}" y="${y}" width="100" height="${py - y}" fill="transparent"/>
      <path d="M${px - 8},${y + h} L${px},${y + h + 10} L${px + 8},${y + h} z" fill="#f3f5ff"/>
      <rect class="tag-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/>
      <rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${s.color}"/>
      <circle cx="${x + 22}" cy="${y + 24}" r="6" fill="${col}"/>
      <text class="tag-name" x="${x + 36}" y="${y + 31}" style="font-size:24px">${esc(name)}</text>
      <text x="${x + w - 14}" y="${y + 30}" text-anchor="end" font-family="Prompt" font-size="16" fill="#5a6696">${st.done}/${st.total}</text>
      <text class="tag-status" x="${x + 16}" y="${y + 56}" style="font-size:18px;fill:${shade(col, -0.35)}">${esc(st.text)}</text>
    </g>`;
  }

  function wallBoard() {
    // บอร์ดความคืบหน้าบนผนังขวา (ระนาบ y=0)
    const x0 = 3.2, x1 = 10.4, zt = 3.6, zb = 1.0;
    const [ex, ey] = iso(x0, 0, zt);
    const U = 40; // หน่วยภายในต่อ 1 ช่อง
    const W = (x1 - x0) * U, H = (zt - zb) * ZS;
    let rows = "";
    const list = state.staff.slice(0, MAX_STAFF);
    list.forEach((s, i) => {
      const st = deskStatus(s);
      const pct = st.total ? st.done / st.total : 0;
      const y = 30 + i * 13;
      rows += `<text class="board-small" x="10" y="${y + 8}" style="font-size:10px">${esc(s.name.slice(0, 8))}</text>
        <rect x="64" y="${y}" width="${W - 110}" height="9" rx="4" fill="#0b1538"/>
        <rect x="64" y="${y}" width="${Math.max(0, (W - 110) * pct)}" height="9" rx="4" fill="${s.color}"/>
        <text class="board-small" x="${W - 10}" y="${y + 8}" text-anchor="end" style="font-size:10px">${Math.round(pct * 100)}%</text>`;
    });
    return `<polygon points="${pts([[x0 - .1, 0, zb - .1], [x1 + .1, 0, zb - .1], [x1 + .1, 0, zt + .1], [x0 - .1, 0, zt + .1]])}" fill="#3de0ff" opacity=".25"/>
      <g transform="matrix(${TW / U},${TH / U},0,1,${ex},${ey})">
        <rect width="${W}" height="${H}" rx="6" fill="#0e2a5c" stroke="#3de0ff" stroke-width="1.5"/>
        <text class="board-text" x="10" y="19" style="font-size:14px">ความคืบหน้า ${TH_MON[viewDate.getMonth()]} ${String(viewDate.getFullYear() + 543).slice(2)}</text>
        ${rows}
      </g>`;
  }

  function wallClock() {
    // ป้ายวันเวลาบนผนังซ้าย (ระนาบ x=0)
    const y0 = 12.7, y1 = 10.1, zt = 3.5, zb = 1.7;
    const [ex, ey] = iso(0, y0, zt);
    const U = 40, W = (y0 - y1) * U, H = (zt - zb) * ZS;
    return `<g transform="matrix(${TW / U},${-TH / U},0,1,${ex},${ey})">
        <rect width="${W}" height="${H}" rx="6" fill="#14123d" stroke="#ff5bd6" stroke-width="1.5"/>
        <text id="clockTime" x="${W / 2}" y="30" text-anchor="middle" font-family="Prompt" font-weight="600" font-size="24" fill="#ffd2f4"></text>
        <text id="clockDate" x="${W / 2}" y="49" text-anchor="middle" font-family="Sarabun" font-size="12" fill="#c9a8ff"></text>
      </g>`;
  }

  function bossDesk() {
    const dx = 10, dy = 10.3;
    let g = "";
    g += `<polygon points="${pts([[dx - .6, dy - .5, 0], [dx + 3, dy - .5, 0], [dx + 3, dy + 2.6, 0], [dx - .6, dy + 2.6, 0]])}" fill="#3de0ff" fill-opacity=".06" stroke="#3de0ff" stroke-opacity=".8" stroke-width="2" class="neon" style="color:#3de0ff"/>`;
    g += box(dx, dy, 0, 2.4, 1, 0.8, "#5b6aa8");
    g += box(dx - 0.02, dy - 0.02, 0.8, 2.44, 1.04, 0.08, "#dfe5f8");
    g += box(dx + 0.3, dy + 0.15, 0.88, 0.8, 0.08, 0.55, "#2a3150");
    g += box(dx + 1.3, dy + 0.15, 0.88, 0.8, 0.08, 0.55, "#2a3150");
    g += `<polygon points="${pts([[dx + 0.37, dy + 0.235, 0.94], [dx + 1.03, dy + 0.235, 0.94], [dx + 1.03, dy + 0.235, 1.37], [dx + 0.37, dy + 0.235, 1.37]])}" fill="#3de0ff" opacity=".85"/>`;
    g += `<polygon points="${pts([[dx + 1.37, dy + 0.235, 0.94], [dx + 2.03, dy + 0.235, 0.94], [dx + 2.03, dy + 0.235, 1.37], [dx + 1.37, dy + 0.235, 1.37]])}" fill="#ff5bd6" opacity=".8"/>`;
    g += box(dx + 0.85, dy + 1.4, 0.35, 0.7, 0.7, 0.1, "#3a4472");
    const [px, py] = iso(dx + 1.2, dy + 1.75, 0.45);
    g += person(px, py, "#1f3f8f", "", { hair: "#111" });
    const [lx, ly] = iso(dx + 2.6, dy + 2.6, 0);
    g += `<g class="desk-hit" data-boss="1" tabindex="0" role="button" aria-label="ตั้งค่าห้องคุมงาน">
      <rect x="${px - 95}" y="${py + 14}" width="190" height="30" rx="15" fill="#0d1840" stroke="#3de0ff"/>
      <text x="${px}" y="${py + 35}" text-anchor="middle" font-family="Prompt" font-size="17" fill="#bff4ff">พัฒนาการอำเภอ · ผู้คุม</text></g>`;
    return g;
  }

  function renderRoom() {
    let s = `<defs>
      <linearGradient id="bodyShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
      <linearGradient id="wallR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2a6c"/><stop offset="1" stop-color="#121f55"/></linearGradient>
      <linearGradient id="wallL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141f57"/><stop offset="1" stop-color="#0e1847"/></linearGradient>
    </defs>`;
    // พื้น
    s += `<polygon points="${pts([[0, 0, 0], [N, 0, 0], [N, N, 0], [0, N, 0]])}" fill="#0f1a48"/>`;
    let grid = "";
    for (let i = 1; i < N; i++) {
      const a = iso(i, 0), b = iso(i, N), c = iso(0, i), d = iso(N, i);
      grid += `M${a[0]},${a[1]}L${b[0]},${b[1]}M${c[0]},${c[1]}L${d[0]},${d[1]}`;
    }
    s += `<path d="${grid}" stroke="#1b2c6e" stroke-width="1"/>`;
    // ผนัง
    const WH = 4;
    s += `<polygon points="${pts([[0, 0, 0], [N, 0, 0], [N, 0, WH], [0, 0, WH]])}" fill="url(#wallR)"/>`;
    s += `<polygon points="${pts([[0, 0, 0], [0, N, 0], [0, N, WH], [0, 0, WH]])}" fill="url(#wallL)"/>`;
    const line = (p, q, c, w = 3) => { const a = iso(...p), b = iso(...q); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="${w}" class="neon" style="color:${c}" stroke-linecap="round"/>`; };
    s += line([0, 0, WH], [N, 0, WH], "#ff5bd6") + line([0, 0, WH], [0, N, WH], "#ff5bd6");
    s += line([0, 0, 0], [N, 0, 0], "#3de0ff", 2) + line([0, 0, 0], [0, N, 0], "#3de0ff", 2);
    s += line([0, 0, 0], [0, 0, WH], "#7b8cff", 2);
    s += line([N, 0, 0], [N, N, 0], "#ff5bd6", 2.5) + line([0, N, 0], [N, N, 0], "#ff5bd6", 2.5);
    s += line([0, 0, 0.6], [N, 0, 0.6], "#3de0ff55", 1.5) + line([0, 0, 0.6], [0, N, 0.6], "#3de0ff55", 1.5);
    s += wallBoard() + wallClock();
    s += plant(12.2, 0.9) + plant(0.9, 12.2);

    const staff = state.staff.slice(0, MAX_STAFF);
    const items = staff.map((st, i) => ({ s: st, d: DESKS[i] }));
    items.sort((a, b) => (a.d.x + a.d.y) - (b.d.x + b.d.y));
    const tags = [];
    items.forEach(({ s: st, d }, i) => {
      const w = workstation(d.x, d.y, st, i);
      s += `<g class="desk-hit" data-staff="${esc(st.id)}" aria-hidden="true">${w.svg}</g>`;
      tags.push(tag(st, w.px, w.py, w.st, i));
    });
    s += bossDesk();
    s += tags.join("");
    const svg = $("#room");
    svg.setAttribute("viewBox", "70 0 860 600");
    svg.innerHTML = s;
    tickClock();
  }

  function tickClock() {
    const now = new Date();
    const t = document.getElementById("clockTime"), d = document.getElementById("clockDate");
    if (t) t.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (d) d.textContent = `${TH_DAY[now.getDay()]} ${now.getDate()} ${TH_MON[now.getMonth()]} ${String(now.getFullYear() + 543).slice(2)}`;
  }

  /* ---------------- side panels ---------------- */
  function renderHeader() {
    $("#officeTitle").textContent = state.office.title || "ห้องคุมงาน";
    $("#officeSub").textContent = state.office.sub || "";
    document.title = state.office.title || "ห้องคุมงานรายงาน";
    $("#monthLabel").textContent = `${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
  }

  function renderSummary() {
    const all = state.reports.filter(r => state.staff.some(s => s.id === r.staffId));
    const eff = all.map(effective);
    const done = eff.filter(x => x === "sent" || x === "ok").length;
    const ok = eff.filter(x => x === "ok").length;
    const late = eff.filter(x => x === "late").length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    $("#summary").innerHTML = `
      <div class="stat"><span>รายงานเดือนนี้</span><b>${all.length}</b> เรื่อง</div>
      <div class="stat"><span>ส่งแล้ว</span><b>${done}</b> / ${all.length}<div class="bar"><i style="width:${pct}%"></i></div></div>
      <div class="stat ok"><span>ตรวจแล้ว</span><b>${ok}</b> เรื่อง</div>
      <div class="stat late"><span>ค้างส่ง (เลยกำหนด)</span><b>${late}</b> เรื่อง</div>`;
  }

  const pillClass = k => `pill p-${k}`;
  function renderStaffList() {
    $("#staffList").innerHTML = state.staff.map(s => {
      const st = deskStatus(s);
      const next = reportsOf(s.id).find(r => ["none", "doing"].includes(entry(r).s));
      const pct = st.total ? st.done / st.total * 100 : 0;
      return `<button class="staff-card" data-staff="${esc(s.id)}" style="--c:${s.color}">
        <span class="dot"></span>
        <span><span class="nm">${esc(s.name)}</span>
          <span class="meta">${st.done}/${st.total} ส่งแล้ว${next ? ` · ถัดไป: ${esc(next.title)} (${fmtDue(next)})` : ""}</span>
          <span class="prog" style="display:block"><i style="width:${pct}%"></i></span></span>
        <span class="${pillClass(st.k)}">${esc(st.text)}</span>
      </button>`;
    }).join("");
  }

  function renderDueList() {
    const pending = state.reports
      .filter(r => state.staff.some(s => s.id === r.staffId) && ["none", "doing"].includes(entry(r).s))
      .sort((a, b) => a.dueDay - b.dueDay).slice(0, 8);
    $("#dueList").innerHTML = pending.length ? pending.map(r => {
      const s = state.staff.find(x => x.id === r.staffId);
      const k = effective(r);
      return `<button class="due-item" data-staff="${esc(s.id)}">
        <span>${esc(r.title)}<small>${esc(s.name)} · กำหนด ${fmtDue(r)}</small></span>
        <span class="${pillClass(k)}">${esc(dueText(r) || STATUS_LABEL[k])}</span></button>`;
    }).join("") : `<div class="empty">ไม่มีรายงานค้าง เยี่ยมมาก</div>`;
  }

  function renderLog() {
    const list = state.log.slice(0, 15);
    $("#logList").innerHTML = list.length ? list.map(l => `<li><time>${fmtTime(l.t)}</time><b>${esc(l.who)}</b> · ${esc(l.what)} → ${esc(STATUS_LABEL[l.to] || l.to)}</li>`).join("")
      : `<li class="empty" style="border:0;padding:0">ยังไม่มีการอัปเดต</li>`;
  }

  function renderAll() {
    renderHeader(); renderSummary(); renderRoom(); renderStaffList(); renderDueList(); renderLog();
  }

  /* ---------------- staff sheet ---------------- */
  const sheet = $("#sheet"), form = $("#sheetForm");
  let openStaffId = null;

  function openStaff(id) {
    openStaffId = id;
    renderStaffSheet();
    if (!sheet.open) sheet.showModal();
  }

  function renderStaffSheet() {
    const s = state.staff.find(x => x.id === openStaffId);
    if (!s) { sheet.close(); return; }
    const st = deskStatus(s);
    const rs = reportsOf(s.id);
    form.innerHTML = `
      <div class="sheet-head" style="--c:${s.color}">
        <div class="avatar">${esc(s.name.slice(0, 1))}</div>
        <h3>${esc(s.name)} <span class="${pillClass(st.k)}" style="vertical-align:middle">${esc(st.text)}</span></h3>
        <button class="icon-btn" value="close" aria-label="ปิด">×</button>
      </div>
      <div class="small">รายงานประจำเดือน ${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543} · แตะสถานะเพื่ออัปเดต</div>
      <div class="reports">
        ${rs.length ? rs.map(r => {
          const e = entry(r); const late = isLate(r);
          return `<div class="report ${late ? "is-late" : ""}" data-report="${esc(r.id)}">
            <div class="report-top">
              <div><div class="report-title">${esc(r.title)}</div>
                <div class="report-due">กำหนดส่ง ${fmtDue(r)} (ทุกวันที่ ${r.dueDay})${late ? ` · <span style="color:var(--s-late)">${esc(dueText(r))}</span>` : dueText(r) ? ` · ${esc(dueText(r))}` : ""}</div></div>
              <button type="button" class="mini-del" data-del="${esc(r.id)}" aria-label="ลบรายงาน ${esc(r.title)}">×</button>
            </div>
            <div class="seg" role="group" aria-label="สถานะ">
              ${STATUSES.map(x => `<button type="button" class="p-${x.k}" data-set="${x.k}" aria-pressed="${e.s === x.k}">${x.label}</button>`).join("")}
            </div>
            <input class="note" data-note="${esc(r.id)}" placeholder="หมายเหตุ (เช่น เลขหนังสือ, สิ่งที่ต้องแก้)" value="${esc(e.note || "")}">
          </div>`;
        }).join("") : `<div class="empty">ยังไม่มีรายงานที่รับผิดชอบ เพิ่มด้านล่างได้เลย</div>`}
      </div>
      <div class="field">เพิ่มรายงานที่รับผิดชอบ (ทำซ้ำทุกเดือน)
        <div class="row">
          <input id="newTitle" placeholder="ชื่อรายงาน" maxlength="80">
          <input id="newDay" type="number" min="1" max="31" value="10" aria-label="วันที่ครบกำหนด">
          <button type="button" class="btn" id="addReport">เพิ่ม</button>
        </div>
        <span class="small">ช่องตัวเลข = วันที่ครบกำหนดของทุกเดือน</span>
      </div>
      <details>
        <summary class="small" style="cursor:pointer">แก้ไขชื่อ / สีประจำตัว</summary>
        <div class="field" style="margin-top:8px">ชื่อเจ้าหน้าที่
          <input id="staffName" value="${esc(s.name)}" maxlength="30">
        </div>
        <div class="colors" style="margin-top:8px">${PALETTE.map(c => `<button type="button" style="--c:${c}" data-color="${c}" aria-label="สี ${c}" aria-pressed="${c === s.color}"></button>`).join("")}</div>
      </details>
      <div class="sheet-foot"><span></span><button class="btn" value="close">เสร็จแล้ว</button></div>`;
  }

  form.addEventListener("click", e => {
    const s = state.staff.find(x => x.id === openStaffId);
    const set = e.target.closest("[data-set]");
    if (set && s) {
      const rid = set.closest("[data-report]").dataset.report;
      const r = state.reports.find(x => x.id === rid);
      setStatus(r, set.dataset.set);
      renderStaffSheet(); renderAll();
      toast(`${r.title} → ${STATUS_LABEL[set.dataset.set]}`);
      return;
    }
    const del = e.target.closest("[data-del]");
    if (del) {
      const r = state.reports.find(x => x.id === del.dataset.del);
      if (r && confirmInline(del, "ลบ?")) {
        state.reports = state.reports.filter(x => x.id !== r.id);
        save(); renderStaffSheet(); renderAll(); toast("ลบรายงานแล้ว");
      }
      return;
    }
    if (e.target.id === "addReport" && s) {
      const title = $("#newTitle").value.trim();
      const day = Math.min(31, Math.max(1, parseInt($("#newDay").value, 10) || 1));
      if (!title) { $("#newTitle").focus(); return; }
      state.reports.push({ id: uid(), staffId: s.id, title, dueDay: day });
      save(); renderStaffSheet(); renderAll(); toast("เพิ่มรายงานแล้ว");
      return;
    }
    const color = e.target.closest("[data-color]");
    if (color && s) { s.color = color.dataset.color; save(); renderStaffSheet(); renderAll(); }
  });

  form.addEventListener("change", e => {
    const s = state.staff.find(x => x.id === openStaffId);
    if (e.target.dataset.note) {
      const key = mk();
      state.months[key] = state.months[key] || {};
      const prev = state.months[key][e.target.dataset.note] || { s: "none" };
      state.months[key][e.target.dataset.note] = { ...prev, note: e.target.value.trim() };
      save(); toast("บันทึกหมายเหตุแล้ว");
    }
    if (e.target.id === "staffName" && s) {
      const v = e.target.value.trim();
      if (v) { s.name = v; save(); renderStaffSheet(); renderAll(); toast("เปลี่ยนชื่อแล้ว"); }
    }
  });
  form.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.id === "newTitle") { e.preventDefault(); $("#addReport").click(); }
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.id !== "newTitle") { e.preventDefault(); e.target.blur(); }
  });

  // ยืนยันการลบแบบกดซ้ำ (ไม่ใช้ confirm() ของเบราว์เซอร์)
  function confirmInline(btn, text) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = "1"; const old = btn.textContent;
    btn.textContent = text; btn.style.color = "var(--s-late)"; btn.style.fontSize = "13px";
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; btn.removeAttribute("style"); } }, 2500);
    return false;
  }

  /* ---------------- settings sheet ---------------- */
  function openSettings() {
    openStaffId = null;
    form.innerHTML = `
      <div class="sheet-head"><h3>ตั้งค่าห้องคุมงาน</h3><button class="icon-btn" value="close" aria-label="ปิด">×</button></div>
      <label class="field">ชื่อห้อง / หน่วยงาน<input id="offTitle" value="${esc(state.office.title)}" maxlength="40"></label>
      <label class="field">คำอธิบาย<input id="offSub" value="${esc(state.office.sub)}" maxlength="80"></label>
      <div class="field">เจ้าหน้าที่ (สูงสุด ${MAX_STAFF} คน ตามจำนวนโต๊ะ)
        <div class="reports">${state.staff.map(s => `
          <div class="staff-edit"><input data-sname="${esc(s.id)}" value="${esc(s.name)}" maxlength="30" style="border-left:4px solid ${s.color}">
          <button type="button" class="btn danger" data-sdel="${esc(s.id)}">ลบ</button></div>`).join("")}
        </div>
        ${state.staff.length < MAX_STAFF ? `<button type="button" class="btn ghost" id="addStaff" style="justify-self:start">+ เพิ่มเจ้าหน้าที่</button>` : ""}
      </div>
      <div class="field">ข้อมูลเก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น ใช้ปุ่ม “สำรองข้อมูล” เพื่อย้ายไปเครื่องอื่น
        <button type="button" class="btn danger" id="resetAll" style="justify-self:start">ล้างข้อมูลทั้งหมด (เริ่มใหม่)</button>
      </div>
      <div class="sheet-foot"><span></span><button class="btn" value="close">เสร็จแล้ว</button></div>`;
    if (!sheet.open) sheet.showModal();
  }
  form.addEventListener("change", e => {
    if (openStaffId) return;
    if (e.target.id === "offTitle") { state.office.title = e.target.value.trim() || "ห้องคุมงาน"; save(); renderAll(); }
    if (e.target.id === "offSub") { state.office.sub = e.target.value.trim(); save(); renderAll(); }
    if (e.target.dataset.sname) {
      const s = state.staff.find(x => x.id === e.target.dataset.sname);
      if (s && e.target.value.trim()) { s.name = e.target.value.trim(); save(); renderAll(); }
    }
  });
  form.addEventListener("click", e => {
    if (openStaffId) return;
    const del = e.target.closest("[data-sdel]");
    if (del && confirmInline(del, "ยืนยันลบ")) {
      const id = del.dataset.sdel;
      state.staff = state.staff.filter(x => x.id !== id);
      state.reports = state.reports.filter(r => r.staffId !== id);
      save(); renderAll(); openSettings(); toast("ลบเจ้าหน้าที่แล้ว");
    }
    if (e.target.id === "addStaff") {
      const used = new Set(state.staff.map(s => s.color));
      state.staff.push({ id: uid(), name: "เจ้าหน้าที่ใหม่", color: PALETTE.find(c => !used.has(c)) || PALETTE[0] });
      save(); renderAll(); openSettings();
    }
    if (e.target.id === "resetAll" && confirmInline(e.target, "กดอีกครั้งเพื่อยืนยันการล้างข้อมูล")) {
      state = seed(); save(); sheet.close(); renderAll(); toast("เริ่มต้นใหม่แล้ว");
    }
  });

  /* ---------------- backup ---------------- */
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `ห้องคุมงาน-สำรอง-${d.getFullYear() + 543}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("ดาวน์โหลดไฟล์สำรองแล้ว");
  }
  $("#importFile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!valid(data)) throw new Error("bad");
      data.log = data.log || []; data.office = data.office || state.office;
      state = data; save(); renderAll(); toast("นำเข้าข้อมูลแล้ว");
    } catch (err) { toast("ไฟล์ไม่ถูกต้อง"); }
    e.target.value = "";
  });

  /* ---------------- misc ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  document.addEventListener("click", e => {
    if (sheet.contains(e.target)) return;
    const hit = e.target.closest("[data-staff]");
    if (hit) return openStaff(hit.dataset.staff);
    if (e.target.closest("[data-boss]")) return openSettings();
  });
  $("#room").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const hit = e.target.closest("[data-staff],[data-boss]");
    if (!hit) return;
    e.preventDefault();
    hit.dataset.staff ? openStaff(hit.dataset.staff) : openSettings();
  });
  sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener("close", () => { openStaffId = null; });
  $("#prevMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderAll(); };
  $("#nextMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderAll(); };
  $("#settingsBtn").onclick = openSettings;
  $("#exportBtn").onclick = exportData;

  setInterval(tickClock, 30000);
  // รีเฟรชสถานะเลยกำหนดเมื่อข้ามวัน
  let lastDay = new Date().getDate();
  setInterval(() => { if (new Date().getDate() !== lastDay) { lastDay = new Date().getDate(); renderAll(); } }, 60000);

  save();
  renderAll();
  // บนมือถือ เลื่อนภาพห้องให้อยู่ตรงกลาง
  const sc = $("#roomScroll");
  if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
})();
