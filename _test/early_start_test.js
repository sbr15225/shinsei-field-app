// [2026-10-14] 早出の残業計算と割増の段階のテスト（Node で shared.js を読み込んで計算だけ確かめる）
// 実行：node _test/early_start_test.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "shared.js"), "utf8");
const store = {};
const ctx = {
  console, Date, Math, JSON, Intl, Map, Set, Promise, setTimeout, clearTimeout,
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: "node", onLine: true },
  location: { href: "http://localhost/", origin: "http://localhost", pathname: "/" },
  document: { addEventListener() {}, createElement: () => ({ style: {} }), querySelector: () => null },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
};
ctx.window = ctx;
ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(src + "\n;globalThis.__t={overtimeByLog,sumOvertimeH,overtimeOfLog,workedHours,calcOvertime,calcPayroll};", ctx);
const T = ctx.__t;

let pass = 0, fail = 0;
function check(c, msg) { if (c) pass++; else { fail++; console.error("  失敗：" + msg); } }
const near = (a, b) => Math.abs(a - b) < 1e-6;
// 日本時間の ISO（テストの PC のタイムゾーンに依存しないよう +09:00 で書く）
const t = (d, hm) => `2026-10-${d}T${hm}:00+09:00`;
const L = (id, d, a, b, extra = {}) => Object.assign({ id, userId: "s1", userName: "川畑", clockIn: t(d, a), clockOut: t(d, b) }, extra);

// 1. 早出チェックのない日は今までどおり（17:30 以降だけ残業）
check(near(T.sumOvertimeH([L("a", 13, "08:00", "17:00")]), 0), "定時の日に残業が出た");
check(near(T.sumOvertimeH([L("a", 13, "08:00", "18:00")]), T.calcOvertime(t(13, "08:00"), t(13, "18:00"))), "チェックなしの残業が従来と違う");
check(near(T.sumOvertimeH([L("a", 13, "08:00", "15:00")]), 0), "チェックなしの早上がりで残業が出た");

// 2. 早出の日：実働（休憩を除く）− 6.5時間、10分切り捨て
// 6:00〜17:00 → 11h − 休憩2.5h = 8.5h → 2.0h
check(near(T.sumOvertimeH([L("a", 13, "06:00", "17:00", { earlyStart: true })]), 2.0), "6:00〜17:00 が 2.0H にならない");
// 6:00〜15:00 → 9h − (40+70+10分) = 7.0h → 0.5h
check(near(T.sumOvertimeH([L("a", 13, "06:00", "15:00", { earlyStart: true })]), 0.5), "6:00〜15:00 が 0.5H にならない");
// 6:00〜12:00 → 6h − (40+10分) = 5.17h → 0（6.5H 未満）
check(near(T.sumOvertimeH([L("a", 13, "06:00", "12:00", { earlyStart: true })]), 0), "6.5H 未満なのに残業が出た");

// 3. 10/13 川畑：品川 6:00〜8:00（早出）＋八潮 8:00〜16:21 → 2h + (8h21m − 150分=5h51m) = 7h51m → 1h21m
//    [2026-10-16] V3（9/26〜の打刻）は1分単位なので 1h21m（以前は10分切り捨てで 1h20m）
const day = [L("shina", 13, "06:00", "08:00", { earlyStart: true }), L("yashio", 13, "08:00", "16:21")];
const map = T.overtimeByLog(day);
check(near(T.sumOvertimeH(day), 81 / 60), "10/13 の合計が 1H21M にならない（" + T.sumOvertimeH(day) + "）");
check(near(map.get("shina"), 0) && near(map.get("yashio"), 81 / 60), "早出の日の残業が最後の打刻に付いていない");
check(near(T.overtimeOfLog(day[1], day), 81 / 60) && near(T.overtimeOfLog(day[0], day), 0), "行ごとの表示と合計が合わない");

// 4. 別の人・別の日は混ざらない。夜勤は0
const mix = [
  L("x1", 13, "06:00", "17:00", { earlyStart: true }),
  L("x2", 13, "08:00", "18:00", { userId: "s2", userName: "大塚" }),
  L("x3", 14, "08:00", "17:00"),
  L("n1", 13, "20:00", "23:00", { isNightShift: true, earlyStart: true }),
];
check(near(T.sumOvertimeH(mix), 2.0 + T.calcOvertime(t(13, "08:00"), t(13, "18:00"))), "人・日・夜勤の分け方が違う");

// 5. 割増の段階（就業規則 第41条）：45Hまで1.25、45〜60Hは1.35、60H超は1.5
const master = { base: 300000, yakushoku: 0, ginou: 0, hours: 8, alpha: 5000 };
const raw = 300000 / 22 / 8;
const p40 = T.calcPayroll(master, 0, {}, 40, 0);
check(p40.overtimePay === Math.round(raw * 1.25) * 40, "40Hの残業代が違う");
const p50 = T.calcPayroll(master, 0, {}, 50, 0);
check(p50.overtimePay === Math.round(raw * 1.25) * 45 + Math.round(raw * 1.35) * 5, "50Hの残業代が違う（45H超は1.35）");
const p70 = T.calcPayroll(master, 0, {}, 70, 0);
check(p70.overtimePay === Math.round(raw * 1.25) * 45 + Math.round(raw * 1.35) * 15 + Math.round(raw * 1.5) * 10, "70Hの残業代が違う（60H超は1.5）");
check(p70.otNormalH === 45 && p70.otOverH === 15 && p70.otOver60H === 10, "段階ごとの時間が違う");

console.log(`結果：成功 ${pass} / 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
