// ══════════════════════════════════════════════════════════════
// shared.js — シンセイ工業 現場管理アプリ v16 共通コード
// user.html / admin.html の両方で読み込まれる
// ══════════════════════════════════════════════════════════════

// ── SUPABASE CONFIG ──
const SUPABASE_URL = "https://rmahzqmwlavgxvfitymq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYWh6cW13bGF2Z3h2Zml0eW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDY1NjAsImV4cCI6MjA4ODYyMjU2MH0.Hh1fyJmk5cNvxNlFBOT-keNWNhERz88742TLok9NxLs";
const CLAUDE_PROXY_URL = `${SUPABASE_URL}/functions/v1/claude-proxy`;
const API_GATEWAY_URL = `${SUPABASE_URL}/functions/v1/api-gateway`;
const PARSE_INVOICE_URL = `${SUPABASE_URL}/functions/v1/parse-invoice-pdf`;

// ── CONSTANTS ──
const LEAVE_TYPES = [
  { id:"paid",    label:"有給休暇",   color:"#22c55e", icon:"🌿" },
  { id:"furikae", label:"振替休日",   color:"#60a5fa", icon:"🔄" },
  { id:"special", label:"特別休暇",   color:"#a78bfa", icon:"⭐" },
  { id:"holiday", label:"休日出勤",   color:"#f97316", icon:"🏗", hasPref:true },
  { id:"absence", label:"欠勤",       color:"#ef4444", icon:"✗"  },
];

// ── 振替休日ヘルパー ──

// 休日種別判定: 'sunday'|'saturday'|'obon'|'newyear'|null
function getHolidayType(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (dow === 0) return "sunday";
  if (dow === 6) return "saturday";
  if (m === 8 && day >= 13 && day <= 16) return "obon";
  // [2026-09-24] 就業規則（休日）「年末年始（12月30日～1月3日）」に合わせて 12/29 → 12/30 開始に修正
  if ((m === 12 && day >= 30) || (m === 1 && day <= 3)) return "newyear";
  return null;
}

const HOLIDAY_TYPE_LABEL = { sunday:"日曜", saturday:"土曜", obon:"お盆", newyear:"年末年始" };
// [2026-06-05] 通勤方法のラベル・アイコン（v147 で社用車(相乗り)追加）
const COMMUTE_METHOD_LABEL = { company_car:"社用車", company_car_shared:"社用車(相乗り)", train:"電車", own_car:"自車" };
const COMMUTE_METHOD_ICON = { company_car:"🚐", company_car_shared:"🚐", train:"🚃", own_car:"🚗" };

// [2026-04-20] 車両アラート計算（ログイン時ポップアップ用）
//   - オイル交換：最新交換日+90日経過で通知。dismissから10日経過で再通知
//   - 車検：30日前〜8日前は info（dismissable）／7日前〜当日は warn（必ず表示）／過ぎたら expired（必ず表示）
//   - 担当者未設定の車両は管理者（role:admin）に集約
// returns: [{type, vehicleId, vehicleName, ...}]
function getVehicleAlerts(userId, userRole, vehicles, vehicleOilChanges, staff) {
  if (!userId) return [];
  const today = new Date(); today.setHours(0,0,0,0);
  const isAdmin = userRole === "admin";
  const alerts = [];
  const daysBetween = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.floor((today - d) / 86400000);
  };
  const dismissGapOk = (key) => {
    try {
      const last = localStorage.getItem(key);
      if (!last) return true;
      const d = new Date(last); d.setHours(0,0,0,0);
      return Math.floor((today - d) / 86400000) >= 10;
    } catch { return true; }
  };

  for (const v of vehicles) {
    const ownerId = v.assignedStaffId || null;
    // 受信者判定：担当者本人 or (未設定かつadmin)
    const isMine = ownerId === userId;
    const isUnassignedForAdmin = !ownerId && isAdmin;
    if (!isMine && !isUnassignedForAdmin) continue;

    // === オイル交換 ===
    // [2026-05-21] しきい値を 5ヶ月 に変更。車検が「最後のオイル交換」〜「+5ヶ月」の間にある場合は
    // 車検時にオイル交換される前提で、アラートを「車検 + 5ヶ月」にずらす。
    const myOil = vehicleOilChanges
      .filter(o => o.vehicleId === v.id)
      .sort((a,b) => (b.date||"").localeCompare(a.date||""));
    const lastOil = myOil[0];
    if (lastOil && lastOil.date) {
      const addMonths = (d, n) => { const x = new Date(d); x.setHours(0,0,0,0); x.setMonth(x.getMonth() + n); return x; };
      const lastOilDate = new Date(lastOil.date); lastOilDate.setHours(0,0,0,0);
      let baseDate = lastOilDate;
      let basedOnInspection = false;
      if (v.inspectionDate) {
        const inspDate = new Date(v.inspectionDate); inspDate.setHours(0,0,0,0);
        const oilPlus5 = addMonths(lastOilDate, 5);
        // 車検が「前回オイル交換より後」かつ「+5ヶ月より前」なら、車検基準に乗り換え
        if (inspDate > lastOilDate && inspDate < oilPlus5) {
          baseDate = inspDate;
          basedOnInspection = true;
        }
      }
      const nextDue = addMonths(baseDate, 5);
      if (today >= nextDue) {
        const daysSince = Math.floor((today - lastOilDate) / 86400000);
        const dismissKey = `vehAlertOil_${v.id}`;
        if (dismissGapOk(dismissKey)) {
          alerts.push({
            type: "oil",
            vehicleId: v.id,
            vehicleName: v.name,
            daysSince,
            lastDate: lastOil.date,
            nextDueDate: nextDue.toISOString().slice(0,10),
            basedOnInspection,
            // [2026-06-12] 前回エレメント未交換なら、今回のオイル交換時はエレメントも交換（2回に1回ルール）
            elementDue: lastOil.elementChanged !== true,
            dismissKey,
          });
        }
      }
    }

    // === 車検 ===
    if (v.inspectionDate) {
      const daysUntil = -daysBetween(v.inspectionDate); // 正=未来, 負=過去
      if (daysUntil <= 30) {
        let severity = "info";
        if (daysUntil < 0) severity = "expired";
        else if (daysUntil <= 7) severity = "warn";
        const dismissKey = severity === "info" ? `vehAlertInsp_${v.id}` : null;
        if (!dismissKey || dismissGapOk(dismissKey)) {
          alerts.push({
            type: "inspection",
            vehicleId: v.id,
            vehicleName: v.name,
            daysUntil,
            inspectionDate: v.inspectionDate,
            severity,
            dismissKey,
          });
        }
      }
    }
  }
  return alerts;
}

// [2026-04-21] 休日出勤の自動申請ルール（再定義）
// 土曜（所定休日） ≥13:00退勤 → 1日（買取 or 振休をユーザー選択）
// 土曜（所定休日） <13:00退勤 → 振休0.5 + 買取0.5（2件、選択不要）
// 日曜（法定休日） → 振休1日固定（買取不可、半日ルールなし）
// お盆・年末年始（長期休暇） → 買取 or 振休をユーザー選択（半日ルールなし）
//   [2026-07-22] 有給繰越固定を廃止。休日は有給充当不可のため、土曜と同じ買取/振休選択制に統一
// 祝日（お盆・年末年始以外） → 平日扱い（holiday record 作らない）
// returns: { isHalfDay, needUserChoice, entries: [{pref, days, label}] } or null
function getHolidayAutoApplyConfig(holidayType, clockOutIso) {
  if (!holidayType) return null;
  const out = clockOutIso ? new Date(clockOutIso) : null;
  const hour = out && !isNaN(out.getTime()) ? out.getHours() : 13;
  const isHalfDay = holidayType === "saturday" && hour < 13;
  if (holidayType === "saturday") {
    if (isHalfDay) {
      return { isHalfDay:true, needUserChoice:false, entries:[
        { pref:"振休希望", days:0.5, label:"振休 0.5日" },
        { pref:"買取希望", days:0.5, label:"買取 0.5日" },
      ]};
    }
    return { isHalfDay:false, needUserChoice:true, entries:[
      { pref:null, days:1, label:"買取 or 振休 (1日)" },
    ]};
  }
  if (holidayType === "sunday") {
    return { isHalfDay:false, needUserChoice:false, entries:[
      { pref:"振休希望", days:1, label:"振休 1日（法定休日）" },
    ]};
  }
  if (holidayType === "obon" || holidayType === "newyear") {
    return { isHalfDay:false, needUserChoice:true, entries:[
      { pref:null, days:1, label:"買取 or 振休 (1日)" },
    ]};
  }
  return null;
}

// 3ヶ月後の期限日を計算（月末オーバーフロー対応）
// 例: 11/30 → 2/28、1/31 → 4/30
function addThreeMonths(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const targetMonth = d.getMonth() + 3;
  const targetYear  = d.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  // 月末を超えないよう、翌月1日の前日を取る
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const targetDay = Math.min(d.getDate(), lastDayOfTargetMonth);
  return new Date(targetYear, normalizedMonth, targetDay);
}

// 振替残・付与・消費をleavesから動的計算（種別で分けて返す）
// returns: { sunday:{granted,used,balance,works[]}, other:{granted,used,balance,works[]}, total }
function calcFurikaeStats(sid, leaveData) {
  const leaves = leaveData[sid] || [];
  const now = new Date();

  // 振替取得済みのholiday_work_idセット
  const usedWorkIds = new Set(
    leaves.filter(l => l.type === "furikae" && l.status === "承認" && l.holidayWorkId)
          .map(l => l.holidayWorkId)
  );

  // 振休希望で承認済みの休日出勤を種別ごとに集計
  const holidayWorks = leaves.filter(l => l.type === "holiday" && l.holidayPref === "振休希望" && l.status === "承認");
  const sundayWorks  = holidayWorks.filter(l => l.holidayType === "sunday");
  const otherWorks   = holidayWorks.filter(l => l.holidayType !== "sunday");

  const countBalance = (works) => {
    const granted = works.reduce((a, l) => a + l.days, 0);
    const used    = works.filter(l => usedWorkIds.has(l.id)).reduce((a, l) => a + l.days, 0);
    return { granted, used, balance: granted - used, works };
  };

  return {
    sunday: countBalance(sundayWorks),
    other:  countBalance(otherWorks),
    total:  (sundayWorks.length + otherWorks.length) > 0
              ? countBalance(holidayWorks).balance
              : 0,
  };
}

