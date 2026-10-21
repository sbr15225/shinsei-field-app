// [2026-10-19] 休憩が取れなかった分（残業に足す）と、本人都合の早上がりで「欠勤」を選んだ分（差し引く時間）のテスト
// 実行：node _test/break_absence_test.js
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
vm.runInContext(src + "\n;globalThis.__t={sumOvertimeH,overtimeByLog,absenceMinutesOfLog};", ctx);
const T = ctx.__t;

let pass = 0, fail = 0;
function check(c, msg) { if (c) pass++; else { fail++; console.error("  失敗：" + msg); } }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const at = (ymd, hm) => `${ymd}T${hm}+09:00`;
const log = (id, ymd, a, b, extra = {}) => ({ id, userId: "u1", userName: "A", clockIn: at(ymd, a), clockOut: at(ymd, b), ...extra });

// 1. 休憩が取れなかった分は残業に足す（V3）
check(near(T.sumOvertimeH([log("a", "2026-10-20", "08:00:00", "17:20:00", { breakShortMin: 30 })]), 50 / 60), "17:20退勤＋休憩30分不足が 50分 にならない");
check(near(T.sumOvertimeH([log("b", "2026-10-20", "08:00:00", "17:00:00", { breakShortMin: 40 })]), 40 / 60), "17:00退勤＋休憩40分不足が 40分 にならない");
check(T.sumOvertimeH([log("c", "2026-10-20", "08:00:00", "17:20:00")]) > 0 && near(T.sumOvertimeH([log("c", "2026-10-20", "08:00:00", "17:20:00")]), 20 / 60), "休憩不足なしの 17:20退勤が 20分 でない（今までと変わった）");
// 旧期間（V3より前）は足さない
check(T.sumOvertimeH([log("d", "2026-09-10", "08:00:00", "17:00:00", { breakShortMin: 30 })]) === 0, "旧期間で休憩不足が残業に入った");
// 早出の日：実働に休憩不足を足して −6.5H
// 7:00〜17:00 は休憩150分を除いて実働7.5H、休憩不足30分を足して8H → 8−6.5＝1.5H
 check(near(T.sumOvertimeH([log("e", "2026-10-20", "07:00:00", "17:00:00", { earlyStart: true, breakShortMin: 30 })]), 1.5), "早出の日の休憩不足が足されない");
// 夜勤は対象外
check(T.sumOvertimeH([log("f", "2026-10-20", "18:00:00", "23:00:00", { isNightShift: true, breakShortMin: 30 })]) === 0, "夜勤に休憩不足が入った");

// 2. 本人都合の早上がりで「欠勤」：退勤〜17:00 から休憩を除いた分（1分単位）
const ab = (b, extra) => T.absenceMinutesOfLog(log("g", "2026-10-20", "08:00:00", b, { early_leave_category: "本人都合", earlyLeavePay: "absence", ...extra }));
check(ab("16:00:00") === 60, "16:00退勤（14:50〜15:30の休憩より後）が 60分 にならない");
check(ab("15:00:00") === 120 - 30, "15:00退勤が 90分（15:00〜15:30の休憩30分を除く）にならない");
check(ab("12:00:00") === 300 - 60 - 40, "12:00退勤が 200分（昼60分・午後40分を除く）にならない");
check(ab("17:00:00") === 0, "17:00退勤で差し引きが出た");
// 時間有給を選んだ・選んでいない・本人都合以外は 0
check(ab("15:00:00", { earlyLeavePay: "paid_leave" }) === 0, "時間有給を選んだのに欠勤の差し引きが出た");
check(ab("15:00:00", { earlyLeavePay: null }) === 0, "未選択で欠勤の差し引きが出た");
check(T.absenceMinutesOfLog(log("h", "2026-10-20", "08:00:00", "15:00:00", { early_leave_category: "現場終了", earlyLeavePay: "absence" })) === 0, "現場終了で差し引きが出た");

console.log(`break_absence_test: 成功 ${pass} / 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
