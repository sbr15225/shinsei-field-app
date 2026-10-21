// [2026-10-15] 交通費の自動推定と原価表の計算のテスト（admin.html の該当部分を Node で読み込んで計算だけ確かめる）
// 実行：node _test/transport_test.js
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const ctx = { console, Date, Math, JSON, Intl, Map, Set, Promise, setTimeout, clearTimeout,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: "node", onLine: true }, location: { href: "http://x/", origin: "http://x", pathname: "/" },
  document: { addEventListener() {}, createElement: () => ({ style: {} }), querySelector: () => null }, fetch: async () => ({ ok: false, json: async () => ({}) }) };
ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "shared.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "ic_kanto.js"), "utf8") + ";globalThis.IC_KANTO=IC_KANTO;", ctx);
const html = fs.readFileSync(path.join(root, "admin.html"), "utf8");
vm.runInContext(html.slice(html.indexOf("const GENKA_DEFAULT"), html.indexOf("function GenkaTab(")) + ";globalThis.__t={estimateTransport,TRANSPORT_DEFAULT,calcGenka,GENKA_DEFAULT,geoKm};", ctx);
const T = ctx.__t;
let pass = 0, fail = 0;
const check = (c, m) => { if (c) pass++; else { fail++; console.error("  失敗：" + m); } };
const D = T.TRANSPORT_DEFAULT;
const yokohama = { lat: 35.4876, lng: 139.6170 }, gyotoku = { lat: 35.6837, lng: 139.9163 }, gunma = { lat: 36.3114, lng: 139.1968 }, near = { lat: 35.8230, lng: 139.8380 };
const crew = [{ userName: "川畑", commuteMethod: "company_car" }, { userName: "大塚", commuteMethod: "company_car_shared" }, { userName: "小野", commuteMethod: "company_car_shared" }];