// 振替取得可能な休日出勤リスト（期限3ヶ月以内 & 未消化）
function getAvailableFurikaeWorks(sid, leaveData) {
  const leaves = leaveData[sid] || [];
  const now = new Date();
  const usedIds = new Set(
    leaves.filter(l => l.type === "furikae" && l.holidayWorkId).map(l => l.holidayWorkId)
  );
  return leaves.filter(l => {
    if (l.type !== "holiday" || l.holidayPref !== "振休希望" || l.status !== "承認") return false;
    if (usedIds.has(l.id)) return false;
    const expiry = addThreeMonths(l.date);
    return now <= expiry;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

// 振休期限アラート（期限14日以内のもの）
function getFurikaeExpiryAlerts(sid, leaveData) {
  const works = getAvailableFurikaeWorks(sid, leaveData);
  const now = new Date();
  return works.map(w => {
    const expiry = addThreeMonths(w.date);
    const daysLeft = Math.ceil((expiry - now) / 86400000);
    return { ...w, expiryDate: dateStrJST(expiry), daysLeft }; // [2026-05-07] Codex#3 UTC前日化を回避
  }).filter(w => w.daysLeft <= 14);
}
// [2026-05-21] 白基調レイアウト対応：明色背景でも読めるよう、テキスト色を濃く / dim を淡いトーンに
const STATUS_CFG = {
  "進行中":{ color:"#15803d", dim:"#dcfce7" },
  "準備中":{ color:"#b45309", dim:"#fef3c7" },
  "未定":  { color:"#6d28d9", dim:"#ede9fe" },
  "完了":  { color:"#4b5563", dim:"#e5e7eb" },
  "中止":  { color:"#b91c1c", dim:"#fee2e2" },
};
const STATUSES = ["進行中","準備中","未定","完了","中止"];
const OVERTIME_START = 17;
// [2026-08-07] 残業の起算を 17:00 → 17:30 に変更（勝間さん指示）。
// 17:30 までの打刻は残業に含めない。17:30 を過ぎた分だけを残業として集計する。
const OVERTIME_START_MIN = 30;
// [2026-08-07] 17:30 を過ぎた時点で付く最低残業（0.5H スタート）
const OVERTIME_MIN_H = 0.5;
// [2026-08-07] 0.5H を付けたあとの加算単位（10分ごとに +10分）
const OVERTIME_STEP_MIN = 10;
// [2026-08-07] 新ルールの適用開始日。この日以降の【出勤打刻】から新ルールを適用する。
// これより前の打刻は旧ルール（17:00起算・実測値そのまま）で計算 = 過去の集計値・給与は変わらない。
// 適用開始日を変えたい場合はここだけ書き換える。
const OVERTIME_RULE_V2_FROM = "2026-08-07";
// [2026-10-16] V3（法律どおり）：この日以降の【出勤打刻】から適用。2026年10月度（9/26〜10/25）の給与から。
//   ・残業は 17:00 から 1分単位（17:30 未満を0にする扱いと、10分未満の切り捨てをやめる）
//   ・早出の日も「実働−6.5H」を1分単位で
//   ・月の合計は、1時間未満の端数を 30分未満は切り捨て・30分以上は1時間に切り上げ（給与計算で）
//   ・時給は 基礎賃金 ÷ 1か月平均所定労働時間（就業規則 第41条第3項）
//   毎日の切り捨ては労基法24条（全額払い）に反するため（勝間さん決定 2026-10-16）
const OVERTIME_RULE_V3_FROM = "2026-09-26";
function isOvertimeV3(clockIn) { return dateStrJST(new Date(clockIn)) >= OVERTIME_RULE_V3_FROM; }
// [2026-05-14] 外注：応援の固定単価（円/人・日）。将来変更時はここを書き換える
// [2026-06-16] 30000→35000 に変更（勝間さん指示）
const SUPPORT_UNIT_PRICE = 35000;

// ── INPUT STYLE ──
const IS = {width:"100%",background:"#ffffff",border:"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",color:"#111827",fontSize:14,outline:"none",boxSizing:"border-box"};

// ── HELPERS ──
const fmt      = n => n>=10000?`¥${Math.round(n/10000)}万`:`¥${n.toLocaleString()}`;
const fmtFull  = n => `¥${Math.round(n).toLocaleString()}`;
// [2026-05-07] Codex指摘#3: toISOString は UTC基準なので JST 0:00-8:59 に前日を返すバグ。
// dateStrJST と同じく JS の Date のローカルタイム（実行環境=ブラウザ=JST想定）で組み立てる。
const todayStr = () => { const t=new Date(); const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), dd=String(t.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
// [2026-04-21] clockIn等のISO日時が「ローカルタイムの今日」に該当するか判定。
// 注: clockIn は UTC の ISO 文字列なので単純 startsWith(todayStr()) で比較すると
// JST 9時以降に日付がズレて openLog が取れないバグが出ていた。
function isSameLocalDay(isoStr, ref = new Date()) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return false; // [2026-05-07] Codex#8 不正ISOで false を返す
  return d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate();
}
const uid      = () => Math.random().toString(36).slice(2,9);
// [2026-05-07] Codex指摘#8: null/undefined/不正値で落ちないよう guard。"--:--" を返す
const timeStr  = d => { if(!d) return "--:--"; const t=new Date(d); return isNaN(t.getTime())?"--:--":t.toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}); };
// [2026-05-07] Codex指摘#3: monthStr も同様にローカル基準に修正
const monthStr = () => { const t=new Date(); const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'); return `${y}-${m}`; };
// [2026-04-15] UTC→JST表示用ヘルパー追加。ISO文字列のslice(11,16)で直接切るとUTCのまま表示されるバグ対策
// [2026-05-07] Codex指摘#8: null/undefined/不正値で落ちないよう guard
const dateStrJST = d => { if(!d) return ""; const t=new Date(d); if(isNaN(t.getTime())) return ""; const y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,'0'), dd=String(t.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
const dateMDJST  = d => { if(!d) return ""; const t=new Date(d); if(isNaN(t.getTime())) return ""; return `${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; };
// datetime-local input 用: ISO(UTC) → JSTローカル時刻文字列 "YYYY-MM-DDTHH:MM"
const toLocalDtInput = iso => { if(!iso) return ""; const t=new Date(iso); const y=t.getFullYear(), mo=String(t.getMonth()+1).padStart(2,'0'), d=String(t.getDate()).padStart(2,'0'), h=String(t.getHours()).padStart(2,'0'), mi=String(t.getMinutes()).padStart(2,'0'); return `${y}-${mo}-${d}T${h}:${mi}`; };

// [2026-04-21] 就業規則: 始業8:00、終業17:00、休憩は下記3枠（計150分）
// 実働時間・残業時間は以下の休憩時間帯との重複を自動で差し引く
const BREAK_PERIODS = [
  { start: "09:50", end: "10:30" }, // 午前休憩 40分
  { start: "11:50", end: "13:00" }, // 昼休憩 70分
  { start: "14:50", end: "15:30" }, // 午後休憩 40分
];

// "HH:MM" を基準日の Date に変換
function timeOnDate(dateRef, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateRef);
  d.setHours(h, m, 0, 0);
  return d;
}

// 指定区間 [start, end] と休憩時間帯の重複合計(ms)
function overlapWithBreaks(startDate, endDate) {
  const ref = new Date(startDate);
  let ms = 0;
  for (const bp of BREAK_PERIODS) {
    const bs = timeOnDate(ref, bp.start).getTime();
    const be = timeOnDate(ref, bp.end).getTime();
    const os = Math.max(startDate.getTime(), bs);
    const oe = Math.min(endDate.getTime(), be);
    if (oe > os) ms += oe - os;
  }
  return ms;
}

// [2026-10-14] 早出の日の残業（就業規則 第18条：所定の実働は1日6.5時間）
//   早出チェック（earlyStart）の打刻がある日は「その日の実働（休憩を除く。複数の打刻は合計）− 6.5時間」を残業にし、10分単位で切り捨てる。
//   早く上がった日はそのぶん少なくなる。チェックのない日は従来どおり calcOvertime（17:30以降）。夜勤は0。
//   早出の日の残業は、その日の最後の打刻にまとめて付ける（行ごとの表示と合計が一致するように）。
const SHOTEI_WORK_H = 6.5;
function workedHours(clockIn, clockOut) {
  const s = new Date(clockIn), e = new Date(clockOut);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) return 0;
  return Math.max(0, (e - s - overlapWithBreaks(s, e)) / 3600000);
}
// [2026-10-19] 休憩が取れなかった分（17時を過ぎた退勤で本人が申告）。V3（2026年10月度〜）の打刻だけ、働いた時間として残業に足す
function breakShortH(l) {
  return (l && isOvertimeV3(l.clockIn)) ? (Number(l.breakShortMin) || 0) / 60 : 0;
}
function overtimeByLog(logs) {
  const out = new Map();
  const groups = new Map();
  for (const l of logs || []) {
    if (!l || !l.clockOut) continue;
    if (l.isNightShift) { out.set(l.id, 0); continue; }
    const key = (l.userId || l.userName || "") + "|" + dateStrJST(l.clockIn);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  for (const arr of groups.values()) {
    if (arr.some(l => l.earlyStart)) {
      const total = arr.reduce((s, l) => s + workedHours(l.clockIn, l.clockOut) + breakShortH(l), 0);
      const v3 = arr.some(l => isOvertimeV3(l.clockIn));
      const ot = v3 ? Math.floor(Math.max(0, total - SHOTEI_WORK_H) * 60 + 1e-9) / 60   // V3：1分単位
                    : Math.floor(Math.max(0, total - SHOTEI_WORK_H) * 6 + 1e-9) / 6;    // 旧：10分単位で切り捨て
      arr.sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
      arr.forEach((l, i) => out.set(l.id, i === arr.length - 1 ? ot : 0));
    } else {
      for (const l of arr) out.set(l.id, calcOvertime(l.clockIn, l.clockOut) + breakShortH(l));
    }
  }
  return out;
}
// [2026-10-19] 本人都合の早上がりで「欠勤」を選んだ打刻の、差し引く時間（分）。
//   退勤から17:00までのうち、休憩の時間を除いた分（1分単位。切り上げない＝働いた分を引きすぎない）
function absenceMinutesOfLog(l) {
  if (!l || !l.clockOut || l.isNightShift) return 0;
  if (l.early_leave_category !== "本人都合" || l.earlyLeavePay !== "absence") return 0;
  const out = new Date(l.clockOut);
  const end = new Date(out); end.setHours(OVERTIME_START, 0, 0, 0);
  if (isNaN(out.getTime()) || out >= end) return 0;
  return Math.floor((end - out - overlapWithBreaks(out, end)) / 60000);
}

// 打刻の合計残業（給与計算・月の合計で使う。同じ日の打刻はまとめて判定）
function sumOvertimeH(logs) {
  let s = 0;
  for (const v of overtimeByLog(logs).values()) s += v;
  return s;
}
// 1件の打刻の残業（行ごとの表示用）。allLogs から同じ人・同じ日の打刻を見て判定する
function overtimeOfLog(l, allLogs) {
  if (!l || !l.clockOut || l.isNightShift) return 0;
  const d = dateStrJST(l.clockIn);
  const who = l.userId || l.userName;
  const same = (allLogs || []).filter(x => x && (x.userId || x.userName) === who && x.clockIn && dateStrJST(x.clockIn) === d);
  if (!same.some(x => x.id === l.id)) same.push(l);
  return overtimeByLog(same).get(l.id) || 0;
}

// [2026-04-22] 休憩控除の内訳（打刻詳細モーダル用）
// 各休憩枠について重複分(分)を返す
function calcBreakBreakdown(clockIn, clockOut) {
  const start = new Date(clockIn);
  const end = effectiveClockOut(clockIn, clockOut);
  const ref = new Date(start);
  const labels = ["午前休憩", "昼休憩", "午後休憩"];
  return BREAK_PERIODS.map((bp, i) => {
    const bs = timeOnDate(ref, bp.start).getTime();
    const be = timeOnDate(ref, bp.end).getTime();
    const os = Math.max(start.getTime(), bs);
    const oe = Math.min(end.getTime(), be);
    const overlapMin = oe > os ? Math.round((oe - os) / 60000) : 0;
    return { label: labels[i], range: `${bp.start}-${bp.end}`, minutes: overlapMin };
  });
}

// [2026-04-21] 計算用の退勤時刻: 17:00以前の早退は17:00まで勤務した扱い。
// [2026-05-07] 17:30未満退勤も17:00扱いに拡張（30分未満の細かい残業を発生させない）
// 実際の打刻時刻はDBに保持（早退の把握のため表示側では実時刻を使用）。
function effectiveClockOut(clockIn, clockOut) {
  const cin = new Date(clockIn);
  const cout = new Date(clockOut);
  if (isNaN(cin.getTime()) || isNaN(cout.getTime())) return cout;
  const seventeen = new Date(cin);
  seventeen.setHours(OVERTIME_START, 0, 0, 0);
  if (isOvertimeV3(clockIn)) return cout < seventeen ? seventeen : cout;   // [2026-10-16] V3：17:00以降は実際の時刻
  const seventeenThirty = new Date(cin);
  seventeenThirty.setHours(OVERTIME_START, 30, 0, 0);
  return cout < seventeenThirty ? seventeen : cout;
}

// 実働時間（計算用: 早退も17:00まで扱い・休憩差し引き済み）
function calcWorkedHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const cin = new Date(clockIn);
  if (isNaN(cin.getTime())) return 0;
  const eff = effectiveClockOut(clockIn, clockOut);
  if (eff <= cin) return 0;
  const breakMs = overlapWithBreaks(cin, eff);
  return Math.max(0, (eff - cin - breakMs) / 3600000);
}

// 残業時間（休憩との重複を差し引いた時間）
// [2026-05-07] effectiveClockOut 経由に変更。17:30未満退勤は17:00扱いとなり残業0
// [2026-08-07] 新ルール（OVERTIME_RULE_V2_FROM 以降の出勤打刻）:
//   ・起算 17:30。17:30 までの打刻は残業に含めない
//   ・17:30 を過ぎたら 0.5H。以降は 10分 経過ごとに +10分（端数の10分未満は切り捨て）
//   ・返り値は小数第1位まで（○.○H）に丸める
//   例: 17:31→0.5h / 17:40→0.7h / 17:50→0.8h / 18:00→1.0h / 18:31→1.5h / 19:00→2.0h
//   それより前の打刻は旧ルール（起算17:00・実測値）のまま計算し、過去の集計を変えない。
function calcOvertime(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const eff = effectiveClockOut(clockIn, clockOut);
  if (isNaN(eff.getTime())) return 0;
  const cin = new Date(clockIn);
  const isV3 = isOvertimeV3(clockIn);
  const isV2 = !isV3 && dateStrJST(cin) >= OVERTIME_RULE_V2_FROM;
  const overtimeStart = new Date(cin);
  overtimeStart.setHours(OVERTIME_START, isV2 ? OVERTIME_START_MIN : 0, 0, 0);
  if (eff <= overtimeStart) return 0;
  const start = cin > overtimeStart ? cin : overtimeStart;
  const breakMs = overlapWithBreaks(start, eff);
  const hours = Math.max(0, (eff - start - breakMs) / 3600000);
  if (isV3) return Math.floor((eff - start - breakMs) / 60000) / 60;   // 1分単位（秒は切り捨て）
  if (!isV2) return hours;
  if (hours <= 0) return 0;
  // 17:30 を過ぎた時点で 0.5H。以降は 10分 経過するごとに +10分。
  // （1e-9 は 18:00ちょうど等が浮動小数誤差で1ステップ落ちるのを防ぐ保険）
  const steps = Math.floor(hours * 60 / OVERTIME_STEP_MIN + 1e-9);
  const raw = OVERTIME_MIN_H + steps * (OVERTIME_STEP_MIN / 60);
  return Math.round(raw * 10) / 10; // ○.○H に丸める
}

// ──────────────────────────────
// [2026-07-13] 夜勤用の計算・表示ヘルパー（日勤ロジックには一切触れない別ルート）
// ──────────────────────────────
// 夜勤の実働時間: 定時(8:00-17:00)や休憩・残業の概念なし。単純に 退勤-出勤。
function calcNightWorkedHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const cin = new Date(clockIn), cout = new Date(clockOut);
  if (isNaN(cin.getTime()) || isNaN(cout.getTime())) return 0;
  return Math.max(0, (cout - cin) / 3600000);
}
// 出勤と退勤がローカルカレンダー上で別日か（日付またぎ判定・夜勤の「翌」表示用）
function isCrossDayClock(clockIn, clockOut) {
  if (!clockIn || !clockOut) return false;
  const cin = new Date(clockIn), cout = new Date(clockOut);
  if (isNaN(cin.getTime()) || isNaN(cout.getTime())) return false;
  return !isSameLocalDay(clockOut, cin);
}
// [2026-07-14] 「今日」の一覧・稼働状況に表示すべきログか。
//   日勤: 当日の打刻（従来どおり isSameLocalDay）
//   夜勤: 当日の打刻 or 稼働中（未退勤かつ出勤から24時間以内）＝前夜開始の夜勤が翌朝に消えないように
function isTodayOrActiveNight(l, ref = new Date()) {
  if (isSameLocalDay(l.clockIn, ref)) return true;
  return !!l.isNightShift && !l.clockOut && (ref.getTime() - new Date(l.clockIn).getTime()) < 24 * 3600000;
}
// 夜勤の時刻レンジ表示。日付をまたぐ場合は退勤に「翌」を付ける（例: "18:00→翌6:00"）
// clockOut が無い場合は outLabel（"稼働中"等）を使う
function fmtNightRange(clockIn, clockOut, outLabel) {
  const inStr = timeStr(clockIn);
  if (!clockOut) return `${inStr}→${outLabel || "稼働中"}`;
  const prefix = isCrossDayClock(clockIn, clockOut) ? "翌" : "";
  return `${inStr}→${prefix}${timeStr(clockOut)}`;
}

// ──────────────────────────────
// [2026-04-22] 案件人工・金額計算ヘルパー
// ──────────────────────────────
// 実人工（打刻ベース: 退勤済みログから 1人工+残業4hで+1人工 方式）
function calcActualMandays(clockLogs, projectId) {
  return (clockLogs||[]).filter(l=>l.projectId===projectId&&l.clockOut).reduce((sum,l)=>{
    // [2026-07-14] 夜勤は残業概念なし → 1人工固定（擬似残業で人工が膨張するのを防ぐ）
    const ot = l.isNightShift ? 0 : calcOvertime(l.clockIn, l.clockOut);
    return sum + 1 + Math.floor(ot / 4);
  }, 0);
}
// [2026-10-02] 外注の表示用ラベル（打刻修正の申請・承認で使う）
function outsourceLabel(type, count) {
  if (type === "support") return `応援 ${count||0}人`;
  if (type === "subcontract") return `請負 ${count||0}人`;
  return "外注なし";
}
// [2026-05-14] 案件の外注集計（応援費合計・請負人数・金額未入力件数）
function calcOutsourceSummary(clockLogs, projectId) {
  const rows = (clockLogs||[]).filter(l=>l.projectId===projectId&&l.outsourceType);
  let supportCount=0, supportAmount=0, subcontractCount=0, subcontractAmount=0, unpriced=0;
  for (const l of rows) {
    const cnt = Number(l.outsourceCount)||0;
    const amt = (l.outsourceAmount==null) ? null : Number(l.outsourceAmount)||0;
    if (l.outsourceType==="support") { supportCount+=cnt; supportAmount+=(amt||0); }
    else if (l.outsourceType==="subcontract") {
      subcontractCount+=cnt;
      if (amt==null) unpriced++; else subcontractAmount+=amt;
    }
  }
  return { supportCount, supportAmount, subcontractCount, subcontractAmount,
    totalAmount: supportAmount+subcontractAmount, unpriced };
}

// 目標人工 = 請負金額(税抜) ÷ 会社人工単価
function calcTargetMandays(contractAmount, dailyRate) {
  if (!contractAmount || !dailyRate || dailyRate <= 0) return 0;
  return contractAmount / dailyRate;
}

// [2026-09-29] 旧 calcPricePerManday / calcNinkuStatus（進捗なしで「楽勝」判定・しきい値7万固定）は
//   calcProjectCost に置き換えて削除した。

// ──────────────────────────────
// [2026-09-29] 案件の人工・粗利・判定（唯一の計算。案件カード・詳細・人工バー・右上バッジ・AIチャットは全部これを使う）
//   ルール① 物差しは1本：目標人工 = (請負額 − 外注費) ÷ 目標単価（案件ごとの単価 → 無ければ会社の既定値）
//   ルール② 判定は進捗込み：使った人工(自社打刻＋補正人工＋応援人数) ÷ 進捗% = 予測最終人工。
//           (請負額 − 外注費) ÷ 予測最終人工 が 目標以上=順調／損益分岐以上=注意／未満=赤字。進捗(進捗報告)が無ければ判定しない
//   ルール③ 粗利 = 請負額 − 原価。分母は請負額（見積額では割らない）
//   外注費 = 経費の外注(手入力) ＋ 外注打刻の「請負」金額。外注打刻の「応援」は人数を人工に数えるので金額は引かない（二重にしない）
//   ※ 基本は請負額のみ。管理画面用に「追加工事込み」(〜All) も同じ式で並べて返す（スタッフ画面には出さない）
// ──────────────────────────────
const NINKU_TARGET_RATE_DEFAULT = 72000;    // [2026-10-09] 62000→72000（決算＋ジョブカン出勤簿から：今の体制の損益分岐は材料込みで約65,000円/人工）。[2026-09-29] 65000→62000。会社の目標単価（app_settings.default_ninku_rate が無い時）
const NINKU_BREAKEVEN_RATE_DEFAULT = 65000; // [2026-10-09] 52000→65000（同上）。[2026-09-29] 50000→52000。損益分岐単価（app_settings.breakeven_ninku_rate が無い時）
const MANUAL_MANDAY_COST = 25000;           // 補正人工(打刻外)1人工あたりの人件費（従来の案件カードと同じ）

// 目標単価・損益分岐単価（settings は app_settings の key→value）
function getNinkuRates(p, settings) {
  const companyTarget = Number(settings?.default_ninku_rate) || NINKU_TARGET_RATE_DEFAULT;
  const breakevenRate = Number(settings?.breakeven_ninku_rate) || NINKU_BREAKEVEN_RATE_DEFAULT;
  const projectRate = Number(p?.ninkuRate) || 0;
  return { targetRate: projectRate || companyTarget, companyTarget, breakevenRate, rateIsCustom: projectRate > 0 };
}

// 最新の進捗%（進捗報告 progress_reports の最新値。完了案件は100%。報告なし・0%は null＝判定できない）
function getLatestProgress(p, progressReports) {
  if (p?.status === "完了") return 100;
  let latest = null;
  for (const r of (progressReports || [])) {
    if (r.projectId !== p.id) continue;
    if (!latest || new Date(r.reportedAt) > new Date(latest.reportedAt)) latest = r;
  }
  const pct = latest ? Number(latest.percent) : 0;
  return pct > 0 ? Math.min(pct, 100) : null;
}

// 使った人工 = 自社打刻（calcActualMandays）＋補正人工＋応援（外注打刻の応援人数）。スタッフ画面もこれを使う
function calcUsedMandays(clockLogs, p) {
  const ownMandays = calcActualMandays(clockLogs, p.id) + (Number(p.manualMandays) || 0);
  const supportMandays = calcOutsourceSummary(clockLogs, p.id).supportCount;
  return { ownMandays, supportMandays, usedMandays: ownMandays + supportMandays };
}

// 1人工あたり売上 → 判定ラベル
function judgeNinku(ppm, progress, targetRate, breakevenRate) {
  if (!progress) return { level: "unknown", label: "判定できません（進捗を入力してください）", color: "#6b7280" };
  if (ppm === null) return { level: "none", label: "—", color: "#9ca3af" };
  if (ppm >= targetRate) return { level: "good", label: "順調", color: "#16a34a" };
  if (ppm >= breakevenRate) return { level: "warn", label: "注意", color: "#f59e0b" };
  return { level: "bad", label: "赤字", color: "#ef4444" };
}
const NINKU_NO_DATA = { level: "none", label: "—", color: "#9ca3af" };
const marginColorOf = pct => pct === null ? "#9ca3af" : pct >= 40 ? "#22c55e" : pct >= 25 ? "#f59e0b" : "#ef4444";

// ctx: { clockLogs, staff, expenseItems, materialCosts, additionalEstimates, progressReports, settings }
function calcProjectCost(p, ctx) {
  const c = ctx || {};
  const logs = c.clockLogs || [];
  const contractAmount = Number(p.contractAmount) || 0; // 基本（請負）
  const addEstSum = (c.additionalEstimates || []).filter(e => e.projectId === p.id)
    .reduce((s, e) => s + (Number(e.contractAmount) || 0), 0);
  const revenueAll = contractAmount + addEstSum;         // 追加工事込み（管理画面の参考）
  const { targetRate, companyTarget, breakevenRate, rateIsCustom } = getNinkuRates(p, c.settings);

  // 原価（今日までに払った実費）：人件費は打刻ごとにスタッフの日給×人工
  const os = calcOutsourceSummary(logs, p.id);
  const manualMandays = Number(p.manualMandays) || 0;
  let labor = 0;
  for (const l of logs) {
    if (l.projectId !== p.id || !l.clockOut) continue;
    const s = (c.staff || []).find(x => x.name === l.userName);
    const ot = l.isNightShift ? 0 : calcOvertime(l.clockIn, l.clockOut);
    labor += (Number(s?.dailyRate) || 0) * (1 + Math.floor(ot / 4));
  }
  labor += manualMandays * MANUAL_MANDAY_COST;
  const exp = (c.expenseItems || []).filter(e => e.projectId === p.id);
  const sumCat = cat => exp.filter(e => e.category === cat).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const materialInvoice = (c.materialCosts || []).filter(m => m.projectId === p.id).reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const costs = {
    labor, material: sumCat("material") + materialInvoice, materialInvoice,
    subcontract: sumCat("subcontract"), other: sumCat("other"), overhead: sumCat("overhead"),
    outsource: os.totalAmount, // 外注(打刻)：応援＋請負の金額（原価には両方入れる）
  };
  const totalCost = costs.labor + costs.material + costs.subcontract + costs.other + costs.overhead + costs.outsource;
  const grossProfit = contractAmount - totalCost;
  const marginPct = contractAmount > 0 ? grossProfit / contractAmount * 100 : null;
  const grossProfitAll = revenueAll - totalCost;
  const marginPctAll = revenueAll > 0 ? grossProfitAll / revenueAll * 100 : null;

  // 判定用の外注費：経費の外注＋外注打刻の請負金額（応援の金額は人工側で数えるので入れない）
  const outsourceDeduct = costs.subcontract + os.subcontractAmount;
  const netContract = Math.max(0, contractAmount - outsourceDeduct);    // 自社で稼ぐ分（請負−外注費）
  const netRevenueAll = Math.max(0, revenueAll - outsourceDeduct);      // 追加込み−外注費

  // 人工：自社打刻＋補正人工＋応援人数
  const { ownMandays, supportMandays, usedMandays } = calcUsedMandays(logs, p);
  const targetMandays = netContract / targetRate;
  const targetMandaysAll = netRevenueAll / targetRate;
  const consumePct = targetMandays > 0 ? usedMandays / targetMandays * 100 : null;

  // 判定（進捗込み）
  const progress = getLatestProgress(p, c.progressReports);
  const forecastMandays = (progress && usedMandays > 0) ? usedMandays / (progress / 100) : null;
  const ppm = (forecastMandays && contractAmount > 0) ? netContract / forecastMandays : null;
  const ppmAll = (forecastMandays && revenueAll > 0) ? netRevenueAll / forecastMandays : null;
  const status = (contractAmount <= 0 || usedMandays <= 0) ? NINKU_NO_DATA : judgeNinku(ppm, progress, targetRate, breakevenRate);
  const statusAll = (revenueAll <= 0 || usedMandays <= 0) ? NINKU_NO_DATA : judgeNinku(ppmAll, progress, targetRate, breakevenRate);

  return {
    contractAmount, addEstSum, revenueAll, outsourceDeduct, netContract, netRevenueAll,
    targetRate, companyTarget, breakevenRate, rateIsCustom,
    ownMandays, supportMandays, usedMandays, targetMandays, targetMandaysAll, consumePct,
    progress, forecastMandays, ppm, ppmAll, status, statusAll,
    costs, totalCost, grossProfit, marginPct, marginColor: marginColorOf(marginPct),
    grossProfitAll, marginPctAll, os,
  };
}

// AIチャットに渡す案件の人工・粗利（calcProjectCost の結果をそのまま文字にする。進行中＋請負額ありの案件）
function buildProjectStatsText(projects, ctx) {
  const yen = n => Math.round(n || 0).toLocaleString() + "円";
  const pct = n => n === null ? "—" : n.toFixed(1) + "%";
  return (projects || []).filter(p => p.status !== "完了" && (Number(p.contractAmount) || 0) > 0).map(p => {
    const r = calcProjectCost(p, ctx);
    const add = r.addEstSum > 0;
    const prog = r.progress && r.ppm !== null
      ? `進捗${r.progress}% 予測最終${r.forecastMandays.toFixed(1)}人工 1人工売上${yen(r.ppm)}${add ? `（追加込み${yen(r.ppmAll)}）` : ""}`
      : (r.progress ? `進捗${r.progress}%` : "進捗未入力");
    return `- ${p.name}: 請負${yen(r.contractAmount)}${add ? ` 追加工事${yen(r.addEstSum)}` : ""} 外注費(判定で請負から差引)${yen(r.outsourceDeduct)} 目標単価${yen(r.targetRate)} 損益分岐${yen(r.breakevenRate)} ` +
      `目標人工${r.targetMandays.toFixed(1)} 使った人工${r.usedMandays}（自社${r.ownMandays}＋応援${r.supportMandays}） ${prog} 判定:${r.status.label} ` +
      `原価${yen(r.totalCost)}（人件費${yen(r.costs.labor)} 材料${yen(r.costs.material)} 外注${yen(r.costs.subcontract + r.costs.outsource)} その他${yen(r.costs.other + r.costs.overhead)}） ` +
      `粗利${yen(r.grossProfit)}（${pct(r.marginPct)}）${add ? ` 追加込み粗利${yen(r.grossProfitAll)}（${pct(r.marginPctAll)}）` : ""}`;
  }).join("\n");
}

// 掛け率 = 請負金額 ÷ 見積金額（見積あるとき限定）
function calcMarkupRate(estimate, contractAmount) {
  if (!estimate || estimate <= 0 || !contractAmount) return null;
  return contractAmount / estimate;
}

// [2026-05-01] 案件の最終活動時刻
// メモ/画像/進捗/経費/追加工事/材料費/打刻 すべての最新タイムスタンプを取る
// 案件一覧のソートに使用（最新が上）
function getProjectLastActivity(p, ctx) {
  const t = [];
  if (p.completedAt) t.push(new Date(p.completedAt).getTime());
  (p.attachments || []).forEach(a => { if (a.createdAt) t.push(new Date(a.createdAt).getTime()); });
  (ctx?.progressReports || []).filter(r => r.projectId === p.id).forEach(r => { if (r.reportedAt) t.push(new Date(r.reportedAt).getTime()); });
  (ctx?.expenseItems || []).filter(e => e.projectId === p.id).forEach(e => { if (e.createdAt) t.push(new Date(e.createdAt).getTime()); });
  (ctx?.additionalWorks || []).filter(w => w.projectId === p.id).forEach(w => { if (w.createdAt) t.push(new Date(w.createdAt).getTime()); });
  (ctx?.materialCosts || []).filter(m => m.projectId === p.id).forEach(m => { if (m.createdAt) t.push(new Date(m.createdAt).getTime()); });
  (ctx?.clockLogs || []).filter(l => l.projectId === p.id).forEach(l => {
    if (l.clockOut) t.push(new Date(l.clockOut).getTime());
    else if (l.clockIn) t.push(new Date(l.clockIn).getTime());
  });
  return t.length ? Math.max(...t) : 0;
}

// 税込み金額（10%固定）
function calcWithTax(amountExcl, rate = 0.10) {
  if (!amountExcl) return 0;
  return Math.round(amountExcl * (1 + rate));
}

// 案件一覧サマリ（管理者画面のヘッダー用）。[2026-09-29] calcProjectCost に統一。進行中＋請負額ありの案件が対象
function summarizeProjectsNinku(projects, ctx) {
  const items = (projects||[])
    .filter(p => p.status !== "完了" && p.contractAmount > 0)
    .map(p => ({ p, r: calcProjectCost(p, ctx), markup: calcMarkupRate(p.estimate, p.contractAmount) }));
  const judged = items.filter(x => x.r.ppm !== null);
  const avgPpm = judged.length > 0
    ? Math.round(judged.reduce((a,x)=>a+x.r.ppm, 0) / judged.length)
    : null;
  const dangerCount = items.filter(x => x.r.status.level === "bad").length;
  const unknownCount = items.filter(x => x.r.status.level === "unknown").length;
  const withMarkup = items.filter(x => x.markup !== null);
  const avgMarkup = withMarkup.length > 0
    ? withMarkup.reduce((a,x)=>a+x.markup, 0) / withMarkup.length
    : null;
  const r0 = getNinkuRates(null, ctx?.settings);
  return { total: items.length, avgPpm, dangerCount, unknownCount, avgMarkup, targetRate: r0.companyTarget, breakevenRate: r0.breakevenRate };
}

// [2026-04-16] 旧getBillingAlerts(customers.billingDateベース)は削除。
// 新版(closing_day/payment_dayベース)は下部に定義。

// GPS逆ジオコーディング（Nominatim / OpenStreetMap 無料API）
async function getLocationName(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`,
      { headers: { "User-Agent": "shinsei-field-app/14" } }
    );
    const d = await r.json();
    const a = d.address || {};
    return `${a.state||""}${a.city||a.town||a.village||""}`;
  } catch { return ""; }
}

// ── SUPABASE DATA HELPERS ──
let _sbErrorHandler = null;
const sbSetErrorHandler = (fn) => { _sbErrorHandler = fn; };
// [2026-04-22] 401検知時に呼び出される自動ログアウトコールバック。
// user.html / admin.html が App 初期化時に登録する。呼ばれると setUser(null) 相当の処理で PIN 画面に戻る。
let _sbSessionExpiredHandler = null;
const sbSetSessionExpiredHandler = (fn) => { _sbSessionExpiredHandler = fn; };

// [2026-07-09] 読み取りは全て api-gateway 経由（rest_read・セッション認証必須）に統一。
//   従来は anon キーで直接 PostgREST を叩いており、ログイン無しでも全データ（GPS・連絡先等）が
//   読めてしまっていた。RLS で anon SELECT を止め、正規ログインユーザーだけが読めるようにする。
//   opts は後方互換のため残すが、sb() は読み取り専用（書き込みは apiWrite/apiGateway 経由）。
const sb = async (path, opts = {}) => {
  if (!_sessionToken) {
    // 未ログイン時は読み取り不可（データはログイン後に取得する）
    return null;
  }
  try {
    const r = await fetch(API_GATEWAY_URL, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: _sessionToken, action: "rest_read", data: { path } }),
    });
    if (!r.ok) {
      // [2026-07-18] 401=セッション期限切れ。読み取りも api-gateway 経由(rest_read=認証必須)になった(2026-07-09)ため、
      //   スタッフの30分セッションが切れた状態で起動すると全 load が null になり user.jsx が「接続エラー」画面で固着していた。
      //   apiGateway() と同様に自動ログアウトして PIN 画面へ戻す（誤解を招く「接続エラー」は出さない）。
      if (r.status === 401) {
        setSessionToken(null);
        saveSavedUser(null);
        if (_sbSessionExpiredHandler) _sbSessionExpiredHandler();
        return null;
      }
      const msg = `DB通信エラー (${r.status})`;
      if (_sbErrorHandler) _sbErrorHandler(msg);
      return null;
    }
    const res = await r.json().catch(() => null);
    if (!res || !res.ok) {
      if (res && res.error && _sbErrorHandler) _sbErrorHandler(res.error);
      return null;
    }
    return res.result;
  } catch (e) {
    const msg = "ネットワークエラー: " + e.message;
    if (_sbErrorHandler) _sbErrorHandler(msg);
    return null;
  }
};

