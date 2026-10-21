// [2026-10-14] 請求の打診アラートと、請求日アラートの客先照合のテスト
// 実行：node _test/consult_test.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "shared.js"), "utf8");
const ctx = {
  console, Date, Math, JSON, Intl, Map, Set, Promise, setTimeout, clearTimeout,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: "node", onLine: true },
  location: { href: "http://localhost/", origin: "http://localhost", pathname: "/" },
  document: { addEventListener() {}, createElement: () => ({ style: {} }), querySelector: () => null },
  fetch: async () => ({ ok: false, json: async () => ({}) }),
};
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
vm.runInContext(src + "\n;globalThis.__t={getConsultAlerts,getBillingAlerts,normCompanyName,projectBelongsToCustomer};", ctx);
const T = ctx.__t;
let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.error("  失敗：" + m); } };
const day = (y, m, d) => new Date(y, m - 1, d);

const customers = [
  { id: "c1", name: "大成温調㈱", consultDay: 20, closingDay: 31 },
  { id: "c2", name: "五建工業㈱", consultDay: 31, closingDay: 15 },
  { id: "c3", name: "島工業㈱", consultDay: 20, closingDay: 31 },
  { id: "c4", name: "東京管工機材㈱", consultDay: 20 },   // 進行中の現場なし
  { id: "c5", name: "柿本商会㈱", consultDay: 5, closingDay: 15, consultDoneMonth: "2026-10" },
];
const projects = [
  { id: "p1", name: "佐藤製薬", status: "進行中", client: "", lead: "大成温調㈱" },
  { id: "p2", name: "雪印", status: "完了", invoiceSettled: false, client: "", lead: "大成温調㈱" },
  { id: "p3", name: "五建の現場", status: "進行中", client: "", lead: "五建工業㈱" },
  { id: "p4", name: "島の現場", status: "進行中", client: "", lead: "島工業株式会社" },   // 表記ゆれ
  { id: "p5", name: "終わって請求済み", status: "完了", invoiceSettled: true, lead: "東京管工機材㈱" },
  { id: "p6", name: "八潮小", status: "進行中", lead: "柿本商会㈱" },
];
const reports = [
  { projectId: "p1", percent: 40, reportedAt: "2026-10-01T09:00:00+09:00" },
  { projectId: "p1", percent: 60, reportedAt: "2026-10-12T09:00:00+09:00" },
];

// 1. 表記ゆれ
check(T.normCompanyName("島工業株式会社") === T.normCompanyName("島工業㈱"), "株式会社と㈱が同じにならない");
check(T.normCompanyName("(有)堀田工業") === T.normCompanyName("㈲堀田工業"), "(有)と㈲が同じにならない");

// 2. 10/20：大成温調と島工業が出る。進捗は最新の60%、完了・未請求の雪印は100%。東京管工機材は現場なしで出ない
let a = T.getConsultAlerts(customers, projects, reports, day(2026, 10, 20));
let names = a.map(x => x.customer.name).sort();
check(JSON.stringify(names) === JSON.stringify(["大成温調㈱", "島工業㈱"]), "10/20 の打診先が違う：" + names);
const taisei = a.find(x => x.customer.id === "c1");
check(taisei && taisei.daysSince === 0 && taisei.monthKey === "2026-10", "打診日の日数・月が違う");
check(taisei && taisei.projects.find(x => x.project.id === "p1").progress === 60, "最新の進捗%が出ない");
check(taisei && taisei.projects.find(x => x.project.id === "p2").progress === 100, "完了・未請求の現場が出ない");

// 3. 10/19 は出ない（打診日の前）。10/26 は打診日から6日で出る。10/27 は7日たったので出ない
check(T.getConsultAlerts(customers, projects, reports, day(2026, 10, 19)).every(x => x.customer.id !== "c1"), "打診日の前に出た");
check(T.getConsultAlerts(customers, projects, reports, day(2026, 10, 26)).some(x => x.customer.id === "c1" && x.daysSince === 6), "打診日から6日目に出ない");
check(T.getConsultAlerts(customers, projects, reports, day(2026, 10, 27)).every(x => x.customer.id !== "c1"), "7日たっても出ている");

// 4. 「打診した」でその月は出ない（翌月はまた出る）
const done = customers.map(c => c.id === "c1" ? { ...c, consultDoneMonth: "2026-10" } : c);
check(T.getConsultAlerts(done, projects, reports, day(2026, 10, 20)).every(x => x.customer.id !== "c1"), "打診済みなのに出た");
check(T.getConsultAlerts(done, projects, reports, day(2026, 11, 20)).some(x => x.customer.id === "c1"), "翌月に出ない");

// 5. 月末（31）：10/31・11/30・2月末に出る。翌月頭も7日以内なら続く
check(T.getConsultAlerts(customers, projects, reports, day(2026, 10, 31)).some(x => x.customer.id === "c2" && x.daysSince === 0), "10/31 に五建が出ない");
check(T.getConsultAlerts(customers, projects, reports, day(2026, 11, 30)).some(x => x.customer.id === "c2" && x.daysSince === 0), "11/30（月末）に五建が出ない");
check(T.getConsultAlerts(customers, projects, reports, day(2027, 2, 28)).some(x => x.customer.id === "c2" && x.daysSince === 0), "2/28（月末）に五建が出ない");
check(T.getConsultAlerts(customers, projects, reports, day(2026, 11, 3)).some(x => x.customer.id === "c2" && x.monthKey === "2026-10" && x.daysSince === 3), "月末の打診が翌月頭に続かない");

// 6. 柿本は今月打診済み → 10/5 でも出ない
check(T.getConsultAlerts(customers, projects, reports, day(2026, 10, 5)).every(x => x.customer.id !== "c5"), "打診済みの柿本が出た");

// 7. 請求日アラート：lead（client は空）と表記ゆれでも現場が一致する（以前は一度も一致していなかった）
const b = T.getBillingAlerts(customers, projects, day(2026, 10, 28));
check(b.some(x => x.customer.id === "c3" && x.projectNames.includes("島の現場")), "請求日アラートで表記ゆれの現場が一致しない");
check(b.some(x => x.customer.id === "c1" && x.projectNames.includes("佐藤製薬")), "請求日アラートで lead の現場が一致しない");

console.log(`結果：成功 ${pass} / 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
