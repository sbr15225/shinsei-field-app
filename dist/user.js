const { useState, useEffect, useCallback, useRef } = React;
function NinkuBar({ actual, target, breakeven }) {
  const pct = target > 0 ? Math.min(actual / target * 100, 100) : 0;
  const over = target > 0 && actual > target;
  const color = over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e";
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u4EBA\u5DE5\u9032\u6357"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", color } }, actual, "/", target, over && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", marginLeft: 4 } }, "\u8D85\u904E!"))), /* @__PURE__ */ React.createElement("div", { style: { height: 5, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: over ? "#ef4444" : `linear-gradient(90deg,${color}88,${color})`, transition: "width 0.4s" } })), breakeven > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", marginTop: 3, fontSize: 10, color: "#ef4444" } }, "\u8D64\u5B57\u30E9\u30A4\u30F3 ", breakeven, "\u4EBA\u5DE5", actual > breakeven && "\uFF08\u8D85\u904E\uFF09"));
}
function ProgressBar({ value }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const c = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u5DE5\u4E8B\u9032\u6357"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", color: c, fontWeight: 700 } }, pct, "%")), /* @__PURE__ */ React.createElement("div", { style: { height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${c}88,${c})`, transition: "width 0.4s" } })));
}
function Modal({ title, accent = "#f97316", onClose, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }, onClick: onClose }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #d1d5db", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, padding: "20px 20px 40px", maxHeight: "92vh", overflowY: "auto" }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: accent } }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { background: "#e5e7eb", border: "1px solid #9ca3af", borderRadius: 8, color: "#6b7280", padding: "8px 14px", cursor: "pointer", fontSize: 13, minWidth: 44, minHeight: 44 } }, "\u2715")), children));
}
function Field({ label, children }) {
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginBottom: 5, letterSpacing: "0.08em" } }, label), children);
}
function PinPad({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const submit = (code) => {
    if (code.length < 4 || checking) return;
    setChecking(true);
    verifyPin(code).then((result) => {
      if (result && result.user) {
        setTimeout(() => onSuccess(result.user, result.sessionToken), 100);
      } else {
        setErr(true);
        setErrMsg((result == null ? void 0 : result.error) || "PIN\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
        setPin("");
        setTimeout(() => {
          setErr(false);
          setChecking(false);
        }, 400);
      }
    }).catch(() => {
      setErr(true);
      setErrMsg("\u901A\u4FE1\u30A8\u30E9\u30FC");
      setPin("");
      setTimeout(() => {
        setErr(false);
        setChecking(false);
      }, 400);
    });
  };
  const press = (d) => {
    if (pin.length >= 6 || checking) return;
    if (errMsg) setErrMsg("");
    const next = pin + d;
    setPin(next);
    if (next.length === 6) submit(next);
  };
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "10px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", letterSpacing: "0.1em" } }, "PIN\u30B3\u30FC\u30C9\u3092\u5165\u529B\uFF084\u301C6\u6841\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { width: 12, height: 12, borderRadius: "50%", background: pin.length > i ? err ? "#ef4444" : "#f97316" : "#d1d5db", transition: "background 0.15s" } }))), errMsg && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444" } }, errMsg), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, width: 200 } }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "\u232B", 0, "OK"].map((d, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => {
        if (d === "\u232B") setPin((p) => p.slice(0, -1));
        else if (d === "OK") submit(pin);
        else press(String(d));
      },
      disabled: d === "OK" && (pin.length < 4 || checking),
      style: { background: d === "OK" ? pin.length >= 4 ? "#22c55e" : "#fafafa" : "#fafafa", border: "1px solid", borderColor: d === "OK" ? pin.length >= 4 ? "#22c55e44" : "#d1d5db" : "#d1d5db", borderRadius: 10, padding: "14px 0", fontSize: d === "OK" ? 14 : 18, fontWeight: 700, color: d === "\u232B" ? "#6b7280" : d === "OK" ? pin.length >= 4 ? "#000" : "#9ca3af" : "#111827", cursor: d === "OK" && pin.length < 4 ? "not-allowed" : "pointer", fontFamily: "'JetBrains Mono',monospace" }
    },
    d
  ))));
}
function HeatGuide({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const tel = (n, label) => /* @__PURE__ */ React.createElement("a", { href: "tel:" + n.replace(/-/g, ""), style: { display: "block", textAlign: "center", background: "#fff", border: "1px solid #dc2626", borderRadius: 8, padding: "10px", color: "#b91c1c", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 6 } }, label, "\u3000", n);
  return /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #dc2626", borderRadius: 10, marginBottom: 12, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen((o) => !o), style: { width: "100%", background: "transparent", border: "none", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#b91c1c" } }, "\u{1F975} \u71B1\u4E2D\u75C7\u306B\u306A\u3063\u305F\u3089\uFF08\u624B\u9806\u3068\u9023\u7D61\u5148\uFF09"), /* @__PURE__ */ React.createElement("span", { style: { color: "#b91c1c", fontSize: 12 } }, open ? "\u25B2" : "\u25BC")), open && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px 14px", fontSize: 13, color: "#374151", lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#b91c1c", marginTop: 4 } }, "\u3053\u3093\u306A\u69D8\u5B50\u306A\u3089\u71B1\u4E2D\u75C7\u3092\u7591\u3046"), /* @__PURE__ */ React.createElement("div", null, "\u3081\u307E\u3044\u30FB\u7ACB\u3061\u304F\u3089\u307F\uFF0F\u624B\u8DB3\u304C\u3064\u308B\uFF0F\u982D\u304C\u75DB\u3044\u30FB\u5410\u304D\u6C17\uFF0F\u6C57\u304C\u6B62\u307E\u3089\u306A\u3044\u3001\u307E\u305F\u306F\u51FA\u306A\u3044\uFF0F\u307C\u30FC\u3063\u3068\u3057\u3066\u53D7\u3051\u7B54\u3048\u304C\u304A\u304B\u3057\u3044"), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#b91c1c", marginTop: 10 } }, "\u3059\u3050\u306B\u3084\u308B\u3053\u3068"), /* @__PURE__ */ React.createElement("div", null, "\u2460 \u4F5C\u696D\u3092\u3084\u3081\u3055\u305B\u3001\u65E5\u304B\u3052\u30FB\u6DBC\u3057\u3044\u6240\u3078\u9023\u308C\u3066\u884C\u304F"), /* @__PURE__ */ React.createElement("div", null, "\u2461 \u670D\u3092\u3086\u308B\u3081\u3001\u9996\u30FB\u308F\u304D\u306E\u4E0B\u30FB\u8DB3\u306E\u4ED8\u3051\u6839\u3092\u51B7\u3084\u3059\uFF08\u6C34\u30FB\u4FDD\u51B7\u5264\u30FB\u6C37\uFF09"), /* @__PURE__ */ React.createElement("div", null, "\u2462 \u81EA\u5206\u3067\u6C34\u304C\u98F2\u3081\u308B\u306A\u3089\u3001\u6C34\u3068\u5869\u5206\uFF08\u30B9\u30DD\u30FC\u30C4\u30C9\u30EA\u30F3\u30AF\u30FB\u5869\u3042\u3081\uFF09\u3092\u3068\u3089\u305B\u308B"), /* @__PURE__ */ React.createElement("div", null, "\u2463 \u8077\u9577\u3068\u4F1A\u793E\uFF08\u52DD\u9593\uFF09\u306B\u3059\u3050\u9023\u7D61\u3059\u308B\u3002", /* @__PURE__ */ React.createElement("b", null, "1\u4EBA\u306B\u3057\u306A\u3044")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", border: "2px solid #dc2626", borderRadius: 8, padding: "8px 10px", margin: "10px 0", fontWeight: 700, color: "#b91c1c" } }, "\u547C\u3073\u304B\u3051\u306B\u7B54\u3048\u306A\u3044\u30FB\u8A00\u3063\u3066\u3044\u308B\u3053\u3068\u304C\u304A\u304B\u3057\u3044\u30FB\u81EA\u5206\u3067\u6C34\u304C\u98F2\u3081\u306A\u3044\u30FB\u3051\u3044\u308C\u3093\u3057\u3066\u3044\u308B \u2192 ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15 } }, "\u3059\u3050119\u756A\uFF08\u6551\u6025\u8ECA\uFF09")), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#374151", marginTop: 6, marginBottom: 6 } }, "\u9023\u7D61\u5148"), tel("119", "\u6551\u6025\u8ECA"), tel("090-4749-4614", "\u4F1A\u793E\uFF08\u52DD\u9593 \u88D5\u592A\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 4 } }, "\u305D\u306E\u65E5\u306E\u73FE\u5834\u306E\u8077\u9577\u306B\u3082\u3001\u3059\u3050\u77E5\u3089\u305B\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: "#374151", marginTop: 10 } }, "\u3075\u3060\u3093\u306E\u4E88\u9632"), /* @__PURE__ */ React.createElement("div", null, "\u6691\u3055\u6307\u6570\uFF08WBGT\uFF09\u304C\u9AD8\u3044\u65E5\u306F\u3001\u3053\u307E\u3081\u306B\u4F11\u61A9\u3068\u6C34\u5206\u30FB\u5869\u5206\u3002\u671D\u306E\u4F53\u8ABF\u304C\u60AA\u3044\u65E5\u306F\u3001\u7121\u7406\u305B\u305A\u8077\u9577\u306B\u8A00\u3046\u3002")));
}
function ClockButton({ user, projectId, clockLogs, onClock, siteCoords, siteHasAddress, onRegisterSite, hourlyLeft = 35 }) {
  const [siteReg, setSiteReg] = useState(null);
  const siteDoneRef = useRef(null);
  const [state, setState] = useState("idle");
  const [errMsg, setErrMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [failModal, setFailModal] = useState(false);
  const [deniedMode, setDeniedMode] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [earlyMode, setEarlyMode] = useState(null);
  const [earlyLeaveCategory, setEarlyLeaveCategory] = useState("");
  const [earlyReasonText, setEarlyReasonText] = useState("");
  const [earlyPreset, setEarlyPreset] = useState("");
  const [earlyPay, setEarlyPay] = useState("");
  const [breakAsk, setBreakAsk] = useState(null);
  const [outsourceMode, setOutsourceMode] = useState(null);
  const [osStep, setOsStep] = useState("ask");
  const [osType, setOsType] = useState(null);
  const [osCount, setOsCount] = useState(1);
  const [farWarn, setFarWarn] = useState(null);
  const [nightLongWarn, setNightLongWarn] = useState(null);
  const [commuteMethod, setCommuteMethod] = useState("");
  const [isNightShift, setIsNightShift] = useState(false);
  const openLog = clockLogs.find((l) => l.userId === user.id && l.projectId === projectId && !l.clockOut && (isSameLocalDay(l.clockIn) || l.isNightShift && Date.now() - new Date(l.clockIn).getTime() < 24 * 36e5));
  const FAR_THRESHOLD_M = 1e3;
  const gpsConfigs = [
    { enableHighAccuracy: false, timeout: 1e4, maximumAge: 3e4 },
    // 低精度でまず試す
    { enableHighAccuracy: true, timeout: 15e3, maximumAge: 0 },
    // 高精度（最新）
    { enableHighAccuracy: true, timeout: 2e4, maximumAge: 6e4 }
    // 高精度（キャッシュ可）
  ];
  const doClick = async (coords, locName, note = "", skipFarCheck = false) => {
    if (openLog && !siteCoords && !siteHasAddress && onRegisterSite && siteDoneRef.current !== projectId) {
      setSiteReg({ coords, locName, note, address: "", loading: !!parseCoords(coords), saving: false, err: "" });
      setState("idle");
      setProgress(0);
      const c = parseCoords(coords);
      if (c) getSiteAddressSuggestion(c.lat, c.lng).then((a) => setSiteReg((s) => s ? { ...s, address: s.address || a, loading: false } : s));
      return;
    }
    if (openLog && !skipFarCheck && coords) {
      const ref = siteCoords || parseCoords(openLog.coordsIn);
      const dist = distanceMeters(ref, parseCoords(coords));
      if (dist != null && dist >= FAR_THRESHOLD_M) {
        setFarWarn({ coords, locName, note, dist });
        setState("idle");
        setProgress(0);
        return;
      }
    }
    if (openLog && !openLog.isNightShift && (/* @__PURE__ */ new Date()).getHours() < 16 && !note) {
      setEarlyMode({ coords, locName });
      setEarlyLeaveCategory("");
      setEarlyReasonText("");
      setState("idle");
      setProgress(0);
      return;
    }
    if (openLog && openLog.isNightShift) {
      const workedH = (Date.now() - new Date(openLog.clockIn).getTime()) / 36e5;
      if (workedH >= 16) {
        setNightLongWarn({ coords, locName, note, workedH });
        setState("idle");
        setProgress(0);
        return;
      }
    }
    if (openLog && !openLog.isNightShift && (/* @__PURE__ */ new Date()).getHours() >= 17) {
      setBreakAsk({ coords, locName, note, step: "ask", min: 30, reason: "" });
      setState("idle");
      setProgress(0);
      return;
    }
    if (openLog) {
      startOutsource(["out", coords, openLog == null ? void 0 : openLog.id, locName, note]);
      return;
    }
    setState("loading");
    const ok = await onClock("in", coords, null, locName, note, "", "", 0, null, commuteMethod, isNightShift);
    if (!ok) {
      setState("idle");
      setProgress(0);
      return;
    }
    setCommuteMethod("");
    setIsNightShift(false);
    setState("done");
    setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 2e3);
  };
  const startOutsource = (outArgs) => {
    setOutsourceMode({ outArgs });
    setOsStep("ask");
    setOsType(null);
    setOsCount(1);
    setState("idle");
    setProgress(0);
  };
  const finishOut = async (outsource) => {
    const a = (outsourceMode == null ? void 0 : outsourceMode.outArgs) || [];
    setOutsourceMode(null);
    setOsType(null);
    setOsCount(1);
    setState("loading");
    const ok = await onClock(a[0], a[1], a[2], a[3] || "", a[4] || "", a[5] || "", a[6] || "", a[7] || 0, outsource, "", false, a[8] || null);
    if (!ok) {
      setState("idle");
      setProgress(0);
      return;
    }
    setState("done");
    setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 2e3);
  };
  const calcEarlyHours = () => {
    const now = /* @__PURE__ */ new Date();
    const earlyMins = 17 * 60 - (now.getHours() * 60 + now.getMinutes());
    const remainder = earlyMins % 60;
    return remainder >= 30 ? Math.ceil(earlyMins / 60) : Math.floor(earlyMins / 60);
  };
  const EARLY_PRESETS = ["\u4F5C\u696D\u304C\u4E88\u5B9A\u3088\u308A\u65E9\u304F\u7D42\u308F\u3063\u305F", "\u6750\u6599\u5F85\u3061\u30FB\u6BB5\u53D6\u308A\u5F85\u3061", "\u5143\u8ACB\u306E\u6307\u793A", "\u5929\u5019", "\u305D\u306E\u4ED6"];
  const earlyReasonFinal = () => {
    if (earlyLeaveCategory === "\u73FE\u5834\u7D42\u4E86") {
      if (!earlyPreset) return "";
      if (earlyPreset === "\u305D\u306E\u4ED6") return earlyReasonText.trim();
      return earlyPreset + (earlyReasonText.trim() ? "\uFF0F" + earlyReasonText.trim() : "");
    }
    return earlyReasonText.trim();
  };
  const handleEarlySubmit = () => {
    const elr = earlyReasonFinal();
    if (!earlyLeaveCategory || !elr) return;
    if (earlyLeaveCategory === "\u672C\u4EBA\u90FD\u5408" && !earlyPay) return;
    const { coords, locName } = earlyMode;
    const hourlyUsed = earlyLeaveCategory === "\u672C\u4EBA\u90FD\u5408" && earlyPay === "paid_leave" ? calcEarlyHours() : 0;
    const elc = earlyLeaveCategory;
    const extra = earlyLeaveCategory === "\u672C\u4EBA\u90FD\u5408" ? { earlyLeavePay: earlyPay } : null;
    setEarlyMode(null);
    setEarlyLeaveCategory("");
    setEarlyReasonText("");
    setEarlyPreset("");
    setEarlyPay("");
    startOutsource(["out", coords, openLog == null ? void 0 : openLog.id, locName, "", elc, elr, hourlyUsed, extra]);
  };
  const handleEarlyCancel = () => {
    setEarlyMode(null);
    setEarlyReasonText("");
    setEarlyPreset("");
    setEarlyPay("");
    setState("idle");
    setProgress(0);
  };
  const tryGPS = (attempt) => {
    setProgress(attempt + 1);
    const msgs = ["\u4F4D\u7F6E\u60C5\u5831\u3092\u53D6\u5F97\u4E2D\u2026\uFF08\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\uFF09", "GPS\u53D6\u5F97\u4E2D\u2026 \u3082\u3046\u5C11\u3057\u304A\u5F85\u3061\u3092 (2/3)", "GPS\u53D6\u5F97\u4E2D\u2026 \u6700\u7D42\u8A66\u884C (3/3)"];
    setErrMsg(msgs[attempt] || "GPS\u53D6\u5F97\u4E2D\u2026");
    const config = gpsConfigs[attempt] || gpsConfigs[2];
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
        getLocationName(c.lat, c.lng).then((n) => doClick(c, n)).catch(() => doClick(c, ""));
      },
      (err) => {
        if (err.code === 1) {
          setState("idle");
          setProgress(0);
          setDeniedMode(true);
          setFailModal(true);
          setReasonText("");
        } else if (attempt >= 2) {
          setState("idle");
          setProgress(0);
          setDeniedMode(false);
          setFailModal(true);
          setReasonText("");
        } else {
          setTimeout(() => tryGPS(attempt + 1), 500);
        }
      },
      config
    );
  };
  const handle = async () => {
    var _a;
    if (state === "loading") return;
    if (!openLog && !commuteMethod) return;
    if (!navigator.geolocation) {
      setDeniedMode(false);
      setFailModal(true);
      setReasonText("\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u306FGPS\u306B\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u305F\u3081");
      return;
    }
    if ((_a = navigator.permissions) == null ? void 0 : _a.query) {
      try {
        const p = await navigator.permissions.query({ name: "geolocation" });
        if (p.state === "denied") {
          setDeniedMode(true);
          setFailModal(true);
          setReasonText("");
          return;
        }
      } catch (e) {
      }
    }
    setState("loading");
    setProgress(1);
    setErrMsg("\u4F4D\u7F6E\u60C5\u5831\u3092\u53D6\u5F97\u4E2D\u2026");
    setDeniedMode(false);
    tryGPS(0);
  };
  const handleReasonSubmit = () => {
    if (!reasonText.trim()) return;
    setFailModal(false);
    setDeniedMode(false);
    doClick(null, "", "GPS\u53D6\u5F97\u5931\u6557: " + reasonText.trim());
    setReasonText("");
  };
  const handleRetry = () => {
    setFailModal(false);
    setDeniedMode(false);
    setReasonText("");
    handle();
  };
  const isLoading = state === "loading";
  const needCommute = !openLog && !commuteMethod;
  const label = isLoading ? `\u4F4D\u7F6E\u60C5\u5831\u3092\u53D6\u5F97\u4E2D\u2026 (${progress}/3)` : state === "done" ? "\u2713 \u8A18\u9332\u3057\u307E\u3057\u305F" : openLog ? "\u9000\u52E4\u3059\u308B" : "\u51FA\u52E4\u3059\u308B";
  const bg = state === "done" ? "#22c55e" : isLoading || needCommute ? "#e5e7eb" : openLog ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#22c55e,#16a34a)";
  const commuteOpts = [{ id: "company_car", icon: "\u{1F690}", label: "\u793E\u7528\u8ECA" }, { id: "company_car_shared", icon: "\u{1F690}", label: "\u76F8\u4E57\u308A" }, { id: "train", icon: "\u{1F683}", label: "\u96FB\u8ECA" }, { id: "own_car", icon: "\u{1F697}", label: "\u81EA\u8ECA" }];
  return /* @__PURE__ */ React.createElement("div", null, !openLog && !isLoading && state !== "done" && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u52E4\u52D9\u533A\u5206"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [{ id: false, icon: "\u2600\uFE0F", label: "\u65E5\u52E4" }, { id: true, icon: "\u{1F319}", label: "\u591C\u52E4" }].map((w) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: String(w.id),
      onClick: () => setIsNightShift(w.id),
      style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: isNightShift === w.id ? w.id ? "2px solid #6366f1" : "2px solid #22c55e" : "1px solid #d1d5db", background: isNightShift === w.id ? w.id ? "#eef2ff" : "#f0fdf4" : "#fafafa", color: isNightShift === w.id ? w.id ? "#4f46e5" : "#16a34a" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1.4 }
    },
    /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, marginRight: 4 } }, w.icon),
    w.label
  )))), !openLog && !isLoading && state !== "done" && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u901A\u52E4\u65B9\u6CD5 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "*\u5FC5\u9808")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, commuteOpts.map((m) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: m.id,
      onClick: () => setCommuteMethod(m.id),
      style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: commuteMethod === m.id ? "2px solid #22c55e" : "1px solid #d1d5db", background: commuteMethod === m.id ? "#f0fdf4" : "#fafafa", color: commuteMethod === m.id ? "#16a34a" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1.4 }
    },
    /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18 } }, m.icon),
    m.label
  )))), /* @__PURE__ */ React.createElement("button", { onClick: handle, disabled: isLoading || needCommute, style: { width: "100%", background: bg, color: isLoading || needCommute ? "#9ca3af" : "#000", border: "none", borderRadius: 10, padding: "14px", fontSize: 14, fontWeight: 700, cursor: isLoading ? "wait" : needCommute ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 0.2s" } }, /* @__PURE__ */ React.createElement("span", null, isLoading ? "\u231B" : state === "done" ? "\u2713" : openLog ? "\u{1F535}" : "\u{1F7E2}"), label), needCommute && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 6, textAlign: "center" } }, "\u2191 \u901A\u52E4\u65B9\u6CD5\u3092\u9078\u3076\u3068\u51FA\u52E4\u3067\u304D\u307E\u3059"), isLoading && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginTop: 6, textAlign: "center" } }, errMsg, "\uFF08\u6700\u592745\u79D2\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u30FB\u9014\u4E2D\u3067\u9589\u3058\u306A\u3044\u3067\uFF09"), openLog && !isLoading && state === "idle" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: openLog.isNightShift ? "#818cf8" : "#60a5fa", marginTop: 6, textAlign: "center" } }, openLog.isNightShift ? "\u{1F319} \u591C\u52E4 " : "", "\u51FA\u52E4\u4E2D: ", timeStr(openLog.clockIn), " \u301C"), nightLongWarn && (() => {
    const h = nightLongWarn.workedH.toFixed(1);
    const proceed = () => {
      const { coords, locName, note } = nightLongWarn;
      setNightLongWarn(null);
      startOutsource(["out", coords, openLog == null ? void 0 : openLog.id, locName, note]);
    };
    const cancel = () => {
      setNightLongWarn(null);
      setState("idle");
      setProgress(0);
    };
    return /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      if (e.target === e.currentTarget) cancel();
    }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "2px solid #6366f1", borderRadius: 12, padding: 20, maxWidth: 420, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#4f46e5", marginBottom: 10 } }, "\u{1F319} \u591C\u52E4\u306E\u9000\u52E4\u78BA\u8A8D"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#374151", marginBottom: 10, lineHeight: 1.7 } }, "\u51FA\u52E4\uFF08", timeStr(openLog == null ? void 0 : openLog.clockIn), "\uFF09\u304B\u3089 ", /* @__PURE__ */ React.createElement("b", { style: { color: "#4f46e5", fontSize: 16 } }, "\u7D04", h, "\u6642\u9593"), " \u7D4C\u904E\u3057\u3066\u3044\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.6 } }, "\u6628\u65E5\u306E\u9000\u52E4\u6253\u523B\u3092\u62BC\u3057\u5FD8\u308C\u3066\u3044\u307E\u305B\u3093\u304B\uFF1F\u3044\u307E\u62BC\u3059\u3068\u4ECA\u306E\u6642\u523B\u3067\u9000\u52E4\u304C\u8A18\u9332\u3055\u308C\u307E\u3059\u3002\u6253\u523B\u5FD8\u308C\u306E\u5834\u5408\u306F\u300C\u3084\u3081\u308B\u300D\u2192 \u6B63\u3057\u3044\u9000\u52E4\u6642\u523B\u306F\u7BA1\u7406\u8005\u306B\u4FEE\u6B63\u3092\u4F9D\u983C\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: cancel, style: { flex: 1, background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { onClick: proceed, style: { flex: 1, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u4ECA\u306E\u6642\u523B\u3067\u9000\u52E4\u3059\u308B"))));
  })(), siteReg && (() => {
    const cancel = () => {
      setSiteReg(null);
      setState("idle");
      setProgress(0);
    };
    const save = async () => {
      const addr = (siteReg.address || "").trim();
      if (!addr) {
        setSiteReg((s) => ({ ...s, err: "\u4F4F\u6240\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" }));
        return;
      }
      setSiteReg((s) => ({ ...s, saving: true, err: "" }));
      const ok = await onRegisterSite(addr, siteReg.coords);
      if (!ok) {
        setSiteReg((s) => ({ ...s, saving: false, err: "\u767B\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u96FB\u6CE2\u3092\u78BA\u8A8D\u3057\u3066\u3082\u3046\u4E00\u5EA6" }));
        return;
      }
      const { coords, locName, note } = siteReg;
      siteDoneRef.current = projectId;
      setSiteReg(null);
      doClick(coords, locName, note, true);
    };
    const hasGps = !!parseCoords(siteReg.coords);
    return /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      if (e.target === e.currentTarget && !siteReg.saving) cancel();
    }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "2px solid #2563eb", borderRadius: 12, padding: 20, maxWidth: 420, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#2563eb", marginBottom: 10 } }, "\u{1F4CD} \u3053\u306E\u73FE\u5834\u306E\u4F4F\u6240\u3092\u767B\u9332\uFF08\u521D\u56DE\u3060\u3051\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 10, lineHeight: 1.7 } }, "\u521D\u3081\u3066\u306E\u73FE\u5834\u3067\u3059\u3002", /* @__PURE__ */ React.createElement("b", null, "\u73FE\u5834\u306B\u3044\u308B\u4ECA"), "\u306E\u4F4D\u7F6E\u3092\u3001\u3053\u306E\u73FE\u5834\u306E\u5834\u6240\u3068\u3057\u3066\u767B\u9332\u3057\u307E\u3059\u3002", /* @__PURE__ */ React.createElement("br", null), "\u30AC\u30BD\u30EA\u30F3\u4EE3\u30FB\u9AD8\u901F\u4EE3\u306A\u3069\u4EA4\u901A\u8CBB\u306E\u8A08\u7B97\u306E\u57FA\u6E96\u306B\u306A\u308A\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginBottom: 4 } }, "\u4F4F\u6240\uFF08\u9055\u3063\u3066\u3044\u305F\u3089\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\uFF09"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: siteReg.address,
        disabled: siteReg.saving,
        onChange: (e) => setSiteReg((s) => ({ ...s, address: e.target.value, err: "" })),
        placeholder: siteReg.loading ? "\u73FE\u5728\u5730\u304B\u3089\u4F4F\u6240\u3092\u8ABF\u3079\u3066\u3044\u307E\u3059\u2026" : "\u4F8B\uFF1A\u57FC\u7389\u770C\u516B\u6F6E\u5E02\u5927\u702C1\u4E01\u76EE",
        style: { width: "100%", padding: "10px", fontSize: 14, border: "1px solid #9ca3af", borderRadius: 8, marginBottom: 8 }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: hasGps ? "#16a34a" : "#b45309", marginBottom: 10, lineHeight: 1.6 } }, hasGps ? "\u2713 \u4F4D\u7F6E\uFF08GPS\uFF09\u3082\u4E00\u7DD2\u306B\u767B\u9332\u3057\u307E\u3059" : "\u26A0 \u4F4D\u7F6E\uFF08GPS\uFF09\u304C\u53D6\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u4F4F\u6240\u304B\u3089\u5834\u6240\u3092\u51FA\u3057\u307E\u3059\u3002\u3067\u304D\u308C\u3070\u756A\u5730\u307E\u3067\u5165\u308C\u3066\u304F\u3060\u3055\u3044"), siteReg.err && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#ef4444", marginBottom: 8 } }, siteReg.err), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: cancel, disabled: siteReg.saving, style: { flex: 1, background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u3084\u3081\u308B"), /* @__PURE__ */ React.createElement("button", { onClick: save, disabled: siteReg.saving || !(siteReg.address || "").trim(), style: { flex: 2, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: siteReg.saving || !(siteReg.address || "").trim() ? 0.5 : 1 } }, siteReg.saving ? "\u767B\u9332\u4E2D\u2026" : "\u767B\u9332\u3057\u3066\u9000\u52E4\u3059\u308B"))));
  })(), farWarn && (() => {
    const km = (farWarn.dist / 1e3).toFixed(1);
    const proceed = () => {
      const { coords, locName, note } = farWarn;
      setFarWarn(null);
      doClick(coords, locName, note, true);
    };
    const cancel = () => {
      setFarWarn(null);
      setState("idle");
      setProgress(0);
    };
    return /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      if (e.target === e.currentTarget) cancel();
    }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "2px solid #ef4444", borderRadius: 12, padding: 20, maxWidth: 420, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 10 } }, "\u26A0\uFE0F \u73FE\u5834\u304B\u3089\u96E2\u308C\u3066\u3044\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#374151", marginBottom: 8, lineHeight: 1.7 } }, "\u73FE\u5728\u5730\u304C\u73FE\u5834\u304B\u3089 ", /* @__PURE__ */ React.createElement("b", { style: { color: "#ef4444", fontSize: 16 } }, "\u7D04", km, "km"), " \u96E2\u308C\u3066\u3044\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 10, lineHeight: 1.6 } }, "\u9000\u52E4\u6253\u523B\u306F", /* @__PURE__ */ React.createElement("b", null, "\u73FE\u5834\u3092\u51FA\u308B\u524D"), "\u306B\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5E30\u5B85\u9014\u4E2D\u3084\u8ECA\u5185\u3067\u6253\u523B\u3059\u308B\u3068\u4F4D\u7F6E\u60C5\u5831\u304C\u30BA\u30EC\u3066\u8A18\u9332\u3055\u308C\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 16, lineHeight: 1.6, background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px" } }, "\u3053\u306E\u6253\u523B\u306E\u4F4D\u7F6E\u306F\u8A18\u9332\u3055\u308C\u307E\u3059\u3002\u6B8B\u696D\u30FB\u624B\u5F53\u306F\u73FE\u5834\u306E\u4F4D\u7F6E\u3092\u57FA\u6E96\u306B\u8A08\u7B97\u3057\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: cancel, style: { flex: 1, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u73FE\u5834\u306B\u623B\u3063\u3066\u62BC\u3059"), /* @__PURE__ */ React.createElement("button", { onClick: proceed, style: { flex: 1, background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u3053\u306E\u307E\u307E\u9000\u52E4"))));
  })(), breakAsk && (() => {
    const go = (extra) => {
      const { coords, locName, note } = breakAsk;
      setBreakAsk(null);
      startOutsource(["out", coords, openLog == null ? void 0 : openLog.id, locName, note, "", "", 0, extra]);
    };
    const cancel = () => {
      setBreakAsk(null);
      setState("idle");
      setProgress(0);
    };
    const okShort = breakAsk.min > 0 && breakAsk.reason.trim();
    return /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      if (e.target === e.currentTarget) cancel();
    }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #2563eb", borderRadius: 12, padding: 20, maxWidth: 420, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#1d4ed8", marginBottom: 12 } }, "\u2615 \u4ECA\u65E5\u306E\u4F11\u61A9\u306F\u53D6\u308C\u307E\u3057\u305F\u304B\uFF1F"), breakAsk.step === "ask" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setBreakAsk((b) => ({ ...b, step: "short" })), style: { flex: 1, padding: "14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fafafa", color: "#4b5563", fontSize: 14, fontWeight: 700, cursor: "pointer" } }, "\u53D6\u308C\u306A\u304B\u3063\u305F"), /* @__PURE__ */ React.createElement("button", { onClick: () => go(null), style: { flex: 1, padding: "14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" } }, "\u53D6\u308C\u305F")), breakAsk.step === "short" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u53D6\u308C\u306A\u304B\u3063\u305F\u6642\u9593"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: breakAsk.min,
        onChange: (e) => setBreakAsk((b) => ({ ...b, min: Number(e.target.value) })),
        style: { width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, marginBottom: 12, background: "#fff" }
      },
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150].map((m) => /* @__PURE__ */ React.createElement("option", { key: m, value: m }, m, "\u5206"))
    ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u4F55\u306E\u4F5C\u696D\u3067\u53D6\u308C\u306A\u304B\u3063\u305F\u304B ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "*\u5FC5\u9808")), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: breakAsk.reason,
        onChange: (e) => setBreakAsk((b) => ({ ...b, reason: e.target.value })),
        rows: 2,
        placeholder: "\u4F8B: \u5348\u5F8C\u306E\u4F11\u61A9\u306E\u6642\u9593\u306B\u3001\u5143\u8ACB\u306E\u6307\u793A\u3067\u914D\u7BA1\u306E\u4FDD\u6E29\u3092\u6025\u3044\u3067\u4ED5\u4E0A\u3052\u305F",
        style: { width: "100%", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px", color: "#111827", fontSize: 13, boxSizing: "border-box", marginBottom: 6 }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginBottom: 12, lineHeight: 1.5 } }, "\u53D6\u308C\u306A\u304B\u3063\u305F\u6642\u9593\u306F\u3001\u50CD\u3044\u305F\u6642\u9593\u3068\u3057\u3066\u6B8B\u696D\u306B\u5165\u308A\u307E\u3059\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setBreakAsk((b) => ({ ...b, step: "ask" })), style: { flex: 1, background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u623B\u308B"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => okShort && go({ breakShortMin: breakAsk.min, breakShortReason: breakAsk.reason.trim() }),
        disabled: !okShort,
        style: { flex: 2, background: okShort ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#e5e7eb", color: okShort ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: okShort ? "pointer" : "not-allowed" }
      },
      "\u9000\u52E4\u3059\u308B"
    )))));
  })(), earlyMode && (() => {
    const now = /* @__PURE__ */ new Date();
    const earlyMins = 17 * 60 - (now.getHours() * 60 + now.getMinutes());
    const remainder = earlyMins % 60;
    const earlyHours = remainder >= 30 ? Math.ceil(earlyMins / 60) : Math.floor(earlyMins / 60);
    const cats = [{ id: "\u73FE\u5834\u7D42\u4E86", icon: "\u{1F3D7}", label: "\u73FE\u5834\u7D42\u4E86" }, { id: "\u4F1A\u793E\u90FD\u5408", icon: "\u{1F4DD}", label: "\u4F1A\u793E\u90FD\u5408" }, { id: "\u672C\u4EBA\u90FD\u5408", icon: "\u{1F464}", label: "\u672C\u4EBA\u90FD\u5408" }];
    const reasonOk = earlyLeaveCategory === "\u73FE\u5834\u7D42\u4E86" ? earlyPreset && (earlyPreset !== "\u305D\u306E\u4ED6" || earlyReasonText.trim()) : !!earlyReasonText.trim();
    const paidOk = earlyHours <= hourlyLeft;
    const canSubmit = earlyLeaveCategory && reasonOk && (earlyLeaveCategory !== "\u672C\u4EBA\u90FD\u5408" || earlyPay && (earlyPay !== "paid_leave" || paidOk));
    return /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      if (e.target === e.currentTarget) handleEarlyCancel();
    }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #f97316", borderRadius: 12, padding: 20, maxWidth: 440, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#f97316", marginBottom: 6 } }, "\u23F0 \u65E9\u4E0A\u304C\u308A\u9000\u52E4"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4b5563", marginBottom: 14, lineHeight: 1.5 } }, "16:00\u524D\u306E\u9000\u52E4\u3067\u3059\u3002\u30AB\u30C6\u30B4\u30EA\u3068\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u30AB\u30C6\u30B4\u30EA"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 14 } }, cats.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.id,
        onClick: () => setEarlyLeaveCategory(c.id),
        style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: earlyLeaveCategory === c.id ? "2px solid #f97316" : "1px solid #d1d5db", background: earlyLeaveCategory === c.id ? "#2a1500" : "#fafafa", color: earlyLeaveCategory === c.id ? "#f97316" : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: 1.4 }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16 } }, c.icon),
      c.label
    ))), earlyLeaveCategory && /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #22c55e44", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#86efac" } }, "\u65E9\u4E0A\u304C\u308A\u6642\u9593\uFF1A", /* @__PURE__ */ React.createElement("b", { style: { fontSize: 14, color: "#22c55e" } }, earlyHours, "\u6642\u9593")), earlyLeaveCategory === "\u672C\u4EBA\u90FD\u5408" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u65E9\u304F\u4E0A\u304C\u308B\u6642\u9593\u306E\u6271\u3044 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "*\u5FC5\u9808")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => paidOk && setEarlyPay("paid_leave"),
        disabled: !paidOk,
        style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: earlyPay === "paid_leave" ? "2px solid #f97316" : "1px solid #d1d5db", background: earlyPay === "paid_leave" ? "#fff7ed" : "#fafafa", color: paidOk ? "#111827" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: paidOk ? "pointer" : "not-allowed", lineHeight: 1.4 }
      },
      "\u6642\u9593\u6709\u7D66\u3092\u4F7F\u3046",
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 400, color: "#6b7280" } }, earlyHours, "\u6642\u9593\uFF08\u6B8B\u308A ", hourlyLeft, "\u6642\u9593\uFF09")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setEarlyPay("absence"),
        style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: earlyPay === "absence" ? "2px solid #f97316" : "1px solid #d1d5db", background: earlyPay === "absence" ? "#fff7ed" : "#fafafa", color: "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1.4 }
      },
      "\u6B20\u52E4\u306B\u3059\u308B",
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, fontWeight: 400, color: "#6b7280" } }, "\u65E9\u304F\u4E0A\u304C\u3063\u305F\u5206\u3092\u7D66\u6599\u304B\u3089\u5F15\u304F")
    )), !paidOk && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", marginBottom: 10 } }, "\u6642\u9593\u6709\u7D66\u306E\u6B8B\u308A\u304C\u8DB3\u308A\u307E\u305B\u3093\uFF081\u5E74\u306B35\u6642\u9593\u307E\u3067\uFF09")), earlyLeaveCategory === "\u73FE\u5834\u7D42\u4E86" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, "\u65E9\u304F\u7D42\u308F\u3063\u305F\u7406\u7531 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "*\u5FC5\u9808")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 } }, EARLY_PRESETS.map((r) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: r,
        onClick: () => setEarlyPreset(r),
        style: { padding: "8px 10px", borderRadius: 8, border: earlyPreset === r ? "2px solid #16a34a" : "1px solid #d1d5db", background: earlyPreset === r ? "#f0fdf4" : "#fafafa", color: "#111827", fontSize: 12, fontWeight: 700, cursor: "pointer" }
      },
      r
    )))), earlyLeaveCategory && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, earlyLeaveCategory === "\u73FE\u5834\u7D42\u4E86" ? /* @__PURE__ */ React.createElement(React.Fragment, null, "\u304F\u308F\u3057\u304F", earlyPreset === "\u305D\u306E\u4ED6" ? /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, " *\u5FC5\u9808") : /* @__PURE__ */ React.createElement("span", { style: { color: "#9ca3af", fontWeight: 400 } }, "\uFF08\u3042\u308C\u3070\uFF09")) : /* @__PURE__ */ React.createElement(React.Fragment, null, "\u7406\u7531 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, "*\u5FC5\u9808"))), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: earlyReasonText,
        onChange: (e) => setEarlyReasonText(e.target.value),
        placeholder: earlyLeaveCategory === "\u73FE\u5834\u7D42\u4E86" ? "\u4F8B: \u6B21\u306E\u4F5C\u696D\u306F\u3007\u65E5\u304B\u3089 / \u5143\u8ACB\u306E\u3007\u3007\u3055\u3093\u306E\u6307\u793A" : earlyLeaveCategory === "\u672C\u4EBA\u90FD\u5408" ? "\u4F8B: \u75C5\u9662\u306E\u53D7\u8A3A\u306E\u305F\u3081" : "\u4F8B: \u4F1A\u793E\u306E\u7528\u4E8B\u306E\u305F\u3081",
        rows: 2,
        style: { width: "100%", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px", color: "#111827", fontSize: 13, resize: "vertical", boxSizing: "border-box" }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: handleEarlyCancel, style: { flex: 1, background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u30AD\u30E3\u30F3\u30BB\u30EB"), /* @__PURE__ */ React.createElement("button", { onClick: handleEarlySubmit, disabled: !canSubmit, style: { flex: 2, background: canSubmit ? "linear-gradient(135deg,#f97316,#ef4444)" : "#e5e7eb", color: canSubmit ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed" } }, "\u9000\u52E4\u3059\u308B"))));
  })(), outsourceMode && (() => {
    const supportAmt = SUPPORT_UNIT_PRICE * (Number(osCount) || 0);
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #a78bfa", borderRadius: 12, padding: 20, maxWidth: 440, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 14 } }, "\u{1F91D} \u5916\u6CE8\u60C5\u5831\u306E\u5165\u529B"), osStep === "ask" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: "#111827", marginBottom: 18, textAlign: "center", lineHeight: 1.6 } }, "\u4ECA\u65E5\u3001\u5916\u6CE8\u306F\u5165\u308A\u307E\u3057\u305F\u304B\uFF1F"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => finishOut(null), style: { flex: 1, padding: "14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fafafa", color: "#4b5563", fontSize: 14, fontWeight: 700, cursor: "pointer" } }, "\u3044\u3044\u3048"), /* @__PURE__ */ React.createElement("button", { onClick: () => setOsStep("type"), style: { flex: 1, padding: "14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#a78bfa,#6366f1)", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" } }, "\u306F\u3044"))), osStep === "type" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 8, fontWeight: 600 } }, "\u5916\u6CE8\u306E\u7A2E\u5225"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16 } }, [{ id: "support", label: "\u5FDC\u63F4", desc: "\u4EBA\u6570\u306E\u307F\u8A18\u9332" }, { id: "subcontract", label: "\u8ACB\u8CA0", desc: "\u4EBA\u6570\u306E\u307F\u8A18\u9332" }].map((t) => /* @__PURE__ */ React.createElement("button", { key: t.id, onClick: () => {
      setOsType(t.id);
      setOsStep("count");
    }, style: { flex: 1, padding: "16px 8px", borderRadius: 8, border: osType === t.id ? "2px solid #a78bfa" : "1px solid #d1d5db", background: osType === t.id ? "#f5f3ff" : "#fafafa", color: "#111827", fontSize: 14, fontWeight: 700, cursor: "pointer", lineHeight: 1.5 } }, t.label, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", fontWeight: 400, marginTop: 4 } }, t.desc)))), /* @__PURE__ */ React.createElement("button", { onClick: () => setOsStep("ask"), style: { width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #d1d5db", background: "transparent", color: "#6b7280", fontSize: 12, cursor: "pointer" } }, "\u2190 \u623B\u308B")), osStep === "count" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 6, fontWeight: 600 } }, osType === "support" ? "\u5FDC\u63F4" : "\u8ACB\u8CA0", "\u3000\u4EBA\u6570"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOsCount((c) => Math.max(1, (Number(c) || 1) - 1)), style: { width: 44, height: 44, borderRadius: 8, border: "1px solid #d1d5db", background: "#fafafa", color: "#a78bfa", fontSize: 20, fontWeight: 700, cursor: "pointer" } }, "\u2212"), /* @__PURE__ */ React.createElement("input", { type: "number", value: osCount, min: 1, max: 20, onChange: (e) => {
      const v = Math.floor(Number(e.target.value) || 1);
      setOsCount(Math.min(20, Math.max(1, v)));
    }, style: { width: 80, textAlign: "center", fontSize: 22, fontWeight: 700, padding: "8px", borderRadius: 8, border: "1px solid #d1d5db", background: "#e5e7eb", color: "#111827" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, color: "#6b7280" } }, "\u4EBA"), /* @__PURE__ */ React.createElement("button", { onClick: () => setOsCount((c) => Math.min(20, (Number(c) || 1) + 1)), style: { width: 44, height: 44, borderRadius: 8, border: "1px solid #d1d5db", background: "#fafafa", color: "#a78bfa", fontSize: 20, fontWeight: 700, cursor: "pointer" } }, "\uFF0B")), osType === "support" ? /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #22c55e44", borderRadius: 8, padding: "10px 14px", marginBottom: 16, textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#6b7280" } }, "\u5FDC\u63F4"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 20, fontWeight: 700, color: "#22c55e" } }, osCount, "\u4EBA")) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b44", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 11, color: "#f59e0b", textAlign: "center" } }, "\u8ACB\u8CA0\u3000", osCount, "\u4EBA\uFF08\u91D1\u984D\u306F\u7BA1\u7406\u8005\u304C\u5165\u529B\u3057\u307E\u3059\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOsStep("type"), style: { flex: 1, padding: "13px", borderRadius: 8, border: "1px solid #d1d5db", background: "transparent", color: "#6b7280", fontSize: 13, cursor: "pointer" } }, "\u2190 \u623B\u308B"), /* @__PURE__ */ React.createElement("button", { onClick: () => finishOut({ type: osType, count: Number(osCount) || 1, amount: osType === "support" ? supportAmt : null }), style: { flex: 2, padding: "13px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#a78bfa,#6366f1)", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" } }, "\u78BA\u5B9A\u3057\u3066\u9000\u52E4")))));
  })(), failModal && /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
    if (e.target === e.currentTarget) {
      setFailModal(false);
      setDeniedMode(false);
    }
  }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #ef4444", borderRadius: 12, padding: 20, maxWidth: 440, width: "100%", maxHeight: "90vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 10 } }, deniedMode ? "\u26A0 \u4F4D\u7F6E\u60C5\u5831\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059" : "\u26A0 GPS\u304C\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F"), deniedMode ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", marginBottom: 14, lineHeight: 1.7 } }, "\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u3067\u4F4D\u7F6E\u60C5\u5831\u304C", /* @__PURE__ */ React.createElement("b", { style: { color: "#ef4444" } }, "\u62D2\u5426"), "\u3055\u308C\u3066\u3044\u307E\u3059\u3002", /* @__PURE__ */ React.createElement("br", null), "\u4E00\u5EA6\u300C\u8A31\u53EF\u3057\u306A\u3044\u300D\u3092\u9078\u3076\u3068\u3001\u30A2\u30D7\u30EA\u5074\u304B\u3089\u8A31\u53EF\u30C0\u30A4\u30A2\u30ED\u30B0\u3092\u518D\u8868\u793A\u3067\u304D\u307E\u305B\u3093\u3002\u4E0B\u8A18\u306E\u624B\u9806\u3067\u8A2D\u5B9A\u3092\u5909\u66F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002", /* @__PURE__ */ React.createElement("div", { style: { background: "#2a1a0f", border: "1px solid #f59e0b66", borderRadius: 6, padding: "8px 10px", marginTop: 10, fontSize: 11, color: "#fbbf24", lineHeight: 1.6, fontWeight: 700 } }, "\u26A1 \u91CD\u8981\uFF1A\u8A2D\u5B9A\u3092\u5909\u66F4\u3057\u305F\u3042\u3068\u3001\u5FC5\u305A", /* @__PURE__ */ React.createElement("b", { style: { color: "#fff" } }, "\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\uFF08\u30EA\u30ED\u30FC\u30C9\uFF09"), "\u3057\u3066\u304B\u3089\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u66F4\u65B0\u3057\u306A\u3044\u3068\u53CD\u6620\u3055\u308C\u307E\u305B\u3093\u3002"), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", border: "1px solid #d1d5db", borderRadius: 6, padding: "10px 12px", marginTop: 8, fontSize: 11, color: "#374151", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#60a5fa", fontWeight: 700, marginBottom: 4, fontSize: 12 } }, "\u{1F4F1} iPhone\uFF08Safari\uFF09"), "\u2460\u300C\u8A2D\u5B9A\u300D\u30A2\u30D7\u30EA \u2192 ", /* @__PURE__ */ React.createElement("b", null, "\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u3068\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3"), /* @__PURE__ */ React.createElement("br", null), "\u2461\u300C\u4F4D\u7F6E\u60C5\u5831\u30B5\u30FC\u30D3\u30B9\u300D\u2192 ON \u3092\u78BA\u8A8D", /* @__PURE__ */ React.createElement("br", null), "\u2462 \u4E0B\u3078\u30B9\u30AF\u30ED\u30FC\u30EB \u2192\u300C", /* @__PURE__ */ React.createElement("b", null, "Safari Web\u30B5\u30A4\u30C8"), "\u300D", /* @__PURE__ */ React.createElement("br", null), "\u2463\u300C\u3053\u306EApp\u306E\u4F7F\u7528\u4E2D\u306E\u307F\u8A31\u53EF\u300D\u307E\u305F\u306F\u300C\u6B21\u56DE\u78BA\u8A8D\u300D\u306B\u5909\u66F4", /* @__PURE__ */ React.createElement("br", null), "\u2464 ", /* @__PURE__ */ React.createElement("b", { style: { color: "#fbbf24" } }, "\u3053\u306E\u30DA\u30FC\u30B8\u306B\u623B\u3063\u3066\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\uFF08\u4E0A\u304B\u3089\u4E0B\u3078\u5F15\u3063\u3071\u308B or \u30A2\u30C9\u30EC\u30B9\u30D0\u30FC\u306E\u27F3\uFF09"), /* @__PURE__ */ React.createElement("br", null), "\u2465 \u300C\u518D\u8A66\u884C\u300D\u30DC\u30BF\u30F3\u3092\u62BC\u3059"), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", border: "1px solid #d1d5db", borderRadius: 6, padding: "10px 12px", marginTop: 6, fontSize: 11, color: "#374151", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#22c55e", fontWeight: 700, marginBottom: 4, fontSize: 12 } }, "\u{1F4F1} Android\uFF08Chrome\uFF09"), "\u2460 \u753B\u9762\u4E0A\u306E\u30A2\u30C9\u30EC\u30B9\u30D0\u30FC\u5DE6\u306E\u300C", /* @__PURE__ */ React.createElement("b", null, "\u{1F512}"), "\u300D\u307E\u305F\u306F\u300C", /* @__PURE__ */ React.createElement("b", null, "\u24D8"), "\u300D\u3092\u30BF\u30C3\u30D7", /* @__PURE__ */ React.createElement("br", null), "\u2461\u300C\u6A29\u9650\u300D\u307E\u305F\u306F\u300C\u30B5\u30A4\u30C8\u306E\u8A2D\u5B9A\u300D\u2192\u300C", /* @__PURE__ */ React.createElement("b", null, "\u4F4D\u7F6E\u60C5\u5831"), "\u300D", /* @__PURE__ */ React.createElement("br", null), "\u2462\u300C\u8A31\u53EF\u300D\u306B\u5909\u66F4", /* @__PURE__ */ React.createElement("br", null), "\u2463 ", /* @__PURE__ */ React.createElement("b", { style: { color: "#fbbf24" } }, "\u30DA\u30FC\u30B8\u3092\u66F4\u65B0\uFF08\u4E0A\u304B\u3089\u4E0B\u3078\u5F15\u3063\u3071\u308B or \u30E1\u30CB\u30E5\u30FC\u306E\u27F3\uFF09"), /* @__PURE__ */ React.createElement("br", null), "\u2464 \u300C\u518D\u8A66\u884C\u300D\u30DC\u30BF\u30F3\u3092\u62BC\u3059"), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, color: "#f59e0b", fontSize: 11, lineHeight: 1.5 } }, "\u203B \u3069\u3046\u3057\u3066\u3082\u8A2D\u5B9A\u5909\u66F4\u3067\u304D\u306A\u3044\u5834\u5408\u306F\u3001\u4E0B\u306E\u6B04\u306B\u7406\u7531\u3092\u66F8\u3044\u3066\u300C\u7406\u7531\u4ED8\u304D\u3067\u6253\u523B\u300D\u3057\u3066\u304F\u3060\u3055\u3044\u3002")) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4b5563", marginBottom: 14, lineHeight: 1.6 } }, "\u4F4D\u7F6E\u60C5\u5831\u3092\u6B8B\u305B\u307E\u305B\u3093\u3067\u3057\u305F\u3002", /* @__PURE__ */ React.createElement("br", null), "\u53D6\u308C\u306A\u3044\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u5C4B\u5185\u306E\u305F\u3081\u30FB\u5730\u4E0B\u306E\u305F\u3081\u7B49\uFF09\u3002"), /* @__PURE__ */ React.createElement("textarea", { value: reasonText, onChange: (e) => setReasonText(e.target.value), placeholder: deniedMode ? "\u8A2D\u5B9A\u5909\u66F4\u3067\u304D\u306A\u3044\u5834\u5408\u306E\u7406\u7531\uFF08\u4F8B: \u4F1A\u793E\u652F\u7D66\u7AEF\u672B\u3067\u5909\u66F4\u4E0D\u53EF\uFF09" : "\u4F8B: \u5730\u4E0B\u99D0\u8ECA\u5834\u306E\u305F\u3081\u3001\u30D3\u30EB\u5185\u306E\u305F\u3081", rows: deniedMode ? 2 : 3, style: { width: "100%", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#111827", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: 12 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: handleRetry, style: { flex: 1, background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa66", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, "\u{1F504} \u518D\u8A66\u884C"), /* @__PURE__ */ React.createElement("button", { onClick: handleReasonSubmit, disabled: !reasonText.trim(), style: { flex: 2, background: reasonText.trim() ? "linear-gradient(135deg,#f97316,#ef4444)" : "#e5e7eb", color: reasonText.trim() ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: reasonText.trim() ? "pointer" : "not-allowed" } }, "\u7406\u7531\u4ED8\u304D\u3067\u6253\u523B")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setFailModal(false);
    setDeniedMode(false);
    setReasonText("");
  }, style: { width: "100%", background: "transparent", color: "#111827", border: "none", borderRadius: 8, padding: "8px", fontSize: 11, cursor: "pointer", marginTop: 6 } }, "\u30AD\u30E3\u30F3\u30BB\u30EB"))));
}
const NINKU_RATE = 62e3;
function calcTargetMandays(project) {
  if (Number(project.targetMandays) > 0) return Number(project.targetMandays);
  const rate = Number(project.ninkuRate) || NINKU_RATE;
  return (project.contractAmount || 0) / rate;
}
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
  const pct = Math.round(actual / target * 100);
  const isOver = pct > 100;
  const barColor = isOver ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  return /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#22c55e", letterSpacing: "0.1em", marginBottom: 12 } }, "\u25A0 \u9032\u6357"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 4 } }, "\u76EE\u6A19\u4EBA\u5DE5"), /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: isOver ? "#ef4444" : "#f97316" } }, actual, "/", target.toFixed(1), "\u4EBA\u5DE5 ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#6b7280" } }, "(", pct, "%)")), breakeven > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444", marginTop: 4 } }, "\u8D64\u5B57\u30E9\u30A4\u30F3 ", breakeven, "\u4EBA\u5DE5", actual > breakeven ? "\uFF08\u8D85\u904E\uFF09" : `\uFF08\u3042\u3068${Math.round((breakeven - actual) * 10) / 10}\u4EBA\u5DE5\uFF09`)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 6 } }, "\u4E88\u7B97\u6D88\u5316"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", background: "#e5e7eb", borderRadius: 6, height: 24, overflow: "hidden", border: "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${Math.min(pct, 100)}%`, background: barColor, height: "100%", transition: "width 0.3s" } })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: barColor, fontWeight: 700 } }, "\u4EBA\u5DE5 ", pct, "%"), isOver && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontWeight: 700 } }, "\u30AA\u30FC\u30D0\u30FC")));
}
const TRAINING_MIN_DEFAULT = 20;
function TrainingFlow({ data, onReload, onExit, canExit, showToast, onCompleted }) {
  const qs = data.questions;
  const total = qs.length;
  const firstUnconfirmed = React.useMemo(() => {
    for (let i = 0; i < qs.length; i++) {
      const r = data.responses.find((x) => x.questionId === qs[i].id);
      if (!r || !r.confirmed) return i;
    }
    return -1;
  }, [qs, data.responses]);
  const [stage, setStage] = useState(() => {
    if (data.completedAt || firstUnconfirmed === -1) return "done";
    if (firstUnconfirmed === 0) return "intro";
    const q0 = qs[firstUnconfirmed];
    return q0 && q0.sectionIntro ? "sectionIntro" : "q";
  });
  const [idx, setIdx] = useState(Math.max(firstUnconfirmed, 0));
  const [draft, setDraft] = useState(() => {
    const q2 = qs[Math.max(firstUnconfirmed, 0)];
    const r = q2 && data.responses.find((x) => x.questionId === q2.id);
    return r ? r.answer : "";
  });
  const [saving, setSaving] = useState(false);
  const [readEnd, setReadEnd] = useState(false);
  const pointRef = useRef(null);
  const timerRef = useRef(null);
  const q = qs[idx];
  const minChars = data.preview ? 0 : q && q.minChars || TRAINING_MIN_DEFAULT;
  const len = draft.trim().length;
  const ok = len >= minChars;
  const hasPoint = !!(q && q.explanation);
  useEffect(() => {
    if (stage !== "q" || !q) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      saveTrainingResponse(q.id, draft, false);
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, stage, q && q.id]);
  const goQuestion = (i) => {
    const nq = qs[i];
    const r = nq && data.responses.find((x) => x.questionId === nq.id);
    setIdx(i);
    setDraft(r ? r.answer : "");
    setReadEnd(false);
    setStage(nq && nq.sectionIntro ? "sectionIntro" : "q");
  };
  const confirm2 = async () => {
    if (!ok || saving) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSaving(true);
    const done = await saveTrainingResponse(q.id, draft, true);
    setSaving(false);
    if (!done) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    await onReload();
    setStage("saved");
  };
  const next = async () => {
    if (idx + 1 < total) {
      goQuestion(idx + 1);
      return;
    }
    const done = await completeTraining(data.training.id);
    if (!done) {
      showToast("\u5B8C\u4E86\u306E\u8A18\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      return;
    }
    if (onCompleted) onCompleted();
    await onReload();
    setStage("done");
  };
  const onPointScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadEnd(true);
  };
  useEffect(() => {
    if (stage !== "point") return;
    const el = pointRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 24) setReadEnd(true);
  }, [stage, idx]);
  const S = {
    wrap: { position: "fixed", inset: 0, background: "#e5e7eb", zIndex: 9e3, display: "flex", flexDirection: "column" },
    body: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" },
    pad: { padding: 16, display: "flex", flexDirection: "column", gap: 10 },
    card: { background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 12, padding: 16 },
    btn: (on) => ({
      width: "100%",
      minHeight: 52,
      border: "none",
      borderRadius: 8,
      padding: 14,
      fontSize: 15,
      fontWeight: 700,
      cursor: on ? "pointer" : "not-allowed",
      background: on ? "#2563eb" : "#e5e7eb",
      color: on ? "#ffffff" : "#9ca3af"
    }),
    link: {
      width: "100%",
      background: "transparent",
      border: "none",
      color: "#9ca3af",
      fontSize: 12,
      textDecoration: "underline",
      cursor: "pointer",
      padding: 12
    },
    tag: {
      display: "inline-block",
      fontSize: 11,
      fontWeight: 700,
      color: "#2563eb",
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      borderRadius: 5,
      padding: "3px 9px",
      marginBottom: 10
    }
  };
  const Progress = ({ n }) => (
    // 表示専用。タップしても移動しない（飛ばし回答を防ぐため）
    /* @__PURE__ */ React.createElement("div", { style: { background: "#ffffff", borderBottom: "1px solid #d1d5db", padding: "10px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", null, n, " / ", total), /* @__PURE__ */ React.createElement("span", null, "\u6B8B\u308A", Math.max(total - n, 0), "\u554F")), /* @__PURE__ */ React.createElement("div", { style: { height: 5, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${n / total * 100}%`, background: "#2563eb", borderRadius: 999 } })))
  );
  if (stage === "intro") return /* @__PURE__ */ React.createElement("div", { style: S.wrap }, /* @__PURE__ */ React.createElement("div", { style: S.body }, /* @__PURE__ */ React.createElement("div", { style: S.pad }, /* @__PURE__ */ React.createElement("div", { style: S.card }, /* @__PURE__ */ React.createElement("div", { style: S.tag }, "\u793E\u5185\u7814\u4FEE\u2460"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 19, fontWeight: 700, lineHeight: 1.6, marginBottom: 14 } }, "\u8003\u3048\u308B\u3053\u3068\u304C\u51FA\u6765\u308B\u8077\u4EBA\u306B\u306A\u308B"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap" } }, data.training.intro), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, paddingTop: 14, borderTop: "1px solid #d1d5db", fontSize: 13, color: "#6b7280", lineHeight: 1.9 } }, "\u7DE0\u5207\uFF1A", fmtTrainingDeadline(data.training.deadline)), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, fontSize: 13, textAlign: "right" } }, "\u52DD\u9593")), /* @__PURE__ */ React.createElement("button", { style: S.btn(true), onClick: () => goQuestion(0) }, "\u7814\u4FEE\u3092\u59CB\u3081\u308B"), canExit && /* @__PURE__ */ React.createElement("button", { style: S.link, onClick: onExit }, "\u3042\u3068\u3067\u66F8\u304F\uFF08", remainUntil(data.training.deadline), "\uFF09"))));
  if (stage === "sectionIntro" && q) return /* @__PURE__ */ React.createElement("div", { style: S.wrap }, /* @__PURE__ */ React.createElement(Progress, { n: idx + 1 }), /* @__PURE__ */ React.createElement("div", { style: S.body }, /* @__PURE__ */ React.createElement("div", { style: S.pad }, /* @__PURE__ */ React.createElement("div", { style: { ...S.card, background: "#eff6ff", borderColor: "#bfdbfe" } }, /* @__PURE__ */ React.createElement("div", { style: S.tag }, q.section), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, lineHeight: 2.1, color: "#1e3a8a", whiteSpace: "pre-wrap" } }, q.sectionIntro)), /* @__PURE__ */ React.createElement("button", { style: S.btn(true), onClick: () => setStage("q") }, "\u8AAD\u307F\u307E\u3057\u305F\u3002\u6B21\u3078\u9032\u3080"), canExit && /* @__PURE__ */ React.createElement("button", { style: S.link, onClick: onExit }, "\u3042\u3068\u3067\u66F8\u304F\uFF08", remainUntil(data.training.deadline), "\uFF09"))));
  if (stage === "q" && q) return /* @__PURE__ */ React.createElement("div", { style: S.wrap }, /* @__PURE__ */ React.createElement(Progress, { n: idx + 1 }), /* @__PURE__ */ React.createElement("div", { style: S.body }, /* @__PURE__ */ React.createElement("div", { style: S.pad }, /* @__PURE__ */ React.createElement("div", { style: S.card }, /* @__PURE__ */ React.createElement("div", { style: S.tag }, q.section), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, lineHeight: 1.7, marginBottom: 6 } }, q.text), q.note && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", lineHeight: 1.8, marginBottom: 12 } }, "\u203B", q.note), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: draft,
      rows: 5,
      onChange: (e) => setDraft(e.target.value),
      placeholder: "\u3053\u3053\u306B\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044",
      style: {
        ...IS,
        fontSize: 16,
        padding: "11px 12px",
        lineHeight: 1.75,
        resize: "vertical",
        minHeight: 112,
        borderColor: ok ? "#d1d5db" : "#f59e0b66"
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, textAlign: "right", marginTop: 5, color: ok ? "#22c55e" : "#f59e0b" } }, ok ? `${len}\u6587\u5B57 \u2713` : `${len} / ${minChars}\u6587\u5B57\uFF08\u3042\u3068${minChars - len}\u6587\u5B57\uFF09`)), /* @__PURE__ */ React.createElement("button", { style: S.btn(ok && !saving), disabled: !ok || saving, onClick: confirm2 }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : ok ? "\u6B21\u3078" : `\u3042\u3068${minChars - len}\u6587\u5B57`), canExit && /* @__PURE__ */ React.createElement("button", { style: S.link, onClick: onExit }, "\u3042\u3068\u3067\u66F8\u304F\uFF08", remainUntil(data.training.deadline), "\uFF09"))));
  if (stage === "saved" && q) return /* @__PURE__ */ React.createElement("div", { style: S.wrap }, /* @__PURE__ */ React.createElement(Progress, { n: idx + 1 }), /* @__PURE__ */ React.createElement("div", { style: S.body }, /* @__PURE__ */ React.createElement("div", { style: S.pad }, /* @__PURE__ */ React.createElement("div", { style: { ...S.card, background: "#f0fdf4", borderColor: "#22c55e44", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 30, lineHeight: 1, marginBottom: 10 } }, "\u2713"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#15803d", marginBottom: 6 } }, "\u3042\u306A\u305F\u306E\u56DE\u7B54\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F"), !data.pastDeadline && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", lineHeight: 1.8 } }, "\u7DE0\u5207\u307E\u3067\u306F\u4F55\u5EA6\u3067\u3082\u66F8\u304D\u76F4\u305B\u307E\u3059")), !hasPoint && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { ...S.card, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 7 } }, q.code, " ", q.text), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.85, color: "#374151", whiteSpace: "pre-wrap" } }, draft)), /* @__PURE__ */ React.createElement("div", { style: { ...S.card, background: "#eff6ff", borderColor: "#bfdbfe" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#1e3a8a", whiteSpace: "pre-wrap" } }, q.noAnswerMsg))), /* @__PURE__ */ React.createElement("button", { style: S.btn(true), onClick: () => {
    if (hasPoint) {
      setReadEnd(false);
      setStage("point");
    } else next();
  } }, hasPoint ? "\u30DD\u30A4\u30F3\u30C8\u3092\u898B\u308B \u2192" : idx + 1 < total ? "\u6B21\u306E\u554F\u984C\u3078 \u2192" : "\u7814\u4FEE\u3092\u7D42\u3048\u308B \u2192"))));
  if (stage === "point" && q) return /* @__PURE__ */ React.createElement("div", { style: S.wrap }, /* @__PURE__ */ React.createElement(Progress, { n: idx + 1 }), /* @__PURE__ */ React.createElement("div", { style: S.body, ref: pointRef, onScroll: onPointScroll }, /* @__PURE__ */ React.createElement("div", { style: S.pad }, /* @__PURE__ */ React.createElement("div", { style: { ...S.card, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 7 } }, "\u3042\u306A\u305F\u306E\u56DE\u7B54"), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", borderRadius: 8, padding: "11px 12px", fontSize: 14, lineHeight: 1.85, color: "#374151", whiteSpace: "pre-wrap" } }, draft)), /* @__PURE__ */ React.createElement("div", { style: S.card }, /* @__PURE__ */ React.createElement("div", { style: S.tag }, "\u30DD\u30A4\u30F3\u30C8"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap" } }, q.explanation)), /* @__PURE__ */ React.createElement("button", { style: S.btn(readEnd), disabled: !readEnd, onClick: next }, readEnd ? idx + 1 < total ? "\u6B21\u306E\u554F\u984C\u3078 \u2192" : "\u7814\u4FEE\u3092\u7D42\u3048\u308B \u2192" : "\u6700\u5F8C\u307E\u3067\u8AAD\u3080\u3068\u62BC\u305B\u307E\u3059"))));
  return /* @__PURE__ */ React.createElement(TrainingOutro, { data, onExit });
}
function parseNinkuNum(s) {
  const t = String(s != null ? s : "").trim().replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 65248));
  if (t === "") return { ok: true, v: null };
  if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false };
  const v = Number(t);
  return v <= 1e4 ? { ok: true, v } : { ok: false };
}
function parseNinkuPct(s) {
  const t = String(s != null ? s : "").trim().replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 65248)).replace(/[−－ー―‐]/g, "-").replace(/[＋]/g, "+").replace(/[%％]/g, "").replace(/\s/g, "");
  if (t === "") return { ok: true, v: null };
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return { ok: false };
  const v = Number(t);
  return v >= -100 && v <= 500 ? { ok: true, v } : { ok: false };
}
function ninkuHasRange(size) {
  return /〜|以下|以上|超/.test(size || "");
}
const NINKU_MID = {
  "20\u301C80A": "50A",
  "100\u301C200A": "150A",
  "250A\u4EE5\u4E0A": "300A",
  "50A\u4EE5\u4E0B": "40A",
  "65\u301C100A": "80A",
  "125\u301C200A": "150A",
  "150\u03C6\u4EE5\u4E0B": "150\u03C6",
  "200\u03C6\u4EE5\u4E0A": "250\u03C6",
  "500\u89D2\u4EE5\u4E0B": "400\u89D2",
  "900\u89D2\u4EE5\u4E0B": "700\u89D2",
  "1200\u89D2\u4EE5\u4E0B": "1000\u89D2",
  "400\u03C6\u4EE5\u4E0B": "300\u03C6",
  "400\u301C800\u03C6": "600\u03C6",
  "800\u03C6\u8D85": "900\u03C6",
  "8\u756A\u4EE5\u4E0B": "6\u756A",
  "8\u756A\u8D85": "10\u756A",
  "80A\u76F8\u5F53\u4EE5\u4E0B": "50A\u76F8\u5F53",
  "80A\u76F8\u5F53\u8D85": "100A\u76F8\u5F53",
  "40A\u4EE5\u4E0B": "25A"
};
function WorkloadInput({ showToast }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [vals, setVals] = useState({});
  const [dirty, setDirty] = useState({});
  const [savingGrp, setSavingGrp] = useState("");
  const [savedMsg, setSavedMsg] = useState({});
  const [memo, setMemo] = useState("");
  const toStr = (v) => v === null || v === void 0 ? "" : String(v);
  const load = async () => {
    setErr("");
    const r = await loadWorkloadInput();
    if (!r) {
      setErr(getLastApiError() || "\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      setRows([]);
      return;
    }
    setRows(r);
    const v = {};
    r.forEach((x) => {
      v[x.id] = { normal: toStr(x.normal), small: toStr(x.small), large: toStr(x.large) };
    });
    setVals(v);
    setDirty({});
    setMemo((r.find((x) => x.id === "wn-preset-memo") || {}).notes || "");
  };
  useEffect(() => {
    load();
  }, []);
  if (rows === null) return /* @__PURE__ */ React.createElement("div", { style: { padding: 24, textAlign: "center", color: "#6b7280", fontSize: 13 } }, "\u8AAD\u307F\u8FBC\u307F\u4E2D...");
  if (err) return /* @__PURE__ */ React.createElement("div", { style: { padding: 24, textAlign: "center", color: "#ef4444", fontSize: 13 } }, err, /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("button", { onClick: load, style: { marginTop: 12, padding: "8px 18px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 13 } }, "\u3082\u3046\u4E00\u5EA6\u8AAD\u307F\u8FBC\u3080"));
  const groups = [];
  const memoRow = rows.find((x) => x.id === "wn-preset-memo");
  rows.filter((x) => x.id !== "wn-preset-memo").forEach((x) => {
    let g = groups.find((g2) => g2.name === x.grp);
    if (!g) {
      g = { name: x.grp, items: [] };
      groups.push(g);
    }
    g.items.push(x);
  });
  const setVal = (row, key, s) => {
    setVals((p) => ({ ...p, [row.id]: { ...p[row.id], [key]: s } }));
    setDirty((p) => ({ ...p, [row.grp]: true }));
  };
  const badCell = (id, key) => {
    var _a, _b;
    return !(key === "normal" ? parseNinkuNum((_a = vals[id]) == null ? void 0 : _a[key]) : parseNinkuPct((_b = vals[id]) == null ? void 0 : _b[key])).ok;
  };
  const saveGroup = async (g) => {
    var _a, _b, _c;
    const items = [];
    for (const x of g.items) {
      const n = parseNinkuNum((_a = vals[x.id]) == null ? void 0 : _a.normal), sm = parseNinkuPct((_b = vals[x.id]) == null ? void 0 : _b.small), lg = parseNinkuPct((_c = vals[x.id]) == null ? void 0 : _c.large);
      if (!n.ok || !sm.ok || !lg.ok) {
        showToast("\u8D64\u3044\u6B04\u3092\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u6570\u91CF\u306F 30\u30FB4.5\u3001\uFF05\u306F +20\u30FB\u221230 \u306A\u3069\uFF09");
        return;
      }
      items.push({ id: x.id, normal: n.v, small: sm.v, large: lg.v });
    }
    setSavingGrp(g.name);
    const res = await saveWorkloadInput(items);
    setSavingGrp("");
    if (!(res == null ? void 0 : res.ok)) {
      showToast("\u26A0 \u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A" + (getLastApiError() || "\u901A\u4FE1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044"));
      return;
    }
    setDirty((p) => ({ ...p, [g.name]: false }));
    const d = /* @__PURE__ */ new Date();
    setSavedMsg((p) => ({ ...p, [g.name]: `\u2713 ${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} \u4FDD\u5B58\uFF08${res.saved}\u4EF6\uFF09` }));
    showToast(`\u2713 ${g.name} ${res.saved}\u4EF6\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F`);
  };
  const saveMemo = async () => {
    if (memo.length > 2e3) {
      showToast("\u88DC\u8DB3\u306F2000\u6587\u5B57\u307E\u3067\u306B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    setSavingGrp("\u88DC\u8DB3");
    const res = await saveWorkloadInput([{ id: "wn-preset-memo", normal: null, small: null, large: null, memo }]);
    setSavingGrp("");
    if (!(res == null ? void 0 : res.ok)) {
      showToast("\u26A0 \u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A" + (getLastApiError() || "\u901A\u4FE1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044"));
      return;
    }
    setDirty((p) => ({ ...p, "\u88DC\u8DB3": false }));
    const d = /* @__PURE__ */ new Date();
    setSavedMsg((p) => ({ ...p, "\u88DC\u8DB3": `\u2713 ${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} \u4FDD\u5B58` }));
    showToast("\u2713 \u88DC\u8DB3\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F");
  };
  const anyDirty = Object.values(dirty).some(Boolean);
  const IN = (bad) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 4px",
    fontSize: 16,
    textAlign: "center",
    border: `1px solid ${bad ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 6,
    background: bad ? "#fef2f2" : "#fffbeb"
  });
  return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 12px 80px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.8, color: "#374151" } }, "\u30B5\u30A4\u30BA\u306E", /* @__PURE__ */ React.createElement("b", null, "\u307E\u3093\u4E2D\u304F\u3089\u3044"), "\uFF08\u4F8B\uFF1A20\u301C80A\u306A\u308950A\uFF09\u3067\u3001", /* @__PURE__ */ React.createElement("b", null, "1\u4EBA\u30671\u65E5\u3084\u3063\u305F\u3089\u3001\u3069\u308C\u304F\u3089\u3044\u9032\u3080\u304B"), "\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\u3002", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "\u5C0F\u3055\u3044\u30B5\u30A4\u30BA\u30FB\u5927\u304D\u3044\u30B5\u30A4\u30BA"), "\u306F\u3001\u307E\u3093\u4E2D\u3088\u308A", /* @__PURE__ */ React.createElement("b", null, "\u4F55%\u9032\u3080\u304B"), "\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044\uFF08\u591A\u304F\u9032\u3080\u306A\u3089\uFF0B\u3001\u9032\u307E\u306A\u3044\u306A\u3089\u2212\u3002\u4F8B\uFF1A+20\u3001\u221230\uFF09\u3002", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "\u533A\u5206\u3054\u3068\u306B\u4E00\u756A\u4E0B\u306E\u300C\u4FDD\u5B58\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), "\u62BC\u3055\u306A\u3044\u3068\u6B8B\u308A\u307E\u305B\u3093\u3002"), anyDirty && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", color: "#92400e", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700 } }, "\u672A\u4FDD\u5B58\u306E\u533A\u5206\u304C\u3042\u308A\u307E\u3059\uFF1A", [...groups.map((g) => g.name), "\u88DC\u8DB3"].filter((n) => dirty[n]).join("\u3001")), groups.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.name, style: { background: "#fff", borderRadius: 10, padding: "12px 10px", marginBottom: 14, border: dirty[g.name] ? "2px solid #f59e0b" : "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#111827" } }, g.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: dirty[g.name] ? "#d97706" : "#059669" } }, dirty[g.name] ? "\u672A\u4FDD\u5B58" : savedMsg[g.name] || "")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 58px 58px 58px", gap: 6, fontSize: 10, color: "#6b7280", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", null), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, "\u307E\u3093\u4E2D\u306E", /* @__PURE__ */ React.createElement("br", null), "\u6570\u91CF"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, "\u5C0F\u3055\u3044", /* @__PURE__ */ React.createElement("br", null), "\u30B5\u30A4\u30BA%"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, "\u5927\u304D\u3044", /* @__PURE__ */ React.createElement("br", null), "\u30B5\u30A4\u30BA%")), g.items.map((x) => /* @__PURE__ */ React.createElement("div", { key: x.id, style: { display: "grid", gridTemplateColumns: "1fr 58px 58px 58px", gap: 6, alignItems: "center", padding: "6px 0", borderTop: "1px solid #f3f4f6" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", lineHeight: 1.4 } }, x.category, x.sizeSpec ? /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, "\u3000", x.sizeSpec) : null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280" } }, "\u5358\u4F4D\uFF1A", x.unit, NINKU_MID[x.sizeSpec] ? `\u3000\u307E\u3093\u4E2D\uFF1A${NINKU_MID[x.sizeSpec]}` : "", x.notes ? `\u3000${x.notes}` : "")), ["normal", "small", "large"].map(
    (k) => {
      var _a, _b;
      return k !== "normal" && !ninkuHasRange(x.sizeSpec) ? /* @__PURE__ */ React.createElement("div", { key: k, style: { textAlign: "center", color: "#d1d5db", fontSize: 12 } }, "\u2014") : /* @__PURE__ */ React.createElement(
        "input",
        {
          key: k,
          type: "text",
          inputMode: k === "normal" ? "decimal" : "text",
          value: (_b = (_a = vals[x.id]) == null ? void 0 : _a[k]) != null ? _b : "",
          placeholder: k === "normal" ? "" : "\xB1%",
          onChange: (e) => setVal(x, k, e.target.value),
          style: IN(badCell(x.id, k))
        }
      );
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      disabled: !!savingGrp,
      onClick: () => saveGroup(g),
      style: {
        marginTop: 10,
        width: "100%",
        padding: "12px",
        borderRadius: 8,
        border: "none",
        fontSize: 14,
        fontWeight: 700,
        background: savingGrp === g.name ? "#9ca3af" : dirty[g.name] ? "#f59e0b" : "#10b981",
        color: "#fff"
      }
    },
    savingGrp === g.name ? "\u4FDD\u5B58\u4E2D..." : `\u300C${g.name}\u300D\u3092\u4FDD\u5B58`
  ))), memoRow && /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", borderRadius: 10, padding: "12px 10px", marginBottom: 14, border: dirty["\u88DC\u8DB3"] ? "2px solid #f59e0b" : "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#111827" } }, "\u88DC\u8DB3"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: dirty["\u88DC\u8DB3"] ? "#d97706" : "#059669" } }, dirty["\u88DC\u8DB3"] ? "\u672A\u4FDD\u5B58" : savedMsg["\u88DC\u8DB3"] || "")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 6 } }, "\u8868\u306B\u306A\u3044\u5DE5\u4E8B\u3084\u3001\u6C17\u3065\u3044\u305F\u3053\u3068\u3092\u81EA\u7531\u306B\u66F8\u3044\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: memo,
      onChange: (e) => {
        setMemo(e.target.value);
        setDirty((p) => ({ ...p, "\u88DC\u8DB3": true }));
      },
      rows: 6,
      style: { width: "100%", boxSizing: "border-box", padding: "10px", fontSize: 16, lineHeight: 1.6, border: "1px solid #d1d5db", borderRadius: 6, background: "#fffbeb", fontFamily: "inherit" }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      disabled: !!savingGrp,
      onClick: saveMemo,
      style: {
        marginTop: 10,
        width: "100%",
        padding: "12px",
        borderRadius: 8,
        border: "none",
        fontSize: 14,
        fontWeight: 700,
        background: savingGrp === "\u88DC\u8DB3" ? "#9ca3af" : dirty["\u88DC\u8DB3"] ? "#f59e0b" : "#10b981",
        color: "#fff"
      }
    },
    savingGrp === "\u88DC\u8DB3" ? "\u4FDD\u5B58\u4E2D..." : "\u300C\u88DC\u8DB3\u300D\u3092\u4FDD\u5B58"
  )));
}
function fmtTrainingDeadline(iso) {
  if (!iso) return "\u671F\u9650\u306A\u3057";
  const d = new Date(iso);
  const w = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"][d.getDay()];
  return `${d.getMonth() + 1}\u6708${d.getDate()}\u65E5\uFF08${w}\uFF09${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function remainUntil(iso) {
  if (!iso) return "\u7DE0\u5207\u306A\u3057";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "\u7DE0\u5207\u3092\u904E\u304E\u3066\u3044\u307E\u3059";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
  return d > 0 ? `\u7DE0\u5207\u307E\u3067\u3042\u3068${d}\u65E5${h}\u6642\u9593` : `\u7DE0\u5207\u307E\u3067\u3042\u3068${h}\u6642\u9593`;
}
const KENMIN_COURSES = [
  // 埼玉県民共済 総合保障型。割戻率は年度ごとに変わるため定数として1か所に置く
  { monthly: 2500, label: "\u67082,500\u5186\u30B3\u30FC\u30B9" },
  { monthly: 5e3, label: "\u67085,000\u5186\u30B3\u30FC\u30B9" }
];
const KENMIN_RATE = 0.4484;
const NISA_RATE = 0.05;
const NISA_TAX = 0.20315;
const NISA_END_AGE = 65;
function TrainingOutro({ data, onExit }) {
  const [amt, setAmt] = useState(1e4);
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
  const yen = (n) => Math.round(n).toLocaleString("ja-JP") + "\u5186";
  const card = { background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 12, padding: 16 };
  const tag = {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 5,
    padding: "3px 9px",
    marginBottom: 10
  };
  const row = { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 };
  const note = { fontSize: 12, color: "#6b7280", lineHeight: 1.9, marginTop: 10 };
  const th = { padding: "10px 12px", borderBottom: "1px solid #e5e7eb" };
  const td = { ...th, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#e5e7eb", zIndex: 9e3, display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#f0fdf4", borderColor: "#22c55e44", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 34, lineHeight: 1, marginBottom: 10 } }, "\u{1F389}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 17, fontWeight: 700, color: "#15803d", marginBottom: 8 } }, "\u5168", data.questions.length, "\u554F\u3001\u5B8C\u4E86\u3057\u307E\u3057\u305F"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#6b7280", lineHeight: 1.9 } }, "\u304A\u75B2\u308C\u3055\u307E\u3067\u3057\u305F\u3002", /* @__PURE__ */ React.createElement("br", null), "\u5168\u90E8\u8AAD\u307E\u305B\u3066\u3082\u3089\u3044\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#eff6ff", borderColor: "#2563eb", borderWidth: 2 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#1e3a8a", lineHeight: 1.7, marginBottom: 8 } }, "\u307E\u3060\u7D42\u308F\u308A\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002", /* @__PURE__ */ React.createElement("br", null), "\u3053\u306E\u4E0B\u306E\u300C\u30DF\u30CB\u6559\u6750\u300D\u3092\u8AAD\u3093\u3067\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#1e3a8a" } }, "\u2460 \u4F1A\u793E\u306E\u5229\u76CA\u3068\u7A0E\u91D1", /* @__PURE__ */ React.createElement("br", null), "\u2461 NISA\u30FB\u7A4D\u7ACB\u30FB\u8907\u5229", /* @__PURE__ */ React.createElement("br", null), "\u2462 \u4E07\u304C\u4E00\u3078\u306E\u5099\u3048\u30FB\u57FC\u7389\u770C\u6C11\u5171\u6E08"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#1e3a8a", lineHeight: 1.9, marginTop: 8 } }, "\u81EA\u5206\u306E\u304A\u91D1\u306E\u8A71\u3067\u3059\u30023\u3064\u3068\u3082\u6700\u5F8C\u307E\u3067\u8AAD\u3093\u3067\u304B\u3089\u3001\u4E00\u756A\u4E0B\u306E\u300C\u30A2\u30D7\u30EA\u306B\u623B\u308B\u300D\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", fontSize: 22, color: "#2563eb", marginTop: 6 } }, "\u2193")), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: tag }, "\u30DF\u30CB\u6559\u6750 \u2460 \u4F1A\u793E\u306E\u5229\u76CA\u3068\u7A0E\u91D1"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap" } }, `\u300C\u4F1A\u793E\u306B\u6B8B\u3063\u305F\u5229\u76CA\uFF1D\u5168\u90E8\u81EA\u7531\u306B\u4F7F\u3048\u308B\u304A\u91D1\u300D
\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002

\u4F1A\u793E\u306B\u5229\u76CA\u304C\u51FA\u308C\u3070\u3001
\u6CD5\u4EBA\u7A0E\u3001\u6CD5\u4EBA\u4F4F\u6C11\u7A0E\u3001\u6CD5\u4EBA\u4E8B\u696D\u7A0E\u306A\u3069\u306E\u7A0E\u91D1\u3082\u304B\u304B\u308A\u307E\u3059\u3002

\u4F1A\u793E\u306B100\u4E07\u5186\u306E\u5229\u76CA\u304C\u51FA\u3066\u3082\u3001\u305D\u306E100\u4E07\u5186\u304C\u305D\u306E\u307E\u307E\u4F1A\u793E\u306E\u8CAF\u91D1\u306B\u306A\u308B\u308F\u3051\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002

\u7A0E\u91D1\u3092\u652F\u6255\u3063\u305F\u3042\u3068\u306B\u6B8B\u3063\u305F\u304A\u91D1\u3092\u3001
\u30FB\u5C06\u6765\u3078\u306E\u5099\u3048
\u30FB\u8A2D\u5099
\u30FB\u8ECA\u4E21
\u30FB\u4EBA\u6750
\u30FB\u8CDE\u4E0E
\u30FB\u6607\u7D66
\u30FB\u65B0\u3057\u3044\u4ED5\u4E8B\u3078\u306E\u6295\u8CC7
\u306A\u3069\u306B\u4F7F\u3063\u3066\u3044\u304D\u307E\u3059\u3002`), /* @__PURE__ */ React.createElement("div", { style: note }, "\u203B \u7A0E\u7387\u306F\u5229\u76CA\u984D\u3084\u4F1A\u793E\u306E\u6761\u4EF6\u306A\u3069\u306B\u3088\u3063\u3066\u5909\u308F\u308A\u307E\u3059\u3002")), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: tag }, "\u30DF\u30CB\u6559\u6750 \u2461 NISA\u30FB\u7A4D\u7ACB\u30FB\u8907\u5229"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 14 } }, `\u904B\u7528\u3057\u3066\u5897\u3048\u305F\u304A\u91D1\u306B\u3082\u3001
\u3055\u3089\u306B\u5229\u76CA\u304C\u3064\u3044\u3066\u3044\u304F\u3002
\u305D\u306E\u305F\u3081\u3001\u9577\u304F\u7D9A\u3051\u308B\u307B\u3069
\u300C\u6642\u9593\u300D\u306E\u52B9\u679C\u304C\u5927\u304D\u304F\u306A\u308A\u307E\u3059\u3002`), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 6 } }, "65\u6B73\u307E\u3067\u7A4D\u307F\u7ACB\u3066\u305F\u4F8B\uFF08\u5E745\uFF05\u3067\u904B\u7528\u3067\u304D\u305F\u3068\u4EEE\u5B9A\uFF09"), [30, 40, 45].map((startAge) => {
    const yrs = NISA_END_AGE - startAge, mo = yrs * 12, r = NISA_RATE / 12;
    const man = (n) => Math.round(n / 1e4).toLocaleString("ja-JP") + "\u4E07\u5186";
    return /* @__PURE__ */ React.createElement("div", { key: startAge, style: { border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#ffffff", padding: "9px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #d1d5db" } }, startAge, "\u6B73\u304B\u308965\u6B73\u307E\u3067\uFF08", yrs, "\u5E74\u9593\uFF09"), /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("tbody", null, [1e4, 2e4, 3e4].map((m, i, a) => {
      const last = i === a.length - 1;
      return /* @__PURE__ */ React.createElement("tr", { key: m }, /* @__PURE__ */ React.createElement("td", { style: last ? { ...th, borderBottom: "none" } : th }, "\u6708", m / 1e4, "\u4E07\u5186"), /* @__PURE__ */ React.createElement("td", { style: { ...last ? { ...td, borderBottom: "none" } : td, color: "#6b7280" } }, "\u7A4D\u7ACB ", man(m * mo)), /* @__PURE__ */ React.createElement("td", { style: { ...last ? { ...td, borderBottom: "none" } : td, fontWeight: 700, color: "#2563eb" } }, "\u2192 \u7D04", man(m * ((Math.pow(1 + r, mo) - 1) / r))));
    }))));
  }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#374151", margin: "14px 0 10px" } }, "\u81EA\u5206\u306E\u5834\u5408\u3067\u52D5\u304B\u3057\u3066\u307F\u308B"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 6 } }, "\u6BCE\u6708\u306E\u7A4D\u7ACB\u984D"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: 5e3,
      max: 5e4,
      step: 1e3,
      value: amt,
      onChange: (e) => setAmt(Number(e.target.value)),
      style: { width: "100%", accentColor: "#2563eb" }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", null, "5,000\u5186"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2563eb", fontWeight: 700, fontSize: 15 } }, amt.toLocaleString("ja-JP"), "\u5186"), /* @__PURE__ */ React.createElement("span", null, "50,000\u5186")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 6 } }, "\u3044\u307E\u306E\u5E74\u9F62\uFF0865\u6B73\u307E\u3067\u7A4D\u307F\u7ACB\u3066\u305F\u5834\u5408\uFF09"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: 20,
      max: 60,
      step: 1,
      value: age,
      onChange: (e) => setAge(Number(e.target.value)),
      style: { width: "100%", accentColor: "#2563eb" }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("span", null, "20\u6B73"), /* @__PURE__ */ React.createElement("span", { style: { color: "#2563eb", fontWeight: 700, fontSize: 15 } }, age, "\u6B73"), /* @__PURE__ */ React.createElement("span", null, "60\u6B73")), /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1e3a8a" } }, "\u7A4D\u7ACB\u671F\u9593"), /* @__PURE__ */ React.createElement("b", null, nisa.years, "\u5E74")), /* @__PURE__ */ React.createElement("div", { style: row }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1e3a8a" } }, "\u81EA\u5206\u304C\u51FA\u3057\u305F\u304A\u91D1"), /* @__PURE__ */ React.createElement("b", null, yen(nisa.paid))), /* @__PURE__ */ React.createElement("div", { style: { ...row, borderBottom: "1px solid #bfdbfe" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1e3a8a" } }, "\u5897\u3048\u305F\u5206"), /* @__PURE__ */ React.createElement("b", { style: { color: "#16a34a" } }, "+", yen(nisa.gain))), /* @__PURE__ */ React.createElement("div", { style: { ...row, padding: "12px 0 4px", fontSize: 15 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#1e3a8a", fontWeight: 700 } }, "65\u6B73\u6642\u70B9"), /* @__PURE__ */ React.createElement("b", { style: { fontSize: 19, color: "#2563eb" } }, yen(nisa.total)))), /* @__PURE__ */ React.createElement("div", { style: { ...note, whiteSpace: "pre-wrap" } }, `\u30FB\u5E745\uFF05\u3067\u904B\u7528\u3067\u304D\u308B\u3053\u3068\u3092\u4FDD\u8A3C\u3059\u308B\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093
\u30FB\u6295\u8CC7\u306B\u306F\u4FA1\u683C\u5909\u52D5\u304C\u3042\u308A\u307E\u3059
\u30FB\u5143\u672C\u5272\u308C\u3059\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059
\u30FBNISA\u305D\u306E\u3082\u306E\u304C\u5229\u76CA\u3092\u4FDD\u8A3C\u3059\u308B\u5236\u5EA6\u3067\u306F\u3042\u308A\u307E\u305B\u3093`), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap", marginTop: 12 } }, `\u3053\u306E\u6559\u6750\u306E\u76EE\u7684\u306F\u3001
\u300C\u6295\u8CC7\u3092\u3057\u306A\u3055\u3044\u300D
\u3067\u306F\u306A\u304F\u3001
\u300C\u82E5\u3044\u3046\u3061\u304B\u3089\u5C11\u984D\u3067\u3082\u304A\u91D1\u306B\u3064\u3044\u3066\u8003\u3048\u308B\u3053\u3068\u300D
\u300C\u6642\u9593\u3068\u8907\u5229\u306E\u529B\u3092\u77E5\u308B\u3053\u3068\u300D
\u3067\u3059\u3002`)), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: tag }, "\u30DF\u30CB\u6559\u6750 \u2462 \u4E07\u304C\u4E00\u3078\u306E\u5099\u3048\u30FB\u57FC\u7389\u770C\u6C11\u5171\u6E08"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap" } }, `\u304A\u91D1\u306F\u5897\u3084\u3059\u3053\u3068\u3060\u3051\u3067\u306F\u306A\u304F\u3001
\u75C5\u6C17\u3084\u30B1\u30AC\u306A\u3069\u306B\u5099\u3048\u308B\u3053\u3068\u3082\u5927\u5207\u3067\u3059\u3002
\u305D\u306E\u9078\u629E\u80A2\u306E\u3072\u3068\u3064\u304C\u3001\u57FC\u7389\u770C\u6C11\u5171\u6E08\u3067\u3059\u3002

\u770C\u6C11\u5171\u6E08\u306B\u306F\u300C\u5272\u623B\u91D1\u300D\u304C\u3042\u308A\u307E\u3059\u3002
\u52A0\u5165\u8005\u304C\u652F\u6255\u3063\u305F\u639B\u91D1\u304B\u3089\u3001
\u5171\u6E08\u91D1\u3084\u4E8B\u696D\u904B\u55B6\u306B\u5FC5\u8981\u306A\u8CBB\u7528\u306A\u3069\u3092\u652F\u6255\u3044\u3001
\u6C7A\u7B97\u3067\u5270\u4F59\u304C\u751F\u3058\u305F\u5834\u5408\u306B\u5272\u623B\u91D1\u304C\u3042\u308A\u307E\u3059\u3002`), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, margin: "12px 0" } }, KENMIN_COURSES.map((k, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: k.monthly,
      onClick: () => setCourse(i),
      style: {
        flex: 1,
        minHeight: 44,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        background: course === i ? "#2563eb" : "#ffffff",
        color: course === i ? "#ffffff" : "#111827",
        border: `1px solid ${course === i ? "#2563eb" : "#9ca3af"}`
      }
    },
    k.label
  ))), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } }, /* @__PURE__ */ React.createElement("tbody", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: th }, "\u5E74\u9593\u3067\u6255\u3046\u984D"), /* @__PURE__ */ React.createElement("td", { style: td }, yen(yearly))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: th }, "\u5272\u623B\u7387"), /* @__PURE__ */ React.createElement("td", { style: td }, (KENMIN_RATE * 100).toFixed(2), "%")), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: th }, "\u623B\u3063\u3066\u304F\u308B\u984D"), /* @__PURE__ */ React.createElement("td", { style: { ...td, color: "#16a34a", fontWeight: 700 } }, yen(back))), /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { style: { ...th, borderBottom: "none", fontWeight: 700 } }, "\u5B9F\u8CEA\u306E\u8CA0\u62C5"), /* @__PURE__ */ React.createElement("td", { style: { ...td, borderBottom: "none", fontWeight: 700 } }, yen(net), /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", fontWeight: 400 } }, "\uFF08\u6708", Math.round(net / 12).toLocaleString("ja-JP"), "\u5186\uFF09")))))), /* @__PURE__ */ React.createElement("div", { style: note }, "\u203B \u5272\u623B\u7387\u306F\u4EE4\u548C7\u5E747\u6708\u6C7A\u7B97\u306E\u5B9F\u7E3E\u3067\u3059\u3002\u5272\u623B\u7387\u306F\u6BCE\u5E74\u5909\u308F\u308A\u307E\u3059\u3002\u904E\u53BB\u306E\u5B9F\u7E3E\u3067\u3042\u308A\u3001\u4ECA\u5F8C\u3082\u540C\u3058\u5272\u5408\u304C\u623B\u308B\u3053\u3068\u3092\u4FDD\u8A3C\u3059\u308B\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002", /* @__PURE__ */ React.createElement("br", null), "\u203B \u6700\u65B0\u306E\u639B\u91D1\u30FB\u4FDD\u969C\u5185\u5BB9\u306F\u57FC\u7389\u770C\u6C11\u5171\u6E08\u306E\u516C\u5F0F\u30B5\u30A4\u30C8\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2, color: "#374151", whiteSpace: "pre-wrap", marginTop: 12 } }, `\u770C\u6C11\u5171\u6E08\u3092\u5FC5\u305A\u52E7\u3081\u308B\u3053\u3068\u304C\u76EE\u7684\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002
\u30FB\u75C5\u6C17
\u30FB\u30B1\u30AC
\u30FB\u6B7B\u4EA1
\u30FB\u5165\u9662
\u306A\u3069\u3001\u81EA\u5206\u3084\u5BB6\u65CF\u306B\u4F55\u304B\u3042\u3063\u305F\u6642\u306B\u3001
\u3069\u3093\u306A\u5099\u3048\u304C\u3042\u308B\u306E\u304B\u3092\u4E00\u5EA6\u8003\u3048\u3066\u307B\u3057\u3044\u3068\u3044\u3046\u8DA3\u65E8\u3067\u3059\u3002

\u9AD8\u3044\u4FDD\u967A\u306B\u5165\u308C\u3070\u5B89\u5FC3\u3068\u3044\u3046\u3053\u3068\u3067\u3082\u3042\u308A\u307E\u305B\u3093\u3002
\u81EA\u5206\u306E\u8CAF\u91D1\u3001\u516C\u7684\u4FDD\u969C\u3001\u5BB6\u65CF\u69CB\u6210\u306A\u3069\u3082\u8003\u3048\u306A\u304C\u3089\u3001
\u81EA\u5206\u306B\u5FC5\u8981\u306A\u4FDD\u969C\u3092\u8003\u3048\u308B\u304D\u3063\u304B\u3051\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`)), /* @__PURE__ */ React.createElement("div", { style: card }, /* @__PURE__ */ React.createElement("div", { style: tag }, "\u554F\u984C\u3068\u30DD\u30A4\u30F3\u30C8\u3092\u898B\u8FD4\u3059"), data.questions.map((q) => {
    const r = data.responses.find((x) => x.questionId === q.id);
    return /* @__PURE__ */ React.createElement("details", { key: q.id, style: { borderTop: "1px solid #e5e7eb", padding: "10px 0" } }, /* @__PURE__ */ React.createElement("summary", { style: { fontSize: 13, fontWeight: 700, lineHeight: 1.7, cursor: "pointer", color: "#111827" } }, q.code, "\u3000", q.text.split("\n")[0]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, lineHeight: 1.9, color: "#374151", whiteSpace: "pre-wrap", margin: "10px 0 8px" } }, q.text), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 5 } }, "\u3042\u306A\u305F\u306E\u56DE\u7B54"), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, lineHeight: 1.85, color: "#374151", whiteSpace: "pre-wrap", marginBottom: 10 } }, r && r.answer || "\uFF08\u672A\u8A18\u5165\uFF09"), q.explanation ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#2563eb", fontWeight: 700, marginBottom: 5 } }, "\u30DD\u30A4\u30F3\u30C8"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, lineHeight: 1.95, color: "#374151", whiteSpace: "pre-wrap" } }, q.explanation)) : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, lineHeight: 1.9, color: "#1e3a8a", whiteSpace: "pre-wrap" } }, q.noAnswerMsg));
  })), /* @__PURE__ */ React.createElement("div", { style: { ...card, background: "#ffffff" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, lineHeight: 2.1, color: "#374151", whiteSpace: "pre-wrap" } }, data.training.outro), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, fontSize: 13, textAlign: "right" } }, "\u52DD\u9593")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onExit,
      style: {
        width: "100%",
        minHeight: 52,
        border: "none",
        borderRadius: 8,
        padding: 14,
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        background: "#2563eb",
        color: "#ffffff"
      }
    },
    "\u30A2\u30D7\u30EA\u306B\u623B\u308B"
  ))));
}
function App() {
  var _a;
  const [projects, setProjects] = useState([]);
  const [clockLogs, setClockLogs] = useState([]);
  const [leaveData, setLeaveData] = useState({});
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => {
    const s = loadSavedSession();
    return (s == null ? void 0 : s.user) || null;
  });
  const [tab, setTab] = useState("\u6253\u523B");
  const [filterSt, setFilterSt] = useState("\u5168\u3066");
  const compactMode = true;
  const [showOldMemos, setShowOldMemos] = useState({});
  const [addWorksOpen, setAddWorksOpen] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);
  const [adminPf, setAdminPf] = useState({ name: "", client: "", status: "\u6E96\u5099\u4E2D", lead: "", startDate: "", endDate: "", estimate: "", contractAmount: "", targetNinku: "", contractType: "", workCategory: "", address: "", customerContact: "", internalOwner: "", invoiceSettled: false });
  const [savingEditProject, setSavingEditProject] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [handoverMemos, setHandoverMemos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loginPopups, setLoginPopups] = useState([]);
  const [pushStatus, setPushStatus] = useState("unknown");
  const [pushLoading, setPushLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);
  const [pendingHandover, setPendingHandover] = useState(null);
  const [handoverText, setHandoverText] = useState("");
  const [handoverPhoto, setHandoverPhoto] = useState(null);
  const [clockOutPhotoFile, setClockOutPhotoFile] = useState(null);
  const [clockOutPhotoCtx, setClockOutPhotoCtx] = useState(null);
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
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactForm, setContactForm2] = useState({ name: "", company: "", phone: "", email: "", address: "", notes: "", photoUrl: "", category: "\u9867\u5BA2" });
  const [contactCategoryFilter, setContactCategoryFilter] = useState("all");
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [surveyDismissed, setSurveyDismissed] = useState(false);
  const [training, setTraining] = useState(null);
  const [trainingDismissed, setTrainingDismissed] = useState(false);
  const [trainingReview, setTrainingReview] = useState(false);
  const reloadTraining = useCallback(async () => {
    const t = await loadTraining();
    setTraining(t);
    return t;
  }, []);
  const [surveyEditing, setSurveyEditing] = useState({});
  const [clockoutFixEdits, setClockoutFixEdits] = useState({});
  const [editContactId, setEditContactId] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [surveyResponses, setSurveyResponses] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [openInfoItems, setOpenInfoItems] = useState({});
  const [subForm, setSubForm] = useState({ companyName: "", headcount: "1", date: todayStr(), memo: "" });
  const [workForm, setWorkForm] = useState({ description: "", floor: "", location: "" });
  const [workPhoto, setWorkPhoto] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [ef, setEf] = useState({ date: todayStr(), worker: "", qty: "", memo: "" });
  const [pf, setPf] = useState({ name: "", client: "", status: "\u6E96\u5099\u4E2D", lead: "", startDate: todayStr(), endDate: "", estimate: "", targetNinku: "", contractType: "", workCategory: "", address: "" });
  const [lf, setLf] = useState({ type: "paid", date: todayStr(), days: "1", memo: "", holidayPref: "", holidayWorkId: "" });
  const [qf, setQf] = useState({ name: "", lead: "" });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [clockMods, setClockMods] = useState([]);
  const [showClockFix, setShowClockFix] = useState(null);
  const [clockFixForm, setClockFixForm] = useState({ projectId: "", clockIn: "", clockOut: "", reason: "" });
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", contact: "", phone: "" });
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTroubles, setVehicleTroubles] = useState([]);
  const [vehicleOilChanges, setVehicleOilChanges] = useState([]);
  const [openVehicleIds, setOpenVehicleIds] = useState({});
  const [troubleReportForm, setTroubleReportForm] = useState({ vehicleId: "", date: todayStr(), description: "" });
  const [oilReportForm, setOilReportForm] = useState({ vehicleId: "", date: todayStr(), mileage: "", note: "", elementChanged: false });
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [progressReports, setProgressReports] = useState([]);
  const [ninkuSettings, setNinkuSettings] = useState(null);
  const [progressRequestAllAt, setProgressRequestAllAt] = useState(null);
  const [reportingItem, setReportingItem] = useState(null);
  const [reportPercent, setReportPercent] = useState(50);
  const [reportComment, setReportComment] = useState("");
  const [confirmReport, setConfirmReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [forcedProgress, setForcedProgress] = useState({});
  const [forcedConfirmId, setForcedConfirmId] = useState(null);
  const [pendingHolidayApply, setPendingHolidayApply] = useState(null);
  const [holidayPrefChoice, setHolidayPrefChoice] = useState("");
  const [savingHolidayApply, setSavingHolidayApply] = useState(false);
  const [pendingSubWorkers, setPendingSubWorkers] = useState([]);
  const [subWorkerEdits, setSubWorkerEdits] = useState({});
  const [pendingAfterSubWorkers, setPendingAfterSubWorkers] = useState(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const withBusy = useCallback(async (fn) => {
    if (busyRef.current) {
      showToast("\u23F3 \u51E6\u7406\u4E2D\u3067\u3059\u2026\u5C11\u3057\u304A\u5F85\u3061\u304F\u3060\u3055\u3044");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    try {
      return await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);
  const [personalMemo, setPersonalMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoLoaded, setMemoLoaded] = useState(false);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };
  useEffect(() => {
    sbSetErrorHandler((msg) => showToast("\u26A0 " + msg));
  }, []);
  useEffect(() => {
    sbSetSessionExpiredHandler(() => {
      setUser(null);
      setLoadErr("");
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!user || memoLoaded) return;
    (async () => {
      const m = await getPersonalMemo();
      setPersonalMemo(m);
      setMemoLoaded(true);
    })();
  }, [user, memoLoaded]);
  const [dataLoaded, setDataLoaded] = useState(false);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setDataLoaded(false);
      return;
    }
    if (dataLoaded) return;
    setLoading(true);
    (async () => {
      try {
        const [st, p, c, ld, hm, ann, cust, subs, addWorks, ctcts, ci, sv, sr, specs, lb, cm, ei, vh, vt, vo, prRep] = await Promise.all([
          loadStaff(),
          loadProjects(),
          loadClockLogs(clockLogsInitialSinceIso()),
          loadLeaves(),
          loadHandoverMemos(),
          loadAnnouncements(),
          loadCustomers(),
          loadSubcontractors(),
          loadAdditionalWorks(),
          loadContacts(),
          loadCompanyInfo(),
          loadSurveys(),
          loadSurveyResponses(),
          loadProjectSpecs(),
          loadLeaveBalances(),
          loadClockModifications(),
          loadExpenseItems(),
          loadVehicles(),
          loadVehicleTroubles(),
          loadVehicleOilChanges(),
          loadProgressReports()
        ]);
        if (!st) {
          if (!sbHasSession()) {
            setLoading(false);
            return;
          }
          setLoadErr("Supabase\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002");
          setLoading(false);
          return;
        }
        setStaff(st);
        setProjects(p || []);
        setClockLogs(c || []);
        setLeaveData(ld || {});
        setHandoverMemos(hm || []);
        setAnnouncements(ann || []);
        setCustomers(cust || []);
        setSubcontractors(subs || []);
        setAdditionalWorks(addWorks || []);
        setContacts(ctcts || []);
        setCompanyInfo(ci || []);
        setSurveys(sv || []);
        setSurveyResponses(sr || []);
        setProjectSpecs(specs || []);
        reloadTraining();
        setLeaveBalances(lb || []);
        setClockMods(cm || []);
        setExpenseItems(ei || []);
        setVehicles(vh || []);
        setVehicleTroubles(vt || []);
        setVehicleOilChanges(vo || []);
        setProgressReports(prRep || []);
        loadAppSettings().then((s) => {
          setProgressRequestAllAt((s == null ? void 0 : s.progress_request_all_at) || null);
          setNinkuSettings(s || null);
        }).catch(() => {
        });
        setDataLoaded(true);
      } catch (e) {
        setLoadErr("\u30C7\u30FC\u30BF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: " + e.message);
      }
      setLoading(false);
    })();
  }, [user]);
  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      window.location.href = "/admin";
      return;
    }
    setEf((f) => ({ ...f, worker: user.name }));
    const popups = [];
    const unreadHandovers = handoverMemos.filter((m) => m.author !== user.name && !m.readBy.includes(user.id));
    if (unreadHandovers.length > 0) popups.push({ type: "handover", count: unreadHandovers.length, memos: unreadHandovers });
    if (!user.isExecutive) {
      const unreadAnn = announcements.filter((a) => !a.readBy.includes(user.id));
      if (unreadAnn.length > 0) popups.push({ type: "announcement", count: unreadAnn.length, items: unreadAnn });
      const furikaeAlerts = getFurikaeAlerts(user.id);
      if (furikaeAlerts.length > 0) popups.push({ type: "furikae_alert", items: furikaeAlerts });
      const vehicleAlerts = getVehicleAlerts(user.id, user.role, vehicles, vehicleOilChanges, staff);
      if (vehicleAlerts.length > 0) popups.push({ type: "vehicle_alert", items: vehicleAlerts });
    }
    if (popups.length > 0) setLoginPopups(popups);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const todayStart = /* @__PURE__ */ new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [c, cm] = await Promise.all([
          loadClockLogs(todayStart.toISOString()),
          loadClockModifications()
        ]);
        if (c) setClockLogs((prev) => {
          const byId = new Map(prev.map((l) => [l.id, l]));
          for (const l of c) byId.set(l.id, l);
          return Array.from(byId.values());
        });
        if (cm) setClockMods(cm);
      } catch (e) {
      }
    }, 6e4);
    return () => clearInterval(interval);
  }, [user]);
  const selected = projects.find((p) => p.id === selectedId);
  const DONE_VISIBLE_MS = 7 * 864e5;
  const filtered = projects.filter((p) => p.status !== "\u5B8C\u4E86" || p.completedAt && Date.now() - new Date(p.completedAt).getTime() < DONE_VISIBLE_MS).filter((p) => filterSt === "\u5168\u3066" || p.status === filterSt);
  const handleTabChange = (newTab) => {
    setTab(newTab);
  };
  const handleClock = useCallback(async (type, coords, openLogId, locationName = "", note = "", earlyLeaveCategory = "", earlyLeaveReason = "", hourlyUsed = 0, outsource = null, commuteMethod = "", isNightShift = false, extra = null) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (type === "in") {
      const nowDate = /* @__PURE__ */ new Date();
      const earlyClockIn = !isNightShift && nowDate.getHours() < 8;
      let clockInIso = now;
      if (earlyClockIn) {
        const forced = new Date(nowDate);
        forced.setHours(8, 0, 0, 0);
        clockInIso = forced.toISOString();
      }
      const newLog = { id: uid(), userId: user.id, userName: user.name, projectId: selectedId, clockIn: clockInIso, clockOut: null, coordsIn: coords, coordsOut: null, remarks: clockRemarks, locationName, note, commuteMethod: commuteMethod || null, isNightShift: !!isNightShift };
      const ok = await insertClockLog(newLog);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return false;
      }
      setClockLogs((prev) => [...prev, newLog]);
      const validSubs = clockSubs.filter((s) => s.companyName.trim());
      for (const sub of validSubs) {
        const s = { id: uid(), projectId: selectedId, date: todayStr(), companyName: sub.companyName.trim(), headcount: Number(sub.headcount) || 1, memo: "", workers: "" };
        const subOk = await insertSubcontractor(s);
        if (subOk) setSubcontractors((prev) => [s, ...prev]);
      }
      setClockRemarks("");
      setClockSubs([{ companyName: "", headcount: "1" }]);
      const locText = locationName ? ` \u{1F4CD}${locationName}` : coords ? ` \u{1F4CD}${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` : note ? " \uFF08GPS\u7406\u7531\u5165\u529B\u6E08\u307F\uFF09" : "\uFF08GPS\u53D6\u5F97\u3067\u304D\u305A\uFF09";
      const subText = validSubs.length > 0 ? ` \u5916\u6CE8${validSubs.length}\u793E` : "";
      const earlyText = earlyClockIn ? " \u23F08:00\u30B9\u30BF\u30FC\u30C8\u3067\u8A18\u9332" : "";
      const nightText = isNightShift ? " \u{1F319}\u591C\u52E4" : "";
      showToast(`\u2713 \u51FA\u52E4\u3057\u307E\u3057\u305F${nightText}${earlyText}${locText}${subText}`);
      return true;
    } else {
      const openLog = clockLogs.find((l) => l.id === openLogId);
      const clockInTime = openLog == null ? void 0 : openLog.clockIn;
      const locName = locationName || (openLog == null ? void 0 : openLog.locationName) || "";
      const proj = projects.find((p) => p.id === ((openLog == null ? void 0 : openLog.projectId) || selectedId));
      const ref = (proj == null ? void 0 : proj.siteLat) != null && (proj == null ? void 0 : proj.siteLng) != null ? { lat: proj.siteLat, lng: proj.siteLng } : parseCoords(openLog == null ? void 0 : openLog.coordsIn);
      const outDistanceM = distanceMeters(ref, parseCoords(coords));
      const ok = await updateClockOut(openLogId, now, coords, locName, earlyLeaveCategory || void 0, earlyLeaveReason || void 0, hourlyUsed || void 0, outsource || void 0, outDistanceM, extra);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return false;
      }
      const reversedIn = !(openLog == null ? void 0 : openLog.isNightShift) && clockInTime && new Date(now) < new Date(clockInTime) ? (openLog == null ? void 0 : openLog.createdAt) && new Date(openLog.createdAt) <= new Date(now) ? openLog.createdAt : now : null;
      setClockLogs((prev) => prev.map((l) => {
        var _a2, _b;
        return l.id === openLogId ? {
          ...l,
          ...reversedIn ? { clockIn: reversedIn } : {},
          clockOut: now,
          coordsOut: coords,
          locationName: locName,
          outsourceType: (outsource == null ? void 0 : outsource.type) || null,
          outsourceCount: (_a2 = outsource == null ? void 0 : outsource.count) != null ? _a2 : null,
          outsourceAmount: (_b = outsource == null ? void 0 : outsource.amount) != null ? _b : null,
          early_leave_category: earlyLeaveCategory || l.early_leave_category || "",
          early_leave_reason: earlyLeaveReason || l.early_leave_reason || "",
          earlyLeavePay: (extra == null ? void 0 : extra.earlyLeavePay) || null,
          breakShortMin: Number(extra == null ? void 0 : extra.breakShortMin) || 0,
          breakShortReason: (extra == null ? void 0 : extra.breakShortReason) || ""
        } : l;
      }));
      if (openLog == null ? void 0 : openLog.isNightShift) {
        const wh = clockInTime ? calcNightWorkedHours(clockInTime, now) : 0;
        showToast(wh > 0 ? `\u2713 \u9000\u52E4 \u{1F319}\u5B9F\u50CD${wh.toFixed(1)}h` : "\u2713 \u9000\u52E4\u3057\u307E\u3057\u305F");
      } else {
        const ot = clockInTime ? calcOvertime(clockInTime, now) : 0;
        showToast(ot > 0 ? `\u2713 \u9000\u52E4 \u6B8B\u696D${ot.toFixed(1)}h` : "\u2713 \u9000\u52E4\u3057\u307E\u3057\u305F");
      }
      setClockOutPhotoFile(null);
      setClockOutPhotoCtx(null);
      runClockOutFollowups(now, clockInTime, openLog == null ? void 0 : openLog.isNightShift);
      return true;
    }
  }, [clockLogs, user, selectedId, projects, clockRemarks, clockSubs, subcontractors]);
  const runClockOutFollowups = (now, clockInTime, isNightShift = false) => {
    var _a2;
    const todaySubs = subcontractors.filter((s) => s.projectId === selectedId && s.date === todayStr() && !(s.workers || "").trim());
    const workDate = isNightShift ? dateStrJST(clockInTime) : todayStr();
    const htype = getHolidayType(workDate);
    const hConfig = getHolidayAutoApplyConfig(htype, isNightShift ? clockInTime : now);
    const afterInfo = { projectId: selectedId, projectName: ((_a2 = projects.find((p) => p.id === selectedId)) == null ? void 0 : _a2.name) || "", clockInTime, clockOutTime: now, htype, hConfig, workDate };
    if (todaySubs.length > 0) {
      setPendingSubWorkers(todaySubs);
      setSubWorkerEdits(Object.fromEntries(todaySubs.map((s) => [s.id, ""])));
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
  const submitClockOutPhoto = async () => {
    const ctx = clockOutPhotoCtx;
    if (!ctx) {
      setModal(null);
      return;
    }
    if (clockOutPhotoFile) {
      setPhotoUploading(true);
      const url = await uploadFieldPhoto(clockOutPhotoFile.base64, clockOutPhotoFile.name, clockOutPhotoFile.type) || "";
      if (!url) {
        setPhotoUploading(false);
        showToast("\u26A0 \u5199\u771F\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
        return;
      }
      const ok = await setClockOutPhoto(ctx.logId, url);
      setPhotoUploading(false);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return;
      }
      setClockLogs((prev) => prev.map((l) => l.id === ctx.logId ? { ...l, clockOutPhoto: url } : l));
      showToast("\u2713 \u9000\u52E4\u5199\u771F\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F");
    }
    setClockOutPhotoFile(null);
    setClockOutPhotoCtx(null);
    runClockOutFollowups(ctx.now, ctx.clockInTime);
  };
  const submitHolidayApply = async () => {
    if (!pendingHolidayApply || savingHolidayApply) return;
    const { date, holidayType, config } = pendingHolidayApply;
    if (config.needUserChoice && !holidayPrefChoice) {
      showToast("\u26A0 \u8CB7\u53D6 or \u632F\u4F11 \u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044");
      return;
    }
    setSavingHolidayApply(true);
    try {
      const entries = config.entries.map((e) => ({
        id: uid(),
        type: "holiday",
        date,
        days: e.days,
        memo: "",
        // needUserChoice=true の場合は holidayPrefChoice を使う
        holidayPref: e.pref || holidayPrefChoice,
        status: "\u627F\u8A8D",
        appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
        holidayWorkId: null,
        holidayType
      }));
      const saved = [];
      let failCount = 0;
      for (const entry of entries) {
        const ok = await insertLeave(user.id, entry);
        if (ok) saved.push(entry);
        else failCount++;
      }
      if (failCount > 0) {
        if (saved.length > 0) setLeaveData((prev) => ({ ...prev, [user.id]: [...prev[user.id] || [], ...saved] }));
        showToast(`\u26A0 ${failCount}\u4EF6\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3002\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u78BA\u8A8D\u5F8C\u3001\u672A\u4FDD\u5B58\u5206\u306E\u307F\u518D\u7533\u8ACB\u3057\u3066\u304F\u3060\u3055\u3044`);
        return;
      }
      setLeaveData((prev) => ({ ...prev, [user.id]: [...prev[user.id] || [], ...entries] }));
      showToast(`\u2713 ${HOLIDAY_TYPE_LABEL[holidayType] || "\u4F11\u65E5"}\u51FA\u52E4\u3092\u7533\u8ACB\u3057\u307E\u3057\u305F\uFF08${entries.length}\u4EF6\uFF09`);
      setPendingHolidayApply(null);
      setHolidayPrefChoice("");
      if (pendingHandover) setModal("handover");
      else setModal(null);
    } catch (e) {
      showToast("\u26A0 \u7533\u8ACB\u5931\u6557: " + e.message);
    } finally {
      setSavingHolidayApply(false);
    }
  };
  const submitHandover = async () => {
    if (!handoverText.trim() || !pendingHandover) {
      setModal(null);
      return;
    }
    let imageUrl = "";
    if (handoverPhoto) {
      setPhotoUploading(true);
      imageUrl = await uploadFieldPhoto(handoverPhoto.base64, handoverPhoto.name, handoverPhoto.type) || "";
      setPhotoUploading(false);
      if (!imageUrl) {
        showToast("\u26A0 \u5199\u771F\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
        return;
      }
    }
    const memo = { id: uid(), projectId: pendingHandover.projectId, author: user.name, text: handoverText.trim(), imageUrl, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
    const ok1 = await insertHandoverMemo(memo);
    if (!ok1) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setHandoverMemos((prev) => [memo, ...prev]);
    const ann = { id: uid(), author: user.name, role: user.role, text: `\u3010\u5F15\u7D99\u304E\uFF5C${pendingHandover.projectName}\u3011${handoverText.trim()}`, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
    const ok2 = await insertAnnouncement(ann);
    if (ok2) setAnnouncements((prev) => [ann, ...prev]);
    setModal(null);
    setHandoverText("");
    setHandoverPhoto(null);
    setPendingHandover(null);
    showToast(ok2 ? "\u2713 \u5F15\u7D99\u304E\u3092\u30A2\u30CA\u30A6\u30F3\u30B9\u3067\u9001\u4FE1\u3057\u307E\u3057\u305F" : "\u2713 \u5F15\u7D99\u304E\u4FDD\u5B58\u6E08\u307F\uFF08\u30A2\u30CA\u30A6\u30F3\u30B9\u9001\u4FE1\u306F\u5931\u6557\uFF09");
  };
  const submitAddHandover = () => withBusy(async () => {
    if (!addHmText.trim() || !selected) return;
    let imageUrl = "";
    if (addHmPhoto) {
      imageUrl = await uploadFieldPhoto(addHmPhoto.base64, addHmPhoto.name, addHmPhoto.type) || "";
      if (!imageUrl) {
        showToast("\u26A0 \u5199\u771F\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
        return;
      }
    }
    const memo = { id: uid(), projectId: selected.id, author: user.name, text: addHmText.trim(), imageUrl, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
    const ok1 = await insertHandoverMemo(memo);
    if (!ok1) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setHandoverMemos((prev) => [memo, ...prev]);
    const ann = { id: uid(), author: user.name, role: user.role, text: `\u3010\u5F15\u7D99\u304E\uFF5C${selected.name}\u3011${addHmText.trim()}`, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
    const ok2 = await insertAnnouncement(ann);
    if (ok2) setAnnouncements((prev) => [ann, ...prev]);
    setModal(null);
    setAddHmText("");
    setAddHmPhoto(null);
    showToast(ok2 ? "\u2713 \u5F15\u7D99\u304E\u30E1\u30E2\u3092\u8FFD\u52A0\u30FB\u5168\u54E1\u306B\u901A\u77E5\u3057\u307E\u3057\u305F" : "\u2713 \u5F15\u7D99\u304E\u30E1\u30E2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\uFF08\u901A\u77E5\u306F\u5931\u6557\uFF09");
  });
  const submitAnnouncement = () => withBusy(async () => {
    if (!annText.trim()) return;
    const ann = { id: uid(), author: user.name, role: user.role, text: annText.trim(), createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
    const ok = await insertAnnouncement(ann);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setAnnouncements((prev) => [ann, ...prev]);
    setAnnText("");
    showToast("\u2713 \u30A2\u30CA\u30A6\u30F3\u30B9\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F");
  });
  const markAllRead = async (popupType) => {
    if (popupType === "handover") {
      const unread = handoverMemos.filter((m) => m.author !== user.name && !m.readBy.includes(user.id));
      for (const m of unread) await markHandoverRead(m.id, user.id);
      setHandoverMemos((prev) => prev.map((m) => ({ ...m, readBy: m.readBy.includes(user.id) ? m.readBy : [...m.readBy, user.id] })));
    } else if (popupType === "announcement") {
      const unread = announcements.filter((a) => !a.readBy.includes(user.id));
      for (const a of unread) await markAnnouncementRead(a.id, user.id);
      setAnnouncements((prev) => prev.map((a) => ({ ...a, readBy: a.readBy.includes(user.id) ? a.readBy : [...a.readBy, user.id] })));
    }
    setLoginPopups((prev) => prev.filter((p) => p.type !== popupType));
  };
  const submitEntry = () => withBusy(async () => {
    if (!ef.qty || !selectedId) return;
    const e = { id: uid(), date: ef.date, worker: ef.worker, qty: parseFloat(ef.qty), memo: ef.memo };
    const ok = await insertEntry(selectedId, e);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setProjects((prev) => prev.map((p) => p.id === selectedId ? { ...p, entries: [...p.entries, e] } : p));
    setModal(null);
    setEf({ date: todayStr(), worker: (user == null ? void 0 : user.name) || "", qty: "", memo: "" });
    showToast("\u2713 \u4EBA\u5DE5\u3092\u8A18\u9332\u3057\u307E\u3057\u305F");
  });
  const submitProject = () => withBusy(async () => {
    if (!pf.name) return;
    const np = { id: uid(), ...pf, estimate: Number(pf.estimate) || 0, targetNinku: Number(pf.targetNinku) || 0, materialCost: 0, otherCost: 0, targetMandays: 0, contractAmount: 0, costItems: [], entries: [], attachments: [] };
    const ok = await insertProject(np);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setProjects((prev) => [...prev, np]);
    setModal(null);
    setPf({ name: "", client: "", status: "\u6E96\u5099\u4E2D", lead: "", startDate: todayStr(), endDate: "", estimate: "", targetNinku: "", contractType: "", workCategory: "", address: "" });
    showToast("\u2713 \u6848\u4EF6\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
    setSelectedId(np.id);
    setTab("\u6848\u4EF6\u4E00\u89A7");
  });
  const submitQuickProject = () => withBusy(async () => {
    if (!qf.name) return;
    const np = { id: uid(), name: qf.name, client: "", status: "\u9032\u884C\u4E2D", lead: qf.lead || "", startDate: todayStr(), endDate: "", estimate: 0, targetNinku: 0, materialCost: 0, otherCost: 0, targetMandays: 0, contractAmount: 0, contractType: "", address: "", costItems: [], entries: [], attachments: [] };
    const ok = await insertProject(np);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setProjects((prev) => [...prev, np]);
    setSelectedId(np.id);
    setQf({ name: "", lead: "" });
    setShowQuickAdd(false);
    showToast(`\u2713\u300C${np.name}\u300D\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
  });
  const submitLeave = () => withBusy(async () => {
    var _a2, _b;
    if (!lf.date || !user) return;
    const FULL_DAY_OFF = ["paid", "furikae", "special", "absence"];
    const conflictTypes = FULL_DAY_OFF.includes(lf.type) ? FULL_DAY_OFF : [lf.type];
    const dup = (leaveData[user.id] || []).find(
      (l) => l.date === lf.date && conflictTypes.includes(l.type) && (l.status === "\u7533\u8ACB\u4E2D" || l.status === "\u627F\u8A8D")
    );
    if (dup) {
      const lbl = ((_a2 = LEAVE_TYPES.find((lt) => lt.id === dup.type)) == null ? void 0 : _a2.label) || dup.type;
      const mine = ((_b = LEAVE_TYPES.find((lt) => lt.id === lf.type)) == null ? void 0 : _b.label) || lf.type;
      showToast(dup.type === lf.type ? `\u26A0 ${lf.date} \u306E${lbl}\u306F\u65E2\u306B${dup.status}\u3067\u3059` : `\u26A0 ${lf.date} \u306F\u65E2\u306B${lbl}\u304C${dup.status}\u3067\u3059\u3002\u540C\u3058\u65E5\u306B${mine}\u306F\u53D6\u308C\u307E\u305B\u3093`);
      return;
    }
    if (lf.type === "furikae" && !lf.holidayWorkId) {
      showToast("\u26A0 \u5143\u306E\u4F11\u65E5\u51FA\u52E4\u65E5\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044");
      return;
    }
    const autoApprove = lf.type === "paid" || lf.type === "furikae" || lf.type === "holiday";
    const holidayType = lf.type === "holiday" ? getHolidayType(lf.date) : null;
    const entry = {
      id: uid(),
      type: lf.type,
      date: lf.date,
      days: parseFloat(lf.days) || 1,
      memo: lf.memo,
      holidayPref: lf.holidayPref,
      status: autoApprove ? "\u627F\u8A8D" : "\u7533\u8ACB\u4E2D",
      appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
      holidayWorkId: lf.type === "furikae" ? lf.holidayWorkId || null : null,
      holidayType
    };
    const ok = await insertLeave(user.id, entry);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    const prev = leaveData[user.id] || [];
    setLeaveData((ld) => ({ ...ld, [user.id]: [...prev, entry] }));
    setModal(null);
    setLf({ type: "paid", date: todayStr(), days: "1", memo: "", holidayPref: "", holidayWorkId: "" });
    showToast(autoApprove ? "\u2713 \u627F\u8A8D\u3055\u308C\u307E\u3057\u305F" : "\u2713 \u7533\u8ACB\u3057\u307E\u3057\u305F\uFF08\u7BA1\u7406\u8005\u306E\u627F\u8A8D\u5F85\u3061\uFF09");
  });
  const [attachNote, setAttachNote] = useState("");
  const [notifyOnAttach, setNotifyOnAttach] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const attachFileRef = useRef(null);
  const [drawings, setDrawings] = useState({});
  const drawingFileRef = useRef(null);
  const submitNote = (projId) => withBusy(async () => {
    var _a2;
    if (!attachNote.trim()) return;
    const note = { id: uid(), type: "note", text: attachNote, name: "", data: "", author: user.name, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    const ok = await insertAttachment(projId, note);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setProjects((prev) => prev.map((p) => p.id === projId ? { ...p, attachments: [...p.attachments || [], note] } : p));
    if (notifyOnAttach) {
      const projName = ((_a2 = projects.find((p) => p.id === projId)) == null ? void 0 : _a2.name) || "";
      const ann = { id: uid(), author: user.name, role: user.role, text: `\u3010\u30E1\u30E2\u8FFD\u52A0\uFF5C${projName}\u3011${attachNote.trim()}`, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
      const ok2 = await insertAnnouncement(ann);
      if (ok2) setAnnouncements((prev) => [ann, ...prev]);
    }
    setAttachNote("");
    showToast(notifyOnAttach ? "\u2713 \u30E1\u30E2\u3092\u8FFD\u52A0\u3057\u3001\u5168\u54E1\u306B\u901A\u77E5\u3057\u307E\u3057\u305F" : "\u2713 \u30E1\u30E2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
  });
  const handleAttachFile = async (e, projId) => {
    var _a2, _b;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) {
      showToast("\u5199\u771F\u307E\u305F\u306FPDF\u306E\u307F\u5BFE\u5FDC\u3067\u3059");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast("4MB\u4EE5\u4E0B\u306E\u30D5\u30A1\u30A4\u30EB\u306E\u307F\u5BFE\u5FDC\u3067\u3059");
      return;
    }
    try {
      const base64Full = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("\u8AAD\u8FBC\u5931\u6557"));
        r.readAsDataURL(file);
      });
      const b64Body = base64Full.split(",")[1] || "";
      const fileUrl = await uploadFieldPhoto(b64Body, file.name, file.type);
      if (!fileUrl) {
        showToast("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u5931\u6557");
        e.target.value = "";
        return;
      }
      const att = { id: uid(), type: isImg ? "image" : "pdf", name: file.name, text: "", fileUrl, data: "", author: user.name, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      const ok = await insertAttachment(projId, att);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        e.target.value = "";
        return;
      }
      setProjects((prev) => prev.map((p) => p.id === projId ? { ...p, attachments: [...p.attachments || [], att] } : p));
      if (notifyOnAttach) {
        const projName = ((_b = projects.find((p) => p.id === projId)) == null ? void 0 : _b.name) || "";
        const ann = { id: uid(), author: user.name, role: user.role, text: `\u3010${isImg ? "\u5199\u771F" : "PDF"}\u8FFD\u52A0\uFF5C${projName}\u3011${file.name}`, createdAt: (/* @__PURE__ */ new Date()).toISOString(), readBy: [user.id] };
        const ok2 = await insertAnnouncement(ann);
        if (ok2) setAnnouncements((prev) => [ann, ...prev]);
      }
      showToast(notifyOnAttach ? `\u2713 ${isImg ? "\u5199\u771F" : "PDF"}\u3092\u8FFD\u52A0\u3057\u3001\u5168\u54E1\u306B\u901A\u77E5\u3057\u307E\u3057\u305F` : `\u2713 ${isImg ? "\u5199\u771F" : "PDF"}\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
    } catch (err) {
      showToast("\u30D5\u30A1\u30A4\u30EB\u306E\u6DFB\u4ED8\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
    e.target.value = "";
  };
  const deleteAttachment = async (projId, attId) => {
    const ok = await deleteAttachmentDB(attId);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setProjects((prev) => prev.map((p) => p.id === projId ? { ...p, attachments: (p.attachments || []).filter((a) => a.id !== attId) } : p));
    showToast("\u524A\u9664\u3057\u307E\u3057\u305F");
  };
  const loadDrawings = async (projId) => {
    const rows = await listProjectDrawings(projId);
    if (rows) setDrawings((prev) => ({ ...prev, [projId]: rows }));
  };
  const handleDrawingFile = async (e, projId) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    const isImg = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImg && !isPdf) {
      showToast("\u5199\u771F\u307E\u305F\u306FPDF\u306E\u307F\u5BFE\u5FDC\u3067\u3059");
      e.target.value = "";
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast("4MB\u4EE5\u4E0B\u306E\u30D5\u30A1\u30A4\u30EB\u306E\u307F\u5BFE\u5FDC\u3067\u3059");
      e.target.value = "";
      return;
    }
    try {
      const fileData = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(new Error("\u8AAD\u8FBC\u5931\u6557"));
        r.readAsDataURL(file);
      });
      const d = { id: uid(), projectId: projId, fileName: file.name, fileType: isImg ? "image" : "pdf", fileData, uploadedBy: user.id, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      const ok = await insertProjectDrawing(d);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        e.target.value = "";
        return;
      }
      setDrawings((prev) => ({ ...prev, [projId]: [...prev[projId] || [], d] }));
      showToast(`\u2713 \u56F3\u9762\uFF08${isImg ? "\u753B\u50CF" : "PDF"}\uFF09\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F`);
    } catch (err) {
      showToast("\u56F3\u9762\u306E\u8FFD\u52A0\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
    e.target.value = "";
  };
  const deleteDrawing = async (projId, drawingId) => {
    const ok = await deleteProjectDrawingDB(drawingId);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setDrawings((prev) => ({ ...prev, [projId]: (prev[projId] || []).filter((d) => d.id !== drawingId) }));
    showToast("\u524A\u9664\u3057\u307E\u3057\u305F");
  };
  useEffect(() => {
    if (selectedId && drawings[selectedId] === void 0) loadDrawings(selectedId);
  }, [selectedId]);
  const paidUsed = (sid) => (leaveData[sid] || []).filter((l) => l.type === "paid" && l.status !== "\u5374\u4E0B").reduce((a, l) => a + l.days, 0);
  const getPaidInfo = (sid) => {
    const lb = leaveBalances.find((b) => b.staffId === sid && b.type === "paid");
    if (!lb) return { granted: 0, carried: 0, total: 0 };
    const granted = Number(lb.granted) || 0, carried = Number(lb.carried) || 0;
    return { granted, carried, total: granted + carried };
  };
  const paidInfo = user ? getPaidInfo(user.id) : { granted: 0, carried: 0, total: 0 };
  const paidTotal = paidInfo.total;
  const getFurikaeStats = (sid) => calcFurikaeStats(sid, leaveData);
  const getFurikaeBalance = (sid) => calcFurikaeStats(sid, leaveData).total;
  const getFurikaeAlerts = (sid) => getFurikaeExpiryAlerts(sid, leaveData);
  const calcNinkuFromLogs = (projId) => {
    const p = projects.find((x) => x.id === projId);
    return p ? calcUsedMandays(clockLogs, p).usedMandays : 0;
  };
  const userId = (user == null ? void 0 : user.id) || "";
  const unreadHandoverCount = userId ? handoverMemos.filter((m) => m.author !== user.name && !m.readBy.includes(userId)).length : 0;
  const unreadAnnCount = userId ? announcements.filter((a) => !a.readBy.includes(userId)).length : 0;
  useEffect(() => {
    if (tab !== "\u6253\u523B" || !user || unreadAnnCount === 0) return;
    const timer = setTimeout(async () => {
      const visible = announcements.slice(0, 3).filter((a) => !a.readBy.includes(user.id));
      if (visible.length === 0) return;
      for (const a of visible) await markAnnouncementRead(a.id, user.id);
      setAnnouncements((prev) => prev.map(
        (a) => visible.find((v) => v.id === a.id) ? { ...a, readBy: [...a.readBy, user.id] } : a
      ));
    }, 3e3);
    return () => clearTimeout(timer);
  }, [tab, user == null ? void 0 : user.id]);
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (user.isExecutive) return;
    (async () => {
      const perm = Notification.permission;
      if (perm === "denied") {
        setPushStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setPushStatus("subscribed");
        return;
      }
      if (perm === "granted") {
        setPushStatus("granted");
      } else {
        setPushStatus("unknown");
      }
      if (!vapidKey) {
        const k = await getVapidPublicKey();
        if (k) setVapidKey(k);
      }
    })();
  }, [user == null ? void 0 : user.id]);
  const subscribePush = async () => {
    if (!vapidKey) {
      showToast("VAPID\u9375\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
      return;
    }
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });
      const { endpoint, keys: rawKeys } = sub.toJSON();
      const ok = await savePushSubscription(endpoint, rawKeys);
      if (ok) {
        setPushStatus("subscribed");
        showToast("\u2713 Push\u901A\u77E5\u3092\u6709\u52B9\u306B\u3057\u307E\u3057\u305F");
      } else showToast("Push\u901A\u77E5\u306E\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    } catch (e) {
      showToast("Push\u901A\u77E5\u3092\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044");
      setPushStatus(Notification.permission === "denied" ? "denied" : "unknown");
    } finally {
      setPushLoading(false);
    }
  };
  const unsubscribePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await deletePushSubscription();
      setPushStatus("unknown");
      showToast("Push\u901A\u77E5\u3092\u7121\u52B9\u306B\u3057\u307E\u3057\u305F");
    } catch (e) {
      showToast("\u89E3\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    } finally {
      setPushLoading(false);
    }
  };
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [aiTodayCount, setAiTodayCount] = useState(0);
  const AI_DAILY_LIMIT = 20;
  const runAiChat = async () => {
    var _a2, _b;
    if (!aiQuestion.trim() || aiLoading || aiTodayCount >= AI_DAILY_LIMIT) return;
    const q = aiQuestion.trim();
    setAiQuestion("");
    setAiMessages((prev) => [...prev, { role: "user", text: q }]);
    setAiLoading(true);
    try {
      const myLogs = clockLogs.filter((l) => l.userName === user.name);
      const mySummary = `\u51FA\u52E4\u65E5\u6570: ${myLogs.filter((l) => l.clockOut).length}\u65E5
\u6B8B\u696D\u6642\u9593: ${sumOvertimeH(myLogs).toFixed(1)}h`;
      const myLeaves = leaveData[userId] || [];
      const leaveSummary = myLeaves.map((l) => `${l.type} ${l.date} ${l.status}`).join(", ") || "\u306A\u3057";
      const paidUsedCount = paidUsed(user.id);
      const paidRemain = paidTotal - paidUsedCount;
      const paidSummary = `\u4ED8\u4E0E${paidInfo.granted}\u65E5 + \u7E70\u8D8A${paidInfo.carried}\u65E5 = \u5408\u8A08${paidTotal}\u65E5 / \u4F7F\u7528\u6E08\u307F${paidUsedCount}\u65E5 / \u6B8B\u308A${paidRemain}\u65E5`;
      const myProjects = projects.filter((p) => p.status !== "\u5B8C\u4E86").map((p) => `${p.name}(${p.status})`).join(", ") || "\u306A\u3057";
      const prompt = `\u4EE5\u4E0B\u306F\u30B7\u30F3\u30BB\u30A4\u5DE5\u696D\u306E\u30B9\u30BF\u30C3\u30D5\u300C${user.name}\u300D\u306E\u60C5\u5831\u3067\u3059\u3002\u672C\u4EBA\u304B\u3089\u306E\u8CEA\u554F\u306B\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4ED5\u4E8B\u306E\u7591\u554F\u30FB\u60A9\u307F\u30FB\u30A2\u30D7\u30EA\u306E\u4F7F\u3044\u65B9\u306B\u3082\u5BFE\u5FDC\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4ED6\u306E\u30B9\u30BF\u30C3\u30D5\u306E\u500B\u4EBA\u60C5\u5831\u306F\u6559\u3048\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002

\u3010\u6253\u523B\u30C7\u30FC\u30BF\u3011
${mySummary}

\u3010\u6709\u7D66\u6B8B\u6570\uFF08\u96C6\u8A08\u6E08\u307F\u30FB\u3053\u306E\u5024\u3092\u305D\u306E\u307E\u307E\u4F7F\u7528\uFF09\u3011
${paidSummary}

\u3010\u4F11\u6687\u7533\u8ACB\u5C65\u6B74\u3011
${leaveSummary}

\u3010\u62C5\u5F53\u6848\u4EF6\u3011
${myProjects}

\u3010\u8CEA\u554F\u3011${q}`;
      const resp = await callClaudeProxy({ action: "ai_chat", prompt });
      if (!resp.ok) throw new Error("API\u5FDC\u7B54\u30A8\u30E9\u30FC");
      const data = await resp.json();
      const answer = ((_b = (_a2 = data.content) == null ? void 0 : _a2[0]) == null ? void 0 : _b.text) || "\u56DE\u7B54\u3092\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F";
      setAiMessages((prev) => [...prev, { role: "ai", text: answer }]);
      setAiTodayCount((prev) => prev + 1);
      await insertAiChatLog(q, answer);
    } catch (e) {
      setAiMessages((prev) => [...prev, { role: "ai", text: "\u30A8\u30E9\u30FC: " + e.message }]);
    }
    setAiLoading(false);
  };
  const [instaTab, setInstaTab] = useState("\u4F5C\u6210");
  const [instaCategory, setInstaCategory] = useState("");
  const [instaSelections, setInstaSelections] = useState({});
  const [instaComment, setInstaComment] = useState("");
  const [instaImages, setInstaImages] = useState([]);
  const [instaMode, setInstaMode] = useState("");
  const [instaCaption, setInstaCaption] = useState("");
  const [instaChecks, setInstaChecks] = useState([false, false, false]);
  const [instaPosts, setInstaPosts] = useState([]);
  const [instaSubmitting, setInstaSubmitting] = useState(false);
  const [instaRulesAgreed, setInstaRulesAgreed] = useState(false);
  const [instaMonthly, setInstaMonthly] = useState({ manual: 0, auto: 0, total: 0 });
  const trainingApplies = !!training && (!(user == null ? void 0 : user.isExecutive) || training.training.includeExecutives);
  const meStaff = (staff || []).find((x) => x.id === (user == null ? void 0 : user.id));
  const mySurveys = (surveys || []).filter(
    (s) => s.isActive && !(meStaff && meStaff.surveyExempt) && !(s.exemptStaffIds || []).includes(user == null ? void 0 : user.id) && (!(user == null ? void 0 : user.isExecutive) || s.includeExecutives)
  );
  const canNinkuInput = String((user == null ? void 0 : user.name) || "").replace(/[\s　]/g, "").startsWith("\u5DDD\u7551");
  const tabs = ["\u6253\u523B", "\u6848\u4EF6\u4E00\u89A7", "\u4F11\u6687\u7BA1\u7406", "\u540D\u523A", "\u30A2\u30F3\u30B1\u30FC\u30C8", "\u7814\u4FEE", "\u4EBA\u5DE5\u76EE\u5B89", "AI\u30C1\u30E3\u30C3\u30C8", "\u8ECA\u4E21", "\u4F1A\u793E\u60C5\u5831", "\u3054\u610F\u898B\u7BB1"].filter((t) => !(t === "\u30A2\u30F3\u30B1\u30FC\u30C8" && mySurveys.length === 0)).filter((t) => !(t === "\u7814\u4FEE" && !trainingApplies)).filter((t) => !(t === "\u4EBA\u5DE5\u76EE\u5B89" && !canNinkuInput));
  const trainingLocked = !!user && trainingApplies && training.pastDeadline && !training.completedAt;
  const surveyLocked = !!user && mySurveys.some(
    (s) => s.deadline && todayStr() >= s.deadline && !surveyResponses.find((r) => r.surveyId === s.id && r.staffId === user.id)
  );
  const visibleTabs = trainingLocked ? ["\u6253\u523B", "\u7814\u4FEE"] : surveyLocked ? ["\u6253\u523B", "\u30A2\u30F3\u30B1\u30FC\u30C8"] : tabs;
  useEffect(() => {
    if ((surveyLocked || trainingLocked) && !visibleTabs.includes(tab)) setTab("\u6253\u523B");
  }, [surveyLocked, trainingLocked, tab]);
  if (loading) return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#e5e7eb", color: "#111827", fontFamily: "sans-serif" } }, "\u8AAD\u307F\u8FBC\u307F\u4E2D...");
  if (loadErr) return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#e5e7eb", color: "#ef4444", fontFamily: "sans-serif", padding: 20, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 16 } }, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, marginBottom: 8 } }, "\u63A5\u7D9A\u30A8\u30E9\u30FC"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", maxWidth: 360 } }, loadErr), /* @__PURE__ */ React.createElement("button", { onClick: () => window.location.reload(), style: { marginTop: 20, background: "#e5e7eb", color: "#111827", border: "1px solid #9ca3af", borderRadius: 8, padding: "10px 24px", fontSize: 13, cursor: "pointer" } }, "\u518D\u8AAD\u307F\u8FBC\u307F"));
  if (!user) return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#e5e7eb", fontFamily: "'Noto Sans JP',sans-serif", padding: 20 } }, /* @__PURE__ */ React.createElement("link", { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;700&display=swap", rel: "stylesheet" }), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 32, textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 5, height: 32, background: "linear-gradient(180deg,#f97316,#ef4444)", borderRadius: 3, margin: "0 auto 12px" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "#f97316", letterSpacing: "0.15em" } }, "\u30B7\u30F3\u30BB\u30A4\u5DE5\u696D"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginTop: 2 } }, "FIELD MANAGEMENT v16")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 320 } }, /* @__PURE__ */ React.createElement(PinPad, { onSuccess: (s, token) => {
    setUser(s);
    setSessionToken(token);
    saveSavedUser(s);
  } })), /* @__PURE__ */ React.createElement("button", { onClick: async () => {
    if (!window.confirm("\u30AD\u30E3\u30C3\u30B7\u30E5\u3092\u5168\u524A\u9664\u3057\u3066\u30A2\u30D7\u30EA\u3092\u518D\u8D77\u52D5\u3057\u307E\u3059\u3002\n\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3082\u6D88\u3048\u307E\u3059\u304C\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")) return;
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (typeof caches !== "undefined") {
        const names = await caches.keys();
        for (const n of names) await caches.delete(n);
      }
      try {
        localStorage.clear();
      } catch (_) {
      }
      try {
        sessionStorage.clear();
      } catch (_) {
      }
    } catch (e) {
    }
    window.location.replace("/user?reset=" + Date.now());
  }, style: { marginTop: 16, background: "transparent", color: "#111827", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 16px", fontSize: 10, cursor: "pointer" } }, "\u{1F9F9} \u30A2\u30D7\u30EA\u306E\u8ABF\u5B50\u304C\u60AA\u3044\u6642\u306F\u3053\u3053\u3092\u62BC\u3059"));
  return /* @__PURE__ */ React.createElement("div", { style: { fontFamily: "'Noto Sans JP',sans-serif", minHeight: "100vh", background: "#e5e7eb", color: "#111827", maxWidth: 480, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("link", { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=JetBrains+Mono:wght@400;700&display=swap", rel: "stylesheet" }), toast && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", background: toast.startsWith("\u26A0") ? "#f59e0b" : "#22c55e", color: "#000", fontWeight: 700, padding: "8px 20px", borderRadius: 30, fontSize: 12, zIndex: 9999, whiteSpace: "nowrap", maxWidth: "90vw", overflow: "hidden", textOverflow: "ellipsis" } }, toast), (() => {
    if (!user || !trainingApplies) return null;
    if (training.completedAt && !trainingReview) return null;
    if (!trainingReview) {
      if (trainingDismissed && !training.pastDeadline) return null;
      if (trainingDismissed && training.pastDeadline && tab === "\u6253\u523B") return null;
      if (tab === "\u7814\u4FEE") return null;
    }
    return /* @__PURE__ */ React.createElement(
      TrainingFlow,
      {
        data: training,
        onReload: reloadTraining,
        onCompleted: () => setTrainingReview(true),
        canExit: !training.pastDeadline,
        onExit: () => {
          setTrainingReview(false);
          setTrainingDismissed(true);
          if (training.pastDeadline) setTab("\u6253\u523B");
        },
        showToast
      }
    );
  })(), (() => {
    if (!user) return null;
    if (surveyDismissed) return null;
    const _today = todayStr();
    const unanswered = mySurveys.filter((s) => !surveyResponses.find((r) => r.surveyId === s.id && r.staffId === user.id));
    if (unanswered.length === 0) return null;
    const minOf = (q) => Number(q && q.minChars) || 0;
    const isFilled = (v, q) => {
      const t = String(v == null ? "" : v).trim();
      return t !== "" && t.length >= minOf(q);
    };
    const graceOnly = unanswered.every((s) => s.deadline && _today < s.deadline);
    const nearestDeadline = unanswered.map((s) => s.deadline).filter(Boolean).sort()[0] || null;
    const daysLeft = nearestDeadline ? Math.max(Math.ceil((/* @__PURE__ */ new Date(nearestDeadline + "T00:00:00") - /* @__PURE__ */ new Date(_today + "T00:00:00")) / 864e5), 0) : 0;
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000ee", zIndex: 9e3, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 480, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 16, paddingTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#22c55e", marginBottom: 6 } }, graceOnly ? "\u30A2\u30F3\u30B1\u30FC\u30C8\u306E\u304A\u9858\u3044" : "\u672A\u56DE\u7B54\u306E\u30A2\u30F3\u30B1\u30FC\u30C8\u304C\u3042\u308A\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4b5563" } }, graceOnly ? `\u56DE\u7B54\u306F\u7DE0\u5207\u307E\u3067\u66F8\u304D\u76F4\u305B\u307E\u3059\uFF08\u6B8B\u308A ${unanswered.length} \u4EF6\uFF09` : `\u56DE\u7B54\u3059\u308B\u307E\u3067\u6253\u523B\u4EE5\u5916\u306F\u4F7F\u3048\u307E\u305B\u3093\uFF08\u6B8B\u308A ${unanswered.length} \u4EF6\uFF09`)), unanswered.map((s) => s.intro ? /* @__PURE__ */ React.createElement("div", { key: "intro_" + s.id, style: { background: "#fafafa", border: "1px solid #22c55e44", borderRadius: 12, padding: "16px 18px", marginBottom: 12, fontSize: 13, lineHeight: 1.9, color: "#374151", whiteSpace: "pre-wrap" } }, s.intro) : null), unanswered.map((s) => {
      const ans = surveyAnswers[s.id] || {};
      const totalQ = (s.questions || []).length;
      const filledQ = (s.questions || []).filter((q, qi) => isFilled(ans[qi], q)).length;
      const allAnswered = filledQ === totalQ && totalQ > 0;
      const remaining = totalQ - filledQ;
      return /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: "#fafafa", border: "1px solid #22c55e44", borderRadius: 12, padding: "16px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#111827", flex: 1 } }, s.title), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: allAnswered ? "#22c55e" : "#f59e0b", background: allAnswered ? "#f0fdf4" : "#fef3c7", border: `1px solid ${allAnswered ? "#22c55e44" : "#f59e0b44"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" } }, filledQ, "/", totalQ, " \u56DE\u7B54")), (s.questions || []).map((q, qi) => {
        const v = ans[qi];
        const filled = isFilled(v, q);
        return /* @__PURE__ */ React.createElement("div", { key: qi, style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4, lineHeight: 1.6 } }, "Q", qi + 1, ". ", q.text, " ", !filled && /* @__PURE__ */ React.createElement("span", { style: { color: "#f59e0b", fontWeight: 700, fontSize: 11 } }, "* \u5FC5\u9808")), q.note && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 8, lineHeight: 1.7 } }, "\u203B", q.note), q.type === "text" && // [2026-09-04] 自由記述は textarea に変更（1行 input だと長文が書きにくい）。
        //   fontSize は 16 未満にしない — iOS が入力時に勝手に拡大して画面がずれるため。
        /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: v || "",
            rows: 4,
            onChange: (e) => setSurveyAnswers((p) => ({ ...p, [s.id]: { ...p[s.id] || {}, [qi]: e.target.value } })),
            style: { ...IS, fontSize: 16, padding: "11px 12px", lineHeight: 1.7, resize: "vertical", minHeight: 96, borderColor: filled ? "#d1d5db" : "#f59e0b66" }
          }
        ), q.type === "text" && minOf(q) > 0 && (() => {
          const len = String(v == null ? "" : v).trim().length;
          const ok = len >= minOf(q);
          return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: ok ? "#22c55e" : "#f59e0b", marginTop: 4, textAlign: "right" } }, ok ? len + "\u6587\u5B57 \u2713" : len + " / " + minOf(q) + "\u6587\u5B57\uFF08\u3042\u3068" + (minOf(q) - len) + "\u6587\u5B57\uFF09");
        })(), q.type === "select" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, (q.options || []).map((opt, oi) => {
          const sel = v === opt;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: oi,
              type: "button",
              onClick: () => setSurveyAnswers((p) => ({ ...p, [s.id]: { ...p[s.id] || {}, [qi]: opt } })),
              style: { background: sel ? "#22c55e" : "#e5e7eb", border: `1px solid ${sel ? "#22c55e" : "#d1d5db"}`, borderRadius: 6, color: sel ? "#000" : "#111827", padding: "7px 13px", fontSize: 12, fontWeight: sel ? 700 : 400, cursor: "pointer" }
            },
            opt
          );
        })));
      }), /* @__PURE__ */ React.createElement("button", { disabled: busy || !allAnswered, onClick: () => withBusy(async () => {
        const cur = surveyAnswers[s.id] || {};
        const missing = (s.questions || []).filter((q, qi) => !isFilled(cur[qi], q));
        if (missing.length > 0) {
          showToast("\u672A\u56DE\u7B54\u3001\u307E\u305F\u306F\u6587\u5B57\u6570\u304C\u8DB3\u308A\u306A\u3044\u8CEA\u554F\u304C\u3042\u308A\u307E\u3059");
          return;
        }
        const ok = await submitSurveyResponse(s.id, cur);
        if (!ok) {
          return;
        }
        const fresh = await loadSurveyResponses();
        setSurveyResponses(fresh || []);
        setSurveyAnswers((p) => {
          const cp = { ...p };
          delete cp[s.id];
          return cp;
        });
        showToast("\u2713 \u56DE\u7B54\u3057\u307E\u3057\u305F");
      }), style: { width: "100%", background: busy || !allAnswered ? "#e5e7eb" : "linear-gradient(135deg,#22c55e,#16a34a)", color: busy || !allAnswered ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: busy || !allAnswered ? "not-allowed" : "pointer", marginTop: 6 } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : !allAnswered ? `\u3042\u3068 ${remaining} \u554F` : "\u3053\u306E\u30A2\u30F3\u30B1\u30FC\u30C8\u306B\u56DE\u7B54\u3059\u308B"));
    }), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "6px 0 28px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setSurveyDismissed(true);
          if (!graceOnly) setTab("\u6253\u523B");
        },
        style: { background: "transparent", border: "none", color: "#9ca3af", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: "12px 16px" }
      },
      graceOnly ? `\u3042\u3068\u3067\u66F8\u304F\uFF08\u7DE0\u5207\u307E\u3067\u3042\u3068${daysLeft}\u65E5\uFF09` : "\u6253\u523B\u3060\u3051\u3059\u308B\uFF08\u4ED6\u306E\u753B\u9762\u306F\u4F7F\u3048\u307E\u305B\u3093\uFF09"
    ))));
  })(), (() => {
    if (!user || user.isExecutive) return null;
    const required = getForcedProgressRequests(user, customers, projects, progressReports, clockLogs, /* @__PURE__ */ new Date(), progressRequestAllAt);
    if (required.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000ee", zIndex: 8900, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 480, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 20, paddingTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u{1F4CA}"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#f97316", marginBottom: 6 } }, "\u9032\u6357\u5831\u544A\u3092\u304A\u9858\u3044\u3057\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4b5563" } }, required.every((x) => x.checkType === "\u4E00\u6589\u78BA\u8A8D") ? "\u4F1A\u793E\u304B\u3089\u9032\u6357\u306E\u78BA\u8A8D\u4F9D\u983C\u304C\u6765\u3066\u3044\u307E\u3059\u3002" : "\u4ECA\u65E5\u306F\u9032\u6357\u78BA\u8A8D\u65E5\u3067\u3059\u3002", "\u3059\u3079\u3066\u5831\u544A\u3057\u306A\u3044\u3068\u4ED6\u306E\u753B\u9762\u306B\u9032\u3081\u307E\u305B\u3093\uFF08\u6B8B\u308A ", required.length, " \u4EF6\uFF09")), required.map((item) => {
      var _a2, _b, _c;
      const { project: p, customer: c, checkType, lastReport } = item;
      const ans = forcedProgress[p.id] || {};
      const pct = (_b = ans.percent) != null ? _b : (_a2 = lastReport == null ? void 0 : lastReport.percent) != null ? _a2 : 50;
      const comment = (_c = ans.comment) != null ? _c : "";
      const confirming = forcedConfirmId === p.id;
      return /* @__PURE__ */ React.createElement("div", { key: p.id, style: { background: "#fafafa", border: "1px solid #f9731644", borderRadius: 12, padding: "16px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#b45309" } }, c.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#111827", marginTop: 2, marginBottom: 4 } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#6b7280", marginBottom: 12 } }, checkType === "\u5BA2\u5148\u5171\u6709" ? "\u{1F535} \u5BA2\u5148\u5171\u6709\u65E5" : checkType === "\u4E00\u6589\u78BA\u8A8D" ? "\u{1F4E3} \u4F1A\u793E\u304B\u3089\u306E\u78BA\u8A8D\u4F9D\u983C" : "\u{1F512} \u5185\u90E8\u78BA\u8A8D\u65E5", lastReport && ` \uFF0F \u524D\u56DE ${lastReport.percent}% (${dateStrJST(lastReport.reportedAt)})`, p.status === "\u5B8C\u4E86" && " \uFF0F \u2705\u5B8C\u4E86\u6E08"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 4 } }, "\u9032\u6357 ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, color: "#f97316", fontSize: 15, fontFamily: "'JetBrains Mono',monospace" } }, pct, "%")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "range",
          min: "0",
          max: "100",
          step: "10",
          value: pct,
          disabled: confirming || savingReport,
          onChange: (e) => setForcedProgress((prev) => ({ ...prev, [p.id]: { percent: Number(e.target.value), comment } })),
          style: { width: "100%", accentColor: "#f97316" }
        }
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9ca3af", marginTop: 2, marginBottom: 10 } }, /* @__PURE__ */ React.createElement("span", null, "0%"), /* @__PURE__ */ React.createElement("span", null, "50%"), /* @__PURE__ */ React.createElement("span", null, "100%")), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: comment,
          disabled: confirming || savingReport,
          onChange: (e) => setForcedProgress((prev) => ({ ...prev, [p.id]: { percent: pct, comment: e.target.value } })),
          placeholder: "\u30B3\u30E1\u30F3\u30C8\uFF08\u4EFB\u610F\uFF09\u4F8B: \u914D\u7BA1\u4FDD\u6E29\u5B8C\u4E86\u3001\u6765\u9031\u30E9\u30C3\u30AD\u30F3\u30B0\u958B\u59CB",
          rows: 2,
          style: { ...IS, resize: "vertical", fontSize: 12, padding: "8px 10px", marginBottom: 8 }
        }
      ), !confirming ? /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setForcedConfirmId(p.id),
          disabled: savingReport,
          style: { width: "100%", background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#000", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" }
        },
        "\u3053\u306E\u5185\u5BB9\u3067\u5831\u544A\u3059\u308B\uFF08",
        pct,
        "%\uFF09"
      ) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fff7ed", border: "1px solid #f9731666", borderRadius: 8, padding: "10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#b45309", fontWeight: 700, marginBottom: 8, lineHeight: 1.5 } }, "\u26A0 \u9032\u6357 ", pct, "% \u3067\u9001\u4FE1\u3057\u307E\u3059\u3002\u9001\u4FE1\u5F8C\u306F\u4FEE\u6B63\u3067\u304D\u307E\u305B\u3093\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setForcedConfirmId(null),
          disabled: savingReport,
          style: { flex: 1, background: "#e5e7eb", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" }
        },
        "\u623B\u308B"
      ), /* @__PURE__ */ React.createElement("button", { disabled: savingReport, onClick: async () => {
        if (savingReport) return;
        setSavingReport(true);
        try {
          const rep = { id: uid(), projectId: p.id, customerId: c.id, percent: pct, comment };
          const res = await saveProgressReport(rep);
          if (res == null ? void 0 : res.error) {
            showToast("\u26A0 \u9001\u4FE1\u5931\u6557: " + res.error);
            setSavingReport(false);
            return;
          }
          const fresh = await loadProgressReports();
          setProgressReports(fresh || []);
          setForcedProgress((prev) => {
            const cp = { ...prev };
            delete cp[p.id];
            return cp;
          });
          setForcedConfirmId(null);
          showToast("\u2713 \u9032\u6357\u3092\u5831\u544A\u3057\u307E\u3057\u305F");
        } catch (e) {
          showToast("\u26A0 \u9001\u4FE1\u5931\u6557: " + e.message);
        } finally {
          setSavingReport(false);
        }
      }, style: { flex: 2, background: savingReport ? "#e5e7eb" : "linear-gradient(135deg,#f97316,#ef4444)", color: savingReport ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" } }, savingReport ? "\u9001\u4FE1\u4E2D\u2026" : "\u{1F4E4} \u9001\u4FE1\u3059\u308B"))));
    })));
  })(), (() => {
    if (!user || user.isExecutive) return null;
    const stuck = clockLogs.filter((l) => {
      if (l.userId !== user.id || l.clockOut || !l.clockIn) return false;
      if (l.isNightShift) return Date.now() - new Date(l.clockIn).getTime() > 24 * 36e5;
      return !isSameLocalDay(l.clockIn);
    }).sort((a, b) => new Date(a.clockIn) - new Date(b.clockIn));
    if (stuck.length === 0) return null;
    const fmtDate = (iso) => {
      const d = new Date(iso);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    };
    const resolveOne = (log) => withBusy(async () => {
      const night = !!log.isNightShift;
      const hhmm = clockoutFixEdits[log.id] || (night ? "06:00" : "17:00");
      const [hh, mm] = hhmm.split(":").map(Number);
      const H = Number.isFinite(hh) ? hh : night ? 6 : 17;
      const M = Number.isFinite(mm) ? mm : 0;
      const inD = new Date(log.clockIn);
      let outD = new Date(inD.getFullYear(), inD.getMonth(), inD.getDate(), H, M, 0, 0);
      if (night && outD.getTime() <= inD.getTime()) outD = new Date(outD.getTime() + 24 * 36e5);
      if (outD.getTime() <= inD.getTime()) {
        showToast("\u26A0 \u9000\u52E4\u6642\u523B\u306F\u51FA\u52E4\u3088\u308A\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044");
        return;
      }
      const iso = outD.toISOString();
      const ok = await updateClockOut(log.id, iso, null, log.locationName || "");
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return;
      }
      setClockLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, clockOut: iso } : l));
      setClockoutFixEdits((p) => {
        const cp = { ...p };
        delete cp[log.id];
        return cp;
      });
      showToast("\u2713 \u9000\u52E4\u3092\u8A18\u9332\u3057\u307E\u3057\u305F");
    });
    return /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000ee", zIndex: 9100, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 480, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 20, paddingTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u23F0"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 6 } }, "\u9000\u52E4\u6253\u523B\u304C\u629C\u3051\u3066\u3044\u307E\u3059"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4b5563" } }, "\u9000\u52E4\u6642\u523B\u3092\u5165\u529B\u3057\u306A\u3044\u3068\u5148\u306B\u9032\u3081\u307E\u305B\u3093\uFF08\u6B8B\u308A ", stuck.length, " \u4EF6\uFF09")), stuck.map((log) => {
      const proj = projects.find((p) => p.id === log.projectId);
      const night = !!log.isNightShift;
      const hhmm = clockoutFixEdits[log.id] || (night ? "06:00" : "17:00");
      return /* @__PURE__ */ React.createElement("div", { key: log.id, style: { background: "#fafafa", border: "1px solid #f59e0b44", borderRadius: 12, padding: "16px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 } }, night && /* @__PURE__ */ React.createElement("span", { style: { color: "#6366f1" } }, "\u{1F319} "), fmtDate(log.clockIn), " ", (proj == null ? void 0 : proj.name) || "\u73FE\u5834"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 12 } }, "\u51FA\u52E4 ", timeStr(log.clockIn), " \u2192 \u9000\u52E4\u304C\u672A\u5165\u529B\u3067\u3059"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: night ? 6 : 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#374151" } }, "\u9000\u52E4\u6642\u523B"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "time",
          value: hhmm,
          onChange: (e) => setClockoutFixEdits((p) => ({ ...p, [log.id]: e.target.value })),
          style: { fontSize: 18, fontWeight: 700, padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontFamily: "'JetBrains Mono',monospace" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#9ca3af" } }, night ? "\u7FCC\u671D\u53EF" : "\u6A19\u6E9617:00")), night && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6366f1", marginBottom: 8, lineHeight: 1.5 } }, "\u{1F319} \u591C\u52E4: \u51FA\u52E4\u6642\u523B\u3088\u308A\u524D\u306E\u6642\u523B\u306F\u300C\u7FCC\u65E5\u300D\u3068\u3057\u3066\u8A18\u9332\u3055\u308C\u307E\u3059\uFF08\u4F8B 18:00\u2192\u7FCC6:00\uFF09"), night && (() => {
        const [hh, mm] = hhmm.split(":").map(Number);
        const H = Number.isFinite(hh) ? hh : 6, M = Number.isFinite(mm) ? mm : 0;
        const inD = new Date(log.clockIn);
        let outD = new Date(inD.getFullYear(), inD.getMonth(), inD.getDate(), H, M, 0, 0);
        if (outD.getTime() <= inD.getTime()) outD = new Date(outD.getTime() + 24 * 36e5);
        const wh = (outD - inD) / 36e5;
        const cross = !isSameLocalDay(outD.toISOString(), inD);
        return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4f46e5", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "8px 10px", marginBottom: 12, fontWeight: 700 } }, "\u9000\u52E4 ", cross ? "\u7FCC" : "", hhmm, " \uFF0F \u5B9F\u50CD ", wh.toFixed(1), "h", wh >= 16 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444" } }, " \u26A0 \u9577\u6642\u9593\u3067\u3059\u3002\u6642\u523B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044"));
      })(), /* @__PURE__ */ React.createElement(
        "button",
        {
          disabled: busy,
          onClick: () => resolveOne(log),
          style: { width: "100%", background: busy ? "#e5e7eb" : "linear-gradient(135deg,#f59e0b,#ea580c)", color: busy ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer" }
        },
        busy ? "\u8A18\u9332\u4E2D\u2026" : "\u3053\u306E\u65E5\u306E\u9000\u52E4\u3092\u8A18\u9332\u3059\u308B"
      ));
    })));
  })(), loginPopups.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", inset: 0, background: "#000000cc", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #d1d5db", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 520, padding: "20px 20px 40px", maxHeight: "80vh", overflowY: "auto" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#f97316", marginBottom: 16 } }, "\u{1F4EC} \u304A\u77E5\u3089\u305B"), loginPopups.map((popup, pi) => /* @__PURE__ */ React.createElement("div", { key: pi, style: { marginBottom: 16 } }, popup.type === "handover" && /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #60a5fa33", borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 10 } }, "\u{1F4CB} \u672A\u8AAD\u306E\u5F15\u7D99\u304E\u30E1\u30E2 (", popup.count, "\u4EF6)"), popup.memos.map((m) => {
    var _a2, _b;
    return /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: "#fafafa", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginBottom: 4 } }, m.author, " \xB7 ", (_a2 = m.createdAt) == null ? void 0 : _a2.slice(5, 10).replace("-", "/"), " \xB7 ", ((_b = projects.find((p) => p.id === m.projectId)) == null ? void 0 : _b.name) || "\u4E0D\u660E"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#374151" } }, m.text));
  }), /* @__PURE__ */ React.createElement("button", { onClick: () => markAllRead("handover"), style: { width: "100%", background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8 } }, "\u65E2\u8AAD\u306B\u3059\u308B")), popup.type === "announcement" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f9731633", borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 10 } }, "\u{1F4E2} \u30A2\u30CA\u30A6\u30F3\u30B9 (", popup.count, "\u4EF6)"), popup.items.map((a) => {
    var _a2;
    return /* @__PURE__ */ React.createElement("div", { key: a.id, style: { background: "#fafafa", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginBottom: 4 } }, a.author, " \xB7 ", (_a2 = a.createdAt) == null ? void 0 : _a2.slice(5, 10).replace("-", "/")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#374151" } }, a.text));
  }), /* @__PURE__ */ React.createElement("button", { onClick: () => markAllRead("announcement"), style: { width: "100%", background: "#fef3c7", color: "#f97316", border: "1px solid #f9731644", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8 } }, "\u65E2\u8AAD\u306B\u3059\u308B")), popup.type === "furikae_alert" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f59e0b33", borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 10 } }, "\u23F0 \u632F\u4F11\u306E\u671F\u9650\u304C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059"), popup.items.map((a, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fafafa", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#f59e0b" } }, "\u4F11\u65E5\u51FA\u52E4\u65E5: ", a.date), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280" } }, "\u671F\u9650: ", a.expiryDate, "\uFF08\u3042\u3068", a.daysLeft, "\u65E5\uFF09"))), /* @__PURE__ */ React.createElement("button", { onClick: () => setLoginPopups((prev) => prev.filter((p) => p.type !== "furikae_alert")), style: { width: "100%", background: "#2a2a0a", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8 } }, "\u78BA\u8A8D\u3057\u307E\u3057\u305F")), popup.type === "vehicle_alert" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef3c7", border: "1px solid #f9731633", borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 10 } }, "\u{1F697} \u62C5\u5F53\u8ECA\u4E21\u306E\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9\u901A\u77E5"), popup.items.map((a, i) => {
    const color = a.type === "oil" ? "#22c55e" : a.severity === "expired" ? "#ef4444" : a.severity === "warn" ? "#f97316" : "#60a5fa";
    let title = "", detail = "";
    if (a.type === "oil") {
      title = `\u{1F6E2} ${a.vehicleName}\uFF1A\u30AA\u30A4\u30EB\u4EA4\u63DB\u6642\u671F`;
      detail = `\u524D\u56DE\u4EA4\u63DB\u304B\u3089 ${a.daysSince}\u65E5\u7D4C\u904E\uFF08${a.lastDate}\uFF09`;
      if (a.elementDue) detail += `\uFF0F\u{1F527} \u4ECA\u56DE\u306F\u30A8\u30EC\u30E1\u30F3\u30C8\u4EA4\u63DB\u306E\u6642\u671F\u3067\u3059`;
    } else {
      if (a.severity === "expired") {
        title = `\u{1F534} ${a.vehicleName}\uFF1A\u8ECA\u691C\u671F\u9650\u5207\u308C`;
        detail = `\u8ECA\u691C\u65E5 ${a.inspectionDate}\uFF08${-a.daysUntil}\u65E5\u524D\u306B\u671F\u9650\u5207\u308C\uFF09`;
      } else if (a.severity === "warn") {
        title = `\u{1F6A8} ${a.vehicleName}\uFF1A\u8ECA\u691C\u9593\u8FD1`;
        detail = `\u8ECA\u691C\u65E5 ${a.inspectionDate}\uFF08\u3042\u3068 ${a.daysUntil}\u65E5\uFF09`;
      } else {
        title = `\u{1F6E0} ${a.vehicleName}\uFF1A\u8ECA\u691C\u8FD1\u3065\u3044\u3066\u3044\u307E\u3059`;
        detail = `\u8ECA\u691C\u65E5 ${a.inspectionDate}\uFF08\u3042\u3068 ${a.daysUntil}\u65E5\uFF09`;
      }
    }
    return /* @__PURE__ */ React.createElement("div", { key: i, style: { background: "#fafafa", borderRadius: 8, padding: "10px 12px", marginBottom: 6, borderLeft: `3px solid ${color}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color } }, title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#4b5563", marginTop: 2 } }, detail), a.dismissKey && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      try {
        localStorage.setItem(a.dismissKey, todayStr());
      } catch (e) {
      }
      ;
      setLoginPopups((prev) => prev.map((p) => p.type === "vehicle_alert" ? { ...p, items: p.items.filter((_, idx) => idx !== i) } : p).filter((p) => p.type !== "vehicle_alert" || p.items.length > 0));
    }, style: { marginTop: 6, background: "#e5e7eb", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer" } }, "10\u65E5\u5F8C\u306B\u518D\u901A\u77E5"));
  }), /* @__PURE__ */ React.createElement("button", { onClick: () => setLoginPopups((prev) => prev.filter((p) => p.type !== "vehicle_alert")), style: { width: "100%", background: "#fef3c7", color: "#f97316", border: "1px solid #f9731644", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 8 } }, "\u78BA\u8A8D\u3057\u307E\u3057\u305F")))))), (() => {
    const now = /* @__PURE__ */ new Date();
    const limit = new Date(now.getTime() + 30 * 864e5);
    const soon = vehicles.filter((v) => {
      if (!v.inspectionDate || v.assignedStaffId !== user.id) return false;
      const d = new Date(v.inspectionDate);
      return d >= now && d <= limit;
    });
    if (soon.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(90deg,#fef2f2,#fef2f2)", borderBottom: "2px solid #ef4444", padding: "10px 14px", color: "#fecaca" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#f87171" } }, "\u{1F697} \u8ECA\u691C\u304C\u8FD1\u3044\u8ECA\u4E21"), soon.map((v) => {
      const days = Math.ceil((new Date(v.inspectionDate) - now) / 864e5);
      return /* @__PURE__ */ React.createElement("div", { key: v.id, style: { fontSize: 11, padding: "2px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#fca5a5", fontWeight: 700 } }, v.name), /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginLeft: 8 } }, v.inspectionDate, " (", days, "\u65E5\u5F8C)"));
    }));
  })(), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", borderBottom: "1px solid #e5e7eb", padding: "10px 14px", position: "sticky", top: 0, zIndex: 50 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 4, height: 20, background: "linear-gradient(180deg,#f97316,#ef4444)", borderRadius: 2 } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#f97316", letterSpacing: "0.12em" } }, "\u30B7\u30F3\u30BB\u30A4\u5DE5\u696D"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827" } }, "FIELD MANAGEMENT v16"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#111827" } }, user.name), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    sbServerLogout();
    setUser(null);
    setSessionToken(null);
    saveSavedUser(null);
    window.location.href = "/";
  }, style: { background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, color: "#111827", padding: "4px 8px", cursor: "pointer", fontSize: 10 } }, "\u9000\u51FA"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 3 } }, visibleTabs.map((t) => /* @__PURE__ */ React.createElement("button", { key: t, onClick: () => handleTabChange(t), style: { flex: 1, background: tab === t ? "#f97316" : "#ffffff", color: tab === t ? "#000" : "#1f2937", border: "1px solid", borderColor: tab === t ? "#f97316" : "#9ca3af", borderRadius: 6, padding: "6px 0", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", position: "relative" } }, t, t === "\u6253\u523B" && unreadHandoverCount + unreadAnnCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { position: "absolute", top: -5, right: -4, background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 8, lineHeight: "14px", minWidth: 14, textAlign: "center" } }, unreadHandoverCount + unreadAnnCount))))), tab === "\u6253\u523B" && /* [2026-05-07] 役員でも打刻可 */
  /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, (() => {
    const m = (/* @__PURE__ */ new Date()).getMonth() + 1;
    return m >= 5 && m <= 9;
  })() && /* @__PURE__ */ React.createElement(HeatGuide, null), pushStatus === "unknown" && vapidKey && /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "#60a5fa" } }, "\u{1F514} Push\u901A\u77E5\u3092\u6709\u52B9\u306B\u3059\u308B"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginTop: 2 } }, "\u30A2\u30CA\u30A6\u30F3\u30B9\u3092\u30B9\u30DE\u30DB\u306B\u5373\u901A\u77E5")), /* @__PURE__ */ React.createElement("button", { onClick: subscribePush, disabled: pushLoading, style: { background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } }, pushLoading ? "\u2026" : "\u8A31\u53EF\u3059\u308B")), pushStatus === "subscribed" && /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #22c55e44", borderRadius: 10, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#22c55e" } }, "\u{1F514} Push\u901A\u77E5 \u6709\u52B9"), /* @__PURE__ */ React.createElement("button", { onClick: unsubscribePush, disabled: pushLoading, style: { background: "transparent", border: "1px solid #d1d5db", color: "#111827", borderRadius: 6, padding: "3px 8px", fontSize: 9, cursor: "pointer" } }, "\u89E3\u9664")), pushStatus === "denied" && /* @__PURE__ */ React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #ef444433", borderRadius: 10, padding: "8px 14px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#ef4444" } }, "\u{1F515} Push\u901A\u77E5\u304C\u30D6\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u30D6\u30E9\u30A6\u30B6\u8A2D\u5B9A\u304B\u3089\u8A31\u53EF\u3057\u3066\u304F\u3060\u3055\u3044\u3002")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #a78bfa33", borderRadius: 10, marginBottom: 16, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { onClick: () => setMemoOpen((o) => !o), style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: "0.1em" } }, "\u{1F4D3} \u30DE\u30A4\u30E1\u30E2\uFF08\u672C\u4EBA\u306E\u307F\u8868\u793A\uFF09"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#111827" } }, memoOpen ? "\u25B2 \u9589\u3058\u308B" : "\u25BC \u958B\u304F")), memoOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 14px 12px" } }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: personalMemo,
      onChange: (e) => setPersonalMemo(e.target.value),
      onBlur: async () => {
        const r = await updatePersonalMemo(personalMemo);
        if (r == null ? void 0 : r.ok) showToast("\u2713 \u30E1\u30E2\u4FDD\u5B58");
      },
      placeholder: "\u81EA\u7531\u306B\u66F8\u304D\u8FBC\u3081\u307E\u3059\u3002\u4ED6\u306E\u30B9\u30BF\u30C3\u30D5\u30FB\u7BA1\u7406\u8005\u306B\u306F\u898B\u3048\u307E\u305B\u3093\u3002",
      rows: 6,
      style: { ...IS, resize: "vertical", fontSize: 12, lineHeight: 1.6 }
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #f9731633", borderRadius: 10, padding: "12px 14px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f97316", letterSpacing: "0.1em", marginBottom: 8 } }, "\u{1F4E2} \u30A2\u30CA\u30A6\u30F3\u30B9\u3092\u9001\u308B"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "text", value: annText, onChange: (e) => setAnnText(e.target.value), placeholder: "\u5168\u54E1\u306B\u4F1D\u3048\u305F\u3044\u3053\u3068\u3092\u5165\u529B\u2026", style: { ...IS, flex: 1, padding: "8px 10px", fontSize: 12 } }), /* @__PURE__ */ React.createElement("button", { onClick: submitAnnouncement, disabled: busy || !annText.trim(), style: { background: !busy && annText.trim() ? "linear-gradient(135deg,#f97316,#ef4444)" : "#e5e7eb", color: !busy && annText.trim() ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: !busy && annText.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u9001\u4FE1"))), announcements.filter((a) => !(a.hiddenBy || []).includes(user.id)).slice(0, 5).length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em" } }, "\u25A0 \u6700\u8FD1\u306E\u30A2\u30CA\u30A6\u30F3\u30B9"), unreadAnnCount > 0 && /* @__PURE__ */ React.createElement("span", { style: { background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8 } }, "NEW ", unreadAnnCount)), unreadAnnCount > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => markAllRead("announcement"), style: { background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, padding: "2px 8px", fontSize: 9, color: "#6b7280", cursor: "pointer" } }, "\u5168\u3066\u65E2\u8AAD")), announcements.filter((a) => !(a.hiddenBy || []).includes(user.id)).slice(0, 5).map((a) => {
    var _a2;
    const isUnread = !a.readBy.includes(user.id);
    return /* @__PURE__ */ React.createElement("div", { key: a.id, style: { background: isUnread ? "#fef3c7" : "#fafafa", border: `1px solid ${isUnread ? "#f9731655" : "#e5e7eb"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, transition: "background 0.4s" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, isUnread && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 8, fontWeight: 700, color: "#f97316", border: "1px solid #f97316", borderRadius: 4, padding: "0 4px", lineHeight: "14px" } }, "NEW"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: isUnread ? "#4b5563" : "#9ca3af" } }, a.author, " \xB7 ", (_a2 = a.createdAt) == null ? void 0 : _a2.slice(5, 10).replace("-", "/"))), !isUnread && !(a.author === user.name || user.role === "admin") && /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      withBusy(async () => {
        const ok = await hideAnnouncement(a.id);
        if (!ok) {
          showToast(WRITE_ERROR_MSG);
          return;
        }
        setAnnouncements((prev) => prev.map((x) => x.id === a.id ? { ...x, hiddenBy: [...x.hiddenBy || [], user.id] } : x));
        showToast("\u6D88\u3057\u307E\u3057\u305F");
      });
    }, style: { background: "transparent", border: "1px solid #d1d5db", borderRadius: 6, color: "#6b7280", cursor: "pointer", fontSize: 10, padding: "1px 8px" } }, "\u6D88\u3059"), (a.author === user.name || user.role === "admin") && /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      if (!confirm("\u3053\u306E\u30A2\u30CA\u30A6\u30F3\u30B9\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) return;
      withBusy(async () => {
        const ok = await deleteAnnouncementDB(a.id);
        if (!ok) {
          showToast(WRITE_ERROR_MSG);
          return;
        }
        setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
        showToast("\u524A\u9664\u3057\u307E\u3057\u305F");
      });
    }, style: { background: "transparent", border: "none", color: "#111827", cursor: "pointer", fontSize: 12, padding: "0 2px" } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: isUnread ? "#111827" : "#374151", fontWeight: isUnread ? 600 : 400 } }, a.text));
  })), (() => {
    const myPrompts = getProgressPromptsForOwner(user.name, projects, clockLogs, /* @__PURE__ */ new Date());
    if (myPrompts.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(135deg,#2a1a3a,#f5f3ff)", border: "1px solid #a78bfa66", borderRadius: 10, padding: "12px 14px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#c4b5fd", letterSpacing: "0.1em", marginBottom: 8 } }, "\u{1F4CB} \u9032\u6357\u78BA\u8A8D\u304A\u9858\u3044\u3057\u307E\u3059\uFF08\u5DE5\u671F\u304C\u8FD1\u3044\u6848\u4EF6\uFF09"), myPrompts.map(({ project: p, daysUntilEnd, lastClockDate }) => {
      const color = daysUntilEnd < 0 ? "#ef4444" : daysUntilEnd <= 3 ? "#f59e0b" : "#c4b5fd";
      const label = daysUntilEnd < 0 ? `${Math.abs(daysUntilEnd)}\u65E5\u8D85\u904E` : daysUntilEnd === 0 ? "\u672C\u65E5\u7D42\u4E86" : `\u3042\u3068${daysUntilEnd}\u65E5`;
      return /* @__PURE__ */ React.createElement("div", { key: p.id, onClick: () => setSelectedId(p.id), style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 6, marginBottom: 6, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#111827" } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginTop: 2 } }, "\u5DE5\u671F: ", p.endDate || "?", " ", lastClockDate && `\uFF0F \u6700\u7D42\u6253\u523B ${lastClockDate}`)), /* @__PURE__ */ React.createElement("div", { style: { color, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" } }, label));
    }));
  })(), (() => {
    const all = getProgressCheckRequests(customers, projects, progressReports, /* @__PURE__ */ new Date());
    const myItems = [...all[user.name] || [], ...user.name === "\u5DDD\u7551" ? [] : []];
    const kawabataExtra = user.name === "\u5DDD\u7551" ? all["\u5DDD\u7551"] || [] : [];
    const items = user.name === "\u5DDD\u7551" ? kawabataExtra : all[user.name] || [];
    if (items.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { style: { background: "linear-gradient(135deg,#3a2a1a,#2a1a0f)", border: "1px solid #f9731666", borderRadius: 10, padding: "12px 14px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fdba74", letterSpacing: "0.1em", marginBottom: 8 } }, "\u{1F4CA} \u4ECA\u65E5\u306E\u9032\u6357\u5831\u544A\uFF08", items.length, "\u4EF6\uFF09"), items.map((item) => {
      const { project: p, customer: c, checkType, lastReport } = item;
      return /* @__PURE__ */ React.createElement("div", { key: p.id, onClick: () => {
        setReportingItem(item);
        setReportPercent((lastReport == null ? void 0 : lastReport.percent) || 50);
        setReportComment("");
      }, style: { padding: "10px", background: "rgba(0,0,0,0.3)", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #f9731622" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#fde68a" } }, c.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginTop: 2 } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#6b7280", marginTop: 2 } }, checkType === "\u5BA2\u5148\u5171\u6709" ? "\u{1F535} \u5BA2\u5148\u5171\u6709\u65E5" : checkType === "\u4E00\u6589\u78BA\u8A8D" ? "\u{1F4E3} \u4F1A\u793E\u304B\u3089\u306E\u78BA\u8A8D\u4F9D\u983C" : "\u{1F512} \u5185\u90E8\u78BA\u8A8D\u65E5", lastReport && ` \uFF0F \u524D\u56DE: ${lastReport.percent}% (${dateStrJST(lastReport.reportedAt)})`, p.status === "\u5B8C\u4E86" && " \uFF0F \u2705\u5B8C\u4E86\u6E08")), /* @__PURE__ */ React.createElement("div", { style: { color: "#f97316", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 } }, "\u5831\u544A \u2192")));
    }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#6b7280", marginTop: 4, lineHeight: 1.5 } }, "\u203B \u9001\u4FE1\u5F8C\u306F\u4FEE\u6B63\u3067\u304D\u307E\u305B\u3093\u3002\u614E\u91CD\u306B\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"));
  })(), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em" } }, "\u25A0 \u73FE\u5834\u3092\u9078\u629E"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowQuickAdd(!showQuickAdd), style: { background: "#f0fdf4", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "3px 10px", fontSize: 9, fontWeight: 700, cursor: "pointer" } }, showQuickAdd ? "\u2715 \u9589\u3058\u308B" : "\uFF0B \u73FE\u5834\u8FFD\u52A0")), showQuickAdd && /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #22c55e33", borderRadius: 10, padding: "12px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("input", { type: "text", placeholder: "\u73FE\u5834\u540D", value: qf.name, onChange: (e) => setQf((f) => ({ ...f, name: e.target.value })), style: { ...IS, flex: 1, padding: "8px 10px", fontSize: 12 } }), /* @__PURE__ */ React.createElement("select", { value: qf.lead, onChange: (e) => setQf((f) => ({ ...f, lead: e.target.value })), style: { ...IS, width: 80, padding: "8px 6px", fontSize: 12 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u9867\u5BA2"), customers.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.name }, c.name))), user.role === "admin" && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
    setShowAddCustomer(true);
    setNewCustomerForm({ name: "", contact: "", phone: "" });
  }, style: { background: "#f0fdf4", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "0 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, "\uFF0B")), /* @__PURE__ */ React.createElement("button", { onClick: submitQuickProject, disabled: busy || !qf.name, style: { width: "100%", background: !busy && qf.name ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#e5e7eb", color: !busy && qf.name ? "#000" : "#9ca3af", border: "none", borderRadius: 6, padding: "8px", fontSize: 12, fontWeight: 700, cursor: !busy && qf.name ? "pointer" : "not-allowed" } }, busy ? "\u51E6\u7406\u4E2D\u2026" : "\u8FFD\u52A0\u3059\u308B")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 } }, projects.filter((p) => p.status !== "\u5B8C\u4E86").slice().sort((a, b) => getProjectLastActivity(b, { progressReports, expenseItems, additionalWorks, clockLogs }) - getProjectLastActivity(a, { progressReports, expenseItems, additionalWorks, clockLogs })).map((p) => {
    var _a2, _b, _c;
    const isSel = selectedId === p.id;
    const isReady = p.status === "\u6E96\u5099\u4E2D";
    const myLog = clockLogs.find((l) => l.userId === user.id && l.projectId === p.id && isTodayOrActiveNight(l) && !l.clockOut);
    return /* @__PURE__ */ React.createElement("div", { key: p.id, onClick: isReady ? void 0 : () => setSelectedId(isSel ? null : p.id), style: { background: isSel ? "#fef3c7" : "#fafafa", border: "1px solid", borderColor: isSel ? "#f97316" : "#e5e7eb", borderRadius: 10, padding: "12px 14px", cursor: isReady ? "not-allowed" : "pointer", opacity: isReady ? 0.45 : 1, transition: "all 0.15s" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, myLog && /* @__PURE__ */ React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: isSel ? "#111827" : "#374151" } }, p.name)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827" } }, "\u9867\u5BA2: ", p.lead || "\u672A\u5B9A")), myLog ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#60a5fa", background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" } }, "\u51FA\u52E4\u4E2D ", timeStr(myLog.clockIn), "\u301C") : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: (_a2 = STATUS_CFG[p.status]) == null ? void 0 : _a2.color, background: (_b = STATUS_CFG[p.status]) == null ? void 0 : _b.dim, border: `1px solid ${(_c = STATUS_CFG[p.status]) == null ? void 0 : _c.color}44`, borderRadius: 4, padding: "2px 8px" } }, p.status)));
  }))), selectedId && /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "text", value: clockRemarks, onChange: (e) => setClockRemarks(e.target.value), placeholder: "\u5099\u8003\uFF08\u4EFB\u610F\uFF09", style: { ...IS, padding: "8px 10px", fontSize: 12, marginBottom: 8 } }), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u5916\u6CE8\uFF08\u4EFB\u610F\uFF09"), clockSubs.map((sub, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 6, marginBottom: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "text", value: sub.companyName, onChange: (e) => {
    const v = [...clockSubs];
    v[i].companyName = e.target.value;
    setClockSubs(v);
  }, placeholder: "\u4F1A\u793E\u540D", style: { ...IS, flex: 1, padding: "7px 10px", fontSize: 12 } }), /* @__PURE__ */ React.createElement("input", { type: "number", value: sub.headcount, onChange: (e) => {
    const v = [...clockSubs];
    v[i].headcount = e.target.value;
    setClockSubs(v);
  }, min: "1", style: { ...IS, width: 50, padding: "7px 6px", fontSize: 12, textAlign: "center" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#6b7280" } }, "\u4EBA"), clockSubs.length > 1 && /* @__PURE__ */ React.createElement("button", { onClick: () => setClockSubs((prev) => prev.filter((_, j) => j !== i)), style: { background: "transparent", border: "none", color: "#111827", cursor: "pointer", fontSize: 14, padding: "0 4px" } }, "\u2715"))), /* @__PURE__ */ React.createElement("button", { onClick: () => setClockSubs((prev) => [...prev, { companyName: "", headcount: "0" }]), style: { background: "transparent", color: "#a78bfa", border: "1px dashed #a78bfa44", borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", width: "100%" } }, "\uFF0B \u5916\u6CE8\u5148\u3092\u8FFD\u52A0"))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, selectedId ? /* @__PURE__ */ React.createElement(
    ClockButton,
    {
      user,
      projectId: selectedId,
      clockLogs,
      onClock: handleClock,
      hourlyLeft: Math.max(0, 35 - (((_a = leaveBalances.find((b) => b.staffId === user.id && b.type === "paid")) == null ? void 0 : _a.hourlyUsed) || 0)),
      siteCoords: (() => {
        const p = projects.find((p2) => p2.id === selectedId);
        return p && p.siteLat != null && p.siteLng != null ? { lat: p.siteLat, lng: p.siteLng } : null;
      })(),
      siteHasAddress: !!((projects.find((p) => p.id === selectedId) || {}).address || "").trim(),
      onRegisterSite: async (address, coords) => {
        const pid = selectedId;
        const r = await registerSiteLocation(pid, address, coords);
        if (!r) return false;
        setProjects((prev) => prev.map((p) => p.id === pid ? { ...p, address: r.address || address, siteLat: r.lat == null ? null : Number(r.lat), siteLng: r.lng == null ? null : Number(r.lng) } : p));
        return true;
      }
    }
  ) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "2px dashed #d1d5db", borderRadius: 10, padding: "16px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#111827", marginBottom: 4 } }, "\u73FE\u5834\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#d1d5db" } }, "\u6253\u523B\u306B\u306F\u73FE\u5834\u306E\u9078\u629E\u304C\u5FC5\u9808\u3067\u3059"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u4ECA\u65E5\u306E\u6253\u523B\u5C65\u6B74"), clockLogs.filter((l) => l.userId === user.id && isTodayOrActiveNight(l)).length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", textAlign: "center", padding: "12px 0" } }, "\u6253\u523B\u304C\u3042\u308A\u307E\u305B\u3093") : clockLogs.filter((l) => l.userId === user.id && isTodayOrActiveNight(l)).map((l) => {
    var _a2, _b;
    const proj = projects.find((p) => p.id === l.projectId);
    const night = !!l.isNightShift;
    const worked = l.clockOut ? (night ? calcNightWorkedHours(l.clockIn, l.clockOut) : calcWorkedHours(l.clockIn, l.clockOut)).toFixed(1) : null;
    const ot = !night && l.clockOut ? overtimeOfLog(l, clockLogs) : 0;
    return /* @__PURE__ */ React.createElement("div", { key: l.id, style: { background: "#fafafa", border: night ? "1px solid #6366f155" : "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, night && /* @__PURE__ */ React.createElement("span", { style: { color: "#6366f1" } }, "\u{1F319} "), (proj == null ? void 0 : proj.name) || "\u4E0D\u660E"), /* @__PURE__ */ React.createElement("span", { style: { color: night ? "#818cf8" : "#60a5fa", fontFamily: "'JetBrains Mono',monospace", fontSize: 11 } }, night ? fmtNightRange(l.clockIn, l.clockOut, "\u7A3C\u50CD\u4E2D") : `${timeStr(l.clockIn)} \u2192 ${l.clockOut ? timeStr(l.clockOut) : "\u7A3C\u50CD\u4E2D"}`)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, fontSize: 10 } }, worked && /* @__PURE__ */ React.createElement("span", { style: { color: "#f97316", fontFamily: "'JetBrains Mono',monospace" } }, "\u5B9F\u50CD ", worked, "h"), ot > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#ef4444", fontFamily: "'JetBrains Mono',monospace" } }, "\u6B8B\u696D ", ot.toFixed(1), "h"), l.locationName ? /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u{1F4CD}", l.locationName) : l.coordsIn && /* @__PURE__ */ React.createElement("span", { style: { color: "#111827", fontFamily: "'JetBrains Mono',monospace", fontSize: 9 } }, "\u{1F4CD}", (_a2 = l.coordsIn.lat) == null ? void 0 : _a2.toFixed(3), ",", (_b = l.coordsIn.lng) == null ? void 0 : _b.toFixed(3))), l.remarks && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginTop: 3 } }, "\u{1F4DD} ", l.remarks), l.note && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f59e0b", marginTop: 3 } }, "\u26A0 GPS\u7406\u7531: ", l.note));
  })), (() => {
    const memberLogs = staff.filter((s) => s.id !== user.id && s.role !== "admin").map((s) => {
      const todayLogs = clockLogs.filter((l) => l.userId === s.id && isTodayOrActiveNight(l));
      const latest = todayLogs.sort((a, b) => (b.clockIn || "").localeCompare(a.clockIn || ""))[0] || null;
      return { staff: s, log: latest };
    }).filter((m) => m.log);
    if (memberLogs.length === 0) return null;
    const catColor = { "\u73FE\u5834\u7D42\u4E86": "#22c55e", "\u4F1A\u793E\u90FD\u5408": "#60a5fa", "\u672C\u4EBA\u90FD\u5408": "#f59e0b" };
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 20, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u672C\u65E5\u306E\u30E1\u30F3\u30D0\u30FC\u72B6\u6CC1"), memberLogs.map(({ staff: s, log: l }) => {
      const proj = projects.find((p) => p.id === l.projectId);
      const isWorking = !l.clockOut;
      return /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, isWorking && /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#374151" } }, s.name)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: isWorking ? "#60a5fa" : "#9ca3af" } }, timeStr(l.clockIn), " \u2192 ", l.clockOut ? timeStr(l.clockOut) : /* @__PURE__ */ React.createElement("span", { style: { color: "#22c55e", fontWeight: 700 } }, "\u52E4\u52D9\u4E2D"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginTop: 3 } }, (proj == null ? void 0 : proj.name) || "\u73FE\u5834\u4E0D\u660E", l.early_leave_category && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 8, color: catColor[l.early_leave_category] || "#6b7280" } }, "[", l.early_leave_category, "] ", l.early_leave_reason)));
    }));
  })(), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em" } }, "\u25A0 \u76F4\u8FD1\u306E\u6253\u523B\u5C65\u6B74"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    var _a2;
    setShowClockFix("new");
    setClockFixForm({ projectId: ((_a2 = projects[0]) == null ? void 0 : _a2.id) || "", clockIn: "", clockOut: "", reason: "", osType: "", osCount: 1, earlyStart: false });
  }, style: { background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 6, padding: "3px 10px", fontSize: 9, fontWeight: 700, cursor: "pointer" } }, "\uFF0B \u6253\u523B\u3092\u8FFD\u52A0")), clockLogs.filter((l) => l.userId === user.id && l.clockIn).sort((a, b) => (b.clockIn || "").localeCompare(a.clockIn || "")).slice(0, 7).map((l) => {
    const proj = projects.find((p) => p.id === l.projectId);
    const myMod = clockMods.find((m) => m.clockLogId === l.id && m.status === "pending");
    return /* @__PURE__ */ React.createElement("div", { key: l.id, style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#374151", fontWeight: 600 } }, l.clockIn ? dateStrJST(l.clockIn) : ""), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#6b7280", marginLeft: 8 } }, (proj == null ? void 0 : proj.name) || "\u4E0D\u660E")), myMod ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#f59e0b", background: "#fef3c7", padding: "2px 8px", borderRadius: 10 } }, "\u7533\u8ACB\u4E2D") : /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setShowClockFix(l);
      setClockFixForm({ projectId: l.projectId, clockIn: toLocalDtInput(l.clockIn), clockOut: toLocalDtInput(l.clockOut), reason: "", osType: l.outsourceType || "", osCount: l.outsourceCount || 1, earlyStart: !!l.earlyStart });
    }, style: { background: "transparent", border: "1px solid #9ca3af", borderRadius: 6, color: "#6b7280", fontSize: 9, padding: "2px 8px", cursor: "pointer" } }, "\u4FEE\u6B63")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginTop: 4 } }, "\u51FA\u52E4 ", l.clockIn ? timeStr(l.clockIn) : "--:--", " \u2192 \u9000\u52E4 ", l.clockOut ? timeStr(l.clockOut) : "--:--", l.note && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 8, color: "#111827" } }, "(", l.note, ")"), l.outsourceType && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 8, color: "#7c3aed" } }, "\u{1F91D}", outsourceLabel(l.outsourceType, l.outsourceCount))));
  }), clockLogs.filter((l) => l.userId === user.id).length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", textAlign: "center", padding: 20 } }, "\u6253\u523B\u5C65\u6B74\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093"), clockMods.filter((m) => m.userId === user.id && m.status === "pending").length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f59e0b", letterSpacing: "0.1em", marginBottom: 6 } }, "\u25A0 \u7533\u8ACB\u4E2D\u306E\u4FEE\u6B63"), clockMods.filter((m) => m.userId === user.id && m.status === "pending").map((m) => /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: "#fef3c7", border: "1px solid #f59e0b33", borderRadius: 8, padding: "8px 12px", marginBottom: 4, fontSize: 11 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#f59e0b" } }, m.type === "new" ? "\u65B0\u898F\u8FFD\u52A0" : "\u6642\u523B\u4FEE\u6B63", " \u2014 ", m.projectName || "\u4E0D\u660E"), m.outsourceChanged && /* @__PURE__ */ React.createElement("div", { style: { color: "#7c3aed", marginTop: 2 } }, "\u5916\u6CE8: ", outsourceLabel(m.originalOutsourceType, m.originalOutsourceCount), " \u2192 ", outsourceLabel(m.requestedOutsourceType, m.requestedOutsourceCount)), /* @__PURE__ */ React.createElement("div", { style: { color: "#6b7280", marginTop: 2 } }, "\u7406\u7531: ", m.reason))))), showClockFix && /* @__PURE__ */ React.createElement(Modal, { title: showClockFix === "new" ? "\u6253\u523B\u3092\u8FFD\u52A0" : "\u6253\u523B\u3092\u4FEE\u6B63", accent: "#60a5fa", onClose: () => setShowClockFix(null) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u73FE\u5834" }, /* @__PURE__ */ React.createElement("select", { value: clockFixForm.projectId, onChange: (e) => setClockFixForm((f) => ({ ...f, projectId: e.target.value })), style: IS }, projects.filter((p) => p.status !== "\u5B8C\u4E86").map((p) => /* @__PURE__ */ React.createElement("option", { key: p.id, value: p.id }, p.name)))), /* @__PURE__ */ React.createElement(Field, { label: "\u51FA\u52E4\u6642\u523B" }, /* @__PURE__ */ React.createElement("input", { type: "datetime-local", value: clockFixForm.clockIn, onChange: (e) => setClockFixForm((f) => ({ ...f, clockIn: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u9000\u52E4\u6642\u523B" }, /* @__PURE__ */ React.createElement("input", { type: "datetime-local", value: clockFixForm.clockOut, onChange: (e) => setClockFixForm((f) => ({ ...f, clockOut: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#111827", background: clockFixForm.earlyStart ? "#fff7ed" : "#fafafa", border: clockFixForm.earlyStart ? "2px solid #fb923c" : "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!clockFixForm.earlyStart, onChange: (e) => setClockFixForm((f) => ({ ...f, earlyStart: e.target.checked })), style: { width: 20, height: 20 } }), "\u23F0 \u65E9\u51FA\uFF088:00\u3088\u308A\u524D\u304B\u3089\u50CD\u3044\u305F\uFF09"), /* @__PURE__ */ React.createElement(Field, { label: "\u5916\u6CE8" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, [["", "\u306A\u3057"], ["support", "\u5FDC\u63F4"], ["subcontract", "\u8ACB\u8CA0"]].map(([v, lb]) => /* @__PURE__ */ React.createElement("button", { key: v, type: "button", onClick: () => setClockFixForm((f) => ({ ...f, osType: v })), style: { flex: 1, padding: "10px 4px", borderRadius: 8, border: (clockFixForm.osType || "") === v ? "2px solid #a78bfa" : "1px solid #d1d5db", background: (clockFixForm.osType || "") === v ? "#f5f3ff" : "#fafafa", color: "#111827", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, lb))), clockFixForm.osType && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#374151" } }, "\u4EBA\u6570"), /* @__PURE__ */ React.createElement("input", { type: "number", min: 1, max: 20, value: clockFixForm.osCount, onChange: (e) => {
    const v = Math.floor(Number(e.target.value) || 1);
    setClockFixForm((f) => ({ ...f, osCount: Math.min(20, Math.max(1, v)) }));
  }, style: { ...IS, width: 80, textAlign: "center" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#374151" } }, "\u4EBA"))), /* @__PURE__ */ React.createElement(Field, { label: "\u4FEE\u6B63\u7406\u7531 *" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: clockFixForm.reason, onChange: (e) => setClockFixForm((f) => ({ ...f, reason: e.target.value })), placeholder: "\u4F8B: \u6253\u523B\u5FD8\u308C\u3001\u6642\u523B\u9593\u9055\u3044\u7B49", style: IS })), /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
    var _a2, _b;
    if (!clockFixForm.reason.trim()) {
      showToast("\u4FEE\u6B63\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    if (!clockFixForm.clockIn) {
      showToast("\u51FA\u52E4\u6642\u523B\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    if (clockFixForm.earlyStart && new Date(clockFixForm.clockIn).getHours() >= 8) {
      showToast("\u65E9\u51FA\u306F8:00\u3088\u308A\u524D\u306E\u51FA\u52E4\u6642\u523B\u3092\u5165\u308C\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    const proj = projects.find((p) => p.id === clockFixForm.projectId);
    const mod = {
      id: crypto.randomUUID(),
      type: showClockFix === "new" ? "new" : "edit",
      clockLogId: showClockFix === "new" ? null : showClockFix.id,
      userId: user.id,
      userName: user.name,
      projectId: clockFixForm.projectId,
      projectName: (proj == null ? void 0 : proj.name) || "",
      originalClockIn: showClockFix === "new" ? null : showClockFix.clockIn,
      originalClockOut: showClockFix === "new" ? null : showClockFix.clockOut,
      requestedClockIn: new Date(clockFixForm.clockIn).toISOString(),
      requestedClockOut: clockFixForm.clockOut ? new Date(clockFixForm.clockOut).toISOString() : null,
      reason: clockFixForm.reason,
      requestedBy: user.id,
      earlyStart: !!clockFixForm.earlyStart
      // [2026-10-14] 早出
    };
    const origOsType = showClockFix === "new" ? null : showClockFix.outsourceType || null;
    const origOsCount = showClockFix === "new" ? null : (_a2 = showClockFix.outsourceCount) != null ? _a2 : null;
    const reqOsType = clockFixForm.osType || null;
    const reqOsCount = reqOsType ? Number(clockFixForm.osCount) || 1 : null;
    mod.outsourceChanged = reqOsType !== origOsType || reqOsType !== null && reqOsCount !== Number(origOsCount);
    mod.originalOutsourceType = origOsType;
    mod.originalOutsourceCount = origOsCount;
    mod.requestedOutsourceType = reqOsType;
    mod.requestedOutsourceCount = reqOsCount;
    const res = await apiGateway("submit_clock_modification", { mod });
    if (!res || !res.ok) {
      showToast(res && res.error ? "\u26A0 " + res.error : WRITE_ERROR_MSG);
      return;
    }
    const auto = ((_b = res.result) == null ? void 0 : _b.autoApproved) === true;
    setClockMods((prev) => [{ ...mod, status: auto ? "approved" : "pending", createdAt: (/* @__PURE__ */ new Date()).toISOString() }, ...prev]);
    if (auto) {
      const c = await loadClockLogs(clockLogsInitialSinceIso());
      if (c) setClockLogs(c);
    }
    setShowClockFix(null);
    showToast(auto ? "\u2713 \u6253\u523B\u3092\u4FEE\u6B63\u3057\u307E\u3057\u305F" : "\u4FEE\u6B63\u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\uFF08\u7BA1\u7406\u8005\u304C\u78BA\u8A8D\u3057\u307E\u3059\uFF09");
  }), disabled: busy || !clockFixForm.reason.trim() || !clockFixForm.clockIn, style: { background: !busy && clockFixForm.reason.trim() && clockFixForm.clockIn ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : "#e5e7eb", color: !busy && clockFixForm.reason.trim() && clockFixForm.clockIn ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: !busy && clockFixForm.reason.trim() && clockFixForm.clockIn ? "pointer" : "not-allowed" } }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FEE\u6B63\u3059\u308B")))), tab === "\u6848\u4EF6\u4E00\u89A7" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { padding: "12px 14px", borderBottom: "1px solid #fafafa", display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" } }, ["\u5168\u3066", ...STATUSES].map((s) => /* @__PURE__ */ React.createElement("button", { key: s, onClick: () => setFilterSt(s), style: { background: filterSt === s ? "#f97316" : "#f9fafb", color: filterSt === s ? "#000" : "#9ca3af", border: "1px solid", borderColor: filterSt === s ? "#f97316" : "#d1d5db", borderRadius: 16, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" } }, s)), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal("addProject"), style: { marginLeft: "auto", background: "#f0fdf4", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer" } }, "\uFF0B \u8FFD\u52A0")), filtered.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "20px", textAlign: "center", color: "#111827", fontSize: 11 } }, "\u8A72\u5F53\u3059\u308B\u6848\u4EF6\u304C\u3042\u308A\u307E\u305B\u3093"), filtered.map((p) => {
    var _a2, _b, _c;
    const actual = calcNinkuFromLogs(p.id);
    const cfg = STATUS_CFG[p.status];
    const isOpen = selectedId === p.id;
    const working = clockLogs.filter((l) => l.projectId === p.id && isTodayOrActiveNight(l) && !l.clockOut);
    const projHandovers = handoverMemos.filter((m) => m.projectId === p.id);
    return /* @__PURE__ */ React.createElement("div", { key: p.id }, /* @__PURE__ */ React.createElement("div", { onClick: () => setSelectedId(isOpen ? null : p.id), style: { padding: compactMode ? "7px 14px" : "14px 14px", borderBottom: "1px solid #f9fafb", cursor: "pointer", background: isOpen ? "#fafafa" : "transparent", borderLeft: isOpen ? "3px solid #f97316" : "3px solid transparent", transition: "all 0.1s" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: compactMode ? 0 : 8 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: compactMode ? 0 : 2, flexWrap: "wrap" } }, working.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: compactMode ? 12 : 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: compactMode ? "nowrap" : "normal", maxWidth: compactMode ? "60vw" : "none" } }, p.name), projHandovers.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#60a5fa", background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 4, padding: "1px 5px" } }, "\u5F15\u7D99", projHandovers.length)), !compactMode && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827" } }, p.lead || "\u9867\u5BA2\u672A\u5B9A", p.customerContact && ` \uFF0F \u62C5\u5F53: ${p.customerContact}`)), /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
      e.stopPropagation();
      const i = STATUSES.indexOf(p.status);
      const next = STATUSES[(i + 1) % STATUSES.length];
      if (!window.confirm(`\u30B9\u30C6\u30FC\u30BF\u30B9\u3092\u300C${p.status}\u300D\u2192\u300C${next}\u300D\u306B\u5909\u66F4\u3057\u307E\u3059\u3002
\u5168\u54E1\u306E\u30A2\u30D7\u30EA\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`)) return;
      withBusy(async () => {
        setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x));
        await updateProjectStatus(p.id, next);
        showToast(`\u30B9\u30C6\u30FC\u30BF\u30B9 \u2192 ${next}`);
      });
    }, style: { background: cfg == null ? void 0 : cfg.dim, color: cfg == null ? void 0 : cfg.color, border: `1px solid ${cfg == null ? void 0 : cfg.color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700, flexShrink: 0, marginLeft: 8, cursor: "pointer" } }, p.status)), !compactMode && /* @__PURE__ */ React.createElement(NinkuBar, { actual, target: Math.round(calcTargetMandays(p) * 10) / 10, breakeven: calcBreakevenMandays(p, ninkuSettings) }), !compactMode && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: "#111827" } }, /* @__PURE__ */ React.createElement("span", null, "\u3006 ", p.endDate || "\u672A\u5B9A", working.length > 0 && /* @__PURE__ */ React.createElement("span", { style: { color: "#22c55e", marginLeft: 8 } }, "\u25CF ", working.length, "\u540D\u7A3C\u50CD\u4E2D")))), isOpen && /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", borderBottom: "1px solid #e5e7eb", padding: "14px" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em" } }, "\u25A0 \u6848\u4EF6\u60C5\u5831"), /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
      e.stopPropagation();
      setAdminPf({ name: p.name, client: p.client || "", status: p.status || "\u6E96\u5099\u4E2D", lead: p.lead || "", startDate: p.startDate || "", endDate: p.endDate || "", estimate: String(p.estimate || ""), contractAmount: String(p.contractAmount || ""), targetNinku: String(p.targetNinku || ""), contractType: p.contractType || "", workCategory: p.workCategory || "", address: p.address || "", customerContact: p.customerContact || "", internalOwner: p.internalOwner || "", invoiceSettled: !!p.invoiceSettled, workDetails: p.workDetails || "" });
      setEditProjectId(p.id);
      setModal("editProject");
    }, style: { background: "#f0fdf4", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 6, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer" } }, "\u270F \u7DE8\u96C6")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u9867\u5BA2: "), /* @__PURE__ */ React.createElement("span", { style: { color: "#374151" } }, p.lead || "\u672A\u5B9A")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u5951\u7D04: "), /* @__PURE__ */ React.createElement("span", { style: { color: p.contractType === "\u8ACB\u8CA0" ? "#22c55e" : p.contractType === "\u5FDC\u63F4" ? "#60a5fa" : "#9ca3af" } }, p.contractType || "\u672A\u8A2D\u5B9A")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u5143\u8ACB\u62C5\u5F53\u8005: "), /* @__PURE__ */ React.createElement("span", { style: { color: "#374151" } }, p.customerContact || "\u672A\u8A2D\u5B9A")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u73FE\u5834\u62C5\u5F53\u8005: "), /* @__PURE__ */ React.createElement("span", { style: { color: "#60a5fa" } }, p.internalOwner || "\u672A\u8A2D\u5B9A")), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "span 2" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u4F4F\u6240: "), /* @__PURE__ */ React.createElement("span", { style: { color: "#374151" } }, p.address || "\u672A\u8A2D\u5B9A")), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "span 2" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u5DE5\u671F: "), /* @__PURE__ */ React.createElement("span", { style: { color: "#374151", fontFamily: "'JetBrains Mono',monospace" } }, p.startDate || "?", " \u301C ", p.endDate || "\u672A\u5B9A"))), p.workDetails && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginBottom: 4 } }, "\u{1F4CB} \u5DE5\u4E8B\u8A73\u7D30"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 } }, p.workDetails))), /* @__PURE__ */ React.createElement(BudgetSummary, { project: p, clockLogs, settings: ninkuSettings }), (() => {
      const projLogs = clockLogs.filter((l) => l.projectId === p.id && l.clockOut);
      return projLogs.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u4EBA\u5DE5\u5B9F\u7E3E\uFF08\u6253\u523B\u30D9\u30FC\u30B9\uFF09"), [...projLogs].filter((l) => l.clockIn).sort((a, b) => (b.clockIn || "").localeCompare(a.clockIn || "")).slice(0, 10).map((l) => {
        const ot = l.isNightShift ? 0 : overtimeOfLog(l, clockLogs);
        const ninku = 1 + Math.floor(ot / 4);
        return /* @__PURE__ */ React.createElement("div", { key: l.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", borderRadius: 6, padding: "8px 12px", fontSize: 11, marginBottom: 5 } }, /* @__PURE__ */ React.createElement("div", null, l.isNightShift && /* @__PURE__ */ React.createElement("span", { style: { color: "#6366f1", marginRight: 3 } }, "\u{1F319}"), /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginRight: 8 } }, dateMDJST(l.clockIn).replace("-", "/")), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600 } }, l.userName)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, ot > 0 && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#ef4444" } }, "\u6B8B", ot.toFixed(1), "h"), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", color: "#f97316", fontWeight: 700 } }, ninku)));
      }), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "right", fontSize: 10, color: "#111827", marginTop: 6 } }, "\u5408\u8A08: ", /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", color: "#f97316", fontWeight: 700, fontSize: 13 } }, actual), " / \u76EE\u6A19 ", calcTargetMandays(p).toFixed(1), " \u4EBA\u5DE5")) : null;
    })(), (() => {
      const memos = handoverMemos.filter((m) => m.projectId === p.id).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 864e5).toISOString();
      const recent = memos.filter((m) => (m.createdAt || "") >= thirtyDaysAgoIso);
      const older = memos.filter((m) => (m.createdAt || "") < thirtyDaysAgoIso);
      const showOld = showOldMemos[p.id];
      const renderMemo = (m, muted) => /* @__PURE__ */ React.createElement("div", { key: m.id, style: { background: muted ? "#e5e7eb" : "#fafafa", border: `1px solid ${muted ? "#e5e7eb" : "#60a5fa22"}`, borderRadius: 6, padding: "8px 12px", fontSize: 11, marginBottom: 5, opacity: muted ? 0.7 : 1 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: muted ? "#9ca3af" : "#60a5fa" } }, m.author, " \xB7 ", (m.createdAt || "").slice(0, 10)), (m.author === user.name || user.role === "admin") && /* @__PURE__ */ React.createElement("button", { onClick: (e) => {
        e.stopPropagation();
        if (!confirm("\u3053\u306E\u30E1\u30E2\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) return;
        withBusy(async () => {
          const ok = await deleteHandoverMemoDB(m.id);
          if (!ok) {
            showToast(WRITE_ERROR_MSG);
            return;
          }
          setHandoverMemos((prev) => prev.filter((x) => x.id !== m.id));
          showToast("\u524A\u9664\u3057\u307E\u3057\u305F");
        });
      }, style: { background: "transparent", border: "none", color: "#111827", cursor: "pointer", fontSize: 12, padding: "0 4px" } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { color: muted ? "#4b5563" : "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 } }, m.text), m.imageUrl && /* @__PURE__ */ React.createElement("img", { src: m.imageUrl, alt: "\u6DFB\u4ED8\u5199\u771F", onClick: () => setLightboxImg(m.imageUrl), style: { maxWidth: "100%", maxHeight: 200, borderRadius: 6, marginTop: 6, cursor: "zoom-in" } }));
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#60a5fa", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u5F15\u7D99\u304E\u30E1\u30E2 (", memos.length, ")"), recent.map((m) => renderMemo(m, false)), memos.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#9ca3af", textAlign: "center", padding: "4px 0" } }, "\u5F15\u7D99\u304E\u30E1\u30E2\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093"), recent.length === 0 && older.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", textAlign: "center", padding: "4px 0" } }, "\u76F4\u8FD130\u65E5\u306E\u30E1\u30E2\u306A\u3057"), older.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowOldMemos((o) => ({ ...o, [p.id]: !o[p.id] })), style: { width: "100%", background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa22", borderRadius: 6, padding: "6px", fontSize: 11, cursor: "pointer", marginTop: 4, fontWeight: 700 } }, showOld ? `\u25B2 \u53E4\u3044\u30E1\u30E2\u3092\u96A0\u3059\uFF08${older.length}\u4EF6\uFF09` : `\u25BC \u904E\u53BB\u306E\u30E1\u30E2\u3092\u898B\u308B\uFF08${older.length}\u4EF6\uFF09`), showOld && older.map((m) => renderMemo(m, true))), /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setAddHmText("");
        setAddHmPhoto(null);
        setModal("addHandoverMemo");
      }, style: { width: "100%", background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 } }, "\uFF0B \u5F15\u7D99\u304E\u30E1\u30E2\u30FB\u5199\u771F\u3092\u8FFD\u52A0"));
    })(), (() => {
      const projSubs = subcontractors.filter((s) => s.projectId === p.id);
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#a78bfa", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u5916\u6CE8"), projSubs.map((s) => {
        var _a3;
        return /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: "#fafafa", borderRadius: 6, padding: "8px 12px", fontSize: 11, marginBottom: 5 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginRight: 8 } }, (_a3 = s.date) == null ? void 0 : _a3.slice(5).replace("-", "/")), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 600, color: "#a78bfa" } }, s.companyName), s.memo && /* @__PURE__ */ React.createElement("span", { style: { color: "#111827", marginLeft: 6 } }, "\u2014 ", s.memo)), /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", color: "#a78bfa", fontWeight: 700 } }, s.headcount, "\u4EBA\u5DE5")), s.workers && /* @__PURE__ */ React.createElement("div", { style: { color: "#6b7280", fontSize: 10, marginTop: 3 } }, "\u{1F477} ", s.workers));
      }), projSubs.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#9ca3af", textAlign: "center", padding: "4px 0" } }, "\u5916\u6CE8\u306E\u8A18\u9332\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093"), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal("addSubcontractor"), style: { width: "100%", background: "#f5f3ff", color: "#a78bfa", border: "1px solid #a78bfa44", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 } }, "\uFF0B \u5916\u6CE8\u3092\u8FFD\u52A0"));
    })(), (() => {
      const projAddWorks = additionalWorks.filter((w) => w.projectId === p.id);
      const open = !!addWorksOpen[p.id];
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { onClick: () => setAddWorksOpen((o) => ({ ...o, [p.id]: !o[p.id] })), style: { display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#f59e0b", letterSpacing: "0.1em", marginBottom: open ? 8 : 0, cursor: "pointer", userSelect: "none" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9 } }, open ? "\u25BC" : "\u25B6"), /* @__PURE__ */ React.createElement("span", null, "\u25A0 \u8FFD\u52A0\u5DE5\u4E8B\uFF08", projAddWorks.length, "\u4EF6\uFF09")), open && /* @__PURE__ */ React.createElement(React.Fragment, null, projAddWorks.map((w) => /* @__PURE__ */ React.createElement("div", { key: w.id, style: { background: "#fafafa", borderRadius: 6, padding: "8px 12px", fontSize: 11, marginBottom: 5 } }, (w.floor || w.location) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f59e0b", marginBottom: 2 } }, w.floor && `${w.floor}F`, w.location && ` ${w.location}`), /* @__PURE__ */ React.createElement("div", { style: { color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 } }, w.description), w.imageUrl && /* @__PURE__ */ React.createElement("img", { src: w.imageUrl, alt: "\u6DFB\u4ED8\u5199\u771F", onClick: () => setLightboxImg(w.imageUrl), style: { maxWidth: "100%", maxHeight: 200, borderRadius: 6, marginTop: 6, cursor: "zoom-in" } }))), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal("addAdditionalWork"), style: { width: "100%", background: "#fef3c7", color: "#f59e0b", border: "1px solid #f59e0b44", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginTop: 4 } }, "\uFF0B \u8FFD\u52A0\u5DE5\u4E8B\u3092\u8FFD\u52A0")));
    })(), (() => {
      const specs = projectSpecs.filter((s) => s.projectId === p.id);
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#60a5fa", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 \u4ED5\u69D8\u30FB\u6570\u91CF\u8868"), specs.map((s) => {
        var _a3;
        return /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: "#fafafa", borderRadius: 6, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#60a5fa", fontWeight: 600 } }, s.fileName || "\u{1F4DD} \u30C6\u30AD\u30B9\u30C8\u30E1\u30E2"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#111827" } }, s.uploadedBy)), s.fileUrl && (s.fileUrl.toLowerCase().endsWith(".pdf") || ((_a3 = s.fileName) == null ? void 0 : _a3.toLowerCase().endsWith(".pdf")) ? /* @__PURE__ */ React.createElement("a", { href: s.fileUrl, target: "_blank", rel: "noopener", style: { display: "block", background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 6, padding: "10px 12px", marginBottom: 6, color: "#60a5fa", fontSize: 12, textDecoration: "none" } }, "\u{1F4C4} ", s.fileName || "PDF", " \u2014 \u30BF\u30C3\u30D7\u3057\u3066\u958B\u304F") : /* @__PURE__ */ React.createElement("img", { src: s.fileUrl, alt: s.fileName, onClick: () => setLightboxImg(s.fileUrl), style: { maxWidth: "100%", maxHeight: 200, borderRadius: 6, marginBottom: 6, cursor: "zoom-in" } })), /* @__PURE__ */ React.createElement("textarea", { value: s.specText || "", onChange: (e) => {
          const newText = e.target.value;
          setProjectSpecs((prev) => prev.map((x) => x.id === s.id ? { ...x, specText: newText } : x));
        }, onBlur: async (e) => {
          const text = e.target.value;
          const ok = await upsertProjectSpec({ id: s.id, projectId: p.id, specText: text });
          if (ok) showToast("\u2713 \u4FDD\u5B58\u3057\u307E\u3057\u305F");
          else showToast(WRITE_ERROR_MSG);
        }, rows: 4, placeholder: "\u4ED5\u69D8\u30FB\u6570\u91CF\u3092\u5165\u529B\u2026", style: { ...IS, resize: "vertical", fontSize: 11, lineHeight: 1.6 } }));
      }), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*,application/pdf", id: `specInput-${p.id}`, style: { display: "none" }, onChange: async (e) => {
        var _a3;
        const file = (_a3 = e.target.files) == null ? void 0 : _a3[0];
        if (!file) return;
        setSpecUploading(true);
        try {
          const isImage = file.type.startsWith("image/");
          const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
          let fileUrl = "", specText = "", uploadName = file.name;
          if (isImage) {
            const r = await resizeImageFile(file);
            const base64 = r.base64, mediaType = r.type;
            uploadName = r.name;
            fileUrl = await uploadFieldPhoto(base64, uploadName, mediaType) || "";
          } else if (isPdf) {
            if (file.size > 20 * 1024 * 1024) {
              showToast("\u26A0 20MB\u3092\u8D85\u3048\u3066\u3044\u307E\u3059");
              setSpecUploading(false);
              e.target.value = "";
              return;
            }
            fileUrl = await uploadFileDirect(file) || "";
            if (!fileUrl) {
              showToast("\u26A0 PDF\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
              setSpecUploading(false);
              e.target.value = "";
              return;
            }
          } else {
            const reader = new FileReader();
            const base64 = await new Promise((res, rej) => {
              reader.onload = () => res(reader.result.split(",")[1]);
              reader.onerror = rej;
              reader.readAsDataURL(file);
            });
            fileUrl = await uploadFieldPhoto(base64, file.name, file.type || "application/octet-stream") || "";
          }
          const spec = { projectId: p.id, fileName: uploadName, fileUrl, specText, uploadedBy: user.name };
          await upsertProjectSpec(spec);
          const refreshed = await loadProjectSpecs();
          setProjectSpecs(refreshed || []);
          showToast(fileUrl ? "\u2713 \u30D5\u30A1\u30A4\u30EB\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F" : "\u2713 \u30C6\u30AD\u30B9\u30C8\u62BD\u51FA\u306E\u307F\uFF08\u30D5\u30A1\u30A4\u30EB\u4FDD\u5B58\u5931\u6557\uFF09");
        } catch (err) {
          showToast("\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
        }
        setSpecUploading(false);
        e.target.value = "";
      } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => document.getElementById(`specInput-${p.id}`).click(), disabled: specUploading, style: { flex: 1, background: specUploading ? "#e5e7eb" : "#eff6ff", color: specUploading ? "#9ca3af" : "#60a5fa", border: "1px solid #60a5fa44", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: specUploading ? "not-allowed" : "pointer" } }, specUploading ? "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u4E2D\u2026" : "\u{1F4CE} \u30D5\u30A1\u30A4\u30EB\u8FFD\u52A0"), /* @__PURE__ */ React.createElement("button", { disabled: busy, onClick: () => withBusy(async () => {
        const spec = { projectId: p.id, fileName: "", fileUrl: "", specText: "", uploadedBy: user.name };
        await upsertProjectSpec(spec);
        const refreshed = await loadProjectSpecs();
        setProjectSpecs(refreshed || []);
        showToast("\u2713 \u30E1\u30E2\u3092\u8FFD\u52A0");
      }), style: { flex: 1, background: busy ? "#e5e7eb" : "#eff6ff", color: busy ? "#9ca3af" : "#a78bfa", border: "1px solid #a78bfa44", borderRadius: 8, padding: "8px", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer" } }, busy ? "\u51E6\u7406\u4E2D\u2026" : "\u{1F4DD} \u30C6\u30AD\u30B9\u30C8\u30E1\u30E2\u8FFD\u52A0")));
    })(), false, /* @__PURE__ */ React.createElement("div", { style: { marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 10 } }, "\u25A0 \u56F3\u9762\u30C7\u30FC\u30BF"), drawings[p.id] === void 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#9ca3af" } }, "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026"), ((_a2 = drawings[p.id]) == null ? void 0 : _a2.length) === 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#9ca3af" } }, "\u56F3\u9762\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093"), ((_b = drawings[p.id]) == null ? void 0 : _b.filter((d) => d.fileType === "image").length) > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 } }, drawings[p.id].filter((d) => d.fileType === "image").map((d) => /* @__PURE__ */ React.createElement("div", { key: d.id, style: { position: "relative" } }, /* @__PURE__ */ React.createElement("img", { src: d.fileData, alt: d.fileName, onClick: () => setLightboxImg(d.fileData), style: { width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #d1d5db", cursor: "zoom-in" } }), (d.uploadedBy === user.id || user.role === "admin") && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (!window.confirm("\u3053\u306E\u56F3\u9762\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) return;
      withBusy(async () => {
        await deleteDrawing(p.id, d.id);
      });
    }, style: { position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", color: "#fff", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer", lineHeight: "20px", textAlign: "center" } }, "\u2715")))), (_c = drawings[p.id]) == null ? void 0 : _c.filter((d) => d.fileType === "pdf").map((d) => /* @__PURE__ */ React.createElement("div", { key: d.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("a", { href: d.fileData, target: "_blank", rel: "noopener", style: { fontSize: 12, color: "#60a5fa", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "\u{1F4C4} ", d.fileName), (d.uploadedBy === user.id || user.role === "admin") && /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (!window.confirm("\u3053\u306E\u56F3\u9762\u3092\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F")) return;
      withBusy(async () => {
        await deleteDrawing(p.id, d.id);
      });
    }, style: { background: "transparent", border: "none", color: "#111827", cursor: "pointer", fontSize: 12, padding: "0 2px", flexShrink: 0, marginLeft: 8 } }, "\u2715"))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ React.createElement("input", { ref: drawingFileRef, type: "file", accept: "image/*,application/pdf", onChange: (e) => handleDrawingFile(e, p.id), style: { display: "none" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      var _a3;
      return (_a3 = drawingFileRef.current) == null ? void 0 : _a3.click();
    }, style: { background: "#fafafa", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px", fontSize: 10, cursor: "pointer" } }, "\u{1F4D0} \u56F3\u9762\u3092\u8FFD\u52A0\uFF08\u753B\u50CF/PDF\uFF09")))));
  })), tab === "\u4F11\u6687\u7BA1\u7406" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 10 } }, "\u25A0 ", user.name, "\u3055\u3093\u306E\u6709\u7D66\u6B8B\u65E5\u6570"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "'JetBrains Mono',monospace", fontSize: 36, fontWeight: 700, color: "#22c55e", lineHeight: 1 } }, paidTotal - paidUsed(user.id)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: "#111827", marginBottom: 6 } }, "\u65E5 / ", paidTotal, "\u65E5")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 10 } }, "\u4ED8\u4E0E", paidInfo.granted, "\u65E5", paidInfo.carried > 0 ? ` + \u7E70\u8D8A${paidInfo.carried}\u65E5` : "", " \u2212 \u4F7F\u7528", paidUsed(user.id), "\u65E5"), /* @__PURE__ */ React.createElement("div", { style: { height: 6, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${(paidTotal - paidUsed(user.id)) / paidTotal * 100}%`, background: "linear-gradient(90deg,#22c55e88,#22c55e)", transition: "width 0.4s" } })), /* @__PURE__ */ React.createElement("button", { onClick: () => setModal("leave"), style: { width: "100%", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#000", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\uFF0B \u4F11\u6687\u30FB\u52E4\u6020\u3092\u7533\u8ACB\u3059\u308B")), (() => {
    const allWorks = getAvailableFurikaeWorks(user.id, leaveData);
    const sundayWorks = allWorks.filter((w) => w.holidayType === "sunday");
    const saturdayWorks = allWorks.filter((w) => w.holidayType === "saturday");
    const approvedAll = (leaveData[user.id] || []).filter((l) => l.type === "holiday" && l.status === "\u627F\u8A8D");
    const saturdayBuyouts = approvedAll.filter((l) => l.holidayType === "saturday" && l.holidayPref === "\u8CB7\u53D6\u5E0C\u671B");
    const longWorks = approvedAll.filter((l) => l.holidayType === "obon" || l.holidayType === "newyear");
    const longCarry = longWorks.filter((l) => l.holidayPref === "\u6709\u7D66\u7E70\u8D8A");
    const longCarryDays = longCarry.reduce((a, l) => a + Number(l.days || 0), 0);
    const expiryAlerts = getFurikaeAlerts(user.id);
    if (sundayWorks.length === 0 && saturdayWorks.length === 0 && saturdayBuyouts.length === 0 && longWorks.length === 0) return null;
    const sumDays = (arr) => arr.reduce((a, l) => a + Number(l.days || 0), 0);
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 } }, expiryAlerts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f59e0b", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 6, padding: "6px 10px" } }, "\u23F0 \u632F\u66FF\u4F11\u65E5\u306E\u671F\u9650\u304C\u8FD1\u3044\u3082\u306E\u304C\u3042\u308A\u307E\u3059\uFF08", expiryAlerts.length, "\u4EF6\uFF09"), sundayWorks.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 4 } }, "\u25A0 \u6CD5\u5B9A\u4F11\u65E5\u51FA\u52E4\uFF08\u65E5\u66DC\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginBottom: 2 } }, "\u632F\u66FF\u6B8B: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#60a5fa" } }, sumDays(sundayWorks), "\u65E5")), sundayWorks.map((w) => {
      const exp = addThreeMonths(w.date);
      const dl = Math.ceil((exp - /* @__PURE__ */ new Date()) / 864e5);
      return /* @__PURE__ */ React.createElement("div", { key: w.id, style: { fontSize: 10, color: "#6b7280", marginLeft: 8 } }, "\u{1F4C5} ", w.date, "\u51FA\u52E4 \u2192 \u671F\u9650", dateStrJST(exp), "\uFF08\u6B8B", dl, "\u65E5\uFF09");
    })), (saturdayWorks.length > 0 || saturdayBuyouts.length > 0) && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f97316", fontWeight: 700, marginBottom: 4 } }, "\u25A0 \u6240\u5B9A\u4F11\u65E5\u51FA\u52E4\uFF08\u571F\u66DC\uFF09"), saturdayWorks.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginBottom: 2 } }, "\u632F\u66FF\u6B8B: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#60a5fa" } }, sumDays(saturdayWorks), "\u65E5")), saturdayWorks.map((w) => {
      const exp = addThreeMonths(w.date);
      const dl = Math.ceil((exp - /* @__PURE__ */ new Date()) / 864e5);
      return /* @__PURE__ */ React.createElement("div", { key: w.id, style: { fontSize: 10, color: "#6b7280", marginLeft: 8 } }, "\u{1F4C5} ", w.date, "\u51FA\u52E4\uFF08", w.days, "\u65E5\uFF09 \u2192 \u671F\u9650", dateStrJST(exp), "\uFF08\u6B8B", dl, "\u65E5\uFF09");
    })), saturdayBuyouts.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginBottom: 2 } }, "\u8CB7\u53D6: \u8A08", sumDays(saturdayBuyouts), "\u65E5\uFF08", saturdayBuyouts.map((b) => `${b.date}(${b.days}\u65E5)`).join("\u3001"), "\uFF09"))), longWorks.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#a78bfa", fontWeight: 700, marginBottom: 4 } }, "\u25A0 \u9577\u671F\u4F11\u6687\u51FA\u52E4\uFF08\u304A\u76C6\u30FB\u5E74\u672B\u5E74\u59CB\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827", marginBottom: 2 } }, "\u6709\u7D66\u7E70\u8D8A: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#22c55e" } }, longCarryDays, "\u65E5")), longWorks.map((w) => /* @__PURE__ */ React.createElement("div", { key: w.id, style: { fontSize: 10, color: "#6b7280", marginLeft: 8 } }, "\u{1F4C5} ", w.date, "\u51FA\u52E4\uFF08", HOLIDAY_TYPE_LABEL[w.holidayType], "\u30FB", w.days, "\u65E5\uFF09"))));
  })(), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 10 } }, "\u25A0 \u7533\u8ACB\u5C65\u6B74"), (leaveData[user.id] || []).length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", textAlign: "center", padding: "12px 0" } }, "\u7533\u8ACB\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093") : [...leaveData[user.id] || []].sort((a, b) => b.date.localeCompare(a.date)).map((l) => {
    const lt = LEAVE_TYPES.find((t) => t.id === l.type);
    const sc = l.status === "\u627F\u8A8D" ? "#22c55e" : l.status === "\u5374\u4E0B" ? "#ef4444" : "#f59e0b";
    return /* @__PURE__ */ React.createElement("div", { key: l.id, style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", null, lt == null ? void 0 : lt.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: lt == null ? void 0 : lt.color } }, lt == null ? void 0 : lt.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#111827" } }, l.days, "\u65E5")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: sc, background: `${sc}22`, border: `1px solid ${sc}44`, borderRadius: 4, padding: "2px 8px", fontWeight: 700 } }, l.status)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#111827" } }, l.date, l.type === "furikae" && l.holidayWorkId && (() => {
      const origin = (leaveData[user.id] || []).find((x) => x.id === l.holidayWorkId);
      return origin ? /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, color: "#60a5fa", fontSize: 10 } }, "\u2190 ", origin.date, "\u51FA\u52E4\u5206") : null;
    })(), l.type === "holiday" && l.holidayType && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, color: "#f97316", fontSize: 10 } }, "(", HOLIDAY_TYPE_LABEL[l.holidayType], l.holidayPref === "\u8CB7\u53D6\u5E0C\u671B" ? " \u8CB7\u53D6" : l.holidayPref === "\u632F\u4F11\u5E0C\u671B" ? " \u632F\u4F11" : l.holidayPref === "\u6709\u7D66\u7E70\u8D8A" ? " \u6709\u7D66\u7E70\u8D8A" : "", l.days && l.days !== 1 ? ` ${l.days}\u65E5` : "", ")"), l.memo && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 8, color: "#111827" } }, "\u2014 ", l.memo)));
  }))), tab === "\u540D\u523A" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 12 } }, "\u25A0 \u540D\u523A\u7BA1\u7406"), /* @__PURE__ */ React.createElement("input", { type: "text", value: contactSearch, onChange: (e) => setContactSearch(e.target.value), placeholder: "\u540D\u524D\u30FB\u4F1A\u793E\u3067\u691C\u7D22\u2026", style: { ...IS, marginBottom: 12, padding: "9px 12px", fontSize: 12 } }), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", id: "ocrInput", style: { display: "none" }, onChange: async (e) => {
    var _a2, _b, _c;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      const resp = await callClaudeProxy({ action: "ocr_meishi", imageBase64: base64, mediaType });
      if (!resp.ok) throw new Error("OCR API\u30A8\u30E9\u30FC");
      const data = await resp.json();
      const text = ((_c = (_b = data.content) == null ? void 0 : _b[0]) == null ? void 0 : _c.text) || "";
      const clean = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(clean);
      const photoUrl = await uploadFieldPhoto(base64, file.name, mediaType) || dataUrl;
      setContactForm2((f) => ({ ...f, name: parsed.name || f.name, company: parsed.company || f.company, phone: parsed.phone || f.phone, email: parsed.email || f.email, address: parsed.address || f.address, notes: parsed.notes || f.notes, photoUrl }));
      showToast("\u2713 \u540D\u523A\u3092\u8AAD\u307F\u53D6\u308A\u307E\u3057\u305F");
    } catch (err) {
      showToast("\u540D\u523A\u306E\u8AAD\u307F\u53D6\u308A\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
    }
    setOcrLoading(false);
    e.target.value = "";
  } }), /* @__PURE__ */ React.createElement("button", { onClick: () => document.getElementById("ocrInput").click(), disabled: ocrLoading, style: { width: "100%", background: ocrLoading ? "#e5e7eb" : "linear-gradient(135deg,#a78bfa,#7c3aed)", color: ocrLoading ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: ocrLoading ? "not-allowed" : "pointer" } }, ocrLoading ? "\u{1F4F7} \u8AAD\u307F\u53D6\u308A\u4E2D\u2026" : "\u{1F4F7} \u540D\u523A\u3092\u64AE\u5F71\u3057\u3066OCR")), /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#f97316", marginBottom: 10 } }, editContactId ? "\u270F \u7DE8\u96C6" : "\uFF0B \u540D\u523A\u3092\u8FFD\u52A0"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u30AB\u30C6\u30B4\u30EA"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, ["\u9867\u5BA2", "\u5354\u529B\u4F1A\u793E"].map((cat) => /* @__PURE__ */ React.createElement("button", { key: cat, type: "button", onClick: () => setContactForm2((f) => ({ ...f, category: cat })), style: { flex: 1, background: contactForm.category === cat ? cat === "\u9867\u5BA2" ? "#f97316" : "#a78bfa" : "#e5e7eb", color: contactForm.category === cat ? "#000" : "#6b7280", border: "1px solid", borderColor: contactForm.category === cat ? cat === "\u9867\u5BA2" ? "#f97316" : "#a78bfa" : "#d1d5db", borderRadius: 6, padding: "7px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" } }, cat)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u540D\u523A\u753B\u50CF"), /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", id: "contactPhotoInput", style: { display: "none" }, onChange: async (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64Body = String(reader.result).split(",")[1] || "";
      const url = await uploadFieldPhoto(b64Body, file.name, file.type);
      if (url) setContactForm2((f) => ({ ...f, photoUrl: url }));
      else {
        setContactForm2((f) => ({ ...f, photoUrl: reader.result }));
        showToast("\u753B\u50CF\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u5931\u6557\u3002\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3059");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  } }), contactForm.photoUrl ? /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement("img", { src: contactForm.photoUrl, alt: "\u540D\u523A", style: { maxWidth: "100%", maxHeight: 160, borderRadius: 8, border: "1px solid #d1d5db" } }), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setContactForm2((f) => ({ ...f, photoUrl: "" })), style: { position: "absolute", top: 4, right: 4, background: "#000a", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12 } }, "\u2715")) : /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => document.getElementById("contactPhotoInput").click(), style: { width: "100%", background: "#eff6ff", color: "#60a5fa", border: "1px dashed #60a5fa44", borderRadius: 8, padding: "12px", fontSize: 11, cursor: "pointer" } }, "\u{1F4F7} \u540D\u523A\u753B\u50CF\u3092\u8FFD\u52A0")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u6C0F\u540D *"), /* @__PURE__ */ React.createElement("input", { type: "text", value: contactForm.name, onChange: (e) => setContactForm2((f) => ({ ...f, name: e.target.value })), placeholder: "\u5C71\u7530 \u592A\u90CE", style: IS })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u4F1A\u793E\u540D"), /* @__PURE__ */ React.createElement("input", { type: "text", value: contactForm.company, onChange: (e) => setContactForm2((f) => ({ ...f, company: e.target.value })), placeholder: "\u25CB\u25CB\u5DE5\u696D", style: IS })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u96FB\u8A71\u756A\u53F7"), /* @__PURE__ */ React.createElement("input", { type: "tel", value: contactForm.phone, onChange: (e) => setContactForm2((f) => ({ ...f, phone: e.target.value })), placeholder: "090-xxxx-xxxx", style: IS })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u30E1\u30FC\u30EB"), /* @__PURE__ */ React.createElement("input", { type: "email", value: contactForm.email, onChange: (e) => setContactForm2((f) => ({ ...f, email: e.target.value })), placeholder: "xxx@example.com", style: IS }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u4F4F\u6240"), /* @__PURE__ */ React.createElement("input", { type: "text", value: contactForm.address, onChange: (e) => setContactForm2((f) => ({ ...f, address: e.target.value })), placeholder: "\u57FC\u7389\u770C\u516B\u6F6E\u5E02\u2026", style: IS })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#111827", marginBottom: 3 } }, "\u30E1\u30E2"), /* @__PURE__ */ React.createElement("input", { type: "text", value: contactForm.notes, onChange: (e) => setContactForm2((f) => ({ ...f, notes: e.target.value })), placeholder: "\u73FE\u5834\u76E3\u7763\u30FB\u25CB\u25CB\u5DE5\u4E8B\u62C5\u5F53", style: IS })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
    if (!contactForm.name) return;
    if (editContactId) {
      const ok = await updateContactDB(editContactId, contactForm);
      if (!ok) return;
      setContacts((prev) => prev.map((c) => c.id === editContactId ? { ...c, ...contactForm } : c));
      showToast("\u2713 \u66F4\u65B0\u3057\u307E\u3057\u305F");
    } else {
      const nc = { id: uid(), ...contactForm, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      const ok = await insertContact(nc);
      if (!ok) return;
      setContacts((prev) => [nc, ...prev]);
      showToast("\u2713 \u540D\u523A\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
    }
    setContactForm2({ name: "", company: "", phone: "", email: "", address: "", notes: "", photoUrl: "", category: "\u9867\u5BA2" });
    setEditContactId(null);
  }), disabled: !contactForm.name || busy, style: { flex: 1, background: contactForm.name && !busy ? "linear-gradient(135deg,#f97316,#ef4444)" : "#e5e7eb", color: contactForm.name && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: contactForm.name && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : editContactId ? "\u66F4\u65B0\u3059\u308B" : "\u8FFD\u52A0\u3059\u308B"), editContactId && /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setEditContactId(null);
    setContactForm2({ name: "", company: "", phone: "", email: "", address: "", notes: "", photoUrl: "", category: "\u9867\u5BA2" });
  }, style: { background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "11px 14px", fontSize: 12, cursor: "pointer" } }, "\u30AD\u30E3\u30F3\u30BB\u30EB")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, marginBottom: 10 } }, [["all", "\u5168\u3066"], ["\u9867\u5BA2", "\u9867\u5BA2"], ["\u5354\u529B\u4F1A\u793E", "\u5354\u529B\u4F1A\u793E"]].map(([key, label]) => {
    const cnt = key === "all" ? contacts.length : contacts.filter((c) => c.category === key).length;
    return /* @__PURE__ */ React.createElement("button", { key, onClick: () => setContactCategoryFilter(key), style: { flex: 1, background: contactCategoryFilter === key ? "#f97316" : "#f9fafb", color: contactCategoryFilter === key ? "#000" : "#6b7280", border: "1px solid", borderColor: contactCategoryFilter === key ? "#f97316" : "#e5e7eb", borderRadius: 6, padding: "6px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer" } }, label, "(", cnt, ")");
  })), contacts.filter((c) => (!contactSearch || c.name.includes(contactSearch) || c.company.includes(contactSearch)) && (contactCategoryFilter === "all" || c.category === contactCategoryFilter)).map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, c.photoUrl && /* @__PURE__ */ React.createElement("img", { src: c.photoUrl, alt: c.name, onClick: () => setLightboxImg(c.photoUrl), style: { width: 60, height: 60, objectFit: "cover", borderRadius: 6, cursor: "zoom-in", flexShrink: 0, border: "1px solid #d1d5db" } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: c.category === "\u5354\u529B\u4F1A\u793E" ? "#a78bfa" : "#f97316", background: c.category === "\u5354\u529B\u4F1A\u793E" ? "#eff6ff" : "#fef3c7", border: `1px solid ${c.category === "\u5354\u529B\u4F1A\u793E" ? "#a78bfa44" : "#f9731644"}`, borderRadius: 3, padding: "1px 5px", fontWeight: 700, flexShrink: 0 } }, c.category || "\u9867\u5BA2")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827" } }, c.name), c.company && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280" } }, c.company)), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setEditContactId(c.id);
    setContactForm2({ name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address, notes: c.notes, photoUrl: c.photoUrl || "", category: c.category || "\u9867\u5BA2" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, style: { background: "#eff6ff", color: "#60a5fa", border: "1px solid #60a5fa33", borderRadius: 6, padding: "4px 10px", fontSize: 10, cursor: "pointer", flexShrink: 0 } }, "\u7DE8\u96C6")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: "#111827" } }, c.phone && /* @__PURE__ */ React.createElement("span", null, "\u{1F4DE} ", c.phone), c.email && /* @__PURE__ */ React.createElement("span", null, "\u2709 ", c.email), c.address && /* @__PURE__ */ React.createElement("span", null, "\u{1F4CD} ", c.address)), c.notes && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginTop: 4 } }, "\u{1F4DD} ", c.notes)))))), tab === "\u7814\u4FEE" && training && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 10 } }, "\u25A0 \u793E\u5185\u7814\u4FEE"), (() => {
    const done = training.responses.filter((r) => r.confirmed).length;
    const total = training.questions.length;
    const fin = !!training.completedAt;
    return /* @__PURE__ */ React.createElement("div", { style: { background: fin ? "#f0fdf4" : "#fafafa", border: `1px solid ${fin ? "#22c55e44" : "#e5e7eb"}`, borderRadius: 10, padding: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, marginBottom: 8 } }, training.training.title), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: training.pastDeadline && !fin ? "#ef4444" : "#6b7280", marginBottom: 10, lineHeight: 1.8 } }, "\u7DE0\u5207: ", fmtTrainingDeadline(training.training.deadline), training.pastDeadline && !fin && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("br", null), "\u7DE0\u5207\u3092\u904E\u304E\u3066\u3044\u307E\u3059\u3002\u56DE\u7B54\u3059\u308B\u307E\u3067\u6253\u523B\u4EE5\u5916\u306F\u4F7F\u3048\u307E\u305B\u3093\u3002")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", null, done, " / ", total, " \u554F"), /* @__PURE__ */ React.createElement("span", null, fin ? "\u5B8C\u4E86" : `\u6B8B\u308A${total - done}\u554F`)), /* @__PURE__ */ React.createElement("div", { style: { height: 5, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { height: "100%", width: `${total ? done / total * 100 : 0}%`, background: fin ? "#22c55e" : "#2563eb", borderRadius: 999 } })), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (fin) {
            setTrainingReview(true);
          } else {
            setTrainingDismissed(false);
            setTab("\u6253\u523B");
          }
        },
        style: {
          width: "100%",
          minHeight: 52,
          border: "none",
          borderRadius: 8,
          padding: 14,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          background: fin ? "#ffffff" : "#2563eb",
          color: fin ? "#111827" : "#ffffff",
          borderWidth: fin ? 1 : 0,
          borderStyle: fin ? "solid" : "none",
          borderColor: "#9ca3af"
        }
      },
      fin ? "\u30DF\u30CB\u6559\u6750\u30FB\u30DD\u30A4\u30F3\u30C8\u3092\u898B\u308B" : done > 0 ? "\u7D9A\u304D\u304B\u3089\u56DE\u7B54\u3059\u308B" : "\u7814\u4FEE\u3092\u59CB\u3081\u308B"
    ));
  })()), tab === "\u30A2\u30F3\u30B1\u30FC\u30C8" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 10 } }, "\u25A0 \u30A2\u30F3\u30B1\u30FC\u30C8\u4E00\u89A7"), mySurveys.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#111827", padding: "40px 0", fontSize: 12 } }, "\u73FE\u5728\u516C\u958B\u4E2D\u306E\u30A2\u30F3\u30B1\u30FC\u30C8\u306F\u3042\u308A\u307E\u305B\u3093") : (
    // [2026-04-29] state ベースに書き換え。全質問入力完了まで送信ボタン disabled
    mySurveys.map((s) => {
      const myResp = surveyResponses.find((r) => r.surveyId === s.id && r.staffId === user.id);
      const answered = !!myResp;
      const minOf = (q) => Number(q && q.minChars) || 0;
      const isFilled = (v, q) => {
        const t = String(v == null ? "" : v).trim();
        return t !== "" && t.length >= minOf(q);
      };
      const ans = surveyAnswers[s.id] || {};
      const totalQ = (s.questions || []).length;
      const filledQ = (s.questions || []).filter((q, qi) => isFilled(ans[qi], q)).length;
      const allAnswered = filledQ === totalQ && totalQ > 0;
      const remaining = totalQ - filledQ;
      const canEdit = !s.deadline || todayStr() < s.deadline;
      const editing = !!surveyEditing[s.id];
      const showForm = !answered || editing;
      return /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: answered && !editing ? "#f0fdf4" : "#fafafa", border: `1px solid ${answered && !editing ? "#22c55e44" : "#e5e7eb"}`, borderRadius: 10, padding: "14px", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 } }, s.title), answered ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#22c55e", background: "#f0fdf4", border: "1px solid #22c55e44", borderRadius: 4, padding: "2px 8px", fontWeight: 700, whiteSpace: "nowrap" } }, "\u2713 \u56DE\u7B54\u6E08\u307F") : /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: allAnswered ? "#22c55e" : "#f59e0b", background: allAnswered ? "#f0fdf4" : "#fef3c7", border: `1px solid ${allAnswered ? "#22c55e44" : "#f59e0b44"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" } }, filledQ, "/", totalQ, " \u56DE\u7B54")), s.deadline && (answered ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: canEdit ? "#22c55e" : "#6b7280", fontWeight: 700, marginBottom: 8 } }, canEdit ? `\u2713 \u56DE\u7B54\u6E08\u307F\uFF08${dateMDJST(s.deadline).replace("-", "/")}\u306E\u524D\u65E5\u307E\u3067\u66F8\u304D\u76F4\u305B\u307E\u3059\uFF09` : "\u56DE\u7B54\u671F\u9650\u3092\u904E\u304E\u305F\u305F\u3081\u3001\u66F8\u304D\u76F4\u3057\u306F\u3067\u304D\u307E\u305B\u3093") : /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 8 } }, "\u23F0 \u56DE\u7B54\u671F\u9650: ", dateMDJST(s.deadline).replace("-", "/"), "\uFF08\u671F\u9650\u3092\u904E\u304E\u308B\u3068\u56DE\u7B54\u3059\u308B\u307E\u3067\u6253\u523B\u4EE5\u5916\u304C\u4F7F\u3048\u307E\u305B\u3093\uFF09")), (s.questions || []).map((q, qi) => {
        var _a2;
        const v = ans[qi];
        const filled = isFilled(v, q);
        return /* @__PURE__ */ React.createElement("div", { key: qi, style: { marginBottom: showForm ? 14 : 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: showForm ? 13 : 11, fontWeight: showForm ? 700 : 400, color: showForm && !filled ? "#f59e0b" : "#374151", marginBottom: 4, lineHeight: 1.6 } }, "Q", qi + 1, ". ", q.text, " ", showForm && !filled && /* @__PURE__ */ React.createElement("span", { style: { color: "#f59e0b", fontWeight: 700, fontSize: 11 } }, "* \u5FC5\u9808")), showForm && q.note && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginBottom: 6, lineHeight: 1.7 } }, "\u203B", q.note), !showForm ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4b5563", background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "7px 10px", whiteSpace: "pre-wrap" } }, ((_a2 = myResp.answers) == null ? void 0 : _a2[qi]) || "\u2014") : /* @__PURE__ */ React.createElement(React.Fragment, null, q.type === "text" && /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: v || "",
            rows: 4,
            onChange: (e) => setSurveyAnswers((p) => ({ ...p, [s.id]: { ...p[s.id] || {}, [qi]: e.target.value } })),
            style: { ...IS, fontSize: 16, padding: "11px 12px", lineHeight: 1.7, resize: "vertical", minHeight: 96, borderColor: filled ? "#d1d5db" : "#f59e0b66" }
          }
        ), q.type === "text" && minOf(q) > 0 && (() => {
          const len = String(v == null ? "" : v).trim().length;
          const ok = len >= minOf(q);
          return /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: ok ? "#22c55e" : "#f59e0b", marginTop: 4, textAlign: "right" } }, ok ? len + "\u6587\u5B57 \u2713" : len + " / " + minOf(q) + "\u6587\u5B57\uFF08\u3042\u3068" + (minOf(q) - len) + "\u6587\u5B57\uFF09");
        })(), q.type === "select" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } }, (q.options || []).map((opt, oi) => {
          const sel = v === opt;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: oi,
              type: "button",
              onClick: () => setSurveyAnswers((p) => ({ ...p, [s.id]: { ...p[s.id] || {}, [qi]: opt } })),
              style: { background: sel ? "#22c55e" : "#e5e7eb", border: `1px solid ${sel ? "#22c55e" : "#d1d5db"}`, borderRadius: 6, color: sel ? "#000" : "#111827", padding: "6px 12px", fontSize: 12, fontWeight: sel ? 700 : 400, cursor: "pointer" }
            },
            opt
          );
        }))));
      }), showForm && /* @__PURE__ */ React.createElement("button", { disabled: busy || !allAnswered, onClick: () => withBusy(async () => {
        const cur = surveyAnswers[s.id] || {};
        const missing = (s.questions || []).filter((q, qi) => !isFilled(cur[qi], q));
        if (missing.length > 0) {
          showToast("\u672A\u56DE\u7B54\u3001\u307E\u305F\u306F\u6587\u5B57\u6570\u304C\u8DB3\u308A\u306A\u3044\u8CEA\u554F\u304C\u3042\u308A\u307E\u3059");
          return;
        }
        const ok = await submitSurveyResponse(s.id, cur);
        if (!ok) {
          showToast(WRITE_ERROR_MSG);
          return;
        }
        const fresh = await loadSurveyResponses();
        setSurveyResponses(fresh || []);
        setSurveyAnswers((p) => {
          const cp = { ...p };
          delete cp[s.id];
          return cp;
        });
        setSurveyEditing((p) => {
          const cp = { ...p };
          delete cp[s.id];
          return cp;
        });
        showToast(editing ? "\u2713 \u66F8\u304D\u76F4\u3057\u307E\u3057\u305F" : "\u2713 \u30A2\u30F3\u30B1\u30FC\u30C8\u306B\u56DE\u7B54\u3057\u307E\u3057\u305F");
      }), style: { width: "100%", background: busy || !allAnswered ? "#e5e7eb" : "linear-gradient(135deg,#22c55e,#16a34a)", color: busy || !allAnswered ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "14px", fontSize: 14, fontWeight: 700, cursor: busy || !allAnswered ? "not-allowed" : "pointer", marginTop: 6 } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : !allAnswered ? `\u3042\u3068 ${remaining} \u554F` : editing ? "\u66F8\u304D\u76F4\u3057\u3092\u4FDD\u5B58\u3059\u308B" : "\u56DE\u7B54\u3059\u308B"), showForm && editing && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setSurveyEditing((p) => {
          const cp = { ...p };
          delete cp[s.id];
          return cp;
        });
        setSurveyAnswers((p) => {
          const cp = { ...p };
          delete cp[s.id];
          return cp;
        });
      }, style: { background: "transparent", border: "none", color: "#9ca3af", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: "10px 14px" } }, "\u66F8\u304D\u76F4\u3057\u3092\u3084\u3081\u308B")), answered && !editing && canEdit && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setSurveyAnswers((p) => ({ ...p, [s.id]: { ...myResp.answers || {} } }));
        setSurveyEditing((p) => ({ ...p, [s.id]: true }));
      }, style: { width: "100%", background: "#ffffff", color: "#111827", border: "1px solid #9ca3af", borderRadius: 8, padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 6 } }, "\u4FEE\u6B63\u3059\u308B"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 6 } }, /* @__PURE__ */ React.createElement("button", { disabled: busy, onClick: () => withBusy(async () => {
        if (!window.confirm("\u56DE\u7B54\u3092\u53D6\u308A\u6D88\u3057\u307E\u3059\u3002\u66F8\u3044\u305F\u5185\u5BB9\u306F\u6D88\u3048\u307E\u3059\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F")) return;
        const ok = await deleteMySurveyResponse(s.id);
        if (!ok) {
          showToast(WRITE_ERROR_MSG);
          return;
        }
        const fresh = await loadSurveyResponses();
        setSurveyResponses(fresh || []);
        showToast("\u2713 \u56DE\u7B54\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F");
      }), style: { background: "transparent", border: "none", color: "#9ca3af", fontSize: 11, textDecoration: "underline", cursor: busy ? "wait" : "pointer", padding: "10px 14px" } }, "\u56DE\u7B54\u3092\u53D6\u308A\u6D88\u3059"))));
    })
  )), tab === "AI\u30C1\u30E3\u30C3\u30C8" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16, display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 8 } }, "\u25A0 AI\u306B\u8CEA\u554F\uFF08\u672C\u65E5 ", aiTodayCount, "/", AI_DAILY_LIMIT, "\u56DE\uFF09"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", marginBottom: 12 } }, aiMessages.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#111827", padding: "40px 0", fontSize: 12 } }, "\u81EA\u5206\u306E\u6253\u523B\u30FB\u4F11\u6687\u30C7\u30FC\u30BF\u306B\u3064\u3044\u3066\u8CEA\u554F\u3067\u304D\u307E\u3059"), aiMessages.map((m, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { marginBottom: 8, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", background: m.role === "user" ? "#a78bfa22" : "#fafafa", border: `1px solid ${m.role === "user" ? "#a78bfa44" : "#d1d5db"}`, color: "#111827" } }, m.text))), aiLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#a78bfa", fontSize: 12, padding: 8 } }, "\u8003\u3048\u4E2D\u2026")), aiTodayCount >= AI_DAILY_LIMIT ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#ef4444", fontSize: 12, padding: 12 } }, "\u672C\u65E5\u306E\u8CEA\u554F\u56DE\u6570\u4E0A\u9650\u306B\u9054\u3057\u307E\u3057\u305F\uFF08", AI_DAILY_LIMIT, "\u56DE/\u65E5\uFF09") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "text", value: aiQuestion, onChange: (e) => setAiQuestion(e.target.value), onKeyDown: (e) => {
    if (e.key === "Enter") runAiChat();
  }, placeholder: "\u8CEA\u554F\u3092\u5165\u529B\u2026", style: { ...IS, flex: 1 } }), /* @__PURE__ */ React.createElement("button", { onClick: runAiChat, disabled: aiLoading || !aiQuestion.trim(), style: { background: aiQuestion.trim() ? "linear-gradient(135deg,#a78bfa,#7c3aed)" : "#e5e7eb", color: aiQuestion.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: aiQuestion.trim() ? "pointer" : "not-allowed", minWidth: 60 } }, "\u9001\u4FE1"))), tab === "\u4EBA\u5DE5\u76EE\u5B89" && canNinkuInput && /* @__PURE__ */ React.createElement(WorkloadInput, { showToast }), tab === "\u8ECA\u4E21" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 12 } }, "\u25A0 \u8ECA\u4E21\u60C5\u5831\uFF08\u4E0D\u5177\u5408\u306F\u3053\u3053\u304B\u3089\u5831\u544A\u3067\u304D\u307E\u3059\uFF09"), vehicles.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", textAlign: "center", padding: "20px 0" } }, "\u8ECA\u4E21\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093") : vehicles.map((v) => {
    var _a2;
    const isOpen = openVehicleIds[v.id];
    const troubles = vehicleTroubles.filter((t) => t.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date));
    const oils = vehicleOilChanges.filter((o) => o.vehicleId === v.id).sort((a, b) => b.date.localeCompare(a.date));
    const lastOil = oils[0];
    return /* @__PURE__ */ React.createElement("div", { key: v.id, style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOpenVehicleIds((prev) => ({ ...prev, [v.id]: !prev[v.id] })), style: { width: "100%", background: "transparent", border: "none", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F697}"), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "left" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: "#111827" } }, v.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", marginTop: 2 } }, v.plateNumber, v.model && ` \uFF0F \u8A3C\u5238:${v.model}`), (v.inspectionDate || v.assignedStaffId) && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#777", marginTop: 2 } }, v.inspectionDate && /* @__PURE__ */ React.createElement("span", null, "\u{1F6E0} \u8ECA\u691C:", v.inspectionDate), v.assignedStaffId && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: v.inspectionDate ? 8 : 0 } }, "\u{1F464} ", ((_a2 = staff.find((s) => s.id === v.assignedStaffId)) == null ? void 0 : _a2.name) || "\u4E0D\u660E")))), /* @__PURE__ */ React.createElement("span", { style: { color: "#111827", fontSize: 12 } }, isOpen ? "\u25B2" : "\u25BC")), isOpen && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px 14px", borderTop: "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: 10, background: "#e5e7eb", border: "1px solid #ef444433", borderRadius: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", marginBottom: 6 } }, "\u26A0 \u4E0D\u5177\u5408\u3092\u5831\u544A\u3059\u308B"), /* @__PURE__ */ React.createElement("input", { type: "text", value: troubleReportForm.vehicleId === v.id ? troubleReportForm.description : "", onChange: (e) => setTroubleReportForm({ vehicleId: v.id, date: todayStr(), description: e.target.value }), placeholder: "\u4F8B: \u30A8\u30F3\u30B8\u30F3\u59CB\u52D5\u6642\u306B\u7570\u97F3", style: { ...IS, fontSize: 11, marginBottom: 6 } }), /* @__PURE__ */ React.createElement("button", { disabled: busy || !(troubleReportForm.vehicleId === v.id && troubleReportForm.description), onClick: () => withBusy(async () => {
      if (!(troubleReportForm.vehicleId === v.id && troubleReportForm.description)) return;
      const t = { id: uid(), vehicleId: v.id, date: todayStr(), description: troubleReportForm.description };
      const ok = await insertVehicleTrouble(t);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return;
      }
      setVehicleTroubles((prev) => [t, ...prev]);
      setTroubleReportForm({ vehicleId: "", date: todayStr(), description: "" });
      showToast("\u2713 \u4E0D\u5177\u5408\u3092\u5831\u544A\u3057\u307E\u3057\u305F");
    }), style: { width: "100%", background: troubleReportForm.vehicleId === v.id && troubleReportForm.description && !busy ? "#ef4444" : "#e5e7eb", color: troubleReportForm.vehicleId === v.id && troubleReportForm.description && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 6, padding: "8px", fontSize: 11, fontWeight: 700, cursor: troubleReportForm.vehicleId === v.id && troubleReportForm.description && !busy ? "pointer" : "not-allowed" } }, busy ? "\u2026" : "\u5831\u544A\u3059\u308B")), troubles.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#ef4444", marginBottom: 4 } }, "\u26A0 \u4E0D\u5177\u5408\u5C65\u6B74\uFF08", troubles.length, "\u4EF6\uFF09"), troubles.slice(0, 5).map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { fontSize: 11, color: "#4b5563", padding: "3px 0", borderBottom: "1px solid #fafafa" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginRight: 8 } }, t.date.slice(5).replace("-", "/")), t.description))), (() => {
      const isF = oilReportForm.vehicleId === v.id;
      const elementDue = lastOil ? lastOil.elementChanged !== true : false;
      return /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, padding: 10, background: "#f0fdf4", border: "1px solid #22c55e33", borderRadius: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#22c55e", marginBottom: 6 } }, "\u{1F6E2} \u30AA\u30A4\u30EB\u4EA4\u63DB\u3092\u8A18\u9332\u3059\u308B ", /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "\uFF08\u76EE\u5B89\uFF1A5,000km\u3054\u3068\uFF09")), elementDue && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#b45309", background: "#fffbeb", border: "1px solid #f59e0b55", borderRadius: 6, padding: "6px 8px", marginBottom: 6 } }, "\u26A0 \u524D\u56DE\u30A8\u30EC\u30E1\u30F3\u30C8\u672A\u4EA4\u63DB\u3067\u3059\u3002\u4ECA\u56DE\u306F\u30A8\u30EC\u30E1\u30F3\u30C8\u4EA4\u63DB\u306E\u6642\u671F\u3067\u3059"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("input", { type: "date", value: isF ? oilReportForm.date : todayStr(), onChange: (e) => setOilReportForm((f) => ({ ...f.vehicleId === v.id ? f : { vehicleId: v.id, date: todayStr(), mileage: "", note: "", elementChanged: false }, vehicleId: v.id, date: e.target.value })), style: { ...IS, fontSize: 11, width: 140 } }), /* @__PURE__ */ React.createElement("input", { type: "number", value: isF ? oilReportForm.mileage : "", onChange: (e) => setOilReportForm((f) => ({ ...f.vehicleId === v.id ? f : { vehicleId: v.id, date: todayStr(), mileage: "", note: "", elementChanged: false }, vehicleId: v.id, mileage: e.target.value })), placeholder: "\u8D70\u884C\u8DDD\u96E2(km)", style: { ...IS, flex: 1, fontSize: 11 } })), /* @__PURE__ */ React.createElement("input", { type: "text", value: isF ? oilReportForm.note : "", onChange: (e) => setOilReportForm((f) => ({ ...f.vehicleId === v.id ? f : { vehicleId: v.id, date: todayStr(), mileage: "", note: "", elementChanged: false }, vehicleId: v.id, note: e.target.value })), placeholder: "\u30E1\u30E2\uFF08\u30AA\u30A4\u30EB\u7A2E\u5225\u306A\u3069\u3002\u4EFB\u610F\uFF09", style: { ...IS, fontSize: 11, marginBottom: 6 } }), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#374151", marginBottom: 8, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: isF ? oilReportForm.elementChanged : false, onChange: (e) => setOilReportForm((f) => ({ ...f.vehicleId === v.id ? f : { vehicleId: v.id, date: todayStr(), mileage: "", note: "", elementChanged: false }, vehicleId: v.id, elementChanged: e.target.checked })), style: { width: 16, height: 16 } }), "\u30A8\u30EC\u30E1\u30F3\u30C8\uFF08\u30AA\u30A4\u30EB\u30D5\u30A3\u30EB\u30BF\u30FC\uFF09\u3082\u4EA4\u63DB\u3057\u305F"), /* @__PURE__ */ React.createElement("button", { disabled: busy || !isF || !oilReportForm.date, onClick: () => withBusy(async () => {
        if (oilReportForm.vehicleId !== v.id || !oilReportForm.date) return;
        const o = { id: uid(), vehicleId: v.id, date: oilReportForm.date, mileage: Number(oilReportForm.mileage) || 0, note: oilReportForm.note, elementChanged: oilReportForm.elementChanged };
        const ok = await insertVehicleOilChange(o);
        if (!ok) {
          showToast(WRITE_ERROR_MSG);
          return;
        }
        setVehicleOilChanges((prev) => [o, ...prev]);
        setOilReportForm({ vehicleId: "", date: todayStr(), mileage: "", note: "", elementChanged: false });
        showToast("\u2713 \u30AA\u30A4\u30EB\u4EA4\u63DB\u3092\u8A18\u9332\u3057\u307E\u3057\u305F");
      }), style: { width: "100%", background: isF && oilReportForm.date && !busy ? "#22c55e" : "#e5e7eb", color: isF && oilReportForm.date && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 6, padding: "8px", fontSize: 11, fontWeight: 700, cursor: isF && oilReportForm.date && !busy ? "pointer" : "not-allowed" } }, busy ? "\u2026" : "\u8A18\u9332"));
    })(), oils.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#22c55e", marginBottom: 4 } }, "\u{1F6E2} \u30AA\u30A4\u30EB\u4EA4\u63DB\u5C65\u6B74\uFF08", oils.length, "\u4EF6\uFF09"), oils.slice(0, 5).map((o) => /* @__PURE__ */ React.createElement("div", { key: o.id, style: { fontSize: 11, color: "#4b5563", padding: "3px 0", borderBottom: "1px solid #fafafa" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginRight: 8 } }, o.date.slice(5).replace("-", "/")), o.mileage ? o.mileage + "km" : "", o.elementChanged && /* @__PURE__ */ React.createElement("span", { style: { color: "#16a34a", marginLeft: 6, fontWeight: 700 } }, "\u{1F527}\u30A8\u30EC\u30E1\u30F3\u30C8\u4EA4\u63DB"), o.note && /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280", marginLeft: 6 } }, "\uFF0F ", o.note))))));
  })), tab === "\u4F1A\u793E\u60C5\u5831" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 12 } }, "\u25A0 \u4F1A\u793E\u60C5\u5831"), /* @__PURE__ */ React.createElement(HeatGuide, null), /* @__PURE__ */ React.createElement("a", { href: "/manual.pdf", target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: 8, background: "#fff7ed", border: "1px solid #f97316", borderRadius: 10, padding: "14px 16px", marginBottom: 12, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, "\u{1F4D6}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#c2410c" } }, "\u30A2\u30D7\u30EA\u306E\u4F7F\u3044\u65B9\u30DE\u30CB\u30E5\u30A2\u30EB\uFF08PDF\uFF09"), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, color: "#9ca3af" } }, "\u958B\u304F \u203A")), [["/kisoku.pdf", "\u5C31\u696D\u898F\u5247\uFF082026\u5E7411\u67081\u65E5\u65BD\u884C\uFF09"], ["/ikukai.pdf", "\u80B2\u5150\u30FB\u4ECB\u8B77\u4F11\u696D\u7B49\u306B\u95A2\u3059\u308B\u898F\u5247"]].map(([href, label]) => /* @__PURE__ */ React.createElement("a", { key: href, href, target: "_blank", rel: "noopener", style: { display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, padding: "14px 16px", marginBottom: 12, textDecoration: "none" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14 } }, "\u{1F4D8}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#334155" } }, label, "\uFF08PDF\uFF09"), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 11, color: "#9ca3af" } }, "\u958B\u304F \u203A"))), companyInfo.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827", textAlign: "center", padding: "20px 0" } }, "\u60C5\u5831\u304C\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u305B\u3093") : companyInfo.map((item) => /* @__PURE__ */ React.createElement("div", { key: item.id, style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOpenInfoItems((prev) => ({ ...prev, [item.id]: !prev[item.id] })), style: { width: "100%", background: "transparent", border: "none", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12 } }, "\u{1F3E2}"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827" } }, item.title)), /* @__PURE__ */ React.createElement("span", { style: { color: "#111827", fontSize: 12 } }, openInfoItems[item.id] ? "\u25B2" : "\u25BC")), openInfoItems[item.id] && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 16px 14px", fontSize: 12, color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-wrap", borderTop: "1px solid #e5e7eb" } }, /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 10 } }, item.content))))), tab === "\u3054\u610F\u898B\u7BB1" && /* @__PURE__ */ React.createElement("div", { style: { padding: 16, maxWidth: 560, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#111827", letterSpacing: "0.1em", marginBottom: 12 } }, "\u25A0 \u3054\u610F\u898B\u7BB1"), suggestionSent ? /* @__PURE__ */ React.createElement("div", { style: { background: "#f0fdf4", border: "1px solid #22c55e55", borderRadius: 12, padding: "28px 16px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u2705"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "#16a34a", marginBottom: 6 } }, "\u9001\u4FE1\u3057\u307E\u3057\u305F"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 16 } }, "\u3054\u610F\u898B\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002\u533F\u540D\u3067\u9001\u4FE1\u3055\u308C\u307E\u3057\u305F\u3002"), /* @__PURE__ */ React.createElement("button", { onClick: () => setSuggestionSent(false), style: { background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, "\u7D9A\u3051\u3066\u6295\u7A3F\u3059\u308B")) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 10 } }, "\u4F1A\u793E\u3078\u306E\u610F\u898B\u30FB\u8981\u671B\u30FB\u56F0\u308A\u3054\u3068\u3092\u533F\u540D\u3067\u9001\u308C\u307E\u3059\u3002", /* @__PURE__ */ React.createElement("br", null), "\u8AB0\u304C\u66F8\u3044\u305F\u304B\u306F\u7BA1\u7406\u8005\u306B\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002\u6C17\u8EFD\u306B\u3069\u3046\u305E\u3002"), /* @__PURE__ */ React.createElement("textarea", { value: suggestionText, onChange: (e) => setSuggestionText(e.target.value), placeholder: "\u3054\u610F\u898B\u30FB\u3054\u8981\u671B\u3092\u5165\u529B\u2026", rows: 5, style: { width: "100%", background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#111827", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", marginBottom: 10 } }), /* @__PURE__ */ React.createElement("button", { disabled: busy || !suggestionText.trim(), onClick: () => withBusy(async () => {
    const c = suggestionText.trim();
    if (!c) return;
    const ok = await submitSuggestion(c);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setSuggestionText("");
    setSuggestionSent(true);
  }), style: { width: "100%", background: suggestionText.trim() && !busy ? "#f97316" : "#e5e7eb", color: suggestionText.trim() && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, cursor: suggestionText.trim() && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u9001\u4FE1\u3059\u308B"))), modal === "editProject" && editProjectId && (() => {
    const editProj = projects.find((x) => x.id === editProjectId);
    if (!editProj) return null;
    return /* @__PURE__ */ React.createElement(Modal, { title: `\u6848\u4EF6\u7DE8\u96C6 \u2014 ${editProj.name}`, accent: "#22c55e", onClose: () => {
      setModal(null);
      setEditProjectId(null);
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u73FE\u5834\u540D *" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: adminPf.name, onChange: (e) => setAdminPf((f) => ({ ...f, name: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u9867\u5BA2" }, /* @__PURE__ */ React.createElement("select", { value: adminPf.lead, onChange: (e) => setAdminPf((f) => ({ ...f, lead: e.target.value })), style: IS }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"), customers.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.name }, c.name)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5143\u8ACB\u62C5\u5F53\u8005" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: adminPf.customerContact, onChange: (e) => setAdminPf((f) => ({ ...f, customerContact: e.target.value })), placeholder: "\u73FE\u5834\u76E3\u7763\u540D\u306A\u3069", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u30B9\u30C6\u30FC\u30BF\u30B9" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, ["\u6E96\u5099\u4E2D", "\u9032\u884C\u4E2D", "\u5B8C\u4E86", "\u4E2D\u6B62"].map((st) => /* @__PURE__ */ React.createElement("button", { key: st, onClick: () => {
      if (st !== adminPf.status && !window.confirm(`\u30B9\u30C6\u30FC\u30BF\u30B9\u3092\u300C${adminPf.status}\u300D\u2192\u300C${st}\u300D\u306B\u5909\u66F4\u3057\u307E\u3059\u3002
\u4FDD\u5B58\u6642\u306B\u5168\u54E1\u306E\u30A2\u30D7\u30EA\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002\u3088\u308D\u3057\u3044\u3067\u3059\u304B\uFF1F`)) return;
      setAdminPf((f) => ({ ...f, status: st }));
    }, style: { background: adminPf.status === st ? "#f97316" : "#e5e7eb", color: adminPf.status === st ? "#000" : "#6b7280", border: "1px solid", borderColor: adminPf.status === st ? "#f97316" : "#d1d5db", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, st)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5951\u7D04\u5F62\u614B" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, ["\u8ACB\u8CA0", "\u5FDC\u63F4"].map((ct) => /* @__PURE__ */ React.createElement("button", { key: ct, onClick: () => setAdminPf((f) => ({ ...f, contractType: ct })), style: { flex: 1, background: adminPf.contractType === ct ? "#f97316" : "#e5e7eb", color: adminPf.contractType === ct ? "#000" : "#6b7280", border: "1px solid", borderColor: adminPf.contractType === ct ? "#f97316" : "#d1d5db", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, ct)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5DE5\u4E8B\u533A\u5206" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [{ v: "\u65B0\u7BC9", icon: "\u{1F3D7}" }, { v: "\u6539\u4FEE", icon: "\u{1F527}" }].map((wc) => /* @__PURE__ */ React.createElement("button", { key: wc.v, onClick: () => setAdminPf((f) => ({ ...f, workCategory: f.workCategory === wc.v ? "" : wc.v })), style: { flex: 1, background: adminPf.workCategory === wc.v ? "#22c55e" : "#e5e7eb", color: adminPf.workCategory === wc.v ? "#000" : "#6b7280", border: "1px solid", borderColor: adminPf.workCategory === wc.v ? "#22c55e" : "#d1d5db", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, wc.icon, " ", wc.v, "\u5DE5\u4E8B")))), /* @__PURE__ */ React.createElement(Field, { label: "\u4F4F\u6240" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: adminPf.address, onChange: (e) => setAdminPf((f) => ({ ...f, address: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u5DE5\u671F" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "date", value: adminPf.startDate, onChange: (e) => setAdminPf((f) => ({ ...f, startDate: e.target.value })), style: { ...IS, flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { color: "#6b7280" } }, "\u301C"), /* @__PURE__ */ React.createElement("input", { type: "date", value: adminPf.endDate, onChange: (e) => setAdminPf((f) => ({ ...f, endDate: e.target.value })), style: { ...IS, flex: 1 } }))), /* @__PURE__ */ React.createElement(Field, { label: "\u73FE\u5834\u62C5\u5F53\u8005" }, /* @__PURE__ */ React.createElement("select", { value: adminPf.internalOwner, onChange: (e) => setAdminPf((f) => ({ ...f, internalOwner: e.target.value })), style: IS }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u672A\u8A2D\u5B9A"), staff.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id, value: s.name }, s.name)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5DE5\u4E8B\u8A73\u7D30" }, /* @__PURE__ */ React.createElement("textarea", { value: adminPf.workDetails || "", onChange: (e) => setAdminPf((f) => ({ ...f, workDetails: e.target.value })), placeholder: "\u914D\u7BA1\u4FDD\u6E29\u3001\u30C0\u30AF\u30C8\u4FDD\u6E29\u3001\u30E9\u30C3\u30AD\u30F3\u30B0\u7BC4\u56F2\u3001\u7ACB\u4F1A\u3044\u6709\u7121\u306A\u3069\uFF08\u6539\u884C\u53EF\uFF09", rows: 4, style: { ...IS, resize: "vertical", fontFamily: "'Noto Sans JP',sans-serif" } })), /* @__PURE__ */ React.createElement("button", { disabled: !adminPf.name || savingEditProject, onClick: async () => {
      if (!adminPf.name) return;
      setSavingEditProject(true);
      try {
        const fields = {};
        if (adminPf.name !== editProj.name) fields.name = adminPf.name;
        if (adminPf.lead !== (editProj.lead || "")) fields.lead = adminPf.lead;
        if (adminPf.status !== (editProj.status || "\u6E96\u5099\u4E2D")) fields.status = adminPf.status;
        if (adminPf.contractType !== (editProj.contractType || "")) fields.contractType = adminPf.contractType;
        if ((adminPf.workCategory || "") !== (editProj.workCategory || "")) fields.workCategory = adminPf.workCategory || "";
        if (adminPf.address !== (editProj.address || "")) fields.address = adminPf.address;
        if (adminPf.startDate !== (editProj.startDate || "")) fields.startDate = adminPf.startDate;
        if (adminPf.endDate !== (editProj.endDate || "")) fields.endDate = adminPf.endDate;
        if ((adminPf.customerContact || "") !== (editProj.customerContact || "")) fields.customerContact = adminPf.customerContact || "";
        if ((adminPf.internalOwner || "") !== (editProj.internalOwner || "")) fields.internalOwner = adminPf.internalOwner || "";
        if ((adminPf.workDetails || "") !== (editProj.workDetails || "")) fields.workDetails = adminPf.workDetails || "";
        if (Object.keys(fields).length > 0) {
          const ok = await updateProjectFields(editProjectId, fields);
          if (!ok) {
            showToast(WRITE_ERROR_MSG);
            return;
          }
          setProjects((prev) => prev.map((p) => p.id === editProjectId ? { ...p, ...fields } : p));
        }
        setModal(null);
        setEditProjectId(null);
        showToast("\u2713 \u6848\u4EF6\u60C5\u5831\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F");
      } catch (e) {
        showToast("\u274C \u66F4\u65B0\u5931\u6557: " + ((e == null ? void 0 : e.message) || e));
      } finally {
        setSavingEditProject(false);
      }
    }, style: { background: adminPf.name && !savingEditProject ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#e5e7eb", color: adminPf.name && !savingEditProject ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: adminPf.name && !savingEditProject ? "pointer" : "not-allowed" } }, savingEditProject ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u3059\u308B")));
  })(), modal === "holidayApply" && pendingHolidayApply && (() => {
    const { date, clockInIso, clockOutIso, holidayType, config } = pendingHolidayApply;
    const inStr = clockInIso ? new Date(clockInIso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "?";
    const outStr = clockOutIso ? new Date(clockOutIso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "?";
    const typeLabel = HOLIDAY_TYPE_LABEL[holidayType] || "\u4F11\u65E5";
    const accent = holidayType === "sunday" ? "#ef4444" : holidayType === "saturday" ? "#f59e0b" : "#a78bfa";
    return /* @__PURE__ */ React.createElement(Modal, { title: `${typeLabel}\u51FA\u52E4 \u2014 \u7533\u8ACB`, accent, onClose: () => {
      if (!savingHolidayApply) {
        setPendingHolidayApply(null);
        setModal(pendingHandover ? "handover" : null);
      }
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginBottom: 4 } }, "\u51FA\u52E4\u8A18\u9332"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#111827", fontFamily: "'JetBrains Mono',monospace" } }, date, " \uFF0F ", inStr, " \u301C ", outStr), config.isHalfDay && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f59e0b", marginTop: 4 } }, "\u261D 13:00\u524D\u306E\u9000\u52E4\u306A\u306E\u3067\u300C\u534A\u65E5\u300D\u6271\u3044\u3067\u3059")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 6 } }, "\u25A0 \u7533\u8ACB\u5185\u5BB9"), config.entries.map((e, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 6, padding: "10px 12px", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#111827" } }, e.pref === "\u6709\u7D66\u7E70\u8D8A" ? "\u{1F381} \u6709\u7D66\u4F11\u6687 +" : e.pref === "\u8CB7\u53D6\u5E0C\u671B" ? "\u{1F4B0} \u8CB7\u53D6 " : e.pref === "\u632F\u4F11\u5E0C\u671B" ? "\u{1F504} \u632F\u66FF\u4F11\u65E5 " : "\u2014", e.pref && /* @__PURE__ */ React.createElement("span", { style: { color: "#f97316", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" } }, e.days, "\u65E5"), !e.pref && /* @__PURE__ */ React.createElement("span", { style: { color: "#4b5563" } }, "\u672A\u9078\u629E\uFF08\u4E0B\u3067\u9078\u3093\u3067\u304F\u3060\u3055\u3044\uFF09")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280" } }, e.label)))), config.needUserChoice && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 6 } }, "\u25A0 \u8CB7\u53D6 or \u632F\u4F11\u3092\u9078\u629E *"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setHolidayPrefChoice("\u8CB7\u53D6\u5E0C\u671B"), style: { flex: 1, background: holidayPrefChoice === "\u8CB7\u53D6\u5E0C\u671B" ? "#f97316" : "#fafafa", color: holidayPrefChoice === "\u8CB7\u53D6\u5E0C\u671B" ? "#000" : "#6b7280", border: "1px solid", borderColor: holidayPrefChoice === "\u8CB7\u53D6\u5E0C\u671B" ? "#f97316" : "#d1d5db", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u{1F4B0} \u8CB7\u53D6\u5E0C\u671B"), /* @__PURE__ */ React.createElement("button", { onClick: () => setHolidayPrefChoice("\u632F\u4F11\u5E0C\u671B"), style: { flex: 1, background: holidayPrefChoice === "\u632F\u4F11\u5E0C\u671B" ? "#60a5fa" : "#fafafa", color: holidayPrefChoice === "\u632F\u4F11\u5E0C\u671B" ? "#000" : "#6b7280", border: "1px solid", borderColor: holidayPrefChoice === "\u632F\u4F11\u5E0C\u671B" ? "#60a5fa" : "#d1d5db", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u{1F504} \u632F\u4F11\u5E0C\u671B"))), (holidayType === "obon" || holidayType === "newyear") && /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #a78bfa44", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#c4b5fd", lineHeight: 1.5 } }, "\u{1F49D} \u304A\u76C6\u30FB\u5E74\u672B\u5E74\u59CB\u306E\u51FA\u52E4\u306F\u5272\u5897\u3064\u304D\u3067\u3059\u3002\u300C\u8CB7\u53D6\uFF08\u51FA\u52E4\u5206\uFF0B\u5272\u5897\uFF09\u300D\u304B\u300C\u632F\u4F111\u65E5\uFF0B\u5272\u5897\u300D\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: submitHolidayApply,
        disabled: savingHolidayApply || config.needUserChoice && !holidayPrefChoice,
        style: { background: savingHolidayApply || config.needUserChoice && !holidayPrefChoice ? "#e5e7eb" : `linear-gradient(135deg,${accent},${accent}dd)`, color: savingHolidayApply || config.needUserChoice && !holidayPrefChoice ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: savingHolidayApply || config.needUserChoice && !holidayPrefChoice ? "not-allowed" : "pointer" }
      },
      savingHolidayApply ? "\u7533\u8ACB\u4E2D\u2026" : "\u{1F4DD} \u7533\u8ACB\u3059\u308B"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setPendingHolidayApply(null);
          setModal(pendingHandover ? "handover" : null);
        },
        disabled: savingHolidayApply,
        style: { background: "transparent", color: "#111827", border: "none", borderRadius: 8, padding: "6px", fontSize: 11, cursor: savingHolidayApply ? "not-allowed" : "pointer" }
      },
      "\u5F8C\u3067\u7533\u8ACB\u3059\u308B\uFF08\u30B9\u30AD\u30C3\u30D7\uFF09"
    )));
  })(), modal === "subWorkers" && pendingSubWorkers.length > 0 && /* @__PURE__ */ React.createElement(Modal, { title: "\u5916\u6CE8 \u4F5C\u696D\u54E1\u540D\u3092\u5165\u529B", accent: "#a78bfa", onClose: null }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#4b5563", lineHeight: 1.5 } }, "\u51FA\u52E4\u6642\u306B\u767B\u9332\u3057\u305F\u5916\u6CE8\u306E\u4F5C\u696D\u54E1\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), pendingSubWorkers.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, style: { background: "#eff6ff", border: "1px solid #a78bfa44", borderRadius: 8, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#a78bfa", fontWeight: 700, marginBottom: 6 } }, s.companyName, "\uFF08", s.headcount, "\u4EBA\u5DE5\uFF09"), /* @__PURE__ */ React.createElement("input", { type: "text", value: subWorkerEdits[s.id] || "", onChange: (e) => setSubWorkerEdits((prev) => ({ ...prev, [s.id]: e.target.value })), placeholder: "\u4F8B: \u7530\u4E2D\u3001\u4F50\u85E4", style: { ...IS, padding: "8px 10px", fontSize: 13 } }))), (() => {
    const allFilled = pendingSubWorkers.every((s) => (subWorkerEdits[s.id] || "").trim());
    return /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
      for (const s of pendingSubWorkers) {
        const w = (subWorkerEdits[s.id] || "").trim();
        if (!w) return;
        const ok = await updateSubcontractorWorkers(s.id, w);
        if (!ok) {
          showToast("\u26A0 \u4F5C\u696D\u54E1\u540D\u306E\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
          return;
        }
        setSubcontractors((prev) => prev.map((x) => x.id === s.id ? { ...x, workers: w } : x));
      }
      const info = pendingAfterSubWorkers;
      setPendingSubWorkers([]);
      setSubWorkerEdits({});
      setPendingAfterSubWorkers(null);
      setPendingHandover({ projectId: info.projectId, projectName: info.projectName });
      setHandoverText("");
      if (info.hConfig) {
        setPendingHolidayApply({ date: todayStr(), clockInIso: info.clockInTime, clockOutIso: info.clockOutTime, holidayType: info.htype, config: info.hConfig });
        setHolidayPrefChoice("");
        setModal("holidayApply");
      } else {
        setModal("handover");
      }
    }), disabled: !allFilled || busy, style: { background: allFilled && !busy ? "linear-gradient(135deg,#a78bfa,#6366f1)" : "#e5e7eb", color: allFilled && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: allFilled && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u78BA\u5B9A\u3057\u3066\u9000\u52E4\u3092\u7D9A\u3051\u308B");
  })())), false, modal === "handover" && /* @__PURE__ */ React.createElement(Modal, { title: `\u5F15\u7D99\u304E\u30E1\u30E2 \u2014 ${(pendingHandover == null ? void 0 : pendingHandover.projectName) || ""}`, accent: "#60a5fa", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#6b7280" } }, "\u9000\u52E4\u304A\u75B2\u308C\u69D8\u3067\u3059\u3002\u6B21\u306E\u62C5\u5F53\u8005\u3078\u306E\u5F15\u7D99\u304E\u304C\u3042\u308C\u3070\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#93c5fd", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#60a5fa", fontWeight: 700, marginBottom: 4 } }, "\u{1F4CD} \u9001\u4FE1\u3059\u308B\u3068\u3001\u4EE5\u4E0B\u306B\u8868\u793A\u3055\u308C\u307E\u3059\uFF1A"), "\u{1F4CC} ", /* @__PURE__ */ React.createElement("b", null, "\u3053\u306E\u6848\u4EF6\u306E\u8A73\u7D30\u753B\u9762"), "\uFF08\u6253\u523B\u753B\u9762\u3067\u6848\u4EF6\u3092\u30BF\u30C3\u30D7\uFF09", /* @__PURE__ */ React.createElement("br", null), "\u{1F4E2} ", /* @__PURE__ */ React.createElement("b", null, "\u5168\u54E1\u306E\u30A2\u30CA\u30A6\u30F3\u30B9"), "\uFF08\u30ED\u30B0\u30A4\u30F3\u5F8C\u306E\u304A\u77E5\u3089\u305B\u30DD\u30C3\u30D7\u30A2\u30C3\u30D7\uFF09"), /* @__PURE__ */ React.createElement("textarea", { value: handoverText, onChange: (e) => setHandoverText(e.target.value), placeholder: "\u4F8B: 2F\u914D\u7BA1\u306E\u9632\u71B1\u304C\u672A\u5B8C\u4E86\u3002\u6750\u6599\u306F\u73FE\u5834\u306E\u5009\u5EAB\u306B\u3042\u308A\u307E\u3059\u3002", rows: 4, style: { width: "100%", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#111827", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", id: "handoverPhotoInput", style: { display: "none" }, onChange: async (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    try {
      const r = await resizeImageFile(file);
      setHandoverPhoto(r);
    } catch (_) {
      showToast("\u26A0 \u753B\u50CF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557");
    }
    e.target.value = "";
  } }), handoverPhoto ? /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement("img", { src: handoverPhoto.preview, alt: "\u6DFB\u4ED8", style: { maxWidth: "100%", maxHeight: 150, borderRadius: 8, border: "1px solid #d1d5db" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setHandoverPhoto(null), style: { position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 16, borderRadius: "50%", width: 28, height: 28, cursor: "pointer", lineHeight: "28px", textAlign: "center" } }, "\u2715")) : /* @__PURE__ */ React.createElement("button", { onClick: () => document.getElementById("handoverPhotoInput").click(), style: { width: "100%", background: "#fafafa", color: "#60a5fa", border: "1px dashed #60a5fa44", borderRadius: 8, padding: "10px", fontSize: 12, cursor: "pointer" } }, "\u{1F4F7} \u5199\u771F\u3092\u6DFB\u4ED8")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: submitHandover, disabled: photoUploading, style: { flex: 1, background: handoverText.trim() && !photoUploading ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : "#e5e7eb", color: handoverText.trim() && !photoUploading ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: handoverText.trim() && !photoUploading ? "pointer" : "not-allowed" } }, photoUploading ? "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u4E2D\u2026" : handoverText.trim() ? "\u9001\u4FE1\u3059\u308B" : "\u30B9\u30AD\u30C3\u30D7"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setModal(null);
    setPendingHandover(null);
    setHandoverPhoto(null);
  }, style: { background: "#e5e7eb", color: "#6b7280", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px 16px", fontSize: 13, cursor: "pointer" } }, "\u30B9\u30AD\u30C3\u30D7")))), modal === "addHandoverMemo" && selected && /* @__PURE__ */ React.createElement(Modal, { title: `\u5F15\u7D99\u304E\u30E1\u30E2\u3092\u8FFD\u52A0 \u2014 ${selected.name}`, accent: "#60a5fa", onClose: () => {
    setModal(null);
    setAddHmText("");
    setAddHmPhoto(null);
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#eff6ff", border: "1px solid #60a5fa44", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#93c5fd", lineHeight: 1.6 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#60a5fa", fontWeight: 700, marginBottom: 4 } }, "\u{1F4CD} \u8FFD\u52A0\u3059\u308B\u3068\u3001\u4EE5\u4E0B\u306B\u8868\u793A\u3055\u308C\u307E\u3059\uFF1A"), "\u{1F4CC} ", /* @__PURE__ */ React.createElement("b", null, "\u3053\u306E\u6848\u4EF6\u306E\u8A73\u7D30\u753B\u9762"), /* @__PURE__ */ React.createElement("br", null), "\u{1F4E2} ", /* @__PURE__ */ React.createElement("b", null, "\u5168\u54E1\u306E\u30A2\u30CA\u30A6\u30F3\u30B9"), "\uFF08\u30ED\u30B0\u30A4\u30F3\u5F8C\u306E\u304A\u77E5\u3089\u305B\uFF09"), /* @__PURE__ */ React.createElement("textarea", { value: addHmText, onChange: (e) => setAddHmText(e.target.value), placeholder: "\u4F8B: 2F\u914D\u7BA1\u306E\u9632\u71B1\u304C\u672A\u5B8C\u4E86\u3002\u6750\u6599\u306F\u73FE\u5834\u306E\u5009\u5EAB\u306B\u3042\u308A\u307E\u3059\u3002", rows: 4, style: { width: "100%", background: "#fafafa", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", color: "#111827", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif" } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", id: "addHmPhotoInput", style: { display: "none" }, onChange: async (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    try {
      const r = await resizeImageFile(file);
      setAddHmPhoto(r);
    } catch (_) {
      showToast("\u26A0 \u753B\u50CF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557");
    }
    e.target.value = "";
  } }), addHmPhoto ? /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement("img", { src: addHmPhoto.preview, alt: "\u6DFB\u4ED8", style: { maxWidth: "100%", maxHeight: 150, borderRadius: 8, border: "1px solid #d1d5db" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setAddHmPhoto(null), style: { position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 16, borderRadius: "50%", width: 28, height: 28, cursor: "pointer", lineHeight: "28px", textAlign: "center" } }, "\u2715")) : /* @__PURE__ */ React.createElement("button", { onClick: () => document.getElementById("addHmPhotoInput").click(), style: { width: "100%", background: "#fafafa", color: "#60a5fa", border: "1px dashed #60a5fa44", borderRadius: 8, padding: "10px", fontSize: 12, cursor: "pointer" } }, "\u{1F4F7} \u5199\u771F\u3092\u6DFB\u4ED8")), /* @__PURE__ */ React.createElement("button", { onClick: submitAddHandover, disabled: busy || !addHmText.trim(), style: { background: addHmText.trim() && !busy ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : "#e5e7eb", color: addHmText.trim() && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: addHmText.trim() && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u8FFD\u52A0\u3059\u308B"))), modal === "entry" && selected && /* @__PURE__ */ React.createElement(Modal, { title: `\u4EBA\u5DE5\u5165\u529B \u2014 ${selected.name}`, onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u65E5\u4ED8" }, /* @__PURE__ */ React.createElement("input", { type: "date", value: ef.date, onChange: (e) => setEf((f) => ({ ...f, date: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u4F5C\u696D\u8005" }, /* @__PURE__ */ React.createElement("select", { value: ef.worker, onChange: (e) => setEf((f) => ({ ...f, worker: e.target.value })), style: IS }, staff.map((s) => /* @__PURE__ */ React.createElement("option", { key: s.id }, s.name)))), /* @__PURE__ */ React.createElement(Field, { label: "\u4EBA\u5DE5\u6570" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5 } }, [0.5, 1, 1.5, 2, 2.5, 3].map((n) => /* @__PURE__ */ React.createElement("button", { key: n, onClick: () => setEf((f) => ({ ...f, qty: String(n) })), style: { flex: 1, background: ef.qty === String(n) ? "#f97316" : "#e5e7eb", color: ef.qty === String(n) ? "#000" : "#6b7280", border: "1px solid", borderColor: ef.qty === String(n) ? "#f97316" : "#d1d5db", borderRadius: 6, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, n)))), /* @__PURE__ */ React.createElement(Field, { label: "\u30E1\u30E2" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: ef.memo, onChange: (e) => setEf((f) => ({ ...f, memo: e.target.value })), placeholder: "\u4F5C\u696D\u5185\u5BB9\u306A\u3069", style: IS })), /* @__PURE__ */ React.createElement("button", { onClick: submitEntry, disabled: busy || !ef.qty, style: { background: !busy && ef.qty ? "linear-gradient(135deg,#f97316,#ef4444)" : "#e5e7eb", color: !busy && ef.qty ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: !busy && ef.qty ? "pointer" : "not-allowed" } }, busy ? "\u8A18\u9332\u4E2D\u2026" : "\u8A18\u9332\u3059\u308B"))), modal === "addProject" && /* @__PURE__ */ React.createElement(Modal, { title: "\u65B0\u898F\u6848\u4EF6\u8FFD\u52A0", accent: "#22c55e", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u73FE\u5834\u540D *" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: pf.name, onChange: (e) => setPf((f) => ({ ...f, name: e.target.value })), placeholder: "\u6B63\u5F0F\u306A\u73FE\u5834\u540D\u3092\u8A18\u5165\u3057\u3066\u304F\u3060\u3055\u3044", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u9867\u5BA2" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, /* @__PURE__ */ React.createElement("select", { value: pf.lead, onChange: (e) => setPf((f) => ({ ...f, lead: e.target.value })), style: { ...IS, flex: 1 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"), customers.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.name }, c.name))), user.role === "admin" && /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
    setShowAddCustomer(true);
    setNewCustomerForm({ name: "", contact: "", phone: "" });
  }, style: { background: "#f0fdf4", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 8, padding: "0 12px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } }, "\uFF0B"))), /* @__PURE__ */ React.createElement(Field, { label: "\u5951\u7D04\u5F62\u614B" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, ["\u8ACB\u8CA0", "\u5FDC\u63F4"].map((ct) => /* @__PURE__ */ React.createElement("button", { key: ct, onClick: () => setPf((f) => ({ ...f, contractType: ct })), style: { flex: 1, background: pf.contractType === ct ? "#f97316" : "#e5e7eb", color: pf.contractType === ct ? "#000" : "#6b7280", border: "1px solid", borderColor: pf.contractType === ct ? "#f97316" : "#d1d5db", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, ct)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5DE5\u4E8B\u533A\u5206" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, [{ v: "\u65B0\u7BC9", icon: "\u{1F3D7}" }, { v: "\u6539\u4FEE", icon: "\u{1F527}" }].map((wc) => /* @__PURE__ */ React.createElement("button", { key: wc.v, onClick: () => setPf((f) => ({ ...f, workCategory: f.workCategory === wc.v ? "" : wc.v })), style: { flex: 1, background: pf.workCategory === wc.v ? "#22c55e" : "#e5e7eb", color: pf.workCategory === wc.v ? "#000" : "#6b7280", border: "1px solid", borderColor: pf.workCategory === wc.v ? "#22c55e" : "#d1d5db", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, wc.icon, " ", wc.v, "\u5DE5\u4E8B")))), /* @__PURE__ */ React.createElement(Field, { label: "\u4F4F\u6240" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: pf.address, onChange: (e) => setPf((f) => ({ ...f, address: e.target.value })), placeholder: "\u73FE\u5834\u306E\u4F4F\u6240", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u5DE5\u671F" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "date", value: pf.startDate, onChange: (e) => setPf((f) => ({ ...f, startDate: e.target.value })), style: { ...IS, flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { color: "#111827" } }, "\u301C"), /* @__PURE__ */ React.createElement("input", { type: "date", value: pf.endDate, onChange: (e) => setPf((f) => ({ ...f, endDate: e.target.value })), style: { ...IS, flex: 1 } }))), /* @__PURE__ */ React.createElement("button", { onClick: submitProject, disabled: busy || !pf.name, style: { background: !busy && pf.name ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#e5e7eb", color: !busy && pf.name ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: !busy && pf.name ? "pointer" : "not-allowed" } }, busy ? "\u8FFD\u52A0\u4E2D\u2026" : "\u6848\u4EF6\u3092\u8FFD\u52A0\u3059\u308B"))), reportingItem && /* @__PURE__ */ React.createElement(Modal, { title: `\u9032\u6357\u5831\u544A: ${reportingItem.customer.name}`, accent: "#f97316", onClose: () => {
    if (!savingReport) setReportingItem(null);
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginBottom: 4 } }, "\u73FE\u5834"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#111827" } }, reportingItem.project.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#6b7280", marginTop: 4 } }, reportingItem.checkType === "\u5BA2\u5148\u5171\u6709" ? "\u{1F535} \u5BA2\u5148\u5171\u6709\u65E5" : "\u{1F512} \u5185\u90E8\u78BA\u8A8D\u65E5", reportingItem.lastReport && ` \uFF0F \u524D\u56DE ${reportingItem.lastReport.percent}%`)), /* @__PURE__ */ React.createElement(Field, { label: `\u9032\u6357 ${reportPercent}%` }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "range",
      min: "0",
      max: "100",
      step: "10",
      value: reportPercent,
      onChange: (e) => setReportPercent(Number(e.target.value)),
      style: { width: "100%", accentColor: "#f97316" }
    }
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 9, color: "#111827", marginTop: 2 } }, /* @__PURE__ */ React.createElement("span", null, "0%"), /* @__PURE__ */ React.createElement("span", null, "25%"), /* @__PURE__ */ React.createElement("span", null, "50%"), /* @__PURE__ */ React.createElement("span", null, "75%"), /* @__PURE__ */ React.createElement("span", null, "100%"))), /* @__PURE__ */ React.createElement(Field, { label: "\u30B3\u30E1\u30F3\u30C8\uFF08\u4EFB\u610F\uFF09" }, /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: reportComment,
      onChange: (e) => setReportComment(e.target.value),
      placeholder: "\u4F8B: \u914D\u7BA1\u4FDD\u6E29\u5B8C\u4E86\u3001\u6765\u9031\u30E9\u30C3\u30AD\u30F3\u30B0\u958B\u59CB",
      rows: 3,
      style: { ...IS, resize: "vertical" }
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { background: "#2a1a0f", border: "1px solid #f9731633", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#fdba74", lineHeight: 1.5 } }, "\u26A0 \u9001\u4FE1\u5F8C\u306F\u4FEE\u6B63\u3067\u304D\u307E\u305B\u3093\u3002\u6B21\u56DE\u306E\u9032\u6357\u78BA\u8A8D\u65E5\u307E\u3067\u518D\u9001\u4E0D\u53EF\u3067\u3059\u3002"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setConfirmReport(true),
      disabled: savingReport,
      style: { background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#000", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" }
    },
    "\u9001\u4FE1\u5185\u5BB9\u3092\u78BA\u8A8D"
  ))), confirmReport && reportingItem && /* @__PURE__ */ React.createElement("div", { onClick: (e) => {
    if (e.target === e.currentTarget && !savingReport) setConfirmReport(false);
  }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1e4, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "#fafafa", border: "2px solid #f97316", borderRadius: 12, padding: 20, maxWidth: 400, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: "#f97316", marginBottom: 12 } }, "\u{1F4E4} \u9001\u4FE1\u5185\u5BB9\u3092\u78BA\u8A8D"), /* @__PURE__ */ React.createElement("div", { style: { background: "#e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 14, lineHeight: 1.7 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280" } }, "\u5BA2\u5148"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#111827", fontWeight: 700, marginBottom: 6 } }, reportingItem.customer.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280" } }, "\u73FE\u5834"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#111827", marginBottom: 6 } }, reportingItem.project.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280" } }, "\u9032\u6357"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 22, color: "#f97316", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" } }, reportPercent, "%"), reportComment && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 6 } }, "\u30B3\u30E1\u30F3\u30C8"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#374151", whiteSpace: "pre-wrap" } }, reportComment))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#ef4444", marginBottom: 12, lineHeight: 1.5, fontWeight: 700 } }, "\u26A0 \u3053\u306E\u5185\u5BB9\u3067\u9001\u4FE1\u3057\u307E\u3059\u3002\u4FEE\u6B63\u306F\u3067\u304D\u307E\u305B\u3093\u3002"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setConfirmReport(false),
      disabled: savingReport,
      style: { flex: 1, background: "#e5e7eb", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" }
    },
    "\u623B\u3063\u3066\u4FEE\u6B63"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        if (savingReport) return;
        setSavingReport(true);
        try {
          const rep = { id: uid(), projectId: reportingItem.project.id, customerId: reportingItem.customer.id, percent: reportPercent, comment: reportComment };
          const res = await saveProgressReport(rep);
          if (res == null ? void 0 : res.error) {
            showToast("\u26A0 \u9001\u4FE1\u5931\u6557: " + res.error);
            setSavingReport(false);
            return;
          }
          const fresh = await loadProgressReports();
          setProgressReports(fresh || []);
          setConfirmReport(false);
          setReportingItem(null);
          setReportPercent(50);
          setReportComment("");
          showToast("\u2713 \u9032\u6357\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F");
        } catch (e) {
          showToast("\u26A0 \u9001\u4FE1\u5931\u6557: " + e.message);
        } finally {
          setSavingReport(false);
        }
      },
      disabled: savingReport,
      style: { flex: 2, background: savingReport ? "#e5e7eb" : "linear-gradient(135deg,#f97316,#ef4444)", color: savingReport ? "#9ca3af" : "#000", border: "none", borderRadius: 8, padding: "11px", fontSize: 12, fontWeight: 700, cursor: savingReport ? "not-allowed" : "pointer" }
    },
    savingReport ? "\u9001\u4FE1\u4E2D\u2026" : "\u{1F4E4} \u9001\u4FE1\u3059\u308B"
  )))), showAddCustomer && /* @__PURE__ */ React.createElement(Modal, { title: "\u9867\u5BA2\u3092\u8FFD\u52A0", accent: "#22c55e", onClose: () => setShowAddCustomer(false) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u9867\u5BA2\u540D *" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: newCustomerForm.name, onChange: (e) => setNewCustomerForm((f) => ({ ...f, name: e.target.value })), placeholder: "\u4F1A\u793E\u540D", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u62C5\u5F53\u8005\u540D" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: newCustomerForm.contact, onChange: (e) => setNewCustomerForm((f) => ({ ...f, contact: e.target.value })), placeholder: "\u62C5\u5F53\u8005\u306E\u540D\u524D", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u96FB\u8A71\u756A\u53F7" }, /* @__PURE__ */ React.createElement("input", { type: "tel", value: newCustomerForm.phone, onChange: (e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value })), placeholder: "03-xxxx-xxxx", style: IS })), /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
    if (!newCustomerForm.name.trim()) {
      showToast("\u9867\u5BA2\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      return;
    }
    const nc = { id: uid(), name: newCustomerForm.name, contact: newCustomerForm.contact, phone: newCustomerForm.phone, email: "", billingDate: "", projectId: "", memo: "", progress: 0 };
    const ok = await insertCustomer(nc);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setCustomers((prev) => [...prev, nc]);
    setShowAddCustomer(false);
    showToast("\u9867\u5BA2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
  }), disabled: !newCustomerForm.name.trim() || busy, style: { background: newCustomerForm.name.trim() && !busy ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#e5e7eb", color: newCustomerForm.name.trim() && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: newCustomerForm.name.trim() && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u8FFD\u52A0\u3059\u308B"))), modal === "leave" && (() => {
    const htype = lf.type === "holiday" ? getHolidayType(lf.date) : null;
    const isSunday = htype === "sunday";
    const isLongHoliday = htype === "obon" || htype === "newyear";
    const canBuyout = lf.type === "holiday" && htype && !isSunday && !isLongHoliday;
    const availableWorks = lf.type === "furikae" ? getAvailableFurikaeWorks(user.id, leaveData) : [];
    const submitDisabled = lf.type === "holiday" && (!htype || !lf.holidayPref) || lf.type === "furikae" && !lf.holidayWorkId;
    return /* @__PURE__ */ React.createElement(Modal, { title: "\u4F11\u6687\u30FB\u52E4\u6020\u3092\u7533\u8ACB", accent: "#22c55e", onClose: () => setModal(null) }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u7A2E\u5225" }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 } }, LEAVE_TYPES.map((lt) => /* @__PURE__ */ React.createElement("button", { key: lt.id, onClick: () => setLf((f) => ({ ...f, type: lt.id, holidayPref: "", holidayWorkId: "" })), style: { background: lf.type === lt.id ? `${lt.color}22` : "#fafafa", color: lf.type === lt.id ? lt.color : "#111827", border: "1px solid", borderColor: lf.type === lt.id ? lt.color : "#d1d5db", borderRadius: 8, padding: "10px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", textAlign: "left" } }, /* @__PURE__ */ React.createElement("span", { style: { marginRight: 6 } }, lt.icon), lt.label)))), lf.type === "holiday" && /* @__PURE__ */ React.createElement(React.Fragment, null, htype && /* @__PURE__ */ React.createElement("div", { style: { background: isSunday ? "#ef4444" : isLongHoliday ? "#a78bfa" : "#f97316", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#000", textAlign: "center" } }, isSunday ? "\u{1F504} \u65E5\u66DC\uFF08\u6CD5\u5B9A\u4F11\u65E5\uFF09\u51FA\u52E4 \u2192 \u632F\u4F11\u306E\u307F" : isLongHoliday ? `\u{1F49D} ${HOLIDAY_TYPE_LABEL[htype]}\u51FA\u52E4 \u2192 \u8CB7\u53D6 or \u632F\u4F11\u3092\u9078\u629E` : "\u{1F3D7} \u571F\u66DC\uFF08\u6240\u5B9A\u4F11\u65E5\uFF09\u51FA\u52E4 \u2192 \u8CB7\u53D6 or \u632F\u4F11\u3092\u9078\u629E"), !htype && lf.date && /* @__PURE__ */ React.createElement("div", { style: { background: "#9ca3af", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#f59e0b", textAlign: "center" } }, "\u26A0 \u3053\u306E\u65E5\u306F\u4F11\u65E5\u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF08\u571F\u65E5\u30FB\u304A\u76C6\u30FB\u5E74\u672B\u5E74\u59CB\u4EE5\u5916\u306F\u5E73\u65E5\u6271\u3044\uFF09"), /* @__PURE__ */ React.createElement(Field, { label: "\u5E0C\u671B\uFF08\u5FC5\u9808\uFF09" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, !isSunday && /* @__PURE__ */ React.createElement("button", { onClick: () => setLf((f) => ({ ...f, holidayPref: "\u8CB7\u53D6\u5E0C\u671B" })), style: { flex: 1, background: lf.holidayPref === "\u8CB7\u53D6\u5E0C\u671B" ? "#f97316" : "#fafafa", color: lf.holidayPref === "\u8CB7\u53D6\u5E0C\u671B" ? "#000" : "#6b7280", border: "1px solid", borderColor: lf.holidayPref === "\u8CB7\u53D6\u5E0C\u671B" ? "#f97316" : "#d1d5db", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u{1F4B0} \u8CB7\u53D6\u5E0C\u671B"), /* @__PURE__ */ React.createElement("button", { onClick: () => setLf((f) => ({ ...f, holidayPref: "\u632F\u4F11\u5E0C\u671B" })), style: { flex: isSunday ? void 0 : 1, width: isSunday ? "100%" : void 0, background: lf.holidayPref === "\u632F\u4F11\u5E0C\u671B" ? "#60a5fa" : "#fafafa", color: lf.holidayPref === "\u632F\u4F11\u5E0C\u671B" ? "#000" : "#6b7280", border: "1px solid", borderColor: lf.holidayPref === "\u632F\u4F11\u5E0C\u671B" ? "#60a5fa" : "#d1d5db", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u{1F504} \u632F\u4F11\u5E0C\u671B")))), lf.type === "furikae" && /* @__PURE__ */ React.createElement(Field, { label: "\u5143\u306E\u4F11\u65E5\u51FA\u52E4\u65E5\uFF08\u5FC5\u9808\uFF09" }, availableWorks.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#f59e0b", background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 6, padding: "8px 10px" } }, "\u53D6\u5F97\u53EF\u80FD\u306A\u632F\u66FF\u4F11\u65E5\u304C\u3042\u308A\u307E\u305B\u3093\uFF08\u4F11\u65E5\u51FA\u52E4\u7533\u8ACB\u304C\u5FC5\u8981\u3067\u3059\uFF09") : /* @__PURE__ */ React.createElement("select", { value: lf.holidayWorkId, onChange: (e) => setLf((f) => ({ ...f, holidayWorkId: e.target.value })), style: { ...IS } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "-- \u5143\u306E\u51FA\u52E4\u65E5\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044 --"), availableWorks.map((w) => {
      const expiry = addThreeMonths(w.date);
      const daysLeft = Math.ceil((expiry - /* @__PURE__ */ new Date()) / 864e5);
      return /* @__PURE__ */ React.createElement("option", { key: w.id, value: w.id }, w.date, "\uFF08", HOLIDAY_TYPE_LABEL[w.holidayType] || "\u4F11\u65E5", "\u51FA\u52E4 / \u671F\u9650", daysLeft, "\u65E5\uFF09");
    }))), /* @__PURE__ */ React.createElement(Field, { label: "\u65E5\u4ED8" }, /* @__PURE__ */ React.createElement("input", { type: "date", value: lf.date, onChange: (e) => {
      const newHtype = lf.type === "holiday" ? getHolidayType(e.target.value) : null;
      const autoPref = newHtype === "sunday" ? "\u632F\u4F11\u5E0C\u671B" : "";
      setLf((f) => ({ ...f, date: e.target.value, holidayPref: autoPref || f.holidayPref }));
    }, style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u65E5\u6570" }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5 } }, ["0.5", "1", "2", "3", "4", "5"].map((n) => /* @__PURE__ */ React.createElement("button", { key: n, onClick: () => setLf((f) => ({ ...f, days: n })), style: { flex: 1, background: lf.days === n ? "#22c55e" : "#e5e7eb", color: lf.days === n ? "#000" : "#6b7280", border: "1px solid", borderColor: lf.days === n ? "#22c55e" : "#d1d5db", borderRadius: 6, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" } }, n)))), /* @__PURE__ */ React.createElement(Field, { label: "\u5099\u8003" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: lf.memo, onChange: (e) => setLf((f) => ({ ...f, memo: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement("button", { onClick: submitLeave, disabled: busy || submitDisabled, style: { background: !busy && !submitDisabled ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#e5e7eb", color: !busy && !submitDisabled ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: !busy && !submitDisabled ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : lf.type === "holiday" && !htype ? "\u4F11\u65E5\u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF08\u7533\u8ACB\u4E0D\u53EF\uFF09" : lf.type === "furikae" && availableWorks.length === 0 ? "\u53D6\u5F97\u53EF\u80FD\u306A\u632F\u66FF\u304C\u3042\u308A\u307E\u305B\u3093" : lf.type === "furikae" && !lf.holidayWorkId ? "\u5143\u306E\u51FA\u52E4\u65E5\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044" : submitDisabled ? "\u8CB7\u53D6 / \u632F\u4F11\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044" : lf.type === "paid" || lf.type === "furikae" ? "\u627F\u8A8D\u3059\u308B\uFF08\u81EA\u52D5\uFF09" : "\u7533\u8ACB\u3059\u308B")));
  })(), modal === "addSubcontractor" && selected && /* @__PURE__ */ React.createElement(Modal, { title: `\u5916\u6CE8\u8FFD\u52A0 \u2014 ${selected.name}`, accent: "#a78bfa", onClose: () => {
    setModal(null);
    setSubForm({ companyName: "", headcount: "1", date: todayStr(), memo: "", workers: "" });
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u4F1A\u793E\u540D *" }, (() => {
    const nameMap = /* @__PURE__ */ new Map();
    subcontractors.forEach((s) => {
      if (s.companyName) {
        const prev = nameMap.get(s.companyName);
        if (!prev || s.date > prev) nameMap.set(s.companyName, s.date);
      }
    });
    const sorted = [...nameMap.entries()].sort((a, b) => (b[1] || "").localeCompare(a[1] || ""));
    const selected_name = subForm.companyName;
    const chips = selected_name ? [...sorted.filter(([n]) => n === selected_name), ...sorted.filter(([n]) => n !== selected_name)] : sorted;
    return React.createElement(
      React.Fragment,
      null,
      chips.length > 0 && React.createElement(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 } },
        chips.map(([name]) => React.createElement("button", { key: name, type: "button", onClick: () => setSubForm((f) => ({ ...f, companyName: name })), style: { background: subForm.companyName === name ? "#a78bfa" : "#e5e7eb", color: subForm.companyName === name ? "#000" : "#a78bfa", border: "1px solid", borderColor: subForm.companyName === name ? "#a78bfa" : "#a78bfa44", borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" } }, name))
      ),
      React.createElement("input", { type: "text", value: subForm.companyName, onChange: (e) => setSubForm((f) => ({ ...f, companyName: e.target.value })), placeholder: "\u65B0\u898F\u4F1A\u793E\u540D\u3092\u5165\u529B or \u4E0A\u304B\u3089\u9078\u629E", style: IS })
    );
  })()), /* @__PURE__ */ React.createElement(Field, { label: "\u4EBA\u6570\uFF08\u4EBA\u5DE5\uFF09" }, /* @__PURE__ */ React.createElement("input", { type: "number", value: subForm.headcount, onWheel: (e) => e.currentTarget.blur(), onChange: (e) => setSubForm((f) => ({ ...f, headcount: e.target.value })), min: "1", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u4F5C\u696D\u54E1\u540D *" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: subForm.workers || "", onChange: (e) => setSubForm((f) => ({ ...f, workers: e.target.value })), placeholder: "\u4F8B: \u7530\u4E2D\u3001\u4F50\u85E4", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u65E5\u4ED8" }, /* @__PURE__ */ React.createElement("input", { type: "date", value: subForm.date, onChange: (e) => setSubForm((f) => ({ ...f, date: e.target.value })), style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u30E1\u30E2" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: subForm.memo, onChange: (e) => setSubForm((f) => ({ ...f, memo: e.target.value })), style: IS })), (() => {
    const canSubmit = subForm.companyName && (subForm.workers || "").trim();
    return /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
      if (!subForm.companyName || !(subForm.workers || "").trim()) return;
      const s = { id: uid(), projectId: selected.id, date: subForm.date, companyName: subForm.companyName, headcount: Number(subForm.headcount) || 1, memo: subForm.memo, workers: subForm.workers || "" };
      const ok = await insertSubcontractor(s);
      if (!ok) {
        showToast(WRITE_ERROR_MSG);
        return;
      }
      setSubcontractors((prev) => [s, ...prev]);
      setSubForm({ companyName: "", headcount: "1", date: todayStr(), memo: "", workers: "" });
      setModal(null);
      showToast("\u2713 \u5916\u6CE8\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
    }), disabled: !canSubmit || busy, style: { background: canSubmit && !busy ? "linear-gradient(135deg,#a78bfa,#6366f1)" : "#e5e7eb", color: canSubmit && !busy ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: canSubmit && !busy ? "pointer" : "not-allowed" } }, busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u8FFD\u52A0\u3059\u308B");
  })())), modal === "addAdditionalWork" && selected && /* @__PURE__ */ React.createElement(Modal, { title: `\u8FFD\u52A0\u5DE5\u4E8B \u2014 ${selected.name}`, accent: "#f59e0b", onClose: () => {
    setModal(null);
    setWorkForm({ description: "", floor: "", location: "" });
    setWorkPhoto(null);
  } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "\u30D5\u30ED\u30A2" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: workForm.floor, onChange: (e) => setWorkForm((f) => ({ ...f, floor: e.target.value })), placeholder: "\u4F8B: 3", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u5834\u6240" }, /* @__PURE__ */ React.createElement("input", { type: "text", value: workForm.location, onChange: (e) => setWorkForm((f) => ({ ...f, location: e.target.value })), placeholder: "\u4F8B: \u6A5F\u68B0\u5BA4\u524D\u5ECA\u4E0B", style: IS })), /* @__PURE__ */ React.createElement(Field, { label: "\u5185\u5BB9 *" }, /* @__PURE__ */ React.createElement("textarea", { value: workForm.description, onChange: (e) => setWorkForm((f) => ({ ...f, description: e.target.value })), placeholder: "\u8FFD\u52A0\u5DE5\u4E8B\u306E\u5185\u5BB9\uFF08\u6539\u884C\u53EF\uFF09", rows: 3, style: { ...IS, resize: "vertical", fontFamily: "'Noto Sans JP',sans-serif" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("input", { type: "file", accept: "image/*", capture: "environment", id: "workPhotoInput", style: { display: "none" }, onChange: async (e) => {
    var _a2;
    const file = (_a2 = e.target.files) == null ? void 0 : _a2[0];
    if (!file) return;
    try {
      const r = await resizeImageFile(file);
      setWorkPhoto(r);
    } catch (_) {
      showToast("\u26A0 \u753B\u50CF\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557");
    }
    e.target.value = "";
  } }), workPhoto ? /* @__PURE__ */ React.createElement("div", { style: { position: "relative", display: "inline-block" } }, /* @__PURE__ */ React.createElement("img", { src: workPhoto.preview, alt: "\u6DFB\u4ED8", style: { maxWidth: "100%", maxHeight: 150, borderRadius: 8, border: "1px solid #d1d5db" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setWorkPhoto(null), style: { position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", fontSize: 16, borderRadius: "50%", width: 28, height: 28, cursor: "pointer", lineHeight: "28px", textAlign: "center" } }, "\u2715")) : /* @__PURE__ */ React.createElement("button", { onClick: () => document.getElementById("workPhotoInput").click(), style: { width: "100%", background: "#fafafa", color: "#f59e0b", border: "1px dashed #f59e0b44", borderRadius: 8, padding: "10px", fontSize: 12, cursor: "pointer" } }, "\u{1F4F7} \u5199\u771F\u3092\u6DFB\u4ED8")), /* @__PURE__ */ React.createElement("button", { onClick: () => withBusy(async () => {
    if (!workForm.description) return;
    let imageUrl = "";
    if (workPhoto) {
      setPhotoUploading(true);
      imageUrl = await uploadFieldPhoto(workPhoto.base64, workPhoto.name, workPhoto.type) || "";
      setPhotoUploading(false);
      if (!imageUrl) {
        showToast("\u26A0 \u5199\u771F\u306E\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u306B\u5931\u6557");
        return;
      }
    }
    const w = { id: uid(), projectId: selected.id, description: workForm.description, floor: workForm.floor, location: workForm.location, imageUrl };
    const ok = await insertAdditionalWork(w);
    if (!ok) {
      showToast(WRITE_ERROR_MSG);
      return;
    }
    setAdditionalWorks((prev) => [w, ...prev]);
    setWorkForm({ description: "", floor: "", location: "" });
    setWorkPhoto(null);
    setModal(null);
    showToast("\u2713 \u8FFD\u52A0\u5DE5\u4E8B\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F");
  }), disabled: !workForm.description || busy || photoUploading, style: { background: workForm.description && !busy && !photoUploading ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "#e5e7eb", color: workForm.description && !busy && !photoUploading ? "#000" : "#9ca3af", border: "none", borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 700, cursor: workForm.description && !busy && !photoUploading ? "pointer" : "not-allowed" } }, photoUploading ? "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u4E2D\u2026" : busy ? "\u9001\u4FE1\u4E2D\u2026" : "\u8FFD\u52A0\u3059\u308B"))), lightboxImg && /* @__PURE__ */ React.createElement("div", { onClick: () => setLightboxImg(null), style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" } }, /* @__PURE__ */ React.createElement("img", { src: lightboxImg, alt: "\u62E1\u5927", style: { maxWidth: "100%", maxHeight: "100%", borderRadius: 8, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setLightboxImg(null), style: { position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, borderRadius: "50%", width: 36, height: 36, cursor: "pointer", lineHeight: "36px", textAlign: "center" } }, "\u2715")));
}
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary:", error, info);
  }
  async hardReset() {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (typeof caches !== "undefined") {
        const names = await caches.keys();
        for (const n of names) await caches.delete(n);
      }
      try {
        localStorage.clear();
      } catch (_) {
      }
      try {
        sessionStorage.clear();
      } catch (_) {
      }
    } catch (e) {
      console.error(e);
    }
    window.location.replace("/user?reset=" + Date.now());
  }
  render() {
    var _a;
    if (!this.state.hasError) return this.props.children;
    const msg = ((_a = this.state.error) == null ? void 0 : _a.message) || String(this.state.error || "\u4E0D\u660E\u306A\u30A8\u30E9\u30FC");
    return React.createElement(
      "div",
      { style: { minHeight: "100vh", background: "#e5e7eb", color: "#111827", fontFamily: "sans-serif", padding: 24, maxWidth: 480, margin: "0 auto" } },
      React.createElement("div", { style: { fontSize: 32, marginBottom: 12, textAlign: "center" } }, "\u26A0\uFE0F"),
      React.createElement("h2", { style: { color: "#ef4444", fontSize: 16, textAlign: "center", marginBottom: 8 } }, "\u30A2\u30D7\u30EA\u3067\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"),
      React.createElement("div", { style: { background: "#fef2f2", border: "1px solid #ef444433", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 11, color: "#fca5a5", wordBreak: "break-all" } }, msg),
      React.createElement("button", { onClick: () => window.location.reload(), style: { width: "100%", background: "#e5e7eb", color: "#111827", border: "1px solid #d1d5db", borderRadius: 8, padding: "12px", fontSize: 13, marginBottom: 8, cursor: "pointer" } }, "\u{1F504} \u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F"),
      React.createElement("button", { onClick: () => this.hardReset(), style: { width: "100%", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" } }, "\u{1F9F9} \u30AD\u30E3\u30C3\u30B7\u30E5\u5168\u524A\u9664\u3057\u3066\u518D\u8D77\u52D5"),
      React.createElement("div", { style: { fontSize: 10, color: "#111827", marginTop: 16, textAlign: "center" } }, "\u89E3\u6C7A\u3057\u306A\u3044\u5834\u5408\u306F\u7BA1\u7406\u8005\u306B\u9023\u7D61\u3057\u3066\u304F\u3060\u3055\u3044")
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ErrorBoundary, null, React.createElement(App)));