// ── API GATEWAY ──
let _sessionToken = null;
// [2026-07-18] セッションが生きているか（トークン保持中か）。user.jsx が「接続エラー」と「セッション切れ」を区別するのに使う。
const sbHasSession = () => !!_sessionToken;
// [2026-04-20] claude-proxy呼び出し用ヘルパー（tokenを自動付与、AIチャット用）
async function callClaudeProxy(payload) {
  const body = { ...payload, token: _sessionToken };
  return await fetch(CLAUDE_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify(body),
  });
}
// [2026-04-15] セッション永続化: localStorageに保存してリロード/タブ閉じても復元できるように
const setSessionToken = (t) => {
  _sessionToken = t;
  if (t) localStorage.setItem("shinsei_session", t);
  else localStorage.removeItem("shinsei_session");
};
// [2026-09-25] 監査 A-3：退出時にサーバ側のセッションも削除する。
//   呼び出し時点のトークンを控えてから送るので、直後に setSessionToken(null) してよい（await 不要）。
//   keepalive:true で画面遷移（window.location.href="/"）後も送信を続ける。
//   失敗・通信不可でも何もしない（ローカルのログアウトは呼び出し側でそのまま続行する）。
const sbServerLogout = () => {
  try {
    const t = _sessionToken || localStorage.getItem("shinsei_session");
    if (!t) return;
    fetch(API_GATEWAY_URL, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ token: t, action: "logout", data: {} }),
    }).catch(() => {});
  } catch (_) { /* 送信できなくてもローカルのログアウトは続行 */ }
};
// 起動時にlocalStorageから復元。呼び出し側で「復元したuser/token」を state に反映する
const loadSavedSession = () => {
  const token = localStorage.getItem("shinsei_session");
  const userJson = localStorage.getItem("shinsei_user");
  if (!token || !userJson) return null;
  try { const user = JSON.parse(userJson); _sessionToken = token; return { user, token }; }
  catch { localStorage.removeItem("shinsei_session"); localStorage.removeItem("shinsei_user"); return null; }
};
const saveSavedUser = (user) => {
  if (user) localStorage.setItem("shinsei_user", JSON.stringify(user));
  else localStorage.removeItem("shinsei_user");
};

