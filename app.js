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
  // ประเด็นเน้นย้ำของกรมการพัฒนาชุมชน (แก้ไข/ปรับชื่อได้ที่นี่)
  const FOCUS = [
    { k: "f1", no: 1, code: "สกว.", title: "Modern OTOP", owner: 2, day: 20, match: "รายงาน OTOP / ผู้ประกอบการ" },
    { k: "f2", no: 2, code: "กทบ.", title: "หมู่บ้านกองทุนแม่ของแผ่นดินปลอดภัยจากยาเสพติด", owner: 0, day: 10 },
    { k: "f3", no: 3, code: "สสช.", title: "การพัฒนาหมู่บ้านเศรษฐกิจพอเพียง", owner: 3, day: 15, match: "รายงานหมู่บ้านเศรษฐกิจพอเพียง" },
    { k: "f4", no: 4, code: "ศสท.", title: "การขับเคลื่อนสารสนเทศเพื่อการพัฒนาชุมชน", owner: 1, day: 10 },
    { k: "f5", no: 5, code: "สกส.", title: "ยกระดับการบริหารจัดการกองทุนพัฒนาบทบาทสตรี", owner: 1, day: 15, match: "รายงานกองทุนพัฒนาบทบาทสตรี" },
    { k: "f6", no: 0, code: "นวัตกรรม", title: "CDD Creativity 2026 นวัตกรรมการพัฒนาชุมชน", owner: 3, day: 25 },
    { k: "f7", no: 0, code: "งบประมาณ", title: "ผลการใช้จ่ายงบประมาณ", owner: 2, day: 25, match: "รายงานผลการเบิกจ่ายงบประมาณ" },
  ];
  const focusTitle = f => f.no ? `ประเด็นที่ ${f.no} (${f.code}) ${f.title}` : f.title;
  const LEVELS = ["A", "B", "C", "D"];
  const LEVEL_SCORE = { A: 4, B: 3, C: 2, D: 1 };
  const LEVEL_COLOR = { A: "#37d67a", B: "#3da5ff", C: "#ffb43d", D: "#ff4d6a" };
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
      { id: uid(), name: "นัท", color: PALETTE[1] },
      { id: uid(), name: "พราว", color: PALETTE[2] },
      { id: uid(), name: "ลีฟ", color: PALETTE[3] },
    ];
    const R = (i, title, dueDay, focus) => ({ id: uid(), staffId: staff[i].id, title, dueDay, ...(focus ? { focus } : {}) });
    const F = k => { const f = FOCUS.find(x => x.k === k); return R(f.owner, focusTitle(f), f.day, k); };
    const reports = [
      R(0, "รายงานผลการดำเนินงานประจำเดือน", 5), R(0, "รายงาน กข.คจ.", 10), F("f2"),
      R(1, "รายงานกลุ่มออมทรัพย์เพื่อการผลิต", 10), F("f4"), F("f5"),
      F("f1"), F("f7"),
      F("f3"), F("f6"), R(3, "รายงานสรุปหนังสือรับ-ส่ง", 28),
    ];
    // ตัวอย่างสถานะ/ระดับของเดือนปัจจุบัน ให้เห็นภาพการใช้งาน
    const demo = [["ok"], ["sent"], ["ok", "A"], ["ok"], ["sent", "B"], ["doing", "C"], ["doing", "B"], ["none"], ["doing", "D"], ["none"], ["none"]];
    const mk = monthKey(new Date());
    const months = { [mk]: {} };
    reports.forEach((r, i) => { months[mk][r.id] = { s: demo[i][0], level: demo[i][1] || "", note: "", t: Date.now() }; });
    return {
      version: 1,
      office: { title: "ห้องคุมงาน สพอ.", sub: "สำนักงานพัฒนาชุมชนอำเภอ · รายงานประจำเดือน" },
      staff, reports, months, log: [], focusV: 1, namesV: 1,
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

  // เพิ่มประเด็นเน้นย้ำให้ข้อมูลเดิมที่ยังไม่มี
  function migrate(d) {
    // เปลี่ยนชื่อตัวอย่างชุดเดิมให้ตรงกับภาพห้องใหม่ (เฉพาะถ้ายังเป็นชื่อตัวอย่าง)
    if (!d.namesV) {
      const oldN = ["พลอย", "เบล", "ต้น", "ฝน"], newN = ["พลอย", "นัท", "พราว", "ลีฟ"];
      if (d.staff.length === 4 && d.staff.every((x, i) => x.name === oldN[i])) d.staff.forEach((x, i) => { x.name = newN[i]; });
      d.namesV = 1;
    }
    if (d.focusV) return d;
    FOCUS.forEach(f => {
      if (d.reports.some(r => r.focus === f.k)) return;
      const old = f.match && d.reports.find(r => !r.focus && r.title === f.match);
      if (old) { old.focus = f.k; old.title = focusTitle(f); return; }
      const owner = d.staff[f.owner] || d.staff[0];
      if (owner) d.reports.push({ id: uid(), staffId: owner.id, title: focusTitle(f), dueDay: f.day, focus: f.k });
    });
    d.focusV = 1;
    return d;
  }

  let state = migrate(load());
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

  function setLevel(r, lv) {
    const key = mk();
    state.months[key] = state.months[key] || {};
    const prev = state.months[key][r.id] || { s: "none", note: "" };
    const level = prev.level === lv ? "" : lv;
    state.months[key][r.id] = { ...prev, level, t: Date.now() };
    const who = state.staff.find(x => x.id === r.staffId);
    state.log.unshift({ t: Date.now(), who: who ? who.name : "", what: r.title, to: level ? `ระดับ ${level}` : "ล้างระดับ", month: key });
    state.log = state.log.slice(0, 60);
    save();
  }
  const levelOf = (r, key = mk()) => ((state.months[key] || {})[r.id] || {}).level || "";

  /* ---------------- ห้องทำงาน (ภาพพื้นหลัง + ป้ายสถานะสด) ---------------- */
  // พิกัดในภาพ assets/room.jpg (1152×1560) — ป้ายของจริงวางทับป้ายในภาพ
  const ROOM_W = 1152, ROOM_H = 1560;
  const SEATS = [
    { tag: { x: 246, y: 428, w: 220, h: 122 }, hit: { x: 160, y: 550, w: 345, h: 225 } }, // หลังซ้าย
    { tag: { x: 694, y: 428, w: 196, h: 122 }, hit: { x: 635, y: 550, w: 315, h: 225 } }, // หลังขวา
    { tag: { x: 214, y: 768, w: 230, h: 128 }, hit: { x: 155, y: 900, w: 350, h: 315 } }, // หน้าซ้าย
    { tag: { x: 706, y: 768, w: 240, h: 128 }, hit: { x: 645, y: 900, w: 350, h: 315 } }, // หน้าขวา
  ];
  const BOARD = { x: 192, y: 98, w: 764, h: 292 };

  function seatTag(s, seat, i) {
    const st = deskStatus(s);
    const col = STATUS_COLOR[st.k];
    const t = seat.tag, w = Math.max(t.w, 244), h = t.h, y = t.y;
    const cx = t.x + t.w / 2, x = cx - w / 2;
    const name = s.name.length > 8 ? s.name.slice(0, 8) + "…" : s.name;
    const icon = st.k === "late" ? " ⚠" : (st.k === "ok" || st.k === "sent") ? " ✓" : "";
    const fs = name.length > 5 ? 40 : 52;
    return `<g class="desk-hit" data-staff="${esc(s.id)}" data-seat="${i}" tabindex="0" role="button" aria-label="${esc(s.name)}: ${esc(st.text)}">
      <rect x="${seat.hit.x}" y="${seat.hit.y}" width="${seat.hit.w}" height="${seat.hit.h}" fill="transparent"/>
      <g class="tag ${st.k}">
        <rect class="tag-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#0c1438" stroke="${col}" stroke-width="4" style="color:${col}"/>
        <rect x="${x + 14}" y="${y + 10}" width="${w - 28}" height="5" rx="2.5" fill="${s.color}"/>
        <text x="${cx}" y="${y + 66}" text-anchor="middle" font-family="Prompt" font-weight="600" font-size="${fs}" fill="#f2f6ff">${esc(name)}</text>
        <text x="${cx}" y="${y + h - 18}" text-anchor="middle" font-family="Prompt" font-size="24" fill="${col}">${esc(st.text)}${icon}</text>
        <text x="${x + w - 14}" y="${y + 36}" text-anchor="end" font-family="Prompt" font-size="20" fill="#9aa8d6">${st.done}/${st.total}</text>
      </g>
    </g>`;
  }

  function boardPanel() {
    const { x, y, w, h } = BOARD;
    // ระดับประเด็นเน้นย้ำของเดือนที่ดู
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    FOCUS.forEach(f => {
      const r = state.reports.find(q => q.focus === f.k && state.staff.some(s => s.id === q.staffId));
      const l = r && levelOf(r); if (l) counts[l]++;
    });
    const all = state.reports.filter(r => state.staff.some(s => s.id === r.staffId));
    const done = all.filter(r => ["sent", "ok"].includes(effective(r))).length;
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    const desc = { A: "ดีมาก", B: "ดี", C: "พอใช้", D: "ต้องเร่ง" };
    const tw = 168, gap = (w - 40 - tw * 4) / 3;
    const tiles = LEVELS.map((l, i) => {
      const tx = x + 20 + i * (tw + gap), ty = y + 58;
      return `<rect x="${tx}" y="${ty}" width="${tw}" height="138" rx="16" fill="${LEVEL_COLOR[l]}" fill-opacity=".16" stroke="${LEVEL_COLOR[l]}" stroke-width="3"/>
        <circle cx="${tx + 34}" cy="${ty + 34}" r="22" fill="${LEVEL_COLOR[l]}"/>
        <text x="${tx + 34}" y="${ty + 44}" text-anchor="middle" font-family="Prompt" font-weight="600" font-size="28" fill="#04122e">${l}</text>
        <text x="${tx + tw - 18}" y="${ty + 52}" text-anchor="end" font-family="Prompt" font-weight="600" font-size="44" fill="#fff">${counts[l]}</text>
        <text x="${tx + tw / 2}" y="${ty + 112}" text-anchor="middle" font-family="Prompt" font-size="24" fill="${LEVEL_COLOR[l]}">${desc[l]}</text>`;
    }).join("");
    const by = y + 222, bx = x + 330, bw = w - 330 - 100;
    return `<g class="desk-hit" data-focus-jump="1" tabindex="0" role="button" aria-label="ดูประเด็นเน้นย้ำ">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#0a1233" stroke="#3de0ff" stroke-opacity=".6" stroke-width="2"/>
      <text x="${x + 22}" y="${y + 40}" font-family="Prompt" font-weight="600" font-size="26" fill="#bff4ff">ระดับประเด็นเน้นย้ำ · ${TH_MON[viewDate.getMonth()]} ${String(viewDate.getFullYear() + 543).slice(2)}</text>
      ${tiles}
      <text x="${x + 22}" y="${by + 26}" font-family="Prompt" font-size="25" fill="#dbe4ff">รายงานประจำเดือน: ${pct}%</text>
      <rect x="${bx}" y="${by + 4}" width="${bw}" height="28" rx="14" fill="#14214f" stroke="#2a3b7d"/>
      <rect x="${bx}" y="${by + 4}" width="${Math.max(0, bw * pct / 100)}" height="28" rx="14" fill="url(#barGrad)"/>
      <text x="${x + w - 22}" y="${by + 26}" text-anchor="end" font-family="Prompt" font-size="25" fill="#3de0ff">${done}/${all.length}</text>
    </g>`;
  }

  function renderRoom() {
    const svg = $("#room");
    if (!svg.querySelector("#tagLayer")) {
      svg.setAttribute("viewBox", `0 0 ${ROOM_W} ${ROOM_H}`);
      svg.innerHTML = `<defs><linearGradient id="barGrad" x1="0" x2="1"><stop offset="0" stop-color="#3d7bff"/><stop offset="1" stop-color="#3de0ff"/></linearGradient></defs>
        <image href="assets/room.jpg" x="0" y="0" width="${ROOM_W}" height="${ROOM_H}"/>
        <g class="desk-hit" data-boss="1" tabindex="0" role="button" aria-label="ตั้งค่าห้องคุมงาน"><rect x="350" y="1190" width="450" height="320" fill="transparent"/></g>
        <g id="boardLayer"></g>
        <g id="officer" class="desk-hit" data-boss="1" aria-hidden="true">
          <ellipse cx="0" cy="-4" rx="70" ry="16" fill="rgba(0,0,0,.35)"/>
          <g class="officer-body"><image href="assets/officer.png" x="${-OFF.w / 2}" y="${-OFF.h}" width="${OFF.w}" height="${OFF.h}"/></g>
        </g>
        <g id="tagLayer"></g>
        <g id="bubbleLayer" pointer-events="none"></g>`;
      placeOfficer(officer.x, officer.y);
    }
    svg.querySelector("#boardLayer").innerHTML = boardPanel();
    svg.querySelector("#tagLayer").innerHTML = state.staff.slice(0, MAX_STAFF).map((st, i) => seatTag(st, SEATS[i], i)).join("");
  }

  /* ---------------- พัฒนาการอำเภอเดินตรวจงาน ---------------- */
  const OFF = { w: 182, h: 468 };                // ขนาดภาพตัวละคร
  const HOME = { x: 585, y: 1089 };              // ตำแหน่งเดิมในภาพ (กึ่งกลางเท้า)
  const AISLE_X = 575;
  const STAND = [ { x: 520, y: 830 }, { x: 632, y: 830 }, { x: 520, y: 1160 }, { x: 632, y: 1160 } ];
  const officer = { x: HOME.x, y: HOME.y, busy: false, token: 0, patrolIdx: 0 };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scaleAt = y => 0.86 + (y - 830) / (1160 - 830) * 0.16;

  function placeOfficer(x, y) {
    officer.x = x; officer.y = y;
    const g = document.getElementById("officer");
    if (g) g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scaleAt(y).toFixed(3)})`);
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function walkTo(tx, ty, token) {
    const pts = [[officer.x, officer.y]];
    if (Math.abs(officer.y - ty) > 20) { pts.push([AISLE_X, officer.y]); pts.push([AISLE_X, ty]); }
    pts.push([tx, ty]);
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d > 0.5) segs.push({ a: pts[i - 1], b: pts[i], d });
    }
    const total = segs.reduce((t, sg) => t + sg.d, 0);
    if (!total) return Promise.resolve();
    if (reduceMotion) { placeOfficer(tx, ty); return Promise.resolve(); }
    const dur = Math.max(500, total / 0.32); // ~320 หน่วยต่อวินาที
    const body = document.querySelector("#officer .officer-body");
    body && body.classList.add("walking");
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (token !== officer.token) { body && body.classList.remove("walking"); return res(); }
        let dist = Math.min(1, (now - t0) / dur) * total;
        let i = 0; while (i < segs.length - 1 && dist > segs[i].d) { dist -= segs[i].d; i++; }
        const sg = segs[i], k = Math.min(1, dist / sg.d);
        placeOfficer(sg.a[0] + (sg.b[0] - sg.a[0]) * k, sg.a[1] + (sg.b[1] - sg.a[1]) * k);
        if (now - t0 < dur) requestAnimationFrame(step);
        else { placeOfficer(tx, ty); body && body.classList.remove("walking"); res(); }
      };
      requestAnimationFrame(step);
    });
  }

  // grow: "right" = กล่องยื่นไปทางขวาของจุดชี้, "left" = ยื่นไปทางซ้าย
  function bubble(x, y, text, kind, grow) {
    const layer = document.getElementById("bubbleLayer"); if (!layer) return;
    const w = Math.min(560, 40 + [...text].length * 21), h = 64;
    const want = grow === "right" ? x - 40 : grow === "left" ? x - w + 40 : x - w / 2;
    const bx = Math.max(12, Math.min(ROOM_W - w - 12, want));
    const by = y - h - 18;
    const tail = Math.max(bx + 24, Math.min(bx + w - 24, x));
    const fill = kind === "staff" ? "#fff4d6" : "#ffffff", stroke = kind === "staff" ? "#ffb43d" : "#3de0ff";
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "bubble " + (kind || ""));
    g.innerHTML = `<rect x="${bx}" y="${by}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="4"/>
      <path d="M${tail - 14},${by + h - 2} L${tail},${by + h + 18} L${tail + 14},${by + h - 2}z" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="${tail - 16}" y="${by + h - 6}" width="32" height="6" fill="${fill}"/>
      <text x="${bx + w / 2}" y="${by + 42}" text-anchor="middle" font-family="Prompt" font-size="28" font-weight="500" fill="#14214f">${esc(text)}</text>`;
    layer.appendChild(g);
    return g;
  }
  function clearBubbles() { const l = document.getElementById("bubbleLayer"); if (l) l.innerHTML = ""; }

  function talkLines(s) {
    const rs = reportsOf(s.id);
    const short = t => t.replace(/^ประเด็นที่ \d+ \(([^)]+)\) .*/, "ประเด็น $1").replace(/^รายงาน/, "").slice(0, 16);
    const late = rs.find(r => effective(r) === "late");
    if (late) return [`${s.name} ${short(late.title)} ค้างอยู่นะ`, "กำลังเร่งเลยครับ/ค่ะ!"];
    const doing = rs.find(r => entry(r).s === "doing");
    if (doing) return [`${short(doing.title)} ใกล้เสร็จยัง?`, "อีกนิดเดียว!"];
    const todo = rs.find(r => entry(r).s === "none");
    if (todo) return [`อย่าลืม ${short(todo.title)} ส่ง ${fmtDue(todo)}`, "รับทราบ!"];
    if (rs.length && rs.every(r => entry(r).s === "ok")) return [`ขอบคุณ ${s.name} ตรวจครบแล้ว 🎉`, "ยินดีครับ/ค่ะ"];
    if (rs.length) return [`${s.name} ส่งครบแล้ว เยี่ยมมาก 👍`, "ขอบคุณครับ/ค่ะ"];
    return [`${s.name} ช่วงนี้เป็นยังไงบ้าง?`, "สบายดี!"];
  }

  async function visit(i, opts = {}) {
    const s = state.staff[i]; if (!s || i >= MAX_STAFF) return;
    const token = ++officer.token;
    officer.busy = true;
    clearBubbles();
    await walkTo(STAND[i].x, STAND[i].y, token);
    if (token !== officer.token) return;
    const [say, reply] = talkLines(s);
    const sc = scaleAt(officer.y);
    const leftSeat = i % 2 === 0;
    bubble(officer.x, officer.y - OFF.h * sc + 10, say, "", leftSeat ? "right" : "left");
    const tagG = document.querySelector(`#tagLayer [data-seat="${i}"] .tag`);
    tagG && tagG.classList.add("nudge");
    if (opts.then) { await sleep(500); if (token === officer.token) opts.then(); }
    await sleep(1300);
    if (token !== officer.token) return;
    const t = SEATS[i].tag;
    bubble(leftSeat ? t.x + 70 : t.x + t.w - 70, t.y - 4, reply, "staff", leftSeat ? "left" : "right");
    await sleep(2200);
    if (token !== officer.token) return;
    clearBubbles();
    tagG && tagG.classList.remove("nudge");
    officer.busy = false;
  }

  // เดินตรวจเองอัตโนมัติ: ไปหาคนที่มีงานค้างก่อน
  async function patrol() {
    while (true) {
      await sleep(4500);
      if (document.hidden || officer.busy || (sheet && sheet.open)) continue;
      const staff = state.staff.slice(0, MAX_STAFF);
      if (!staff.length) continue;
      const lateIdx = staff.map((s, i) => deskStatus(s).k === "late" ? i : -1).filter(i => i >= 0);
      const pool = lateIdx.length ? lateIdx : staff.map((_, i) => i);
      const i = pool[officer.patrolIdx++ % pool.length];
      await visit(i);
      if (officer.busy) continue;
      // กลับที่เดิมบ้าง
      if (officer.patrolIdx % pool.length === 0) {
        const tk = ++officer.token; await walkTo(HOME.x, HOME.y, tk);
      }
    }
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

  function fiscalMonths() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const fyStart = m >= 9 ? y : y - 1; // ปีงบประมาณเริ่ม ต.ค.
    return { fy: fyStart + 1 + 543, list: Array.from({ length: 12 }, (_, i) => new Date(fyStart, 9 + i, 1)) };
  }

  function renderFocus() {
    const { fy, list } = fiscalMonths();
    const curKey = mk();
    const rows = FOCUS.map(f => {
      const r = state.reports.find(x => x.focus === f.k && state.staff.some(s => s.id === x.staffId));
      return { f, r, lv: r ? levelOf(r) : "", eff: r ? effective(r) : "none" };
    });
    const counts = { A: 0, B: 0, C: 0, D: 0, "": 0 };
    rows.forEach(x => counts[x.lv]++);
    const staffOpts = sel => `<option value="">— ยังไม่มีผู้รับผิดชอบ —</option>` +
      state.staff.map(s => `<option value="${esc(s.id)}" ${s.id === sel ? "selected" : ""}>${esc(s.name)}</option>`).join("");

    const cards = rows.map(({ f, r, lv, eff }) => {
      const owner = r && state.staff.find(s => s.id === r.staffId);
      const strip = list.map(d => {
        const key = monthKey(d), l = r ? levelOf(r, key) : "";
        return `<span class="mcell ${key === curKey ? "cur" : ""}" title="${TH_MONTHS[d.getMonth()]}" style="${l ? `--lc:${LEVEL_COLOR[l]}` : ""}"><i>${TH_MON[d.getMonth()].replace(/\./g, "")}</i><b>${l || "·"}</b></span>`;
      }).join("");
      return `<article class="fcard" ${owner ? `data-staff="${esc(owner.id)}"` : ""} style="--c:${owner ? owner.color : "#4a5585"}">
        <div class="fhead">
          <span class="fcode">${f.no ? `ประเด็นที่ ${f.no} · ` : ""}${esc(f.code)}</span>
          <span class="flevel" style="${lv ? `--lc:${LEVEL_COLOR[lv]}` : ""}" aria-label="ระดับ ${lv || "ยังไม่ประเมิน"}">${lv || "–"}</span>
        </div>
        <h3>${esc(f.title)}</h3>
        <div class="fmeta">
          <select data-focus-owner="${f.k}" aria-label="ผู้รับผิดชอบ ${esc(f.title)}">${staffOpts(owner && owner.id)}</select>
          ${r ? `<span class="${pillClass(eff)}">${esc(eff === "late" ? dueText(r) : STATUS_LABEL[eff])}</span>` : ""}
        </div>
        <div class="strip" aria-label="ระดับรายเดือน ปีงบประมาณ ${fy}">${strip}</div>
      </article>`;
    }).join("");

    const ranked = rows.filter(x => x.r).slice().sort((a, b) => (LEVEL_SCORE[b.lv] || 0) - (LEVEL_SCORE[a.lv] || 0));
    const rankItem = (x, i) => `<li><span class="rk-no">${i + 1}</span><span class="rk-t">${x.f.no ? `${x.f.no}. ` : ""}${esc(x.f.code)} <small>${esc(x.f.title)}</small></span><span class="rk-l" style="${x.lv ? `--lc:${LEVEL_COLOR[x.lv]}` : ""}">${x.lv || "–"}</span></li>`;
    const urgent = rows.filter(x => x.r && (x.lv === "C" || x.lv === "D" || x.eff === "late"));

    $("#focus").innerHTML = `
      <div class="focus-head">
        <div><h2>รายงานผลการดำเนินงานประเด็นเน้นย้ำ</h2>
          <p class="small">ผลการดำเนินงานเดือน${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543} · ปีงบประมาณ ${fy} · แตะการ์ดเพื่อบันทึกสถานะและระดับ</p></div>
        <div class="lv-count">${LEVELS.map(l => `<span style="--lc:${LEVEL_COLOR[l]}"><b>${l}</b>${counts[l]}</span>`).join("")}<span class="none"><b>–</b>${counts[""]}</span></div>
      </div>
      <div class="focus-body">
        <div class="fgrid">${cards}</div>
        <aside class="rank">
          <h3>อันดับประเด็น (เดือนนี้)</h3>
          <ol class="rk">${ranked.map(rankItem).join("") || `<li class="empty">ยังไม่มีข้อมูล</li>`}</ol>
          <h3 class="warn">ต้องเร่งติดตาม</h3>
          <ol class="rk">${urgent.length ? urgent.map((x, i) => rankItem(x, i)).join("") : `<li class="empty">ไม่มีประเด็นที่ต้องเร่ง</li>`}</ol>
        </aside>
      </div>`;
  }

  function renderAll() {
    renderHeader(); renderSummary(); renderRoom(); renderStaffList(); renderDueList(); renderLog(); renderFocus();
  }

  /* ---------------- staff sheet ---------------- */
  const sheet = $("#sheet"), form = $("#sheetForm");
  let openStaffId = null;

  // แตะเจ้าหน้าที่: พัฒนาการอำเภอเดินไปหา แล้วเปิดรายละเอียด
  function goToStaff(id, fromRoom) {
    const i = state.staff.findIndex(x => x.id === id);
    if (i < 0 || i >= MAX_STAFF) return openStaff(id);
    if (fromRoom) visit(i, { then: () => openStaff(id) });
    else { openStaff(id); visit(i); }
  }

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
              <div><div class="report-title">${r.focus ? `<span class="focus-badge">เน้นย้ำ</span> ` : ""}${esc(r.title)}</div>
                <div class="report-due">กำหนดส่ง ${fmtDue(r)} (ทุกวันที่ ${r.dueDay})${late ? ` · <span style="color:var(--s-late)">${esc(dueText(r))}</span>` : dueText(r) ? ` · ${esc(dueText(r))}` : ""}</div></div>
              <button type="button" class="mini-del" data-del="${esc(r.id)}" aria-label="ลบรายงาน ${esc(r.title)}">×</button>
            </div>
            <div class="seg" role="group" aria-label="สถานะ">
              ${STATUSES.map(x => `<button type="button" class="p-${x.k}" data-set="${x.k}" aria-pressed="${e.s === x.k}">${x.label}</button>`).join("")}
            </div>
            ${r.focus ? `<div class="lvl-row"><span class="small">ระดับผลการดำเนินงานเดือนนี้</span><div class="lvl-seg" role="group" aria-label="ระดับ">
              ${LEVELS.map(l => `<button type="button" data-level="${l}" style="--lc:${LEVEL_COLOR[l]}" aria-pressed="${e.level === l}">${l}</button>`).join("")}
            </div></div>` : ""}
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
    const lv = e.target.closest("[data-level]");
    if (lv && s) {
      const r = state.reports.find(x => x.id === lv.closest("[data-report]").dataset.report);
      setLevel(r, lv.dataset.level);
      renderStaffSheet(); renderAll();
      toast(levelOf(r) ? `บันทึกระดับ ${levelOf(r)} แล้ว` : "ล้างระดับแล้ว");
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
      state = migrate(data); save(); renderAll(); toast("นำเข้าข้อมูลแล้ว");
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
    if (sheet.contains(e.target) || e.target.closest("select")) return;
    const hit = e.target.closest("[data-staff]");
    if (hit) return goToStaff(hit.dataset.staff, !!e.target.closest("#room"));
    if (e.target.closest("[data-boss]")) return openSettings();
    if (e.target.closest("[data-focus-jump]")) return $("#focus").scrollIntoView({ behavior: "smooth" });
  });
  $("#room").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const hit = e.target.closest("[data-staff],[data-boss],[data-focus-jump]");
    if (!hit) return;
    e.preventDefault();
    if (hit.dataset.focusJump) return $("#focus").scrollIntoView({ behavior: "smooth" });
    hit.dataset.staff ? goToStaff(hit.dataset.staff, true) : openSettings();
  });
  sheet.addEventListener("click", e => { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener("close", () => { openStaffId = null; });
  $("#focus").addEventListener("change", e => {
    const k = e.target.dataset.focusOwner; if (!k) return;
    const f = FOCUS.find(x => x.k === k);
    const sid = e.target.value;
    let r = state.reports.find(x => x.focus === k);
    if (!sid) { if (r) state.reports = state.reports.filter(x => x !== r); }
    else if (r) r.staffId = sid;
    else state.reports.push({ id: uid(), staffId: sid, title: focusTitle(f), dueDay: f.day, focus: k });
    save(); renderAll(); toast("เปลี่ยนผู้รับผิดชอบแล้ว");
  });
  $("#prevMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); renderAll(); };
  $("#nextMonth").onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); renderAll(); };
  $("#settingsBtn").onclick = openSettings;
  $("#exportBtn").onclick = exportData;

  // รีเฟรชสถานะเลยกำหนดเมื่อข้ามวัน
  let lastDay = new Date().getDate();
  setInterval(() => { if (new Date().getDate() !== lastDay) { lastDay = new Date().getDate(); renderAll(); } }, 60000);

  save();
  renderAll();
  patrol();
})();
