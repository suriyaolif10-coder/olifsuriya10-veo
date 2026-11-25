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
    // CDD Focus ปีงบประมาณ 2570 — เริ่มรายงานครั้งแรก พ.ย. 2569
    { k: "f8", no: 0, code: "CDD Focus 2570", title: "ยกระดับการให้บริการ OTOP One Stop Service", owner: 1, ownerName: "นัทสึ", day: 25, start: "2026-11", kind: "oss" },
  ];
  // งานเฉพาะครั้ง (ไม่ซ้ำทุกเดือน) ที่ได้รับแจ้งจากจังหวัด — once = เดือนที่ต้องทำ
  const ONE_OFF = [
    { key: "debt-2026-11", ownerName: "ลีฟ", owner: 3, once: "2026-11", dueDay: 27,
      title: "ทบทวนรายงานภาวะหนี้สิน (ศูนย์ข้อมูลกลาง)",
      desc: "ตรวจสอบรายงานภาวะหนี้สินรายหมู่บ้าน · มีแก้ไข → แจ้งจังหวัดโดยด่วน · ไม่มีแก้ไข → เข้าไปยืนยันในระบบ cddfund.cloud ระดับอำเภอ",
      link: "https://cddfund.cloud" },
    { key: "knn-2026-11", ownerName: "พราว", owner: 2, once: "2026-11", dueDay: 30,
      title: "โคก หนอง นา Next Step: คลิป Story Telling + ประชาสัมพันธ์ศูนย์เรียนรู้เพื่อการท่องเที่ยว",
      desc: "ประเด็นเน้นย้ำ พ.ย. 69 (1 อำเภอ 1 ศูนย์เรียนรู้ฯ) · ระดับ A = มีคลิป Story Telling 3–5 นาที และเผยแพร่ผ่านสื่อออนไลน์ 3 สื่อขึ้นไป · รายงานในแบบฟอร์มของจังหวัด ภายใน 30 พ.ย. 69",
      link: "https://docs.google.com/spreadsheets/d/1-O98O-oIrcCbuxNu6Uf4cBLOcNyZJKyRblm2ZJNIdjU/edit?gid=671007010#gid=671007010",
      fields: "knn" },
  ];
  // ช่องกรอกของงานแต่ละแบบ
  const FIELD_SETS = {
    knn: [
      { k: "owner", label: "ชื่อเจ้าของศูนย์เรียนรู้ฯ" },
      { k: "addr", label: "ที่อยู่ศูนย์เรียนรู้ฯ" },
      { k: "type", label: "ประเภท (เช่น ท่องเที่ยวเชิงเกษตร)" },
      { k: "mins", label: "ความยาวคลิป (นาที)", type: "number" },
      { k: "video", label: "ลิงก์วิดีโอ Story Telling", type: "url", wide: true },
      { k: "pr1", label: "ลิงก์ประชาสัมพันธ์ (1)", type: "url", wide: true },
      { k: "pr2", label: "ลิงก์ประชาสัมพันธ์ (2)", type: "url", wide: true },
      { k: "pr3", label: "ลิงก์ประชาสัมพันธ์ (3)", type: "url", wide: true },
      { k: "other", label: "สื่ออื่นๆ (หนังสือพิมพ์ ข่าวท้องถิ่น จอประชาสัมพันธ์)", wide: true },
    ],
  };
  // ประเมินระดับเบื้องต้นของ โคก หนอง นา จากข้อมูลที่กรอก (เกณฑ์ A ตามหนังสือแจ้ง)
  function knnCheck(v) {
    const media = ["pr1", "pr2", "pr3"].filter(k => (v[k] || "").trim()).length + ((v.other || "").trim() ? 1 : 0);
    const mins = parseFloat(v.mins);
    const hasVideo = !!(v.video || "").trim();
    const lenOk = mins >= 3 && mins <= 5;
    const isA = hasVideo && lenOk && media >= 3;
    const miss = [];
    if (!hasVideo) miss.push("ลิงก์วิดีโอ");
    if (!lenOk) miss.push("คลิปยาว 3–5 นาที");
    if (media < 3) miss.push(`สื่ออีก ${3 - media} สื่อ`);
    return { media, isA, text: isA ? "ครบเกณฑ์ระดับ A" : `ยังขาด: ${miss.join(", ")}` };
  }
  // เป้าหมาย OTOP One Stop Service (ตามแบบรายงานของกรมฯ ปี 2570)
  const OSS_TARGET = {
    "2027-01": ["apply", 5], "2027-02": ["apply", 10], "2027-03": ["apply", 15],
    "2027-04": ["success", 70], "2027-05": ["success", 75], "2027-06": ["success", 80], "2027-07": ["success", 85], "2027-08": ["success", 90],
  };
  const focusTitle = f => f.no ? `ประเด็นที่ ${f.no} (${f.code}) ${f.title}` : f.kind === "oss" ? `${f.code}: ${f.title}` : f.title;
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
      { id: uid(), name: "นัทสึ", color: PALETTE[1] },
      { id: uid(), name: "พราว", color: PALETTE[2] },
      { id: uid(), name: "ลีฟ", color: PALETTE[3] },
    ];
    const R = (i, title, dueDay, focus) => ({ id: uid(), staffId: staff[i].id, title, dueDay, ...(focus ? { focus } : {}) });
    const F = k => { const f = FOCUS.find(x => x.k === k); return { ...R(f.owner, focusTitle(f), f.day, k), ...(f.start ? { start: f.start } : {}) }; };
    // เริ่มต้นเฉพาะงานที่ได้รับแจ้งจริง (งานเฉพาะครั้งเพิ่มใน migrate จาก ONE_OFF)
    const reports = FOCUS.map(f => F(f.k));
    const months = {};
    return {
      version: 1,
      office: { title: "ห้องคุมงาน สพอ.", sub: "สำนักงานพัฒนาชุมชนอำเภอ · รายงานประจำเดือน" },
      staff, reports, months, log: [], focusV: 2, namesV: 2, cleanV: 1,
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
    if (d.namesV < 2) {
      // ผู้รับผิดชอบ OTOP One Stop Service คือ "นัทสึ" (ชื่อเต็มของ นัท)
      const n = d.staff.find(x => x.name === "นัท");
      if (n && !d.staff.some(x => x.name === "นัทสึ")) n.name = "นัทสึ";
      d.namesV = 2;
    }
    d.oneOff = d.oneOff || [];
    ONE_OFF.forEach(t => {
      if (d.oneOff.includes(t.key)) return;
      const owner = d.staff.find(x => x.name === t.ownerName) || d.staff[t.owner] || d.staff[0];
      if (owner) d.reports.push({ id: uid(), staffId: owner.id, title: t.title, dueDay: t.dueDay, once: t.once, desc: t.desc, link: t.link, ...(t.fields ? { fields: t.fields } : {}) });
      d.oneOff.push(t.key);
    });
    // ล้างรายงานชุดเก่า/ตัวอย่างออกทั้งหมด เหลือเฉพาะงานที่ได้รับแจ้งจริง (25 พ.ย. 69)
    if (!d.cleanV) {
      const keep = r => FOCUS.some(f => f.k === r.focus) || (r.once && ONE_OFF.some(t => t.title === r.title));
      d.reports = d.reports.filter(keep);
      const ids = new Set(d.reports.map(r => r.id));
      Object.keys(d.months).forEach(m => {
        Object.keys(d.months[m]).forEach(id => { if (!ids.has(id)) delete d.months[m][id]; });
        if (!Object.keys(d.months[m]).length) delete d.months[m];
      });
      d.log = [];
      d.focusV = 0;
      d.cleanV = 1;
    }
    if (d.focusV >= 2) return d;
    FOCUS.forEach(f => {
      if (d.reports.some(r => r.focus === f.k)) return;
      const old = f.match && d.reports.find(r => !r.focus && r.title === f.match);
      if (old) { old.focus = f.k; old.title = focusTitle(f); return; }
      const owner = (f.ownerName && d.staff.find(x => x.name === f.ownerName)) || d.staff[f.owner] || d.staff[0];
      if (owner) d.reports.push({ id: uid(), staffId: owner.id, title: focusTitle(f), dueDay: f.day, focus: f.k, ...(f.start ? { start: f.start } : {}) });
    });
    d.focusV = 2;
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
  // รายงานที่เริ่มทีหลัง (มี start) จะไม่นับในเดือนก่อนหน้า
  const isActive = r => r.once ? mk() === r.once : (!r.start || mk() >= r.start);
  const liveReports = () => state.reports.filter(r => isActive(r) && state.staff.some(s => s.id === r.staffId));
  const focusActive = f => !f.start || mk() >= f.start;
  const reportsOf = sid => state.reports.filter(r => r.staffId === sid && isActive(r)).sort((a, b) => a.dueDay - b.dueDay);

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

  // ข้อมูลตัวเลขของรายงาน OTOP One Stop Service
  function ossInfo(r, key = mk()) {
    const v = (((state.months[key] || {})[r.id]) || {}).v || {};
    const total = +r.total || 0, apply = v.apply === "" || v.apply == null ? null : +v.apply, success = v.success === "" || v.success == null ? null : +v.success;
    const applyPct = total && apply != null ? apply / total * 100 : null;
    const successPct = apply && success != null ? success / apply * 100 : null;
    const tg = OSS_TARGET[key];
    let target = "ช่วงเตรียมการ/ประชาสัมพันธ์ (ยังไม่มีเป้าตัวเลข)", met = null;
    if (tg && tg[0] === "apply") { target = `ผู้ยื่นคำร้องสะสม ≥ ร้อยละ ${tg[1]} ของผู้ประกอบการ${total ? ` (${Math.ceil(total * tg[1] / 100)} คน)` : ""}`; met = applyPct == null ? null : applyPct >= tg[1]; }
    if (tg && tg[0] === "success") { target = `ผลสำเร็จอย่างน้อย 1 ด้าน ≥ ร้อยละ ${tg[1]} ของผู้ยื่นคำร้อง${apply ? ` (${Math.ceil(apply * tg[1] / 100)} คน)` : ""}`; met = successPct == null ? null : successPct >= tg[1]; }
    return { v, total, apply, success, applyPct, successPct, target, met };
  }
  const pctTxt = x => x == null ? "-" : `${x.toFixed(1)}%`;
  function ossSummary(r) {
    const o = ossInfo(r);
    return `ผู้ประกอบการ ${o.total || "-"} คน · ยื่นคำร้อง ${o.apply ?? "-"} คน (${pctTxt(o.applyPct)}) · สำเร็จ ${o.success ?? "-"} คน (${pctTxt(o.successPct)})`;
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

  /* ---------------- อารมณ์เจ้าหน้าที่ตามจำนวนงานค้าง ---------------- */
  function moodOf(s) {
    const rs = reportsOf(s.id);
    const late = rs.filter(r => effective(r) === "late").length;
    if (late >= 3) return { k: "panic", label: "ตื่นตระหนก", late };
    if (late === 2) return { k: "stressed", label: "เครียด", late };
    if (late === 1) return { k: "worried", label: "กังวล", late };
    if (rs.length && rs.every(r => ["sent", "ok"].includes(entry(r).s))) return { k: "happy", label: "สบายใจ", late };
    return { k: "calm", label: "ปกติ", late };
  }
  const MOOD_COLOR = { happy: "#37d67a", calm: "#3da5ff", worried: "#ffb43d", stressed: "#ff8a3d", panic: "#ff4d6a" };

  // หน้าการ์ตูนเล็กๆ วาดเองด้วย SVG (ไม่ต้องพึ่งฟอนต์อีโมจิ) — หน่วยรัศมี 10
  function faceMarkup(k) {
    const eyesDot = `<circle cx="-3.6" cy="-1.5" r="1.4" fill="#3a2a1a"/><circle cx="3.6" cy="-1.5" r="1.4" fill="#3a2a1a"/>`;
    const parts = {
      happy: `<path d="M-5.5,-1 q2,-3 4,0 M1.5,-1 q2,-3 4,0" stroke="#3a2a1a" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M-5,2.5 q5,6 10,0 z" fill="#3a2a1a"/><circle cx="-6.5" cy="2.5" r="1.6" fill="#ff8aa8" opacity=".7"/><circle cx="6.5" cy="2.5" r="1.6" fill="#ff8aa8" opacity=".7"/>`,
      calm: `${eyesDot}<path d="M-3.5,3.5 q3.5,3 7,0" stroke="#3a2a1a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
      worried: `${eyesDot}<path d="M-6,-5 l4,-1.2 M6,-5 l-4,-1.2" stroke="#3a2a1a" stroke-width="1.2" stroke-linecap="round"/><path d="M-3.5,5 q1.75,-2 3.5,0 q1.75,2 3.5,0" stroke="#3a2a1a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
      stressed: `<path d="M-9,-3 a10,10 0 0 1 18,0 z" fill="#7fb6ff" opacity=".55"/>${eyesDot}<path d="M-6,-5.5 l4,1.4 M6,-5.5 l-4,1.4" stroke="#3a2a1a" stroke-width="1.2" stroke-linecap="round"/><path d="M-4,6 q4,-4 8,0" stroke="#3a2a1a" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
      panic: `<path d="M-9.5,-1 a10,10 0 0 1 19,0 z" fill="#6f9dff" opacity=".7"/><circle cx="-3.8" cy="-2" r="2.6" fill="#fff" stroke="#3a2a1a" stroke-width=".9"/><circle cx="3.8" cy="-2" r="2.6" fill="#fff" stroke="#3a2a1a" stroke-width=".9"/><circle cx="-3.8" cy="-2" r=".9" fill="#3a2a1a"/><circle cx="3.8" cy="-2" r=".9" fill="#3a2a1a"/><ellipse cx="0" cy="5" rx="2.6" ry="3.2" fill="#3a2a1a"/>`,
    };
    return `<circle r="10" fill="#ffd45c" stroke="#e0a800" stroke-width=".8"/>${parts[k] || parts.calm}`;
  }
  const faceIcon = (k, size = 22) => `<svg class="face" width="${size}" height="${size}" viewBox="-11 -11 22 22" aria-hidden="true">${faceMarkup(k)}</svg>`;

  // ตำแหน่งภาพตัดของเจ้าหน้าที่แต่ละโต๊ะ (assets/staff1-4.png)
  const SPRITES = [
    { x: 278, y: 524, w: 176, h: 160 }, { x: 714, y: 538, w: 152, h: 146 },
    { x: 248, y: 879, w: 164, h: 168 }, { x: 748, y: 879, w: 164, h: 168 },
  ];
  function staffFx(i, m) {
    const sp = SPRITES[i];
    const hx = sp.x + sp.w * 0.5, top = sp.y + 14;
    const rx = sp.x + sp.w - 30; // ข้างหัวขวา
    let g = "", aura = "";
    if (m.k === "panic") aura += `<ellipse class="aura" cx="${hx}" cy="${sp.y + sp.h * 0.6}" rx="${sp.w * 0.62}" ry="${sp.h * 0.55}" fill="${MOOD_COLOR.panic}" opacity=".35"/>`;
    const drops = { worried: 1, stressed: 2, panic: 3 }[m.k] || 0;
    for (let d = 0; d < drops; d++) {
      const dx = rx + d * 14 - 6, dy = top + 30 + d * 8;
      g += `<path class="sweat" style="animation-delay:${d * -0.4}s" d="M${dx},${dy} q-10,17 0,23 q10,-6 0,-23z" fill="#8fd3ff" stroke="#3d8bd6" stroke-width="2"/>`;
    }
    if (m.k === "stressed" || m.k === "panic") {
      g += `<g class="lines" stroke="${MOOD_COLOR[m.k]}" stroke-width="4" stroke-linecap="round">
        <path d="M${sp.x + 18},${top + 4} l-14,-10"/><path d="M${sp.x + 10},${top + 22} l-16,-2"/><path d="M${sp.x + sp.w - 14},${top} l12,-12"/></g>`;
    }
    if (m.k === "panic") g += `<text class="lines" x="${sp.x - 22}" y="${top + 70}" font-family="Prompt" font-weight="700" font-size="40" fill="${MOOD_COLOR.panic}">!!</text>`;
    if (m.k === "happy") {
      g += `<g class="sparkle" fill="#ffe27a">
        <path d="M${sp.x + 10},${top + 10} l4,10 l10,4 l-10,4 l-4,10 l-4,-10 l-10,-4 l10,-4z"/>
        <path style="animation-delay:-.7s" d="M${sp.x + sp.w - 12},${top - 2} l3,7 l7,3 l-7,3 l-3,7 l-3,-7 l-7,-3 l7,-3z"/></g>`;
    }
    // หน้าอารมณ์ลอยเหนือหัว
    return { g, aura };
  }

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
        <g transform="translate(${x + 30},${y + 40}) scale(1.9)"><g class="mood-face">${faceMarkup(moodOf(s).k)}</g></g>
      </g>
    </g>`;
  }

  function boardPanel() {
    const { x, y, w, h } = BOARD;
    // ระดับประเด็นเน้นย้ำของเดือนที่ดู
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    FOCUS.filter(focusActive).forEach(f => {
      const r = liveReports().find(q => q.focus === f.k);
      const l = r && levelOf(r); if (l) counts[l]++;
    });
    const all = liveReports();
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
        <g id="auraLayer" pointer-events="none"></g>
        <g id="staffLayer">${SPRITES.map((sp, i) => `<g class="staff-sprite" data-seat-sprite="${i}"><image href="assets/staff${i + 1}.png" x="${sp.x}" y="${sp.y}" width="${sp.w}" height="${sp.h}"/></g>`).join("")}</g>
        <g id="fxLayer" pointer-events="none"></g>
        <g class="desk-hit" data-boss="1" tabindex="0" role="button" aria-label="ตั้งค่าห้องคุมงาน"><rect x="350" y="1190" width="450" height="320" fill="transparent"/></g>
        <g id="boardLayer"></g>
        <g id="officer" class="desk-hit" data-boss="1" aria-hidden="true">
          <ellipse cx="0" cy="-4" rx="70" ry="16" fill="rgba(0,0,0,.35)"/>
          <g id="offFlip">
            <g id="offLegR"><image href="assets/officer-legL.png" x="${-OFF.w / 2 + 33 + 44}" y="${-OFF.h + 250}" width="52" height="218"/></g>
            <g id="offLegL"><image href="assets/officer-legL.png" x="${-OFF.w / 2 + 33}" y="${-OFF.h + 250}" width="52" height="218"/></g>
            <g id="offTorso"><image href="assets/officer-torso.png" x="${-OFF.w / 2}" y="${-OFF.h}" width="182" height="273"/></g>
          </g>
        </g>
        <g id="tagLayer"></g>
        <g id="bubbleLayer" pointer-events="none"></g>`;
      placeOfficer(officer.x, officer.y);
      setRig(0, 0);
    }
    svg.querySelector("#boardLayer").innerHTML = boardPanel();
    const staff4 = state.staff.slice(0, MAX_STAFF);
    svg.querySelectorAll("[data-seat-sprite]").forEach(g => {
      const s = staff4[+g.dataset.seatSprite];
      g.setAttribute("class", "staff-sprite " + (s ? "mood-" + moodOf(s).k : ""));
    });
    const fx = staff4.map((s, i) => staffFx(i, moodOf(s)));
    svg.querySelector("#auraLayer").innerHTML = fx.map(f => f.aura).join("");
    svg.querySelector("#fxLayer").innerHTML = fx.map(f => f.g).join("");
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

  // ท่าเดิน: ยกเท้าสลับ แกว่งขา ตัวขึ้นลงและเอียงเล็กน้อย หันตามทิศที่เดิน
  const HIP_L = [-33, -210], HIP_R = [11, -210];
  let facing = 0; // -1 ซ้าย, 1 ขวา, 0 เดินตรง
  function setRig(phase, amp) {
    const sn = Math.sin(phase);
    const liftL = Math.max(0, sn) * 20 * amp, liftR = Math.max(0, -sn) * 20 * amp;
    const swing = 7 * sn * amp;
    const bob = -Math.abs(Math.cos(phase)) * 6 * amp;
    const roll = 2.2 * sn * amp + 3 * facing * amp, sway = 2.5 * sn * amp; // เอนตัวไปทางที่เดิน
    const L = document.getElementById("offLegL"), R = document.getElementById("offLegR"), T = document.getElementById("offTorso"), F = document.getElementById("offFlip");
    if (!L) return;
    L.setAttribute("transform", `translate(0,${(-liftL).toFixed(1)}) rotate(${swing.toFixed(2)},${HIP_L[0]},${HIP_L[1]})`);
    R.setAttribute("transform", `translate(0,${(-liftR).toFixed(1)}) rotate(${(-swing).toFixed(2)},${HIP_R[0]},${HIP_R[1]})`);
    T.setAttribute("transform", `translate(${sway.toFixed(1)},${bob.toFixed(1)}) rotate(${roll.toFixed(2)},0,-215)`);
  }

  function walkTo(tx, ty, token) {
    // เดินตามทางเดิน: ออกมาที่ทางเดินกลาง เดินตามแนวทางเดิน แล้วค่อยเข้าไปที่โต๊ะ
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
    const dur = Math.max(700, total / 0.26);   // ความเร็วเดินปกติ
    const STRIDE = 58;                           // ระยะต่อก้าว
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        if (token !== officer.token) { setRig(0, 0); return res(); }
        const t = Math.min(1, (now - t0) / dur);
        const prog = 0.5 - 0.5 * Math.cos(Math.PI * t);      // ออกตัวช้า-หยุดนุ่ม
        const amp = Math.min(1, Math.sin(Math.PI * t) * 2.2);
        let dist = prog * total;
        const travelled = dist;
        let i = 0; while (i < segs.length - 1 && dist > segs[i].d) { dist -= segs[i].d; i++; }
        const sg = segs[i], k = Math.min(1, dist / sg.d);
        const dx = sg.b[0] - sg.a[0];
        facing = Math.abs(dx) > 8 ? (dx < 0 ? -1 : 1) : 0;
        placeOfficer(sg.a[0] + dx * k, sg.a[1] + (sg.b[1] - sg.a[1]) * k);
        setRig(travelled / STRIDE * Math.PI, amp);
        if (t < 1) requestAnimationFrame(step);
        else { placeOfficer(tx, ty); setRig(0, 0); res(); }
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
    const m = moodOf(s);
    if (m.k === "panic") return [`${s.name} ค้าง ${m.late} เรื่องแล้วนะ!`, "ช่วยด้วย งานท่วมแล้ว!!"];
    if (m.k === "stressed") return [`${s.name} ค้าง 2 เรื่อง ไหวไหม?`, "เครียดมาก แต่จะรีบส่ง!"];
    if (late) return [`${s.name} ${short(late.title)} ค้างอยู่นะ`, "ขอโทษครับ/ค่ะ จะรีบส่ง"];
    const doing = rs.find(r => entry(r).s === "doing");
    if (doing) return [`${short(doing.title)} ใกล้เสร็จยัง?`, "อีกนิดเดียว!"];
    const todo = rs.find(r => entry(r).s === "none");
    if (todo) return [`อย่าลืม ${short(todo.title)} ส่ง ${fmtDue(todo)}`, "รับทราบ!"];
    if (rs.length && rs.every(r => entry(r).s === "ok")) return [`ขอบคุณ ${s.name} ตรวจครบแล้ว`, "สบายใจสุดๆ!"];
    if (rs.length) return [`${s.name} ส่งครบแล้ว เยี่ยมมาก`, "เย้! สบายใจแล้ว"];
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
    const all = liveReports();
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
        ${faceIcon(moodOf(s).k, 26)}
        <span><span class="nm">${esc(s.name)}</span> <span class="mood-txt" style="color:${MOOD_COLOR[moodOf(s).k]}">${moodOf(s).label}</span>
          <span class="meta">${st.done}/${st.total} ส่งแล้ว${next ? ` · ถัดไป: ${esc(next.title)} (${fmtDue(next)})` : ""}</span>
          <span class="prog" style="display:block"><i style="width:${pct}%"></i></span></span>
        <span class="${pillClass(st.k)}">${esc(st.text)}</span>
      </button>`;
    }).join("");
  }

  function renderDueList() {
    const pending = liveReports()
      .filter(r => ["none", "doing"].includes(entry(r).s))
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
    const rows = FOCUS.filter(focusActive).map(f => {
      const r = liveReports().find(x => x.focus === f.k);
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
        ${f.kind === "oss" && r ? `<div class="small oss-card">${esc(ossSummary(r))}</div>` : ""}
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
    if (!$("#reportView").hidden) renderReport();
  }

  /* ---------------- หน้าสรุปเสนอผู้บังคับบัญชา (โทนสว่าง พิมพ์ได้) ---------------- */
  const STATUS_SOFT = { none: "ยังไม่ส่ง", doing: "อยู่ระหว่างดำเนินการ", sent: "ส่งแล้ว", ok: "ตรวจสอบแล้ว", late: "เกินกำหนด" };
  const thDateFull = d => `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  function reportExtra() {
    state.reportMeta = state.reportMeta || {};
    return (state.reportMeta[mk()] = state.reportMeta[mk()] || { budget: "", comment: "" });
  }

  function reportData() {
    const all = liveReports();
    const eff = all.map(effective);
    const done = eff.filter(x => x === "sent" || x === "ok").length;
    const ok = eff.filter(x => x === "ok").length;
    const late = all.filter(r => effective(r) === "late");
    const pct = all.length ? Math.round(done / all.length * 100) : 0;
    const focus = FOCUS.filter(focusActive).map(f => {
      const r = liveReports().find(x => x.focus === f.k);
      return { f, r, owner: r && state.staff.find(s => s.id === r.staffId), lv: r ? levelOf(r) : "", eff: r ? effective(r) : "" };
    });
    return { all, done, ok, late, pct, focus };
  }

  function autoRecommend(d) {
    const out = [];
    if (d.late.length) {
      const byStaff = {};
      d.late.forEach(r => { const n = (state.staff.find(s => s.id === r.staffId) || {}).name || "-"; (byStaff[n] = byStaff[n] || []).push(r.title); });
      out.push(`เร่งรัดรายงานที่เกินกำหนด ${d.late.length} เรื่อง (${Object.entries(byStaff).map(([n, t]) => `${n} ${t.length} เรื่อง`).join(", ")}) ให้แล้วเสร็จโดยเร็ว`);
    }
    const low = d.focus.filter(x => x.lv === "C" || x.lv === "D");
    if (low.length) out.push(`ประเด็นเน้นย้ำที่อยู่ระดับ C/D: ${low.map(x => x.f.no ? `ประเด็นที่ ${x.f.no} (${x.f.code})` : x.f.code).join(", ")} จะติดตามและให้คำแนะนำผู้รับผิดชอบอย่างใกล้ชิด`);
    const noLv = d.focus.filter(x => x.r && !x.lv);
    if (noLv.length) out.push(`อยู่ระหว่างรอผลการประเมินระดับ ${noLv.length} ประเด็น`);
    if (!out.length) out.push("การรายงานเป็นไปตามกำหนด ไม่มีเรื่องค้างดำเนินการ");
    return out;
  }

  function renderReport() {
    const d = reportData(), meta = reportExtra();
    const { list, fy } = fiscalMonths();
    const curKey = mk();
    const monthTxt = `${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
    const lvChip = l => l ? `<span class="lv lv-${l}">${l}</span>` : `<span class="lv lv-none">–</span>`;
    const stChip = k => `<span class="st st-${k}">${STATUS_SOFT[k] || "-"}</span>`;
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    d.focus.forEach(x => { if (x.lv) counts[x.lv]++; });

    const focusRows = d.focus.map((x, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td><b>${x.f.no ? `ประเด็นที่ ${x.f.no} (${esc(x.f.code)})` : esc(x.f.code)}</b><br><span class="muted">${esc(x.f.title)}</span>${x.f.kind === "oss" && x.r ? `<br><span class="muted">${esc(ossSummary(x.r))}</span>` : ""}</td>
      <td>${x.owner ? esc(x.owner.name) : '<span class="muted">ยังไม่มอบหมาย</span>'}</td>
      <td>${x.r ? stChip(x.eff) : "-"}</td>
      <td class="c">${lvChip(x.lv)}</td>
      <td><div class="trend">${list.map(m => { const key = monthKey(m), l = x.r ? levelOf(x.r, key) : ""; return `<span class="tc ${l ? "lv-" + l : ""} ${key === curKey ? "cur" : ""}" title="${TH_MONTHS[m.getMonth()]}">${l || ""}</span>`; }).join("")}</div></td>
    </tr>`).join("");

    const staffRows = state.staff.map((s, i) => {
      const rs = reportsOf(s.id), e = rs.map(effective);
      const dn = e.filter(x => x === "sent" || x === "ok").length, lt = e.filter(x => x === "late").length;
      const st = deskStatus(s);
      return `<tr><td class="c">${i + 1}</td><td><b>${esc(s.name)}</b></td><td class="c">${rs.length}</td><td class="c">${dn}</td>
        <td class="c ${lt ? "bad" : ""}">${lt}</td><td class="c">${rs.length ? Math.round(dn / rs.length * 100) : 0}%</td><td>${esc(st.text)}</td></tr>`;
    }).join("");

    const lateRows = d.late.length ? d.late.sort((a, b) => a.dueDay - b.dueDay).map((r, i) => {
      const s = state.staff.find(x => x.id === r.staffId);
      return `<tr><td class="c">${i + 1}</td><td>${esc(r.title)}</td><td>${esc(s ? s.name : "-")}</td><td>${fmtDue(r)}</td><td class="bad">${esc(dueText(r))}</td><td>${esc(entry(r).note || "-")}</td></tr>`;
    }).join("") : `<tr><td colspan="6" class="c muted">ไม่มีรายงานค้างส่ง</td></tr>`;

    $("#rvPaper").innerHTML = `
      <header class="p-head">
        <div class="p-kicker">${esc(((state.office.sub || "").split("·")[0].trim()) || "สำนักงานพัฒนาชุมชนอำเภอ")}</div>
        <h1>สรุปผลการติดตามรายงานประจำเดือน ${monthTxt}</h1>
        <div class="p-meta">ปีงบประมาณ พ.ศ. ${fy} · ข้อมูล ณ วันที่ ${thDateFull(new Date())}</div>
        <div class="p-to"><b>เรียน</b> พัฒนาการจังหวัด</div>
      </header>

      <section>
        <h2>1. ภาพรวมการรายงาน</h2>
        <div class="kpis">
          <div class="kpi"><span>รายงานทั้งหมด</span><b>${d.all.length}</b><small>เรื่อง</small></div>
          <div class="kpi good"><span>ส่งแล้ว</span><b>${d.done}</b><small>คิดเป็นร้อยละ ${d.pct}</small></div>
          <div class="kpi"><span>ตรวจสอบแล้ว</span><b>${d.ok}</b><small>เรื่อง</small></div>
          <div class="kpi ${d.late.length ? "bad" : ""}"><span>เกินกำหนด</span><b>${d.late.length}</b><small>เรื่อง</small></div>
        </div>
        <div class="pbar"><i style="width:${d.pct}%"></i></div>
        <p class="lead">ในเดือน${monthTxt} เจ้าหน้าที่ ${state.staff.length} คน มีรายงานที่ต้องส่งรวม ${d.all.length} เรื่อง ส่งแล้ว ${d.done} เรื่อง (ร้อยละ ${d.pct}) ตรวจสอบแล้ว ${d.ok} เรื่อง ${d.late.length ? `และมีรายงานเกินกำหนด ${d.late.length} เรื่อง` : "ไม่มีรายงานเกินกำหนด"}</p>
      </section>

      <section>
        <h2>2. ผลการดำเนินงานประเด็นเน้นย้ำ กรมการพัฒนาชุมชน</h2>
        <div class="lvsum">${LEVELS.map(l => `<span>${lvChip(l)} ${counts[l]} ประเด็น</span>`).join("")}</div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>ที่</th><th>ประเด็น</th><th>ผู้รับผิดชอบ</th><th>สถานะรายงาน</th><th>ระดับ</th><th>แนวโน้ม ต.ค.–ก.ย.</th></tr></thead>
          <tbody>${focusRows}</tbody>
        </table></div>
        <label class="budget">ผลการเบิกจ่ายงบประมาณสะสม ร้อยละ
          <input id="rvBudget" type="number" min="0" max="100" step="0.01" value="${esc(meta.budget)}" placeholder="ระบุ">
        </label>
      </section>

      <section>
        <h2>3. สถานะการรายงานรายบุคคล</h2>
        <div class="tbl-wrap"><table>
          <thead><tr><th>ที่</th><th>ชื่อ</th><th>รายงาน</th><th>ส่งแล้ว</th><th>เกินกำหนด</th><th>ร้อยละ</th><th>สถานะ</th></tr></thead>
          <tbody>${staffRows}</tbody>
        </table></div>
      </section>

      <section>
        <h2>4. รายงานที่เกินกำหนด / ต้องเร่งรัด</h2>
        <div class="tbl-wrap"><table>
          <thead><tr><th>ที่</th><th>รายงาน</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
          <tbody>${lateRows}</tbody>
        </table></div>
      </section>

      <section>
        <h2>5. การดำเนินการต่อไป</h2>
        <ol class="recs">${autoRecommend(d).map(t => `<li>${esc(t)}</li>`).join("")}</ol>
        <label class="comment">ความเห็นเพิ่มเติมของพัฒนาการอำเภอ
          <textarea id="rvComment" rows="3" placeholder="พิมพ์ความเห็นหรือข้อเสนอเพิ่มเติม">${esc(meta.comment)}</textarea>
        </label>
        <p class="print-comment">${esc(meta.comment)}</p>
      </section>

      <div class="endsign"><p class="closing">จึงเรียนมาเพื่อโปรดทราบ</p>
      <div class="sign">
        <div>(ลงชื่อ) ......................................................</div>
        <div>(......................................................)</div>
        <div>พัฒนาการอำเภอ</div>
      </div></div>`;
  }

  function reportText() {
    const d = reportData(), meta = reportExtra();
    const monthTxt = `${TH_MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear() + 543}`;
    const L = [];
    L.push(`เรียน พัฒนาการจังหวัด`);
    L.push(`สรุปผลการติดตามรายงานประจำเดือน ${monthTxt}`);
    L.push(((state.office.sub || "").split("·")[0].trim()) || "สำนักงานพัฒนาชุมชนอำเภอ");
    L.push(``);
    L.push(`1) ภาพรวม: รายงาน ${d.all.length} เรื่อง ส่งแล้ว ${d.done} เรื่อง (ร้อยละ ${d.pct}) ตรวจสอบแล้ว ${d.ok} เรื่อง เกินกำหนด ${d.late.length} เรื่อง`);
    L.push(`2) ประเด็นเน้นย้ำ:`);
    d.focus.forEach(x => {
      L.push(`  - ${x.f.no ? `ประเด็นที่ ${x.f.no} (${x.f.code})` : x.f.code} ${x.f.title}: ระดับ ${x.lv || "-"}${x.owner ? ` (${x.owner.name})` : ""}`);
      if (x.f.kind === "oss" && x.r) L.push(`      ${ossSummary(x.r)}`);
    });
    if (meta.budget) L.push(`  - ผลการเบิกจ่ายงบประมาณสะสม ร้อยละ ${meta.budget}`);
    L.push(`3) รายบุคคล:`);
    state.staff.forEach(s => { const st = deskStatus(s); L.push(`  - ${s.name}: ส่ง ${st.done}/${st.total} · ${st.text}`); });
    if (d.late.length) { L.push(`4) เกินกำหนด:`); d.late.forEach(r => L.push(`  - ${r.title} (${(state.staff.find(s => s.id === r.staffId) || {}).name || "-"}) ${dueText(r)}`)); }
    L.push(`5) การดำเนินการต่อไป:`);
    autoRecommend(d).forEach(t => L.push(`  - ${t}`));
    if (meta.comment) L.push(`  - ${meta.comment}`);
    L.push(``); L.push(`จึงเรียนมาเพื่อโปรดทราบ`);
    return L.join("\n");
  }

  function openReport() {
    renderReport();
    $("#reportView").hidden = false;
    document.body.classList.add("rv-open");
    window.scrollTo(0, 0);
  }
  function closeReport() {
    $("#reportView").hidden = true;
    $("#rvCopyBox").hidden = true;
    document.body.classList.remove("rv-open");
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
        <div class="avatar">${faceIcon(moodOf(s).k, 34)}</div>
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
                ${r.desc ? `<div class="report-desc">${esc(r.desc)}${r.link ? ` · <a href="${esc(r.link)}" target="_blank" rel="noopener">${r.link.includes("docs.google") ? "เปิดแบบรายงาน" : "เปิดระบบ"}</a>` : ""}</div>` : ""}
                <div class="report-due">กำหนดส่ง ${fmtDue(r)} ${r.once ? "(งานเฉพาะครั้ง)" : `(ทุกวันที่ ${r.dueDay})`}${late ? ` · <span style="color:var(--s-late)">${esc(dueText(r))}</span>` : dueText(r) ? ` · ${esc(dueText(r))}` : ""}</div></div>
              <button type="button" class="mini-del" data-del="${esc(r.id)}" aria-label="ลบรายงาน ${esc(r.title)}">×</button>
            </div>
            <div class="seg" role="group" aria-label="สถานะ">
              ${STATUSES.map(x => `<button type="button" class="p-${x.k}" data-set="${x.k}" aria-pressed="${e.s === x.k}">${x.label}</button>`).join("")}
            </div>
            ${r.focus ? `<div class="lvl-row"><span class="small">ระดับผลการดำเนินงานเดือนนี้</span><div class="lvl-seg" role="group" aria-label="ระดับ">
              ${LEVELS.map(l => `<button type="button" data-level="${l}" style="--lc:${LEVEL_COLOR[l]}" aria-pressed="${e.level === l}">${l}</button>`).join("")}
            </div></div>` : ""}
            ${(FOCUS.find(f => f.k === r.focus) || {}).kind === "oss" ? (() => { const o = ossInfo(r); return `<div class="oss">
              <div class="oss-target">เป้าหมายเดือนนี้: ${esc(o.target)}${o.met === true ? ' <b class="ok">✓ ผ่าน</b>' : o.met === false ? ' <b class="bad">ยังไม่ถึงเป้า</b>' : ""}</div>
              <label>ผู้ประกอบการ OTOP ในอำเภอ (คน)<input type="number" min="0" inputmode="numeric" data-rcfg="total" value="${esc(r.total ?? "")}"></label>
              <label>ผู้ยื่นคำร้องขอรับบริการสะสม (คน)<input type="number" min="0" inputmode="numeric" data-val="apply" value="${esc(o.v.apply ?? "")}"></label>
              <label>ผลสำเร็จอย่างน้อย 1 ด้าน สะสม (คน)<input type="number" min="0" inputmode="numeric" data-val="success" value="${esc(o.v.success ?? "")}"></label>
              <label class="wide">ลิงก์หลักฐาน / ไฟล์รายงาน<input type="url" data-val="link" placeholder="https://" value="${esc(o.v.link ?? "")}"></label>
              <div class="oss-sum">${esc(ossSummary(r))}</div>
            </div>`; })() : ""}
            ${r.fields && FIELD_SETS[r.fields] ? (() => { const v = e.v || {}; const chk = r.fields === "knn" ? knnCheck(v) : null; return `<div class="oss">
              ${chk ? `<div class="oss-target">${chk.isA ? '<b class="ok">✓ ' + esc(chk.text) + "</b>" : esc(chk.text)} · สื่อที่เผยแพร่ ${chk.media} สื่อ</div>` : ""}
              ${FIELD_SETS[r.fields].map(f => `<label class="${f.wide ? "wide" : ""}">${esc(f.label)}<input type="${f.type || "text"}" ${f.type === "number" ? 'min="0" step="0.5" inputmode="decimal"' : ""} data-val="${f.k}" value="${esc(v[f.k] ?? "")}" ${f.type === "url" ? 'placeholder="https://"' : ""}></label>`).join("")}
            </div>`; })() : ""}
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
    if (e.target.dataset.rcfg || e.target.dataset.val) {
      const rid = e.target.closest("[data-report]").dataset.report;
      const r = state.reports.find(x => x.id === rid);
      if (e.target.dataset.rcfg) r[e.target.dataset.rcfg] = e.target.value === "" ? "" : e.target.value;
      else {
        const key = mk(); state.months[key] = state.months[key] || {};
        const prev = state.months[key][rid] || { s: "none", note: "" };
        state.months[key][rid] = { ...prev, v: { ...(prev.v || {}), [e.target.dataset.val]: e.target.value.trim() }, t: Date.now() };
      }
      save(); renderStaffSheet(); renderAll(); toast("บันทึกข้อมูลแล้ว");
      return;
    }
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
    else state.reports.push({ id: uid(), staffId: sid, title: focusTitle(f), dueDay: f.day, focus: k, ...(f.start ? { start: f.start } : {}) });
    save(); renderAll(); toast("เปลี่ยนผู้รับผิดชอบแล้ว");
  });
  $("#openReport").onclick = openReport;
  $("#rvClose").onclick = closeReport;
  $("#rvPrint").onclick = () => { try { window.print(); } catch (e) { toast("พิมพ์จากหน้านี้ไม่ได้ ลองเปิดเว็บจริงแล้วกดอีกครั้ง"); } };
  $("#rvCopy").onclick = async () => {
    const text = reportText();
    try { await navigator.clipboard.writeText(text); toast("คัดลอกแล้ว นำไปวางใน LINE ได้เลย"); }
    catch (e) {
      const box = $("#rvCopyBox"); box.value = text; box.hidden = false; box.focus(); box.select();
      toast("กดค้างที่ข้อความด้านล่างเพื่อคัดลอก");
    }
  };
  $("#rvPaper").addEventListener("change", e => {
    const meta = reportExtra();
    if (e.target.id === "rvBudget") { meta.budget = e.target.value; save(); toast("บันทึกผลการเบิกจ่ายแล้ว"); }
    if (e.target.id === "rvComment") { meta.comment = e.target.value.trim(); save(); renderReport(); toast("บันทึกความเห็นแล้ว"); }
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