async function apiGateway(action, data) {
  if (!_sessionToken) {
    if (_sbErrorHandler) _sbErrorHandler("セッションが無効です。再ログインしてください。");
    // [2026-04-22] セッションが無い状態で呼ばれた場合もPIN画面に戻す
    if (_sbSessionExpiredHandler) _sbSessionExpiredHandler();
    return null;
  }
  try {
    const r = await fetch(API_GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ token: _sessionToken, action, data }),
    });
    const res = await r.json();
    if (!res.ok) {
      _lastApiError = res.error || "操作に失敗しました";
      console.error(`[apiGateway] ${action} failed:`, r.status, res.error, res.detail||"");
      if (r.status === 401) {
        if (_sbErrorHandler) _sbErrorHandler("⚠ セッションが切れました。PINを入力して再ログインしてください。");
        // [2026-04-22] 401時は自動ログアウト → PIN画面に戻す
        setSessionToken(null);
        saveSavedUser(null);
        if (_sbSessionExpiredHandler) _sbSessionExpiredHandler();
      }
      // [2026-05-12] 非401エラーは _sbErrorHandler で表示しない（呼び出し側が WRITE_ERROR_MSG で表示するため二重トースト防止）
      return null;
    }
    _lastApiError = "";
    return res;
  } catch (e) {
    _lastApiError = "ネットワークエラー: " + e.message;
    console.error("[apiGateway] network error:", action, e.message);
    if (_sbErrorHandler) _sbErrorHandler("ネットワークエラー: " + e.message);
    return null;
  }
}

