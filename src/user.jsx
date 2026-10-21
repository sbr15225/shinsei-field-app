const { useState, useEffect, useCallback, useRef } = React;

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════
// [2026-09-29] breakeven＝赤字ライン人工（これを超えると会社が損）。目立たせるのは目標、赤字ラインは赤の小さい字で添えるだけ
function NinkuBar({ actual, target, breakeven }) {
  const pct = target>0?Math.min((actual/target)*100,100):0;
  const over = target>0&&actual>target;
  const color = over?"#ef4444":pct>80?"#f59e0b":"#22c55e";
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
        <span style={{color:"#111827"}}>人工進捗</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",color}}>
          {actual}/{target}{over&&<span style={{color:"#ef4444",marginLeft:4}}>超過!</span>}
        </span>
      </div>
      <div style={{height:5,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:over?"#ef4444":`linear-gradient(90deg,${color}88,${color})`,transition:"width 0.4s"}} />
      </div>
      {breakeven>0&&<div style={{textAlign:"right",marginTop:3,fontSize:10,color:"#ef4444"}}>赤字ライン {breakeven}人工{actual>breakeven&&"（超過）"}</div>}
    </div>
  );
}

function ProgressBar({ value }) {
  const pct = Math.min(Math.max(value||0,0),100);
  const c = pct>=80?"#22c55e":pct>=50?"#f59e0b":"#ef4444";
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:11}}>
        <span style={{color:"#111827"}}>工事進捗</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",color:c,fontWeight:700}}>{pct}%</span>
      </div>
      <div style={{height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c}88,${c})`,transition:"width 0.4s"}} />
      </div>
    </div>
  );
}

// [v14] ×ボタンをスマホで押しやすい位置に（右上→左下 or サイズ拡大）
function Modal({ title, accent="#f97316", onClose, children }) {
  return (
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fafafa",border:"1px solid #d1d5db",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,padding:"20px 20px 40px",maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:14,fontWeight:700,color:accent}}>{title}</div>
          <button onClick={onClose} style={{background:"#e5e7eb",border:"1px solid #9ca3af",borderRadius:8,color:"#6b7280",padding:"8px 14px",cursor:"pointer",fontSize:13,minWidth:44,minHeight:44}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{fontSize:10,color:"#111827",marginBottom:5,letterSpacing:"0.08em"}}>{label}</div>
      {children}
    </div>
  );
}

function PinPad({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const submit = (code) => {
    if(code.length<4||checking) return;
    setChecking(true);
    verifyPin(code).then(result=>{
      if(result&&result.user){setTimeout(()=>onSuccess(result.user, result.sessionToken),100);}
      // [2026-04-15] エラー表示が1.5秒で消える→見逃すバグ対策: 表示は残し、PINだけ即座にクリア。次のキー押下でエラーも消える
      else{setErr(true);setErrMsg(result?.error||"PINが一致しません");setPin("");setTimeout(()=>{setErr(false);setChecking(false);},400);}
    }).catch(()=>{setErr(true);setErrMsg("通信エラー");setPin("");setTimeout(()=>{setErr(false);setChecking(false);},400);});
  };
  const press = d => {
    if(pin.length>=6||checking) return;
    if(errMsg) setErrMsg(""); // [2026-04-15] 次のキー押下でエラー消去
    const next=pin+d;
    setPin(next);
    if(next.length===6) submit(next);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,padding:"10px 0"}}>
      <div style={{fontSize:12,color:"#111827",letterSpacing:"0.1em"}}>PINコードを入力（4〜6桁）</div>
      <div style={{display:"flex",gap:8}}>
        {[0,1,2,3,4,5].map(i=><div key={i} style={{width:12,height:12,borderRadius:"50%",background:pin.length>i?(err?"#ef4444":"#f97316"):"#d1d5db",transition:"background 0.15s"}} />)}
      </div>
      {errMsg&&<div style={{fontSize:11,color:"#ef4444"}}>{errMsg}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:200}}>
        {[1,2,3,4,5,6,7,8,9,"⌫",0,"OK"].map((d,i)=>(
          <button key={i} onClick={()=>{if(d==="⌫")setPin(p=>p.slice(0,-1));else if(d==="OK")submit(pin);else press(String(d));}}
            disabled={d==="OK"&&(pin.length<4||checking)}
            style={{background:d==="OK"?(pin.length>=4?"#22c55e":"#fafafa"):"#fafafa",border:"1px solid",borderColor:d==="OK"?(pin.length>=4?"#22c55e44":"#d1d5db"):"#d1d5db",borderRadius:10,padding:"14px 0",fontSize:d==="OK"?14:18,fontWeight:700,color:d==="⌫"?"#6b7280":d==="OK"?(pin.length>=4?"#000":"#9ca3af"):"#111827",cursor:(d==="OK"&&pin.length<4)?"not-allowed":"pointer",fontFamily:"'JetBrains Mono',monospace"}}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// [2026-10-19] 熱中症の手順（労働安全衛生規則 第612条の2：報告の体制と手順を作って周知する義務）。会社情報タブと、夏（5〜9月）は打刻タブにも出す
function HeatGuide({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const tel = (n, label) => <a href={"tel:" + n.replace(/-/g, "")} style={{display:"block",textAlign:"center",background:"#fff",border:"1px solid #dc2626",borderRadius:8,padding:"10px",color:"#b91c1c",fontWeight:700,fontSize:14,textDecoration:"none",marginBottom:6}}>{label}　{n}</a>;
  return (
    <div style={{background:"#fef2f2",border:"1px solid #dc2626",borderRadius:10,marginBottom:12,overflow:"hidden"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
        <span style={{fontSize:13,fontWeight:700,color:"#b91c1c"}}>🥵 熱中症になったら（手順と連絡先）</span>
        <span style={{color:"#b91c1c",fontSize:12}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"0 16px 14px",fontSize:13,color:"#374151",lineHeight:1.7}}>
          <div style={{fontWeight:700,color:"#b91c1c",marginTop:4}}>こんな様子なら熱中症を疑う</div>
          <div>めまい・立ちくらみ／手足がつる／頭が痛い・吐き気／汗が止まらない、または出ない／ぼーっとして受け答えがおかしい</div>
          <div style={{fontWeight:700,color:"#b91c1c",marginTop:10}}>すぐにやること</div>
          <div>① 作業をやめさせ、日かげ・涼しい所へ連れて行く</div>
          <div>② 服をゆるめ、首・わきの下・足の付け根を冷やす（水・保冷剤・氷）</div>
          <div>③ 自分で水が飲めるなら、水と塩分（スポーツドリンク・塩あめ）をとらせる</div>
          <div>④ 職長と会社（勝間）にすぐ連絡する。<b>1人にしない</b></div>
          <div style={{background:"#fff",border:"2px solid #dc2626",borderRadius:8,padding:"8px 10px",margin:"10px 0",fontWeight:700,color:"#b91c1c"}}>
            呼びかけに答えない・言っていることがおかしい・自分で水が飲めない・けいれんしている → <span style={{fontSize:15}}>すぐ119番（救急車）</span>
          </div>
          <div style={{fontWeight:700,color:"#374151",marginTop:6,marginBottom:6}}>連絡先</div>
          {tel("119","救急車")}
          {tel("090-4749-4614","会社（勝間 裕太）")}
          <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>その日の現場の職長にも、すぐ知らせてください。</div>
          <div style={{fontWeight:700,color:"#374151",marginTop:10}}>ふだんの予防</div>
          <div>暑さ指数（WBGT）が高い日は、こまめに休憩と水分・塩分。朝の体調が悪い日は、無理せず職長に言う。</div>
        </div>
      )}
    </div>
  );
}

// [2026-04-17] GPS必須打刻 — 3回リトライで失敗なら理由入力必須
// [2026-04-20] Permissions APIで事前チェック。拒否済みなら専用モーダル（iOS/Android手順付き）
function ClockButton({ user, projectId, clockLogs, onClock, siteCoords, siteHasAddress, onRegisterSite, hourlyLeft = 35 }) {
  // [2026-10-15] 初めての現場は、退勤の前に現場の住所を登録（交通費の計算の基準。初回だけ）
  const [siteReg, setSiteReg] = useState(null); // {coords, locName, note, address, loading, saving, err} | null
  const siteDoneRef = useRef(null); // 登録が済んだ現場の id（登録直後は siteCoords がまだ古いので、二重に聞かない）
  const [state, setState] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const [progress, setProgress] = useState(0); // リトライ進捗 1-3
  const [failModal, setFailModal] = useState(false);
  const [deniedMode, setDeniedMode] = useState(false); // [2026-04-20] ブラウザで永続拒否されてる状態
  const [reasonText, setReasonText] = useState("");
  // [2026-04-24] 早上がりモーダル: 16時前の退勤時にカテゴリ・理由を必須入力
  const [earlyMode, setEarlyMode] = useState(null); // {coords, locName} | null
  const [earlyLeaveCategory, setEarlyLeaveCategory] = useState(""); // "現場終了"|"会社都合"|"本人都合"
  const [earlyReasonText, setEarlyReasonText] = useState("");
  // [2026-10-19] 現場終了の理由（ボタンで選ぶ）と、本人都合の扱い（時間有給を使う／欠勤）
  const [earlyPreset, setEarlyPreset] = useState("");
  const [earlyPay, setEarlyPay] = useState(""); // "paid_leave"|"absence"
  // [2026-10-19] 17時を過ぎた退勤：休憩が取れたかの確認。{coords, locName, note, step:"ask"|"short", min, reason} | null
  const [breakAsk, setBreakAsk] = useState(null);
  // [2026-05-14] 退勤時の外注入力モーダル
  const [outsourceMode, setOutsourceMode] = useState(null); // { outArgs:[...] } | null
  const [osStep, setOsStep] = useState("ask"); // "ask"|"type"|"count"
  const [osType, setOsType] = useState(null);  // "support"|"subcontract"
  const [osCount, setOsCount] = useState(1);
  // [2026-05-29] 退勤位置が現場から1km以上離れている時の警告
  const [farWarn, setFarWarn] = useState(null); // { coords, locName, note, dist } | null
  // [2026-07-14] 夜勤の退勤で出勤から長時間(16h超)経過 → 退勤忘れの可能性を確認
  const [nightLongWarn, setNightLongWarn] = useState(null); // { coords, locName, note, workedH } | null
  // [2026-06-05] 出勤時の通勤方法（必須）。company_car/train/own_car
  const [commuteMethod, setCommuteMethod] = useState("");
  // [2026-07-13] 出勤時の勤務区分。false=日勤(既定) / true=夜勤
  const [isNightShift, setIsNightShift] = useState(false);
  // [2026-07-13] 未退勤レコード検出。
  //   日勤: 従来どおり「当日 かつ 未退勤」（ロジック不変）
  //   夜勤: 日付をまたぐため isSameLocalDay の制限を外し、24時間以内の未退勤を検出
  const openLog = clockLogs.find(l=>l.userId===user.id&&l.projectId===projectId&&!l.clockOut&&(
    isSameLocalDay(l.clockIn) ||
    (l.isNightShift && (Date.now()-new Date(l.clockIn).getTime())<24*3600000)
  ));
  const FAR_THRESHOLD_M = 1000;

  // [2026-04-17] 3段階リトライ: 粘るように大幅延長（合計約45秒）
  const gpsConfigs = [
    {enableHighAccuracy:false, timeout:10000, maximumAge:30000},  // 低精度でまず試す
    {enableHighAccuracy:true,  timeout:15000, maximumAge:0},       // 高精度（最新）
    {enableHighAccuracy:true,  timeout:20000, maximumAge:60000},   // 高精度（キャッシュ可）
  ];
  const doClick = async (coords, locName, note="", skipFarCheck=false) => {
    // [2026-10-15] 現場の位置が未登録 → 退勤の前に住所を登録してもらう（出勤はそのまま押せる）
    if (openLog && !siteCoords && !siteHasAddress && onRegisterSite && siteDoneRef.current !== projectId) {   // 住所が入っている現場は聞かない（勝間さん 10/15）
      setSiteReg({ coords, locName, note, address: "", loading: !!parseCoords(coords), saving: false, err: "" });
      setState("idle"); setProgress(0);
      const c = parseCoords(coords);
      if (c) getSiteAddressSuggestion(c.lat, c.lng).then(a => setSiteReg(s => s ? { ...s, address: s.address || a, loading: false } : s));
      return;
    }
    // [2026-05-29] 退勤時、現場から1km以上離れていたら警告（GPS取得済みの時のみ）
    if (openLog && !skipFarCheck && coords) {
      const ref = siteCoords || parseCoords(openLog.coordsIn);
      const dist = distanceMeters(ref, parseCoords(coords));
      if (dist != null && dist >= FAR_THRESHOLD_M) {
        setFarWarn({ coords, locName, note, dist });
        setState("idle"); setProgress(0);
        return;
      }
    }
    // [2026-04-24] 退勤 + 16:00前 → 早上がりモーダルを表示
    // [2026-07-13] 夜勤は定時の概念がないため早上がり判定はスキップ
    if (openLog && !openLog.isNightShift && new Date().getHours() < 16 && !note) {
      setEarlyMode({ coords, locName });
      setEarlyLeaveCategory("");
      setEarlyReasonText("");
      setState("idle");
      setProgress(0);
      return;
    }
    // [2026-07-14] 夜勤の退勤で出勤から16h以上経過 → 退勤忘れの可能性があるため確認を挟む
    if (openLog && openLog.isNightShift) {
      const workedH = (Date.now() - new Date(openLog.clockIn).getTime()) / 3600000;
      if (workedH >= 16) {
        setNightLongWarn({ coords, locName, note, workedH });
        setState("idle"); setProgress(0);
        return;
      }
    }
    // [2026-10-19] 日勤で17時を過ぎた退勤は「休憩は取れましたか？」を聞く（取れなかった分は働いた時間として残業に足す）
    if (openLog && !openLog.isNightShift && new Date().getHours() >= 17) {
      setBreakAsk({ coords, locName, note, step: "ask", min: 30, reason: "" });
      setState("idle"); setProgress(0);
      return;
    }
    if (openLog) {
      // [2026-05-14] 退勤は外注入力モーダルを経由
      startOutsource(["out", coords, openLog?.id, locName, note]);
      return;
    }
    // [2026-06-05] 出勤打刻に通勤方法を渡す
    // [2026-07-13] 夜勤フラグ(isNightShift)も渡す
    // [2026-07-14] 保存の成否を待ってから✓表示（失敗時は✓を出さずidleへ戻す。電波の悪い現場で打刻漏れに気づけるように）
    setState("loading");
    const ok = await onClock("in", coords, null, locName, note, "", "", 0, null, commuteMethod, isNightShift);
    if(!ok){ setState("idle"); setProgress(0); return; }
    setCommuteMethod("");
    setIsNightShift(false);
    setState("done");
    setTimeout(()=>{setState("idle");setProgress(0);},2000);
  };
  // [2026-05-14] 外注モーダル起動・完了
  const startOutsource = (outArgs) => {
    setOutsourceMode({ outArgs });
    setOsStep("ask"); setOsType(null); setOsCount(1);
    setState("idle"); setProgress(0);
  };
  const finishOut = async (outsource) => {
    const a = outsourceMode?.outArgs || [];
    setOutsourceMode(null); setOsType(null); setOsCount(1);
    // onClock(type,coords,openLogId,locationName,note,elc,elr,hourlyUsed,outsource)
    // [2026-07-14] 保存の成否を待ってから✓表示（失敗時は✓を出さない）
    setState("loading");
    // [2026-10-19] a[8] = { earlyLeavePay, breakShortMin, breakShortReason }（なければ空）
    const ok = await onClock(a[0], a[1], a[2], a[3]||"", a[4]||"", a[5]||"", a[6]||"", a[7]||0, outsource, "", false, a[8]||null);
    if(!ok){ setState("idle"); setProgress(0); return; }
    setState("done");
    setTimeout(()=>{setState("idle");setProgress(0);},2000);
  };
  const calcEarlyHours = () => {
    const now = new Date();
    const earlyMins = 17 * 60 - (now.getHours() * 60 + now.getMinutes());
    const remainder = earlyMins % 60;
    return remainder >= 30 ? Math.ceil(earlyMins / 60) : Math.floor(earlyMins / 60);
  };
  // [2026-10-19] 早上がりの理由の決め方：現場終了はボタン（その他だけ文章）、会社都合・本人都合は文章
  const EARLY_PRESETS = ["作業が予定より早く終わった", "材料待ち・段取り待ち", "元請の指示", "天候", "その他"];
  const earlyReasonFinal = () => {
    if (earlyLeaveCategory === "現場終了") {
      if (!earlyPreset) return "";
      if (earlyPreset === "その他") return earlyReasonText.trim();
      return earlyPreset + (earlyReasonText.trim() ? "／" + earlyReasonText.trim() : "");
    }
    return earlyReasonText.trim();
  };
  const handleEarlySubmit = () => {
    const elr = earlyReasonFinal();
    if (!earlyLeaveCategory || !elr) return;
    if (earlyLeaveCategory === "本人都合" && !earlyPay) return;
    const { coords, locName } = earlyMode;
    // [2026-10-19] 時間有給は本人が「使う」を選んだときだけ（協定 第5条）
    const hourlyUsed = (earlyLeaveCategory === "本人都合" && earlyPay === "paid_leave") ? calcEarlyHours() : 0;
    const elc = earlyLeaveCategory;
    const extra = earlyLeaveCategory === "本人都合" ? { earlyLeavePay: earlyPay } : null;
    setEarlyMode(null);
    setEarlyLeaveCategory("");
    setEarlyReasonText("");
    setEarlyPreset(""); setEarlyPay("");
    // [2026-05-14] 早上がりも外注入力モーダルを経由
    startOutsource(["out", coords, openLog?.id, locName, "", elc, elr, hourlyUsed, extra]);
  };
  const handleEarlyCancel = () => {
    setEarlyMode(null);
    setEarlyReasonText("");
    setEarlyPreset(""); setEarlyPay("");
    setState("idle");
    setProgress(0);
  };
  const tryGPS = (attempt) => {
    setProgress(attempt+1);
    const msgs = ["位置情報を取得中…（しばらくお待ちください）","GPS取得中… もう少しお待ちを (2/3)","GPS取得中… 最終試行 (3/3)"];
    setErrMsg(msgs[attempt]||"GPS取得中…");
    const config = gpsConfigs[attempt] || gpsConfigs[2];
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const c={lat:pos.coords.latitude,lng:pos.coords.longitude,acc:Math.round(pos.coords.accuracy)};
        getLocationName(c.lat,c.lng).then(n=>doClick(c,n)).catch(()=>doClick(c,""));
      },
      err=>{
        if(err.code===1){
          // 権限拒否 → 専用モーダル（設定変更手順を表示）
          setState("idle");
          setProgress(0);
          setDeniedMode(true);
          setFailModal(true);
          setReasonText("");
        } else if(attempt >= 2){
          // 3回リトライ失敗 → 理由入力モーダル
          setState("idle");
          setProgress(0);
          setDeniedMode(false);
          setFailModal(true);
          setReasonText("");
        } else {
          setTimeout(()=>tryGPS(attempt+1),500);
        }
      },
      config
    );
  };
  // [2026-04-20] 打刻ボタン押下時: Permissions APIで事前チェック
  const handle = async ()=>{
    if(state==="loading") return;
    // [2026-06-05] 出勤打刻は通勤方法の選択が必須
    if(!openLog && !commuteMethod) return;
    if(!navigator.geolocation){
      setDeniedMode(false);
      setFailModal(true);
      setReasonText("このブラウザはGPSに対応していないため");
      return;
    }
    // 永続拒否されている場合、getCurrentPosition を叩いてもダイアログは出ない。
    // 事前に判定して専用モーダル（設定変更手順）を出す。
    if(navigator.permissions?.query){
      try {
        const p = await navigator.permissions.query({name:"geolocation"});
        if(p.state==="denied"){
          setDeniedMode(true);
          setFailModal(true);
          setReasonText("");
          return;
        }
      } catch(e) { /* 非対応ブラウザは通常フローへ */ }
    }
    setState("loading");
    setProgress(1);
    setErrMsg("位置情報を取得中…");
    setDeniedMode(false);
    tryGPS(0);
  };
  const handleReasonSubmit = () => {
    if(!reasonText.trim()) return;
    setFailModal(false);
    setDeniedMode(false);
    doClick(null, "", "GPS取得失敗: " + reasonText.trim());
    setReasonText("");
  };
  const handleRetry = () => {
    setFailModal(false);
    setDeniedMode(false);
    setReasonText("");
    handle();
  };

  const isLoading=state==="loading";
  // [2026-06-05] 出勤時は通勤方法を選ぶまで打刻不可
  const needCommute=!openLog&&!commuteMethod;
  const label=isLoading?`位置情報を取得中… (${progress}/3)`:state==="done"?"✓ 記録しました":openLog?"退勤する":"出勤する";
  const bg=state==="done"?"#22c55e":isLoading||needCommute?"#e5e7eb":openLog?"linear-gradient(135deg,#3b82f6,#6366f1)":"linear-gradient(135deg,#22c55e,#16a34a)";
  // [2026-06-05] 通勤方法の選択肢（v147 で社用車(相乗り)追加）
  const commuteOpts=[{id:"company_car",icon:"🚐",label:"社用車"},{id:"company_car_shared",icon:"🚐",label:"相乗り"},{id:"train",icon:"🚃",label:"電車"},{id:"own_car",icon:"🚗",label:"自車"}];

  return (
    <div>
      {/* [2026-07-13] 出勤時の勤務区分（日勤/夜勤）切り替え。既定は日勤 */}
      {!openLog&&!isLoading&&state!=="done"&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>勤務区分</div>
          <div style={{display:"flex",gap:8}}>
            {[{id:false,icon:"☀️",label:"日勤"},{id:true,icon:"🌙",label:"夜勤"}].map(w=>(
              <button key={String(w.id)} onClick={()=>setIsNightShift(w.id)}
                style={{flex:1,padding:"10px 4px",borderRadius:8,border:isNightShift===w.id?(w.id?"2px solid #6366f1":"2px solid #22c55e"):"1px solid #d1d5db",background:isNightShift===w.id?(w.id?"#eef2ff":"#f0fdf4"):"#fafafa",color:isNightShift===w.id?(w.id?"#4f46e5":"#16a34a"):"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",lineHeight:1.4}}>
                <span style={{fontSize:16,marginRight:4}}>{w.icon}</span>{w.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* [2026-06-05] 出勤時の通勤方法選択（必須） */}
      {!openLog&&!isLoading&&state!=="done"&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>通勤方法 <span style={{color:"#ef4444"}}>*必須</span></div>
          <div style={{display:"flex",gap:8}}>
            {commuteOpts.map(m=>(
              <button key={m.id} onClick={()=>setCommuteMethod(m.id)}
                style={{flex:1,padding:"10px 4px",borderRadius:8,border:commuteMethod===m.id?"2px solid #22c55e":"1px solid #d1d5db",background:commuteMethod===m.id?"#f0fdf4":"#fafafa",color:commuteMethod===m.id?"#16a34a":"#6b7280",fontSize:12,fontWeight:700,cursor:"pointer",lineHeight:1.4}}>
                <div style={{fontSize:18}}>{m.icon}</div>{m.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <button onClick={handle} disabled={isLoading||needCommute} style={{width:"100%",background:bg,color:isLoading||needCommute?"#9ca3af":"#000",border:"none",borderRadius:10,padding:"14px",fontSize:14,fontWeight:700,cursor:isLoading?"wait":needCommute?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background 0.2s"}}>
        <span>{isLoading?"⌛":state==="done"?"✓":openLog?"🔵":"🟢"}</span>{label}
      </button>
      {needCommute&&<div style={{fontSize:11,color:"#9ca3af",marginTop:6,textAlign:"center"}}>↑ 通勤方法を選ぶと出勤できます</div>}
      {isLoading&&<div style={{fontSize:10,color:"#6b7280",marginTop:6,textAlign:"center"}}>{errMsg}（最大45秒お待ちください・途中で閉じないで）</div>}
      {openLog&&!isLoading&&state==="idle"&&<div style={{fontSize:11,color:openLog.isNightShift?"#818cf8":"#60a5fa",marginTop:6,textAlign:"center"}}>{openLog.isNightShift?"🌙 夜勤 ":""}出勤中: {timeStr(openLog.clockIn)} 〜</div>}
      {nightLongWarn&&(()=>{
        const h=nightLongWarn.workedH.toFixed(1);
        const proceed=()=>{const{coords,locName,note}=nightLongWarn;setNightLongWarn(null);startOutsource(["out",coords,openLog?.id,locName,note]);};
        const cancel=()=>{setNightLongWarn(null);setState("idle");setProgress(0);};
        return(
        <div onClick={(e)=>{if(e.target===e.currentTarget) cancel();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"2px solid #6366f1",borderRadius:12,padding:20,maxWidth:420,width:"100%"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#4f46e5",marginBottom:10}}>🌙 夜勤の退勤確認</div>
            <div style={{fontSize:13,color:"#374151",marginBottom:10,lineHeight:1.7}}>
              出勤（{timeStr(openLog?.clockIn)}）から <b style={{color:"#4f46e5",fontSize:16}}>約{h}時間</b> 経過しています。
            </div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:16,lineHeight:1.6}}>
              昨日の退勤打刻を押し忘れていませんか？いま押すと今の時刻で退勤が記録されます。打刻忘れの場合は「やめる」→ 正しい退勤時刻は管理者に修正を依頼してください。
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={cancel} style={{flex:1,background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>やめる</button>
              <button onClick={proceed} style={{flex:1,background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>今の時刻で退勤する</button>
            </div>
          </div>
        </div>
        );
      })()}
      {siteReg&&(()=>{
        const cancel=()=>{setSiteReg(null);setState("idle");setProgress(0);};
        const save=async()=>{
          const addr=(siteReg.address||"").trim();
          if(!addr){setSiteReg(s=>({...s,err:"住所を入力してください"}));return;}
          setSiteReg(s=>({...s,saving:true,err:""}));
          const ok=await onRegisterSite(addr, siteReg.coords);
          if(!ok){setSiteReg(s=>({...s,saving:false,err:"登録できませんでした。電波を確認してもう一度"}));return;}
          const {coords,locName,note}=siteReg;
          siteDoneRef.current=projectId;
          setSiteReg(null);
          doClick(coords,locName,note,true);   // 登録した位置＝今いる場所なので、離れている警告は出さない
        };
        const hasGps=!!parseCoords(siteReg.coords);
        return(
        <div onClick={(e)=>{if(e.target===e.currentTarget&&!siteReg.saving) cancel();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"2px solid #2563eb",borderRadius:12,padding:20,maxWidth:420,width:"100%"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#2563eb",marginBottom:10}}>📍 この現場の住所を登録（初回だけ）</div>
            <div style={{fontSize:12,color:"#374151",marginBottom:10,lineHeight:1.7}}>
              初めての現場です。<b>現場にいる今</b>の位置を、この現場の場所として登録します。<br/>
              ガソリン代・高速代など交通費の計算の基準になります。
            </div>
            <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>住所（違っていたら直してください）</div>
            <input type="text" value={siteReg.address} disabled={siteReg.saving}
              onChange={e=>setSiteReg(s=>({...s,address:e.target.value,err:""}))}
              placeholder={siteReg.loading?"現在地から住所を調べています…":"例：埼玉県八潮市大瀬1丁目"}
              style={{width:"100%",padding:"10px",fontSize:14,border:"1px solid #9ca3af",borderRadius:8,marginBottom:8}}/>
            <div style={{fontSize:11,color:hasGps?"#16a34a":"#b45309",marginBottom:10,lineHeight:1.6}}>
              {hasGps?"✓ 位置（GPS）も一緒に登録します":"⚠ 位置（GPS）が取れていません。住所から場所を出します。できれば番地まで入れてください"}
            </div>
            {siteReg.err&&<div style={{fontSize:12,color:"#ef4444",marginBottom:8}}>{siteReg.err}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={cancel} disabled={siteReg.saving} style={{flex:1,background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>やめる</button>
              <button onClick={save} disabled={siteReg.saving||!(siteReg.address||"").trim()} style={{flex:2,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",opacity:(siteReg.saving||!(siteReg.address||"").trim())?0.5:1}}>{siteReg.saving?"登録中…":"登録して退勤する"}</button>
            </div>
          </div>
        </div>
        );
      })()}
      {farWarn&&(()=>{
        const km=(farWarn.dist/1000).toFixed(1);
        const proceed=()=>{const{coords,locName,note}=farWarn;setFarWarn(null);doClick(coords,locName,note,true);};
        const cancel=()=>{setFarWarn(null);setState("idle");setProgress(0);};
        return(
        <div onClick={(e)=>{if(e.target===e.currentTarget) cancel();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"2px solid #ef4444",borderRadius:12,padding:20,maxWidth:420,width:"100%"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#ef4444",marginBottom:10}}>⚠️ 現場から離れています</div>
            <div style={{fontSize:13,color:"#374151",marginBottom:8,lineHeight:1.7}}>
              現在地が現場から <b style={{color:"#ef4444",fontSize:16}}>約{km}km</b> 離れています。
            </div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:10,lineHeight:1.6}}>
              退勤打刻は<b>現場を出る前</b>に押してください。帰宅途中や車内で打刻すると位置情報がズレて記録されます。
            </div>
            <div style={{fontSize:12,color:"#374151",marginBottom:16,lineHeight:1.6,background:"#f3f4f6",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 10px"}}>
              この打刻の位置は記録されます。残業・手当は現場の位置を基準に計算します。
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={cancel} style={{flex:1,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#000",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>現場に戻って押す</button>
              <button onClick={proceed} style={{flex:1,background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>このまま退勤</button>
            </div>
          </div>
        </div>
        );
      })()}
      {breakAsk&&(()=>{
        const go=(extra)=>{const{coords,locName,note}=breakAsk;setBreakAsk(null);startOutsource(["out",coords,openLog?.id,locName,note,"","",0,extra]);};
        const cancel=()=>{setBreakAsk(null);setState("idle");setProgress(0);};
        const okShort=breakAsk.min>0&&breakAsk.reason.trim();
        return(
        <div onClick={(e)=>{if(e.target===e.currentTarget) cancel();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"1px solid #2563eb",borderRadius:12,padding:20,maxWidth:420,width:"100%"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#1d4ed8",marginBottom:12}}>☕ 今日の休憩は取れましたか？</div>
            {breakAsk.step==="ask"&&(
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setBreakAsk(b=>({...b,step:"short"}))} style={{flex:1,padding:"14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fafafa",color:"#4b5563",fontSize:14,fontWeight:700,cursor:"pointer"}}>取れなかった</button>
                <button onClick={()=>go(null)} style={{flex:1,padding:"14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>取れた</button>
              </div>
            )}
            {breakAsk.step==="short"&&(<>
              <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>取れなかった時間</div>
              <select value={breakAsk.min} onChange={e=>setBreakAsk(b=>({...b,min:Number(e.target.value)}))}
                style={{width:"100%",padding:"10px",borderRadius:8,border:"1px solid #d1d5db",fontSize:14,marginBottom:12,background:"#fff"}}>
                {[10,20,30,40,50,60,70,80,90,100,110,120,130,140,150].map(m=><option key={m} value={m}>{m}分</option>)}
              </select>
              <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>何の作業で取れなかったか <span style={{color:"#ef4444"}}>*必須</span></div>
              <textarea value={breakAsk.reason} onChange={e=>setBreakAsk(b=>({...b,reason:e.target.value}))} rows={2}
                placeholder="例: 午後の休憩の時間に、元請の指示で配管の保温を急いで仕上げた"
                style={{width:"100%",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:8,padding:"10px",color:"#111827",fontSize:13,boxSizing:"border-box",marginBottom:6}}/>
              <div style={{fontSize:10,color:"#6b7280",marginBottom:12,lineHeight:1.5}}>取れなかった時間は、働いた時間として残業に入ります。</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setBreakAsk(b=>({...b,step:"ask"}))} style={{flex:1,background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>戻る</button>
                <button onClick={()=>okShort&&go({breakShortMin:breakAsk.min,breakShortReason:breakAsk.reason.trim()})} disabled={!okShort}
                  style={{flex:2,background:okShort?"linear-gradient(135deg,#2563eb,#1d4ed8)":"#e5e7eb",color:okShort?"#fff":"#9ca3af",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:okShort?"pointer":"not-allowed"}}>退勤する</button>
              </div>
            </>)}
          </div>
        </div>
        );
      })()}
      {earlyMode&&(()=>{
        const now=new Date();
        const earlyMins=17*60-(now.getHours()*60+now.getMinutes());
        const remainder=earlyMins%60;
        const earlyHours=remainder>=30?Math.ceil(earlyMins/60):Math.floor(earlyMins/60);
        const cats=[{id:"現場終了",icon:"🏗",label:"現場終了"},{id:"会社都合",icon:"📝",label:"会社都合"},{id:"本人都合",icon:"👤",label:"本人都合"}];
        // [2026-10-19] 現場終了はボタンで理由を選ぶ（その他は文章必須）。本人都合は「時間有給／欠勤」を本人が選ぶ
        const reasonOk = earlyLeaveCategory==="現場終了" ? (earlyPreset && (earlyPreset!=="その他" || earlyReasonText.trim())) : !!earlyReasonText.trim();
        const paidOk = earlyHours <= hourlyLeft;
        const canSubmit=earlyLeaveCategory&&reasonOk&&(earlyLeaveCategory!=="本人都合"||(earlyPay&&(earlyPay!=="paid_leave"||paidOk)));
        return(
        <div onClick={(e)=>{if(e.target===e.currentTarget) handleEarlyCancel();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"1px solid #f97316",borderRadius:12,padding:20,maxWidth:440,width:"100%"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f97316",marginBottom:6}}>⏰ 早上がり退勤</div>
            <div style={{fontSize:11,color:"#4b5563",marginBottom:14,lineHeight:1.5}}>
              16:00前の退勤です。カテゴリと理由を入力してください。
            </div>
            <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>カテゴリ</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {cats.map(c=>(
                <button key={c.id} onClick={()=>setEarlyLeaveCategory(c.id)}
                  style={{flex:1,padding:"10px 4px",borderRadius:8,border:earlyLeaveCategory===c.id?"2px solid #f97316":"1px solid #d1d5db",background:earlyLeaveCategory===c.id?"#2a1500":"#fafafa",color:earlyLeaveCategory===c.id?"#f97316":"#6b7280",fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.4}}>
                  <div style={{fontSize:16}}>{c.icon}</div>{c.label}
                </button>
              ))}
            </div>
            {earlyLeaveCategory&&(
              <div style={{background:"#f0fdf4",border:"1px solid #22c55e44",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#86efac"}}>
                早上がり時間：<b style={{fontSize:14,color:"#22c55e"}}>{earlyHours}時間</b>
              </div>
            )}
            {earlyLeaveCategory==="本人都合"&&(<>
              <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>早く上がる時間の扱い <span style={{color:"#ef4444"}}>*必須</span></div>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <button onClick={()=>paidOk&&setEarlyPay("paid_leave")} disabled={!paidOk}
                  style={{flex:1,padding:"10px 4px",borderRadius:8,border:earlyPay==="paid_leave"?"2px solid #f97316":"1px solid #d1d5db",background:earlyPay==="paid_leave"?"#fff7ed":"#fafafa",color:paidOk?"#111827":"#9ca3af",fontSize:12,fontWeight:700,cursor:paidOk?"pointer":"not-allowed",lineHeight:1.4}}>
                  時間有給を使う<div style={{fontSize:10,fontWeight:400,color:"#6b7280"}}>{earlyHours}時間（残り {hourlyLeft}時間）</div>
                </button>
                <button onClick={()=>setEarlyPay("absence")}
                  style={{flex:1,padding:"10px 4px",borderRadius:8,border:earlyPay==="absence"?"2px solid #f97316":"1px solid #d1d5db",background:earlyPay==="absence"?"#fff7ed":"#fafafa",color:"#111827",fontSize:12,fontWeight:700,cursor:"pointer",lineHeight:1.4}}>
                  欠勤にする<div style={{fontSize:10,fontWeight:400,color:"#6b7280"}}>早く上がった分を給料から引く</div>
                </button>
              </div>
              {!paidOk&&<div style={{fontSize:10,color:"#ef4444",marginBottom:10}}>時間有給の残りが足りません（1年に35時間まで）</div>}
            </>)}
            {earlyLeaveCategory==="現場終了"&&(<>
              <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>早く終わった理由 <span style={{color:"#ef4444"}}>*必須</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {EARLY_PRESETS.map(r=>(
                  <button key={r} onClick={()=>setEarlyPreset(r)}
                    style={{padding:"8px 10px",borderRadius:8,border:earlyPreset===r?"2px solid #16a34a":"1px solid #d1d5db",background:earlyPreset===r?"#f0fdf4":"#fafafa",color:"#111827",fontSize:12,fontWeight:700,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
            </>)}
            {earlyLeaveCategory&&(<>
            <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>
              {earlyLeaveCategory==="現場終了" ? <>くわしく{earlyPreset==="その他"?<span style={{color:"#ef4444"}}> *必須</span>:<span style={{color:"#9ca3af",fontWeight:400}}>（あれば）</span>}</> : <>理由 <span style={{color:"#ef4444"}}>*必須</span></>}
            </div>
            <textarea
              value={earlyReasonText}
              onChange={e=>setEarlyReasonText(e.target.value)}
              placeholder={earlyLeaveCategory==="現場終了"?"例: 次の作業は〇日から / 元請の〇〇さんの指示":earlyLeaveCategory==="本人都合"?"例: 病院の受診のため":"例: 会社の用事のため"}
              rows={2}
              style={{width:"100%",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:8,padding:"10px",color:"#111827",fontSize:13,resize:"vertical",boxSizing:"border-box"}}
            />
            </>)}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={handleEarlyCancel} style={{flex:1,background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>キャンセル</button>
              <button onClick={handleEarlySubmit} disabled={!canSubmit} style={{flex:2,background:canSubmit?"linear-gradient(135deg,#f97316,#ef4444)":"#e5e7eb",color:canSubmit?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed"}}>退勤する</button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* [2026-05-14] 退勤時 外注入力モーダル */}
      {outsourceMode&&(()=>{
        const supportAmt = SUPPORT_UNIT_PRICE * (Number(osCount)||0);
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"1px solid #a78bfa",borderRadius:12,padding:20,maxWidth:440,width:"100%"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#a78bfa",marginBottom:14}}>🤝 外注情報の入力</div>

            {osStep==="ask"&&(<>
              <div style={{fontSize:14,color:"#111827",marginBottom:18,textAlign:"center",lineHeight:1.6}}>今日、外注は入りましたか？</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>finishOut(null)} style={{flex:1,padding:"14px",borderRadius:8,border:"1px solid #d1d5db",background:"#fafafa",color:"#4b5563",fontSize:14,fontWeight:700,cursor:"pointer"}}>いいえ</button>
                <button onClick={()=>setOsStep("type")} style={{flex:1,padding:"14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#a78bfa,#6366f1)",color:"#000",fontSize:14,fontWeight:700,cursor:"pointer"}}>はい</button>
              </div>
            </>)}

            {osStep==="type"&&(<>
              <div style={{fontSize:12,color:"#374151",marginBottom:8,fontWeight:600}}>外注の種別</div>
              <div style={{display:"flex",gap:10,marginBottom:16}}>
                {[{id:"support",label:"応援",desc:"人数のみ記録"},{id:"subcontract",label:"請負",desc:"人数のみ記録"}].map(t=>(
                  <button key={t.id} onClick={()=>{setOsType(t.id);setOsStep("count");}} style={{flex:1,padding:"16px 8px",borderRadius:8,border:osType===t.id?"2px solid #a78bfa":"1px solid #d1d5db",background:osType===t.id?"#f5f3ff":"#fafafa",color:"#111827",fontSize:14,fontWeight:700,cursor:"pointer",lineHeight:1.5}}>
                    {t.label}<div style={{fontSize:10,color:"#6b7280",fontWeight:400,marginTop:4}}>{t.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={()=>setOsStep("ask")} style={{width:"100%",padding:"10px",borderRadius:8,border:"1px solid #d1d5db",background:"transparent",color:"#6b7280",fontSize:12,cursor:"pointer"}}>← 戻る</button>
            </>)}

            {osStep==="count"&&(<>
              <div style={{fontSize:12,color:"#374151",marginBottom:6,fontWeight:600}}>{osType==="support"?"応援":"請負"}　人数</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:14}}>
                <button onClick={()=>setOsCount(c=>Math.max(1,(Number(c)||1)-1))} style={{width:44,height:44,borderRadius:8,border:"1px solid #d1d5db",background:"#fafafa",color:"#a78bfa",fontSize:20,fontWeight:700,cursor:"pointer"}}>−</button>
                <input type="number" value={osCount} min={1} max={20} onChange={e=>{const v=Math.floor(Number(e.target.value)||1);setOsCount(Math.min(20,Math.max(1,v)));}} style={{width:80,textAlign:"center",fontSize:22,fontWeight:700,padding:"8px",borderRadius:8,border:"1px solid #d1d5db",background:"#e5e7eb",color:"#111827"}}/>
                <span style={{fontSize:14,color:"#6b7280"}}>人</span>
                <button onClick={()=>setOsCount(c=>Math.min(20,(Number(c)||1)+1))} style={{width:44,height:44,borderRadius:8,border:"1px solid #d1d5db",background:"#fafafa",color:"#a78bfa",fontSize:20,fontWeight:700,cursor:"pointer"}}>＋</button>
              </div>
              {/* [2026-06-28] ユーザー側は金額を一切表示しない（人数のみ）。金額は管理者側で確認 */}
              {osType==="support"
                ? <div style={{background:"#f0fdf4",border:"1px solid #22c55e44",borderRadius:8,padding:"10px 14px",marginBottom:16,textAlign:"center"}}>
                    <span style={{fontSize:11,color:"#6b7280"}}>応援</span>
                    <div style={{fontSize:20,fontWeight:700,color:"#22c55e"}}>{osCount}人</div>
                  </div>
                : <div style={{background:"#fef3c7",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:11,color:"#f59e0b",textAlign:"center"}}>請負　{osCount}人（金額は管理者が入力します）</div>
              }
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setOsStep("type")} style={{flex:1,padding:"13px",borderRadius:8,border:"1px solid #d1d5db",background:"transparent",color:"#6b7280",fontSize:13,cursor:"pointer"}}>← 戻る</button>
                <button onClick={()=>finishOut({type:osType,count:Number(osCount)||1,amount:osType==="support"?supportAmt:null})} style={{flex:2,padding:"13px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#a78bfa,#6366f1)",color:"#000",fontSize:14,fontWeight:700,cursor:"pointer"}}>確定して退勤</button>
              </div>
            </>)}
          </div>
        </div>
        );
      })()}
      {failModal&&(
        <div onClick={(e)=>{if(e.target===e.currentTarget){setFailModal(false);setDeniedMode(false);}}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fafafa",border:"1px solid #ef4444",borderRadius:12,padding:20,maxWidth:440,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:10}}>
              {deniedMode?"⚠ 位置情報がブロックされています":"⚠ GPSが取得できませんでした"}
            </div>
            {deniedMode?(
              <div style={{fontSize:12,color:"#374151",marginBottom:14,lineHeight:1.7}}>
                このブラウザで位置情報が<b style={{color:"#ef4444"}}>拒否</b>されています。<br/>
                一度「許可しない」を選ぶと、アプリ側から許可ダイアログを再表示できません。下記の手順で設定を変更してください。
                <div style={{background:"#2a1a0f",border:"1px solid #f59e0b66",borderRadius:6,padding:"8px 10px",marginTop:10,fontSize:11,color:"#fbbf24",lineHeight:1.6,fontWeight:700}}>
                  ⚡ 重要：設定を変更したあと、必ず<b style={{color:"#fff"}}>ページを更新（リロード）</b>してから再試行してください。更新しないと反映されません。
                </div>
                <div style={{background:"#e5e7eb",border:"1px solid #d1d5db",borderRadius:6,padding:"10px 12px",marginTop:8,fontSize:11,color:"#374151",lineHeight:1.6}}>
                  <div style={{color:"#60a5fa",fontWeight:700,marginBottom:4,fontSize:12}}>📱 iPhone（Safari）</div>
                  ①「設定」アプリ → <b>プライバシーとセキュリティ</b><br/>
                  ②「位置情報サービス」→ ON を確認<br/>
                  ③ 下へスクロール →「<b>Safari Webサイト</b>」<br/>
                  ④「このAppの使用中のみ許可」または「次回確認」に変更<br/>
                  ⑤ <b style={{color:"#fbbf24"}}>このページに戻ってページを更新（上から下へ引っぱる or アドレスバーの⟳）</b><br/>
                  ⑥ 「再試行」ボタンを押す
                </div>
                <div style={{background:"#e5e7eb",border:"1px solid #d1d5db",borderRadius:6,padding:"10px 12px",marginTop:6,fontSize:11,color:"#374151",lineHeight:1.6}}>
                  <div style={{color:"#22c55e",fontWeight:700,marginBottom:4,fontSize:12}}>📱 Android（Chrome）</div>
                  ① 画面上のアドレスバー左の「<b>🔒</b>」または「<b>ⓘ</b>」をタップ<br/>
                  ②「権限」または「サイトの設定」→「<b>位置情報</b>」<br/>
                  ③「許可」に変更<br/>
                  ④ <b style={{color:"#fbbf24"}}>ページを更新（上から下へ引っぱる or メニューの⟳）</b><br/>
                  ⑤ 「再試行」ボタンを押す
                </div>
                <div style={{marginTop:10,color:"#f59e0b",fontSize:11,lineHeight:1.5}}>
                  ※ どうしても設定変更できない場合は、下の欄に理由を書いて「理由付きで打刻」してください。
                </div>
              </div>
            ):(
              <div style={{fontSize:12,color:"#4b5563",marginBottom:14,lineHeight:1.6}}>
                位置情報を残せませんでした。<br/>
                取れない理由を入力してください（屋内のため・地下のため等）。
              </div>
            )}
            <textarea value={reasonText} onChange={e=>setReasonText(e.target.value)} placeholder={deniedMode?"設定変更できない場合の理由（例: 会社支給端末で変更不可）":"例: 地下駐車場のため、ビル内のため"} rows={deniedMode?2:3} style={{width:"100%",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",color:"#111827",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"'Noto Sans JP',sans-serif",marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleRetry} style={{flex:1,background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa66",borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔄 再試行</button>
              <button onClick={handleReasonSubmit} disabled={!reasonText.trim()} style={{flex:2,background:reasonText.trim()?"linear-gradient(135deg,#f97316,#ef4444)":"#e5e7eb",color:reasonText.trim()?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:reasonText.trim()?"pointer":"not-allowed"}}>理由付きで打刻</button>
            </div>
            <button onClick={()=>{setFailModal(false);setDeniedMode(false);setReasonText("");}} style={{width:"100%",background:"transparent",color:"#111827",border:"none",borderRadius:8,padding:"8px",fontSize:11,cursor:"pointer",marginTop:6}}>キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}

// [2026-06-28] 予算消化＝人工消化率（実績人工 ÷ 目標人工 × 100）。
//   原価カテゴリ別の構成比（旧表示）は金額露出になるため廃止。金額は管理者画面のみ。
// [2026-09-29] 物差しを管理画面と1本にそろえた：
//   目標人工 = 管理画面が保存した target_mandays（＝請負額 ÷ 目標単価）。外注費の差し引きは廃止（管理画面の判定と同じ）
//   実績人工 = 自社打刻＋補正人工＋応援人数（shared.js calcUsedMandays）。金額・判定はスタッフには出さない
const NINKU_RATE = 62000; // [2026-09-29] 65000→62000。会社の目標単価（target_mandays 未保存の古い案件だけの予備）
function calcTargetMandays(project) {
  if (Number(project.targetMandays) > 0) return Number(project.targetMandays);
  const rate = Number(project.ninkuRate) || NINKU_RATE;
  return (project.contractAmount || 0) / rate;
}
// [2026-09-29] 赤字ライン人工 = 目標人工 × 目標単価 ÷ 損益分岐単価（どちらも管理画面の設定タブの値。shared.js getNinkuRates）
function calcBreakevenMandays(project, settings) {
  const target = calcTargetMandays(project);
  if (target <= 0) return 0;
  const { targetRate, breakevenRate } = getNinkuRates(project, settings);
  return Math.round(target * targetRate / breakevenRate * 10) / 10;
}
function BudgetSummary({ project, clockLogs, settings }) {
  const target = calcTargetMandays(project);
  if (target <= 0) return null;
  const breakeven = calcBreakevenMandays(project, settings);
  const actual = calcUsedMandays(clockLogs, project).usedMandays;
  // 予算消化率 = 実績人工 ÷ 目標人工 × 100
  const pct = Math.round(actual/target*100);
  const isOver = pct>100;
  const barColor = isOver ? "#ef4444" : pct>=80 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px",marginTop:12}}>
      <div style={{fontSize:10,color:"#22c55e",letterSpacing:"0.1em",marginBottom:12}}>■ 進捗</div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>目標人工</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:700,color:isOver?"#ef4444":"#f97316"}}>{actual}/{target.toFixed(1)}人工 <span style={{fontSize:12,color:"#6b7280"}}>({pct}%)</span></div>
        {breakeven>0&&<div style={{fontSize:11,color:"#ef4444",marginTop:4}}>赤字ライン {breakeven}人工{actual>breakeven?"（超過）":`（あと${Math.round((breakeven-actual)*10)/10}人工）`}</div>}
      </div>
      <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>予算消化</div>
      <div style={{display:"flex",background:"#e5e7eb",borderRadius:6,height:24,overflow:"hidden",border:"1px solid #e5e7eb"}}>
        <div style={{width:`${Math.min(pct,100)}%`,background:barColor,height:"100%",transition:"width 0.3s"}}/>
      </div>
      <div style={{marginTop:8,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:barColor,fontWeight:700}}>人工 {pct}%</span>
        {isOver&&<span style={{color:"#ef4444",fontWeight:700}}>オーバー</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// [2026-09-05] 社内研修① — 設問→回答→ポイント の順送り
//   ・未回答の問題は飛ばせない（進捗バーはタップ不可の表示専用）
//   ・入力は800ms止まったら自動保存（confirmed=false）。電波が切れても打ち直しにならない
//   ・解説がある問題は最下部まで読まないと次へ進めない
//   ・Q1-2 と Q8-1〜8-4 は解説なし。保存後に一言だけ返して次へ
// ══════════════════════════════════════════════════════════════
const TRAINING_MIN_DEFAULT = 20;

function TrainingFlow({ data, onReload, onExit, canExit, showToast, onCompleted }) {
  const qs = data.questions;
  const total = qs.length;

  // 再開位置 = 最初の未確定問題。全部確定済みなら教材画面へ
  const firstUnconfirmed = React.useMemo(() => {
    for (let i = 0; i < qs.length; i++) {
      const r = data.responses.find(x => x.questionId === qs[i].id);
      if (!r || !r.confirmed) return i;
    }
    return -1;
  }, [qs, data.responses]);

  const [stage, setStage] = useState(() => {
    if (data.completedAt || firstUnconfirmed === -1) return "done";
    if (firstUnconfirmed === 0) return "intro";
    // 途中再開。セクションの1問目で止まっていたら、そのセクションの導入から見せる
    const q0 = qs[firstUnconfirmed];
    return (q0 && q0.sectionIntro) ? "sectionIntro" : "q";
  });
  const [idx, setIdx] = useState(Math.max(firstUnconfirmed, 0));
  const [draft, setDraft] = useState(() => {
    const q = qs[Math.max(firstUnconfirmed, 0)];
    const r = q && data.responses.find(x => x.questionId === q.id);
    return r ? r.answer : "";
  });
  const [saving, setSaving] = useState(false);
  const [readEnd, setReadEnd] = useState(false);
  const pointRef = useRef(null);
  const timerRef = useRef(null);

  const q = qs[idx];
  // [2026-09-20] 試写モードの人は文字数制限なし（空欄でも次へ進める）
  const minChars = data.preview ? 0 : ((q && q.minChars) || TRAINING_MIN_DEFAULT);
  const len = draft.trim().length;
  const ok = len >= minChars;
  const hasPoint = !!(q && q.explanation);

  // 自動保存：入力が800ms止まったら下書きとして保存する
  useEffect(() => {
    if (stage !== "q" || !q) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      saveTrainingResponse(q.id, draft, false);
    }, 800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [draft, stage, q && q.id]);

  // セクションの1問目に入る時は、設問より先に導入を1枚はさむ（Q9のみ設定されている）
  const goQuestion = (i) => {
    const nq = qs[i];
    const r = nq && data.responses.find(x => x.questionId === nq.id);
    setIdx(i);
    setDraft(r ? r.answer : "");
    setReadEnd(false);
    setStage(nq && nq.sectionIntro ? "sectionIntro" : "q");
  };

  const confirm = async () => {
    if (!ok || saving) return;
    // [2026-09-20] 待機中の自動保存を止める。止めないと確定の直後に下書き保存(confirmed=false)が
    //   走って確定を上書きし、全問答えても「完了の記録に失敗しました」になる。
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setSaving(true);
    const done = await saveTrainingResponse(q.id, draft, true);
    setSaving(false);
    if (!done) { showToast(WRITE_ERROR_MSG); return; }
    await onReload();
    setStage("saved");
  };

  const next = async () => {
    if (idx + 1 < total) { goQuestion(idx + 1); return; }
    const done = await completeTraining(data.training.id);
    if (!done) { showToast("完了の記録に失敗しました"); return; }
    if (onCompleted) onCompleted();   // 再読込で completedAt が入っても画面を閉じさせない（教材と締めを読ませる）
    await onReload();
    setStage("done");
  };

  // 解説を最下部まで読んだかどうか（端末差を吸収するため24pxの余裕をみる）
  const onPointScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadEnd(true);
  };
  useEffect(() => {
    if (stage !== "point") return;
    const el = pointRef.current;
    // 解説が短くてスクロールが発生しない場合は最初から有効にする
    if (el && el.scrollHeight <= el.clientHeight + 24) setReadEnd(true);
  }, [stage, idx]);

  const S = {
    wrap: { position:"fixed", inset:0, background:"#e5e7eb", zIndex:9000, display:"flex", flexDirection:"column" },
    body: { flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" },
    pad:  { padding:16, display:"flex", flexDirection:"column", gap:10 },
    card: { background:"#fafafa", border:"1px solid #d1d5db", borderRadius:12, padding:16 },
    btn:  (on) => ({ width:"100%", minHeight:52, border:"none", borderRadius:8, padding:14,
                     fontSize:15, fontWeight:700, cursor:on?"pointer":"not-allowed",
                     background:on?"#2563eb":"#e5e7eb", color:on?"#ffffff":"#9ca3af" }),
    link: { width:"100%", background:"transparent", border:"none", color:"#9ca3af",
            fontSize:12, textDecoration:"underline", cursor:"pointer", padding:12 },
    tag:  { display:"inline-block", fontSize:11, fontWeight:700, color:"#2563eb",
            background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:5, padding:"3px 9px", marginBottom:10 },
  };

  const Progress = ({ n }) => (
    // 表示専用。タップしても移動しない（飛ばし回答を防ぐため）
    <div style={{background:"#ffffff",borderBottom:"1px solid #d1d5db",padding:"10px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7280",marginBottom:6}}>
        <span>{n} / {total}</span><span>残り{Math.max(total-n,0)}問</span>
      </div>
      <div style={{height:5,background:"#e5e7eb",borderRadius:999,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(n/total)*100}%`,background:"#2563eb",borderRadius:999}}/>
      </div>
    </div>
  );

  // ── 導入 ──
  if (stage === "intro") return (
    <div style={S.wrap}><div style={S.body}><div style={S.pad}>
      <div style={S.card}>
        <div style={S.tag}>社内研修①</div>
        <div style={{fontSize:19,fontWeight:700,lineHeight:1.6,marginBottom:14}}>考えることが出来る職人になる</div>
        <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap"}}>{data.training.intro}</div>
        <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #d1d5db",fontSize:13,color:"#6b7280",lineHeight:1.9}}>
          締切：{fmtTrainingDeadline(data.training.deadline)}
        </div>
        <div style={{marginTop:14,fontSize:13,textAlign:"right"}}>勝間</div>
      </div>
      <button style={S.btn(true)} onClick={()=>goQuestion(0)}>研修を始める</button>
      {canExit && <button style={S.link} onClick={onExit}>あとで書く（{remainUntil(data.training.deadline)}）</button>}
    </div></div></div>
  );

  // ── セクション導入（Q9の前に1枚だけ） ──
  if (stage === "sectionIntro" && q) return (
    <div style={S.wrap}>
      <Progress n={idx+1}/>
      <div style={S.body}><div style={S.pad}>
        <div style={{...S.card,background:"#eff6ff",borderColor:"#bfdbfe"}}>
          <div style={S.tag}>{q.section}</div>
          <div style={{fontSize:15,lineHeight:2.1,color:"#1e3a8a",whiteSpace:"pre-wrap"}}>{q.sectionIntro}</div>
        </div>
        <button style={S.btn(true)} onClick={()=>setStage("q")}>読みました。次へ進む</button>
        {canExit && <button style={S.link} onClick={onExit}>あとで書く（{remainUntil(data.training.deadline)}）</button>}
      </div></div>
    </div>
  );

  // ── 設問 ──
  if (stage === "q" && q) return (
    <div style={S.wrap}>
      <Progress n={idx+1}/>
      <div style={S.body}><div style={S.pad}>
        <div style={S.card}>
          <div style={S.tag}>{q.section}</div>
          <div style={{fontSize:16,fontWeight:700,lineHeight:1.7,marginBottom:6}}>{q.text}</div>
          {q.note && <div style={{fontSize:12,color:"#6b7280",lineHeight:1.8,marginBottom:12}}>※{q.note}</div>}
          <textarea value={draft} rows={5} onChange={e=>setDraft(e.target.value)}
            placeholder="ここに入力してください"
            style={{...IS,fontSize:16,padding:"11px 12px",lineHeight:1.75,resize:"vertical",minHeight:112,
                    borderColor:ok?"#d1d5db":"#f59e0b66"}}/>
          <div style={{fontSize:11,textAlign:"right",marginTop:5,color:ok?"#22c55e":"#f59e0b"}}>
            {ok ? `${len}文字 ✓` : `${len} / ${minChars}文字（あと${minChars-len}文字）`}
          </div>
        </div>
        <button style={S.btn(ok&&!saving)} disabled={!ok||saving} onClick={confirm}>
          {saving ? "保存中…" : (ok ? "次へ" : `あと${minChars-len}文字`)}
        </button>
        {canExit && <button style={S.link} onClick={onExit}>あとで書く（{remainUntil(data.training.deadline)}）</button>}
      </div></div>
    </div>
  );

  // ── 保存直後 ──
  if (stage === "saved" && q) return (
    <div style={S.wrap}>
      <Progress n={idx+1}/>
      <div style={S.body}><div style={S.pad}>
        <div style={{...S.card,background:"#f0fdf4",borderColor:"#22c55e44",textAlign:"center"}}>
          <div style={{fontSize:30,lineHeight:1,marginBottom:10}}>✓</div>
          <div style={{fontSize:16,fontWeight:700,color:"#15803d",marginBottom:6}}>あなたの回答を保存しました</div>
          {!data.pastDeadline && <div style={{fontSize:12,color:"#6b7280",lineHeight:1.8}}>締切までは何度でも書き直せます</div>}
        </div>
        {!hasPoint && (
          <>
            <div style={{...S.card,padding:14}}>
              <div style={{fontSize:11,color:"#6b7280",marginBottom:7}}>{q.code} {q.text}</div>
              <div style={{background:"#e5e7eb",borderRadius:8,padding:"11px 12px",fontSize:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap"}}>{draft}</div>
            </div>
            <div style={{...S.card,background:"#eff6ff",borderColor:"#bfdbfe"}}>
              <div style={{fontSize:14,lineHeight:2,color:"#1e3a8a",whiteSpace:"pre-wrap"}}>{q.noAnswerMsg}</div>
            </div>
          </>
        )}
        <button style={S.btn(true)} onClick={()=>{ if(hasPoint){setReadEnd(false);setStage("point");} else next(); }}>
          {hasPoint ? "ポイントを見る →" : (idx+1<total ? "次の問題へ →" : "研修を終える →")}
        </button>
      </div></div>
    </div>
  );

  // ── ポイント（解説） ──
  if (stage === "point" && q) return (
    <div style={S.wrap}>
      <Progress n={idx+1}/>
      <div style={S.body} ref={pointRef} onScroll={onPointScroll}><div style={S.pad}>
        <div style={{...S.card,padding:14}}>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:7}}>あなたの回答</div>
          <div style={{background:"#e5e7eb",borderRadius:8,padding:"11px 12px",fontSize:14,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap"}}>{draft}</div>
        </div>
        <div style={S.card}>
          <div style={S.tag}>ポイント</div>
          <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap"}}>{q.explanation}</div>
        </div>
        <button style={S.btn(readEnd)} disabled={!readEnd} onClick={next}>
          {readEnd ? (idx+1<total ? "次の問題へ →" : "研修を終える →") : "最後まで読むと押せます"}
        </button>
      </div></div>
    </div>
  );

  return <TrainingOutro data={data} onExit={onExit}/>;
}

// ── 締切の表示ヘルパー ───────────────────────────────
// [2026-10-09] 人工の目安表（川畑さん専用タブ）
//   1人1日でどれだけ進むかを、やりやすい／ふつう／やりにくい の3つで入れる。
//   保存は区分ごとの「保存」ボタンだけ（勝手に保存しない）。空欄は「わからない」の意味で null 保存。
function parseNinkuNum(s) {
  const t = String(s ?? "").trim().replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  if (t === "") return { ok: true, v: null };
  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false };
  const v = Number(t);
  return v <= 10000 ? { ok: true, v } : { ok: false };
}
// [2026-10-09 v241] ％（小さいサイズ・大きいサイズで、まん中より何%進むか）。+20 / −30 / 20% など。−100〜500
function parseNinkuPct(s) {
  const t = String(s ?? "").trim()
    .replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[−－ー―‐]/g, "-").replace(/[＋]/g, "+").replace(/[%％]/g, "").replace(/\s/g, "");
  if (t === "") return { ok: true, v: null };
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return { ok: false };
  const v = Number(t);
  return (v >= -100 && v <= 500) ? { ok: true, v } : { ok: false };
}
// サイズの幅があるか（幅がある行だけ％を聞く）と、まん中のサイズの目安
function ninkuHasRange(size) { return /〜|以下|以上|超/.test(size || ""); }
const NINKU_MID = { "20〜80A":"50A", "100〜200A":"150A", "250A以上":"300A", "50A以下":"40A", "65〜100A":"80A", "125〜200A":"150A",
  "150φ以下":"150φ", "200φ以上":"250φ", "500角以下":"400角", "900角以下":"700角", "1200角以下":"1000角",
  "400φ以下":"300φ", "400〜800φ":"600φ", "800φ超":"900φ", "8番以下":"6番", "8番超":"10番",
  "80A相当以下":"50A相当", "80A相当超":"100A相当", "40A以下":"25A" };
function WorkloadInput({ showToast }) {
  const [rows, setRows] = useState(null);      // null=読み込み中 / [] / 配列
  const [err, setErr] = useState("");
  const [vals, setVals] = useState({});        // id -> {normal, small, large}（入力中の文字）
  const [dirty, setDirty] = useState({});      // grp -> true（未保存あり）
  const [savingGrp, setSavingGrp] = useState("");
  const [savedMsg, setSavedMsg] = useState({}); // grp -> "✓ 10/9 12:00 保存"
  const [memo, setMemo] = useState("");          // [2026-10-09] 最後の補足欄（wn-preset-memo の notes）
  const toStr = v => (v === null || v === undefined) ? "" : String(v);

  const load = async () => {
    setErr("");
    const r = await loadWorkloadInput();
    if (!r) { setErr(getLastApiError() || "読み込みに失敗しました"); setRows([]); return; }
    setRows(r);
    const v = {};
    r.forEach(x => { v[x.id] = { normal: toStr(x.normal), small: toStr(x.small), large: toStr(x.large) }; });
    setVals(v); setDirty({});
    setMemo((r.find(x => x.id === "wn-preset-memo") || {}).notes || "");
  };
  useEffect(() => { load(); }, []);

  if (rows === null) return <div style={{padding:24,textAlign:"center",color:"#6b7280",fontSize:13}}>読み込み中...</div>;
  if (err) return (
    <div style={{padding:24,textAlign:"center",color:"#ef4444",fontSize:13}}>
      {err}<br/>
      <button onClick={load} style={{marginTop:12,padding:"8px 18px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",fontSize:13}}>もう一度読み込む</button>
    </div>
  );

  const groups = [];
  const memoRow = rows.find(x => x.id === "wn-preset-memo");
  rows.filter(x => x.id !== "wn-preset-memo").forEach(x => { let g = groups.find(g => g.name === x.grp); if (!g) { g = { name: x.grp, items: [] }; groups.push(g); } g.items.push(x); });

  const setVal = (row, key, s) => {
    setVals(p => ({ ...p, [row.id]: { ...p[row.id], [key]: s } }));
    setDirty(p => ({ ...p, [row.grp]: true }));
  };
  const badCell = (id, key) => !(key === "normal" ? parseNinkuNum(vals[id]?.[key]) : parseNinkuPct(vals[id]?.[key])).ok;

  const saveGroup = async (g) => {
    const items = [];
    for (const x of g.items) {
      const n = parseNinkuNum(vals[x.id]?.normal), sm = parseNinkuPct(vals[x.id]?.small), lg = parseNinkuPct(vals[x.id]?.large);
      if (!n.ok || !sm.ok || !lg.ok) { showToast("赤い欄を直してください（数量は 30・4.5、％は +20・−30 など）"); return; }
      items.push({ id: x.id, normal: n.v, small: sm.v, large: lg.v });
    }
    setSavingGrp(g.name);
    const res = await saveWorkloadInput(items);
    setSavingGrp("");
    if (!res?.ok) { showToast("⚠ 保存できませんでした：" + (getLastApiError() || "通信を確認してください")); return; }
    setDirty(p => ({ ...p, [g.name]: false }));
    const d = new Date();
    setSavedMsg(p => ({ ...p, [g.name]: `✓ ${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")} 保存（${res.saved}件）` }));
    showToast(`✓ ${g.name} ${res.saved}件を保存しました`);
  };

  const saveMemo = async () => {
    if (memo.length > 2000) { showToast("補足は2000文字までにしてください"); return; }
    setSavingGrp("補足");
    const res = await saveWorkloadInput([{ id: "wn-preset-memo", normal: null, small: null, large: null, memo }]);
    setSavingGrp("");
    if (!res?.ok) { showToast("⚠ 保存できませんでした：" + (getLastApiError() || "通信を確認してください")); return; }
    setDirty(p => ({ ...p, "補足": false }));
    const d = new Date();
    setSavedMsg(p => ({ ...p, "補足": `✓ ${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")} 保存` }));
    showToast("✓ 補足を保存しました");
  };

  const anyDirty = Object.values(dirty).some(Boolean);
  const IN = bad => ({ width:"100%", boxSizing:"border-box", padding:"8px 4px", fontSize:16, textAlign:"center",
    border:`1px solid ${bad?"#ef4444":"#d1d5db"}`, borderRadius:6, background: bad?"#fef2f2":"#fffbeb" });
  return (
    <div style={{padding:"12px 12px 80px"}}>
      <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:13,lineHeight:1.8,color:"#374151"}}>
        サイズの<b>まん中くらい</b>（例：20〜80Aなら50A）で、<b>1人で1日やったら、どれくらい進むか</b>を入れてください。<br/>
        <b>小さいサイズ・大きいサイズ</b>は、まん中より<b>何%進むか</b>を入れてください（多く進むなら＋、進まないなら−。例：+20、−30）。<br/>
        <b>区分ごとに一番下の「保存」を押してください。</b>押さないと残りません。
      </div>
      {anyDirty && <div style={{background:"#fef3c7",color:"#92400e",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,fontWeight:700}}>
        未保存の区分があります：{[...groups.map(g=>g.name),"補足"].filter(n=>dirty[n]).join("、")}
      </div>}
      {groups.map(g => (
        <div key={g.name} style={{background:"#fff",borderRadius:10,padding:"12px 10px",marginBottom:14,border: dirty[g.name] ? "2px solid #f59e0b" : "1px solid #e5e7eb"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>{g.name}</div>
            <div style={{fontSize:11,color: dirty[g.name] ? "#d97706" : "#059669"}}>{dirty[g.name] ? "未保存" : (savedMsg[g.name] || "")}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 58px 58px 58px",gap:6,fontSize:10,color:"#6b7280",marginBottom:4}}>
            <div></div><div style={{textAlign:"center"}}>まん中の<br/>数量</div><div style={{textAlign:"center"}}>小さい<br/>サイズ%</div><div style={{textAlign:"center"}}>大きい<br/>サイズ%</div>
          </div>
          {g.items.map(x => (
            <div key={x.id} style={{display:"grid",gridTemplateColumns:"1fr 58px 58px 58px",gap:6,alignItems:"center",padding:"6px 0",borderTop:"1px solid #f3f4f6"}}>
              <div style={{fontSize:12,color:"#111827",lineHeight:1.4}}>
                {x.category}{x.sizeSpec ? <span style={{fontWeight:700}}>　{x.sizeSpec}</span> : null}
                <div style={{fontSize:10,color:"#6b7280"}}>単位：{x.unit}{NINKU_MID[x.sizeSpec] ? `　まん中：${NINKU_MID[x.sizeSpec]}` : ""}{x.notes ? `　${x.notes}` : ""}</div>
              </div>
              {["normal","small","large"].map(k => (k !== "normal" && !ninkuHasRange(x.sizeSpec))
                ? <div key={k} style={{textAlign:"center",color:"#d1d5db",fontSize:12}}>—</div>
                : <input key={k} type="text" inputMode={k === "normal" ? "decimal" : "text"} value={vals[x.id]?.[k] ?? ""}
                    placeholder={k === "normal" ? "" : "±%"}
                    onChange={e=>setVal(x, k, e.target.value)} style={IN(badCell(x.id,k))}/>
              )}
            </div>
          ))}
          <button disabled={!!savingGrp} onClick={()=>saveGroup(g)}
            style={{marginTop:10,width:"100%",padding:"12px",borderRadius:8,border:"none",fontSize:14,fontWeight:700,
              background: savingGrp===g.name ? "#9ca3af" : (dirty[g.name] ? "#f59e0b" : "#10b981"), color:"#fff"}}>
            {savingGrp===g.name ? "保存中..." : `「${g.name}」を保存`}
          </button>
        </div>
      ))}
      {memoRow && (
        <div style={{background:"#fff",borderRadius:10,padding:"12px 10px",marginBottom:14,border: dirty["補足"] ? "2px solid #f59e0b" : "1px solid #e5e7eb"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>補足</div>
            <div style={{fontSize:11,color: dirty["補足"] ? "#d97706" : "#059669"}}>{dirty["補足"] ? "未保存" : (savedMsg["補足"] || "")}</div>
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>表にない工事や、気づいたことを自由に書いてください。</div>
          <textarea value={memo} onChange={e=>{ setMemo(e.target.value); setDirty(p=>({ ...p, "補足": true })); }} rows={6}
            style={{width:"100%",boxSizing:"border-box",padding:"10px",fontSize:16,lineHeight:1.6,border:"1px solid #d1d5db",borderRadius:6,background:"#fffbeb",fontFamily:"inherit"}}/>
          <button disabled={!!savingGrp} onClick={saveMemo}
            style={{marginTop:10,width:"100%",padding:"12px",borderRadius:8,border:"none",fontSize:14,fontWeight:700,
              background: savingGrp==="補足" ? "#9ca3af" : (dirty["補足"] ? "#f59e0b" : "#10b981"), color:"#fff"}}>
            {savingGrp==="補足" ? "保存中..." : "「補足」を保存"}
          </button>
        </div>
      )}
    </div>
  );
}

function fmtTrainingDeadline(iso) {
  if (!iso) return "期限なし";
  const d = new Date(iso);
  const w = ["日","月","火","水","木","金","土"][d.getDay()];
  return `${d.getMonth()+1}月${d.getDate()}日（${w}）${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
// 「締切まであと2日3時間」。押すたびに残りが目に入るようにする
function remainUntil(iso) {
  if (!iso) return "締切なし";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "締切を過ぎています";
  const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000);
  return d > 0 ? `締切まであと${d}日${h}時間` : `締切まであと${h}時間`;
}

// ══════════════════════════════════════════════════════════════
// [2026-09-05] 全問完了後のミニ教材3本＋締め
//   給料まわりの話は、研修を最後まで終えた人にだけ出す。
// ══════════════════════════════════════════════════════════════
const KENMIN_COURSES = [
  // 埼玉県民共済 総合保障型。割戻率は年度ごとに変わるため定数として1か所に置く
  { monthly: 2500, label: "月2,500円コース" },
  { monthly: 5000, label: "月5,000円コース" },
];
const KENMIN_RATE = 0.4484;   // 2025年度実績の割戻率
const NISA_RATE = 0.05;       // 年利（試算）
const NISA_TAX  = 0.20315;    // 課税口座の税率
const NISA_END_AGE = 65;

function TrainingOutro({ data, onExit }) {
  const [amt, setAmt] = useState(10000);
  const [age, setAge] = useState(42);
  const [course, setCourse] = useState(0);

  const nisa = React.useMemo(() => {
    const years = Math.max(NISA_END_AGE - age, 1);
    const months = years * 12, r = NISA_RATE / 12;
    const totalV = amt * ((Math.pow(1 + r, months) - 1) / r);
    const paid = amt * months;
    return { years, paid, total: totalV, gain: totalV - paid, tax: (totalV - paid) * NISA_TAX };
  }, [amt, age]);

  const c = KENMIN_COURSES[course];
  const yearly = c.monthly * 12;
  const back = Math.round(yearly * KENMIN_RATE);
  const net = yearly - back;

  const yen = n => Math.round(n).toLocaleString("ja-JP") + "円";
  const card = { background:"#fafafa", border:"1px solid #d1d5db", borderRadius:12, padding:16 };
  const tag  = { display:"inline-block", fontSize:11, fontWeight:700, color:"#2563eb",
                 background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:5, padding:"3px 9px", marginBottom:10 };
  const row  = { display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:13 };
  const note = { fontSize:12, color:"#6b7280", lineHeight:1.9, marginTop:10 };
  const th   = { padding:"10px 12px", borderBottom:"1px solid #e5e7eb" };
  const td   = { ...th, textAlign:"right", fontVariantNumeric:"tabular-nums" };

  return (
    <div style={{position:"fixed",inset:0,background:"#e5e7eb",zIndex:9000,display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>

          <div style={{...card,background:"#f0fdf4",borderColor:"#22c55e44",textAlign:"center"}}>
            <div style={{fontSize:34,lineHeight:1,marginBottom:10}}>🎉</div>
            <div style={{fontSize:17,fontWeight:700,color:"#15803d",marginBottom:8}}>全{data.questions.length}問、完了しました</div>
            <div style={{fontSize:13,color:"#6b7280",lineHeight:1.9}}>お疲れさまでした。<br/>全部読ませてもらいます。</div>
          </div>

          {/* [2026-09-20] 教材に気づかず閉じる人が多いので、完了のすぐ下で案内する */}
          <div style={{...card,background:"#eff6ff",borderColor:"#2563eb",borderWidth:2}}>
            <div style={{fontSize:16,fontWeight:700,color:"#1e3a8a",lineHeight:1.7,marginBottom:8}}>まだ終わりではありません。<br/>この下の「ミニ教材」を読んでください。</div>
            <div style={{fontSize:14,lineHeight:2,color:"#1e3a8a"}}>
              ① 会社の利益と税金<br/>② NISA・積立・複利<br/>③ 万が一への備え・埼玉県民共済
            </div>
            <div style={{fontSize:13,color:"#1e3a8a",lineHeight:1.9,marginTop:8}}>自分のお金の話です。3つとも最後まで読んでから、一番下の「アプリに戻る」を押してください。</div>
            <div style={{textAlign:"center",fontSize:22,color:"#2563eb",marginTop:6}}>↓</div>
          </div>

          {/* ── ミニ教材① 税金 ── */}
          <div style={card}>
            {/* [2026-09-20] 元原稿（社内研修①_元原稿_2026-09-06.md）の内容に差し替え。税率は断定しない */}
            <div style={tag}>ミニ教材 ① 会社の利益と税金</div>
            <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap"}}>{
`「会社に残った利益＝全部自由に使えるお金」
ではありません。

会社に利益が出れば、
法人税、法人住民税、法人事業税などの税金もかかります。

会社に100万円の利益が出ても、その100万円がそのまま会社の貯金になるわけではありません。

税金を支払ったあとに残ったお金を、
・将来への備え
・設備
・車両
・人材
・賞与
・昇給
・新しい仕事への投資
などに使っていきます。`}</div>
            <div style={note}>※ 税率は利益額や会社の条件などによって変わります。</div>
          </div>

          {/* ── ミニ教材② NISA ── */}
          <div style={card}>
            {/* [2026-09-20] 元原稿の内容に差し替え。金額は下の式で毎回計算する（ハードコードしない・数式は見せない） */}
            <div style={tag}>ミニ教材 ② NISA・積立・複利</div>
            <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap",marginBottom:14}}>{
`運用して増えたお金にも、
さらに利益がついていく。
そのため、長く続けるほど
「時間」の効果が大きくなります。`}</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>65歳まで積み立てた例（年5％で運用できたと仮定）</div>
            {[30,40,45].map(startAge=>{
              const yrs = NISA_END_AGE - startAge, mo = yrs*12, r = NISA_RATE/12;
              const man = n => Math.round(n/10000).toLocaleString("ja-JP")+"万円";
              return (
                <div key={startAge} style={{border:"1px solid #d1d5db",borderRadius:8,overflow:"hidden",marginBottom:8}}>
                  <div style={{background:"#ffffff",padding:"9px 12px",fontSize:12,fontWeight:700,borderBottom:"1px solid #d1d5db"}}>{startAge}歳から65歳まで（{yrs}年間）</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
                    {[10000,20000,30000].map((m,i,a)=>{
                      const last = i===a.length-1;
                      return (
                        <tr key={m}>
                          <td style={last?{...th,borderBottom:"none"}:th}>月{m/10000}万円</td>
                          <td style={{...(last?{...td,borderBottom:"none"}:td),color:"#6b7280"}}>積立 {man(m*mo)}</td>
                          <td style={{...(last?{...td,borderBottom:"none"}:td),fontWeight:700,color:"#2563eb"}}>→ 約{man(m*((Math.pow(1+r,mo)-1)/r))}</td>
                        </tr>
                      );
                    })}
                  </tbody></table>
                </div>
              );
            })}
            <div style={{fontSize:13,fontWeight:700,color:"#374151",margin:"14px 0 10px"}}>自分の場合で動かしてみる</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>毎月の積立額</div>
            <input type="range" min={5000} max={50000} step={1000} value={amt}
              onChange={e=>setAmt(Number(e.target.value))} style={{width:"100%",accentColor:"#2563eb"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:14}}>
              <span>5,000円</span><span style={{color:"#2563eb",fontWeight:700,fontSize:15}}>{amt.toLocaleString("ja-JP")}円</span><span>50,000円</span>
            </div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:6}}>いまの年齢（65歳まで積み立てた場合）</div>
            <input type="range" min={20} max={60} step={1} value={age}
              onChange={e=>setAge(Number(e.target.value))} style={{width:"100%",accentColor:"#2563eb"}}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:16}}>
              <span>20歳</span><span style={{color:"#2563eb",fontWeight:700,fontSize:15}}>{age}歳</span><span>60歳</span>
            </div>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:14}}>
              <div style={row}><span style={{color:"#1e3a8a"}}>積立期間</span><b>{nisa.years}年</b></div>
              <div style={row}><span style={{color:"#1e3a8a"}}>自分が出したお金</span><b>{yen(nisa.paid)}</b></div>
              <div style={{...row,borderBottom:"1px solid #bfdbfe"}}><span style={{color:"#1e3a8a"}}>増えた分</span><b style={{color:"#16a34a"}}>+{yen(nisa.gain)}</b></div>
              <div style={{...row,padding:"12px 0 4px",fontSize:15}}><span style={{color:"#1e3a8a",fontWeight:700}}>65歳時点</span><b style={{fontSize:19,color:"#2563eb"}}>{yen(nisa.total)}</b></div>
            </div>
            <div style={{...note,whiteSpace:"pre-wrap"}}>{
`・年5％で運用できることを保証するものではありません
・投資には価格変動があります
・元本割れする可能性があります
・NISAそのものが利益を保証する制度ではありません`}</div>
            <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap",marginTop:12}}>{
`この教材の目的は、
「投資をしなさい」
ではなく、
「若いうちから少額でもお金について考えること」
「時間と複利の力を知ること」
です。`}</div>
          </div>

          {/* ── ミニ教材③ 県民共済 ── */}
          <div style={card}>
            {/* [2026-09-20] 元原稿の内容に差し替え。割戻率は過去実績であり将来の保証ではない旨を明記 */}
            <div style={tag}>ミニ教材 ③ 万が一への備え・埼玉県民共済</div>
            <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap"}}>{
`お金は増やすことだけではなく、
病気やケガなどに備えることも大切です。
その選択肢のひとつが、埼玉県民共済です。

県民共済には「割戻金」があります。
加入者が支払った掛金から、
共済金や事業運営に必要な費用などを支払い、
決算で剰余が生じた場合に割戻金があります。`}</div>
            <div style={{display:"flex",gap:6,margin:"12px 0"}}>
              {KENMIN_COURSES.map((k,i)=>(
                <button key={k.monthly} onClick={()=>setCourse(i)}
                  style={{flex:1,minHeight:44,borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
                          background:course===i?"#2563eb":"#ffffff",color:course===i?"#ffffff":"#111827",
                          border:`1px solid ${course===i?"#2563eb":"#9ca3af"}`}}>{k.label}</button>
              ))}
            </div>
            <div style={{border:"1px solid #d1d5db",borderRadius:8,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>
                <tr><td style={th}>年間で払う額</td><td style={td}>{yen(yearly)}</td></tr>
                <tr><td style={th}>割戻率</td><td style={td}>{(KENMIN_RATE*100).toFixed(2)}%</td></tr>
                <tr><td style={th}>戻ってくる額</td><td style={{...td,color:"#16a34a",fontWeight:700}}>{yen(back)}</td></tr>
                <tr><td style={{...th,borderBottom:"none",fontWeight:700}}>実質の負担</td>
                    <td style={{...td,borderBottom:"none",fontWeight:700}}>{yen(net)}<span style={{color:"#6b7280",fontWeight:400}}>（月{Math.round(net/12).toLocaleString("ja-JP")}円）</span></td></tr>
              </tbody></table>
            </div>
            <div style={note}>
              ※ 割戻率は令和7年7月決算の実績です。割戻率は毎年変わります。過去の実績であり、今後も同じ割合が戻ることを保証するものではありません。<br/>
              ※ 最新の掛金・保障内容は埼玉県民共済の公式サイトで確認してください。
            </div>
            <div style={{fontSize:14,lineHeight:2,color:"#374151",whiteSpace:"pre-wrap",marginTop:12}}>{
`県民共済を必ず勧めることが目的ではありません。
・病気
・ケガ
・死亡
・入院
など、自分や家族に何かあった時に、
どんな備えがあるのかを一度考えてほしいという趣旨です。

高い保険に入れば安心ということでもありません。
自分の貯金、公的保障、家族構成なども考えながら、
自分に必要な保障を考えるきっかけにしてください。`}</div>
          </div>

          {/* [2026-09-20] 問題・自分の回答・ポイントを並べて見返す（元原稿の「解説は問題ごとに見返せるようにする」）。
                タップで開く。閉じた状態が既定なのは、一覧を長くしないため。教材を先に読ませたいので教材の後ろに置く */}
          <div style={card}>
            <div style={tag}>問題とポイントを見返す</div>
            {data.questions.map(q=>{
              const r = data.responses.find(x=>x.questionId===q.id);
              return (
                <details key={q.id} style={{borderTop:"1px solid #e5e7eb",padding:"10px 0"}}>
                  <summary style={{fontSize:13,fontWeight:700,lineHeight:1.7,cursor:"pointer",color:"#111827"}}>{q.code}　{q.text.split("\n")[0]}</summary>
                  <div style={{fontSize:13,lineHeight:1.9,color:"#374151",whiteSpace:"pre-wrap",margin:"10px 0 8px"}}>{q.text}</div>
                  <div style={{fontSize:11,color:"#6b7280",marginBottom:5}}>あなたの回答</div>
                  <div style={{background:"#e5e7eb",borderRadius:8,padding:"10px 12px",fontSize:13,lineHeight:1.85,color:"#374151",whiteSpace:"pre-wrap",marginBottom:10}}>{(r&&r.answer)||"（未記入）"}</div>
                  {q.explanation
                    ? <><div style={{fontSize:11,color:"#2563eb",fontWeight:700,marginBottom:5}}>ポイント</div>
                        <div style={{fontSize:13,lineHeight:1.95,color:"#374151",whiteSpace:"pre-wrap"}}>{q.explanation}</div></>
                    : <div style={{fontSize:13,lineHeight:1.9,color:"#1e3a8a",whiteSpace:"pre-wrap"}}>{q.noAnswerMsg}</div>}
                </details>
              );
            })}
          </div>

          <div style={{...card,background:"#ffffff"}}>
            <div style={{fontSize:14,lineHeight:2.1,color:"#374151",whiteSpace:"pre-wrap"}}>{data.training.outro}</div>
            <div style={{marginTop:14,fontSize:13,textAlign:"right"}}>勝間</div>
          </div>

          <button onClick={onExit}
            style={{width:"100%",minHeight:52,border:"none",borderRadius:8,padding:14,fontSize:15,fontWeight:700,
                    cursor:"pointer",background:"#2563eb",color:"#ffffff"}}>アプリに戻る</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// APP
// ══════════════════════════════════════════════════════════════
function App() {
  const [projects, setProjects] = useState([]);
  const [clockLogs, setClockLogs] = useState([]);
  const [leaveData, setLeaveData] = useState({});
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  // [2026-04-15] セッション復元: localStorageにトークン+userがあれば自動ログイン
  const [user, setUser] = useState(() => { const s = loadSavedSession(); return s?.user || null; });
  const [tab, setTab] = useState("打刻");
  const [filterSt, setFilterSt] = useState("全て");
  // [2026-04-20] 案件一覧は常にコンパクト表示。工事区分・検索・自分のみは管理者画面のみ
  const compactMode = true;
  // [2026-04-20] 引継ぎメモ 古いメモのアコーディオン展開フラグ（案件IDごと）
  const [showOldMemos, setShowOldMemos] = useState({});
  const [addWorksOpen, setAddWorksOpen] = useState({}); // [2026-07-23] 追加工事セクションのアコーディオン開閉（案件idごと・デフォルト畳む）
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  // [2026-04-17] user.htmlでも案件情報編集（削除以外全部）
  const [editProjectId, setEditProjectId] = useState(null);
  const [adminPf, setAdminPf] = useState({name:"",client:"",status:"準備中",lead:"",startDate:"",endDate:"",estimate:"",contractAmount:"",targetNinku:"",contractType:"",workCategory:"",address:"",customerContact:"",internalOwner:"",invoiceSettled:false});
  const [savingEditProject, setSavingEditProject] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadErr, setLoadErr] = useState(null);

  const [handoverMemos, setHandoverMemos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loginPopups, setLoginPopups] = useState([]);
  // [2026-04-24] Push通知
  const [pushStatus, setPushStatus] = useState("unknown"); // "unknown"|"granted"|"denied"|"subscribed"
  const [pushLoading, setPushLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);
  const [pendingHandover, setPendingHandover] = useState(null);
  const [handoverText, setHandoverText] = useState("");
  const [handoverPhoto, setHandoverPhoto] = useState(null);
  // [2026-07-01] 退勤直後の写真添付（任意）。clock_logs に紐づけて保存。ctx={logId,now,clockInTime}
  const [clockOutPhotoFile, setClockOutPhotoFile] = useState(null);
  const [clockOutPhotoCtx, setClockOutPhotoCtx] = useState(null);
  // [2026-06-16] 案件詳細から直接 引継ぎメモ＋写真 を追加するモーダル用（退勤時のhandover*とは別state）
  const [addHmText, setAddHmText] = useState("");
  const [addHmPhoto, setAddHmPhoto] = useState(null);
  const [annText, setAnnText] = useState("");
  const [subcontractors, setSubcontractors] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [additionalWorks, setAdditionalWorks] = useState([]);
  const [projectSpecs, setProjectSpecs] = useState([]);
  const [specUploading, setSpecUploading] = useState(false);
  const [clockRemarks, setClockRemarks] = useState("");
  const [clockSubs, setClockSubs] = useState([]);
  // [v14] 名刺管理（全ユーザー可）
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  // [2026-04-28] photoUrl（base64）と category（顧客/協力会社）追加
  const [contactForm, setContactForm2] = useState({name:"",company:"",phone:"",email:"",address:"",notes:"",photoUrl:"",category:"顧客"});
  const [contactCategoryFilter, setContactCategoryFilter] = useState("all"); // all | 顧客 | 協力会社
  // [2026-04-29] アンケート回答 state（強制モーダル＋通常タブ共有）。{[surveyId]: {[qi]: value}}
  const [surveyAnswers, setSurveyAnswers] = useState({});
  // [2026-09-04] 全画面アンケートを今回だけ閉じたか。state なので永続せず、アプリを開き直すと再び出る
  const [surveyDismissed, setSurveyDismissed] = useState(false);
  // [2026-09-05] 社内研修①。training=null は公開中の研修なし
  const [training, setTraining] = useState(null);
  const [trainingDismissed, setTrainingDismissed] = useState(false);
  // [2026-09-20] 完了後も研修画面を開いておくフラグ（完了直後の教材表示と「もう一度見る」用）
  const [trainingReview, setTrainingReview] = useState(false);
  const reloadTraining = useCallback(async () => {
    const t = await loadTraining();
    setTraining(t);
    return t;
  }, []);
  // [2026-09-04] 回答済みアンケートを編集中か（期限内のみ）。{[surveyId]: true}
  const [surveyEditing, setSurveyEditing] = useState({});
  // [2026-06-29] 未退勤(前日以前の退勤打刻忘れ)の強制解消モーダル用。logId→"HH:MM"
  const [clockoutFixEdits, setClockoutFixEdits] = useState({});
  const [editContactId, setEditContactId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  // [v14] 会社情報
  const [companyInfo, setCompanyInfo] = useState([]);
  // [v14] アンケート
  const [surveys, setSurveys] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  // [v15] 休暇残日数
  const [leaveBalances, setLeaveBalances] = useState([]);
  // [v15] 会社情報アコーディオン用
  const [openInfoItems, setOpenInfoItems] = useState({});

  const [subForm, setSubForm] = useState({companyName:"",headcount:"1",date:todayStr(),memo:""});
  const [workForm, setWorkForm] = useState({description:"",floor:"",location:""});
  const [workPhoto, setWorkPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [ef, setEf] = useState({date:todayStr(),worker:"",qty:"",memo:""});
  const [pf, setPf] = useState({name:"",client:"",status:"準備中",lead:"",startDate:todayStr(),endDate:"",estimate:"",targetNinku:"",contractType:"",workCategory:"",address:""});
  const [lf, setLf] = useState({type:"paid",date:todayStr(),days:"1",memo:"",holidayPref:"",holidayWorkId:""});
  const [qf, setQf] = useState({name:"",lead:""});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  // [v16] 打刻修正申請
  const [clockMods, setClockMods] = useState([]);
  const [showClockFix, setShowClockFix] = useState(null); // 修正対象のログ or "new"
  const [clockFixForm, setClockFixForm] = useState({projectId:"",clockIn:"",clockOut:"",reason:""});
  // [v16] 顧客追加
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({name:"",contact:"",phone:""});
  // [2026-04-16] 夜タスク① 車両閲覧 / ⑨ 進捗ヒアリング
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTroubles, setVehicleTroubles] = useState([]);
  const [vehicleOilChanges, setVehicleOilChanges] = useState([]);
  const [openVehicleIds, setOpenVehicleIds] = useState({});
  // スタッフによる不具合報告フォーム（自分用）
  const [troubleReportForm, setTroubleReportForm] = useState({vehicleId:"",date:todayStr(),description:""});
  // [2026-05-21] スタッフによるオイル交換記録フォーム
  const [oilReportForm, setOilReportForm] = useState({vehicleId:"",date:todayStr(),mileage:"",note:"",elementChanged:false});
  // [2026-06-12] ご意見箱（匿名投稿）
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);
  // [2026-04-20] 進捗報告（顧客ごとの確認日に担当者が送信する）
  const [progressReports, setProgressReports] = useState([]);
  const [ninkuSettings, setNinkuSettings] = useState(null); // [2026-09-29] 目標単価・損益分岐単価（赤字ライン人工の計算用）
  const [progressRequestAllAt, setProgressRequestAllAt] = useState(null); // [2026-09-29] 管理者の「全現場に進捗報告を依頼」日時（app_settings.progress_request_all_at）
  const [reportingItem, setReportingItem] = useState(null); // {project, customer, checkType, lastReport}
  const [reportPercent, setReportPercent] = useState(50);
  const [reportComment, setReportComment] = useState("");
  const [confirmReport, setConfirmReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  // [2026-07-07] 強制進捗報告モーダル用（役員以外・確認日・打刻歴あり案件は報告するまで他操作不可）
  const [forcedProgress, setForcedProgress] = useState({}); // {[projectId]:{percent,comment}}
  const [forcedConfirmId, setForcedConfirmId] = useState(null); // 送信確認中の projectId
  // [2026-04-20] 休日出勤 自動申請モーダル（退勤打刻時に土日・お盆・年末年始を検出して自動発行）
  const [pendingHolidayApply, setPendingHolidayApply] = useState(null); // {date,clockInIso,clockOutIso,holidayType,config}
  const [holidayPrefChoice, setHolidayPrefChoice] = useState(""); // 土曜終日のみ: "買取希望"|"振休希望"
  const [savingHolidayApply, setSavingHolidayApply] = useState(false);
  // 退勤時 外注作業員名入力
  const [pendingSubWorkers, setPendingSubWorkers] = useState([]);
  const [subWorkerEdits, setSubWorkerEdits] = useState({});
  const [pendingAfterSubWorkers, setPendingAfterSubWorkers] = useState(null);
  // [2026-04-27] 連打防止: 書き込み中は全送信をブロック
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const withBusy = useCallback(async (fn) => {
    if (busyRef.current) { showToast("⏳ 処理中です…少しお待ちください"); return; }
    busyRef.current = true; setBusy(true);
    try { return await fn(); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);
  // [2026-04-21] 個人メモ（本人のみ閲覧/編集）
  const [personalMemo, setPersonalMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoLoaded, setMemoLoaded] = useState(false);

  const showToast = msg=>{setToast(msg);setTimeout(()=>setToast(null),2400);};

  useEffect(()=>{ sbSetErrorHandler((msg) => showToast("⚠ " + msg)); },[]);
  // [2026-04-22] 401検知時の自動ログアウト: user を null にして PIN画面に戻す
  // [2026-07-18] セッション切れ時は接続エラー画面を出さず PIN 画面へ戻す（loadErr/loading もクリア）。
  useEffect(()=>{ sbSetSessionExpiredHandler(() => { setUser(null); setLoadErr(""); setLoading(false); }); },[]);

  // [2026-04-21] 個人メモを取得（ログイン後の最初に1回）
  useEffect(()=>{
    if (!user || memoLoaded) return;
    (async()=>{
      const m = await getPersonalMemo();
      setPersonalMemo(m);
      setMemoLoaded(true);
    })();
  }, [user, memoLoaded]);

  // [2026-05-07] Codex指摘#1 Phase 2.1: 初期データロードは PIN 認証成功後（=user 確定後）に遅延。
  // 未ログイン時は何もロードせず、loading=false にして PIN 画面を表示。
  // localStorage に有効 session があれば user 初期化（L437 useState 初期化関数）で復元され、即ロードされる。
  // 退出後は L1324 でページ遷移するので state は破棄される。
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(()=>{
    if (!user) {
      setLoading(false);
      setDataLoaded(false);
      return;
    }
    if (dataLoaded) return;
    setLoading(true);
    (async()=>{
      try {
        const [st, p, c, ld, hm, ann, cust, subs, addWorks, ctcts, ci, sv, sr, specs, lb, cm, ei, vh, vt, vo, prRep] = await Promise.all([
          loadStaff(), loadProjects(), loadClockLogs(clockLogsInitialSinceIso()), loadLeaves(),
          loadHandoverMemos(), loadAnnouncements(), loadCustomers(),
          loadSubcontractors(), loadAdditionalWorks(), loadContacts(),
          loadCompanyInfo(), loadSurveys(), loadSurveyResponses(), loadProjectSpecs(),
          loadLeaveBalances(), loadClockModifications(), loadExpenseItems(),
          loadVehicles(), loadVehicleTroubles(), loadVehicleOilChanges(),
          loadProgressReports()
        ]);
        if (!st) {
          // [2026-07-18] st が null でも、セッション切れ(sb内で401→自動ログアウト済み)なら接続エラーは出さず PIN 画面へ。
          //   本当に通信不能な時（トークンは有効なのに読めない）だけ接続エラーを表示する。
          if (!sbHasSession()) { setLoading(false); return; }
          setLoadErr("Supabaseに接続できません。"); setLoading(false); return;
        }
        setStaff(st); setProjects(p||[]); setClockLogs(c||[]); setLeaveData(ld||{});
        setHandoverMemos(hm||[]); setAnnouncements(ann||[]); setCustomers(cust||[]);
        setSubcontractors(subs||[]); setAdditionalWorks(addWorks||[]); setContacts(ctcts||[]);
        setCompanyInfo(ci||[]); setSurveys(sv||[]); setSurveyResponses(sr||[]); setProjectSpecs(specs||[]);
        // [2026-09-05] 研修は専用アクション経由なので Promise.all とは別に読む（失敗しても他機能は動かす）
        reloadTraining();
        setLeaveBalances(lb||[]); setClockMods(cm||[]); setExpenseItems(ei||[]);
        setVehicles(vh||[]); setVehicleTroubles(vt||[]); setVehicleOilChanges(vo||[]);
        setProgressReports(prRep||[]);
        // [2026-09-29] 一斉依頼の日時だけ読む（失敗しても他機能は動かす）
        loadAppSettings().then(s=>{setProgressRequestAllAt(s?.progress_request_all_at||null);setNinkuSettings(s||null);}).catch(()=>{});
        setDataLoaded(true);
      } catch(e) { setLoadErr("データの読み込みに失敗しました: " + e.message); }
      setLoading(false);
    })();
  },[user]);

  // ログイン後の通知チェック + admin はリダイレクト
  useEffect(()=>{
    if (!user) return;
    // [v14] adminはadmin.htmlへリダイレクト
    if (user.role==="admin") {
      // [2026-04-15] sessionStorage→localStorage に統一。setSessionToken/saveSavedUser が既に保存済み
      window.location.href = "/admin";
      return;
    }
    // [2026-05-07] 役員も打刻するので初期タブ強制リダイレクトは撤廃
    setEf(f=>({...f,worker:user.name}));
    // [2026-06-08] 役員（裕太）も引継ぎメモのポップアップは受け取る。
    //   それ以外（アナウンス/振休/車両アラート/アンケート強制）は従来通り役員はスキップ。
    const popups = [];
    const unreadHandovers = handoverMemos.filter(m => m.author !== user.name && !m.readBy.includes(user.id));
    if (unreadHandovers.length > 0) popups.push({ type:"handover", count: unreadHandovers.length, memos: unreadHandovers });
    if (!user.isExecutive) {
      const unreadAnn = announcements.filter(a => !a.readBy.includes(user.id));
      if (unreadAnn.length > 0) popups.push({ type:"announcement", count: unreadAnn.length, items: unreadAnn });
      // [2026-04-28] 未回答アンケートは強制モーダル(下部 forceSurvey ブロック)で表示するためここでは push しない
      // [2026-09-04] 期限内アンケートもログインポップアップをやめ、全画面モーダルに一本化した。
      //   期限内は全画面の下部にある「あとで書く」で閉じられるので、小さいポップアップと二重に出す意味がない。
      //   （小さいポップアップだと流し読みで閉じられ、設問が読まれないまま終わる）
      // [v15] 振休期限アラート
      const furikaeAlerts = getFurikaeAlerts(user.id);
      if (furikaeAlerts.length > 0) popups.push({ type:"furikae_alert", items: furikaeAlerts });
      // [2026-04-20] 車両メンテナンスアラート（担当車両のオイル交換・車検）
      const vehicleAlerts = getVehicleAlerts(user.id, user.role, vehicles, vehicleOilChanges, staff);
      if (vehicleAlerts.length > 0) popups.push({ type:"vehicle_alert", items: vehicleAlerts });
    }
    if (popups.length > 0) setLoginPopups(popups);
  }, [user]);

  // [2026-05-21] 10分ポーリング廃止。最新化は再ログイン or 画面再読み込みで対応。
  // セッション期限：staff 30分（auth-pin で制御）。期限切れは自然と再ログインを促す。
  // 60秒ポーリング（下）は自分の打刻反映のためだけに残してある。

  // [2026-04-27] 打刻・申請状態を60秒ごとに高速更新（管理者承認を即反映するため）
  // [2026-05-21] 通信量削減: 打刻ログは「今日分のみ」取得し、既存stateにマージする。
  // 過去ログは触らず保持（出勤簿・過去打刻表示に影響なし）。10分ポーリングは廃止済み、全件取得は初回ロードのみ。
  useEffect(()=>{
    if(!user) return;
    const interval = setInterval(async()=>{
      if (document.hidden) return;
      try {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const [c, cm] = await Promise.all([
          loadClockLogs(todayStart.toISOString()),
          loadClockModifications(),
        ]);
        // c が null = 取得失敗 → state は触らない。
        // [2026-07-14] 差し替えではなく id 基準の upsert マージにする。
        //   旧「今日分を filter で捨てて c で置換」だと、①打刻直後(サーバ応答前)で c にまだ無い新規ログが
        //   消えてボタンが「出勤する」に戻り二重打刻を誘発 ②0時跨ぎ(fetch23:59→応答0:00)で前日ログが
        //   prev と c の両方に残り重複(React key重複・人工二重計上) が起きていた。id マージで両方解消。
        if(c) setClockLogs(prev => {
          const byId = new Map(prev.map(l => [l.id, l]));
          for (const l of c) byId.set(l.id, l); // サーバ最新で上書き・新規は追加
          return Array.from(byId.values());
        });
        if(cm) setClockMods(cm);
      } catch(e) { /* 次回リトライ */ }
    }, 60000); // 60秒
    return ()=>clearInterval(interval);
  },[user]);

  const selected = projects.find(p=>p.id===selectedId);
  // [2026-04-20] user側は ステータスフィルタのみ
  // [2026-10-02] 完了した現場は、完了にしてから7日たったら一覧に出さない（完了日が無い古い完了現場も出さない）。管理画面は対象外
  const DONE_VISIBLE_MS = 7 * 86400000;
  const filtered = projects
    .filter(p=>p.status!=="完了"||(p.completedAt&&Date.now()-new Date(p.completedAt).getTime()<DONE_VISIBLE_MS))
    .filter(p=>filterSt==="全て"||p.status===filterSt);

  const handleTabChange = (newTab) => { setTab(newTab); };

  // [v14] 打刻（note引数追加）
  const handleClock = useCallback(async(type,coords,openLogId,locationName="",note="",earlyLeaveCategory="",earlyLeaveReason="",hourlyUsed=0,outsource=null,commuteMethod="",isNightShift=false,extra=null)=>{
    const now=new Date().toISOString();
    if(type==="in"){
      // [2026-04-20] 出勤打刻は8:00固定（早出は打刻修正申請で個別対応）
      // 8:00前の打刻は当日の8:00に置き換え。8:00以降はそのまま。
      // [2026-07-13] 夜勤は定時の概念がないため8:00補正はしない（実打刻をそのまま保存）
      const nowDate = new Date();
      const earlyClockIn = !isNightShift && nowDate.getHours() < 8;
      let clockInIso = now;
      if (earlyClockIn) {
        const forced = new Date(nowDate);
        forced.setHours(8, 0, 0, 0);
        clockInIso = forced.toISOString();
      }
      const newLog = {id:uid(),userId:user.id,userName:user.name,projectId:selectedId,clockIn:clockInIso,clockOut:null,coordsIn:coords,coordsOut:null,remarks:clockRemarks,locationName,note,commuteMethod:commuteMethod||null,isNightShift:!!isNightShift};
      // [2026-04-22] DB保存を先に実行し、成功確認後にローカルstate更新
      const ok = await insertClockLog(newLog);
      if(!ok){ showToast(WRITE_ERROR_MSG); return false; } // [2026-07-14] 保存失敗を呼び出し側へ通知（誤って✓表示しない）
      setClockLogs(prev=>[...prev, newLog]);
      // 外注データがあれば案件に紐付けて保存
      const validSubs = clockSubs.filter(s=>s.companyName.trim());
      for(const sub of validSubs){
        const s={id:uid(),projectId:selectedId,date:todayStr(),companyName:sub.companyName.trim(),headcount:Number(sub.headcount)||1,memo:"",workers:""};
        const subOk = await insertSubcontractor(s);
        if(subOk) setSubcontractors(prev=>[s,...prev]);
        // 外注の保存失敗は打刻本体を巻き戻さない（最低限、打刻は守る）
      }
      setClockRemarks("");
      setClockSubs([{companyName:"",headcount:"1"}]);
      const locText = locationName ? ` 📍${locationName}` : coords ? ` 📍${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` : note ? " （GPS理由入力済み）" : "（GPS取得できず）";
      const subText = validSubs.length>0?` 外注${validSubs.length}社`:"";
      const earlyText = earlyClockIn ? " ⏰8:00スタートで記録" : "";
      const nightText = isNightShift ? " 🌙夜勤" : "";
      showToast(`✓ 出勤しました${nightText}${earlyText}${locText}${subText}`);
      return true; // [2026-07-14] 出勤保存成功
    } else {
      const openLog = clockLogs.find(l=>l.id===openLogId);
      const clockInTime = openLog?.clockIn;
      const locName = locationName || openLog?.locationName || "";
      // [2026-05-29] 退勤位置のズレ距離(m)を計算して保存。
      // 基準は ①現場座標(住所geocode) 優先 ②無ければ朝の出勤打刻 ③どちらも無ければ null
      const proj = projects.find(p=>p.id===(openLog?.projectId||selectedId));
      const ref = (proj?.siteLat!=null && proj?.siteLng!=null)
        ? { lat:proj.siteLat, lng:proj.siteLng }
        : parseCoords(openLog?.coordsIn);
      const outDistanceM = distanceMeters(ref, parseCoords(coords));
      // [2026-04-21] DBには実打刻時刻を保存（早退の把握用）。実働/残業は計算関数側で17:00扱いに補正。
      // [2026-04-22] DB保存を先に実行し、成功確認後にローカルstate更新
      const ok = await updateClockOut(openLogId, now, coords, locName, earlyLeaveCategory||undefined, earlyLeaveReason||undefined, hourlyUsed||undefined, outsource||undefined, outDistanceM, extra);
      if(!ok){ showToast(WRITE_ERROR_MSG); return false; } // [2026-07-14] 退勤保存失敗を通知
      // [2026-10-14] 8時前に退勤したとき（早朝の立ち寄り）は、8:00に置き換えた出勤を実際の時刻に戻す（サーバと同じ扱い）
      const reversedIn = (!openLog?.isNightShift && clockInTime && new Date(now) < new Date(clockInTime))
        ? ((openLog?.createdAt && new Date(openLog.createdAt) <= new Date(now)) ? openLog.createdAt : now) : null;
      setClockLogs(prev=>prev.map(l=>l.id===openLogId?{...l,...(reversedIn?{clockIn:reversedIn}:{}),clockOut:now,coordsOut:coords,locationName:locName,
        outsourceType:outsource?.type||null, outsourceCount:outsource?.count??null, outsourceAmount:outsource?.amount??null,
        early_leave_category:earlyLeaveCategory||l.early_leave_category||"", early_leave_reason:earlyLeaveReason||l.early_leave_reason||"",
        earlyLeavePay:extra?.earlyLeavePay||null, breakShortMin:Number(extra?.breakShortMin)||0, breakShortReason:extra?.breakShortReason||""}:l));
      // [2026-07-13] 夜勤は残業概念なし → 実働時間(退勤-出勤)を表示
      if(openLog?.isNightShift){
        const wh=clockInTime?calcNightWorkedHours(clockInTime,now):0;
        showToast(wh>0?`✓ 退勤 🌙実働${wh.toFixed(1)}h`:"✓ 退勤しました");
      }else{
        const ot=clockInTime?calcOvertime(clockInTime,now):0;
        showToast(ot>0?`✓ 退勤 残業${ot.toFixed(1)}h`:"✓ 退勤しました");
      }
      // [2026-07-06] 退勤の写真添付モーダルは非表示化。既存フロー（外注作業員名/休日申請/引継ぎ）へ直接進む
      setClockOutPhotoFile(null);
      setClockOutPhotoCtx(null);
      runClockOutFollowups(now, clockInTime, openLog?.isNightShift);
      return true; // [2026-07-14] 退勤保存成功
    }
  },[clockLogs,user,selectedId,projects,clockRemarks,clockSubs,subcontractors]);

  // [2026-07-01] 退勤写真モーダルを終えた後の既存フロー（外注作業員名→休日申請→引継ぎメモ）
  const runClockOutFollowups = (now, clockInTime, isNightShift=false) => {
    const todaySubs = subcontractors.filter(s=>s.projectId===selectedId&&s.date===todayStr()&&!(s.workers||"").trim());
    // [2026-07-14] 夜勤は日付をまたぐため、休日出勤の自動申請は「退勤日」ではなく「出勤日」基準で判定する。
    //   例: 金曜18:00夜勤→土曜6:00退勤 は「金曜(平日)勤務」であり土曜休日出勤ではない。
    //   土曜半日判定(退勤<13時)も夜勤は満了勤務のため、出勤時刻(通常は夕方=全日扱い)で評価する。
    const workDate = isNightShift ? dateStrJST(clockInTime) : todayStr();
    const htype = getHolidayType(workDate);
    const hConfig = getHolidayAutoApplyConfig(htype, isNightShift ? clockInTime : now);
    const afterInfo = { projectId: selectedId, projectName: projects.find(p=>p.id===selectedId)?.name || "", clockInTime, clockOutTime: now, htype, hConfig, workDate };
    if (todaySubs.length > 0) {
      setPendingSubWorkers(todaySubs);
      setSubWorkerEdits(Object.fromEntries(todaySubs.map(s=>[s.id,""])));
      setPendingAfterSubWorkers(afterInfo);
      setModal("subWorkers");
    } else {
      setPendingHandover({ projectId: afterInfo.projectId, projectName: afterInfo.projectName });
      setHandoverText("");
      if (hConfig) {
        setPendingHolidayApply({ date: afterInfo.workDate, clockInIso: clockInTime, clockOutIso: now, holidayType: htype, config: hConfig });
        setHolidayPrefChoice("");
        setModal("holidayApply");
      } else {
        setModal("handover");
      }
    }
  };

  // [2026-07-01] 退勤写真の添付確定（任意）。添付があれば clock_logs に保存してから次のフローへ
  const submitClockOutPhoto = async () => {
    const ctx = clockOutPhotoCtx;
    if (!ctx) { setModal(null); return; }
    if (clockOutPhotoFile) {
      setPhotoUploading(true);
      const url = await uploadFieldPhoto(clockOutPhotoFile.base64, clockOutPhotoFile.name, clockOutPhotoFile.type) || "";
      if (!url) { setPhotoUploading(false); showToast("⚠ 写真のアップロードに失敗"); return; }
      const ok = await setClockOutPhoto(ctx.logId, url);
      setPhotoUploading(false);
      if (!ok) { showToast(WRITE_ERROR_MSG); return; }
      setClockLogs(prev=>prev.map(l=>l.id===ctx.logId?{...l,clockOutPhoto:url}:l));
      showToast("✓ 退勤写真を保存しました");
    }
    setClockOutPhotoFile(null);
    setClockOutPhotoCtx(null);
    runClockOutFollowups(ctx.now, ctx.clockInTime);
  };

  // [2026-04-20] 休日出勤 自動申請の送信
  const submitHolidayApply = async () => {
    if (!pendingHolidayApply || savingHolidayApply) return;
    const { date, holidayType, config } = pendingHolidayApply;
    // 土曜終日のみユーザー選択必要（買取希望/振休希望）
    if (config.needUserChoice && !holidayPrefChoice) { showToast("⚠ 買取 or 振休 を選んでください"); return; }
    setSavingHolidayApply(true);
    try {
      const entries = config.entries.map(e => ({
        id: uid(),
        type: "holiday",
        date,
        days: e.days,
        memo: "",
        // needUserChoice=true の場合は holidayPrefChoice を使う
        holidayPref: e.pref || holidayPrefChoice,
        status: "承認",
        appliedAt: new Date().toISOString(),
        holidayWorkId: null,
        holidayType,
      }));
      // [2026-05-07] Codex指摘#5: DB保存を先に行い、全件成功時のみ UI state を更新する。
      // 部分失敗時は UI に申請を残さない（DB と UI の食い違い防止）。
      const saved = [];
      let failCount = 0;
      for (const entry of entries) {
        const ok = await insertLeave(user.id, entry);
        if(ok) saved.push(entry); else failCount++;
      }
      if(failCount>0){
        // 部分成功した分だけは反映（DB に存在するため）
        if(saved.length>0) setLeaveData(prev => ({ ...prev, [user.id]: [...(prev[user.id]||[]), ...saved] }));
        showToast(`⚠ ${failCount}件の保存に失敗。ネットワーク確認後、未保存分のみ再申請してください`);
        return;
      }
      // 全件成功時のみ UI 反映
      setLeaveData(prev => ({ ...prev, [user.id]: [...(prev[user.id]||[]), ...entries] }));
      showToast(`✓ ${HOLIDAY_TYPE_LABEL[holidayType]||"休日"}出勤を申請しました（${entries.length}件）`);
      setPendingHolidayApply(null);
      setHolidayPrefChoice("");
      // 申請後、引継ぎモーダルへ
      if (pendingHandover) setModal("handover"); else setModal(null);
    } catch (e) {
      showToast("⚠ 申請失敗: " + e.message);
    } finally {
      setSavingHolidayApply(false);
    }
  };

  const submitHandover = async () => {
    if (!handoverText.trim() || !pendingHandover) { setModal(null); return; }
    let imageUrl = "";
    if (handoverPhoto) {
      setPhotoUploading(true);
      imageUrl = await uploadFieldPhoto(handoverPhoto.base64, handoverPhoto.name, handoverPhoto.type) || "";
      setPhotoUploading(false);
      if (!imageUrl) { showToast("⚠ 写真のアップロードに失敗"); return; }
    }
    const memo = { id:uid(), projectId:pendingHandover.projectId, author:user.name, text:handoverText.trim(), imageUrl, createdAt:new Date().toISOString(), readBy:[user.id] };
    const ok1 = await insertHandoverMemo(memo);
    if(!ok1){ showToast(WRITE_ERROR_MSG); return; }
    setHandoverMemos(prev=>[memo,...prev]);
    const ann = { id:uid(), author:user.name, role:user.role, text:`【引継ぎ｜${pendingHandover.projectName}】${handoverText.trim()}`, createdAt:new Date().toISOString(), readBy:[user.id] };
    const ok2 = await insertAnnouncement(ann);
    if(ok2) setAnnouncements(prev=>[ann,...prev]);
    setModal(null); setHandoverText(""); setHandoverPhoto(null); setPendingHandover(null);
    showToast(ok2 ? "✓ 引継ぎをアナウンスで送信しました" : "✓ 引継ぎ保存済み（アナウンス送信は失敗）");
  };

  // [2026-06-16] 案件詳細から直接 引継ぎメモ＋写真 を追加（退勤フローを経由せず後追いで記録）
  const submitAddHandover = () => withBusy(async () => {
    if (!addHmText.trim() || !selected) return;
    let imageUrl = "";
    if (addHmPhoto) {
      imageUrl = await uploadFieldPhoto(addHmPhoto.base64, addHmPhoto.name, addHmPhoto.type) || "";
      if (!imageUrl) { showToast("⚠ 写真のアップロードに失敗"); return; }
    }
    const memo = { id:uid(), projectId:selected.id, author:user.name, text:addHmText.trim(), imageUrl, createdAt:new Date().toISOString(), readBy:[user.id] };
    const ok1 = await insertHandoverMemo(memo);
    if(!ok1){ showToast(WRITE_ERROR_MSG); return; }
    setHandoverMemos(prev=>[memo,...prev]);
    const ann = { id:uid(), author:user.name, role:user.role, text:`【引継ぎ｜${selected.name}】${addHmText.trim()}`, createdAt:new Date().toISOString(), readBy:[user.id] };
    const ok2 = await insertAnnouncement(ann);
    if(ok2) setAnnouncements(prev=>[ann,...prev]);
    setModal(null); setAddHmText(""); setAddHmPhoto(null);
    showToast(ok2 ? "✓ 引継ぎメモを追加・全員に通知しました" : "✓ 引継ぎメモを追加しました（通知は失敗）");
  });

  const submitAnnouncement = () => withBusy(async () => {
    if (!annText.trim()) return;
    const ann = { id:uid(), author:user.name, role:user.role, text:annText.trim(), createdAt:new Date().toISOString(), readBy:[user.id] };
    const ok = await insertAnnouncement(ann);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setAnnouncements(prev=>[ann,...prev]);
    setAnnText(""); showToast("✓ アナウンスを送信しました");
  });

  const markAllRead = async (popupType) => {
    if (popupType==="handover") {
      const unread = handoverMemos.filter(m=>m.author!==user.name&&!m.readBy.includes(user.id));
      for (const m of unread) await markHandoverRead(m.id, user.id);
      setHandoverMemos(prev=>prev.map(m=>({...m,readBy:m.readBy.includes(user.id)?m.readBy:[...m.readBy,user.id]})));
    } else if (popupType==="announcement") {
      const unread = announcements.filter(a=>!a.readBy.includes(user.id));
      for (const a of unread) await markAnnouncementRead(a.id, user.id);
      setAnnouncements(prev=>prev.map(a=>({...a,readBy:a.readBy.includes(user.id)?a.readBy:[...a.readBy,user.id]})));
    }
    setLoginPopups(prev=>prev.filter(p=>p.type!==popupType));
  };

  const submitEntry = () => withBusy(async()=>{
    if(!ef.qty||!selectedId)return;
    const e={id:uid(),date:ef.date,worker:ef.worker,qty:parseFloat(ef.qty),memo:ef.memo};
    const ok = await insertEntry(selectedId, e);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setProjects(prev=>prev.map(p=>p.id===selectedId?{...p,entries:[...p.entries,e]}:p));
    setModal(null);setEf({date:todayStr(),worker:user?.name||"",qty:"",memo:""});
    showToast("✓ 人工を記録しました");
  });

  const submitProject = () => withBusy(async()=>{
    if(!pf.name)return;
    const np={id:uid(),...pf,estimate:Number(pf.estimate)||0,targetNinku:Number(pf.targetNinku)||0,materialCost:0,otherCost:0,targetMandays:0,contractAmount:0,costItems:[],entries:[],attachments:[]};
    const ok = await insertProject(np);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setProjects(prev=>[...prev,np]);
    setModal(null);setPf({name:"",client:"",status:"準備中",lead:"",startDate:todayStr(),endDate:"",estimate:"",targetNinku:"",contractType:"",workCategory:"",address:""});
    showToast("✓ 案件を追加しました");setSelectedId(np.id);setTab("案件一覧");
  });

  const submitQuickProject = () => withBusy(async()=>{
    if(!qf.name)return;
    const np={id:uid(),name:qf.name,client:"",status:"進行中",lead:qf.lead||"",startDate:todayStr(),endDate:"",estimate:0,targetNinku:0,materialCost:0,otherCost:0,targetMandays:0,contractAmount:0,contractType:"",address:"",costItems:[],entries:[],attachments:[]};
    const ok = await insertProject(np);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setProjects(prev=>[...prev,np]);
    setSelectedId(np.id);setQf({name:"",lead:""});setShowQuickAdd(false);
    showToast(`✓「${np.name}」を追加しました`);
  });

  const submitLeave = () => withBusy(async()=>{
    if(!lf.date||!user)return;
    // [2026-04-29] 重複防止: 同じ日・同じ種別の「申請中/承認」が既にあれば弾く（重複押下や別タブ起因）
    // [2026-09-24] 丸一日休む種別は互いに排他。種別一致だけだと同じ日に有給と振休を両方出せて
    //   1日を二重消化する（実際に2026-09-04で発生）。休日出勤・遅刻早退は「休む」ではないので対象外。
    const FULL_DAY_OFF = ["paid","furikae","special","absence"];
    const conflictTypes = FULL_DAY_OFF.includes(lf.type) ? FULL_DAY_OFF : [lf.type];
    const dup = (leaveData[user.id] || []).find(l =>
      l.date === lf.date && conflictTypes.includes(l.type) && (l.status === "申請中" || l.status === "承認")
    );
    if (dup) {
      const lbl = LEAVE_TYPES.find(lt=>lt.id===dup.type)?.label || dup.type;
      const mine = LEAVE_TYPES.find(lt=>lt.id===lf.type)?.label || lf.type;
      showToast(dup.type===lf.type
        ? `⚠ ${lf.date} の${lbl}は既に${dup.status}です`
        : `⚠ ${lf.date} は既に${lbl}が${dup.status}です。同じ日に${mine}は取れません`);
      return;
    }
    // [2026-04-29] 振替休日は holidayWorkId 必須（紐付かないと二重消化バグの原因に）
    if (lf.type === "furikae" && !lf.holidayWorkId) {
      showToast("⚠ 元の休日出勤日を選んでください");
      return;
    }
    // [2026-04-29] 有給・振替休日・休日出勤は自動承認（管理者には申請バナーで通知）
    const autoApprove = lf.type === "paid" || lf.type === "furikae" || lf.type === "holiday";
    // 休日出勤の場合は休日種別を自動セット
    const holidayType = lf.type === "holiday" ? getHolidayType(lf.date) : null;
    const entry={
      id:uid(), type:lf.type, date:lf.date, days:parseFloat(lf.days)||1,
      memo:lf.memo, holidayPref:lf.holidayPref,
      status: autoApprove ? "承認" : "申請中",
      appliedAt:new Date().toISOString(),
      holidayWorkId: lf.type==="furikae" ? (lf.holidayWorkId||null) : null,
      holidayType,
    };
    // DB保存を先に実行し、成功を確認してからUIを更新する（④ 不整合修正）
    // [2026-04-22] insertLeave が boolean を返すように変更済み
    const ok = await insertLeave(user.id, entry);
    if(!ok) { showToast(WRITE_ERROR_MSG); return; }
    const prev=leaveData[user.id]||[];
    setLeaveData(ld=>({...ld,[user.id]:[...prev,entry]}));
    setModal(null);
    setLf({type:"paid",date:todayStr(),days:"1",memo:"",holidayPref:"",holidayWorkId:""});
    showToast(autoApprove ? "✓ 承認されました" : "✓ 申請しました（管理者の承認待ち）");
  });

  const [attachNote, setAttachNote] = useState("");
  const [notifyOnAttach, setNotifyOnAttach] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const attachFileRef = useRef(null);
  // [2026-06-17] 図面データ。projectId をキーにした配列マップ。詳細展開時に api-gateway から取得。
  const [drawings, setDrawings] = useState({});
  const drawingFileRef = useRef(null);

  const submitNote = (projId) => withBusy(async() => {
    if(!attachNote.trim()) return;
    const note = {id:uid(),type:"note",text:attachNote,name:"",data:"",author:user.name,createdAt:new Date().toISOString()};
    const ok = await insertAttachment(projId, note);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,attachments:[...(p.attachments||[]),note]}:p));
    if(notifyOnAttach){
      const projName=projects.find(p=>p.id===projId)?.name||"";
      const ann={id:uid(),author:user.name,role:user.role,text:`【メモ追加｜${projName}】${attachNote.trim()}`,createdAt:new Date().toISOString(),readBy:[user.id]};
      const ok2=await insertAnnouncement(ann);
      if(ok2) setAnnouncements(prev=>[ann,...prev]);
    }
    setAttachNote(""); showToast(notifyOnAttach?"✓ メモを追加し、全員に通知しました":"✓ メモを追加しました");
  });

  const handleAttachFile = async(e, projId) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type==="application/pdf";
    if(!isImg && !isPdf) { showToast("写真またはPDFのみ対応です"); return; }
    if(file.size > 4*1024*1024) { showToast("4MB以下のファイルのみ対応です"); return; }
    try {
      // [2026-05-21] Storage アップロード方式に変更（DBにbase64を入れない）
      const base64Full = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("読込失敗"));r.readAsDataURL(file);});
      const b64Body = base64Full.split(",")[1] || "";
      const fileUrl = await uploadFieldPhoto(b64Body, file.name, file.type);
      if (!fileUrl) { showToast("アップロード失敗"); e.target.value=""; return; }
      const att = {id:uid(),type:isImg?"image":"pdf",name:file.name,text:"",fileUrl,data:"",author:user.name,createdAt:new Date().toISOString()};
      // [2026-04-22] DB保存を先に実行
      const ok = await insertAttachment(projId, att);
      if(!ok){ showToast(WRITE_ERROR_MSG); e.target.value=""; return; }
      setProjects(prev=>prev.map(p=>p.id===projId?{...p,attachments:[...(p.attachments||[]),att]}:p));
      if(notifyOnAttach){
        const projName=projects.find(p=>p.id===projId)?.name||"";
        const ann={id:uid(),author:user.name,role:user.role,text:`【${isImg?"写真":"PDF"}追加｜${projName}】${file.name}`,createdAt:new Date().toISOString(),readBy:[user.id]};
        const ok2=await insertAnnouncement(ann);
        if(ok2) setAnnouncements(prev=>[ann,...prev]);
      }
      showToast(notifyOnAttach?`✓ ${isImg?"写真":"PDF"}を追加し、全員に通知しました`:`✓ ${isImg?"写真":"PDF"}を追加しました`);
    } catch(err) { showToast("ファイルの添付に失敗しました"); }
    e.target.value="";
  };

  const deleteAttachment = async(projId, attId) => {
    // [2026-04-22] DB削除を先に実行
    const ok = await deleteAttachmentDB(attId);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setProjects(prev=>prev.map(p=>p.id===projId?{...p,attachments:(p.attachments||[]).filter(a=>a.id!==attId)}:p));
    showToast("削除しました");
  };

  // [2026-06-17] 図面データ：詳細展開時に取得
  const loadDrawings = async(projId) => {
    const rows = await listProjectDrawings(projId);
    if(rows) setDrawings(prev=>({...prev,[projId]:rows}));
  };
  const handleDrawingFile = async(e, projId) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type==="application/pdf";
    if(!isImg && !isPdf) { showToast("写真またはPDFのみ対応です"); e.target.value=""; return; }
    if(file.size > 4*1024*1024) { showToast("4MB以下のファイルのみ対応です"); e.target.value=""; return; }
    try {
      const fileData = await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("読込失敗"));r.readAsDataURL(file);});
      const d = {id:uid(),projectId:projId,fileName:file.name,fileType:isImg?"image":"pdf",fileData,uploadedBy:user.id,createdAt:new Date().toISOString()};
      const ok = await insertProjectDrawing(d);
      if(!ok){ showToast(WRITE_ERROR_MSG); e.target.value=""; return; }
      setDrawings(prev=>({...prev,[projId]:[...(prev[projId]||[]),d]}));
      showToast(`✓ 図面（${isImg?"画像":"PDF"}）を追加しました`);
    } catch(err) { showToast("図面の追加に失敗しました"); }
    e.target.value="";
  };
  const deleteDrawing = async(projId, drawingId) => {
    const ok = await deleteProjectDrawingDB(drawingId);
    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
    setDrawings(prev=>({...prev,[projId]:(prev[projId]||[]).filter(d=>d.id!==drawingId)}));
    showToast("削除しました");
  };
  // [2026-06-17] 案件詳細を開いたら図面データを取得（未取得のものだけ）
  useEffect(()=>{
    if(selectedId && drawings[selectedId]===undefined) loadDrawings(selectedId);
  },[selectedId]);

  const paidUsed = sid=>(leaveData[sid]||[]).filter(l=>l.type==="paid"&&l.status!=="却下").reduce((a,l)=>a+l.days,0);
  // leave_balancesから有給情報を取得（付与+繰越の合計）
  const getPaidInfo = sid => {
    const lb = leaveBalances.find(b=>b.staffId===sid&&b.type==="paid");
    if (!lb) return { granted:0, carried:0, total:0 };
    const granted = Number(lb.granted)||0, carried = Number(lb.carried)||0;
    return { granted, carried, total: granted + carried };
  };
  const paidInfo = user ? getPaidInfo(user.id) : { granted:0, carried:0, total:0 };
  const paidTotal = paidInfo.total;
  // [v16] 振休統計（shared.jsのcalcFurikaeStats使用）
  const getFurikaeStats = sid => calcFurikaeStats(sid, leaveData);
  const getFurikaeBalance = sid => calcFurikaeStats(sid, leaveData).total;
  // [v16] 振休期限アラート（shared.jsのgetFurikaeExpiryAlerts使用、期限14日以内）
  const getFurikaeAlerts = sid => getFurikaeExpiryAlerts(sid, leaveData);

  // [2026-09-29] 人工＝自社打刻＋補正人工＋応援人数（shared.js calcUsedMandays。管理画面と同じ）
  const calcNinkuFromLogs = (projId) => {
    const p = projects.find(x=>x.id===projId);
    return p ? calcUsedMandays(clockLogs, p).usedMandays : 0;
  };

  const userId = user?.id || "";
  const unreadHandoverCount = userId ? handoverMemos.filter(m=>m.author!==user.name&&!m.readBy.includes(userId)).length : 0;
  const unreadAnnCount = userId ? announcements.filter(a=>!a.readBy.includes(userId)).length : 0;

  // [2026-04-24] 打刻タブを3秒間見たら最近のアナウンスを自動既読
  useEffect(()=>{
    if(tab!=="打刻"||!user||unreadAnnCount===0) return;
    const timer=setTimeout(async()=>{
      const visible=announcements.slice(0,3).filter(a=>!a.readBy.includes(user.id));
      if(visible.length===0) return;
      for(const a of visible) await markAnnouncementRead(a.id, user.id);
      setAnnouncements(prev=>prev.map(a=>
        visible.find(v=>v.id===a.id)?{...a,readBy:[...a.readBy,user.id]}:a
      ));
    },3000);
    return ()=>clearTimeout(timer);
  },[tab,user?.id]);

  // [2026-04-24] Push通知: ログイン後にVAPID鍵取得＆購読状態チェック
  // [2026-04-28] 役員は打刻関連通知を受けないので Push 購読自体スキップ
  useEffect(()=>{
    if(!user||!("serviceWorker" in navigator)||!("PushManager" in window)) return;
    if(user.isExecutive) return;
    (async()=>{
      const perm = Notification.permission;
      if(perm==="denied"){ setPushStatus("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if(existing){ setPushStatus("subscribed"); return; }
      if(perm==="granted"){ setPushStatus("granted"); } else { setPushStatus("unknown"); }
      if(!vapidKey){ const k = await getVapidPublicKey(); if(k) setVapidKey(k); }
    })();
  },[user?.id]);

  const subscribePush = async () => {
    if(!vapidKey){ showToast("VAPID鍵の取得に失敗しました"); return; }
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      const { endpoint, keys: rawKeys } = sub.toJSON();
      const ok = await savePushSubscription(endpoint, rawKeys);
      if(ok){ setPushStatus("subscribed"); showToast("✓ Push通知を有効にしました"); }
      else showToast("Push通知の登録に失敗しました");
    } catch(e){ showToast("Push通知を許可してください"); setPushStatus(Notification.permission==="denied"?"denied":"unknown"); }
    finally{ setPushLoading(false); }
  };

  const unsubscribePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if(sub) await sub.unsubscribe();
      await deletePushSubscription();
      setPushStatus("unknown"); showToast("Push通知を無効にしました");
    } catch(e){ showToast("解除に失敗しました"); }
    finally{ setPushLoading(false); }
  };

  // [v14] AIチャット（ユーザー: 自分のデータのみ、1日20回制限）
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiTodayCount, setAiTodayCount] = useState(0);
  const AI_DAILY_LIMIT = 20;
  const runAiChat = async () => {
    if(!aiQuestion.trim()||aiLoading||aiTodayCount>=AI_DAILY_LIMIT) return;
    const q = aiQuestion.trim();
    setAiQuestion("");
    setAiMessages(prev=>[...prev,{role:"user",text:q}]);
    setAiLoading(true);
    try {
      // [v15] AIチャット拡充: 案件情報も渡して幅広い質問に対応
      const myLogs = clockLogs.filter(l=>l.userName===user.name);
      const mySummary = `出勤日数: ${myLogs.filter(l=>l.clockOut).length}日\n残業時間: ${sumOvertimeH(myLogs).toFixed(1)}h`;
      const myLeaves = leaveData[userId]||[];
      const leaveSummary = myLeaves.map(l=>`${l.type} ${l.date} ${l.status}`).join(", ")||"なし";
      // [2026-04-15] AI回答と休暇管理タブの有給残数が不一致だったバグ対策: 集計値を明示的に渡す
      const paidUsedCount = paidUsed(user.id);
      const paidRemain = paidTotal - paidUsedCount;
      const paidSummary = `付与${paidInfo.granted}日 + 繰越${paidInfo.carried}日 = 合計${paidTotal}日 / 使用済み${paidUsedCount}日 / 残り${paidRemain}日`;
      const myProjects = projects.filter(p=>p.status!=="完了").map(p=>`${p.name}(${p.status})`).join(", ")||"なし";
      const prompt = `以下はシンセイ工業のスタッフ「${user.name}」の情報です。本人からの質問に回答してください。仕事の疑問・悩み・アプリの使い方にも対応してください。他のスタッフの個人情報は教えないでください。\n\n【打刻データ】\n${mySummary}\n\n【有給残数（集計済み・この値をそのまま使用）】\n${paidSummary}\n\n【休暇申請履歴】\n${leaveSummary}\n\n【担当案件】\n${myProjects}\n\n【質問】${q}`;
      const resp = await callClaudeProxy({action:"ai_chat",prompt});
      if(!resp.ok) throw new Error("API応答エラー");
      const data = await resp.json();
      const answer = data.content?.[0]?.text || "回答を取得できませんでした";
      setAiMessages(prev=>[...prev,{role:"ai",text:answer}]);
      setAiTodayCount(prev=>prev+1);
      await insertAiChatLog(q, answer);
    } catch(e) { setAiMessages(prev=>[...prev,{role:"ai",text:"エラー: "+e.message}]); }
    setAiLoading(false);
  };

  // [v15] Instagram投稿
  const [instaTab, setInstaTab] = useState("作成");
  const [instaCategory, setInstaCategory] = useState("");
  const [instaSelections, setInstaSelections] = useState({});
  const [instaComment, setInstaComment] = useState("");
  const [instaImages, setInstaImages] = useState([]);
  const [instaMode, setInstaMode] = useState(""); // "manual" or "auto"
  const [instaCaption, setInstaCaption] = useState("");
  const [instaChecks, setInstaChecks] = useState([false,false,false]);
  const [instaPosts, setInstaPosts] = useState([]);
  const [instaSubmitting, setInstaSubmitting] = useState(false);
  const [instaRulesAgreed, setInstaRulesAgreed] = useState(false);
  const [instaMonthly, setInstaMonthly] = useState({manual:0,auto:0,total:0});

  // ── タブ定義 ──
  // [2026-05-07] 役員も現場出勤時に打刻して人工計算に載せたいので、打刻タブを全員表示に統一。
  //              push通知・アンケート強制・ログインポップアップ等の役員除外は維持
  // [2026-09-04] 役員（裕太）はアンケートの対象外。強制モーダル・ロックに加えてタブ自体も出さない。
  //   アンケートは経営側が現場に聞くものなので、出す側が回答者に混ざらないようにする（集計の母数からも外す）。
  // [2026-09-05] 研修タブも同じ扱い。研修が公開されていない間は出さない。
  // [2026-09-06] ただし研修は include_executives で研修ごとに役員参加を切り替える。
  //   社内研修①は役員(裕太)も回答する。アンケートは経営側が現場に聞くものなので従来どおり役員除外。
  const trainingApplies = !!training && (!user?.isExecutive || training.training.includeExecutives);

  // [2026-09-06] 自分が答えるべきアンケートの絞り込みを1か所にまとめる。
  //   除外は3種類あり、それぞれ意味が違う:
  //     surveyExempt      … スタッフ単位の恒久除外（管理者アカウント）
  //     exemptStaffIds    … そのアンケートだけの免除（大塚さん）
  //     isExecutive       … 役員。ただし includeExecutives が立つアンケートは対象に含める
  const meStaff = (staff||[]).find(x=>x.id===user?.id);
  const mySurveys = (surveys||[]).filter(s=>
    s.isActive
    && !(meStaff&&meStaff.surveyExempt)
    && !(s.exemptStaffIds||[]).includes(user?.id)
    && (!user?.isExecutive || s.includeExecutives)
  );

  // [2026-10-09] 人工の目安表は川畑さんだけ（サーバー側でも同じ判定）
  const canNinkuInput = String(user?.name||"").replace(/[\s　]/g,"").startsWith("川畑");
  const tabs = ["打刻","案件一覧","休暇管理","名刺","アンケート","研修","人工目安","AIチャット","車両","会社情報","ご意見箱"]
    .filter(t=>!(t==="アンケート" && mySurveys.length===0))
    .filter(t=>!(t==="研修" && !trainingApplies))
    .filter(t=>!(t==="人工目安" && !canNinkuInput));

  // [2026-09-05] 研修の締切を過ぎていて未完了なら、打刻以外をロックする（アンケートと同じ方式）。
  //   pastDeadline はサーバー時刻での判定。端末の日付を変えても回避できない。
  const trainingLocked = !!user && trainingApplies
    && training.pastDeadline && !training.completedAt;

  // [2026-09-04] 回答期限を過ぎた未回答アンケートがあると、打刻以外はロックする。
  //   打刻だけ通すのは、出勤しているのに打刻できないと労働時間の記録が残らず賃金台帳の根拠が消えるため。
  //   給与明細・有給申請・日報が使えない状態なので「全画面を消して終わり」にはならない。
  const surveyLocked = !!user && mySurveys.some(s=>
    s.deadline && todayStr() >= s.deadline &&
    !surveyResponses.find(r=>r.surveyId===s.id && r.staffId===user.id)
  );
  const visibleTabs = trainingLocked ? ["打刻","研修"]
                    : surveyLocked   ? ["打刻","アンケート"]
                    : tabs;
  // ロック中に許可外のタブを開いていたら打刻へ戻す（期限をまたいだセッション対策）
  useEffect(()=>{
    if((surveyLocked||trainingLocked) && !visibleTabs.includes(tab)) setTab("打刻");
  },[surveyLocked,trainingLocked,tab]);

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#e5e7eb",color:"#111827",fontFamily:"sans-serif"}}>読み込み中...</div>;

  if(loadErr) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#e5e7eb",color:"#ef4444",fontFamily:"sans-serif",padding:20,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:16}}>⚠️</div>
      <div style={{fontSize:14,marginBottom:8}}>接続エラー</div>
      <div style={{fontSize:12,color:"#6b7280",maxWidth:360}}>{loadErr}</div>
      <button onClick={()=>window.location.reload()} style={{marginTop:20,background:"#e5e7eb",color:"#111827",border:"1px solid #9ca3af",borderRadius:8,padding:"10px 24px",fontSize:13,cursor:"pointer"}}>再読み込み</button>
    </div>
  );

  if(!user) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#e5e7eb",fontFamily:"'Noto Sans JP',sans-serif",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{width:5,height:32,background:"linear-gradient(180deg,#f97316,#ef4444)",borderRadius:3,margin:"0 auto 12px"}}/>
        <div style={{fontSize:16,fontWeight:700,color:"#f97316",letterSpacing:"0.15em"}}>シンセイ工業</div>
        <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginTop:2}}>FIELD MANAGEMENT v16</div>
      </div>
      <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:16,padding:"28px 24px",width:"100%",maxWidth:320}}>
        <PinPad onSuccess={(s,token)=>{setUser(s);setSessionToken(token);saveSavedUser(s);}}/>
      </div>
      {/* [2026-04-28] 不具合時の復旧ボタン（廣野さん等のキャッシュ固着対策） */}
      <button onClick={async()=>{
        if(!window.confirm("キャッシュを全削除してアプリを再起動します。\nログイン情報も消えますがよろしいですか？")) return;
        try{
          if('serviceWorker' in navigator){
            const regs = await navigator.serviceWorker.getRegistrations();
            for(const r of regs) await r.unregister();
          }
          if(typeof caches!=='undefined'){
            const names = await caches.keys();
            for(const n of names) await caches.delete(n);
          }
          try{ localStorage.clear(); }catch(_){}
          try{ sessionStorage.clear(); }catch(_){}
        }catch(e){}
        window.location.replace("/user?reset="+Date.now());
      }} style={{marginTop:16,background:"transparent",color:"#111827",border:"1px solid #d1d5db",borderRadius:8,padding:"8px 16px",fontSize:10,cursor:"pointer"}}>🧹 アプリの調子が悪い時はここを押す</button>
    </div>
  );

  return (
    <div style={{fontFamily:"'Noto Sans JP',sans-serif",minHeight:"100vh",background:"#e5e7eb",color:"#111827",maxWidth:480,margin:"0 auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet"/>

      {toast&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",background:toast.startsWith("⚠")?"#f59e0b":"#22c55e",color:"#000",fontWeight:700,padding:"8px 20px",borderRadius:30,fontSize:12,zIndex:9999,whiteSpace:"nowrap",maxWidth:"90vw",overflow:"hidden",textOverflow:"ellipsis"}}>{toast}</div>}

      {/* [2026-09-05] 社内研修①の全画面。z-index 9000 はアンケートと同じ。
            締切前 = 下部の「あとで書く」で閉じられる（打刻に進める）。
            締切後 = 出口を消し、タブも打刻と研修だけに絞る。打刻を通すのは
            出勤しているのに打刻できないと労働時間の記録が残らないため。 */}
      {(()=>{
        if (!user || !trainingApplies) return null;       // 役員参加は研修側のフラグで決まる
        // [2026-09-20] 完了者には自動では出さない。ただし trainingReview=true の間は出す。
        //   以前は完了した瞬間にここで null になり、ミニ教材と締めを読む前に画面が消えていた。
        //   研修タブの「もう一度見る」も同じ条件に引っかかって何も開かなかった。
        if (training.completedAt && !trainingReview) return null;
        if (!trainingReview) {
          if (trainingDismissed && !training.pastDeadline) return null;
          if (trainingDismissed && training.pastDeadline && tab === "打刻") return null;
          if (tab === "研修") return null;                 // タブから開いた時は下のタブ側で描く
        }
        return (
          <TrainingFlow
            data={training}
            onReload={reloadTraining}
            onCompleted={()=>setTrainingReview(true)}
            canExit={!training.pastDeadline}
            onExit={()=>{ setTrainingReview(false); setTrainingDismissed(true); if(training.pastDeadline) setTab("打刻"); }}
            showToast={showToast}
          />
        );
      })()}

      {/* [2026-04-28] 未回答アンケート強制モーダル — 役員以外は回答するまで他操作不可
           [2026-04-29] state ベースに書き換え。全質問入力完了まで送信ボタン disabled
           [2026-07-21] 期限付きアンケートは期限内なら強制しない（ログインポップアップで任意回答）。
                        期限を過ぎたら従来通り強制モーダル化
           [2026-09-04] 期限内・期限後ともに全画面で出す方式に統一。違いは「出口があるかどうか」だけ。
                        期限内 = 下部の「あとで書く」で閉じられる／期限日以降 = 打刻にだけ進める。
                        閉じてもリロードのたびに再表示される（surveyDismissed は state なので永続しない）。 */}
      {(()=>{
        if (!user) return null;
        if (surveyDismissed) return null;
        const _today = todayStr();
        // [2026-09-06] 対象判定は mySurveys に集約（恒久除外・個別免除・役員参加をまとめて反映）
        const unanswered = mySurveys.filter(s=>
          !surveyResponses.find(r=>r.surveyId===s.id && r.staffId===user.id));
        if (unanswered.length === 0) return null;
        // [2026-09-04] 設問ごとの最低文字数(q.minChars)。未設定の設問は従来通り1文字以上でOK。
                            //   アプリ全体の一律ルールにしないのは、日程回答のような短くて正しい答えを弾かないため。
                            const minOf = q => Number(q&&q.minChars)||0;
                            const isFilled = (v,q) => { const t=String(v==null?"":v).trim(); return t!=="" && t.length>=minOf(q); };
        // 期限内（締切日より前）のアンケートしか無ければ「あとで書く」を出す。
        // 1件でも期限切れ・期限なしが混ざっていたら出口を消す（そちらは回答必須のため）。
        const graceOnly = unanswered.every(s=>s.deadline && _today < s.deadline);
        const nearestDeadline = unanswered.map(s=>s.deadline).filter(Boolean).sort()[0] || null;
        const daysLeft = nearestDeadline ? Math.max(Math.ceil((new Date(nearestDeadline+"T00:00:00")-new Date(_today+"T00:00:00"))/86400000),0) : 0;
        return (
          <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:9000,overflowY:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{maxWidth:480,width:"100%"}}>
              <div style={{textAlign:"center",marginBottom:16,paddingTop:20}}>
                <div style={{fontSize:32,marginBottom:8}}>📝</div>
                <div style={{fontSize:18,fontWeight:700,color:"#22c55e",marginBottom:6}}>{graceOnly?"アンケートのお願い":"未回答のアンケートがあります"}</div>
                <div style={{fontSize:11,color:"#4b5563"}}>{graceOnly?`回答は締切まで書き直せます（残り ${unanswered.length} 件）`:`回答するまで打刻以外は使えません（残り ${unanswered.length} 件）`}</div>
              </div>
              {/* [2026-09-04] 導入文。なぜ聞くのかを先に読ませないと身構えられるので、設問より前に出す */}
              {unanswered.map(s=>s.intro?(
                <div key={"intro_"+s.id} style={{background:"#fafafa",border:"1px solid #22c55e44",borderRadius:12,padding:"16px 18px",marginBottom:12,fontSize:13,lineHeight:1.9,color:"#374151",whiteSpace:"pre-wrap"}}>{s.intro}</div>
              ):null)}
              {unanswered.map(s=>{
                const ans = surveyAnswers[s.id] || {};
                const totalQ = (s.questions||[]).length;
                const filledQ = (s.questions||[]).filter((q,qi)=>isFilled(ans[qi],q)).length;
                const allAnswered = filledQ === totalQ && totalQ > 0;
                const remaining = totalQ - filledQ;
                return (
                <div key={s.id} style={{background:"#fafafa",border:"1px solid #22c55e44",borderRadius:12,padding:"16px",marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#111827",flex:1}}>{s.title}</div>
                    <span style={{fontSize:10,color:allAnswered?"#22c55e":"#f59e0b",background:allAnswered?"#f0fdf4":"#fef3c7",border:`1px solid ${allAnswered?"#22c55e44":"#f59e0b44"}`,borderRadius:4,padding:"2px 8px",whiteSpace:"nowrap"}}>{filledQ}/{totalQ} 回答</span>
                  </div>
                  {(s.questions||[]).map((q,qi)=>{
                    const v = ans[qi];
                    const filled = isFilled(v,q);
                    return (
                    <div key={qi} style={{marginBottom:16}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:4,lineHeight:1.6}}>
                        Q{qi+1}. {q.text} {!filled && <span style={{color:"#f59e0b",fontWeight:700,fontSize:11}}>* 必須</span>}
                      </div>
                      {/* [2026-09-04] 設問の補足文。「立派なことでなくて大丈夫」等、書き出しのハードルを下げる一言 */}
                      {q.note&&<div style={{fontSize:11,color:"#6b7280",marginBottom:8,lineHeight:1.7}}>※{q.note}</div>}
                      {q.type==="text"&&(
                        // [2026-09-04] 自由記述は textarea に変更（1行 input だと長文が書きにくい）。
                        //   fontSize は 16 未満にしない — iOS が入力時に勝手に拡大して画面がずれるため。
                        <textarea value={v||""} rows={4}
                          onChange={e=>setSurveyAnswers(p=>({...p,[s.id]:{...(p[s.id]||{}),[qi]:e.target.value}}))}
                          style={{...IS,fontSize:16,padding:"11px 12px",lineHeight:1.7,resize:"vertical",minHeight:96,borderColor:filled?"#d1d5db":"#f59e0b66"}}/>
                      )}
                      {/* [2026-09-04] 文字数カウンタ。最低文字数が設定された設問だけ出す。
                            残りが見えないと、送信ボタンが押せない理由が分からず手が止まる */}
                      {q.type==="text"&&minOf(q)>0&&(()=>{
                        const len=String(v==null?"":v).trim().length;
                        const ok=len>=minOf(q);
                        return <div style={{fontSize:11,color:ok?"#22c55e":"#f59e0b",marginTop:4,textAlign:"right"}}>{ok?(len+"文字 ✓"):(len+" / "+minOf(q)+"文字（あと"+(minOf(q)-len)+"文字）")}</div>;
                      })()}
                      {q.type==="select"&&(
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {(q.options||[]).map((opt,oi)=>{
                            const sel = v === opt;
                            return (
                              <button key={oi} type="button"
                                onClick={()=>setSurveyAnswers(p=>({...p,[s.id]:{...(p[s.id]||{}),[qi]:opt}}))}
                                style={{background:sel?"#22c55e":"#e5e7eb",border:`1px solid ${sel?"#22c55e":"#d1d5db"}`,borderRadius:6,color:sel?"#000":"#111827",padding:"7px 13px",fontSize:12,fontWeight:sel?700:400,cursor:"pointer"}}>{opt}</button>
                            );
                          })}
                        </div>
                      )}
                    </div>);
                  })}
                  <button disabled={busy||!allAnswered} onClick={()=>withBusy(async()=>{
                    // 念のため再バリデーション
                    const cur = surveyAnswers[s.id] || {};
                    const missing = (s.questions||[]).filter((q,qi)=>!isFilled(cur[qi],q));
                    if(missing.length>0){ showToast("未回答、または文字数が足りない質問があります"); return; }
                    const ok=await submitSurveyResponse(s.id,cur);
                    if(!ok){return;}
                    const fresh=await loadSurveyResponses();
                    setSurveyResponses(fresh||[]);
                    // 送信成功した分は state からクリア
                    setSurveyAnswers(p=>{ const cp={...p}; delete cp[s.id]; return cp; });
                    showToast("✓ 回答しました");
                  })} style={{width:"100%",background:(busy||!allAnswered)?"#e5e7eb":"linear-gradient(135deg,#22c55e,#16a34a)",color:(busy||!allAnswered)?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:(busy||!allAnswered)?"not-allowed":"pointer",marginTop:6}}>
                    {busy?"送信中…":(!allAnswered?`あと ${remaining} 問`:"このアンケートに回答する")}
                  </button>
                </div>);
              })}
              {/* [2026-09-04] 出口。オレンジのボタンにはせず、画面最下部の小さい文字リンクに留める。
                    期限内 = 「あとで書く」（残り日数を必ず添えて、押すたびに締切が目に入るように）
                    期限日以降 = 打刻にだけ進める（出勤しているのに打刻できないと労働時間の記録が残らないため） */}
              <div style={{textAlign:"center",padding:"6px 0 28px"}}>
                <button onClick={()=>{ setSurveyDismissed(true); if(!graceOnly) setTab("打刻"); }}
                  style={{background:"transparent",border:"none",color:"#9ca3af",fontSize:12,textDecoration:"underline",cursor:"pointer",padding:"12px 16px"}}>
                  {graceOnly ? `あとで書く（締切まであと${daysLeft}日）` : "打刻だけする（他の画面は使えません）"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* [2026-07-07] 強制進捗報告モーダル — 役員以外、今日が顧客の進捗確認日で、
           自分が打刻したことのある案件は報告するまで他操作不可（アンケートと同じ強制方式）。
           z-index 8900 = アンケート(9000)・未退勤(9100)より下。上位を片付けた後に表示される */}
      {(()=>{
        if (!user || user.isExecutive) return null;
        const required = getForcedProgressRequests(user, customers, projects, progressReports, clockLogs, new Date(), progressRequestAllAt);
        if (required.length === 0) return null;
        return (
          <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:8900,overflowY:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{maxWidth:480,width:"100%"}}>
              <div style={{textAlign:"center",marginBottom:20,paddingTop:20}}>
                <div style={{fontSize:32,marginBottom:8}}>📊</div>
                <div style={{fontSize:18,fontWeight:700,color:"#f97316",marginBottom:6}}>進捗報告をお願いします</div>
                <div style={{fontSize:11,color:"#4b5563"}}>{required.every(x=>x.checkType==="一斉確認")?"会社から進捗の確認依頼が来ています。":"今日は進捗確認日です。"}すべて報告しないと他の画面に進めません（残り {required.length} 件）</div>
              </div>
              {required.map(item=>{
                const {project:p,customer:c,checkType,lastReport}=item;
                const ans = forcedProgress[p.id] || {};
                const pct = ans.percent ?? (lastReport?.percent ?? 50);
                const comment = ans.comment ?? "";
                const confirming = forcedConfirmId === p.id;
                return (
                <div key={p.id} style={{background:"#fafafa",border:"1px solid #f9731644",borderRadius:12,padding:"16px",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#b45309"}}>{c.name}</div>
                  <div style={{fontSize:13,color:"#111827",marginTop:2,marginBottom:4}}>{p.name}</div>
                  <div style={{fontSize:9,color:"#6b7280",marginBottom:12}}>
                    {checkType==="客先共有"?"🔵 客先共有日":checkType==="一斉確認"?"📣 会社からの確認依頼":"🔒 内部確認日"}
                    {lastReport&&` ／ 前回 ${lastReport.percent}% (${dateStrJST(lastReport.reportedAt)})`}
                    {p.status==="完了"&&" ／ ✅完了済"}
                  </div>
                  <div style={{fontSize:11,color:"#6b7280",marginBottom:4}}>進捗 <span style={{fontWeight:700,color:"#f97316",fontSize:15,fontFamily:"'JetBrains Mono',monospace"}}>{pct}%</span></div>
                  <input type="range" min="0" max="100" step="10" value={pct} disabled={confirming||savingReport}
                    onChange={e=>setForcedProgress(prev=>({...prev,[p.id]:{percent:Number(e.target.value),comment}}))}
                    style={{width:"100%",accentColor:"#f97316"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#9ca3af",marginTop:2,marginBottom:10}}>
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                  <textarea value={comment} disabled={confirming||savingReport}
                    onChange={e=>setForcedProgress(prev=>({...prev,[p.id]:{percent:pct,comment:e.target.value}}))}
                    placeholder="コメント（任意）例: 配管保温完了、来週ラッキング開始" rows={2}
                    style={{...IS,resize:"vertical",fontSize:12,padding:"8px 10px",marginBottom:8}}/>
                  {!confirming ? (
                    <button onClick={()=>setForcedConfirmId(p.id)} disabled={savingReport}
                      style={{width:"100%",background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#000",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>
                      この内容で報告する（{pct}%）
                    </button>
                  ) : (
                    <div style={{background:"#fff7ed",border:"1px solid #f9731666",borderRadius:8,padding:"10px"}}>
                      <div style={{fontSize:11,color:"#b45309",fontWeight:700,marginBottom:8,lineHeight:1.5}}>⚠ 進捗 {pct}% で送信します。送信後は修正できません。よろしいですか？</div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setForcedConfirmId(null)} disabled={savingReport}
                          style={{flex:1,background:"#e5e7eb",color:"#4b5563",border:"1px solid #d1d5db",borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>戻る</button>
                        <button disabled={savingReport} onClick={async()=>{
                          if(savingReport) return;
                          setSavingReport(true);
                          try {
                            const rep={id:uid(),projectId:p.id,customerId:c.id,percent:pct,comment};
                            const res=await saveProgressReport(rep);
                            if(res?.error){showToast("⚠ 送信失敗: "+res.error);setSavingReport(false);return;}
                            const fresh=await loadProgressReports();
                            setProgressReports(fresh||[]);
                            setForcedProgress(prev=>{const cp={...prev};delete cp[p.id];return cp;});
                            setForcedConfirmId(null);
                            showToast("✓ 進捗を報告しました");
                          } catch(e){showToast("⚠ 送信失敗: "+e.message);}
                          finally{setSavingReport(false);}
                        }} style={{flex:2,background:savingReport?"#e5e7eb":"linear-gradient(135deg,#f97316,#ef4444)",color:savingReport?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"10px",fontSize:12,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>
                          {savingReport?"送信中…":"📤 送信する"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>);
              })}
            </div>
          </div>
        );
      })()}

      {/* [2026-06-29] 未退勤(前日以前の退勤打刻忘れ)の強制解消モーダル — 役員以外は退勤時刻を入れるまで他操作不可。
           通知だけだと無視されるため「やらせる」方式。本人が前日分でも退勤時刻を入力できる導線も兼ねる。
           退勤時刻は現場標準の17:00をデフォルト表示して微調整可。 */}
      {(()=>{
        if (!user || user.isExecutive) return null;
        // 自分の打刻で、退勤未入力のもの。
        //   日勤: 「今日ではない日」＝打刻忘れで日付を跨いだ分（従来どおり）
        //   夜勤: 日付をまたぐのが正常なため、24時間を超えても未退勤の分だけを打刻忘れとして検出
        //         （稼働中の夜勤は誤って強制モーダルに出さない）
        const stuck = clockLogs
          .filter(l=>{
            if (l.userId!==user.id || l.clockOut || !l.clockIn) return false;
            if (l.isNightShift) return (Date.now()-new Date(l.clockIn).getTime()) > 24*3600000;
            return !isSameLocalDay(l.clockIn);
          })
          .sort((a,b)=>new Date(a.clockIn)-new Date(b.clockIn));
        if (stuck.length === 0) return null;
        const fmtDate = iso => { const d=new Date(iso); return `${d.getMonth()+1}/${d.getDate()}`; };
        const resolveOne = (log) => withBusy(async()=>{
          const night = !!log.isNightShift;
          const hhmm = clockoutFixEdits[log.id] || (night?"06:00":"17:00");
          const [hh,mm] = hhmm.split(":").map(Number);
          const H = Number.isFinite(hh)?hh:(night?6:17);
          const M = Number.isFinite(mm)?mm:0;
          const inD = new Date(log.clockIn);
          let outD = new Date(inD.getFullYear(), inD.getMonth(), inD.getDate(), H, M, 0, 0);
          // [2026-07-13] 夜勤は日付をまたぐため、入力時刻が出勤以前なら翌日として記録
          if (night && outD.getTime() <= inD.getTime()) outD = new Date(outD.getTime()+24*3600000);
          if (outD.getTime() <= inD.getTime()) { showToast("⚠ 退勤時刻は出勤より後にしてください"); return; }
          const iso = outD.toISOString();
          const ok = await updateClockOut(log.id, iso, null, log.locationName||"");
          if(!ok){ showToast(WRITE_ERROR_MSG); return; }
          setClockLogs(prev=>prev.map(l=>l.id===log.id?{...l,clockOut:iso}:l));
          setClockoutFixEdits(p=>{ const cp={...p}; delete cp[log.id]; return cp; });
          showToast("✓ 退勤を記録しました");
        });
        return (
          <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:9100,overflowY:"auto",padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{maxWidth:480,width:"100%"}}>
              <div style={{textAlign:"center",marginBottom:20,paddingTop:20}}>
                <div style={{fontSize:32,marginBottom:8}}>⏰</div>
                <div style={{fontSize:18,fontWeight:700,color:"#f59e0b",marginBottom:6}}>退勤打刻が抜けています</div>
                <div style={{fontSize:11,color:"#4b5563"}}>退勤時刻を入力しないと先に進めません（残り {stuck.length} 件）</div>
              </div>
              {stuck.map(log=>{
                const proj = projects.find(p=>p.id===log.projectId);
                const night = !!log.isNightShift;
                const hhmm = clockoutFixEdits[log.id] || (night?"06:00":"17:00");
                return (
                  <div key={log.id} style={{background:"#fafafa",border:"1px solid #f59e0b44",borderRadius:12,padding:"16px",marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:4}}>{night&&<span style={{color:"#6366f1"}}>🌙 </span>}{fmtDate(log.clockIn)} {proj?.name||"現場"}</div>
                    <div style={{fontSize:11,color:"#6b7280",marginBottom:12}}>出勤 {timeStr(log.clockIn)} → 退勤が未入力です</div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:night?6:12}}>
                      <span style={{fontSize:12,color:"#374151"}}>退勤時刻</span>
                      <input type="time" value={hhmm} onChange={e=>setClockoutFixEdits(p=>({...p,[log.id]:e.target.value}))}
                        style={{fontSize:18,fontWeight:700,padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",color:"#111827",fontFamily:"'JetBrains Mono',monospace"}}/>
                      <span style={{fontSize:10,color:"#9ca3af"}}>{night?"翌朝可":"標準17:00"}</span>
                    </div>
                    {night&&<div style={{fontSize:10,color:"#6366f1",marginBottom:8,lineHeight:1.5}}>🌙 夜勤: 出勤時刻より前の時刻は「翌日」として記録されます（例 18:00→翌6:00）</div>}
                    {night&&(()=>{
                      // [2026-07-14] 夜勤の退勤修正プレビュー: resolveOne と同じ計算で実働・翌表示を確定前に表示
                      const [hh,mm]=hhmm.split(":").map(Number);
                      const H=Number.isFinite(hh)?hh:6, M=Number.isFinite(mm)?mm:0;
                      const inD=new Date(log.clockIn);
                      let outD=new Date(inD.getFullYear(),inD.getMonth(),inD.getDate(),H,M,0,0);
                      if(outD.getTime()<=inD.getTime()) outD=new Date(outD.getTime()+24*3600000);
                      const wh=(outD-inD)/3600000;
                      const cross=!isSameLocalDay(outD.toISOString(),inD);
                      return <div style={{fontSize:12,color:"#4f46e5",background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"8px 10px",marginBottom:12,fontWeight:700}}>退勤 {cross?"翌":""}{hhmm} ／ 実働 {wh.toFixed(1)}h{wh>=16&&<span style={{color:"#ef4444"}}> ⚠ 長時間です。時刻を確認してください</span>}</div>;
                    })()}
                    <button disabled={busy} onClick={()=>resolveOne(log)}
                      style={{width:"100%",background:busy?"#e5e7eb":"linear-gradient(135deg,#f59e0b,#ea580c)",color:busy?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:busy?"not-allowed":"pointer"}}>
                      {busy?"記録中…":"この日の退勤を記録する"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── ログイン後ポップアップ ── */}
      {loginPopups.length > 0 && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:250,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"#fafafa",border:"1px solid #d1d5db",borderRadius:"16px 16px 0 0",width:"100%",maxWidth:520,padding:"20px 20px 40px",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f97316",marginBottom:16}}>📬 お知らせ</div>
            {loginPopups.map((popup, pi) => (
              <div key={pi} style={{marginBottom:16}}>
                {popup.type==="handover" && (
                  <div style={{background:"#eff6ff",border:"1px solid #60a5fa33",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#60a5fa",marginBottom:10}}>📋 未読の引継ぎメモ ({popup.count}件)</div>
                    {popup.memos.map(m=>(
                      <div key={m.id} style={{background:"#fafafa",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                        <div style={{fontSize:10,color:"#111827",marginBottom:4}}>{m.author} · {m.createdAt?.slice(5,10).replace("-","/")} · {projects.find(p=>p.id===m.projectId)?.name||"不明"}</div>
                        <div style={{fontSize:13,color:"#374151"}}>{m.text}</div>
                      </div>
                    ))}
                    <button onClick={()=>markAllRead("handover")} style={{width:"100%",background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa44",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:8}}>既読にする</button>
                  </div>
                )}
                {popup.type==="announcement" && (
                  <div style={{background:"#fef3c7",border:"1px solid #f9731633",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#f97316",marginBottom:10}}>📢 アナウンス ({popup.count}件)</div>
                    {popup.items.map(a=>(
                      <div key={a.id} style={{background:"#fafafa",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                        <div style={{fontSize:10,color:"#111827",marginBottom:4}}>{a.author} · {a.createdAt?.slice(5,10).replace("-","/")}</div>
                        <div style={{fontSize:13,color:"#374151"}}>{a.text}</div>
                      </div>
                    ))}
                    <button onClick={()=>markAllRead("announcement")} style={{width:"100%",background:"#fef3c7",color:"#f97316",border:"1px solid #f9731644",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:8}}>既読にする</button>
                  </div>
                )}
                {/* [2026-09-04] アンケートのログインポップアップは廃止（全画面モーダルに一本化）。 */}
                {/* [v15] 振休期限アラート */}
                {popup.type==="furikae_alert" && (
                  <div style={{background:"#fef3c7",border:"1px solid #f59e0b33",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:10}}>⏰ 振休の期限が近づいています</div>
                    {popup.items.map((a,i)=>(
                      <div key={i} style={{background:"#fafafa",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                        <div style={{fontSize:13,color:"#f59e0b"}}>休日出勤日: {a.date}</div>
                        <div style={{fontSize:11,color:"#6b7280"}}>期限: {a.expiryDate}（あと{a.daysLeft}日）</div>
                      </div>
                    ))}
                    <button onClick={()=>setLoginPopups(prev=>prev.filter(p=>p.type!=="furikae_alert"))} style={{width:"100%",background:"#2a2a0a",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:8}}>確認しました</button>
                  </div>
                )}
                {/* [2026-04-20] 車両メンテナンスアラート */}
                {popup.type==="vehicle_alert" && (
                  <div style={{background:"#fef3c7",border:"1px solid #f9731633",borderRadius:10,padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#f97316",marginBottom:10}}>🚗 担当車両のメンテナンス通知</div>
                    {popup.items.map((a,i)=>{
                      const color = a.type==="oil" ? "#22c55e" : (a.severity==="expired"?"#ef4444":a.severity==="warn"?"#f97316":"#60a5fa");
                      let title="", detail="";
                      if(a.type==="oil"){
                        title = `🛢 ${a.vehicleName}：オイル交換時期`;
                        detail = `前回交換から ${a.daysSince}日経過（${a.lastDate}）`;
                        if(a.elementDue) detail += `／🔧 今回はエレメント交換の時期です`;
                      } else {
                        if(a.severity==="expired"){title=`🔴 ${a.vehicleName}：車検期限切れ`;detail=`車検日 ${a.inspectionDate}（${-a.daysUntil}日前に期限切れ）`;}
                        else if(a.severity==="warn"){title=`🚨 ${a.vehicleName}：車検間近`;detail=`車検日 ${a.inspectionDate}（あと ${a.daysUntil}日）`;}
                        else {title=`🛠 ${a.vehicleName}：車検近づいています`;detail=`車検日 ${a.inspectionDate}（あと ${a.daysUntil}日）`;}
                      }
                      return (
                        <div key={i} style={{background:"#fafafa",borderRadius:8,padding:"10px 12px",marginBottom:6,borderLeft:`3px solid ${color}`}}>
                          <div style={{fontSize:12,fontWeight:700,color}}>{title}</div>
                          <div style={{fontSize:11,color:"#4b5563",marginTop:2}}>{detail}</div>
                          {a.dismissKey&&(
                            <button onClick={()=>{try{localStorage.setItem(a.dismissKey, todayStr());}catch{}; setLoginPopups(prev=>prev.map(p=>p.type==="vehicle_alert"?{...p,items:p.items.filter((_,idx)=>idx!==i)}:p).filter(p=>p.type!=="vehicle_alert"||p.items.length>0));}} style={{marginTop:6,background:"#e5e7eb",color:"#4b5563",border:"1px solid #d1d5db",borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer"}}>10日後に再通知</button>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={()=>setLoginPopups(prev=>prev.filter(p=>p.type!=="vehicle_alert"))} style={{width:"100%",background:"#fef3c7",color:"#f97316",border:"1px solid #f9731644",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",marginTop:8}}>確認しました</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 車検アラートバナー（担当車両・1ヶ月以内） */}
      {(()=>{
        const now=new Date();const limit=new Date(now.getTime()+30*86400000);
        const soon=vehicles.filter(v=>{if(!v.inspectionDate||v.assignedStaffId!==user.id)return false;const d=new Date(v.inspectionDate);return d>=now&&d<=limit;});
        if(soon.length===0)return null;
        return (
          <div style={{background:"linear-gradient(90deg,#fef2f2,#fef2f2)",borderBottom:"2px solid #ef4444",padding:"10px 14px",color:"#fecaca"}}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:4,color:"#f87171"}}>🚗 車検が近い車両</div>
            {soon.map(v=>{const days=Math.ceil((new Date(v.inspectionDate)-now)/86400000);return(
              <div key={v.id} style={{fontSize:11,padding:"2px 0"}}>
                <span style={{color:"#fca5a5",fontWeight:700}}>{v.name}</span>
                <span style={{color:"#6b7280",marginLeft:8}}>{v.inspectionDate} ({days}日後)</span>
              </div>
            );})}
          </div>
        );
      })()}

      {/* HEADER */}
      <div style={{background:"#fafafa",borderBottom:"1px solid #e5e7eb",padding:"10px 14px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:4,height:20,background:"linear-gradient(180deg,#f97316,#ef4444)",borderRadius:2}}/>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:"0.12em"}}>シンセイ工業</div>
              <div style={{fontSize:9,color:"#111827"}}>FIELD MANAGEMENT v16</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{background:"#fafafa",border:"1px solid #d1d5db",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#111827"}}>
              {user.name}
            </div>
            <button onClick={()=>{sbServerLogout();setUser(null);setSessionToken(null);saveSavedUser(null);window.location.href="/";}} style={{background:"transparent",border:"1px solid #d1d5db",borderRadius:6,color:"#111827",padding:"4px 8px",cursor:"pointer",fontSize:10}}>退出</button>{/* [2026-05-07] Phase 2.1: ページ遷移で state 残留を消す */}
          </div>
        </div>
        <div style={{display:"flex",gap:3}}>
          {/* [2026-09-04] 期限切れアンケートが未回答の間は打刻・アンケートの2つだけ表示 */}
          {visibleTabs.map(t=>(
            <button key={t} onClick={()=>handleTabChange(t)} style={{flex:1,background:tab===t?"#f97316":"#ffffff",color:tab===t?"#000":"#1f2937",border:"1px solid",borderColor:tab===t?"#f97316":"#9ca3af",borderRadius:6,padding:"6px 0",fontSize:10,fontWeight:700,cursor:"pointer",transition:"all 0.15s",position:"relative"}}>
              {t}
              {t==="打刻"&&(unreadHandoverCount+unreadAnnCount)>0&&(
                <span style={{position:"absolute",top:-5,right:-4,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:8,lineHeight:"14px",minWidth:14,textAlign:"center"}}>
                  {unreadHandoverCount+unreadAnnCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 打刻タブ ═══ */}
      {/* [2026-04-27] 役員は打刻関連を非表示 */}
      {tab==="打刻"&&( /* [2026-05-07] 役員でも打刻可 */
        <div style={{padding:16}}>
          {/* [2026-10-19] 夏（5〜9月）は熱中症の手順を打刻タブにも出す */}
          {(()=>{const m=new Date().getMonth()+1;return m>=5&&m<=9;})()&&<HeatGuide/>}
          {/* [2026-04-24] Push通知バナー */}
          {pushStatus==="unknown"&&vapidKey&&(
            <div style={{background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#60a5fa"}}>🔔 Push通知を有効にする</div>
                <div style={{fontSize:10,color:"#111827",marginTop:2}}>アナウンスをスマホに即通知</div>
              </div>
              <button onClick={subscribePush} disabled={pushLoading} style={{background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",border:"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                {pushLoading?"…":"許可する"}
              </button>
            </div>
          )}
          {pushStatus==="subscribed"&&(
            <div style={{background:"#f0fdf4",border:"1px solid #22c55e44",borderRadius:10,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,color:"#22c55e"}}>🔔 Push通知 有効</span>
              <button onClick={unsubscribePush} disabled={pushLoading} style={{background:"transparent",border:"1px solid #d1d5db",color:"#111827",borderRadius:6,padding:"3px 8px",fontSize:9,cursor:"pointer"}}>解除</button>
            </div>
          )}
          {pushStatus==="denied"&&(
            <div style={{background:"#fef2f2",border:"1px solid #ef444433",borderRadius:10,padding:"8px 14px",marginBottom:12}}>
              <span style={{fontSize:10,color:"#ef4444"}}>🔕 Push通知がブロックされています。ブラウザ設定から許可してください。</span>
            </div>
          )}
          {/* [2026-04-21] 個人メモ（本人のみ） */}
          <div style={{background:"#fafafa",border:"1px solid #a78bfa33",borderRadius:10,marginBottom:16,overflow:"hidden"}}>
            <div onClick={()=>setMemoOpen(o=>!o)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",cursor:"pointer"}}>
              <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,letterSpacing:"0.1em"}}>📓 マイメモ（本人のみ表示）</div>
              <span style={{fontSize:11,color:"#111827"}}>{memoOpen?"▲ 閉じる":"▼ 開く"}</span>
            </div>
            {memoOpen&&(
              <div style={{padding:"0 14px 12px"}}>
                <textarea
                  value={personalMemo}
                  onChange={e=>setPersonalMemo(e.target.value)}
                  onBlur={async()=>{ const r=await updatePersonalMemo(personalMemo); if(r?.ok) showToast("✓ メモ保存"); }}
                  placeholder="自由に書き込めます。他のスタッフ・管理者には見えません。"
                  rows={6}
                  style={{...IS,resize:"vertical",fontSize:12,lineHeight:1.6}}
                />
              </div>
            )}
          </div>
          <div style={{background:"#fafafa",border:"1px solid #f9731633",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#f97316",letterSpacing:"0.1em",marginBottom:8}}>📢 アナウンスを送る</div>
            <div style={{display:"flex",gap:8}}>
              <input type="text" value={annText} onChange={e=>setAnnText(e.target.value)} placeholder="全員に伝えたいことを入力…" style={{...IS,flex:1,padding:"8px 10px",fontSize:12}}/>
              <button onClick={submitAnnouncement} disabled={busy||!annText.trim()} style={{background:!busy&&annText.trim()?"linear-gradient(135deg,#f97316,#ef4444)":"#e5e7eb",color:!busy&&annText.trim()?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:!busy&&annText.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>{busy?"送信中…":"送信"}</button>
            </div>
          </div>

          {/* [2026-10-19] 自分で消したアナウンスは出さない */}
          {announcements.filter(a=>!(a.hiddenBy||[]).includes(user.id)).slice(0,5).length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:"#111827",letterSpacing:"0.1em"}}>■ 最近のアナウンス</span>
                  {unreadAnnCount>0&&<span style={{background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8}}>NEW {unreadAnnCount}</span>}
                </div>
                {unreadAnnCount>0&&(
                  <button onClick={()=>markAllRead("announcement")} style={{background:"transparent",border:"1px solid #d1d5db",borderRadius:6,padding:"2px 8px",fontSize:9,color:"#6b7280",cursor:"pointer"}}>全て既読</button>
                )}
              </div>
              {announcements.filter(a=>!(a.hiddenBy||[]).includes(user.id)).slice(0,5).map(a=>{
                const isUnread=!a.readBy.includes(user.id);
                return(
                <div key={a.id} style={{background:isUnread?"#fef3c7":"#fafafa",border:`1px solid ${isUnread?"#f9731655":"#e5e7eb"}`,borderRadius:8,padding:"10px 12px",marginBottom:6,transition:"background 0.4s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {isUnread&&<span style={{fontSize:8,fontWeight:700,color:"#f97316",border:"1px solid #f97316",borderRadius:4,padding:"0 4px",lineHeight:"14px"}}>NEW</span>}
                      <span style={{fontSize:10,color:isUnread?"#4b5563":"#9ca3af"}}>{a.author} · {a.createdAt?.slice(5,10).replace("-","/")}</span>
                    </div>
                    {/* [2026-09-25] 削除はサーバ側で「作成者本人か管理者」に限定したため、ボタンもその人にだけ出す（引継ぎメモと同じ条件） */}
                    {/* [2026-10-19] 読んだら自分の画面から消せる（ほかの人には残る）。書いた本人・管理者は従来どおり全員分を削除 */}
                    {!isUnread&&!(a.author===user.name||user.role==="admin")&&(
                    <button onClick={(e)=>{e.stopPropagation();withBusy(async()=>{const ok=await hideAnnouncement(a.id);if(!ok){showToast(WRITE_ERROR_MSG);return;}setAnnouncements(prev=>prev.map(x=>x.id===a.id?{...x,hiddenBy:[...(x.hiddenBy||[]),user.id]}:x));showToast("消しました");});}} style={{background:"transparent",border:"1px solid #d1d5db",borderRadius:6,color:"#6b7280",cursor:"pointer",fontSize:10,padding:"1px 8px"}}>消す</button>
                    )}
                    {(a.author===user.name||user.role==="admin")&&(
                    <button onClick={(e)=>{e.stopPropagation();if(!confirm("このアナウンスを削除しますか？"))return;withBusy(async()=>{const ok=await deleteAnnouncementDB(a.id);if(!ok){showToast(WRITE_ERROR_MSG);return;}setAnnouncements(prev=>prev.filter(x=>x.id!==a.id));showToast("削除しました");});}} style={{background:"transparent",border:"none",color:"#111827",cursor:"pointer",fontSize:12,padding:"0 2px"}}>✕</button>
                    )}
                  </div>
                  <div style={{fontSize:13,color:isUnread?"#111827":"#374151",fontWeight:isUnread?600:400}}>{a.text}</div>
                </div>
                );
              })}
            </div>
          )}

          {/* [2026-04-16] 夜タスク⑨ 自分担当現場の進捗ヒアリング（工期10日前〜遅延14日） */}
          {(()=>{
            const myPrompts=getProgressPromptsForOwner(user.name,projects,clockLogs,new Date());
            if(myPrompts.length===0) return null;
            return (
              <div style={{background:"linear-gradient(135deg,#2a1a3a,#f5f3ff)",border:"1px solid #a78bfa66",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:10,color:"#c4b5fd",letterSpacing:"0.1em",marginBottom:8}}>📋 進捗確認お願いします（工期が近い案件）</div>
                {myPrompts.map(({project:p,daysUntilEnd,lastClockDate})=>{
                  const color=daysUntilEnd<0?"#ef4444":daysUntilEnd<=3?"#f59e0b":"#c4b5fd";
                  const label=daysUntilEnd<0?`${Math.abs(daysUntilEnd)}日超過`:daysUntilEnd===0?"本日終了":`あと${daysUntilEnd}日`;
                  return (
                    <div key={p.id} onClick={()=>setSelectedId(p.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"rgba(0,0,0,0.3)",borderRadius:6,marginBottom:6,cursor:"pointer"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{p.name}</div>
                        <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>工期: {p.endDate||"?"} {lastClockDate&&`／ 最終打刻 ${lastClockDate}`}</div>
                      </div>
                      <div style={{color,fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{label}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* [2026-04-20] 顧客ごとの進捗確認日リクエスト（10%刻み報告、再送不可） */}
          {(()=>{
            const all=getProgressCheckRequests(customers,projects,progressReports,new Date());
            // 自分の名前の依頼 + 川畑の場合は未担当案件も
            const myItems=[...(all[user.name]||[]), ...(user.name==="川畑"?[]:[])];
            // 川畑は未担当集約も見る
            const kawabataExtra = user.name==="川畑" ? (all["川畑"]||[]) : [];
            const items = user.name==="川畑" ? kawabataExtra : (all[user.name]||[]);
            if(items.length===0) return null;
            return (
              <div style={{background:"linear-gradient(135deg,#3a2a1a,#2a1a0f)",border:"1px solid #f9731666",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
                <div style={{fontSize:10,color:"#fdba74",letterSpacing:"0.1em",marginBottom:8}}>
                  📊 今日の進捗報告（{items.length}件）
                </div>
                {items.map(item=>{
                  const {project:p,customer:c,checkType,lastReport}=item;
                  return (
                    <div key={p.id} onClick={()=>{setReportingItem(item);setReportPercent(lastReport?.percent||50);setReportComment("");}} style={{padding:"10px",background:"rgba(0,0,0,0.3)",borderRadius:8,marginBottom:6,cursor:"pointer",border:"1px solid #f9731622"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:"#fde68a"}}>{c.name}</div>
                          <div style={{fontSize:11,color:"#111827",marginTop:2}}>{p.name}</div>
                          <div style={{fontSize:9,color:"#6b7280",marginTop:2}}>
                            {checkType==="客先共有"?"🔵 客先共有日":checkType==="一斉確認"?"📣 会社からの確認依頼":"🔒 内部確認日"}
                            {lastReport&&` ／ 前回: ${lastReport.percent}% (${dateStrJST(lastReport.reportedAt)})`}
                            {p.status==="完了"&&" ／ ✅完了済"}
                          </div>
                        </div>
                        <div style={{color:"#f97316",fontSize:11,fontWeight:700,whiteSpace:"nowrap",marginLeft:8}}>報告 →</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{fontSize:9,color:"#6b7280",marginTop:4,lineHeight:1.5}}>
                  ※ 送信後は修正できません。慎重に入力してください。
                </div>
              </div>
            );
          })()}

          <div style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em"}}>■ 現場を選択</div>
              <button onClick={()=>setShowQuickAdd(!showQuickAdd)} style={{background:"#f0fdf4",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:6,padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer"}}>{showQuickAdd?"✕ 閉じる":"＋ 現場追加"}</button>
            </div>
            {showQuickAdd&&(
              <div style={{background:"#fafafa",border:"1px solid #22c55e33",borderRadius:10,padding:"12px",marginBottom:12}}>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input type="text" placeholder="現場名" value={qf.name} onChange={e=>setQf(f=>({...f,name:e.target.value}))} style={{...IS,flex:1,padding:"8px 10px",fontSize:12}}/>
                  <select value={qf.lead} onChange={e=>setQf(f=>({...f,lead:e.target.value}))} style={{...IS,width:80,padding:"8px 6px",fontSize:12}}><option value="">顧客</option>{customers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
                  {/* [2026-07-09] 顧客追加は admin 限定 */}
                  {user.role==="admin"&&<button type="button" onClick={()=>{setShowAddCustomer(true);setNewCustomerForm({name:"",contact:"",phone:""});}} style={{background:"#f0fdf4",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:6,padding:"0 8px",fontSize:12,fontWeight:700,cursor:"pointer"}}>＋</button>}
                </div>
                <button onClick={submitQuickProject} disabled={busy||!qf.name} style={{width:"100%",background:!busy&&qf.name?"linear-gradient(135deg,#22c55e,#16a34a)":"#e5e7eb",color:!busy&&qf.name?"#000":"#9ca3af",border:"none",borderRadius:6,padding:"8px",fontSize:12,fontWeight:700,cursor:!busy&&qf.name?"pointer":"not-allowed"}}>{busy?"処理中…":"追加する"}</button>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
              {projects.filter(p=>p.status!=="完了").slice().sort((a,b)=>getProjectLastActivity(b,{progressReports,expenseItems,additionalWorks,clockLogs})-getProjectLastActivity(a,{progressReports,expenseItems,additionalWorks,clockLogs})).map(p=>{
                const isSel=selectedId===p.id;
                const isReady=p.status==="準備中";
                const myLog=clockLogs.find(l=>l.userId===user.id&&l.projectId===p.id&&isTodayOrActiveNight(l)&&!l.clockOut); // [2026-07-14] 夜勤の稼働中も検出
                return (
                  <div key={p.id} onClick={isReady?undefined:()=>setSelectedId(isSel?null:p.id)} style={{background:isSel?"#fef3c7":"#fafafa",border:"1px solid",borderColor:isSel?"#f97316":"#e5e7eb",borderRadius:10,padding:"12px 14px",cursor:isReady?"not-allowed":"pointer",opacity:isReady?0.45:1,transition:"all 0.15s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {myLog&&<div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 5px #22c55e"}}/>}
                          <div style={{fontSize:12,fontWeight:600,color:isSel?"#111827":"#374151"}}>{p.name}</div>
                        </div>
                        <div style={{fontSize:10,color:"#111827"}}>顧客: {p.lead||"未定"}</div>
                      </div>
                      {myLog
                        ?<div style={{fontSize:10,color:"#60a5fa",background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:4,padding:"2px 8px",whiteSpace:"nowrap"}}>出勤中 {timeStr(myLog.clockIn)}〜</div>
                        :<div style={{fontSize:10,color:STATUS_CFG[p.status]?.color,background:STATUS_CFG[p.status]?.dim,border:`1px solid ${STATUS_CFG[p.status]?.color}44`,borderRadius:4,padding:"2px 8px"}}>{p.status}</div>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedId&&(
            <div style={{marginBottom:8}}>
              <input type="text" value={clockRemarks} onChange={e=>setClockRemarks(e.target.value)} placeholder="備考（任意）" style={{...IS,padding:"8px 10px",fontSize:12,marginBottom:8}}/>
              <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#a78bfa",letterSpacing:"0.1em",marginBottom:8}}>■ 外注（任意）</div>
                {clockSubs.map((sub,i)=>(
                  <div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
                    <input type="text" value={sub.companyName} onChange={e=>{const v=[...clockSubs];v[i].companyName=e.target.value;setClockSubs(v);}} placeholder="会社名" style={{...IS,flex:1,padding:"7px 10px",fontSize:12}}/>
                    <input type="number" value={sub.headcount} onChange={e=>{const v=[...clockSubs];v[i].headcount=e.target.value;setClockSubs(v);}} min="1" style={{...IS,width:50,padding:"7px 6px",fontSize:12,textAlign:"center"}}/>
                    <span style={{fontSize:10,color:"#6b7280"}}>人</span>
                    {clockSubs.length>1&&<button onClick={()=>setClockSubs(prev=>prev.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:"#111827",cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>}
                  </div>
                ))}
                <button onClick={()=>setClockSubs(prev=>[...prev,{companyName:"",headcount:"0"}])} style={{background:"transparent",color:"#a78bfa",border:"1px dashed #a78bfa44",borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",width:"100%"}}>＋ 外注先を追加</button>
              </div>
            </div>
          )}
          <div style={{marginBottom:20}}>
            {selectedId
              ?<ClockButton user={user} projectId={selectedId} clockLogs={clockLogs} onClock={handleClock} hourlyLeft={Math.max(0,35-(leaveBalances.find(b=>b.staffId===user.id&&b.type==="paid")?.hourlyUsed||0))} siteCoords={(()=>{const p=projects.find(p=>p.id===selectedId);return (p&&p.siteLat!=null&&p.siteLng!=null)?{lat:p.siteLat,lng:p.siteLng}:null;})()}
                  siteHasAddress={!!((projects.find(p=>p.id===selectedId)||{}).address||"").trim()}
                  onRegisterSite={async(address,coords)=>{   // [2026-10-15] 現場の住所の初回登録
                    const pid=selectedId;
                    const r=await registerSiteLocation(pid,address,coords);
                    if(!r) return false;
                    setProjects(prev=>prev.map(p=>p.id===pid?{...p,address:r.address||address,siteLat:r.lat==null?null:Number(r.lat),siteLng:r.lng==null?null:Number(r.lng)}:p));
                    return true;
                  }}/>
              :<div style={{background:"#fafafa",border:"2px dashed #d1d5db",borderRadius:10,padding:"16px",textAlign:"center"}}>
                <div style={{fontSize:13,color:"#111827",marginBottom:4}}>現場を選択してください</div>
                <div style={{fontSize:10,color:"#d1d5db"}}>打刻には現場の選択が必須です</div>
              </div>
            }
          </div>

          <div>
            <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:8}}>■ 今日の打刻履歴</div>
            {clockLogs.filter(l=>l.userId===user.id&&isTodayOrActiveNight(l)).length===0
              ?<div style={{fontSize:12,color:"#111827",textAlign:"center",padding:"12px 0"}}>打刻がありません</div>
              :clockLogs.filter(l=>l.userId===user.id&&isTodayOrActiveNight(l)).map(l=>{
                const proj=projects.find(p=>p.id===l.projectId);
                // [2026-07-13] 夜勤は実働=退勤-出勤、残業概念なし。日勤は従来どおり
                const night=!!l.isNightShift;
                const worked=l.clockOut?(night?calcNightWorkedHours(l.clockIn,l.clockOut):calcWorkedHours(l.clockIn,l.clockOut)).toFixed(1):null;
                const ot=(!night&&l.clockOut)?overtimeOfLog(l,clockLogs):0;
                return (
                  <div key={l.id} style={{background:"#fafafa",border:night?"1px solid #6366f155":"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                      <span style={{fontWeight:600}}>{night&&<span style={{color:"#6366f1"}}>🌙 </span>}{proj?.name||"不明"}</span>
                      <span style={{color:night?"#818cf8":"#60a5fa",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{night?fmtNightRange(l.clockIn,l.clockOut,"稼働中"):`${timeStr(l.clockIn)} → ${l.clockOut?timeStr(l.clockOut):"稼働中"}`}</span>
                    </div>
                    <div style={{display:"flex",gap:10,fontSize:10}}>
                      {worked&&<span style={{color:"#f97316",fontFamily:"'JetBrains Mono',monospace"}}>実働 {worked}h</span>}
                      {ot>0&&<span style={{color:"#ef4444",fontFamily:"'JetBrains Mono',monospace"}}>残業 {ot.toFixed(1)}h</span>}
                      {l.locationName?<span style={{color:"#111827"}}>📍{l.locationName}</span>:l.coordsIn&&<span style={{color:"#111827",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>📍{l.coordsIn.lat?.toFixed(3)},{l.coordsIn.lng?.toFixed(3)}</span>}
                    </div>
                    {l.remarks&&<div style={{fontSize:10,color:"#6b7280",marginTop:3}}>📝 {l.remarks}</div>}
                    {l.note&&<div style={{fontSize:10,color:"#f59e0b",marginTop:3}}>⚠ GPS理由: {l.note}</div>}
                  </div>
                );
              })
            }
          </div>

          {/* [2026-04-24] 本日のメンバー状況 */}
          {(()=>{
            const memberLogs = staff
              // [2026-05-07] 役員も現場出勤時は載せる（打刻なしの日は下の filter(m=>m.log) で除外）。自分自身だけ除外
              .filter(s=>s.id!==user.id && s.role!=="admin")
              .map(s=>{
                const todayLogs = clockLogs.filter(l=>l.userId===s.id&&isTodayOrActiveNight(l)); // [2026-07-14] 夜勤の稼働中も本日扱い
                const latest = todayLogs.sort((a,b)=>(b.clockIn||"").localeCompare(a.clockIn||""))[0]||null; // [2026-05-07] Codex#8
                return {staff:s, log:latest};
              })
              .filter(m=>m.log); // 本日未出勤は非表示
            if(memberLogs.length===0) return null;
            const catColor={"現場終了":"#22c55e","会社都合":"#60a5fa","本人都合":"#f59e0b"};
            return(
              <div style={{marginTop:20,marginBottom:4}}>
                <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:8}}>■ 本日のメンバー状況</div>
                {memberLogs.map(({staff:s,log:l})=>{
                  const proj=projects.find(p=>p.id===l.projectId);
                  const isWorking=!l.clockOut;
                  return(
                    <div key={s.id} style={{background:"#e5e7eb",border:"1px solid #e5e7eb",borderRadius:8,padding:"9px 12px",marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          {isWorking&&<span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 5px #22c55e"}}/>}
                          <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>{s.name}</span>
                        </div>
                        <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:isWorking?"#60a5fa":"#9ca3af"}}>
                          {timeStr(l.clockIn)} → {l.clockOut?timeStr(l.clockOut):<span style={{color:"#22c55e",fontWeight:700}}>勤務中</span>}
                        </span>
                      </div>
                      <div style={{fontSize:10,color:"#111827",marginTop:3}}>
                        {proj?.name||"現場不明"}
                        {l.early_leave_category&&(
                          <span style={{marginLeft:8,color:catColor[l.early_leave_category]||"#6b7280"}}>
                            [{l.early_leave_category}] {l.early_leave_reason}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* [v16] 直近の打刻履歴 + 修正申請 */}
          <div style={{marginTop:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em"}}>■ 直近の打刻履歴</div>
              <button onClick={()=>{setShowClockFix("new");setClockFixForm({projectId:projects[0]?.id||"",clockIn:"",clockOut:"",reason:"",osType:"",osCount:1,earlyStart:false});}} style={{background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa44",borderRadius:6,padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer"}}>＋ 打刻を追加</button>
            </div>
            {clockLogs.filter(l=>l.userId===user.id&&l.clockIn).sort((a,b)=>(b.clockIn||"").localeCompare(a.clockIn||"")).slice(0,7).map(l=>{ /* [2026-05-07] Codex#8 */
              const proj=projects.find(p=>p.id===l.projectId);
              const myMod=clockMods.find(m=>m.clockLogId===l.id&&m.status==="pending");
              return (
                <div key={l.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <span style={{fontSize:12,color:"#374151",fontWeight:600}}>{l.clockIn?dateStrJST(l.clockIn):""}</span>
                      <span style={{fontSize:11,color:"#6b7280",marginLeft:8}}>{proj?.name||"不明"}</span>
                    </div>
                    {myMod ? (
                      <span style={{fontSize:9,color:"#f59e0b",background:"#fef3c7",padding:"2px 8px",borderRadius:10}}>申請中</span>
                    ) : (
                      <button onClick={()=>{setShowClockFix(l);setClockFixForm({projectId:l.projectId,clockIn:toLocalDtInput(l.clockIn),clockOut:toLocalDtInput(l.clockOut),reason:"",osType:l.outsourceType||"",osCount:l.outsourceCount||1,earlyStart:!!l.earlyStart});}} style={{background:"transparent",border:"1px solid #9ca3af",borderRadius:6,color:"#6b7280",fontSize:9,padding:"2px 8px",cursor:"pointer"}}>修正</button>
                    )}
                  </div>
                  <div style={{fontSize:11,color:"#111827",marginTop:4}}>
                    出勤 {l.clockIn?timeStr(l.clockIn):"--:--"} → 退勤 {l.clockOut?timeStr(l.clockOut):"--:--"}
                    {l.note&&<span style={{marginLeft:8,color:"#111827"}}>({l.note})</span>}
                    {l.outsourceType&&<span style={{marginLeft:8,color:"#7c3aed"}}>🤝{outsourceLabel(l.outsourceType,l.outsourceCount)}</span>}
                  </div>
                </div>
              );
            })}
            {clockLogs.filter(l=>l.userId===user.id).length===0&&(
              <div style={{fontSize:12,color:"#111827",textAlign:"center",padding:20}}>打刻履歴はまだありません</div>
            )}
            {/* 申請中の修正一覧 */}
            {clockMods.filter(m=>m.userId===user.id&&m.status==="pending").length>0&&(
              <div style={{marginTop:12}}>
                <div style={{fontSize:10,color:"#f59e0b",letterSpacing:"0.1em",marginBottom:6}}>■ 申請中の修正</div>
                {clockMods.filter(m=>m.userId===user.id&&m.status==="pending").map(m=>(
                  <div key={m.id} style={{background:"#fef3c7",border:"1px solid #f59e0b33",borderRadius:8,padding:"8px 12px",marginBottom:4,fontSize:11}}>
                    <div style={{color:"#f59e0b"}}>{m.type==="new"?"新規追加":"時刻修正"} — {m.projectName||"不明"}</div>
                    {m.outsourceChanged&&<div style={{color:"#7c3aed",marginTop:2}}>外注: {outsourceLabel(m.originalOutsourceType,m.originalOutsourceCount)} → {outsourceLabel(m.requestedOutsourceType,m.requestedOutsourceCount)}</div>}
                    <div style={{color:"#6b7280",marginTop:2}}>理由: {m.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 修正申請モーダル */}
          {showClockFix&&(
            <Modal title={showClockFix==="new"?"打刻を追加":"打刻を修正"} accent="#60a5fa" onClose={()=>setShowClockFix(null)}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <Field label="現場">
                  <select value={clockFixForm.projectId} onChange={e=>setClockFixForm(f=>({...f,projectId:e.target.value}))} style={IS}>
                    {projects.filter(p=>p.status!=="完了").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="出勤時刻"><input type="datetime-local" value={clockFixForm.clockIn} onChange={e=>setClockFixForm(f=>({...f,clockIn:e.target.value}))} style={IS}/></Field>
                <Field label="退勤時刻"><input type="datetime-local" value={clockFixForm.clockOut} onChange={e=>setClockFixForm(f=>({...f,clockOut:e.target.value}))} style={IS}/></Field>
                {/* [2026-10-14] 早出：本当の出勤時刻（8:00前）を入れてチェック。移動の時間も入れてよい */}
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:14,fontWeight:700,color:"#111827",background:clockFixForm.earlyStart?"#fff7ed":"#fafafa",border:clockFixForm.earlyStart?"2px solid #fb923c":"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",cursor:"pointer"}}>
                  <input type="checkbox" checked={!!clockFixForm.earlyStart} onChange={e=>setClockFixForm(f=>({...f,earlyStart:e.target.checked}))} style={{width:20,height:20}}/>
                  ⏰ 早出（8:00より前から働いた）
                </label>
                {/* [2026-10-02] 外注の有無・人数も修正できる（金額は入れない。応援は自動、請負は管理者が入力） */}
                <Field label="外注">
                  <div style={{display:"flex",gap:6}}>
                    {[["","なし"],["support","応援"],["subcontract","請負"]].map(([v,lb])=>(
                      <button key={v} type="button" onClick={()=>setClockFixForm(f=>({...f,osType:v}))} style={{flex:1,padding:"10px 4px",borderRadius:8,border:(clockFixForm.osType||"")===v?"2px solid #a78bfa":"1px solid #d1d5db",background:(clockFixForm.osType||"")===v?"#f5f3ff":"#fafafa",color:"#111827",fontSize:13,fontWeight:700,cursor:"pointer"}}>{lb}</button>
                    ))}
                  </div>
                  {clockFixForm.osType&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                      <span style={{fontSize:12,color:"#374151"}}>人数</span>
                      <input type="number" min={1} max={20} value={clockFixForm.osCount} onChange={e=>{const v=Math.floor(Number(e.target.value)||1);setClockFixForm(f=>({...f,osCount:Math.min(20,Math.max(1,v))}));}} style={{...IS,width:80,textAlign:"center"}}/>
                      <span style={{fontSize:12,color:"#374151"}}>人</span>
                    </div>
                  )}
                </Field>
                <Field label="修正理由 *"><input type="text" value={clockFixForm.reason} onChange={e=>setClockFixForm(f=>({...f,reason:e.target.value}))} placeholder="例: 打刻忘れ、時刻間違い等" style={IS}/></Field>
                <button onClick={()=>withBusy(async()=>{
                  if(!clockFixForm.reason.trim()){showToast("修正理由を入力してください");return;}
                  if(!clockFixForm.clockIn){showToast("出勤時刻を入力してください");return;}
                  if(clockFixForm.earlyStart && new Date(clockFixForm.clockIn).getHours()>=8){showToast("早出は8:00より前の出勤時刻を入れてください");return;}
                  const proj=projects.find(p=>p.id===clockFixForm.projectId);
                  const mod={
                    id:crypto.randomUUID(),
                    type:showClockFix==="new"?"new":"edit",
                    clockLogId:showClockFix==="new"?null:showClockFix.id,
                    userId:user.id, userName:user.name,
                    projectId:clockFixForm.projectId,
                    projectName:proj?.name||"",
                    originalClockIn:showClockFix==="new"?null:showClockFix.clockIn,
                    originalClockOut:showClockFix==="new"?null:showClockFix.clockOut,
                    requestedClockIn:new Date(clockFixForm.clockIn).toISOString(),
                    requestedClockOut:clockFixForm.clockOut?new Date(clockFixForm.clockOut).toISOString():null,
                    reason:clockFixForm.reason,
                    requestedBy:user.id,
                    earlyStart:!!clockFixForm.earlyStart,   // [2026-10-14] 早出
                  };
                  // [2026-10-02] 外注が変わった時だけ outsourceChanged=true（変えていなければ承認しても外注は触らない）
                  const origOsType=showClockFix==="new"?null:(showClockFix.outsourceType||null);
                  const origOsCount=showClockFix==="new"?null:(showClockFix.outsourceCount??null);
                  const reqOsType=clockFixForm.osType||null;
                  const reqOsCount=reqOsType?(Number(clockFixForm.osCount)||1):null;
                  mod.outsourceChanged = reqOsType!==origOsType || (reqOsType!==null && reqOsCount!==Number(origOsCount));
                  mod.originalOutsourceType=origOsType; mod.originalOutsourceCount=origOsCount;
                  mod.requestedOutsourceType=reqOsType; mod.requestedOutsourceCount=reqOsCount;
                  // [2026-10-05] 修正は自動承認。サーバが打刻に反映して approved にする（反映できなかった時だけ承認待ちで残る）
                  const res = await apiGateway("submit_clock_modification", { mod });
                  if(!res||!res.ok){ showToast((res&&res.error)?("⚠ "+res.error):WRITE_ERROR_MSG); return; }
                  const auto = res.result?.autoApproved===true;
                  setClockMods(prev=>[{...mod,status:auto?"approved":"pending",createdAt:new Date().toISOString()},...prev]);
                  if(auto){ const c=await loadClockLogs(clockLogsInitialSinceIso()); if(c) setClockLogs(c); }
                  setShowClockFix(null);
                  showToast(auto?"✓ 打刻を修正しました":"修正を受け付けました（管理者が確認します）");
                })} disabled={busy||!clockFixForm.reason.trim()||!clockFixForm.clockIn} style={{background:!busy&&clockFixForm.reason.trim()&&clockFixForm.clockIn?"linear-gradient(135deg,#60a5fa,#3b82f6)":"#e5e7eb",color:!busy&&clockFixForm.reason.trim()&&clockFixForm.clockIn?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:!busy&&clockFixForm.reason.trim()&&clockFixForm.clockIn?"pointer":"not-allowed"}}>{busy?"保存中…":"修正する"}</button>
              </div>
            </Modal>
          )}

        </div>
      )}

      {/* ═══ 案件一覧タブ ═══ — 次のセクションへ続く */}
      {tab==="案件一覧"&&(
        <div>
          <div style={{padding:"12px 14px",borderBottom:"1px solid #fafafa",display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            {["全て",...STATUSES].map(s=>(
              <button key={s} onClick={()=>setFilterSt(s)} style={{background:filterSt===s?"#f97316":"#f9fafb",color:filterSt===s?"#000":"#9ca3af",border:"1px solid",borderColor:filterSt===s?"#f97316":"#d1d5db",borderRadius:16,padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>{s}</button>
            ))}
            <button onClick={()=>setModal("addProject")} style={{marginLeft:"auto",background:"#f0fdf4",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:6,padding:"4px 12px",fontSize:10,fontWeight:700,cursor:"pointer"}}>＋ 追加</button>
          </div>
          {filtered.length===0&&(
            <div style={{padding:"20px",textAlign:"center",color:"#111827",fontSize:11}}>該当する案件がありません</div>
          )}
          {filtered.map(p=>{
            const actual=calcNinkuFromLogs(p.id);
            const cfg=STATUS_CFG[p.status];
            const isOpen=selectedId===p.id;
            const working=clockLogs.filter(l=>l.projectId===p.id&&isTodayOrActiveNight(l)&&!l.clockOut); // [2026-07-14] 夜勤の稼働中も含める
            const projHandovers = handoverMemos.filter(m=>m.projectId===p.id);
            return (
              <div key={p.id}>
                <div onClick={()=>setSelectedId(isOpen?null:p.id)} style={{padding:compactMode?"7px 14px":"14px 14px",borderBottom:"1px solid #f9fafb",cursor:"pointer",background:isOpen?"#fafafa":"transparent",borderLeft:isOpen?"3px solid #f97316":"3px solid transparent",transition:"all 0.1s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:compactMode?0:8}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:compactMode?0:2,flexWrap:"wrap"}}>
                        {working.length>0&&<div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 5px #22c55e"}}/>}
                        <div style={{fontSize:compactMode?12:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:compactMode?"nowrap":"normal",maxWidth:compactMode?"60vw":"none"}}>{p.name}</div>
                        {projHandovers.length>0&&<span style={{fontSize:9,color:"#60a5fa",background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:4,padding:"1px 5px"}}>引継{projHandovers.length}</span>}
                      </div>
                      {!compactMode&&<div style={{fontSize:11,color:"#111827"}}>{p.lead||"顧客未定"}{p.customerContact&&` ／ 担当: ${p.customerContact}`}</div>}
                    </div>
                    <div onClick={(e)=>{e.stopPropagation();const i=STATUSES.indexOf(p.status);const next=STATUSES[(i+1)%STATUSES.length];if(!window.confirm(`ステータスを「${p.status}」→「${next}」に変更します。\n全員のアプリに反映されます。よろしいですか？`))return;withBusy(async()=>{setProjects(prev=>prev.map(x=>x.id===p.id?{...x,status:next}:x));await updateProjectStatus(p.id,next);showToast(`ステータス → ${next}`);});}} style={{background:cfg?.dim,color:cfg?.color,border:`1px solid ${cfg?.color}44`,borderRadius:4,padding:"2px 8px",fontSize:9,fontWeight:700,flexShrink:0,marginLeft:8,cursor:"pointer"}}>{p.status}</div>
                  </div>
                  {/* [2026-09-29] 目標は旧 target_ninku ではなく target_mandays（管理画面と同じ物差し） */}
                  {!compactMode&&<NinkuBar actual={actual} target={Math.round(calcTargetMandays(p)*10)/10} breakeven={calcBreakevenMandays(p,ninkuSettings)}/>}
                  {!compactMode&&(
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:"#111827"}}>
                      <span>〆 {p.endDate||"未定"}{working.length>0&&<span style={{color:"#22c55e",marginLeft:8}}>● {working.length}名稼働中</span>}</span>
                    </div>
                  )}
                </div>
                {isOpen&&(
                  <div style={{background:"#fafafa",borderBottom:"1px solid #e5e7eb",padding:"14px"}}>
                    <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em"}}>■ 案件情報</div>
                        <button onClick={(e)=>{e.stopPropagation();setAdminPf({name:p.name,client:p.client||"",status:p.status||"準備中",lead:p.lead||"",startDate:p.startDate||"",endDate:p.endDate||"",estimate:String(p.estimate||""),contractAmount:String(p.contractAmount||""),targetNinku:String(p.targetNinku||""),contractType:p.contractType||"",workCategory:p.workCategory||"",address:p.address||"",customerContact:p.customerContact||"",internalOwner:p.internalOwner||"",invoiceSettled:!!p.invoiceSettled,workDetails:p.workDetails||""});setEditProjectId(p.id);setModal("editProject");}} style={{background:"#f0fdf4",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:700,cursor:"pointer"}}>✏ 編集</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11}}>
                        <div><span style={{color:"#111827"}}>顧客: </span><span style={{color:"#374151"}}>{p.lead||"未定"}</span></div>
                        <div><span style={{color:"#111827"}}>契約: </span><span style={{color:p.contractType==="請負"?"#22c55e":p.contractType==="応援"?"#60a5fa":"#9ca3af"}}>{p.contractType||"未設定"}</span></div>
                        <div><span style={{color:"#111827"}}>元請担当者: </span><span style={{color:"#374151"}}>{p.customerContact||"未設定"}</span></div>
                        <div><span style={{color:"#111827"}}>現場担当者: </span><span style={{color:"#60a5fa"}}>{p.internalOwner||"未設定"}</span></div>
                        <div style={{gridColumn:"span 2"}}><span style={{color:"#111827"}}>住所: </span><span style={{color:"#374151"}}>{p.address||"未設定"}</span></div>
                        <div style={{gridColumn:"span 2"}}><span style={{color:"#111827"}}>工期: </span><span style={{color:"#374151",fontFamily:"'JetBrains Mono',monospace"}}>{p.startDate||"?"} 〜 {p.endDate||"未定"}</span></div>
                        {/* [2026-04-20] ユーザー側では金額非表示（見積・請負金額は管理者のみ） */}
                      </div>
                      {/* [2026-04-22] 工事詳細（現場指示、改行可読み取り） */}
                      {p.workDetails && (
                        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #e5e7eb"}}>
                          <div style={{fontSize:10,color:"#111827",marginBottom:4}}>📋 工事詳細</div>
                          <div style={{fontSize:12,color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.6}}>{p.workDetails}</div>
                        </div>
                      )}
                      {/* [2026-06-28] 人工状況ランク（楽勝/平年/赤字線/赤字）はユーザー側で非表示。原価しきい値情報のため管理者のみ */}
                    </div>
                    <BudgetSummary project={p} clockLogs={clockLogs} settings={ninkuSettings}/>
                    {/* 人工実績 */}
                    {(()=>{
                      const projLogs = clockLogs.filter(l=>l.projectId===p.id&&l.clockOut);
                      return projLogs.length>0?(
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:8}}>■ 人工実績（打刻ベース）</div>
                          {[...projLogs].filter(l=>l.clockIn).sort((a,b)=>(b.clockIn||"").localeCompare(a.clockIn||"")).slice(0,10).map(l=>{ /* [2026-05-07] Codex#8 */
                            const ot=l.isNightShift?0:overtimeOfLog(l,clockLogs); // [2026-07-13] 夜勤は残業概念なし / [2026-10-14] 早出の日は実働−6.5H
                            const ninku=1+Math.floor(ot/4);
                            return (
                              <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafafa",borderRadius:6,padding:"8px 12px",fontSize:11,marginBottom:5}}>
                                <div>{l.isNightShift&&<span style={{color:"#6366f1",marginRight:3}}>🌙</span>}<span style={{color:"#6b7280",marginRight:8}}>{dateMDJST(l.clockIn).replace("-","/")}</span><span style={{fontWeight:600}}>{l.userName}</span></div>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  {ot>0&&<span style={{fontSize:9,color:"#ef4444"}}>残{ot.toFixed(1)}h</span>}
                                  <span style={{fontFamily:"'JetBrains Mono',monospace",color:"#f97316",fontWeight:700}}>{ninku}</span>
                                </div>
                              </div>
                            );
                          })}
                          <div style={{textAlign:"right",fontSize:10,color:"#111827",marginTop:6}}>合計: <span style={{fontFamily:"'JetBrains Mono',monospace",color:"#f97316",fontWeight:700,fontSize:13}}>{actual}</span> / 目標 {calcTargetMandays(p).toFixed(1)} 人工</div>
                        </div>
                      ):null;
                    })()}
                    {/* [2026-04-20] 引継ぎメモ（30日以内+古いもの折りたたみ、削除ボタン） */}
                    {(()=>{
                      const memos = handoverMemos.filter(m=>m.projectId===p.id).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
                      // [2026-06-16] 空でも追加ボタンを出すため return null は撤廃
                      const thirtyDaysAgoIso = new Date(Date.now() - 30*86400000).toISOString();
                      const recent = memos.filter(m => (m.createdAt||"") >= thirtyDaysAgoIso);
                      const older = memos.filter(m => (m.createdAt||"") < thirtyDaysAgoIso);
                      const showOld = showOldMemos[p.id];
                      const renderMemo = (m, muted) => (
                        <div key={m.id} style={{background:muted?"#e5e7eb":"#fafafa",border:`1px solid ${muted?"#e5e7eb":"#60a5fa22"}`,borderRadius:6,padding:"8px 12px",fontSize:11,marginBottom:5,opacity:muted?0.7:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <div style={{fontSize:10,color:muted?"#9ca3af":"#60a5fa"}}>{m.author} · {(m.createdAt||"").slice(0,10)}</div>
                            {(m.author===user.name||user.role==="admin")&&(
                              <button onClick={(e)=>{e.stopPropagation();if(!confirm("このメモを削除しますか？"))return;withBusy(async()=>{const ok=await deleteHandoverMemoDB(m.id);if(!ok){showToast(WRITE_ERROR_MSG);return;}setHandoverMemos(prev=>prev.filter(x=>x.id!==m.id));showToast("削除しました");});}} style={{background:"transparent",border:"none",color:"#111827",cursor:"pointer",fontSize:12,padding:"0 4px"}}>✕</button>
                            )}
                          </div>
                          <div style={{color:muted?"#4b5563":"#374151",whiteSpace:"pre-wrap",lineHeight:1.5}}>{m.text}</div>
                          {m.imageUrl&&<img src={m.imageUrl} alt="添付写真" onClick={()=>setLightboxImg(m.imageUrl)} style={{maxWidth:"100%",maxHeight:200,borderRadius:6,marginTop:6,cursor:"zoom-in"}}/>}
                        </div>
                      );
                      return (
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,color:"#60a5fa",letterSpacing:"0.1em",marginBottom:8}}>■ 引継ぎメモ ({memos.length})</div>
                          {recent.map(m => renderMemo(m, false))}
                          {memos.length===0&&<div style={{fontSize:10,color:"#9ca3af",textAlign:"center",padding:"4px 0"}}>引継ぎメモはまだありません</div>}
                          {recent.length===0&&older.length>0&&<div style={{fontSize:10,color:"#111827",textAlign:"center",padding:"4px 0"}}>直近30日のメモなし</div>}
                          {older.length>0&&(
                            <div>
                              <button onClick={()=>setShowOldMemos(o=>({...o,[p.id]:!o[p.id]}))} style={{width:"100%",background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa22",borderRadius:6,padding:"6px",fontSize:11,cursor:"pointer",marginTop:4,fontWeight:700}}>
                                {showOld?`▲ 古いメモを隠す（${older.length}件）`:`▼ 過去のメモを見る（${older.length}件）`}
                              </button>
                              {showOld && older.map(m => renderMemo(m, true))}
                            </div>
                          )}
                          {/* [2026-06-16] 退勤時を待たず案件詳細から直接 引継ぎメモ＋写真 を追加 */}
                          <button onClick={()=>{setAddHmText("");setAddHmPhoto(null);setModal("addHandoverMemo");}} style={{width:"100%",background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa44",borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer",marginTop:4}}>＋ 引継ぎメモ・写真を追加</button>
                        </div>
                      );
                    })()}
                    {/* 外注 */}
                    {(()=>{
                      const projSubs = subcontractors.filter(s=>s.projectId===p.id);
                      return (
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,color:"#a78bfa",letterSpacing:"0.1em",marginBottom:8}}>■ 外注</div>
                          {projSubs.map(s=>(
                            <div key={s.id} style={{background:"#fafafa",borderRadius:6,padding:"8px 12px",fontSize:11,marginBottom:5}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                <div><span style={{color:"#6b7280",marginRight:8}}>{s.date?.slice(5).replace("-","/")}</span><span style={{fontWeight:600,color:"#a78bfa"}}>{s.companyName}</span>{s.memo&&<span style={{color:"#111827",marginLeft:6}}>— {s.memo}</span>}</div>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",color:"#a78bfa",fontWeight:700}}>{s.headcount}人工</span>
                              </div>
                              {s.workers&&<div style={{color:"#6b7280",fontSize:10,marginTop:3}}>👷 {s.workers}</div>}
                            </div>
                          ))}
                          {projSubs.length===0&&<div style={{fontSize:10,color:"#9ca3af",textAlign:"center",padding:"4px 0"}}>外注の記録はまだありません</div>}
                          {/* [2026-06-16] 案件詳細から外注を後追い追加（v151で削除した追加導線を復活。日付指定で出勤簿の外注一覧にも反映される） */}
                          <button onClick={()=>setModal("addSubcontractor")} style={{width:"100%",background:"#f5f3ff",color:"#a78bfa",border:"1px solid #a78bfa44",borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer",marginTop:4}}>＋ 外注を追加</button>
                        </div>
                      );
                    })()}
                    {/* [v14] 追加工事（×ボタン削除、改行対応、フロア・場所追加） */}
                    {(()=>{
                      const projAddWorks = additionalWorks.filter(w=>w.projectId===p.id);
                      const open = !!addWorksOpen[p.id]; // [2026-07-23] デフォルト畳む
                      return (
                        <div style={{marginBottom:12}}>
                          <div onClick={()=>setAddWorksOpen(o=>({...o,[p.id]:!o[p.id]}))} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#f59e0b",letterSpacing:"0.1em",marginBottom:open?8:0,cursor:"pointer",userSelect:"none"}}>
                            <span style={{fontSize:9}}>{open?"▼":"▶"}</span>
                            <span>■ 追加工事（{projAddWorks.length}件）</span>
                          </div>
                          {open&&<>
                          {projAddWorks.map(w=>(
                            <div key={w.id} style={{background:"#fafafa",borderRadius:6,padding:"8px 12px",fontSize:11,marginBottom:5}}>
                              {(w.floor||w.location)&&<div style={{fontSize:10,color:"#f59e0b",marginBottom:2}}>{w.floor&&`${w.floor}F`}{w.location&&` ${w.location}`}</div>}
                              <div style={{color:"#374151",whiteSpace:"pre-wrap",lineHeight:1.5}}>{w.description}</div>
                              {w.imageUrl&&<img src={w.imageUrl} alt="添付写真" onClick={()=>setLightboxImg(w.imageUrl)} style={{maxWidth:"100%",maxHeight:200,borderRadius:6,marginTop:6,cursor:"zoom-in"}}/>}
                            </div>
                          ))}
                          <button onClick={()=>setModal("addAdditionalWork")} style={{width:"100%",background:"#fef3c7",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,cursor:"pointer",marginTop:4}}>＋ 追加工事を追加</button>
                          </>}
                        </div>
                      );
                    })()}
                    {/* [2026-04-21] 仕様・数量表（旧:仕様書）— ファイル添付 + テキスト書き込み */}
                    {(()=>{
                      const specs = projectSpecs.filter(s=>s.projectId===p.id);
                      return (
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,color:"#60a5fa",letterSpacing:"0.1em",marginBottom:8}}>■ 仕様・数量表</div>
                          {specs.map(s=>(
                            <div key={s.id} style={{background:"#fafafa",borderRadius:6,padding:"10px 12px",marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                                <span style={{fontSize:11,color:"#60a5fa",fontWeight:600}}>{s.fileName||"📝 テキストメモ"}</span>
                                <span style={{fontSize:9,color:"#111827"}}>{s.uploadedBy}</span>
                              </div>
                              {s.fileUrl&&(s.fileUrl.toLowerCase().endsWith(".pdf")||s.fileName?.toLowerCase().endsWith(".pdf")
                                ? <a href={s.fileUrl} target="_blank" rel="noopener" style={{display:"block",background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:6,padding:"10px 12px",marginBottom:6,color:"#60a5fa",fontSize:12,textDecoration:"none"}}>📄 {s.fileName||"PDF"} — タップして開く</a>
                                : <img src={s.fileUrl} alt={s.fileName} onClick={()=>setLightboxImg(s.fileUrl)} style={{maxWidth:"100%",maxHeight:200,borderRadius:6,marginBottom:6,cursor:"zoom-in"}}/>
                              )}
                              <textarea value={s.specText||""} onChange={e=>{
                                const newText=e.target.value;
                                setProjectSpecs(prev=>prev.map(x=>x.id===s.id?{...x,specText:newText}:x));
                              }} onBlur={async(e)=>{
                                const text=e.target.value;
                                const ok=await upsertProjectSpec({id:s.id,projectId:p.id,specText:text});
                                if(ok) showToast("✓ 保存しました");
                                else showToast(WRITE_ERROR_MSG);
                              }} rows={4} placeholder="仕様・数量を入力…" style={{...IS,resize:"vertical",fontSize:11,lineHeight:1.6}}/>
                            </div>
                          ))}
                          <input type="file" accept="image/*,application/pdf" id={`specInput-${p.id}`} style={{display:"none"}} onChange={async(e)=>{
                            const file=e.target.files?.[0]; if(!file) return;
                            setSpecUploading(true);
                            try {
                              const isImage=file.type.startsWith("image/");
                              const isPdf=file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf");
                              let fileUrl="", specText="", uploadName=file.name;
                              if(isImage){
                                // [2026-07-23] 仕様・数量表の画像は名刺OCRを走らせず保存のみ（OCRは名刺タブのみ）
                                const r=await resizeImageFile(file);
                                const base64=r.base64, mediaType=r.type; uploadName=r.name;
                                fileUrl = await uploadFieldPhoto(base64, uploadName, mediaType) || "";
                              } else if(isPdf){
                                if(file.size>20*1024*1024){showToast("⚠ 20MBを超えています");setSpecUploading(false);e.target.value="";return;}
                                fileUrl = await uploadFileDirect(file) || "";
                                if(!fileUrl){showToast("⚠ PDFのアップロードに失敗");setSpecUploading(false);e.target.value="";return;}
                              } else {
                                const reader=new FileReader();
                                const base64=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result.split(",")[1]);reader.onerror=rej;reader.readAsDataURL(file);});
                                fileUrl = await uploadFieldPhoto(base64, file.name, file.type||"application/octet-stream") || "";
                              }
                              const spec={projectId:p.id,fileName:uploadName,fileUrl,specText,uploadedBy:user.name};
                              await upsertProjectSpec(spec);
                              const refreshed=await loadProjectSpecs();
                              setProjectSpecs(refreshed||[]);
                              showToast(fileUrl ? "✓ ファイルを保存しました" : "✓ テキスト抽出のみ（ファイル保存失敗）");
                            } catch(err){ showToast("アップロードに失敗"); }
                            setSpecUploading(false); e.target.value="";
                          }}/>
                          <div style={{display:"flex",gap:6,marginTop:4}}>
                            <button onClick={()=>document.getElementById(`specInput-${p.id}`).click()} disabled={specUploading} style={{flex:1,background:specUploading?"#e5e7eb":"#eff6ff",color:specUploading?"#9ca3af":"#60a5fa",border:"1px solid #60a5fa44",borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,cursor:specUploading?"not-allowed":"pointer"}}>
                              {specUploading?"アップロード中…":"📎 ファイル追加"}
                            </button>
                            <button disabled={busy} onClick={()=>withBusy(async()=>{
                              const spec={projectId:p.id,fileName:"",fileUrl:"",specText:"",uploadedBy:user.name};
                              await upsertProjectSpec(spec);
                              const refreshed=await loadProjectSpecs();
                              setProjectSpecs(refreshed||[]);
                              showToast("✓ メモを追加");
                            })} style={{flex:1,background:busy?"#e5e7eb":"#eff6ff",color:busy?"#9ca3af":"#a78bfa",border:"1px solid #a78bfa44",borderRadius:8,padding:"8px",fontSize:11,fontWeight:700,cursor:busy?"wait":"pointer"}}>
                              {busy?"処理中…":"📝 テキストメモ追加"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {/* 添付ファイル [2026-07-01] 案件一覧のメモ・添付ファイルセクションを非表示化 */}
                    {false && (
                    <div style={{marginTop:16,borderTop:"1px solid #e5e7eb",paddingTop:14}}>
                      <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ メモ・添付ファイル</div>
                      {(p.attachments||[]).map(a=>(
                        <div key={a.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <span style={{fontSize:10,color:"#111827"}}>{a.author} · {a.createdAt?.slice(5,10).replace("-","/")}</span>
                            {(a.author===user.name||user.role==="admin")&&<button onClick={()=>{if(!window.confirm("このメモを削除しますか？"))return;withBusy(async()=>{await deleteAttachment(p.id,a.id);});}} style={{background:"transparent",border:"none",color:"#111827",cursor:"pointer",fontSize:12,padding:"0 2px"}}>✕</button>}
                          </div>
                          {a.type==="note"&&<div style={{fontSize:12,color:"#374151"}}>{a.text}</div>}
                          {a.type==="image"&&<img src={a.fileUrl||a.data} alt={a.name} onClick={()=>setLightboxImg(a.fileUrl||a.data)} style={{maxWidth:"100%",borderRadius:6,cursor:"zoom-in"}}/>}
                          {a.type==="pdf"&&((a.fileUrl||a.data)?<a href={a.fileUrl||a.data} target="_blank" rel="noopener" style={{fontSize:12,color:"#60a5fa",textDecoration:"underline"}}>📄 {a.name}</a>:<div style={{fontSize:12,color:"#60a5fa"}}>📄 {a.name}</div>)}
                        </div>
                      ))}
                      <div style={{display:"flex",gap:6,marginTop:8,alignItems:"flex-end"}}>
                        {/* [2026-06-08] 改行できるよう input→textarea に変更 */}
                        <textarea value={attachNote} onChange={e=>setAttachNote(e.target.value)} placeholder="メモを追加…（改行できます）" rows={2} style={{...IS,flex:1,padding:"8px 10px",fontSize:12,resize:"vertical",minHeight:40,fontFamily:"'Noto Sans JP',sans-serif",lineHeight:1.5}}/>
                        <button onClick={()=>submitNote(p.id)} disabled={busy||!attachNote.trim()} style={{background:!busy&&attachNote.trim()?"#f97316":"#e5e7eb",color:!busy&&attachNote.trim()?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"8px 12px",fontSize:11,fontWeight:700,cursor:!busy&&attachNote.trim()?"pointer":"not-allowed",whiteSpace:"nowrap"}}>{busy?"送信中…":"送信"}</button>
                      </div>
                      <div style={{marginTop:6,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                        <input ref={attachFileRef} type="file" accept="image/*,application/pdf" onChange={e=>handleAttachFile(e,p.id)} style={{display:"none"}}/>
                        <button onClick={()=>attachFileRef.current?.click()} style={{background:"#fafafa",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:6,padding:"6px 12px",fontSize:10,cursor:"pointer"}}>📎 写真/PDF添付</button>
                        <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:notifyOnAttach?"#f97316":"#9ca3af",cursor:"pointer",userSelect:"none"}}>
                          <input type="checkbox" checked={notifyOnAttach} onChange={e=>setNotifyOnAttach(e.target.checked)} style={{accentColor:"#f97316",width:13,height:13}}/>
                          🔔 通知する
                        </label>
                      </div>
                    </div>
                    )}
                    {/* [2026-06-17] 図面データ */}
                    <div style={{marginTop:16,borderTop:"1px solid #e5e7eb",paddingTop:14}}>
                      <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ 図面データ</div>
                      {drawings[p.id]===undefined&&<div style={{fontSize:11,color:"#9ca3af"}}>読み込み中…</div>}
                      {drawings[p.id]?.length===0&&<div style={{fontSize:11,color:"#9ca3af"}}>図面はまだありません</div>}
                      {(drawings[p.id]?.filter(d=>d.fileType==="image").length>0)&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
                          {drawings[p.id].filter(d=>d.fileType==="image").map(d=>(
                            <div key={d.id} style={{position:"relative"}}>
                              <img src={d.fileData} alt={d.fileName} onClick={()=>setLightboxImg(d.fileData)} style={{width:84,height:84,objectFit:"cover",borderRadius:8,border:"1px solid #d1d5db",cursor:"zoom-in"}}/>
                              {(d.uploadedBy===user.id||user.role==="admin")&&<button onClick={()=>{if(!window.confirm("この図面を削除しますか？"))return;withBusy(async()=>{await deleteDrawing(p.id,d.id);});}} style={{position:"absolute",top:-6,right:-6,background:"#ef4444",border:"none",color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,cursor:"pointer",lineHeight:"20px",textAlign:"center"}}>✕</button>}
                            </div>
                          ))}
                        </div>
                      )}
                      {drawings[p.id]?.filter(d=>d.fileType==="pdf").map(d=>(
                        <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                          <a href={d.fileData} target="_blank" rel="noopener" style={{fontSize:12,color:"#60a5fa",textDecoration:"underline",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📄 {d.fileName}</a>
                          {(d.uploadedBy===user.id||user.role==="admin")&&<button onClick={()=>{if(!window.confirm("この図面を削除しますか？"))return;withBusy(async()=>{await deleteDrawing(p.id,d.id);});}} style={{background:"transparent",border:"none",color:"#111827",cursor:"pointer",fontSize:12,padding:"0 2px",flexShrink:0,marginLeft:8}}>✕</button>}
                        </div>
                      ))}
                      <div style={{marginTop:8}}>
                        <input ref={drawingFileRef} type="file" accept="image/*,application/pdf" onChange={e=>handleDrawingFile(e,p.id)} style={{display:"none"}}/>
                        <button onClick={()=>drawingFileRef.current?.click()} style={{background:"#fafafa",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:6,padding:"6px 12px",fontSize:10,cursor:"pointer"}}>📐 図面を追加（画像/PDF）</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ 休暇管理タブ ═══ */}
      {tab==="休暇管理"&&(
        <div style={{padding:16}}>
          <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ {user.name}さんの有給残日数</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,marginBottom:6}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:36,fontWeight:700,color:"#22c55e",lineHeight:1}}>{paidTotal-paidUsed(user.id)}</span>
              <span style={{fontSize:12,color:"#111827",marginBottom:6}}>日 / {paidTotal}日</span>
            </div>
            <div style={{fontSize:9,color:"#111827",marginBottom:10}}>付与{paidInfo.granted}日{paidInfo.carried>0?` + 繰越${paidInfo.carried}日`:""} − 使用{paidUsed(user.id)}日</div>
            <div style={{height:6,background:"#e5e7eb",borderRadius:6,overflow:"hidden",marginBottom:12}}>
              <div style={{height:"100%",width:`${((paidTotal-paidUsed(user.id))/paidTotal)*100}%`,background:"linear-gradient(90deg,#22c55e88,#22c55e)",transition:"width 0.4s"}}/>
            </div>
            <button onClick={()=>setModal("leave")} style={{width:"100%",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#000",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer"}}>＋ 休暇・勤怠を申請する</button>
          </div>
          {/* [2026-04-21] 休日出勤分カード: 法定休日(日曜) / 所定休日(土曜) / 長期休暇(お盆・年末年始) */}
          {(()=>{
            const allWorks = getAvailableFurikaeWorks(user.id, leaveData);
            const sundayWorks = allWorks.filter(w=>w.holidayType==="sunday");
            const saturdayWorks = allWorks.filter(w=>w.holidayType==="saturday");
            const approvedAll = (leaveData[user.id]||[]).filter(l=>l.type==="holiday"&&l.status==="承認");
            const saturdayBuyouts = approvedAll.filter(l=>l.holidayType==="saturday"&&l.holidayPref==="買取希望");
            const longWorks = approvedAll.filter(l=>l.holidayType==="obon"||l.holidayType==="newyear");
            const longCarry = longWorks.filter(l=>l.holidayPref==="有給繰越");
            const longCarryDays = longCarry.reduce((a,l)=>a+Number(l.days||0),0);
            const expiryAlerts = getFurikaeAlerts(user.id);
            if (sundayWorks.length===0 && saturdayWorks.length===0 && saturdayBuyouts.length===0 && longWorks.length===0) return null;
            const sumDays = arr => arr.reduce((a,l)=>a+Number(l.days||0),0);
            return (
              <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px",marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
                {expiryAlerts.length>0&&(
                  <div style={{fontSize:11,color:"#f59e0b",background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:6,padding:"6px 10px"}}>
                    ⏰ 振替休日の期限が近いものがあります（{expiryAlerts.length}件）
                  </div>
                )}
                {sundayWorks.length>0&&(
                  <div>
                    <div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginBottom:4}}>■ 法定休日出勤（日曜）</div>
                    <div style={{fontSize:11,color:"#111827",marginBottom:2}}>振替残: <b style={{color:"#60a5fa"}}>{sumDays(sundayWorks)}日</b></div>
                    {sundayWorks.map(w=>{
                      const exp=addThreeMonths(w.date);
                      const dl=Math.ceil((exp-new Date())/86400000);
                      return <div key={w.id} style={{fontSize:10,color:"#6b7280",marginLeft:8}}>📅 {w.date}出勤 → 期限{dateStrJST(exp)}（残{dl}日）</div>;
                    })}
                  </div>
                )}
                {(saturdayWorks.length>0||saturdayBuyouts.length>0)&&(
                  <div>
                    <div style={{fontSize:10,color:"#f97316",fontWeight:700,marginBottom:4}}>■ 所定休日出勤（土曜）</div>
                    {saturdayWorks.length>0&&(
                      <>
                        <div style={{fontSize:11,color:"#111827",marginBottom:2}}>振替残: <b style={{color:"#60a5fa"}}>{sumDays(saturdayWorks)}日</b></div>
                        {saturdayWorks.map(w=>{
                          const exp=addThreeMonths(w.date);
                          const dl=Math.ceil((exp-new Date())/86400000);
                          return <div key={w.id} style={{fontSize:10,color:"#6b7280",marginLeft:8}}>📅 {w.date}出勤（{w.days}日） → 期限{dateStrJST(exp)}（残{dl}日）</div>;
                        })}
                      </>
                    )}
                    {saturdayBuyouts.length>0&&(
                      <div style={{marginTop:4}}>
                        <div style={{fontSize:11,color:"#111827",marginBottom:2}}>買取: 計{sumDays(saturdayBuyouts)}日（{saturdayBuyouts.map(b=>`${b.date}(${b.days}日)`).join("、")}）</div>
                      </div>
                    )}
                  </div>
                )}
                {longWorks.length>0&&(
                  <div>
                    <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,marginBottom:4}}>■ 長期休暇出勤（お盆・年末年始）</div>
                    <div style={{fontSize:11,color:"#111827",marginBottom:2}}>有給繰越: <b style={{color:"#22c55e"}}>{longCarryDays}日</b></div>
                    {longWorks.map(w=>(
                      <div key={w.id} style={{fontSize:10,color:"#6b7280",marginLeft:8}}>📅 {w.date}出勤（{HOLIDAY_TYPE_LABEL[w.holidayType]}・{w.days}日）</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          <div>
            <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ 申請履歴</div>
            {(leaveData[user.id]||[]).length===0
              ?<div style={{fontSize:12,color:"#111827",textAlign:"center",padding:"12px 0"}}>申請履歴がありません</div>
              :[...(leaveData[user.id]||[])].sort((a,b)=>b.date.localeCompare(a.date)).map(l=>{
                const lt=LEAVE_TYPES.find(t=>t.id===l.type);
                const sc=l.status==="承認"?"#22c55e":l.status==="却下"?"#ef4444":"#f59e0b";
                return (
                  <div key={l.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span>{lt?.icon}</span>
                        <span style={{fontSize:12,fontWeight:600,color:lt?.color}}>{lt?.label}</span>
                        <span style={{fontSize:11,color:"#111827"}}>{l.days}日</span>
                      </div>
                      <div style={{fontSize:10,color:sc,background:`${sc}22`,border:`1px solid ${sc}44`,borderRadius:4,padding:"2px 8px",fontWeight:700}}>{l.status}</div>
                    </div>
                    <div style={{fontSize:11,color:"#111827"}}>
                      {l.date}
                      {l.type==="furikae"&&l.holidayWorkId&&(()=>{
                        const origin=(leaveData[user.id]||[]).find(x=>x.id===l.holidayWorkId);
                        return origin?<span style={{marginLeft:6,color:"#60a5fa",fontSize:10}}>← {origin.date}出勤分</span>:null;
                      })()}
                      {l.type==="holiday"&&l.holidayType&&<span style={{marginLeft:6,color:"#f97316",fontSize:10}}>({HOLIDAY_TYPE_LABEL[l.holidayType]}{l.holidayPref==="買取希望"?" 買取":l.holidayPref==="振休希望"?" 振休":l.holidayPref==="有給繰越"?" 有給繰越":""}{l.days&&l.days!==1?` ${l.days}日`:""})</span>}
                      {l.memo&&<span style={{marginLeft:8,color:"#111827"}}>— {l.memo}</span>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* ═══ [v14] 名刺タブ（全ユーザー可） ═══ */}
      {tab==="名刺"&&(
        <div style={{padding:16}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:12}}>■ 名刺管理</div>
          <input type="text" value={contactSearch} onChange={e=>setContactSearch(e.target.value)} placeholder="名前・会社で検索…" style={{...IS,marginBottom:12,padding:"9px 12px",fontSize:12}}/>
          {/* 名刺OCRボタン */}
          <div style={{marginBottom:12}}>
            <input type="file" accept="image/*" capture="environment" id="ocrInput" style={{display:"none"}} onChange={async(e)=>{
              const file=e.target.files?.[0]; if(!file) return;
              setOcrLoading(true);
              try {
                const reader=new FileReader();
                // [2026-04-28] OCR後に dataURL も photoUrl に保存
                const dataUrl=await new Promise((res,rej)=>{reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(file);});
                const base64=dataUrl.split(",")[1];
                const mediaType=file.type||"image/jpeg";
                const resp=await callClaudeProxy({action:"ocr_meishi",imageBase64:base64,mediaType});
                if(!resp.ok) throw new Error("OCR APIエラー");
                const data=await resp.json();
                const text=data.content?.[0]?.text||"";
                const clean=text.replace(/```json\n?/g,"").replace(/```/g,"").trim();
                const parsed=JSON.parse(clean);
                // [2026-05-21] OCR後の画像はStorageに上げてURLを保存（DBにbase64を入れない）
                const photoUrl = await uploadFieldPhoto(base64, file.name, mediaType) || dataUrl;
                setContactForm2(f=>({...f,name:parsed.name||f.name,company:parsed.company||f.company,phone:parsed.phone||f.phone,email:parsed.email||f.email,address:parsed.address||f.address,notes:parsed.notes||f.notes,photoUrl}));
                showToast("✓ 名刺を読み取りました");
              } catch(err){ showToast("名刺の読み取りに失敗しました"); }
              setOcrLoading(false); e.target.value="";
            }}/>
            <button onClick={()=>document.getElementById("ocrInput").click()} disabled={ocrLoading} style={{width:"100%",background:ocrLoading?"#e5e7eb":"linear-gradient(135deg,#a78bfa,#7c3aed)",color:ocrLoading?"#9ca3af":"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:ocrLoading?"not-allowed":"pointer"}}>
              {ocrLoading?"📷 読み取り中…":"📷 名刺を撮影してOCR"}
            </button>
          </div>

          <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"14px",marginBottom:16}}>
            <div style={{fontSize:10,color:"#f97316",marginBottom:10}}>{editContactId?"✏ 編集":"＋ 名刺を追加"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {/* [2026-04-28] カテゴリ選択 */}
              <div>
                <div style={{fontSize:9,color:"#111827",marginBottom:3}}>カテゴリ</div>
                <div style={{display:"flex",gap:6}}>
                  {["顧客","協力会社"].map(cat=>(
                    <button key={cat} type="button" onClick={()=>setContactForm2(f=>({...f,category:cat}))} style={{flex:1,background:contactForm.category===cat?(cat==="顧客"?"#f97316":"#a78bfa"):"#e5e7eb",color:contactForm.category===cat?"#000":"#6b7280",border:"1px solid",borderColor:contactForm.category===cat?(cat==="顧客"?"#f97316":"#a78bfa"):"#d1d5db",borderRadius:6,padding:"7px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>{cat}</button>
                  ))}
                </div>
              </div>
              {/* [2026-04-28] 名刺画像 */}
              <div>
                <div style={{fontSize:9,color:"#111827",marginBottom:3}}>名刺画像</div>
                <input type="file" accept="image/*" capture="environment" id="contactPhotoInput" style={{display:"none"}} onChange={async(e)=>{
                  const file=e.target.files?.[0]; if(!file) return;
                  // [2026-05-21] 画像はStorageに上げてURLを保存（DBにbase64を入れない）
                  const reader=new FileReader();
                  reader.onload=async()=>{
                    const b64Body = String(reader.result).split(",")[1] || "";
                    const url = await uploadFieldPhoto(b64Body, file.name, file.type);
                    if (url) setContactForm2(f=>({...f,photoUrl:url}));
                    else { setContactForm2(f=>({...f,photoUrl:reader.result})); showToast("画像アップロード失敗。一時保存します"); }
                  };
                  reader.readAsDataURL(file);
                  e.target.value="";
                }}/>
                {contactForm.photoUrl?(
                  <div style={{position:"relative",display:"inline-block"}}>
                    <img src={contactForm.photoUrl} alt="名刺" style={{maxWidth:"100%",maxHeight:160,borderRadius:8,border:"1px solid #d1d5db"}}/>
                    <button type="button" onClick={()=>setContactForm2(f=>({...f,photoUrl:""}))} style={{position:"absolute",top:4,right:4,background:"#000a",color:"#fff",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",fontSize:12}}>✕</button>
                  </div>
                ):(
                  <button type="button" onClick={()=>document.getElementById("contactPhotoInput").click()} style={{width:"100%",background:"#eff6ff",color:"#60a5fa",border:"1px dashed #60a5fa44",borderRadius:8,padding:"12px",fontSize:11,cursor:"pointer"}}>📷 名刺画像を追加</button>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>氏名 *</div><input type="text" value={contactForm.name} onChange={e=>setContactForm2(f=>({...f,name:e.target.value}))} placeholder="山田 太郎" style={IS}/></div>
                <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>会社名</div><input type="text" value={contactForm.company} onChange={e=>setContactForm2(f=>({...f,company:e.target.value}))} placeholder="○○工業" style={IS}/></div>
                <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>電話番号</div><input type="tel" value={contactForm.phone} onChange={e=>setContactForm2(f=>({...f,phone:e.target.value}))} placeholder="090-xxxx-xxxx" style={IS}/></div>
                <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>メール</div><input type="email" value={contactForm.email} onChange={e=>setContactForm2(f=>({...f,email:e.target.value}))} placeholder="xxx@example.com" style={IS}/></div>
              </div>
              <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>住所</div><input type="text" value={contactForm.address} onChange={e=>setContactForm2(f=>({...f,address:e.target.value}))} placeholder="埼玉県八潮市…" style={IS}/></div>
              <div><div style={{fontSize:9,color:"#111827",marginBottom:3}}>メモ</div><input type="text" value={contactForm.notes} onChange={e=>setContactForm2(f=>({...f,notes:e.target.value}))} placeholder="現場監督・○○工事担当" style={IS}/></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>withBusy(async()=>{
                  if(!contactForm.name) return;
                  // [2026-04-22] DB保存を先に実行
                  if(editContactId){
                    const ok = await updateContactDB(editContactId,contactForm);
                    if(!ok) return;
                    setContacts(prev=>prev.map(c=>c.id===editContactId?{...c,...contactForm}:c));
                    showToast("✓ 更新しました");
                  } else {
                    const nc={id:uid(),...contactForm,createdAt:new Date().toISOString()};
                    const ok = await insertContact(nc);
                    if(!ok) return;
                    setContacts(prev=>[nc,...prev]);
                    showToast("✓ 名刺を追加しました");
                  }
                  setContactForm2({name:"",company:"",phone:"",email:"",address:"",notes:"",photoUrl:"",category:"顧客"});
                  setEditContactId(null);
                })} disabled={!contactForm.name||busy} style={{flex:1,background:(contactForm.name&&!busy)?"linear-gradient(135deg,#f97316,#ef4444)":"#e5e7eb",color:(contactForm.name&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:(contactForm.name&&!busy)?"pointer":"not-allowed"}}>
                  {busy?"送信中…":(editContactId?"更新する":"追加する")}
                </button>
                {editContactId&&<button onClick={()=>{setEditContactId(null);setContactForm2({name:"",company:"",phone:"",email:"",address:"",notes:"",photoUrl:"",category:"顧客"});}} style={{background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"11px 14px",fontSize:12,cursor:"pointer"}}>キャンセル</button>}
              </div>
            </div>
          </div>
          {/* [2026-04-28] カテゴリフィルター */}
          <div style={{display:"flex",gap:4,marginBottom:10}}>
            {[["all","全て"],["顧客","顧客"],["協力会社","協力会社"]].map(([key,label])=>{
              const cnt=key==="all"?contacts.length:contacts.filter(c=>c.category===key).length;
              return (
                <button key={key} onClick={()=>setContactCategoryFilter(key)} style={{flex:1,background:contactCategoryFilter===key?"#f97316":"#f9fafb",color:contactCategoryFilter===key?"#000":"#6b7280",border:"1px solid",borderColor:contactCategoryFilter===key?"#f97316":"#e5e7eb",borderRadius:6,padding:"6px 4px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{label}({cnt})</button>
              );
            })}
          </div>
          {contacts.filter(c=>(!contactSearch||c.name.includes(contactSearch)||c.company.includes(contactSearch))&&(contactCategoryFilter==="all"||c.category===contactCategoryFilter)).map(c=>(
            <div key={c.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
              <div style={{display:"flex",gap:10}}>
                {c.photoUrl&&(
                  <img src={c.photoUrl} alt={c.name} onClick={()=>setLightboxImg(c.photoUrl)} style={{width:60,height:60,objectFit:"cover",borderRadius:6,cursor:"zoom-in",flexShrink:0,border:"1px solid #d1d5db"}}/>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,gap:6}}>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:9,color:c.category==="協力会社"?"#a78bfa":"#f97316",background:c.category==="協力会社"?"#eff6ff":"#fef3c7",border:`1px solid ${c.category==="協力会社"?"#a78bfa44":"#f9731644"}`,borderRadius:3,padding:"1px 5px",fontWeight:700,flexShrink:0}}>{c.category||"顧客"}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{c.name}</div>
                      {c.company&&<div style={{fontSize:11,color:"#6b7280"}}>{c.company}</div>}
                    </div>
                    <button onClick={()=>{setEditContactId(c.id);setContactForm2({name:c.name,company:c.company,phone:c.phone,email:c.email,address:c.address,notes:c.notes,photoUrl:c.photoUrl||"",category:c.category||"顧客"});window.scrollTo({top:0,behavior:"smooth"});}} style={{background:"#eff6ff",color:"#60a5fa",border:"1px solid #60a5fa33",borderRadius:6,padding:"4px 10px",fontSize:10,cursor:"pointer",flexShrink:0}}>編集</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:10,color:"#111827"}}>
                    {c.phone&&<span>📞 {c.phone}</span>}
                    {c.email&&<span>✉ {c.email}</span>}
                    {c.address&&<span>📍 {c.address}</span>}
                  </div>
                  {c.notes&&<div style={{fontSize:10,color:"#111827",marginTop:4}}>📝 {c.notes}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ [2026-09-05] 研修タブ ═══ */}
      {tab==="研修"&&training&&(
        <div style={{padding:16}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ 社内研修</div>
          {(()=>{
            const done = training.responses.filter(r=>r.confirmed).length;
            const total = training.questions.length;
            const fin = !!training.completedAt;
            return (
              <div style={{background:fin?"#f0fdf4":"#fafafa",border:`1px solid ${fin?"#22c55e44":"#e5e7eb"}`,borderRadius:10,padding:14}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{training.training.title}</div>
                <div style={{fontSize:11,color:training.pastDeadline&&!fin?"#ef4444":"#6b7280",marginBottom:10,lineHeight:1.8}}>
                  締切: {fmtTrainingDeadline(training.training.deadline)}
                  {training.pastDeadline&&!fin&&<><br/>締切を過ぎています。回答するまで打刻以外は使えません。</>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7280",marginBottom:6}}>
                  <span>{done} / {total} 問</span><span>{fin?"完了":`残り${total-done}問`}</span>
                </div>
                <div style={{height:5,background:"#e5e7eb",borderRadius:999,overflow:"hidden",marginBottom:12}}>
                  <div style={{height:"100%",width:`${total?(done/total)*100:0}%`,background:fin?"#22c55e":"#2563eb",borderRadius:999}}/>
                </div>
                <button onClick={()=>{ if(fin){ setTrainingReview(true); } else { setTrainingDismissed(false); setTab("打刻"); } }}
                  style={{width:"100%",minHeight:52,border:"none",borderRadius:8,padding:14,fontSize:15,fontWeight:700,
                          cursor:"pointer",background:fin?"#ffffff":"#2563eb",color:fin?"#111827":"#ffffff",
                          borderWidth:fin?1:0,borderStyle:fin?"solid":"none",borderColor:"#9ca3af"}}>
                  {fin?"ミニ教材・ポイントを見る":(done>0?"続きから回答する":"研修を始める")}
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ [2026-04-27] アンケートタブ ═══ */}
      {tab==="アンケート"&&(
        <div style={{padding:16}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:10}}>■ アンケート一覧</div>
          {mySurveys.length===0?(
            <div style={{textAlign:"center",color:"#111827",padding:"40px 0",fontSize:12}}>現在公開中のアンケートはありません</div>
          ):(
            // [2026-04-29] state ベースに書き換え。全質問入力完了まで送信ボタン disabled
            mySurveys.map(s=>{
              const myResp = surveyResponses.find(r=>r.surveyId===s.id&&r.staffId===user.id);
              const answered = !!myResp;
              // [2026-09-04] 設問ごとの最低文字数(q.minChars)。未設定の設問は従来通り1文字以上でOK。
                            //   アプリ全体の一律ルールにしないのは、日程回答のような短くて正しい答えを弾かないため。
                            const minOf = q => Number(q&&q.minChars)||0;
                            const isFilled = (v,q) => { const t=String(v==null?"":v).trim(); return t!=="" && t.length>=minOf(q); };
              const ans = surveyAnswers[s.id] || {};
              const totalQ = (s.questions||[]).length;
              const filledQ = (s.questions||[]).filter((q,qi)=>isFilled(ans[qi],q)).length;
              const allAnswered = filledQ === totalQ && totalQ > 0;
              const remaining = totalQ - filledQ;
              // [2026-09-04] 締切日より前なら回答済みでも書き直し・取り消しができる。
              //   「一発勝負」だと思われると当たり障りのないことを書いて終わるので、直せることを見せておく。
              const canEdit = !s.deadline || todayStr() < s.deadline;
              const editing = !!surveyEditing[s.id];
              const showForm = !answered || editing;
              return (
                <div key={s.id} style={{background:answered&&!editing?"#f0fdf4":"#fafafa",border:`1px solid ${answered&&!editing?"#22c55e44":"#e5e7eb"}`,borderRadius:10,padding:"14px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#111827",flex:1}}>{s.title}</div>
                    {answered
                      ? <span style={{fontSize:10,color:"#22c55e",background:"#f0fdf4",border:"1px solid #22c55e44",borderRadius:4,padding:"2px 8px",fontWeight:700,whiteSpace:"nowrap"}}>✓ 回答済み</span>
                      : <span style={{fontSize:10,color:allAnswered?"#22c55e":"#f59e0b",background:allAnswered?"#f0fdf4":"#fef3c7",border:`1px solid ${allAnswered?"#22c55e44":"#f59e0b44"}`,borderRadius:4,padding:"2px 8px",whiteSpace:"nowrap"}}>{filledQ}/{totalQ} 回答</span>
                    }
                  </div>
                  {/* [2026-07-21] 回答期限の表示
                      [2026-09-04] 回答済みでも締切前は「書き直せる」ことを明示する */}
                  {s.deadline&&(
                    answered
                      ? <div style={{fontSize:11,color:canEdit?"#22c55e":"#6b7280",fontWeight:700,marginBottom:8}}>{canEdit?`✓ 回答済み（${dateMDJST(s.deadline).replace("-","/")}の前日まで書き直せます）`:"回答期限を過ぎたため、書き直しはできません"}</div>
                      : <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:8}}>⏰ 回答期限: {dateMDJST(s.deadline).replace("-","/")}（期限を過ぎると回答するまで打刻以外が使えません）</div>
                  )}
                  {(s.questions||[]).map((q,qi)=>{
                    const v = ans[qi];
                    const filled = isFilled(v,q);
                    return (
                    <div key={qi} style={{marginBottom:showForm?14:10}}>
                      <div style={{fontSize:showForm?13:11,fontWeight:showForm?700:400,color:showForm&&!filled?"#f59e0b":"#374151",marginBottom:4,lineHeight:1.6}}>
                        Q{qi+1}. {q.text} {showForm && !filled && <span style={{color:"#f59e0b",fontWeight:700,fontSize:11}}>* 必須</span>}
                      </div>
                      {showForm&&q.note&&<div style={{fontSize:11,color:"#6b7280",marginBottom:6,lineHeight:1.7}}>※{q.note}</div>}
                      {!showForm?(
                        <div style={{fontSize:12,color:"#4b5563",background:"#e5e7eb",border:"1px solid #e5e7eb",borderRadius:6,padding:"7px 10px",whiteSpace:"pre-wrap"}}>{myResp.answers?.[qi]||"—"}</div>
                      ):(
                        <>
                          {q.type==="text"&&(
                            <textarea value={v||""} rows={4}
                              onChange={e=>setSurveyAnswers(p=>({...p,[s.id]:{...(p[s.id]||{}),[qi]:e.target.value}}))}
                              style={{...IS,fontSize:16,padding:"11px 12px",lineHeight:1.7,resize:"vertical",minHeight:96,borderColor:filled?"#d1d5db":"#f59e0b66"}}/>
                          )}
                          {/* [2026-09-04] 文字数カウンタ（最低文字数つきの設問のみ） */}
                          {q.type==="text"&&minOf(q)>0&&(()=>{
                            const len=String(v==null?"":v).trim().length;
                            const ok=len>=minOf(q);
                            return <div style={{fontSize:11,color:ok?"#22c55e":"#f59e0b",marginTop:4,textAlign:"right"}}>{ok?(len+"文字 ✓"):(len+" / "+minOf(q)+"文字（あと"+(minOf(q)-len)+"文字）")}</div>;
                          })()}
                          {q.type==="select"&&(
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              {(q.options||[]).map((opt,oi)=>{
                                const sel = v === opt;
                                return (
                                  <button key={oi} type="button"
                                    onClick={()=>setSurveyAnswers(p=>({...p,[s.id]:{...(p[s.id]||{}),[qi]:opt}}))}
                                    style={{background:sel?"#22c55e":"#e5e7eb",border:`1px solid ${sel?"#22c55e":"#d1d5db"}`,borderRadius:6,color:sel?"#000":"#111827",padding:"6px 12px",fontSize:12,fontWeight:sel?700:400,cursor:"pointer"}}>{opt}</button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>);
                  })}
                  {showForm&&(
                    <button disabled={busy||!allAnswered} onClick={()=>withBusy(async()=>{
                      const cur = surveyAnswers[s.id] || {};
                      const missing = (s.questions||[]).filter((q,qi)=>!isFilled(cur[qi],q));
                      if(missing.length>0){ showToast("未回答、または文字数が足りない質問があります"); return; }
                      const ok=await submitSurveyResponse(s.id,cur);
                      if(!ok){showToast(WRITE_ERROR_MSG);return;}
                      const fresh=await loadSurveyResponses();
                      setSurveyResponses(fresh||[]);
                      setSurveyAnswers(p=>{ const cp={...p}; delete cp[s.id]; return cp; });
                      setSurveyEditing(p=>{ const cp={...p}; delete cp[s.id]; return cp; });
                      showToast(editing?"✓ 書き直しました":"✓ アンケートに回答しました");
                    })} style={{width:"100%",background:(busy||!allAnswered)?"#e5e7eb":"linear-gradient(135deg,#22c55e,#16a34a)",color:(busy||!allAnswered)?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"14px",fontSize:14,fontWeight:700,cursor:(busy||!allAnswered)?"not-allowed":"pointer",marginTop:6}}>
                      {busy?"送信中…":(!allAnswered?`あと ${remaining} 問`:(editing?"書き直しを保存する":"回答する"))}
                    </button>
                  )}
                  {/* [2026-09-04] 編集中の取りやめ。保存前の内容は破棄して元の回答表示に戻す */}
                  {showForm&&editing&&(
                    <div style={{textAlign:"center",marginTop:8}}>
                      <button onClick={()=>{
                        setSurveyEditing(p=>{ const cp={...p}; delete cp[s.id]; return cp; });
                        setSurveyAnswers(p=>{ const cp={...p}; delete cp[s.id]; return cp; });
                      }} style={{background:"transparent",border:"none",color:"#9ca3af",fontSize:12,textDecoration:"underline",cursor:"pointer",padding:"10px 14px"}}>書き直しをやめる</button>
                    </div>
                  )}
                  {/* [2026-09-04] 回答済み・締切前だけ出す。取り消しは一番戻せない操作なので、
                        ボタンにせず小さい文字リンクにして押しにくくしておく */}
                  {answered&&!editing&&canEdit&&(
                    <>
                      <button onClick={()=>{
                        setSurveyAnswers(p=>({...p,[s.id]:{...(myResp.answers||{})}}));
                        setSurveyEditing(p=>({...p,[s.id]:true}));
                      }} style={{width:"100%",background:"#ffffff",color:"#111827",border:"1px solid #9ca3af",borderRadius:8,padding:"13px",fontSize:13,fontWeight:700,cursor:"pointer",marginTop:6}}>修正する</button>
                      <div style={{textAlign:"center",marginTop:6}}>
                        <button disabled={busy} onClick={()=>withBusy(async()=>{
                          if(!window.confirm("回答を取り消します。書いた内容は消えます。よろしいですか？")) return;
                          const ok=await deleteMySurveyResponse(s.id);
                          if(!ok){showToast(WRITE_ERROR_MSG);return;}
                          const fresh=await loadSurveyResponses();
                          setSurveyResponses(fresh||[]);
                          showToast("✓ 回答を取り消しました");
                        })} style={{background:"transparent",border:"none",color:"#9ca3af",fontSize:11,textDecoration:"underline",cursor:busy?"wait":"pointer",padding:"10px 14px"}}>回答を取り消す</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ═══ [v14] AIチャットタブ（ユーザー版） ═══ */}
      {tab==="AIチャット"&&(
        <div style={{padding:16,display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:8}}>■ AIに質問（本日 {aiTodayCount}/{AI_DAILY_LIMIT}回）</div>
          <div style={{flex:1,overflowY:"auto",marginBottom:12}}>
            {aiMessages.length===0&&<div style={{textAlign:"center",color:"#111827",padding:"40px 0",fontSize:12}}>自分の打刻・休暇データについて質問できます</div>}
            {aiMessages.map((m,i)=>(
              <div key={i} style={{marginBottom:8,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",background:m.role==="user"?"#a78bfa22":"#fafafa",border:`1px solid ${m.role==="user"?"#a78bfa44":"#d1d5db"}`,color:"#111827"}}>
                  {m.text}
                </div>
              </div>
            ))}
            {aiLoading&&<div style={{textAlign:"center",color:"#a78bfa",fontSize:12,padding:8}}>考え中…</div>}
          </div>
          {aiTodayCount>=AI_DAILY_LIMIT?(
            <div style={{textAlign:"center",color:"#ef4444",fontSize:12,padding:12}}>本日の質問回数上限に達しました（{AI_DAILY_LIMIT}回/日）</div>
          ):(
            <div style={{display:"flex",gap:8}}>
              <input type="text" value={aiQuestion} onChange={e=>setAiQuestion(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAiChat();}} placeholder="質問を入力…" style={{...IS,flex:1}}/>
              <button onClick={runAiChat} disabled={aiLoading||!aiQuestion.trim()} style={{background:aiQuestion.trim()?"linear-gradient(135deg,#a78bfa,#7c3aed)":"#e5e7eb",color:aiQuestion.trim()?"#fff":"#9ca3af",border:"none",borderRadius:8,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:aiQuestion.trim()?"pointer":"not-allowed",minWidth:60}}>送信</button>
            </div>
          )}
        </div>
      )}

      {/* ═══ [2026-05-21] 車両タブ（スタッフ閲覧＋不具合報告。車両の編集・削除は管理者のみ） ═══ */}
      {/* ═══ [2026-10-09] 人工の目安表（川畑さん専用） ═══ */}
      {tab==="人工目安"&&canNinkuInput&&<WorkloadInput showToast={showToast}/>}

      {tab==="車両"&&(
        <div style={{padding:16}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:12}}>■ 車両情報（不具合はここから報告できます）</div>
          {vehicles.length===0
            ?<div style={{fontSize:12,color:"#111827",textAlign:"center",padding:"20px 0"}}>車両が登録されていません</div>
            :vehicles.map(v=>{
              const isOpen=openVehicleIds[v.id];
              const troubles=vehicleTroubles.filter(t=>t.vehicleId===v.id).sort((a,b)=>b.date.localeCompare(a.date));
              const oils=vehicleOilChanges.filter(o=>o.vehicleId===v.id).sort((a,b)=>b.date.localeCompare(a.date));
              const lastOil=oils[0];
              return (
                <div key={v.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                  <button onClick={()=>setOpenVehicleIds(prev=>({...prev,[v.id]:!prev[v.id]}))} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span>🚗</span>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{v.name}</div>
                        <div style={{fontSize:10,color:"#111827",marginTop:2}}>{v.plateNumber}{v.model&&` ／ 証券:${v.model}`}</div>
                        {(v.inspectionDate||v.assignedStaffId)&&(
                          <div style={{fontSize:10,color:"#777",marginTop:2}}>
                            {v.inspectionDate&&<span>🛠 車検:{v.inspectionDate}</span>}
                            {v.assignedStaffId&&<span style={{marginLeft:v.inspectionDate?8:0}}>👤 {staff.find(s=>s.id===v.assignedStaffId)?.name||"不明"}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{color:"#111827",fontSize:12}}>{isOpen?"▲":"▼"}</span>
                  </button>
                  {isOpen&&(
                    <div style={{padding:"0 16px 14px",borderTop:"1px solid #e5e7eb"}}>
                      {/* 不具合報告フォーム */}
                      <div style={{marginTop:12,padding:10,background:"#e5e7eb",border:"1px solid #ef444433",borderRadius:8}}>
                        <div style={{fontSize:10,color:"#ef4444",marginBottom:6}}>⚠ 不具合を報告する</div>
                        <input type="text" value={troubleReportForm.vehicleId===v.id?troubleReportForm.description:""} onChange={e=>setTroubleReportForm({vehicleId:v.id,date:todayStr(),description:e.target.value})} placeholder="例: エンジン始動時に異音" style={{...IS,fontSize:11,marginBottom:6}}/>
                        <button disabled={busy||!(troubleReportForm.vehicleId===v.id&&troubleReportForm.description)} onClick={()=>withBusy(async()=>{
                          if(!(troubleReportForm.vehicleId===v.id&&troubleReportForm.description)) return;
                          const t={id:uid(),vehicleId:v.id,date:todayStr(),description:troubleReportForm.description};
                          const ok=await insertVehicleTrouble(t);
                          if(!ok){showToast(WRITE_ERROR_MSG);return;}
                          setVehicleTroubles(prev=>[t,...prev]);
                          setTroubleReportForm({vehicleId:"",date:todayStr(),description:""});
                          showToast("✓ 不具合を報告しました");
                        })} style={{width:"100%",background:troubleReportForm.vehicleId===v.id&&troubleReportForm.description&&!busy?"#ef4444":"#e5e7eb",color:troubleReportForm.vehicleId===v.id&&troubleReportForm.description&&!busy?"#000":"#9ca3af",border:"none",borderRadius:6,padding:"8px",fontSize:11,fontWeight:700,cursor:troubleReportForm.vehicleId===v.id&&troubleReportForm.description&&!busy?"pointer":"not-allowed"}}>{busy?"…":"報告する"}</button>
                      </div>
                      {/* 不具合履歴（削除は管理者のみ） */}
                      {troubles.length>0&&(
                        <div style={{marginTop:12}}>
                          <div style={{fontSize:10,color:"#ef4444",marginBottom:4}}>⚠ 不具合履歴（{troubles.length}件）</div>
                          {troubles.slice(0,5).map(t=>(
                            <div key={t.id} style={{fontSize:11,color:"#4b5563",padding:"3px 0",borderBottom:"1px solid #fafafa"}}>
                              <span style={{color:"#6b7280",marginRight:8}}>{t.date.slice(5).replace("-","/")}</span>{t.description}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* [2026-05-21] オイル交換記録フォーム（スタッフも記録可） */}
                      {/* [2026-06-12] エレメント交換: 前回未交換なら今回交換を促す（2回に1回ルール） */}
                      {(()=>{ const isF=oilReportForm.vehicleId===v.id; const elementDue=lastOil?lastOil.elementChanged!==true:false; return (
                      <div style={{marginTop:12,padding:10,background:"#f0fdf4",border:"1px solid #22c55e33",borderRadius:8}}>
                        <div style={{fontSize:10,color:"#22c55e",marginBottom:6}}>🛢 オイル交換を記録する <span style={{color:"#6b7280"}}>（目安：5,000kmごと）</span></div>
                        {elementDue&&(
                          <div style={{fontSize:11,color:"#b45309",background:"#fffbeb",border:"1px solid #f59e0b55",borderRadius:6,padding:"6px 8px",marginBottom:6}}>⚠ 前回エレメント未交換です。今回はエレメント交換の時期です</div>
                        )}
                        <div style={{display:"flex",gap:6,marginBottom:6}}>
                          <input type="date" value={isF?oilReportForm.date:todayStr()} onChange={e=>setOilReportForm(f=>({...(f.vehicleId===v.id?f:{vehicleId:v.id,date:todayStr(),mileage:"",note:"",elementChanged:false}),vehicleId:v.id,date:e.target.value}))} style={{...IS,fontSize:11,width:140}}/>
                          <input type="number" value={isF?oilReportForm.mileage:""} onChange={e=>setOilReportForm(f=>({...(f.vehicleId===v.id?f:{vehicleId:v.id,date:todayStr(),mileage:"",note:"",elementChanged:false}),vehicleId:v.id,mileage:e.target.value}))} placeholder="走行距離(km)" style={{...IS,flex:1,fontSize:11}}/>
                        </div>
                        <input type="text" value={isF?oilReportForm.note:""} onChange={e=>setOilReportForm(f=>({...(f.vehicleId===v.id?f:{vehicleId:v.id,date:todayStr(),mileage:"",note:"",elementChanged:false}),vehicleId:v.id,note:e.target.value}))} placeholder="メモ（オイル種別など。任意）" style={{...IS,fontSize:11,marginBottom:6}}/>
                        <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#374151",marginBottom:8,cursor:"pointer"}}>
                          <input type="checkbox" checked={isF?oilReportForm.elementChanged:false} onChange={e=>setOilReportForm(f=>({...(f.vehicleId===v.id?f:{vehicleId:v.id,date:todayStr(),mileage:"",note:"",elementChanged:false}),vehicleId:v.id,elementChanged:e.target.checked}))} style={{width:16,height:16}}/>
                          エレメント（オイルフィルター）も交換した
                        </label>
                        <button disabled={busy||!isF||!oilReportForm.date} onClick={()=>withBusy(async()=>{
                          if(oilReportForm.vehicleId!==v.id||!oilReportForm.date) return;
                          const o={id:uid(),vehicleId:v.id,date:oilReportForm.date,mileage:Number(oilReportForm.mileage)||0,note:oilReportForm.note,elementChanged:oilReportForm.elementChanged};
                          const ok=await insertVehicleOilChange(o);
                          if(!ok){showToast(WRITE_ERROR_MSG);return;}
                          setVehicleOilChanges(prev=>[o,...prev]);
                          setOilReportForm({vehicleId:"",date:todayStr(),mileage:"",note:"",elementChanged:false});
                          showToast("✓ オイル交換を記録しました");
                        })} style={{width:"100%",background:(isF&&oilReportForm.date&&!busy)?"#22c55e":"#e5e7eb",color:(isF&&oilReportForm.date&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:6,padding:"8px",fontSize:11,fontWeight:700,cursor:(isF&&oilReportForm.date&&!busy)?"pointer":"not-allowed"}}>{busy?"…":"記録"}</button>
                      </div>
                      ); })()}
                      {/* オイル交換履歴（直近5件） */}
                      {oils.length>0&&(
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:10,color:"#22c55e",marginBottom:4}}>🛢 オイル交換履歴（{oils.length}件）</div>
                          {oils.slice(0,5).map(o=>(
                            <div key={o.id} style={{fontSize:11,color:"#4b5563",padding:"3px 0",borderBottom:"1px solid #fafafa"}}>
                              <span style={{color:"#6b7280",marginRight:8}}>{o.date.slice(5).replace("-","/")}</span>{o.mileage?o.mileage+"km":""}{o.elementChanged&&<span style={{color:"#16a34a",marginLeft:6,fontWeight:700}}>🔧エレメント交換</span>}{o.note&&<span style={{color:"#6b7280",marginLeft:6}}>／ {o.note}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* ═══ [v14] 会社情報タブ（閲覧のみ） ═══ */}
      {/* [v15] 会社情報 — アコーディオン形式 */}
      {tab==="会社情報"&&(
        <div style={{padding:16}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:12}}>■ 会社情報</div>
          {/* [2026-10-19] 熱中症の手順（いつでも見られる） */}
          <HeatGuide/>
          {/* [2026-06-12] アプリの使い方マニュアル（PDF）への固定リンク */}
          <a href="/manual.pdf" target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",gap:8,background:"#fff7ed",border:"1px solid #f97316",borderRadius:10,padding:"14px 16px",marginBottom:12,textDecoration:"none"}}>
            <span style={{fontSize:14}}>📖</span>
            <span style={{fontSize:13,fontWeight:700,color:"#c2410c"}}>アプリの使い方マニュアル（PDF）</span>
            <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af"}}>開く ›</span>
          </a>
          {/* [2026-10-19] 就業規則・育児介護規則（労基法106条：いつでも見られるようにしておく） */}
          {[["/kisoku.pdf","就業規則（2026年11月1日施行）"],["/ikukai.pdf","育児・介護休業等に関する規則"]].map(([href,label])=>(
            <a key={href} href={href} target="_blank" rel="noopener" style={{display:"flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:10,padding:"14px 16px",marginBottom:12,textDecoration:"none"}}>
              <span style={{fontSize:14}}>📘</span>
              <span style={{fontSize:13,fontWeight:700,color:"#334155"}}>{label}（PDF）</span>
              <span style={{marginLeft:"auto",fontSize:11,color:"#9ca3af"}}>開く ›</span>
            </a>
          ))}
          {companyInfo.length===0
            ?<div style={{fontSize:12,color:"#111827",textAlign:"center",padding:"20px 0"}}>情報が登録されていません</div>
            :companyInfo.map(item=>(
              <div key={item.id} style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
                <button onClick={()=>setOpenInfoItems(prev=>({...prev,[item.id]:!prev[item.id]}))} style={{width:"100%",background:"transparent",border:"none",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12}}>🏢</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{item.title}</span>
                  </div>
                  <span style={{color:"#111827",fontSize:12}}>{openInfoItems[item.id]?"▲":"▼"}</span>
                </button>
                {openInfoItems[item.id]&&(
                  <div style={{padding:"0 16px 14px",fontSize:12,color:"#4b5563",lineHeight:1.6,whiteSpace:"pre-wrap",borderTop:"1px solid #e5e7eb"}}>
                    <div style={{paddingTop:10}}>{item.content}</div>
                  </div>
                )}
              </div>
            ))
          }

        </div>
      )}

      {/* ═══ [2026-06-12] ご意見箱タブ（匿名投稿） ═══ */}
      {tab==="ご意見箱"&&(
        <div style={{padding:16,maxWidth:560,margin:"0 auto"}}>
          <div style={{fontSize:10,color:"#111827",letterSpacing:"0.1em",marginBottom:12}}>■ ご意見箱</div>
          {suggestionSent?(
            <div style={{background:"#f0fdf4",border:"1px solid #22c55e55",borderRadius:12,padding:"28px 16px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:15,fontWeight:700,color:"#16a34a",marginBottom:6}}>送信しました</div>
              <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>ご意見ありがとうございます。匿名で送信されました。</div>
              <button onClick={()=>setSuggestionSent(false)} style={{background:"#e5e7eb",color:"#374151",border:"none",borderRadius:8,padding:"8px 20px",fontSize:12,fontWeight:700,cursor:"pointer"}}>続けて投稿する</button>
            </div>
          ):(
            <div style={{background:"#fafafa",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6,marginBottom:10}}>会社への意見・要望・困りごとを匿名で送れます。<br/>誰が書いたかは管理者に表示されません。気軽にどうぞ。</div>
              <textarea value={suggestionText} onChange={e=>setSuggestionText(e.target.value)} placeholder="ご意見・ご要望を入力…" rows={5} style={{width:"100%",background:"#fff",border:"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",color:"#111827",fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box",marginBottom:10}}/>
              <button disabled={busy||!suggestionText.trim()} onClick={()=>withBusy(async()=>{
                const c=suggestionText.trim();
                if(!c) return;
                const ok=await submitSuggestion(c);
                if(!ok){showToast(WRITE_ERROR_MSG);return;}
                setSuggestionText("");
                setSuggestionSent(true);
              })} style={{width:"100%",background:(suggestionText.trim()&&!busy)?"#f97316":"#e5e7eb",color:(suggestionText.trim()&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"11px",fontSize:13,fontWeight:700,cursor:(suggestionText.trim()&&!busy)?"pointer":"not-allowed"}}>{busy?"送信中…":"送信する"}</button>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {/* [2026-04-17] 案件情報編集モーダル（user側でも削除以外OK） */}
      {modal==="editProject"&&editProjectId&&(()=>{
        const editProj = projects.find(x=>x.id===editProjectId);
        if(!editProj) return null;
        return (
          <Modal title={`案件編集 — ${editProj.name}`} accent="#22c55e" onClose={()=>{setModal(null);setEditProjectId(null);}}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Field label="現場名 *"><input type="text" value={adminPf.name} onChange={e=>setAdminPf(f=>({...f,name:e.target.value}))} style={IS}/></Field>
              <Field label="顧客"><select value={adminPf.lead} onChange={e=>setAdminPf(f=>({...f,lead:e.target.value}))} style={IS}><option value="">選択してください</option>{customers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
              {/* [2026-04-20] 元請担当者（旧:顧客担当者）を顧客の下に移動 */}
              <Field label="元請担当者"><input type="text" value={adminPf.customerContact} onChange={e=>setAdminPf(f=>({...f,customerContact:e.target.value}))} placeholder="現場監督名など" style={IS}/></Field>
              <Field label="ステータス">
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["準備中","進行中","完了","中止"].map(st=>(
                    <button key={st} onClick={()=>{
                      if(st!==adminPf.status&&!window.confirm(`ステータスを「${adminPf.status}」→「${st}」に変更します。\n保存時に全員のアプリに反映されます。よろしいですか？`))return;
                      setAdminPf(f=>({...f,status:st}));
                    }} style={{background:adminPf.status===st?"#f97316":"#e5e7eb",color:adminPf.status===st?"#000":"#6b7280",border:"1px solid",borderColor:adminPf.status===st?"#f97316":"#d1d5db",borderRadius:8,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{st}</button>
                  ))}
                </div>
              </Field>
              <Field label="契約形態">
                <div style={{display:"flex",gap:8}}>
                  {["請負","応援"].map(ct=>(
                    <button key={ct} onClick={()=>setAdminPf(f=>({...f,contractType:ct}))} style={{flex:1,background:adminPf.contractType===ct?"#f97316":"#e5e7eb",color:adminPf.contractType===ct?"#000":"#6b7280",border:"1px solid",borderColor:adminPf.contractType===ct?"#f97316":"#d1d5db",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{ct}</button>
                  ))}
                </div>
              </Field>
              {/* [2026-04-20] 案件区分（新築/改修） */}
              <Field label="工事区分">
                <div style={{display:"flex",gap:8}}>
                  {[{v:"新築",icon:"🏗"},{v:"改修",icon:"🔧"}].map(wc=>(
                    <button key={wc.v} onClick={()=>setAdminPf(f=>({...f,workCategory:f.workCategory===wc.v?"":wc.v}))} style={{flex:1,background:adminPf.workCategory===wc.v?"#22c55e":"#e5e7eb",color:adminPf.workCategory===wc.v?"#000":"#6b7280",border:"1px solid",borderColor:adminPf.workCategory===wc.v?"#22c55e":"#d1d5db",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{wc.icon} {wc.v}工事</button>
                  ))}
                </div>
              </Field>
              <Field label="住所"><input type="text" value={adminPf.address} onChange={e=>setAdminPf(f=>({...f,address:e.target.value}))} style={IS}/></Field>
              <Field label="工期">
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="date" value={adminPf.startDate} onChange={e=>setAdminPf(f=>({...f,startDate:e.target.value}))} style={{...IS,flex:1}}/>
                  <span style={{color:"#6b7280"}}>〜</span>
                  <input type="date" value={adminPf.endDate} onChange={e=>setAdminPf(f=>({...f,endDate:e.target.value}))} style={{...IS,flex:1}}/>
                </div>
              </Field>
              {/* [2026-04-20] ユーザー側は見積/請負金額・目標人工数欄を非表示（管理者のみ編集） */}
              {/* [2026-04-20] 元請担当者は顧客の直下に移動したので、ここは現場担当者のみ */}
              <Field label="現場担当者">
                <select value={adminPf.internalOwner} onChange={e=>setAdminPf(f=>({...f,internalOwner:e.target.value}))} style={IS}>
                  <option value="">未設定</option>
                  {staff.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </Field>
              {/* [2026-04-22] 工事詳細（現場スタッフも編集可。金額は見せない） */}
              <Field label="工事詳細">
                <textarea value={adminPf.workDetails||""} onChange={e=>setAdminPf(f=>({...f,workDetails:e.target.value}))} placeholder="配管保温、ダクト保温、ラッキング範囲、立会い有無など（改行可）" rows={4} style={{...IS,resize:"vertical",fontFamily:"'Noto Sans JP',sans-serif"}}/>
              </Field>
              {/* [2026-04-20] 請求状況は非表示（両画面で不要と判断） */}
              <button disabled={!adminPf.name||savingEditProject} onClick={async()=>{
                if(!adminPf.name) return;
                setSavingEditProject(true);
                try{
                  const fields={};
                  if(adminPf.name!==editProj.name)fields.name=adminPf.name;
                  if(adminPf.lead!==(editProj.lead||""))fields.lead=adminPf.lead;
                  if(adminPf.status!==(editProj.status||"準備中"))fields.status=adminPf.status;
                  if(adminPf.contractType!==(editProj.contractType||""))fields.contractType=adminPf.contractType;
                  // [2026-04-20] 案件区分（新築/改修）
                  if((adminPf.workCategory||"")!==(editProj.workCategory||""))fields.workCategory=adminPf.workCategory||"";
                  if(adminPf.address!==(editProj.address||""))fields.address=adminPf.address;
                  if(adminPf.startDate!==(editProj.startDate||""))fields.startDate=adminPf.startDate;
                  if(adminPf.endDate!==(editProj.endDate||""))fields.endDate=adminPf.endDate;
                  // [2026-04-20] ユーザー側では金額・目標人工を触らせない（送信しない）
                  if((adminPf.customerContact||"")!==(editProj.customerContact||""))fields.customerContact=adminPf.customerContact||"";
                  if((adminPf.internalOwner||"")!==(editProj.internalOwner||""))fields.internalOwner=adminPf.internalOwner||"";
                  // [2026-04-22] 工事詳細
                  if((adminPf.workDetails||"")!==(editProj.workDetails||""))fields.workDetails=adminPf.workDetails||"";
                  // [2026-04-20] 請求状況は UI 非表示のため送信対象から外す
                  if(Object.keys(fields).length>0){
                    // [2026-04-22] DB保存を先に実行
                    const ok = await updateProjectFields(editProjectId,fields);
                    if(!ok){ showToast(WRITE_ERROR_MSG); return; }
                    setProjects(prev=>prev.map(p=>p.id===editProjectId?{...p,...fields}:p));
                  }
                  setModal(null);setEditProjectId(null);
                  showToast("✓ 案件情報を更新しました");
                }catch(e){showToast("❌ 更新失敗: "+(e?.message||e));}
                finally{setSavingEditProject(false);}
              }} style={{background:adminPf.name&&!savingEditProject?"linear-gradient(135deg,#22c55e,#16a34a)":"#e5e7eb",color:adminPf.name&&!savingEditProject?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:adminPf.name&&!savingEditProject?"pointer":"not-allowed"}}>{savingEditProject?"保存中…":"保存する"}</button>
            </div>
          </Modal>
        );
      })()}

      {/* [2026-04-20] 休日出勤 自動申請モーダル（退勤打刻時に発火） */}
      {modal==="holidayApply"&&pendingHolidayApply&&(()=>{
        const { date, clockInIso, clockOutIso, holidayType, config } = pendingHolidayApply;
        const inStr = clockInIso ? new Date(clockInIso).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}) : "?";
        const outStr = clockOutIso ? new Date(clockOutIso).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}) : "?";
        const typeLabel = HOLIDAY_TYPE_LABEL[holidayType] || "休日";
        const accent = holidayType==="sunday"?"#ef4444":holidayType==="saturday"?"#f59e0b":"#a78bfa";
        return (
          <Modal title={`${typeLabel}出勤 — 申請`} accent={accent} onClose={()=>{if(!savingHolidayApply){setPendingHolidayApply(null);setModal(pendingHandover?"handover":null);}}}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:"#e5e7eb",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>出勤記録</div>
                <div style={{fontSize:13,color:"#111827",fontFamily:"'JetBrains Mono',monospace"}}>
                  {date} ／ {inStr} 〜 {outStr}
                </div>
                {config.isHalfDay && <div style={{fontSize:11,color:"#f59e0b",marginTop:4}}>☝ 13:00前の退勤なので「半日」扱いです</div>}
              </div>

              <div>
                <div style={{fontSize:10,color:"#6b7280",letterSpacing:"0.1em",marginBottom:6}}>■ 申請内容</div>
                {config.entries.map((e,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:6,padding:"10px 12px",marginBottom:6}}>
                    <div style={{fontSize:12,color:"#111827"}}>
                      {e.pref==="有給繰越"?"🎁 有給休暇 +" : e.pref==="買取希望"?"💰 買取 " : e.pref==="振休希望"?"🔄 振替休日 " : "—"}
                      {e.pref && <span style={{color:"#f97316",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{e.days}日</span>}
                      {!e.pref && <span style={{color:"#4b5563"}}>未選択（下で選んでください）</span>}
                    </div>
                    <div style={{fontSize:10,color:"#6b7280"}}>{e.label}</div>
                  </div>
                ))}
              </div>

              {config.needUserChoice && (
                <div>
                  <div style={{fontSize:10,color:"#6b7280",letterSpacing:"0.1em",marginBottom:6}}>■ 買取 or 振休を選択 *</div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setHolidayPrefChoice("買取希望")} style={{flex:1,background:holidayPrefChoice==="買取希望"?"#f97316":"#fafafa",color:holidayPrefChoice==="買取希望"?"#000":"#6b7280",border:"1px solid",borderColor:holidayPrefChoice==="買取希望"?"#f97316":"#d1d5db",borderRadius:8,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>💰 買取希望</button>
                    <button onClick={()=>setHolidayPrefChoice("振休希望")} style={{flex:1,background:holidayPrefChoice==="振休希望"?"#60a5fa":"#fafafa",color:holidayPrefChoice==="振休希望"?"#000":"#6b7280",border:"1px solid",borderColor:holidayPrefChoice==="振休希望"?"#60a5fa":"#d1d5db",borderRadius:8,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>🔄 振休希望</button>
                  </div>
                </div>
              )}

              {(holidayType==="obon"||holidayType==="newyear")&&(
                <div style={{background:"#eff6ff",border:"1px solid #a78bfa44",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#c4b5fd",lineHeight:1.5}}>
                  💝 お盆・年末年始の出勤は割増つきです。「買取（出勤分＋割増）」か「振休1日＋割増」を選んでください
                </div>
              )}

              <button onClick={submitHolidayApply} disabled={savingHolidayApply||(config.needUserChoice&&!holidayPrefChoice)}
                style={{background:(savingHolidayApply||(config.needUserChoice&&!holidayPrefChoice))?"#e5e7eb":`linear-gradient(135deg,${accent},${accent}dd)`,color:(savingHolidayApply||(config.needUserChoice&&!holidayPrefChoice))?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(savingHolidayApply||(config.needUserChoice&&!holidayPrefChoice))?"not-allowed":"pointer"}}>
                {savingHolidayApply?"申請中…":"📝 申請する"}
              </button>
              <button onClick={()=>{setPendingHolidayApply(null);setModal(pendingHandover?"handover":null);}}
                disabled={savingHolidayApply}
                style={{background:"transparent",color:"#111827",border:"none",borderRadius:8,padding:"6px",fontSize:11,cursor:savingHolidayApply?"not-allowed":"pointer"}}>
                後で申請する（スキップ）
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* 退勤時 外注作業員名入力 */}
      {modal==="subWorkers"&&pendingSubWorkers.length>0&&(
        <Modal title="外注 作業員名を入力" accent="#a78bfa" onClose={null}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:"#4b5563",lineHeight:1.5}}>出勤時に登録した外注の作業員名を入力してください。</div>
            {pendingSubWorkers.map(s=>(
              <div key={s.id} style={{background:"#eff6ff",border:"1px solid #a78bfa44",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:12,color:"#a78bfa",fontWeight:700,marginBottom:6}}>{s.companyName}（{s.headcount}人工）</div>
                <input type="text" value={subWorkerEdits[s.id]||""} onChange={e=>setSubWorkerEdits(prev=>({...prev,[s.id]:e.target.value}))} placeholder="例: 田中、佐藤" style={{...IS,padding:"8px 10px",fontSize:13}}/>
              </div>
            ))}
            {(()=>{const allFilled=pendingSubWorkers.every(s=>(subWorkerEdits[s.id]||"").trim());return(
            <button onClick={()=>withBusy(async()=>{
              for(const s of pendingSubWorkers){
                const w=(subWorkerEdits[s.id]||"").trim();
                if(!w) return;
                const ok=await updateSubcontractorWorkers(s.id, w);
                if(!ok){showToast("⚠ 作業員名の保存に失敗しました");return;}
                setSubcontractors(prev=>prev.map(x=>x.id===s.id?{...x,workers:w}:x));
              }
              const info=pendingAfterSubWorkers;
              setPendingSubWorkers([]);setSubWorkerEdits({});setPendingAfterSubWorkers(null);
              setPendingHandover({projectId:info.projectId,projectName:info.projectName});
              setHandoverText("");
              if(info.hConfig){
                setPendingHolidayApply({date:todayStr(),clockInIso:info.clockInTime,clockOutIso:info.clockOutTime,holidayType:info.htype,config:info.hConfig});
                setHolidayPrefChoice("");
                setModal("holidayApply");
              } else {
                setModal("handover");
              }
            })} disabled={!allFilled||busy} style={{background:(allFilled&&!busy)?"linear-gradient(135deg,#a78bfa,#6366f1)":"#e5e7eb",color:(allFilled&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(allFilled&&!busy)?"pointer":"not-allowed"}}>{busy?"送信中…":"確定して退勤を続ける"}</button>
            );})()}
          </div>
        </Modal>
      )}

      {/* [2026-07-01] 退勤直後の写真添付（任意）。clock_logs に保存し、管理者の打刻詳細で表示 */}
      {/* [2026-07-06] 退勤の写真添付モーダルは非表示化（false で無効化）。コードは残す */}
      {false&&modal==="clockOutPhoto"&&clockOutPhotoCtx&&(
        <Modal title="退勤の写真（任意）" accent="#60a5fa" onClose={()=>{const ctx=clockOutPhotoCtx;setClockOutPhotoFile(null);setClockOutPhotoCtx(null);if(ctx)runClockOutFollowups(ctx.now,ctx.clockInTime);else setModal(null);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:"#6b7280"}}>退勤お疲れ様でした。現場の写真があれば添付してください（任意）。打刻の記録として残ります。</div>
            <div>
              <input type="file" accept="image/*" capture="environment" id="clockOutPhotoInput" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0]; if(!file) return;
                try { const r=await resizeImageFile(file); setClockOutPhotoFile(r); }
                catch(_){ showToast("⚠ 画像の読み込みに失敗"); }
                e.target.value="";
              }}/>
              {clockOutPhotoFile ? (
                <div style={{position:"relative",display:"inline-block"}}>
                  <img src={clockOutPhotoFile.preview} alt="添付" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,border:"1px solid #d1d5db"}}/>
                  <button onClick={()=>setClockOutPhotoFile(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:16,borderRadius:"50%",width:28,height:28,cursor:"pointer",lineHeight:"28px",textAlign:"center"}}>✕</button>
                </div>
              ) : (
                <button onClick={()=>document.getElementById("clockOutPhotoInput").click()} style={{width:"100%",background:"#fafafa",color:"#60a5fa",border:"1px dashed #60a5fa44",borderRadius:8,padding:"14px",fontSize:13,cursor:"pointer"}}>📷 写真を添付（任意）</button>
              )}
            </div>
            <button onClick={submitClockOutPhoto} disabled={photoUploading} style={{background:photoUploading?"#e5e7eb":"linear-gradient(135deg,#60a5fa,#3b82f6)",color:photoUploading?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:photoUploading?"wait":"pointer"}}>{photoUploading?"アップロード中…":clockOutPhotoFile?"添付して次へ":"次へ（写真なし）"}</button>
          </div>
        </Modal>
      )}

      {modal==="handover"&&(
        <Modal title={`引継ぎメモ — ${pendingHandover?.projectName||""}`} accent="#60a5fa" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{fontSize:12,color:"#6b7280"}}>退勤お疲れ様です。次の担当者への引継ぎがあれば入力してください。</div>
            {/* [2026-04-20] 送信先の明示（どこに書かれるか） */}
            <div style={{background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#93c5fd",lineHeight:1.6}}>
              <div style={{color:"#60a5fa",fontWeight:700,marginBottom:4}}>📍 送信すると、以下に表示されます：</div>
              📌 <b>この案件の詳細画面</b>（打刻画面で案件をタップ）<br/>
              📢 <b>全員のアナウンス</b>（ログイン後のお知らせポップアップ）
            </div>
            <textarea value={handoverText} onChange={e=>setHandoverText(e.target.value)} placeholder="例: 2F配管の防熱が未完了。材料は現場の倉庫にあります。" rows={4} style={{width:"100%",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",color:"#111827",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"'Noto Sans JP',sans-serif"}}/>
            <div>
              <input type="file" accept="image/*" capture="environment" id="handoverPhotoInput" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0]; if(!file) return;
                try { const r=await resizeImageFile(file); setHandoverPhoto(r); }
                catch(_){ showToast("⚠ 画像の読み込みに失敗"); }
                e.target.value="";
              }}/>
              {handoverPhoto ? (
                <div style={{position:"relative",display:"inline-block"}}>
                  <img src={handoverPhoto.preview} alt="添付" style={{maxWidth:"100%",maxHeight:150,borderRadius:8,border:"1px solid #d1d5db"}}/>
                  <button onClick={()=>setHandoverPhoto(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:16,borderRadius:"50%",width:28,height:28,cursor:"pointer",lineHeight:"28px",textAlign:"center"}}>✕</button>
                </div>
              ) : (
                <button onClick={()=>document.getElementById("handoverPhotoInput").click()} style={{width:"100%",background:"#fafafa",color:"#60a5fa",border:"1px dashed #60a5fa44",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer"}}>📷 写真を添付</button>
              )}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={submitHandover} disabled={photoUploading} style={{flex:1,background:(handoverText.trim()&&!photoUploading)?"linear-gradient(135deg,#60a5fa,#3b82f6)":"#e5e7eb",color:(handoverText.trim()&&!photoUploading)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:(handoverText.trim()&&!photoUploading)?"pointer":"not-allowed"}}>{photoUploading?"アップロード中…":handoverText.trim()?"送信する":"スキップ"}</button>
              <button onClick={()=>{setModal(null);setPendingHandover(null);setHandoverPhoto(null);}} style={{background:"#e5e7eb",color:"#6b7280",border:"1px solid #d1d5db",borderRadius:8,padding:"12px 16px",fontSize:13,cursor:"pointer"}}>スキップ</button>
            </div>
          </div>
        </Modal>
      )}

      {/* [2026-06-16] 案件詳細から直接 引継ぎメモ＋写真 を追加するモーダル */}
      {modal==="addHandoverMemo"&&selected&&(
        <Modal title={`引継ぎメモを追加 — ${selected.name}`} accent="#60a5fa" onClose={()=>{setModal(null);setAddHmText("");setAddHmPhoto(null);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#eff6ff",border:"1px solid #60a5fa44",borderRadius:8,padding:"10px 12px",fontSize:11,color:"#93c5fd",lineHeight:1.6}}>
              <div style={{color:"#60a5fa",fontWeight:700,marginBottom:4}}>📍 追加すると、以下に表示されます：</div>
              📌 <b>この案件の詳細画面</b><br/>
              📢 <b>全員のアナウンス</b>（ログイン後のお知らせ）
            </div>
            <textarea value={addHmText} onChange={e=>setAddHmText(e.target.value)} placeholder="例: 2F配管の防熱が未完了。材料は現場の倉庫にあります。" rows={4} style={{width:"100%",background:"#fafafa",border:"1px solid #d1d5db",borderRadius:8,padding:"10px 12px",color:"#111827",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"'Noto Sans JP',sans-serif"}}/>
            <div>
              <input type="file" accept="image/*" capture="environment" id="addHmPhotoInput" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0]; if(!file) return;
                try { const r=await resizeImageFile(file); setAddHmPhoto(r); }
                catch(_){ showToast("⚠ 画像の読み込みに失敗"); }
                e.target.value="";
              }}/>
              {addHmPhoto ? (
                <div style={{position:"relative",display:"inline-block"}}>
                  <img src={addHmPhoto.preview} alt="添付" style={{maxWidth:"100%",maxHeight:150,borderRadius:8,border:"1px solid #d1d5db"}}/>
                  <button onClick={()=>setAddHmPhoto(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:16,borderRadius:"50%",width:28,height:28,cursor:"pointer",lineHeight:"28px",textAlign:"center"}}>✕</button>
                </div>
              ) : (
                <button onClick={()=>document.getElementById("addHmPhotoInput").click()} style={{width:"100%",background:"#fafafa",color:"#60a5fa",border:"1px dashed #60a5fa44",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer"}}>📷 写真を添付</button>
              )}
            </div>
            <button onClick={submitAddHandover} disabled={busy||!addHmText.trim()} style={{background:(addHmText.trim()&&!busy)?"linear-gradient(135deg,#60a5fa,#3b82f6)":"#e5e7eb",color:(addHmText.trim()&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(addHmText.trim()&&!busy)?"pointer":"not-allowed"}}>{busy?"送信中…":"追加する"}</button>
          </div>
        </Modal>
      )}

      {modal==="entry"&&selected&&(
        <Modal title={`人工入力 — ${selected.name}`} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="日付"><input type="date" value={ef.date} onChange={e=>setEf(f=>({...f,date:e.target.value}))} style={IS}/></Field>
            <Field label="作業者"><select value={ef.worker} onChange={e=>setEf(f=>({...f,worker:e.target.value}))} style={IS}>{staff.map(s=><option key={s.id}>{s.name}</option>)}</select></Field>
            <Field label="人工数">
              <div style={{display:"flex",gap:5}}>
                {[0.5,1,1.5,2,2.5,3].map(n=>(
                  <button key={n} onClick={()=>setEf(f=>({...f,qty:String(n)}))} style={{flex:1,background:ef.qty===String(n)?"#f97316":"#e5e7eb",color:ef.qty===String(n)?"#000":"#6b7280",border:"1px solid",borderColor:ef.qty===String(n)?"#f97316":"#d1d5db",borderRadius:6,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="メモ"><input type="text" value={ef.memo} onChange={e=>setEf(f=>({...f,memo:e.target.value}))} placeholder="作業内容など" style={IS}/></Field>
            <button onClick={submitEntry} disabled={busy||!ef.qty} style={{background:!busy&&ef.qty?"linear-gradient(135deg,#f97316,#ef4444)":"#e5e7eb",color:!busy&&ef.qty?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:!busy&&ef.qty?"pointer":"not-allowed"}}>{busy?"記録中…":"記録する"}</button>
          </div>
        </Modal>
      )}

      {modal==="addProject"&&(
        <Modal title="新規案件追加" accent="#22c55e" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="現場名 *"><input type="text" value={pf.name} onChange={e=>setPf(f=>({...f,name:e.target.value}))} placeholder="正式な現場名を記入してください" style={IS}/></Field>
            <Field label="顧客">
                  <div style={{display:"flex",gap:6}}>
                    <select value={pf.lead} onChange={e=>setPf(f=>({...f,lead:e.target.value}))} style={{...IS,flex:1}}><option value="">選択してください</option>{customers.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>
                    {/* [2026-07-09] 顧客追加は admin 限定 */}
                    {user.role==="admin"&&<button type="button" onClick={()=>{setShowAddCustomer(true);setNewCustomerForm({name:"",contact:"",phone:""});}} style={{background:"#f0fdf4",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:8,padding:"0 12px",fontSize:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>＋</button>}
                  </div>
                </Field>
            <Field label="契約形態">
              <div style={{display:"flex",gap:8}}>
                {["請負","応援"].map(ct=>(
                  <button key={ct} onClick={()=>setPf(f=>({...f,contractType:ct}))} style={{flex:1,background:pf.contractType===ct?"#f97316":"#e5e7eb",color:pf.contractType===ct?"#000":"#6b7280",border:"1px solid",borderColor:pf.contractType===ct?"#f97316":"#d1d5db",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{ct}</button>
                ))}
              </div>
            </Field>
            {/* [2026-04-20] 案件区分（新築/改修） */}
            <Field label="工事区分">
              <div style={{display:"flex",gap:8}}>
                {[{v:"新築",icon:"🏗"},{v:"改修",icon:"🔧"}].map(wc=>(
                  <button key={wc.v} onClick={()=>setPf(f=>({...f,workCategory:f.workCategory===wc.v?"":wc.v}))} style={{flex:1,background:pf.workCategory===wc.v?"#22c55e":"#e5e7eb",color:pf.workCategory===wc.v?"#000":"#6b7280",border:"1px solid",borderColor:pf.workCategory===wc.v?"#22c55e":"#d1d5db",borderRadius:8,padding:"10px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>{wc.icon} {wc.v}工事</button>
                ))}
              </div>
            </Field>
            <Field label="住所"><input type="text" value={pf.address} onChange={e=>setPf(f=>({...f,address:e.target.value}))} placeholder="現場の住所" style={IS}/></Field>
            <Field label="工期">
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="date" value={pf.startDate} onChange={e=>setPf(f=>({...f,startDate:e.target.value}))} style={{...IS,flex:1}}/>
                <span style={{color:"#111827"}}>〜</span>
                <input type="date" value={pf.endDate} onChange={e=>setPf(f=>({...f,endDate:e.target.value}))} style={{...IS,flex:1}}/>
              </div>
            </Field>
            <button onClick={submitProject} disabled={busy||!pf.name} style={{background:!busy&&pf.name?"linear-gradient(135deg,#22c55e,#16a34a)":"#e5e7eb",color:!busy&&pf.name?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:!busy&&pf.name?"pointer":"not-allowed"}}>{busy?"追加中…":"案件を追加する"}</button>
          </div>
        </Modal>
      )}

      {/* [2026-04-20] 進捗報告モーダル（10%刻みスライダー + コメント + 送信確認） */}
      {reportingItem&&(
        <Modal title={`進捗報告: ${reportingItem.customer.name}`} accent="#f97316" onClose={()=>{if(!savingReport)setReportingItem(null);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#e5e7eb",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>現場</div>
              <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{reportingItem.project.name}</div>
              <div style={{fontSize:10,color:"#6b7280",marginTop:4}}>
                {reportingItem.checkType==="客先共有"?"🔵 客先共有日":"🔒 内部確認日"}
                {reportingItem.lastReport&&` ／ 前回 ${reportingItem.lastReport.percent}%`}
              </div>
            </div>
            <Field label={`進捗 ${reportPercent}%`}>
              <input type="range" min="0" max="100" step="10" value={reportPercent}
                onChange={e=>setReportPercent(Number(e.target.value))}
                style={{width:"100%",accentColor:"#f97316"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#111827",marginTop:2}}>
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </Field>
            <Field label="コメント（任意）">
              <textarea value={reportComment} onChange={e=>setReportComment(e.target.value)}
                placeholder="例: 配管保温完了、来週ラッキング開始" rows={3}
                style={{...IS,resize:"vertical"}}/>
            </Field>
            <div style={{background:"#2a1a0f",border:"1px solid #f9731633",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#fdba74",lineHeight:1.5}}>
              ⚠ 送信後は修正できません。次回の進捗確認日まで再送不可です。
            </div>
            <button onClick={()=>setConfirmReport(true)} disabled={savingReport}
              style={{background:"linear-gradient(135deg,#f97316,#ef4444)",color:"#000",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>
              送信内容を確認
            </button>
          </div>
        </Modal>
      )}

      {/* [2026-04-20] 送信確認モーダル */}
      {confirmReport&&reportingItem&&(
        <div onClick={(e)=>{if(e.target===e.currentTarget&&!savingReport)setConfirmReport(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fafafa",border:"2px solid #f97316",borderRadius:12,padding:20,maxWidth:400,width:"100%"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f97316",marginBottom:12}}>📤 送信内容を確認</div>
            <div style={{background:"#e5e7eb",borderRadius:8,padding:"12px 14px",marginBottom:14,lineHeight:1.7}}>
              <div style={{fontSize:11,color:"#6b7280"}}>客先</div>
              <div style={{fontSize:13,color:"#111827",fontWeight:700,marginBottom:6}}>{reportingItem.customer.name}</div>
              <div style={{fontSize:11,color:"#6b7280"}}>現場</div>
              <div style={{fontSize:13,color:"#111827",marginBottom:6}}>{reportingItem.project.name}</div>
              <div style={{fontSize:11,color:"#6b7280"}}>進捗</div>
              <div style={{fontSize:22,color:"#f97316",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{reportPercent}%</div>
              {reportComment&&(<><div style={{fontSize:11,color:"#6b7280",marginTop:6}}>コメント</div><div style={{fontSize:12,color:"#374151",whiteSpace:"pre-wrap"}}>{reportComment}</div></>)}
            </div>
            <div style={{fontSize:11,color:"#ef4444",marginBottom:12,lineHeight:1.5,fontWeight:700}}>
              ⚠ この内容で送信します。修正はできません。
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setConfirmReport(false)} disabled={savingReport}
                style={{flex:1,background:"#e5e7eb",color:"#4b5563",border:"1px solid #d1d5db",borderRadius:8,padding:"11px",fontSize:12,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>
                戻って修正
              </button>
              <button onClick={async()=>{
                if(savingReport) return;
                setSavingReport(true);
                try {
                  const rep = { id: uid(), projectId: reportingItem.project.id, customerId: reportingItem.customer.id, percent: reportPercent, comment: reportComment };
                  const res = await saveProgressReport(rep);
                  if (res?.error) { showToast("⚠ 送信失敗: "+res.error); setSavingReport(false); return; }
                  const fresh = await loadProgressReports();
                  setProgressReports(fresh||[]);
                  setConfirmReport(false);
                  setReportingItem(null);
                  setReportPercent(50);
                  setReportComment("");
                  showToast("✓ 進捗を送信しました");
                } catch(e) { showToast("⚠ 送信失敗: "+e.message); }
                finally { setSavingReport(false); }
              }} disabled={savingReport}
                style={{flex:2,background:savingReport?"#e5e7eb":"linear-gradient(135deg,#f97316,#ef4444)",color:savingReport?"#9ca3af":"#000",border:"none",borderRadius:8,padding:"11px",fontSize:12,fontWeight:700,cursor:savingReport?"not-allowed":"pointer"}}>
                {savingReport?"送信中…":"📤 送信する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顧客追加モーダル */}
      {showAddCustomer&&(
        <Modal title="顧客を追加" accent="#22c55e" onClose={()=>setShowAddCustomer(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="顧客名 *"><input type="text" value={newCustomerForm.name} onChange={e=>setNewCustomerForm(f=>({...f,name:e.target.value}))} placeholder="会社名" style={IS}/></Field>
            <Field label="担当者名"><input type="text" value={newCustomerForm.contact} onChange={e=>setNewCustomerForm(f=>({...f,contact:e.target.value}))} placeholder="担当者の名前" style={IS}/></Field>
            <Field label="電話番号"><input type="tel" value={newCustomerForm.phone} onChange={e=>setNewCustomerForm(f=>({...f,phone:e.target.value}))} placeholder="03-xxxx-xxxx" style={IS}/></Field>
            <button onClick={()=>withBusy(async()=>{
              if(!newCustomerForm.name.trim()){showToast("顧客名を入力してください");return;}
              const nc={id:uid(),name:newCustomerForm.name,contact:newCustomerForm.contact,phone:newCustomerForm.phone,email:"",billingDate:"",projectId:"",memo:"",progress:0};
              // [2026-04-22] DB保存を先に実行
              const ok = await insertCustomer(nc);
              if(!ok){ showToast(WRITE_ERROR_MSG); return; }
              setCustomers(prev=>[...prev,nc]);
              setShowAddCustomer(false);
              showToast("顧客を追加しました");
            })} disabled={!newCustomerForm.name.trim()||busy} style={{background:(newCustomerForm.name.trim()&&!busy)?"linear-gradient(135deg,#22c55e,#16a34a)":"#e5e7eb",color:(newCustomerForm.name.trim()&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(newCustomerForm.name.trim()&&!busy)?"pointer":"not-allowed"}}>{busy?"送信中…":"追加する"}</button>
          </div>
        </Modal>
      )}

      {modal==="leave"&&(()=>{
        // getHolidayType: shared.jsで定義。日曜/土曜/お盆/年末年始 or null
        const htype = lf.type==="holiday" ? getHolidayType(lf.date) : null;
        const isSunday = htype === "sunday";
        const isLongHoliday = htype === "obon" || htype === "newyear";
        // 買取できるのは土曜のみ（日曜・長期休暇は買取不可）
        const canBuyout = lf.type==="holiday" && htype && !isSunday && !isLongHoliday;
        // 振替申請時: 元の休日出勤リスト（submitDisabledより先に宣言）
        const availableWorks = lf.type==="furikae" ? getAvailableFurikaeWorks(user.id, leaveData) : [];
        // 提出ボタン無効条件
        // - 休日出勤: 休日でない日 or 希望未選択
        // - 振替休日: 元の出勤日が未選択（紐づけ必須）。availableWorks=0 の時も holidayWorkId 持てないので無効化
        // [2026-04-29] availableWorks.length>0 の条件を削除して二重消化バグを防止
        const submitDisabled =
          (lf.type==="holiday" && (!htype || !lf.holidayPref)) ||
          (lf.type==="furikae" && !lf.holidayWorkId);
        return (
        <Modal title="休暇・勤怠を申請" accent="#22c55e" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="種別">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {LEAVE_TYPES.map(lt=>(
                  <button key={lt.id} onClick={()=>setLf(f=>({...f,type:lt.id,holidayPref:"",holidayWorkId:""}))} style={{background:lf.type===lt.id?`${lt.color}22`:"#fafafa",color:lf.type===lt.id?lt.color:"#111827",border:"1px solid",borderColor:lf.type===lt.id?lt.color:"#d1d5db",borderRadius:8,padding:"10px 8px",fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"left"}}>
                    <span style={{marginRight:6}}>{lt.icon}</span>{lt.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* 休日出勤: 休日種別表示 + 希望選択 */}
            {lf.type==="holiday"&&(
              <>
                {htype&&(
                  <div style={{background:isSunday?"#ef4444":isLongHoliday?"#a78bfa":"#f97316",borderRadius:6,padding:"6px 12px",fontSize:12,fontWeight:700,color:"#000",textAlign:"center"}}>
                    {isSunday?"🔄 日曜（法定休日）出勤 → 振休のみ":isLongHoliday?`💝 ${HOLIDAY_TYPE_LABEL[htype]}出勤 → 買取 or 振休を選択`:"🏗 土曜（所定休日）出勤 → 買取 or 振休を選択"}
                  </div>
                )}
                {!htype&&lf.date&&(
                  <div style={{background:"#9ca3af",borderRadius:6,padding:"6px 12px",fontSize:11,color:"#f59e0b",textAlign:"center"}}>
                    ⚠ この日は休日ではありません（土日・お盆・年末年始以外は平日扱い）
                  </div>
                )}
                <Field label="希望（必須）">
                  <div style={{display:"flex",gap:8}}>
                    {/* [2026-07-22] 長期休暇の有給繰越固定を廃止 → 土曜と同じ買取/振休選択制 */}
                    {!isSunday&&(
                      <button onClick={()=>setLf(f=>({...f,holidayPref:"買取希望"}))} style={{flex:1,background:lf.holidayPref==="買取希望"?"#f97316":"#fafafa",color:lf.holidayPref==="買取希望"?"#000":"#6b7280",border:"1px solid",borderColor:lf.holidayPref==="買取希望"?"#f97316":"#d1d5db",borderRadius:8,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                        💰 買取希望
                      </button>
                    )}
                    <button onClick={()=>setLf(f=>({...f,holidayPref:"振休希望"}))} style={{flex:isSunday?undefined:1,width:isSunday?"100%":undefined,background:lf.holidayPref==="振休希望"?"#60a5fa":"#fafafa",color:lf.holidayPref==="振休希望"?"#000":"#6b7280",border:"1px solid",borderColor:lf.holidayPref==="振休希望"?"#60a5fa":"#d1d5db",borderRadius:8,padding:"12px 0",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                      🔄 振休希望
                    </button>
                  </div>
                </Field>
              </>
            )}

            {/* 振替休日申請: 元の出勤日選択 */}
            {lf.type==="furikae"&&(
              <Field label="元の休日出勤日（必須）">
                {availableWorks.length===0
                  ? <div style={{fontSize:11,color:"#f59e0b",background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:6,padding:"8px 10px"}}>取得可能な振替休日がありません（休日出勤申請が必要です）</div>
                  : <select value={lf.holidayWorkId} onChange={e=>setLf(f=>({...f,holidayWorkId:e.target.value}))} style={{...IS}}>
                      <option value="">-- 元の出勤日を選んでください --</option>
                      {availableWorks.map(w=>{
                        const expiry = addThreeMonths(w.date);
                        const daysLeft = Math.ceil((expiry-new Date())/86400000);
                        return <option key={w.id} value={w.id}>{w.date}（{HOLIDAY_TYPE_LABEL[w.holidayType]||"休日"}出勤 / 期限{daysLeft}日）</option>;
                      })}
                    </select>
                }
              </Field>
            )}

            <Field label="日付"><input type="date" value={lf.date} onChange={e=>{
              const newHtype = lf.type==="holiday" ? getHolidayType(e.target.value) : null;
              const autoPref = newHtype==="sunday" ? "振休希望" : "";
              setLf(f=>({...f, date:e.target.value, holidayPref: autoPref || f.holidayPref}));
            }} style={IS}/></Field>
            <Field label="日数">
              <div style={{display:"flex",gap:5}}>
                {["0.5","1","2","3","4","5"].map(n=>(
                  <button key={n} onClick={()=>setLf(f=>({...f,days:n}))} style={{flex:1,background:lf.days===n?"#22c55e":"#e5e7eb",color:lf.days===n?"#000":"#6b7280",border:"1px solid",borderColor:lf.days===n?"#22c55e":"#d1d5db",borderRadius:6,padding:"9px 0",fontSize:12,fontWeight:700,cursor:"pointer"}}>{n}</button>
                ))}
              </div>
            </Field>
            <Field label="備考"><input type="text" value={lf.memo} onChange={e=>setLf(f=>({...f,memo:e.target.value}))} style={IS}/></Field>
            <button onClick={submitLeave} disabled={busy||submitDisabled} style={{background:!busy&&!submitDisabled?"linear-gradient(135deg,#22c55e,#16a34a)":"#e5e7eb",color:!busy&&!submitDisabled?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:!busy&&!submitDisabled?"pointer":"not-allowed"}}>
              {busy?"送信中…"
                :lf.type==="holiday"&&!htype?"休日ではありません（申請不可）"
                :lf.type==="furikae"&&availableWorks.length===0?"取得可能な振替がありません"
                :lf.type==="furikae"&&!lf.holidayWorkId?"元の出勤日を選んでください"
                :submitDisabled?"買取 / 振休を選んでください"
                :(lf.type==="paid"||lf.type==="furikae")?"承認する（自動）":"申請する"}
            </button>
          </div>
        </Modal>
        );
      })()}

      {modal==="addSubcontractor"&&selected&&(
        <Modal title={`外注追加 — ${selected.name}`} accent="#a78bfa" onClose={()=>{setModal(null);setSubForm({companyName:"",headcount:"1",date:todayStr(),memo:"",workers:""});}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="会社名 *">
              {(()=>{
                // 過去データから会社名を最新使用順で抽出
                const nameMap=new Map();
                subcontractors.forEach(s=>{if(s.companyName){const prev=nameMap.get(s.companyName);if(!prev||s.date>prev)nameMap.set(s.companyName,s.date);}});
                const sorted=[...nameMap.entries()].sort((a,b)=>(b[1]||"").localeCompare(a[1]||""));
                // 選択中の会社を上に
                const selected_name=subForm.companyName;
                const chips=selected_name?[...sorted.filter(([n])=>n===selected_name),...sorted.filter(([n])=>n!==selected_name)]:sorted;
                return React.createElement(React.Fragment,null,
                  chips.length>0&&React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}},
                    chips.map(([name])=>React.createElement("button",{key:name,type:"button",onClick:()=>setSubForm(f=>({...f,companyName:name})),style:{background:subForm.companyName===name?"#a78bfa":"#e5e7eb",color:subForm.companyName===name?"#000":"#a78bfa",border:"1px solid",borderColor:subForm.companyName===name?"#a78bfa":"#a78bfa44",borderRadius:16,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}},name))
                  ),
                  React.createElement("input",{type:"text",value:subForm.companyName,onChange:e=>setSubForm(f=>({...f,companyName:e.target.value})),placeholder:"新規会社名を入力 or 上から選択",style:IS})
                );
              })()}
            </Field>
            <Field label="人数（人工）"><input type="number" value={subForm.headcount} onWheel={e=>e.currentTarget.blur()} onChange={e=>setSubForm(f=>({...f,headcount:e.target.value}))} min="1" style={IS}/></Field>
            <Field label="作業員名 *"><input type="text" value={subForm.workers||""} onChange={e=>setSubForm(f=>({...f,workers:e.target.value}))} placeholder="例: 田中、佐藤" style={IS}/></Field>
            <Field label="日付"><input type="date" value={subForm.date} onChange={e=>setSubForm(f=>({...f,date:e.target.value}))} style={IS}/></Field>
            <Field label="メモ"><input type="text" value={subForm.memo} onChange={e=>setSubForm(f=>({...f,memo:e.target.value}))} style={IS}/></Field>
            {(()=>{const canSubmit=subForm.companyName&&(subForm.workers||"").trim();return(
            <button onClick={()=>withBusy(async()=>{
              if(!subForm.companyName||!(subForm.workers||"").trim())return;
              const s={id:uid(),projectId:selected.id,date:subForm.date,companyName:subForm.companyName,headcount:Number(subForm.headcount)||1,memo:subForm.memo,workers:subForm.workers||""};
              const ok = await insertSubcontractor(s);
              if(!ok){ showToast(WRITE_ERROR_MSG); return; }
              setSubcontractors(prev=>[s,...prev]);
              setSubForm({companyName:"",headcount:"1",date:todayStr(),memo:"",workers:""});setModal(null);showToast("✓ 外注を追加しました");
            })} disabled={!canSubmit||busy} style={{background:(canSubmit&&!busy)?"linear-gradient(135deg,#a78bfa,#6366f1)":"#e5e7eb",color:(canSubmit&&!busy)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(canSubmit&&!busy)?"pointer":"not-allowed"}}>{busy?"送信中…":"追加する"}</button>
            );})()}
          </div>
        </Modal>
      )}

      {/* [v14] 追加工事モーダル（フロア・場所追加、改行対応） */}
      {modal==="addAdditionalWork"&&selected&&(
        <Modal title={`追加工事 — ${selected.name}`} accent="#f59e0b" onClose={()=>{setModal(null);setWorkForm({description:"",floor:"",location:""});setWorkPhoto(null);}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="フロア"><input type="text" value={workForm.floor} onChange={e=>setWorkForm(f=>({...f,floor:e.target.value}))} placeholder="例: 3" style={IS}/></Field>
            <Field label="場所"><input type="text" value={workForm.location} onChange={e=>setWorkForm(f=>({...f,location:e.target.value}))} placeholder="例: 機械室前廊下" style={IS}/></Field>
            <Field label="内容 *"><textarea value={workForm.description} onChange={e=>setWorkForm(f=>({...f,description:e.target.value}))} placeholder="追加工事の内容（改行可）" rows={3} style={{...IS,resize:"vertical",fontFamily:"'Noto Sans JP',sans-serif"}}/></Field>
            <div>
              <input type="file" accept="image/*" capture="environment" id="workPhotoInput" style={{display:"none"}} onChange={async(e)=>{
                const file=e.target.files?.[0]; if(!file) return;
                try { const r=await resizeImageFile(file); setWorkPhoto(r); }
                catch(_){ showToast("⚠ 画像の読み込みに失敗"); }
                e.target.value="";
              }}/>
              {workPhoto ? (
                <div style={{position:"relative",display:"inline-block"}}>
                  <img src={workPhoto.preview} alt="添付" style={{maxWidth:"100%",maxHeight:150,borderRadius:8,border:"1px solid #d1d5db"}}/>
                  <button onClick={()=>setWorkPhoto(null)} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:16,borderRadius:"50%",width:28,height:28,cursor:"pointer",lineHeight:"28px",textAlign:"center"}}>✕</button>
                </div>
              ) : (
                <button onClick={()=>document.getElementById("workPhotoInput").click()} style={{width:"100%",background:"#fafafa",color:"#f59e0b",border:"1px dashed #f59e0b44",borderRadius:8,padding:"10px",fontSize:12,cursor:"pointer"}}>📷 写真を添付</button>
              )}
            </div>
            <button onClick={()=>withBusy(async()=>{
              if(!workForm.description)return;
              let imageUrl = "";
              if (workPhoto) {
                setPhotoUploading(true);
                imageUrl = await uploadFieldPhoto(workPhoto.base64, workPhoto.name, workPhoto.type) || "";
                setPhotoUploading(false);
                if (!imageUrl) { showToast("⚠ 写真のアップロードに失敗"); return; }
              }
              const w={id:uid(),projectId:selected.id,description:workForm.description,floor:workForm.floor,location:workForm.location,imageUrl};
              const ok = await insertAdditionalWork(w);
              if(!ok){ showToast(WRITE_ERROR_MSG); return; }
              setAdditionalWorks(prev=>[w,...prev]);
              setWorkForm({description:"",floor:"",location:""});setWorkPhoto(null);setModal(null);showToast("✓ 追加工事を追加しました");
            })} disabled={!workForm.description||busy||photoUploading} style={{background:(workForm.description&&!busy&&!photoUploading)?"linear-gradient(135deg,#f59e0b,#ef4444)":"#e5e7eb",color:(workForm.description&&!busy&&!photoUploading)?"#000":"#9ca3af",border:"none",borderRadius:8,padding:"13px",fontSize:14,fontWeight:700,cursor:(workForm.description&&!busy&&!photoUploading)?"pointer":"not-allowed"}}>{photoUploading?"アップロード中…":busy?"送信中…":"追加する"}</button>
          </div>
        </Modal>
      )}

      {/* 画像ライトボックス */}
      {lightboxImg&&(
        <div onClick={()=>setLightboxImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16,cursor:"zoom-out"}}>
          <img src={lightboxImg} alt="拡大" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:8,objectFit:"contain"}}/>
          <button onClick={()=>setLightboxImg(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:20,borderRadius:"50%",width:36,height:36,cursor:"pointer",lineHeight:"36px",textAlign:"center"}}>✕</button>
        </div>
      )}

    </div>
  );
}
// [2026-04-28] React Error Boundary — 未捕捉エラー時でも画面真っ白を防ぎ、復旧手段を提供
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null, info:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ this.setState({info}); console.error("ErrorBoundary:", error, info); }
  async hardReset(){
    try{
      if('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        for(const r of regs) await r.unregister();
      }
      if(typeof caches!=='undefined'){
        const names = await caches.keys();
        for(const n of names) await caches.delete(n);
      }
      try{ localStorage.clear(); }catch(_){}
      try{ sessionStorage.clear(); }catch(_){}
    }catch(e){ console.error(e); }
    window.location.replace("/user?reset="+Date.now());
  }
  render(){
    if(!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || String(this.state.error||"不明なエラー");
    return React.createElement("div", { style:{minHeight:"100vh",background:"#e5e7eb",color:"#111827",fontFamily:"sans-serif",padding:24,maxWidth:480,margin:"0 auto"} },
      React.createElement("div", { style:{fontSize:32,marginBottom:12,textAlign:"center"} }, "⚠️"),
      React.createElement("h2", { style:{color:"#ef4444",fontSize:16,textAlign:"center",marginBottom:8} }, "アプリでエラーが発生しました"),
      React.createElement("div", { style:{background:"#fef2f2",border:"1px solid #ef444433",borderRadius:8,padding:12,marginBottom:16,fontSize:11,color:"#fca5a5",wordBreak:"break-all"} }, msg),
      React.createElement("button", { onClick:()=>window.location.reload(), style:{width:"100%",background:"#e5e7eb",color:"#111827",border:"1px solid #d1d5db",borderRadius:8,padding:"12px",fontSize:13,marginBottom:8,cursor:"pointer"} }, "🔄 ページを再読み込み"),
      React.createElement("button", { onClick:()=>this.hardReset(), style:{width:"100%",background:"linear-gradient(135deg,#ef4444,#b91c1c)",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"} }, "🧹 キャッシュ全削除して再起動"),
      React.createElement("div", { style:{fontSize:10,color:"#111827",marginTop:16,textAlign:"center"} }, "解決しない場合は管理者に連絡してください")
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ErrorBoundary, null, React.createElement(App)));