// 1. 位置のない現場は推定しない（0 円・理由つき）
const none = T.estimateTransport(D, null, crew);
check(none.total === 0 && !none.ok && none.lines[0].includes("未登録"), "位置のない現場で推定した");
// 2. 近い現場は高速を使わない。会社まで車で来る人（大塚）のガソリン代が入る
const n = T.estimateTransport(D, near, crew);
check(n.toll === 0 && n.fuel > 0, "近い現場で高速を使った");
check(n.lines.some(l => l.startsWith("集合まで（大塚の車")), "大塚の家→集合のガソリンがない");
// 3. 小野：北（群馬）へは蒲生で拾い、南（横浜・行徳）は会社に来てもらう（寄り道の方が長い）
check(T.estimateTransport(D, gunma, crew).lines[0].includes("小野宅"), "群馬で小野さんを拾わない");
const g2 = T.estimateTransport(D, gyotoku, crew);
check(!g2.lines[0].includes("小野宅") && g2.lines.some(l => l.startsWith("集合まで（大塚の車で小野を拾う）")), "行徳で遠回りして小野さんを拾った・集合まで大塚が拾わない");
// 3b. 集合まで：大塚が廣野・小野を拾って川畑宅へ（1 台分）。大塚がいなければ廣野が小野を拾う。小野を現場行きの車が拾う日（北）は集合に入れない
const all4 = [{ userName: "川畑", commuteMethod: "company_car" }, { userName: "大塚", commuteMethod: "company_car_shared" }, { userName: "廣野", commuteMethod: "company_car_shared" }, { userName: "小野", commuteMethod: "company_car_shared" }];
const f1 = T.estimateTransport(D, yokohama, all4).lines.filter(l => l.startsWith("集合まで"));
check(f1.length === 1 && f1[0].startsWith("集合まで（大塚の車で廣野・小野を拾う）"), "集合まで大塚が廣野・小野を拾わない（" + f1.join(" / ") + "）");
const f2 = T.estimateTransport(D, yokohama, all4.filter(x => x.userName !== "大塚")).lines.filter(l => l.startsWith("集合まで"));
check(f2.length === 1 && f2[0].startsWith("集合まで（廣野の車で小野を拾う）"), "大塚がいない日に廣野が小野を拾わない（" + f2.join(" / ") + "）");
const f3 = T.estimateTransport(D, gunma, all4).lines;
check(f3[0].includes("小野宅") && f3.some(l => l.startsWith("集合まで（大塚の車で廣野を拾う）")), "北の現場で小野さんを現場行きの車が拾わない／集合に入れている");
// 4. 遠い現場は高速（出入口の名前つき）。料金は 往復 × (基本 ＋ 道のり × 1km あたり)
const y = T.estimateTransport(D, yokohama, crew);
check(y.toll > 0 && /高速 .+→.+/.test(y.lines[0]), "横浜で高速の出入口が出ない");
// 5. ガソリン単価は 時価 ＋ 上乗せ。時価を 10 円上げるとガソリン代が上がる
const y2 = T.estimateTransport({ ...D, fuelMarket: D.fuelMarket + 10 }, yokohama, crew);
check(Math.abs(y2.fuel / y.fuel - (D.fuelMarket + 10 + D.fuelMarkup) / (D.fuelMarket + D.fuelMarkup)) < 1e-9, "ガソリン単価が時価＋上乗せになっていない");
// 6. 道のり係数を上げると距離も上がる
check(T.estimateTransport({ ...D, roadFactor: 1.5 }, near, crew).fuel > n.fuel, "道のり係数が効かない");
// 7. 自家用は家から直行直帰、電車は家の駅から運賃
const mix = T.estimateTransport(D, yokohama, [{ userName: "廣野", commuteMethod: "own_car" }, { userName: "小野", commuteMethod: "train" }]);
check(mix.lines.some(l => l.startsWith("廣野（自家用")) && mix.train > 0 && mix.lines.some(l => l.startsWith("小野（電車）")), "自家用・電車の扱いが違う");
// 7b. 2 台の日：「社用車（運転）」が 2 人なら 2 台。相乗りの人は出勤ボタンを押した時刻が近い車に乗る。同乗の人は数えない
const two = T.estimateTransport(D, yokohama, [
  { userName: "川畑", commuteMethod: "company_car", createdAt: "2026-10-01T06:00:00+09:00" },
  { userName: "廣野", commuteMethod: "company_car_shared", createdAt: "2026-10-01T06:02:00+09:00" },
  { userName: "小野", commuteMethod: "company_car", createdAt: "2026-10-01T10:00:00+09:00" },
  { userName: "大塚", commuteMethod: "company_car_shared", createdAt: "2026-10-01T09:55:00+09:00" },
]);
const carLines = two.lines.filter(l => l.startsWith("社用車"));
check(carLines.length === 2, "運転が 2 人なのに 2 台にならない（" + carLines.length + "）");
check(carLines[0].includes("川畑運転") && carLines[0].includes("廣野同乗") && carLines[1].includes("小野運転") && carLines[1].includes("大塚同乗"), "相乗りの人が時刻の近い車に乗らない");
const one = T.estimateTransport(D, yokohama, crew);
check(one.lines.filter(l => l.startsWith("社用車")).length === 1 && Math.abs(two.toll - one.toll * 2) < 1e-6, "2 台なら高速も 2 台分にならない");
// 7c. 運転の人がいない日（相乗りだけ・未選択）は 1 台
check(T.estimateTransport(D, near, [{ userName: "大塚", commuteMethod: null }, { userName: "小野", commuteMethod: "company_car_shared" }]).lines.filter(l => l.startsWith("社用車")).length === 1, "運転の人がいない日が 1 台にならない");
// 8. 原価表：手で入れた交通費はそちらを使い、無い日は推定。合計にも入る
const p = { id: "p1", name: "テスト", contractAmount: 1000000, siteLat: near.lat, siteLng: near.lng };
const iso = (d, h) => `2026-10-${d}T${h}:00:00+09:00`;
const logs = [
  { userName: "川畑", projectId: "p1", clockIn: iso("01", "08"), clockOut: iso("01", "17"), commuteMethod: "company_car" },
  { userName: "大塚", projectId: "p1", clockIn: iso("01", "08"), clockOut: iso("01", "17"), commuteMethod: "company_car" },
  { userName: "川畑", projectId: "p1", clockIn: iso("02", "08"), clockOut: iso("02", "17"), commuteMethod: "company_car" },
];
const cfg = { ...T.GENKA_DEFAULT, days: { p1: { "2026-10-02": { transport: "5000" } } } };
const g = T.calcGenka(p, cfg, { clockLogs: logs, expenseItems: [], materialCosts: [], additionalEstimates: [], progressReports: [] });
const days = g.months[0].days;
check(days[0].transportAuto > 0 && days[0].transport === days[0].transportAuto, "推定の交通費が使われない");
check(days[1].transport === 5000, "手で入れた交通費が使われない");
check(Math.abs(g.direct.transport - (days[0].transportAuto + 5000)) < 1e-6, "交通費の合計が違う");
check(Math.abs(g.overhead - 230000) < 1e-6 && g.totalCost > g.overhead, "諸経費・原価合計が違う");

console.log(`結果：成功 ${pass} / 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