// ── PIN認証 ──
async function verifyPin(pin) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/auth-pin`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ pin }),
    });
    const data = await r.json();
    if (data.ok && data.user) return { user: data.user, sessionToken: data.sessionToken };
    return { error: data.error || "PINが一致しません" };
  } catch(e) { return { error: "通信エラー" }; }
}

// ── LOAD FUNCTIONS ──
async function loadStaff() {
  const rows = await sb("staff_public?select=*&order=id");
  if (!rows || rows.length === 0) return null;
  // [2026-07-09] daily_rate は staff_public から除外（migration 056）。
  //   日給が必要な admin は loadStaffRates() で別途取得しマージする。
  // [2026-09-06] surveyExempt = 全アンケートの対象外（管理者アカウント等）。
  //   isExecutive と違い、push通知や強制進捗報告など他の機能には影響しない
  return rows.map(r => ({ id:r.id, name:r.name, role:r.role, isExecutive:r.is_executive||false, surveyExempt:r.survey_exempt||false }));
}
// [2026-07-09] スタッフ日給の取得（admin限定・api-gateway経由）。
//   戻り値: [{ id, dailyRate }] / 失敗時 []
async function loadStaffRates() {
  const res = await apiGateway("list_staff_rates", {});
  if (!res || !res.ok) return [];
  return res.rates || [];
}
async function loadProjects() {
  const rows = await sb("projects?select=*&order=created_at");
  if (!rows) return null;
  const entries = await sb("entries?select=*&order=date") || [];
  // [2026-05-21] base64画像のStorage移行完了に伴い、重い data 列を取得しないように select 指定
  const attachments = await sb("attachments?select=id,project_id,type,text,name,file_url,author,created_at&order=created_at") || [];
  return rows.map(r => ({
    id:r.id, name:r.name, client:r.client, status:r.status, lead:r.lead,
    startDate:r.start_date, endDate:r.end_date, estimate:r.estimate,
    targetNinku:r.target_ninku, materialCost:r.material_cost, otherCost:r.other_cost,
    contractType:r.contract_type||"", address:r.address||"",
    // [2026-05-29] 現場座標（退勤打刻のズレ判定用）
    siteLat: r.site_lat==null ? null : Number(r.site_lat),
    siteLng: r.site_lng==null ? null : Number(r.site_lng),
    // [2026-04-20] 案件区分（新築/改修）
    workCategory: r.work_category||"",
    // [2026-04-22] 工事詳細
    workDetails: r.work_details||"",
    targetMandays:r.target_mandays||0, contractAmount:r.contract_amount||0, manualMandays:r.manual_mandays||0,
    // [2026-06-29] 案件ごとの人工単価（NULL=会社デフォルト単価を使用）
    ninkuRate:r.ninku_rate==null?null:Number(r.ninku_rate),
    // [2026-06-16] 外注費（請負外注の金額・円）。人工単価で割って切り上げた分を予定人工から差し引く表示に使用
    subcontractCost:r.subcontract_cost||0,
    // [2026-04-16] 夜タスク ②③④⑨: 請求済・顧客担当・自社担当
    invoiceSettled: !!r.invoice_settled,
    customerContact: r.customer_contact||"",
    internalOwner: r.internal_owner||"",
    // [2026-04-20] 完了ステータスになった日時（進捗報告の対象判定に使用）
    completedAt: r.completed_at||null,
    costItems:[],
    entries: entries.filter(e=>e.project_id===r.id).map(e=>({ id:e.id, date:e.date, worker:e.worker, qty:e.qty, memo:e.memo })),
    attachments: attachments.filter(a=>a.project_id===r.id).map(a=>({ id:a.id, type:a.type, text:a.text, name:a.name, data:a.data||"", fileUrl:a.file_url||"", author:a.author, createdAt:a.created_at })),
  }));
}
// [2026-05-21] 画像/PDF データ形式判定ヘルパー（base64 data URL or HTTP URL）
// Storage 化移行中の両対応表示用
const isDataUrl = v => typeof v === "string" && /^data:[^;]+;base64,/.test(v);
const isHttpUrl = v => typeof v === "string" && /^https?:\/\//.test(v);

// [2026-05-21] clock_logs 初期ロードは直近90日のみ取得（負荷削減・ログイン高速化）
// 90日より古い期間を扱う画面に入る時は ensureClockLogsSince() で追加取得＋state にマージ
// [2026-10-02] 90日だけだと工期の長い現場（八潮小・雪印など）の「使った人工」が直近90日分しか数えられず
//   大きく少なく出ていた。全件（2026-10時点で約630件）を読むように変更。件数が増えて重くなったら、
//   未完了現場の最初の打刻日以降に絞る方式を検討する。
const CLOCK_LOGS_INITIAL_SINCE = "2000-01-01T00:00:00.000Z";
function clockLogsInitialSinceIso() {
  return CLOCK_LOGS_INITIAL_SINCE;
}

// 指定日時以前のデータがstateに無い場合だけDBから追加取得してmergeするヘルパー。
// sinceIso: ISO文字列。currentLogs: 現state。setLogs: React state setter。
// 返り値: 'covered' | 'merged' | 'failed'
async function ensureClockLogsSince(sinceIso, currentLogs, setLogs) {
  const oldest = currentLogs.length
    ? currentLogs.map(l => l.clockIn).sort()[0]
    : null;
  // 既に sinceIso 以前のデータを持っている → 追加 fetch 不要
  if (oldest && oldest <= sinceIso) return 'covered';
  const fetched = await loadClockLogs(sinceIso);
  if (!fetched) return 'failed';
  setLogs(prev => {
    const ids = new Set(prev.map(l => l.id));
    return [...prev, ...fetched.filter(l => !ids.has(l.id))];
  });
  return 'merged';
}

// [2026-05-21] sinceIso 指定時はその日時以降の打刻のみ取得（60秒ポーリングの通信量削減用）。
// 無指定なら従来通り全件（ログイン時の初回ロード・10分ポーリング用）。挙動は不変。
// sinceIso 指定時の取得失敗は null を返し、呼び出し側が「失敗」と「0件」を区別できるようにする。
async function loadClockLogs(sinceIso) {
  const q = sinceIso
    ? `clock_logs?select=*&clock_in=gte.${encodeURIComponent(sinceIso)}&order=clock_in`
    : "clock_logs?select=*&order=clock_in";
  const rows = await sb(q);
  if (!rows) return sinceIso ? null : [];
  return rows.map(r => ({
    id:r.id, userId:r.user_id, userName:r.user_name, projectId:r.project_id,
    clockIn:r.clock_in, clockOut:r.clock_out, coordsIn:r.coords_in, coordsOut:r.coords_out,
    remarks:r.remarks||"", locationName:r.location_name||"", note:r.note||"",
    early_leave_category:r.early_leave_category||"", early_leave_reason:r.early_leave_reason||"",
    // [2026-05-14] 外注情報
    outsourceType:r.outsource_type||null, outsourceCount:r.outsource_count??null, outsourceAmount:r.outsource_amount??null,
    // [2026-05-29] 退勤打刻の現場からのズレ距離(m)
    outDistanceM:r.out_distance_m??null,
    // [2026-10-14] 早出（打刻修正で早出にチェック）。この打刻がある日は「実働−6.5時間」を残業にする
    earlyStart:r.early_start===true,
    // [2026-06-05] 通勤方法（company_car/train/own_car）
    commuteMethod:r.commute_method||null,
    createdAt:r.created_at||null,   // [2026-10-15] 実際に出勤ボタンを押した時刻（相乗りの組み分けに使う）
    // [2026-07-13] 夜勤フラグ。true=夜勤打刻。日勤・既存は false
    isNightShift:r.is_night_shift===true,
    // [2026-07-01] 退勤写真（field-photos の公開URL）。未添付は空文字
    clockOutPhoto:r.clock_out_photo||"",
    // [2026-10-19] 休憩が取れなかった分数と理由（残業に足す）、本人都合の早上がりの扱い（paid_leave／absence）
    breakShortMin:Number(r.break_short_min)||0, breakShortReason:r.break_short_reason||"",
    earlyLeavePay:r.early_leave_pay||null,
  }));
}
async function loadClockModifications() {
  const rows = await sb("clock_modifications?select=*&order=created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({
    id:r.id, type:r.type, clockLogId:r.clock_log_id,
    userId:r.user_id, userName:r.user_name,
    projectId:r.project_id, projectName:r.project_name,
    originalClockIn:r.original_clock_in, originalClockOut:r.original_clock_out,
    requestedClockIn:r.requested_clock_in, requestedClockOut:r.requested_clock_out,
    requestedEarlyStart:(typeof r.requested_early_start==="boolean")?r.requested_early_start:null,
    reason:r.reason, status:r.status,
    requestedBy:r.requested_by, reviewedBy:r.reviewed_by, reviewedAt:r.reviewed_at,
    createdAt:r.created_at,
    // [2026-10-02] 外注の修正（outsourceChanged=true の時だけ意味がある。type null＝外注なし）
    outsourceChanged:r.outsource_changed===true,
    originalOutsourceType:r.original_outsource_type||null, originalOutsourceCount:r.original_outsource_count??null,
    requestedOutsourceType:r.requested_outsource_type||null, requestedOutsourceCount:r.requested_outsource_count??null,
  }));
}
async function loadLeaves() {
  const rows = await sb("leaves?select=*&order=applied_at");
  if (!rows) return {};
  const ld = {};
  rows.forEach(r => {
    if (!ld[r.staff_id]) ld[r.staff_id] = [];
    ld[r.staff_id].push({ id:r.id, type:r.type, date:r.date, days:r.days, memo:r.memo, holidayPref:r.holiday_pref, status:r.status, appliedAt:r.applied_at, holidayWorkId:r.holiday_work_id||null, holidayType:r.holiday_type||null });
  });
  return ld;
}
async function loadHandoverMemos() {
  const rows = await sb("handover_memos?select=*&order=created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, author:r.author, text:r.text, imageUrl:r.image_url||"", createdAt:r.created_at, readBy:r.read_by||[] }));
}
async function loadAnnouncements() {
  const rows = await sb("announcements?select=*&order=created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, author:r.author, role:r.role, text:r.text, createdAt:r.created_at, readBy:r.read_by||[], hiddenBy:r.hidden_by||[] }));
}
async function loadCustomers() {
  const rows = await sb("customers?select=*&order=created_at");
  if (!rows) return [];
  return rows.map(r => ({
    id:r.id, name:r.name, contact:r.contact, phone:r.phone, email:r.email,
    billingDate:r.billing_date,
    // [2026-04-16] 夜タスク ②: 請求日・振込日
    closingDay: r.closing_day==null ? null : Number(r.closing_day),
    paymentDay: r.payment_day==null ? null : Number(r.payment_day),
    // [2026-04-20] 進捗確認日（月2回）
    progressCheckDay1: r.progress_check_day1==null ? null : Number(r.progress_check_day1),
    progressCheckDay2: r.progress_check_day2==null ? null : Number(r.progress_check_day2),
    // [2026-10-14] 請求の打診日（31＝月末）と、打診を済ませた月
    consultDay: r.consult_day==null ? null : Number(r.consult_day),
    consultDoneMonth: r.consult_done_month || null,
    projectId:r.project_id, progress:r.progress||0, progressResponses:r.progress_responses||[], memo:r.memo, createdAt:r.created_at,
  }));
}
async function loadExpenseItems() {
  const rows = await sb("expense_items?select=*&order=date.desc,created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, date:r.date, category:r.category, description:r.description, amount:r.amount, staffName:r.staff_name, createdAt:r.created_at }));
}
async function loadSubcontractors() {
  const rows = await sb("subcontractors?select=*&order=date.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, date:r.date, companyName:r.company_name, headcount:r.headcount, memo:r.memo||"", workers:r.workers||"", createdAt:r.created_at }));
}
async function loadAdditionalWorks() {
  const rows = await sb("additional_works?select=*&order=created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, description:r.description, floor:r.floor||"", location:r.location||"", imageUrl:r.image_url||"", createdAt:r.created_at }));
}
// [2026-06-16] 追加見積（案件レベル）。受注額合計→外注費に自動反映（api-gateway側で計算）
async function loadAdditionalEstimates() {
  const rows = await sb("additional_estimates?select=*&order=created_at.asc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, name:r.name||"", estimatedAmount:r.estimated_amount||0, contractAmount:r.contract_amount||0, createdAt:r.created_at }));
}
async function loadContacts() {
  const rows = await sb("contacts?select=*&order=created_at.desc");
  if (!rows) return [];
  // [2026-04-28] photoUrl（名刺画像 base64）と category（顧客/協力会社）追加
  return rows.map(r => ({ id:r.id, name:r.name, company:r.company||"", phone:r.phone||"", email:r.email||"", address:r.address||"", notes:r.notes||"", photoUrl:r.photo_url||"", category:r.category||"顧客", createdAt:r.created_at }));
}
// [v14] 新規ロード関数
async function loadLeaveBalances() {
  const rows = await sb("leave_balances?select=*");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, staffId:r.staff_id, type:r.type, granted:r.granted, carried:r.carried||0, used:r.used, balance:r.balance, updatedAt:r.updated_at, lastRenewedAt:r.last_renewed_at,
    hourlyUsed:Number(r.hourly_used_this_year)||0 }));   // [2026-10-19] 今年使った時間有給（時間）
}
async function loadProjectExpenses() {
  const rows = await sb("project_expenses?select=*");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, dailyTransport:r.daily_transport, dailyParking:r.daily_parking }));
}
async function loadCompanyInfo() {
  const rows = await sb("company_info?select=*&order=sort_order,created_at");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, category:r.category, title:r.title, content:r.content, sortOrder:r.sort_order, updatedAt:r.updated_at }));
}
async function loadSurveys() {
  const rows = await sb("surveys?select=*&order=created_at.desc");
  if (!rows) return [];
  // [2026-04-27] DB実カラム名は `active`（is_activeではない）。created_byカラムは存在しないので除去
  // [2026-07-21] deadline = 回答期限（YYYY-MM-DD / null=期限なし）
  // [2026-09-04] intro = 全画面モーダル冒頭の導入文（null可）
  // [2026-09-06] exemptStaffIds = このアンケートの回答を免除するスタッフ。
  //   免除者には全画面モーダルを出さず、締切後のロックもかけず、回答率の母数からも外す。
  // [2026-09-06] includeExecutives = このアンケートに限り役員も対象にする（既定 false）
  return rows.map(r => ({ id:r.id, title:r.title, questions:r.questions||[], isActive:r.active, deadline:r.deadline||null, intro:r.intro||"", exemptStaffIds:r.exempt_staff_ids||[], includeExecutives:!!r.include_executives, createdAt:r.created_at }));
}
async function loadSurveyResponses() {
  const rows = await sb("survey_responses?select=*&order=created_at");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, surveyId:r.survey_id, staffId:r.staff_id, staffName:r.staff_name, answers:r.answers||{}, createdAt:r.created_at }));
}
async function loadAiChatLogs() {
  const rows = await sb("ai_chat_logs?select=*&order=created_at.desc&limit=100");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, staffId:r.staff_id, staffName:r.staff_name, query:r.query, response:r.response, createdAt:r.created_at }));
}
// [2026-04-16] 夜タスク ①: 車両情報
async function loadVehicles() {
  const rows = await sb("vehicles?select=*&order=created_at");
  if (!rows) return [];
  return rows.map(r => ({
    id:r.id, name:r.name,
    plateNumber:r.plate_number||"",
    model:r.model||"",
    memo:r.memo||"",
    assignedStaffId: r.assigned_staff_id || "",
    inspectionDate: r.inspection_date || "",
    createdAt:r.created_at
  }));
}
async function loadVehicleTroubles() {
  const rows = await sb("vehicle_troubles?select=*&order=date.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, vehicleId:r.vehicle_id, date:r.date, description:r.description||"", createdAt:r.created_at }));
}
async function loadVehicleOilChanges() {
  const rows = await sb("vehicle_oil_changes?select=*&order=date.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, vehicleId:r.vehicle_id, date:r.date, mileage:r.mileage||0, note:r.note||"", elementChanged:r.element_changed===true, createdAt:r.created_at }));
}
// [2026-04-20] 材料費（関東ロックウール請求書）
async function loadInvoiceUploads() {
  const rows = await sb("invoice_uploads?select=*&order=invoice_date.desc");
  if (!rows) return [];
  return rows.map(r => ({
    id: r.id, vendor: r.vendor,
    invoiceDate: r.invoice_date, periodStart: r.period_start, periodEnd: r.period_end,
    subtotal: r.subtotal || 0, tax: r.tax || 0, totalWithTax: r.total_with_tax || 0,
    pdfUrl: r.pdf_url || "", pdfName: r.pdf_name || "",
    uploadedBy: r.uploaded_by, uploadedAt: r.uploaded_at, status: r.status,
  }));
}
async function loadMaterialCosts() {
  const rows = await sb("material_costs?select=*&order=item_date.desc");
  if (!rows) return [];
  return rows.map(r => ({
    id: r.id, invoiceId: r.invoice_id, projectId: r.project_id,
    projectNameOnInvoice: r.project_name_on_invoice || "",
    itemDate: r.item_date, invoiceNo: r.invoice_no || "",
    itemName: r.item_name || "", spec: r.spec || "",
    quantity: Number(r.quantity) || 0, unit: r.unit || "",
    unitPrice: Number(r.unit_price) || 0, amount: r.amount || 0,
    isDiscount: !!r.is_discount, isStock: !!r.is_stock,
  }));
}

// [2026-04-16] 夜タスク ⑤: app_settings
async function loadAppSettings() {
  const rows = await sb("app_settings?select=*");
  if (!rows) return {};
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return map;
}

// ── WRITE HELPERS ──
// [2026-04-22] 全 write helper は boolean を返す（true=成功 / false=失敗）。
// apiGateway が null を返した場合（ネットワークエラー or セッション切れ or サーバーエラー）、
// そのエラーメッセージは apiGateway 内部の _sbErrorHandler 経由でユーザーに表示済み。
// 呼び出し側は戻り値を必ずチェックし、失敗時はローカル state を更新しないこと。
async function apiWrite(action, data) {
  const res = await apiGateway(action, data);
  return res?.ok === true;
}

// [2026-05-12] 直前のAPIエラーを保持（デバッグ用）
let _lastApiError = "";
function getLastApiError() { return _lastApiError; }

// [2026-04-22] 書き込み失敗時に表示する統一メッセージ。
// 対処方法をユーザーに案内する（ネットワーク→リロード→再ログイン の順）。
const WRITE_ERROR_MSG = "⚠ 保存に失敗しました。\n① ネットワーク（Wi-Fi/電波）を確認\n② 画面を上から下に引っ張ってリロード\n③ それでもダメならログアウト→PIN再入力";

async function insertEntry(projectId, entry) {
  return apiWrite("insert_entry", { projectId, entry: { id:entry.id, date:entry.date, worker:entry.worker, qty:entry.qty, memo:entry.memo } });
}
async function insertProject(p) {
  return apiWrite("insert_project", { project: { id:p.id, name:p.name, client:p.client, status:p.status, lead:p.lead, startDate:p.startDate, endDate:p.endDate, estimate:p.estimate, targetNinku:p.targetNinku, materialCost:p.materialCost||0, otherCost:p.otherCost||0, contractType:p.contractType||"", address:p.address||"", targetMandays:p.targetMandays||0, ninkuRate:p.ninkuRate||null, contractAmount:p.contractAmount||0, workCategory:p.workCategory||"" } });
}
async function insertClockLog(log) {
  return apiWrite("insert_clock_log", { log: { id:log.id, userId:log.userId, userName:log.userName, projectId:log.projectId, clockIn:log.clockIn, clockOut:log.clockOut, coordsIn:log.coordsIn, coordsOut:log.coordsOut, remarks:log.remarks||"", locationName:log.locationName||"", note:log.note||"", commuteMethod:log.commuteMethod||null, isNightShift:log.isNightShift===true } });
}
async function updateClockOut(logId, clockOut, coordsOut, locationName, earlyLeaveCategory, earlyLeaveReason, hourlyUsed, outsource, outDistanceM, extra) {
  // [2026-10-19] extra = { earlyLeavePay:'paid_leave'|'absence'|null, breakShortMin:Number, breakShortReason:String }
  // [2026-05-14] outsource = { type:'support'|'subcontract', count:Number, amount:Number|null } or undefined
  // [2026-05-29] outDistanceM = 現場からのズレ距離(m)。基準なしは null/undefined
  return apiWrite("update_clock_out", { logId, clockOut, coordsOut, locationName:locationName||"", earlyLeaveCategory, earlyLeaveReason, hourlyUsed,
    outsourceType: outsource?.type || null,
    outsourceCount: outsource?.count ?? null,
    outsourceAmount: outsource?.amount ?? null,
    outDistanceM: (outDistanceM == null || !isFinite(outDistanceM)) ? null : outDistanceM,
    earlyLeavePay: extra?.earlyLeavePay || null,
    breakShortMin: extra?.breakShortMin || null,
    breakShortReason: extra?.breakShortReason || null });
}
// [2026-07-01] 退勤写真を clock_logs に保存（field-photos の公開URL）。null/空でクリア
async function setClockOutPhoto(logId, photoUrl) {
  return apiWrite("set_clock_out_photo", { logId, photoUrl: photoUrl || null });
}
// [2026-05-29] 2点間の距離(m)。haversine。座標は {lat,lng}
function distanceMeters(a, b) {
  if (!a || !b || a.lat==null || a.lng==null || b.lat==null || b.lng==null) return null;
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s)));
}
// [2026-05-29] coords_out / coords_in は {lat,lng,acc} か JSON文字列。{lat,lng} に正規化
function parseCoords(c) {
  if (!c) return null;
  let o = c;
  if (typeof c === "string") { try { o = JSON.parse(c); } catch(_) { return null; } }
  if (o && o.lat!=null && o.lng!=null) return { lat:Number(o.lat), lng:Number(o.lng) };
  return null;
}
// [2026-05-14] 管理者が請負外注の金額を後入力
async function setOutsourceAmount(logId, amount) {
  return apiWrite("set_outsource_amount", { logId, amount });
}
async function submitClockModification(mod) {
  return apiWrite("submit_clock_modification", { mod });
}
async function reviewClockModification(modId, status, reviewedBy) {
  return apiWrite("review_clock_modification", { modId, status, reviewedBy });
}
async function adminEditClockLog(logId, clockIn, clockOut, projectId, reason, adminName, isNightShift, recordModification, note, earlyStart) {
  // [2026-07-14] isNightShift は boolean の時のみ送る（undefined は送らず既存値を維持）
  // [2026-07-27] recordModification=false で修正履歴を残さない（省略時は従来通り記録）
  // [2026-09-07] note は string の時のみ送る（空文字＝備考を消す。undefined は既存値を維持）
  const payload = { logId, clockIn, clockOut, projectId, reason, adminName };
  if (typeof isNightShift === "boolean") payload.isNightShift = isNightShift;
  if (typeof note === "string") payload.note = note;
  if (typeof recordModification === "boolean") payload.recordModification = recordModification;
  if (typeof earlyStart === "boolean") payload.earlyStart = earlyStart;   // [2026-10-14] 早出
  return apiWrite("admin_edit_clock_log", payload);
}
async function adminAddClockLog(log, reason, adminName) {
  return apiWrite("admin_add_clock_log", { log, reason, adminName });
}
// [2026-04-15] 打刻削除
async function adminDeleteClockLog(logId, adminName) {
  return apiWrite("admin_delete_clock_log", { logId, adminName });
}
async function insertLeave(staffId, entry) {
  return apiWrite("insert_leave", { staffId, entry: { id:entry.id, type:entry.type, date:entry.date, days:entry.days, memo:entry.memo, holidayPref:entry.holidayPref, status:entry.status, appliedAt:entry.appliedAt, holidayWorkId:entry.holidayWorkId||null, holidayType:entry.holidayType||null } });
}
async function updateLeaveStatus(leaveId, status) {
  return apiWrite("update_leave_status", { leaveId, status });
}
async function updateStaffRates(staffUpdates) {
  const res = await apiGateway("update_rates", { updates: staffUpdates });
  if (res && res.result) return res.result;
  return staffUpdates.map(s => ({ id: s.id, ok: false }));
}
async function insertAttachment(projectId, att) {
  // [2026-05-21] fileUrl（Storage URL）も渡す。base64 data は移行期間中の互換用
  return apiWrite("insert_attachment", { projectId, attachment: { id:att.id, type:att.type, text:att.text||"", name:att.name||"", data:att.data||"", fileUrl:att.fileUrl||"", author:att.author, createdAt:att.createdAt } });
}
async function deleteAttachmentDB(attId) {
  return apiWrite("delete_attachment", { attachmentId: attId });
}
// [2026-06-17] 図面データ（project_drawings）。base64 を file_data に直接保存。
//   読み書きとも api-gateway 経由（anon read は付与していない）。
async function listProjectDrawings(projectId) {
  const res = await apiGateway("list_project_drawings", { projectId });
  if (res && res.ok && Array.isArray(res.rows)) {
    return res.rows.map(r => ({
      id: r.id, projectId: r.project_id, fileName: r.file_name || "",
      fileType: r.file_type || "image", fileData: r.file_data || "",
      uploadedBy: r.uploaded_by || "", createdAt: r.created_at,
    }));
  }
  return null;
}
async function insertProjectDrawing(d) {
  return apiWrite("insert_project_drawing", { drawing: {
    id: d.id, projectId: d.projectId, fileName: d.fileName || "",
    fileType: d.fileType || "image", fileData: d.fileData || "", createdAt: d.createdAt,
  } });
}
async function deleteProjectDrawingDB(drawingId) {
  return apiWrite("delete_project_drawing", { drawingId });
}
async function insertHandoverMemo(memo) {
  return apiWrite("insert_handover_memo", { memo: { id:memo.id, projectId:memo.projectId, author:memo.author, text:memo.text, imageUrl:memo.imageUrl||"", createdAt:memo.createdAt } });
}
async function markHandoverRead(memoId, userId) {
  return apiWrite("mark_handover_read", { memoId, userId });
}
async function insertAnnouncement(ann) {
  return apiWrite("insert_announcement", { announcement: { id:ann.id, author:ann.author, role:ann.role, text:ann.text, createdAt:ann.createdAt } });
}
// [2026-10-19] 読んだアナウンスを自分の画面から消す（ほかの人には残る）
async function hideAnnouncement(annId) {
  return apiWrite("hide_announcement", { announcementId: annId });
}
async function markAnnouncementRead(annId, userId) {
  return apiWrite("mark_announcement_read", { announcementId: annId, userId });
}
// [2026-06-28] 進捗報告を確認済みにする（管理者）
async function markProgressReportRead(reportId, userId) {
  return apiWrite("mark_progress_report_read", { reportId, userId });
}
async function getVapidPublicKey() {
  const res = await apiGateway("get_vapid_public_key", {});
  return res?.key || null;
}
async function savePushSubscription(endpoint, keys) {
  return apiWrite("save_push_subscription", { endpoint, keys });
}
async function deletePushSubscription() {
  return apiWrite("delete_push_subscription", {});
}
async function adminSendPushToAll(title, body, staffIds) {
  const res = await apiGateway("send_push_to_all", { title, body, staffIds });
  return res;
}
async function loadNotificationReads() {
  const res = await apiGateway("load_notification_reads", {});
  return res?.reads || [];
}
async function insertCustomer(c) {
  // [2026-04-16] 夜タスク ②: closingDay / paymentDay を追加
  // [2026-04-20] progressCheckDay1 / progressCheckDay2 を追加
  return apiWrite("insert_customer", { customer: { id:c.id, name:c.name, contact:c.contact, phone:c.phone, email:c.email, billingDate:c.billingDate, closingDay:c.closingDay??null, paymentDay:c.paymentDay??null, progressCheckDay1:c.progressCheckDay1??null, progressCheckDay2:c.progressCheckDay2??null, consultDay:c.consultDay??null, projectId:c.projectId, progress:c.progress||0, memo:c.memo, createdAt:c.createdAt } });
}
async function updateCustomerProgress(customerId, progress) {
  return apiWrite("update_customer_progress", { customerId, progress });
}
async function insertProgressResponse(customerId, response) {
  return apiWrite("insert_progress_response", { customerId, response });
}
async function updateCustomer(customerId, updates) {
  return apiWrite("update_customer", { customerId, updates });
}
async function deleteAnnouncementDB(annId) {
  return apiWrite("delete_announcement", { announcementId: annId });
}
async function deleteHandoverMemoDB(memoId) {
  return apiWrite("delete_handover_memo", { memoId });
}
// [2026-09-09] 管理者による現場情報の編集（現場編集タブ）。いずれもAPI側でadmin限定
async function adminUpdateProgressReport(reportId, percent, comment) {
  return apiWrite("admin_update_progress_report", { reportId, percent, comment });
}
async function adminDeleteProgressReport(reportId) {
  return apiWrite("admin_delete_progress_report", { reportId });
}
async function adminUpdateHandoverMemo(memoId, text) {
  return apiWrite("admin_update_handover_memo", { memoId, text });
}
async function insertSubcontractor(s) {
  return apiWrite("insert_subcontractor", { subcontractor: { id:s.id, projectId:s.projectId, date:s.date, companyName:s.companyName, headcount:s.headcount, memo:s.memo||"", workers:s.workers||"" } });
}
async function updateSubcontractorWorkers(id, workers) {
  return apiWrite("update_subcontractor_workers", { subcontractorId: id, workers });
}
async function deleteSubcontractorDB(id) {
  return apiWrite("delete_subcontractor", { subcontractorId: id });
}
async function insertAdditionalWork(w) {
  return apiWrite("insert_additional_work", { work: { id:w.id, projectId:w.projectId, description:w.description, floor:w.floor||"", location:w.location||"", imageUrl:w.imageUrl||"" } });
}
async function deleteAdditionalWorkDB(id) {
  return apiWrite("delete_additional_work", { workId: id });
}
// [2026-06-16] 追加工事（受注）CRUD。[2026-06-17] 外注費とは分離。受注額合計は請負金額に加算してトータル受注表示
async function insertAdditionalEstimate(e) {
  return apiGateway("insert_additional_estimate", { estimate: { id:e.id, projectId:e.projectId, name:e.name, estimatedAmount:e.estimatedAmount||0, contractAmount:e.contractAmount||0 } });
}
async function updateAdditionalEstimate(estimateId, fields) {
  return apiGateway("update_additional_estimate", { estimateId, fields });
}
async function deleteAdditionalEstimateDB(estimateId) {
  return apiGateway("delete_additional_estimate", { estimateId });
}
async function listAdditionalEstimates(projectId) {
  const res = await apiGateway("list_additional_estimates", { projectId });
  return res?.rows || [];
}
async function deleteProjectDB(projectId) {
  return apiWrite("delete_project", { projectId });
}
async function deleteCustomerDB(customerId) {
  return apiWrite("delete_customer", { customerId });
}
async function insertExpenseItem(e) {
  return apiWrite("insert_expense_item", { item: { id:e.id, project_id:e.projectId, date:e.date, category:e.category, description:e.description, amount:e.amount, staff_name:e.staffName } });
}
async function deleteExpenseItem(expenseId) {
  return apiWrite("delete_expense_item", { expenseId });
}
async function updateProjectStatus(projectId, status) {
  return apiWrite("update_project_status", { projectId, status });
}
async function insertContact(c) { return apiWrite("insert_contact", { contact: c }); }
async function updateContactDB(contactId, updates) { return apiWrite("update_contact", { contactId, updates }); }
async function deleteContactDB(contactId) { return apiWrite("delete_contact", { contactId }); }

// [v14] 新規 WRITE HELPERS
async function updateProjectFields(projectId, fields) {
  return apiWrite("update_project_fields", { projectId, fields });
}
// [2026-10-15] 現場の住所の初回登録（退勤打刻の前）。coords があればその位置を現場の位置にする。返り値：{ok, lat, lng, address}
async function registerSiteLocation(projectId, address, coords) {
  const c = parseCoords(coords);
  const res = await apiGateway("register_site_location", { projectId, address, lat: c?.lat, lng: c?.lng });
  return res && res.ok === true ? res : null;
}
// [2026-10-15] 現在地から住所の候補（都道府県＋市区町村＋町名まで）。取れなければ ""
async function getSiteAddressSuggestion(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja&zoom=18`,
      { headers: { "User-Agent": "shinsei-field-app/14" } }
    );
    const a = (await r.json()).address || {};
    return [a.province || a.state || "", a.city || a.town || a.village || "", a.city_district || "", a.suburb || a.quarter || "", a.neighbourhood || "", a.house_number || ""]
      .filter((v, i, arr) => v && arr.indexOf(v) === i).join("");
  } catch { return ""; }
}
async function updateAdditionalWork(workId, fields) {
  return apiWrite("update_additional_work", { workId, fields });
}
async function upsertLeaveBalance(staffId, type, granted, used) {
  return apiWrite("upsert_leave_balance", { staffId, type, granted, used });
}
async function renewAnnualLeave(annualGrant = 7) {
  return await apiGateway("renew_annual_leave", { annualGrant });
}
async function upsertProjectExpense(projectId, dailyTransport, dailyParking) {
  return apiWrite("upsert_project_expense", { projectId, dailyTransport, dailyParking });
}
async function upsertCompanyInfo(info) {
  return await apiGateway("upsert_company_info", { info });
}
async function deleteCompanyInfoDB(infoId) {
  return apiWrite("delete_company_info", { infoId });
}
async function upsertSurvey(survey) {
  return apiWrite("upsert_survey", { survey });
}
// [2026-04-28] アンケート削除（関連回答も同時削除）
async function deleteSurvey(surveyId) {
  return apiWrite("delete_survey", { surveyId });
}
async function submitSurveyResponse(surveyId, answers) {
  return apiWrite("submit_survey_response", { surveyId, answers });
}
// [2026-09-04] 自分の回答を取り消す（期限日より前のみ。サーバ側でも期限を再チェックする）
async function deleteMySurveyResponse(surveyId) {
  return apiWrite("delete_my_survey_response", { surveyId });
}

