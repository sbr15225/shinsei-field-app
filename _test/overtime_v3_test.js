// [2026-10-16] 残業 V3（法律どおり）のテスト：17:00から1分単位、月の合計の丸め、時給の分母
// 実行：node _test/overtime_v3_test.js
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
vm.runInContext(src + "\n;globalThis.__t={calcOvertime,sumOvertimeH,calcPayroll,roundMonthlyOvertimeH,monthlyAvgShoteiH,annualShoteiHolidays,getPayrollMaster};", ctx);
const T = ctx.__t;

let pass = 0, fail = 0;
function check(c, msg) { if (c) pass++; else { fail++; console.error("  失敗：" + msg); } }
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const at = (ymd, hm) => `${ymd}T${hm}+09:00`;
const ot = (ymd, a, b) => T.calcOvertime(at(ymd, a), at(ymd, b));

// 1. V3（2026-09-26〜の出勤）：17:00 から1分単位
check(near(ot("2026-10-05", "08:00:00", "17:20:00"), 20 / 60), "17:20 退勤が 20分 にならない");
check(near(ot("2026-10-05", "08:00:00", "17:29:40"), 29 / 60), "17:29:40 退勤が 29分 にならない（秒は切り捨て）");
check(near(ot("2026-10-05", "08:00:00", "18:05:00"), 65 / 60), "18:05 退勤が 65分 にならない");
check(ot("2026-10-05", "08:00:00", "16:50:00") === 0, "17:00 前の退勤で残業が出た");
check(ot("2026-10-05", "08:00:00", "17:00:00") === 0, "17:00 ちょうどで残業が出た");
// 2. 旧ルール（V2：2026-08-07〜09-25）は変わらない
check(ot("2026-09-10", "08:00:00", "17:20:00") === 0, "旧ルールの 17:20 退勤が 0 でない（過去の計算が変わった）");
check(near(ot("2026-09-10", "08:00:00", "17:45:00"), 0.7), "旧ルールの 17:45 退勤が 0.7H でない");
// 3. 月の合計の丸め：30分未満は切り捨て、30分以上は1時間に切り上げ
check(T.roundMonthlyOvertimeH(10 + 29 / 60) === 10, "10時間29分 が 10時間 にならない");
check(T.roundMonthlyOvertimeH(10 + 30 / 60) === 11, "10時間30分 が 11時間 にならない");
check(T.roundMonthlyOvertimeH(20 / 60) === 0, "20分 が 0 にならない");
// 4. 時給の分母（就業規則 第41条第3項）
check(T.annualShoteiHolidays(2026) === 110, "2026年の休日が 110日 でない（" + T.annualShoteiHolidays(2026) + "）");
check(near(T.monthlyAvgShoteiH(2026), 138.125), "2026年の平均所定が 138.125H でない");
check(T.annualShoteiHolidays(2027) === 109, "2027年の休日が 109日 でない（" + T.annualShoteiHolidays(2027) + "）");
// 5. 給与計算（川畑：基礎賃金 447,000円＋通信費 3,000円＝450,000円、残業 20時間40分 → 21時間）[2026-10-19 通信費を基礎に]
const m = T.getPayrollMaster("川畑");
const v3 = T.calcPayroll(m, 0, { saturday: 1, sunday: 0, long: 0 }, 20 + 40 / 60, 0, 2026);
const hourly = 450000 / 138.125;
check(v3.kiso === 450000, "V3 の基礎賃金に通信費 3,000円が入っていない（" + v3.kiso + "）");
check(v3.overtimeH === 21, "V3 の残業時間が 21時間 に丸まっていない（" + v3.overtimeH + "）");
check(v3.unitNormal === Math.round(hourly * 1.25), "V3 の残業単価が 基礎賃金÷平均所定×1.25 でない");
check(v3.overtimePay === Math.round(hourly * 1.25) * 21, "V3 の残業代が合わない");
check(v3.shoteiPay === Math.round(hourly * 6.5), "V3 の土曜出勤（所定休日）の日給が 時給×6.5H でない");
// 6. 旧ルールの期間は、以前の計算（÷22日÷7.0H）のまま
const old = T.calcPayroll(m, 0, { saturday: 0, sunday: 0, long: 0 }, 10, 0, null);
check(old.unitNormal === Math.round(447000 / 22 / 7.0 * 1.25), "旧ルールの残業単価が変わった");
check(old.kiso === 447000, "旧ルールの基礎賃金に通信費が入った（過去の明細が変わる）");
console.log(`V3 残業単価 ${v3.unitNormal}円（旧 ${old.unitNormal}円）`);

console.log(`結果：成功 ${pass} / 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