// ── [2026-09-05] 社内研修① ──────────────────────────────
//   締切判定・最低文字数はサーバー側で行う。端末の日付を変えても締切を回避できないようにするため。
//   戻り値の pastDeadline / serverNow はサーバー時刻ベース。

// 研修本体＋全設問＋自分の回答を1往復で取得。公開中の研修が無ければ null
async function loadTraining() {
  const res = await apiGateway("get_training", {});
  if (!res || !res.ok) return null;
  const r = res.result;
  if (!r) return null;
  return {
    training: {
      id: r.training.id, title: r.training.title,
      intro: r.training.intro || "", outro: r.training.outro || "",
      deadline: r.training.deadline || null, isActive: r.training.active,
      // [2026-09-06] この研修は役員(裕太)も対象。研修ごとに切り替えるためフラグで持つ
      includeExecutives: !!r.training.include_executives,
    },
    questions: (r.questions || []).map(q => ({
      id: q.id, code: q.code, section: q.section, sortOrder: q.sort_order,
      text: q.text, note: q.note || "",
      explanation: q.explanation || "",          // 空 = 模範解答なし
      noAnswerMsg: q.no_answer_msg || "",
      minChars: Number(q.min_chars) || 0,
      // [2026-09-06] セクション1問目の前に1枚だけ出す導入文（Q9のみ設定）
      sectionIntro: q.section_intro || "",
    })),
    responses: (r.responses || []).map(x => ({
      questionId: x.question_id, answer: x.answer || "", confirmed: !!x.confirmed,
    })),
    completedAt: r.completedAt || null,
    preview: !!r.preview,   // [2026-09-20] 試写モード。true の人は文字数制限なし
    pastDeadline: !!r.pastDeadline,
    serverNow: r.serverNow || null,
  };
}

// 1問保存。confirmed=false は入力途中の自動保存（文字数未満でも保存される）
async function saveTrainingResponse(questionId, answer, confirmed) {
  return apiWrite("submit_training_response", { questionId, answer, confirmed: !!confirmed });
}

async function loadMyTrainingResponses(trainingId) {
  const res = await apiGateway("get_training_responses", { trainingId });
  if (!res || !res.ok) return [];
  return (res.result || []).map(x => ({
    questionId: x.question_id, answer: x.answer || "", confirmed: !!x.confirmed,
  }));
}

// 1問取り消し（締切前のみ）。取り消すと完了記録も外れる
async function deleteTrainingResponse(questionId) {
  return apiWrite("delete_training_response", { questionId });
}

// 全問確定済みなら完了として記録（件数はサーバーが数える）
async function completeTraining(trainingId) {
  return apiWrite("complete_training", { trainingId });
}

// 管理者用: 全員分の設問・回答・完了状況
async function loadTrainingAdmin(trainingId) {
  const res = await apiGateway("get_training_admin", { trainingId });
  if (!res || !res.ok) return null;
  const r = res.result || {};
  return {
    questions: (r.questions || []).map(q => ({
      id: q.id, code: q.code, section: q.section, sortOrder: q.sort_order,
      text: q.text, minChars: Number(q.min_chars) || 0,
    })),
    responses: (r.responses || []).map(x => ({
      questionId: x.question_id, staffId: x.staff_id, staffName: x.staff_name || "",
      answer: x.answer || "", confirmed: !!x.confirmed, updatedAt: x.updated_at,
    })),
    completions: (r.completions || []).map(c => ({
      staffId: c.staff_id, staffName: c.staff_name || "", completedAt: c.completed_at,
    })),
    targets: (r.targets || []).map(s => ({ id: s.id, name: s.name })),
  };
}
async function insertAiChatLog(query, response) {
  return apiWrite("insert_ai_chat_log", { query, response });
}
// [2026-04-21] 個人メモ（本人のみ）
async function getPersonalMemo() {
  const r = await apiGateway("get_personal_memo", {});
  return r?.ok ? (r.result?.memo || "") : "";
}
async function updatePersonalMemo(memo) {
  return await apiGateway("update_personal_memo", { memo });
}

// 年次バックアップ閲覧
async function loadAnnualBackups() {
  const rows = await sb("annual_backups?select=id,fiscal_year,table_name,backed_up_at,data&order=fiscal_year.desc,table_name");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, fiscalYear:r.fiscal_year, tableName:r.table_name, backedUpAt:r.backed_up_at, data:r.data }));
}

// 画像リサイズ（長辺1920px, JPEG quality 80%）
const MAX_IMAGE_SIDE = 1920;
const JPEG_QUALITY = 0.8;
async function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX_IMAGE_SIDE || h > MAX_IMAGE_SIDE) {
          const ratio = Math.min(MAX_IMAGE_SIDE / w, MAX_IMAGE_SIDE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, preview: dataUrl, type: "image/jpeg", name: file.name.replace(/\.\w+$/, ".jpg") });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// 写真アップロード（field-photos バケット経由）
async function uploadFieldPhoto(base64, fileName, contentType) {
  const res = await apiGateway("upload_field_photo", { base64, fileName, contentType });
  if (!res || !res.ok) return null;
  return res.url;
}

// 大容量ファイル直接アップロード（署名付きURL + FormData PUT、Edge Functionボディ上限を回避）
async function uploadFileDirect(file) {
  console.log("[uploadFileDirect] start", file.name, file.size, file.type);
  const res = await apiGateway("create_upload_url", { fileName: file.name, contentType: file.type, size: file.size });
  if (!res || !res.ok) { console.error("[uploadFileDirect] create_upload_url failed", res); return null; }
  console.log("[uploadFileDirect] signedUrl obtained", res.signedUrl?.slice(0,80));
  try {
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file, file.name);
    const resp = await fetch(res.signedUrl, {
      method: "PUT",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "x-upsert": "false",
      },
      body: formData,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(()=>"");
      console.error("[uploadFileDirect] PUT failed", resp.status, errText);
      return null;
    }
    console.log("[uploadFileDirect] success", res.publicUrl);
    return res.publicUrl;
  } catch(e) { console.error("[uploadFileDirect] exception", e); return null; }
}

// [v14] 仕様書管理
async function loadProjectSpecs() {
  const rows = await sb("project_specs?select=*&order=created_at.desc");
  if (!rows) return [];
  return rows.map(r => ({ id:r.id, projectId:r.project_id, fileName:r.file_name, fileUrl:r.file_url, specText:r.spec_text, uploadedBy:r.uploaded_by, createdAt:r.created_at, updatedAt:r.updated_at }));
}
async function upsertProjectSpec(spec) {
  return apiWrite("upsert_project_spec", { spec });
}
async function deleteProjectSpecDB(specId) {
  return apiWrite("delete_project_spec", { specId });
}

// [v15] Instagram投稿
async function createInstagramPost(templateType, caption, isAutoGenerated, images) {
  return await apiGateway("create_instagram_post", { templateType, caption, isAutoGenerated, images });
}
async function listMyInstagramPosts() {
  const res = await apiGateway("list_my_instagram_posts", {});
  return res?.result || [];
}
async function listPendingInstagramPosts() {
  const res = await apiGateway("list_pending_instagram_posts", {});
  return res?.result || [];
}
async function approveInstagramPost(postId, caption) {
  return await apiGateway("approve_instagram_post", { postId, caption });
}
async function rejectInstagramPost(postId, reason) {
  return await apiGateway("reject_instagram_post", { postId, reason });
}
async function markInstagramPosted(postId) {
  return await apiGateway("mark_instagram_posted", { postId });
}
async function getInstagramIncentives(month) {
  const res = await apiGateway("get_instagram_incentives", { month });
  return res?.result || {};
}
async function updateInstagramSettings(incentiveManual, incentiveAuto, monthlyCap) {
  return await apiGateway("update_instagram_settings", { incentiveManual, incentiveAuto, monthlyCap });
}
async function getMyInstagramMonthly(month) {
  const res = await apiGateway("get_my_instagram_monthly", { month });
  return res?.result || { manual:0, auto:0, total:0 };
}
async function listInstagramPostsAll(status) {
  const res = await apiGateway("list_instagram_posts_all", { status });
  return res?.result || [];
}
// [2026-05-21] 施工人工目安マスタ（admin限定）
async function loadWorkloadNorms() {
  const res = await apiGateway("list_workload_norms", {});
  if (!res?.ok || !Array.isArray(res.rows)) return null;
  return res.rows.map(r => ({
    id: r.id,
    category: r.category,
    sizeSpec: r.size_spec || "",
    unit: r.unit || "台",
    perManDay: r.per_man_day,
    // [2026-10-09] 3段階（migration 096）。ふつう＝perManDay
    perManDayEasy: r.per_man_day_easy ?? null,
    perManDayHard: r.per_man_day_hard ?? null,
    pctSmall: r.pct_small ?? null,   // [v241] 小さいサイズ側の％
    pctLarge: r.pct_large ?? null,   // [v241] 大きいサイズ側の％
    sizeLabel: r.size_spec || "",
    updatedBy: r.updated_by || "",
    materials: r.materials || "",
    notes: r.notes || "",
    sourceProjectId: r.source_project_id || null,
    createdBy: r.created_by || "",
    createdAt: r.created_at,
  }));
}
async function insertWorkloadNorm(n) {
  return await apiGateway("insert_workload_norm", { norm: n });
}
async function updateWorkloadNorm(n) {
  return await apiGateway("update_workload_norm", { norm: n });
}
async function deleteWorkloadNormDB(id) {
  return await apiGateway("delete_workload_norm", { id });
}
// [2026-10-09] 人工の目安表（川畑さんのスマホ入力用。管理者と川畑さんだけ）
//   1人1日あたりの数量を やりやすい(easy)／ふつう(normal)／やりにくい(hard) で持つ
async function loadWorkloadInput() {
  const res = await apiGateway("list_workload_input", {});
  if (!res?.ok || !Array.isArray(res.rows)) return null;
  return res.rows.map(r => ({
    id: r.id, grp: r.grp || "", category: r.category || "", sizeSpec: r.size_spec || "",
    unit: r.unit || "", notes: r.notes || "",
    normal: r.per_man_day, small: r.pct_small, large: r.pct_large,   // [v241] まん中のサイズの数量＋小さい側・大きい側の％
    updatedBy: r.updated_by || "", updatedAt: r.updated_at || null,
  }));
}
// items: [{id, normal, small, large}]（数字 or null。small/large は％）。戻り値は {ok, saved, error}
async function saveWorkloadInput(items) {
  return await apiGateway("save_workload_input", { items });
}

// [2026-05-21] base64画像をStorageに移行するワンタイム関数（admin限定）
// 1呼び出しで attachments/contacts それぞれ10件処理。残件0になるまで繰り返し呼ぶ
async function migrateBase64ToStorage() {
  return await apiGateway("migrate_base64_to_storage", {});
}

// [2026-04-16] 夜タスク ①: 車両書き込み
async function upsertVehicle(v) {
  return await apiGateway("upsert_vehicle", { vehicle: v });
}
async function deleteVehicleDB(vehicleId) {
  return await apiGateway("delete_vehicle", { vehicleId });
}
async function insertVehicleTrouble(t) {
  return await apiGateway("insert_vehicle_trouble", { trouble: t });
}
async function deleteVehicleTroubleDB(troubleId) {
  return await apiGateway("delete_vehicle_trouble", { troubleId });
}
async function insertVehicleOilChange(o) {
  return await apiGateway("insert_vehicle_oil_change", { oilChange: o });
}
async function deleteVehicleOilChangeDB(oilChangeId) {
  return await apiGateway("delete_vehicle_oil_change", { oilChangeId });
}
// [2026-04-16] 夜タスク ⑤: app_settings 更新
async function updateAppSetting(key, value) {
  return await apiGateway("update_app_setting", { key, value });
}

// [2026-04-20] 材料費PDF（関東ロックウール）
// fileをbase64に変換
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result; // data:application/pdf;base64,XXX...
      const idx = typeof s === "string" ? s.indexOf(",") : -1;
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function parseInvoicePdf(pdfBase64) {
  if (!_sessionToken) {
    if (_sbErrorHandler) _sbErrorHandler("セッションが無効です。再ログインしてください。");
    return null;
  }
  try {
    const r = await fetch(PARSE_INVOICE_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ token: _sessionToken, pdfBase64 }),
    });
    const res = await r.json();
    if (!res.ok) {
      if (_sbErrorHandler) _sbErrorHandler(res.error || "PDF解析に失敗しました");
      return null;
    }
    return res;
  } catch (e) {
    if (_sbErrorHandler) _sbErrorHandler("ネットワークエラー: " + e.message);
    return null;
  }
}
// マッチング確定 → DB保存
async function confirmInvoice(invoice, projects, mappings) {
  return await apiGateway("confirm_invoice", { invoice, projects, mappings });
}
async function deleteInvoiceDB(invoiceId) {
  return await apiGateway("delete_invoice", { invoiceId });
}
// [2026-06-08] 材料費明細の現場紐付け直し（admin限定）。costIds の明細を projectId の現場に割当
async function relinkMaterialCosts(costIds, projectId) {
  return apiWrite("relink_material_costs", { costIds, projectId });
}

// [2026-04-16] 夜タスク ②: 請求日アラート判定
// customer.closing_day と projects から、アラート対象を返す
// 対象: 案件(進行中 OR 完了かつinvoice_settled=false) を持つ顧客で closing_day - 今日 <= 5 日
// returns: [{ customer, daysLeft, nextClosingDate, projectNames }]
function getBillingAlerts(customers, projects, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const alerts = [];
  (customers || []).forEach(c => {
    if (!c.closingDay) return;
    // 対象案件（進行中 or 完了かつ未請求）。案件の顧客はprojectIdまたはclient名で判定
    const activeProjects = (projects || []).filter(p => {
      const isTarget = p.status === "進行中" || (p.status === "完了" && !p.invoiceSettled);
      if (!isTarget) return false;
      return projectBelongsToCustomer(p, c);   // [2026-10-14] client は全件空で一度も一致していなかった → (client||lead) を表記ゆれ込みで照合
    });
    if (activeProjects.length === 0) return;
    // 次の請求日算出
    const nextClosing = nextClosingDate(c.closingDay, t);
    const daysLeft = Math.ceil((nextClosing - t) / 86400000);
    if (daysLeft <= 5 && daysLeft >= 0) {
      alerts.push({ customer: c, daysLeft, nextClosingDate: dateStrJST(nextClosing), projectNames: activeProjects.map(p => p.name) }); // [2026-05-07] Codex#3
    }
  });
  return alerts.sort((a,b) => a.daysLeft - b.daysLeft);
}
// [2026-10-14] 会社名の表記ゆれ（㈱・株式会社・(有) など）を外して比べる
function normCompanyName(s) {
  return String(s || "").replace(/株式会社|有限会社|㈱|㈲|\(株\)|\(有\)|（株）|（有）|[\s　]/g, "");
}
// 案件がその客先のものか（案件の id 紐付け、または 案件の客先（client→lead）と客先名）
function projectBelongsToCustomer(p, c) {
  if (c.projectId && p.id === c.projectId) return true;
  const owner = normCompanyName(p.client || p.lead);
  return owner !== "" && owner === normCompanyName(c.name);
}
// その月の打診日（31など月の日数を超える日は月末）
function consultDateOf(y, m0, day) {
  const last = new Date(y, m0 + 1, 0).getDate();
  return new Date(y, m0, Math.min(day, last));
}
const CONSULT_SHOW_DAYS = 7;   // 打診日から7日間は表示（「打診した」を押すまで）
// [2026-10-14] 請求の打診アラート。打診日〜7日後まで、その月にまだ「打診した」を押していない客先で、
//   進行中か完了して未請求の現場がある客先を返す。現場ごとに最新の進捗%を添える（何%で請求するか決める材料）。
// returns: [{ customer, monthKey, consultDate, daysSince, projects:[{ project, progress }] }]
function getConsultAlerts(customers, projects, progressReports, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const out = [];
  (customers || []).forEach(c => {
    const cd = Number(c.consultDay);
    if (!cd) return;
    // 今月の打診日がまだ先なら、先月の打診日（7日以内なら表示が続く）
    let date = consultDateOf(t.getFullYear(), t.getMonth(), cd);
    if (date > t) date = consultDateOf(t.getFullYear(), t.getMonth() - 1, cd);
    const daysSince = Math.round((t - date) / 86400000);
    if (daysSince < 0 || daysSince >= CONSULT_SHOW_DAYS) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (c.consultDoneMonth === monthKey) return;
    const ps = (projects || []).filter(p => {
      const target = p.status === "進行中" || (p.status === "完了" && !p.invoiceSettled);
      return target && projectBelongsToCustomer(p, c);
    });
    if (ps.length === 0) return;
    out.push({ customer: c, monthKey, consultDate: dateStrJST(date), daysSince,
      projects: ps.map(p => ({ project: p, progress: getLatestProgress(p, progressReports) })) });
  });
  return out.sort((a, b) => b.daysSince - a.daysSince);
}

// [2026-04-16] 夜タスク⑨ 進捗ヒアリング自動化
// 自社担当者（internal_owner）毎に、進行中案件で end_date の10日前以内、かつ status!=完了 の案件を返す
// 担当者未設定は socho（川畑）に集約されるが、ここでは単純に internal_owner名でグルーピング
// returns: { [ownerName]: [{ project, daysUntilEnd, lastClockDate }] }
function getProgressPromptsForStaff(customers, projects, clockLogs, today = new Date()) {
  if (!projects) return {};
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const result = {};
  projects.forEach(p => {
    if (!p.endDate) return;
    if (p.status === "完了" || p.status === "中止") return;
    const end = new Date(p.endDate);
    if (isNaN(end.getTime())) return;
    const daysUntilEnd = Math.ceil((end - t) / 86400000);
    // 工期終了10日前〜終了日以降14日まで（遅延案件も拾う）
    if (daysUntilEnd > 10 || daysUntilEnd < -14) return;
    // 最終打刻日（進捗ヒアリングのヒント）
    let lastClockDate = null;
    if (clockLogs) {
      const logs = clockLogs.filter(l => l.projectId === p.id && l.clockOut);
      if (logs.length > 0) {
        const dates = logs.map(l => l.clockIn && l.clockIn.slice(0,10)).filter(Boolean).sort();
        lastClockDate = dates[dates.length-1];
      }
    }
    const owner = p.internalOwner || "（未設定）";
    if (!result[owner]) result[owner] = [];
    result[owner].push({ project: p, daysUntilEnd, lastClockDate });
  });
  // 担当者ごとにソート（残日数昇順）
  Object.keys(result).forEach(k => result[k].sort((a,b) => a.daysUntilEnd - b.daysUntilEnd));
  return result;
}

// スタッフ名を渡して、自分の担当分だけ返すショートカット
function getProgressPromptsForOwner(ownerName, projects, clockLogs, today = new Date()) {
  const all = getProgressPromptsForStaff(null, projects, clockLogs, today);
  return all[ownerName] || [];
}

// closing_day(1-31) から、今日以降の最初の請求日 Date を返す
function nextClosingDate(closingDay, fromDate = new Date()) {
  const base = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const thisMonthLast = new Date(base.getFullYear(), base.getMonth()+1, 0).getDate();
  let d = Math.min(closingDay, thisMonthLast);
  let candidate = new Date(base.getFullYear(), base.getMonth(), d);
  if (candidate < base) {
    const nextMonthLast = new Date(base.getFullYear(), base.getMonth()+2, 0).getDate();
    d = Math.min(closingDay, nextMonthLast);
    candidate = new Date(base.getFullYear(), base.getMonth()+1, d);
  }
  return candidate;
}

// ══════════════════════════════════════════════════════════════
// [2026-04-20] 進捗報告（progress_reports）
// ══════════════════════════════════════════════════════════════
async function loadProgressReports() {
  const rows = await sb("progress_reports?select=*&order=reported_at.desc");
  if (!rows) return [];
  return rows.map(r => ({
    id: r.id, projectId: r.project_id, customerId: r.customer_id,
    reporterId: r.reporter_id, reporterName: r.reporter_name||"",
    percent: r.percent, comment: r.comment||"", reportedAt: r.reported_at,
  }));
}

async function saveProgressReport(report) {
  return await apiGateway("insert_progress_report", { report: {
    id: report.id, projectId: report.projectId,
    customerId: report.customerId||null,
    percent: report.percent, comment: report.comment||"",
  }});
}

// 案件IDごとに「最新」「前回」の進捗レポートを返す
// returns: { [projectId]: { latest, previous } }
function getProgressMap(reports) {
  const map = {};
  (reports||[]).forEach(r => {
    if (!map[r.projectId]) map[r.projectId] = { all: [] };
    map[r.projectId].all.push(r);
  });
  Object.keys(map).forEach(pid => {
    const sorted = map[pid].all.sort((a,b) => new Date(b.reportedAt) - new Date(a.reportedAt));
    map[pid].latest = sorted[0] || null;
    map[pid].previous = sorted[1] || null;
  });
  return map;
}

// 今日が顧客の progress_check_day1 or 2 に該当する案件を、担当者別に返す
// 対象案件: 進行中 OR 完了から60日以内（completedAt起点）
// 担当者なし案件 → 川畑に集約
// 既に今日報告済みの案件は除外
// returns: { [ownerName]: [{ project, customer, checkType, lastReport }] }
function getProgressCheckRequests(customers, projects, reports, today = new Date()) {
  if (!customers || !projects) return {};
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayDay = t.getDate();
  // [2026-05-07] Codex指摘#3: t.toISOString() は UTC変換するため JST 0時台に前日化。dateStrJST に統一
  const todayStr = dateStrJST(t);
  const reportMap = getProgressMap(reports);
  const result = {};

  customers.forEach(c => {
    const d1 = c.progressCheckDay1, d2 = c.progressCheckDay2;
    let checkType = null;
    if (d1 === todayDay) checkType = "客先共有";
    else if (d2 === todayDay) checkType = "内部確認";
    else return;

    // この顧客の対象案件
    const targets = projects.filter(p => {
      // [2026-09-29] 画面の「顧客」欄は lead 列に保存され client 列は常に空だったため、月次の進捗確認が1件も出ていなかった。lead も見る
      if ((p.client || p.lead) !== c.name) return false;
      // [2026-09-29] 終わった現場（完了・中止）は対象外（以前は完了後60日まで出していた）
      if (p.status === "中止" || p.status === "完了") return false;
      return true;
    });
    if (targets.length === 0) return;

    targets.forEach(p => {
      // 今日既に報告済みは除外（再送防止）
      const rep = reportMap[p.id];
      if (rep?.latest && dateStrJST(rep.latest.reportedAt) === todayStr) return; // [2026-10-08] UTCの日付で比べていたため、朝9時前の報告が「前日」扱いになり強制画面から抜けられなかった

      const owner = (p.internalOwner && p.internalOwner.trim()) || "川畑";
      if (!result[owner]) result[owner] = [];
      result[owner].push({
        project: p, customer: c, checkType,
        lastReport: rep?.latest || null,
      });
    });
  });
  Object.keys(result).forEach(k => result[k].sort((a,b) =>
    a.customer.name.localeCompare(b.customer.name, "ja")
  ));
  return result;
}

// [2026-07-07] 強制進捗報告用: 今日が確認日で、ログイン中スタッフが「打刻したことのある」対象案件を返す
//   - 対象スタッフ: その顧客の案件に打刻歴があるスタッフ（内部担当者ではなく打刻ベース）
//   - 役員(isExecutive)は呼び出し側で除外する想定
//   - 対象案件: 進行中 OR 完了から60日以内、中止は除外
//   - 既に今日（誰かが）報告済みの案件は除外（1案件1日1報告で重複防止）
// returns: [{ project, customer, checkType, lastReport }]
// [2026-09-29] requestAllAt（任意）: 管理者の一斉依頼日時。指定時は確認日以外でも対象になる（checkType="一斉確認"）
function getForcedProgressRequests(user, customers, projects, reports, clockLogs, today = new Date(), requestAllAt = null) {
  if (!user || !customers || !projects) return [];
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayDay = t.getDate();
  const todayStr = dateStrJST(t);
  const reportMap = getProgressMap(reports);
  // このスタッフが打刻したことのある projectId 集合
  const myProjectIds = new Set(
    (clockLogs || []).filter(l => l.userId === user.id).map(l => l.projectId)
  );
  const out = [];
  customers.forEach(c => {
    const d1 = c.progressCheckDay1, d2 = c.progressCheckDay2;
    let checkType = null;
    if (d1 === todayDay) checkType = "客先共有";
    else if (d2 === todayDay) checkType = "内部確認";
    else return;
    const targets = projects.filter(p => {
      // [2026-09-29] 画面の「顧客」欄は lead 列に保存され client 列は常に空だったため、月次の進捗確認が1件も出ていなかった。lead も見る
      if ((p.client || p.lead) !== c.name) return false;
      if (!myProjectIds.has(p.id)) return false; // 打刻歴のある案件のみ
      // [2026-09-29] 終わった現場（完了・中止）は対象外（以前は完了後60日まで出していた）
      if (p.status === "中止" || p.status === "完了") return false;
      return true;
    });
    targets.forEach(p => {
      const rep = reportMap[p.id];
      if (rep?.latest && dateStrJST(rep.latest.reportedAt) === todayStr) return; // 今日報告済み除外（[2026-10-08] JSTの日付で比較）
      out.push({ project: p, customer: c, checkType, lastReport: rep?.latest || null });
    });
  });
  // [2026-09-29] 管理者の「全現場に進捗報告を依頼」（app_settings.progress_request_all_at）。客先の確認日とは別に一回だけ。
  //   進行中の案件のうち、このスタッフが打刻したことがあり、依頼日時より後に（誰からも）報告が無いものを追加する
  if (requestAllAt) {
    const reqMs = new Date(requestAllAt).getTime();
    const already = new Set(out.map(x => x.project.id));
    projects.forEach(p => {
      if (p.status !== "進行中" || already.has(p.id) || !myProjectIds.has(p.id)) return;
      const rep = reportMap[p.id];
      if ((rep?.all || []).some(r => new Date(r.reportedAt).getTime() >= reqMs)) return; // 依頼後に報告済み
      const cname = p.client || p.lead || "";
      const c = customers.find(x => x.name === cname) || { id: null, name: cname || "（客先未設定）" };
      out.push({ project: p, customer: c, checkType: "一斉確認", lastReport: rep?.latest || null });
    });
  }
  out.sort((a, b) => a.customer.name.localeCompare(b.customer.name, "ja"));
  return out;
}

// 管理者画面用: 今日の進捗依頼と昨日の報告まとめを両方返す
// returns: { todayRequests, yesterdayReports }
function getProgressForAdmin(customers, projects, reports, today = new Date()) {
  const todayRequests = getProgressCheckRequests(customers, projects, reports, today);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yStr = dateStrJST(y); // [2026-05-07] Codex#3 UTC前日化を回避
  const yesterdayReports = (reports||[]).filter(r =>
    r.reportedAt && r.reportedAt.slice(0,10) === yStr
  );
  return { todayRequests, yesterdayReports };
}

async function loadInstagramSettings() {
  const rows = await sb("instagram_settings?select=*&limit=1");
  if (!rows || rows.length === 0) return { incentiveManual:500, incentiveAuto:200, monthlyCap:2000 };
  const r = rows[0];
  return { incentiveManual:r.incentive_manual, incentiveAuto:r.incentive_auto, monthlyCap:r.monthly_cap_per_staff };
}

// [v15] Instagram投稿テンプレート定義
const INSTA_CATEGORIES = [
  { id:"施工実績", label:"施工実績", icon:"🏗" },
  { id:"現場の日常", label:"現場の日常", icon:"📸" },
  { id:"フリー投稿", label:"フリー投稿", icon:"✏" },
];
// 選択肢のデフォルト値（DBから取得で上書き可）
const INSTA_OPTIONS = {
  target: ["配管","ダクト","タンク","機器まわり","その他"],
  material: ["グラスウール","ロックウール","ポリスチレン","ウレタン","ラッキング(SUS)","ラッキング(カラー)","テープ巻き","その他"],
  workType: ["保温","保冷","防露","ラッキング","撤去","その他"],
  place: ["ビル","マンション","工場","商業施設","病院","学校","その他"],
  scene: ["朝礼","休憩中","作業中","移動中","片付け","道具・材料","昼飯","その他"],
};
function generateInstaCaption(category, selections, comment) {
  if (category === "施工実績") {
    return `【施工実績】${selections.place||""}の${selections.workType||""}

${selections.target||""}に${selections.material||""}を施工しました。
${comment||""}

確かな技術で、快適な環境をつくる。
東京・埼玉の熱絶縁工事はシンセイ工業へ。

#シンセイ工業 #熱絶縁工事 #${selections.workType||""} #${selections.material||""}
#施工実績 #${selections.place||""} #東京 #埼玉
#建設業 #職人 #現場仕事`;
  }
  if (category === "現場の日常") {
    return `【現場の日常】${selections.scene||""}

${comment||"シンセイ工業の日常をお届けします。"}
一緒に働く仲間を募集中！

#シンセイ工業 #熱絶縁工事 #現場の日常
#職人の仕事 #建設業のリアル #${selections.scene||""}
#東京 #埼玉 #求人`;
  }
  // フリー投稿
  return `${comment||""}

#シンセイ工業 #熱絶縁工事 #東京 #埼玉`;
}

// [2026-04-27] 管理者メモ
async function loadAdminNotes() {
  const res = await apiGateway("list_admin_notes", {});
  return res?.notes || [];
}
async function insertAdminNote(id, content, imageUrl) {
  return apiWrite("insert_admin_note", { id, content, imageUrl: imageUrl || null });
}
async function updateAdminNote(id, content, imageUrl) {
  return apiWrite("update_admin_note", { id, content, imageUrl: imageUrl ?? null });
}
async function deleteAdminNote(id) {
  return apiWrite("delete_admin_note", { id });
}

// [2026-06-12] ご意見箱（匿名投稿）
// 投稿: スタッフ誰でも。staff_idはサーバ側でsessionから付与。
async function submitSuggestion(content) {
  return apiWrite("insert_suggestion", { content });
}
// 一覧: admin限定。staff_idは返らない（匿名担保）
async function loadSuggestionsAdmin() {
  const res = await apiGateway("list_suggestions", {});
  if (!res?.ok || !Array.isArray(res.rows)) return null;
  return res.rows.map(r => ({ id:r.id, content:r.content||"", status:r.status||"未対応", createdAt:r.created_at }));
}
async function updateSuggestionStatus(id, status) {
  return apiWrite("update_suggestion_status", { id, status });
}

// ──────────────────────────────
// [2026-09-07] 給与計算 — マネーフォワード給与へ入力する「変動手当」を算出する
//
// 基礎賃金 = 基本給 + 役職手当 + 一級技能士手当 + 職長手当(その月の額)
//   ※ 家族手当(3,000円/人)・功労手当(臨時)・熱中症対策費(真夏のみ)は（通信費は2026-10-19からV3で算入）
//      割増賃金の基礎から除外する。労基法37条5項/施行規則21条の除外は限定列挙のため、
//      職長手当は変動しても毎月支給される以上ここに算入する（勝間さん判断: 2026-09-07）。
//
// 日給 = 基礎賃金 ÷ 22日（切り捨て）
// 時給 = 基礎賃金 ÷ 22日 ÷ 所定労働時間（四捨五入）
//   ※ 割増単価は丸める前の時給から計算して四捨五入する（実績の明細と一致することを確認済み）
// ──────────────────────────────
const PAYROLL_DAYS_PER_MONTH = 22;      // 日給・時給の分母（明細の表記は20日だが実際は22日）
const PAYROLL_HOLIDAY_RATE   = 0.35;    // 法定休日の割増分（1.35 − 1.00）
// [2026-10-14] 就業規則 第41条に合わせる：月45Hまで25%、45H超〜60Hは35%、60H超は50%（以前は60Hまで1.25・超えたら1.35だった）
const PAYROLL_OT_LIMIT_H     = 45;      // 月45Hを超えた残業は1.35倍
const PAYROLL_OT_LIMIT2_H    = 60;      // 月60Hを超えた残業は1.50倍
const PAYROLL_OT_RATE        = 1.25;    // 通常残業（月45Hまで）
const PAYROLL_OT_RATE_OVER   = 1.35;    // 月45H超〜60H
const PAYROLL_OT_RATE_OVER60 = 1.5;     // 月60H超
const PAYROLL_OT_RATE_NIGHT  = 1.5;     // 月60H超＋深夜

// [2026-10-16] V3（2026年10月度の給与〜）：時給の分母を就業規則 第41条第3項の式にする
//   1か月平均所定労働時間 ＝ (365 − 年間所定休日) × 1日の所定労働時間(6.5H) ÷ 12
//   年間所定休日＝土日＋夏季休日(8/13〜16)と年末年始(12/30〜1/3)のうち平日の日（就業規則 第19条。祝日は休日ではない）
//   2026年＝110日 → 138.1H、2027年＝109日 → 138.7H。年は給与期間の終わりの日の年で決める
const PAYROLL_SHOTEI_H = 6.5;
// [2026-10-19] 就業規則 第41条の式どおり、V3 では通信費（全員 月3,000円）も割増賃金の基礎に入れる（勝間さん決定）
const PAYROLL_TSUSHIN = 3000;
function annualShoteiHolidays(year) {
  let n = 0;
  for (let d = new Date(year, 0, 1); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const w = d.getDay(), m = d.getMonth() + 1, day = d.getDate();
    const longBreak = (m === 8 && day >= 13 && day <= 16) || (m === 12 && day >= 30) || (m === 1 && day <= 3);
    if (w === 0 || w === 6 || longBreak) n++;
  }
  return n;
}
function monthlyAvgShoteiH(year) {
  return (365 - annualShoteiHolidays(year)) * PAYROLL_SHOTEI_H / 12;
}
// 月の残業の合計の丸め（昭和63年基発150号）：1時間未満の端数は、30分未満を切り捨て、30分以上を1時間に切り上げ
function roundMonthlyOvertimeH(h) {
  const mins = Math.round((Number(h) || 0) * 60);
  return Math.floor(mins / 60) + (mins % 60 >= 30 ? 1 : 0);
}

// 給与マスタ。昇給・手当変更時はここを書き換える。
//   base    : 基本給
//   yakushoku : 役職手当（基礎賃金に算入）
//   ginou   : 一級技能士手当（基礎賃金に算入）
//   hours   : 所定労働時間(H)
//   oldHours: 旧ルール（2026年9月度まで）の計算で使っていた所定時間。過去の明細を変えないために残す
//   alpha   : 夏季・冬季手当の日額。法定休日出勤の上乗せ額も、hoteiAlpha が無ければこの額
//   hoteiAlpha : 法定休日出勤の上乗せ額（alpha と違う人だけ書く）
// 職長手当は月ごとに変わるため、マスタではなく calcPayroll の引数で渡す。
// [2026-10-08] 法定休日出勤の上乗せ・夏季冬季手当の日額：川畑 8,000円・他の人 5,000円（勝間さん指示）
// [2026-10-16] 所定労働時間は全員 6.5H（就業規則 第18条・各自の通知書）。以前は3人が 7.0H になっていた
const PAYROLL_MASTER = {
  "川畑大和": { base:422000, yakushoku:25000, ginou:0,    hours:6.5, oldHours:7.0, alpha:8000 },
  "大塚悟":   { base:385000, yakushoku:0,     ginou:5000, hours:6.5, oldHours:7.0, alpha:5000 },
  "小野拓海": { base:308000, yakushoku:0,     ginou:0,    hours:6.5, oldHours:7.0, alpha:5000 },
  "廣野大吾": { base:292000, yakushoku:0,     ginou:0,    hours:6.5, alpha:5000 },
  // 勝間吉郎・勝間裕太は役員報酬のため対象外
};

// 氏名のゆらぎ（全角空白・半角空白）を吸収してマスタを引く
// [2026-09-29] アプリの staff.name は苗字だけ（川畑・大塚・小野・廣野）で、マスタはフルネームのため
//   完全一致では1人も引けず、給与計算タブが「給与マスタに登録されたスタッフがいません」になっていた。
//   完全一致が無ければ「マスタ名が苗字で始まる」ものを探す。同じ苗字が2人以上いたら誤計算を避けて null。
function getPayrollMaster(name) {
  if (!name) return null;
  const key = String(name).replace(/[\s　]/g, "");
  if (PAYROLL_MASTER[key]) return PAYROLL_MASTER[key];
  const hits = Object.keys(PAYROLL_MASTER).filter(k => k.startsWith(key));
  return hits.length === 1 ? PAYROLL_MASTER[hits[0]] : null;
}

// 給与計算本体
//   master   : PAYROLL_MASTER の1件
//   shokucho : その月の職長手当（0可）
//   days     : { saturday:所定休日出勤日数, sunday:法定休日出勤日数, long:お盆・年末年始の出勤日数 }
//   overtimeH: その月の残業時間合計（calcOvertime の合算値）
//   nightH   : そのうち深夜(22:00-5:00)にかかる時間。未対応の場合は0
//   v3Year   : V3（2026年10月度〜）の期間ならその年（時給の分母の計算に使う）。旧ルールの期間は null
function calcPayroll(master, shokucho, days, overtimeH, nightH, v3Year) {
  if (!master) return null;
  const sho = Number(shokucho) || 0;
  const kiso = master.base + master.yakushoku + master.ginou + sho
             + (v3Year ? (master.tsushin ?? PAYROLL_TSUSHIN) : 0);   // 基礎賃金（V3は通信費を含む。旧期間は過去の明細を変えないため含めない）
  const avgH = v3Year ? monthlyAvgShoteiH(v3Year) : null;            // V3：1か月平均所定労働時間
  const rawHourly = v3Year ? kiso / avgH                             // V3：基礎賃金 ÷ 平均所定労働時間
                           : kiso / PAYROLL_DAYS_PER_MONTH / (master.oldHours || master.hours);   // 旧：÷22日÷所定（過去の明細と合わせる）
  const rawDaily = v3Year ? rawHourly * PAYROLL_SHOTEI_H : kiso / PAYROLL_DAYS_PER_MONTH;   // 丸める前の日給
  const daily = Math.floor(rawDaily);                                 // 表示用の日給
  const hourly = Math.round(rawHourly);                              // 表示用の時給

  const d = days || {};
  const satDays  = Number(d.saturday) || 0;
  const sunDays  = Number(d.sunday)   || 0;
  const longDays = Number(d.long)     || 0;

  // 所定休日(土曜)は割増なしの日給、法定休日(日曜)は 日給×0.35 + α
  // ※ 丸めた日給ではなく rawDaily を使う。実績の明細は日給を丸めずに掛けている
  //    （川畑: 20,318.18×3日=60,955。丸めた20,318で掛けると60,954で1円ずれる）
  const shoteiPay = Math.round(rawDaily * satDays);
  // [2026-10-08] 法定休日出勤は振休1日を取ったうえで、割増分(0.35)＋上乗せ額を払う
  const hoteiAlpha = master.hoteiAlpha != null ? master.hoteiAlpha : master.alpha;
  const hoteiPay  = Math.round((rawDaily * PAYROLL_HOLIDAY_RATE + hoteiAlpha) * sunDays);
  const longPay   = master.alpha * longDays;                         // 夏季・冬季手当

  // 残業: 月45Hまでは1.25、45H超〜60Hは1.35、60H超は1.5（就業規則 第41条）。深夜が重なる分は1.5
  let otAll   = Math.max(0, Number(overtimeH) || 0);
  let otNight = Math.min(Math.max(0, Number(nightH) || 0), otAll);
  if (v3Year) {   // V3：月の合計を、深夜とそれ以外に分けてそれぞれ丸める
    otNight = roundMonthlyOvertimeH(otNight);
    otAll = otNight + roundMonthlyOvertimeH(Math.max(0, (Number(overtimeH) || 0) - (Number(nightH) || 0)));
  }
  const otDay   = otAll - otNight;
  const otNormal = Math.min(otDay, PAYROLL_OT_LIMIT_H);
  const otOver   = Math.max(0, Math.min(otDay, PAYROLL_OT_LIMIT2_H) - PAYROLL_OT_LIMIT_H);
  const otOver60 = Math.max(0, otDay - PAYROLL_OT_LIMIT2_H);
  const overtimePay =
      Math.round(rawHourly * PAYROLL_OT_RATE)       * otNormal
    + Math.round(rawHourly * PAYROLL_OT_RATE_OVER)  * otOver
    + Math.round(rawHourly * PAYROLL_OT_RATE_OVER60) * otOver60
    + Math.round(rawHourly * PAYROLL_OT_RATE_NIGHT) * otNight;

  return {
    kiso, daily, hourly, avgH,
    unitNormal: Math.round(rawHourly * PAYROLL_OT_RATE),
    unitOver:   Math.round(rawHourly * PAYROLL_OT_RATE_OVER),
    unitOver60: Math.round(rawHourly * PAYROLL_OT_RATE_OVER60),
    otNormalH: otNormal, otOverH: otOver, otOver60H: otOver60,
    unitNight:  Math.round(rawHourly * PAYROLL_OT_RATE_NIGHT),
    shoteiPay, hoteiPay, longPay,
    overtimePay: Math.round(overtimePay),
    satDays, sunDays, longDays, overtimeH: otAll,
  };
}
