// pages/index.jsx
// Future Face — AI Skin Analysis
// Screens: Upload → Age → Analyzing → Teaser → Email Gate → Confirmation → Results

import { useState, useRef, useEffect } from "react";

function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

const C = {
  burgundy: "#772135",
  dark:     "#5a1828",
  cream:    "#FAF6F0",
  warm:     "#FFFBF3",
  border:   "#E8D5C4",
  text:     "#2C1810",
  muted:    "#9B7B7B",
  gold:     "#C9A96E",
  green:    "#2D7A2D",
  amber:    "#B07D20",
  red:      "#C62828",
};

const STEPS = [
  "Detecting skin tone & texture",
  "Analyzing pores & sebum levels",
  "Mapping pigmentation patterns",
  "Assessing fine lines & aging markers",
  "Generating long-term skin outlook",
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const CameraIcon = ({ size = 20, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

const ImageUpIcon = ({ size = 20, color = "currentColor" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
    <path d="m14 19.5 3-3 3 3"/>
    <path d="M17 22v-5.5"/>
    <circle cx="9" cy="9" r="2"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  return s >= 70 ? C.green : s >= 45 ? C.amber : C.red;
}

function CircularScore({ score, size = 120, color, label, sub }) {
  const r    = 40;
  const circ = 2 * Math.PI * r;
  const col  = color || scoreColor(score);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke={C.border} strokeWidth="7"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={col} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition:"stroke-dashoffset 1.3s cubic-bezier(.34,1.56,.64,1)" }}/>
        <text x="50" y="45" textAnchor="middle" fontSize="22" fontWeight="700"
          fill={C.text} style={{ fontFamily:"Playfair Display" }}>{score}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill={C.muted}
          style={{ fontFamily:"Montserrat" }}>/100</text>
      </svg>
      {label && <div style={{ fontFamily:"Montserrat", fontSize:11, fontWeight:700, color:C.text,
        textAlign:"center", letterSpacing:".05em", textTransform:"uppercase" }}>{label}</div>}
      {sub   && <div style={{ fontFamily:"Montserrat", fontSize:10, color:C.muted, textAlign:"center" }}>{sub}</div>}
    </div>
  );
}

function Badge({ level }) {
  const map = {
    Low:        [C.green+"18", C.green],  Moderate:    ["#FFF8E1",      C.amber],
    High:       ["#FFEBEE",    C.red],    Excellent:   ["#EDF6FF",      "#1565C0"],
    Good:       [C.green+"18", C.green],  Dehydrated:  ["#FFEBEE",      C.red],
    Normal:     [C.green+"18", C.green],  Sensitive:   ["#FFEBEE",      C.red],
    Oily:       ["#FFF8E1",    C.amber],  Dry:         ["#FFEBEE",      C.red],
    Combination:["#FFF8E1",    C.amber],
  };
  const [bg, fg] = map[level] || ["#F5F5F5","#555"];
  return (
    <span style={{ background:bg, color:fg, padding:"3px 12px", borderRadius:20, fontSize:10,
      fontWeight:700, fontFamily:"Montserrat", letterSpacing:".07em", textTransform:"uppercase" }}>
      {level}
    </span>
  );
}

// ── Upload Screen ─────────────────────────────────────────────────────────────
function UploadScreen({ onFile, fileRef, cameraRef }) {
  const [drag, setDrag] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access was denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on this device. Please upload a photo instead.");
      } else {
        setCameraError("Could not access camera. Please try uploading a photo instead.");
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
    setCameraError("");
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      stopCamera();
      onFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  };

  return (
    <div style={{ textAlign: "center", animation: "fadeUp .6s ease both", maxWidth: 640, margin: "0 auto" }}>

      <div style={{ fontFamily: "Montserrat", fontSize: 11, fontWeight: 700, color: C.burgundy,
        letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 12 }}>
        AI Skin Analysis
      </div>

      <h1 style={{ fontFamily: "Playfair Display", fontSize: "clamp(32px,5vw,52px)",
        color: C.text, lineHeight: 1.15, marginBottom: 16 }}>
        See what your skin<br/>
        <em style={{ color: C.burgundy }}>may be asking for</em>
      </h1>

      <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 44px" }}>
        Upload a clear, well-lit, makeup-free selfie and get a photo-based snapshot of hydration,
        visible lines, tone evenness, blemish activity, and skin-age markers plus practical next steps.
      </p>

      {/* Upload / Camera box — split layout */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
        style={{ border: `2px dashed ${drag ? C.burgundy : C.border}`, borderRadius: 24,
          padding: "36px 20px", background: drag ? "rgba(119,33,53,.04)" : C.warm,
          transition: "all .2s ease", maxWidth: 480, margin: "0 auto 16px",
          boxSizing: "border-box", width: "100%" }}>

        <div style={{ fontFamily: "Playfair Display", fontSize: 20, color: C.text,
          textAlign: "center", marginBottom: 6 }}>
          Choose how to get started
        </div>
        <p style={{ fontFamily: "Montserrat", fontSize: 12, color: C.muted,
          textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>
          Front-facing · Natural light · No heavy makeup
        </p>

        {/* Split layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "stretch", minWidth: 0 }}>

          {/* Left: Take a selfie */}
          <button onClick={startCamera}
            style={{ background: `linear-gradient(135deg, ${C.burgundy}, ${C.dark})`,
              borderRadius: 16, padding: "28px 16px", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              minWidth: 0, width: "100%" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%",
              background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.2)",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CameraIcon size={28} color="#fff" />
            </div>
            <div style={{ fontFamily: "Montserrat", fontSize: 11, fontWeight: 700,
              color: "#fff", letterSpacing: ".1em", textTransform: "uppercase" }}>
              Take a selfie
            </div>
            <div style={{ fontFamily: "Montserrat", fontSize: 11,
              color: "rgba(255,255,255,.65)", textAlign: "center" }}>
              Use your camera now
            </div>
          </button>

          {/* Center: OR divider */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, padding: "0 14px" }}>
            <div style={{ flex: 1, width: 1, background: C.border }}/>
            <div style={{ fontFamily: "Montserrat", fontSize: 10, fontWeight: 700,
              color: C.muted, letterSpacing: ".08em" }}>OR</div>
            <div style={{ flex: 1, width: 1, background: C.border }}/>
          </div>

          {/* Right: Upload from device */}
          <button onClick={() => fileRef.current?.click()}
            style={{ background: "#fff", border: `1.5px solid ${C.border}`,
              borderRadius: 16, padding: "28px 16px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              transition: "border-color .2s", minWidth: 0, width: "100%" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.burgundy}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ width: 64, height: 64, borderRadius: "50%",
              background: "rgba(119,33,53,.08)", border: `1.5px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ImageUpIcon size={28} color={C.burgundy} />
            </div>
            <div style={{ fontFamily: "Montserrat", fontSize: 11, fontWeight: 700,
              color: C.text, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Upload a photo
            </div>
            <div style={{ fontFamily: "Montserrat", fontSize: 11,
              color: C.muted, textAlign: "center" }}>
              From your device
            </div>
          </button>
        </div>

        {cameraError && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10,
            background: "rgba(198,40,40,.08)", border: "1px solid rgba(198,40,40,.2)",
            color: C.red, fontFamily: "Montserrat", fontSize: 12, lineHeight: 1.5,
            textAlign: "left" }}>
            {cameraError}
          </div>
        )}

        {/* Accepted formats divider */}
        <div style={{ marginTop: 24, borderTop: `1px solid ${C.border}`, paddingTop: 16,
          textAlign: "center" }}>
          <div style={{ fontFamily: "Montserrat", fontSize: 10, fontWeight: 700,
            color: C.muted, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 4 }}>
            Accepted Formats
          </div>
          <div style={{ color: C.muted, fontSize: 11, fontFamily: "Montserrat" }}>
            JPG · PNG · WEBP · HEIC
          </div>
        </div>
      </div>
      {/* Camera modal */}
      {showCamera && (
        // AFTER
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 100,
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", gap: 20,
  overflowY: "auto", paddingTop: 16, paddingBottom: 24 }}>
          <div style={{ fontFamily: "Montserrat", fontSize: 11, fontWeight: 700,
            color: "rgba(255,255,255,.6)", letterSpacing: ".14em", textTransform: "uppercase" }}>
            Position your face in the frame
          </div>
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden",
            boxShadow: `0 0 0 3px rgba(201,169,110,.5)` }}>
            <video ref={videoRef} autoPlay playsInline muted
  className="camera-video"
  style={{ width: "min(400px, 90vw)", display: "block" }}/>
            {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
              <div key={`${v}${h}`} style={{ position: "absolute", [v]: 12, [h]: 12,
                width: 24, height: 24,
                borderTop:    v === "top"    ? `2px solid ${C.gold}` : "none",
                borderBottom: v === "bottom" ? `2px solid ${C.gold}` : "none",
                borderLeft:   h === "left"   ? `2px solid ${C.gold}` : "none",
                borderRight:  h === "right"  ? `2px solid ${C.gold}` : "none" }}/>
            ))}
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }}/>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <button onClick={capturePhoto}
              style={{ width: 64, height: 64, borderRadius: "50%",
                border: `3px solid ${C.gold}`, background: C.burgundy, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(119,33,53,.5)" }}>
              <CameraIcon size={24} color="#fff" />
            </button>
            <button onClick={stopCamera}
              style={{ padding: "0 24px", height: 48, borderRadius: 24,
                border: "1.5px solid rgba(255,255,255,.2)", background: "transparent",
                color: "rgba(255,255,255,.7)", cursor: "pointer",
                fontFamily: "Montserrat", fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => onFile(e.target.files[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />

      {/* Feature strip */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: "10px 24px", marginBottom: 20 }}>
        {["Visible blemish activity","Visible lines","Tone evenness",
          "Hydration","Skin-age markers","Long-term skin outlook"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 6,
            color: C.muted, fontSize: 12, fontFamily: "Montserrat" }}>
            <span style={{ color: C.burgundy, fontSize: 10 }}>✦</span> {f}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "Montserrat", fontSize: 10, color: C.muted, marginBottom: 6 }}>
        Your image is used only to generate your report and is not stored after processing.
      </div>
      <div style={{ fontFamily: "Montserrat", fontSize: 10, color: C.muted, opacity: .7 }}>
        This takes less than a minute.
      </div>
    </div>
  );
}

// ── Age Screen ────────────────────────────────────────────────────────────────
function AgeScreen({ imgSrc, age, setAge, error, setAgeError, apiError, onBack, onAnalyze }) {
  return (
    <div style={{ maxWidth:460, margin:"0 auto", textAlign:"center", animation:"fadeUp .5s ease both" }}>
      <div style={{ width:110, height:110, borderRadius:"50%", overflow:"hidden",
        margin:"0 auto 28px", border:`3px solid ${C.burgundy}`,
        boxShadow:"0 8px 24px rgba(119,33,53,.18)" }}>
        <img src={imgSrc} alt="selfie" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
      </div>
      <div style={{ fontFamily:"Montserrat", fontSize:11, fontWeight:700, color:C.burgundy,
        letterSpacing:".15em", textTransform:"uppercase", marginBottom:10 }}>
        Almost There
      </div>
      <h2 style={{ fontFamily:"Playfair Display", fontSize:30, color:C.text, marginBottom:10 }}>
        How old are you?
      </h2>
      <p style={{ color:C.muted, fontSize:14, lineHeight:1.7, marginBottom:32 }}>
        We use your age to compare your biological skin age against your real age and
        personalise your long-term skin outlook.
      </p>
      <input
        type="number" value={age}
        onChange={e => { setAge(e.target.value); setAgeError(""); }}
        onKeyDown={e => {
  if (e.key === "Enter") {
    const n = parseInt(age?.toString().trim());
    if (!age || isNaN(n) || n < 10 || n > 100) {
      setAgeError("Please enter a valid age between 10 and 100.");
      return;
    }
    onAnalyze();
  }
}}
        placeholder="e.g. 28"
        style={{ width:"100%", padding:"16px 20px", borderRadius:14, fontSize:18,
          border:`1.5px solid ${error ? C.red : C.border}`,
          background:C.warm, color:C.text, fontFamily:"Playfair Display",
          outline:"none", textAlign:"center", marginBottom:10,
          boxShadow:"0 2px 8px rgba(0,0,0,.04)", boxSizing:"border-box" }}
      />
      {error    && <div style={{ color:C.red,  fontSize:12, fontFamily:"Montserrat", marginBottom:10 }}>{error}</div>}
      {apiError && <div style={{ color:C.red,  fontSize:12, fontFamily:"Montserrat", marginBottom:10 }}>{apiError}</div>}
      <button onClick={() => { const n = parseInt(age); if (!age || isNaN(n) || n < 10 || n > 100) { setAgeError("Please enter a valid age between 10 and 100."); return; } onAnalyze(); }} className="ff-btn"
        style={{ width:"100%", padding:"17px", borderRadius:14, border:"none",
          background:`linear-gradient(135deg, ${C.burgundy}, ${C.dark})`, color:"#fff",
          fontSize:13, fontWeight:700, fontFamily:"Montserrat", letterSpacing:".1em",
          textTransform:"uppercase", boxShadow:"0 6px 20px rgba(119,33,53,.35)", marginBottom:14,
          cursor:"pointer" }}>
        Analyze My Skin →
      </button>
      <button onClick={onBack}
        style={{ background:"none", border:"none", color:C.muted, fontSize:13,
          cursor:"pointer", fontFamily:"Montserrat" }}>
        ← Use a different photo
      </button>
    </div>
  );
}

// ── Analyzing Screen ──────────────────────────────────────────────────────────
function AnalyzingScreen({ imgSrc, progress, stepIdx }) {
  return (
    <div style={{ maxWidth:500, margin:"0 auto", textAlign:"center" }}>
      <div style={{ position:"relative", width:220, height:260, margin:"0 auto 40px",
        borderRadius:20, overflow:"hidden", boxShadow:"0 12px 40px rgba(119,33,53,.2)" }}>
        <img src={imgSrc} alt="scanning" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        <div style={{ position:"absolute", inset:0, background:"rgba(119,33,53,.12)" }}/>
        <div style={{ position:"absolute", left:0, right:0, height:3,
          background:`linear-gradient(transparent, ${C.gold}, ${C.burgundy}, ${C.gold}, transparent)`,
          animation:"scanline 2.2s linear infinite", filter:"blur(1px)" }}/>
        {[["top","left"],["top","right"],["bottom","left"],["bottom","right"]].map(([v,h]) => (
          <div key={`${v}${h}`} style={{ position:"absolute", [v]:14, [h]:14, width:22, height:22,
            borderTop:    v==="top"    ? `2px solid ${C.gold}` : "none",
            borderBottom: v==="bottom" ? `2px solid ${C.gold}` : "none",
            borderLeft:   h==="left"   ? `2px solid ${C.gold}` : "none",
            borderRight:  h==="right"  ? `2px solid ${C.gold}` : "none" }}/>
        ))}
        <div style={{ position:"absolute", bottom:0, left:0, right:0,
          background:"linear-gradient(transparent,rgba(44,24,16,.75))", padding:"24px 16px 14px" }}>
          <div style={{ fontFamily:"Montserrat", fontSize:10, color:"rgba(255,255,255,.8)",
            animation:"pulse 1.5s ease infinite" }}>ANALYZING VISIBLE SKIN MARKERS</div>
        </div>
      </div>

      <h2 style={{ fontFamily:"Playfair Display", fontSize:26, color:C.text, marginBottom:6 }}>
        Analyzing Your Skin
      </h2>
      <p style={{ color:C.muted, fontSize:13, marginBottom:28, fontFamily:"Montserrat" }}>
        {STEPS[stepIdx]}
      </p>
      <div style={{ background:C.border, borderRadius:20, height:5, marginBottom:28, overflow:"hidden" }}>
        <div style={{ height:"100%", background:`linear-gradient(90deg, ${C.burgundy}, ${C.gold})`,
          borderRadius:20, width:`${progress}%`, transition:"width .9s ease" }}/>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10, textAlign:"left" }}>
        {STEPS.map((step, i) => {
          const done = i < stepIdx, active = i === stepIdx, pending = i > stepIdx;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
              opacity:pending ? .3 : 1, transition:"opacity .4s" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: done ? C.burgundy : active ? "transparent" : C.border,
                border: active ? `2px solid ${C.burgundy}` : "none",
                animation: active ? "glow 1.8s ease infinite" : "none",
                transition:"background .3s" }}>
                {done   && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                {active && <div style={{ width:8, height:8, borderRadius:"50%",
                  background:C.burgundy, animation:"pulse 1s ease infinite" }}/>}
              </div>
              <span style={{ fontFamily:"Montserrat", fontSize:13,
                color: active ? C.text : C.muted, fontWeight: active ? 600 : 400 }}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Teaser + Email Gate Screen ────────────────────────────────────────────────
function TeaserScreen({ analysis, email, setEmail, emailError, setEmailError, onSubmit, marketing, setMarketing }) {
  return (
    <div style={{ maxWidth:520, margin:"0 auto", animation:"fadeUp .6s ease both" }}>

      <div style={{ textAlign:"center", marginBottom:36 }}>
        <div style={{ fontFamily:"Montserrat", fontSize:11, fontWeight:700, color:C.burgundy,
          letterSpacing:".18em", textTransform:"uppercase", marginBottom:10 }}>
          Your first look
        </div>

        <h2 style={{ fontFamily:"Playfair Display", fontSize:"clamp(24px,4vw,34px)",
          color:C.text, lineHeight:1.2, marginBottom:6 }}>
          Here is what stands out<br/>in your photo
        </h2>

        <div style={{ background:C.warm, border:`1px solid ${C.border}`, borderRadius:20,
          padding:"8px 0", marginBottom:8, textAlign:"left" }}>
          {[
            `${analysis.skinType} skin pattern`,
            analysis.hydration?.level === "Dehydrated" || analysis.hydration?.score < 55
              ? "Moderate hydration opportunity"
              : "Good hydration levels detected",
            analysis.wrinkle?.score < 70
              ? "Early visible line formation"
              : "Minimal visible line formation",
          ].map((item, i, arr) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14,
              padding:"14px 24px",
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ color:C.burgundy, fontSize:12, flexShrink:0 }}>◆</span>
              <span style={{ fontFamily:"Montserrat", fontSize:14, color:C.text,
                lineHeight:1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <p style={{ fontFamily:"Montserrat", fontSize:12, color:C.muted,
          fontStyle:"italic", marginBottom:0 }}>
          Your photo suggests {analysis.skinType.toLowerCase()} skin,
          {analysis.hydration?.level === "Dehydrated" ? " moderate dehydration," : " adequate hydration,"}
          {" "}and early visible line formation.
        </p>
      </div>

      {/* Email gate */}
      <div style={{ background:C.warm, border:`1px solid ${C.border}`,
        borderRadius:24, padding:"36px 32px",
        boxShadow:"0 8px 32px rgba(119,33,53,.08)" }}>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
            letterSpacing:".15em", textTransform:"uppercase", marginBottom:12 }}>
            What you unlock
          </div>
          {[
            "Full skin snapshot",
            "Visible skin age estimate",
            "Long-term skin outlook",
            "Personalized support plan",
            "Future Face product recommendations",
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"6px 0", fontFamily:"Montserrat", fontSize:13, color:C.text }}>
              <span style={{ color:C.green, fontSize:12 }}>✓</span> {item}
            </div>
          ))}
        </div>

        <div style={{ height:1, background:C.border, marginBottom:24 }}/>

        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
          letterSpacing:".15em", textTransform:"uppercase", marginBottom:8 }}>
          Unlock your full report
        </div>
        <h3 style={{ fontFamily:"Playfair Display", fontSize:24, color:C.text,
          marginBottom:16, lineHeight:1.2 }}>
          Your skin age is ready
        </h3>

        <p style={{ color:C.muted, fontSize:13, lineHeight:1.7, marginBottom:24 }}>
          Enter your email to unlock your complete skin snapshot, long-term skin outlook,
          and personalized support plan.
        </p>

        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError(""); }}
onKeyDown={e => e.key === "Enter" && onSubmit()}
          placeholder="your@email.com"
          style={{ width:"100%", padding:"16px 20px", borderRadius:14, fontSize:15,
            border:`1.5px solid ${emailError ? C.red : C.border}`,
            background:"#fff", color:C.text, fontFamily:"Montserrat",
            outline:"none", boxSizing:"border-box", marginBottom:8 }}
        />

        {emailError && (
          <div style={{ color:C.red, fontSize:12, fontFamily:"Montserrat",
            marginBottom:8 }}>{emailError}</div>
        )}

        <button onClick={onSubmit}
          style={{ width:"100%", padding:"17px", borderRadius:14, border:"none",
            background:`linear-gradient(135deg, ${C.burgundy}, ${C.dark})`,
            color:"#fff", fontSize:13, fontWeight:700, fontFamily:"Montserrat",
            letterSpacing:".1em", textTransform:"uppercase", cursor:"pointer",
            boxShadow:"0 6px 20px rgba(119,33,53,.35)", marginBottom:16 }}>
          Send my full report →
        </button>

        <div style={{ fontFamily:"Montserrat", fontSize:11, color:C.muted, lineHeight:1.7 }}>
          We'll email your requested results.{" "}
          <label style={{ display:"flex", alignItems:"flex-start", gap:8,
            marginTop:10, cursor:"pointer" }}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={e => setMarketing(e.target.checked)}
              style={{ accentColor:C.burgundy, marginTop:2, flexShrink:0 }}
            />
            <span>
              I'd also like to receive Future Face updates and product education.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Age Comparison Card ───────────────────────────────────────────────────────
function AgeComparison({ skinAge, userAge }) {
  const diff    = skinAge - userAge;
  const absDiff = Math.abs(diff);
  const diffCol = diff > 3 ? C.red : diff < -3 ? C.green : C.amber;

  const summaryLine =
    diff === 0
      ? "Based on the visible markers in this photo, your skin is reading aligned with your chronological age."
      : diff > 0
      ? `Based on the visible markers in this photo, your skin is reading about ${absDiff} year${absDiff !== 1 ? "s" : ""} ahead of your chronological age.`
      : `Based on the visible markers in this photo, your skin is reading about ${absDiff} year${absDiff !== 1 ? "s" : ""} behind your chronological age.`;

  const icon = diff === 0 ? "=" : diff > 0 ? "↑" : "↓";

  return (
    <div style={{ width:"100%", background:C.warm, borderRadius:16,
      border:`1px solid ${C.border}`, overflow:"hidden" }}>

      <div style={{ background: diffCol + "14", padding:"8px 18px",
        borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.muted,
          letterSpacing:".1em", textTransform:"uppercase" }}>
          Visible skin age estimate
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", padding:"20px 18px", gap:10 }}>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:48, fontWeight:700,
            color:C.text, lineHeight:1 }}>{userAge}</div>
          <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.muted,
            letterSpacing:".08em", textTransform:"uppercase", marginTop:5 }}>Real age</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
          <div style={{ width:56, height:56, borderRadius:"50%",
            background: diffCol + "18",
            border:`2.5px solid ${diffCol}`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontFamily:"Montserrat", fontSize:8, fontWeight:800, color:diffCol,
              letterSpacing:".05em" }}>{icon}</div>
            <div style={{ fontFamily:"Playfair Display", fontSize:20, fontWeight:700,
              color:diffCol, lineHeight:1 }}>{absDiff}</div>
            <div style={{ fontFamily:"Montserrat", fontSize:7, color:diffCol, fontWeight:700 }}>YRS</div>
          </div>
          <div style={{ fontFamily:"Montserrat", fontSize:9, fontWeight:700, color:diffCol,
            textTransform:"uppercase", letterSpacing:".06em" }}>Difference</div>
        </div>

        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontFamily:"Playfair Display", fontSize:48, fontWeight:700,
            color:diffCol, lineHeight:1 }}>{skinAge}</div>
          <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.muted,
            letterSpacing:".08em", textTransform:"uppercase", marginTop:5 }}>Estimated skin age</div>
        </div>
      </div>

      <div style={{ background: diffCol + "10", borderTop:`1px solid ${diffCol}22`,
        padding:"10px 18px", textAlign:"center" }}>
        <div style={{ fontFamily:"Montserrat", fontSize:12, fontWeight:600, color:diffCol,
          lineHeight:1.5 }}>{summaryLine}</div>
      </div>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────
function ResultsScreen({ analysis, imgSrc, userAge, onReset }) {
  const isMobile = useWindowWidth() < 640;

  const metrics = [
    {
      key:"acne",
      label:"Visible blemish activity",
      icon:"🔍",
      data: analysis.acne,
      badge: analysis.acne?.riskLevel,
    },
    {
      key:"wrinkle",
      label:"Visible line formation",
      icon:"〰️",
      data: analysis.wrinkle,
      badge: analysis.wrinkle?.riskLevel,
    },
    {
      key:"pigmentation",
      label:"Tone evenness",
      icon:"🎨",
      data: analysis.pigmentation,
      badge: analysis.pigmentation?.riskLevel,
    },
    {
      key:"hydration",
      label:"Hydration reserve",
      icon:"💧",
      data: analysis.hydration,
      badge: analysis.hydration?.level,
    },
    {
      key:"barrier",
      label:"Barrier resilience",
      icon:"🛡️",
      data: analysis.barrier || {
        score: analysis.hydration?.score
          ? Math.min(100, Math.round(analysis.hydration.score * 0.9 + analysis.acne?.score * 0.1))
          : 65,
        description:
          "Your skin barrier appears moderately resilient in this photo. Consistent use of " +
          "ceramide-rich formulas and daily SPF can help maintain and strengthen barrier function over time.",
        riskLevel: analysis.hydration?.level === "Dehydrated" ? "Moderate" : "Good",
      },
      badge: analysis.barrier?.riskLevel || (analysis.hydration?.level === "Dehydrated" ? "Moderate" : "Good"),
    },
  ];

  const simNodes = [
    {
      year:"Now",
      icon:"📍",
      text:"What your skin is showing today.",
      label:"",
      highlight:false,
    },
    {
      year:"1 Year",
      icon:"📅",
      text:"You may begin to notice slightly drier texture, more visible fine lines, and less bounce through the eye and cheek area.",
      label:"With inconsistent support",
      highlight:false,
    },
    {
      year:"3 Years",
      icon:"📆",
      text:"Visible lines may deepen, tone may look less even, and skin may appear less firm if daily hydration and protection stay inconsistent.",
      label:"With inconsistent support",
      highlight:false,
    },
    {
      year:"5 Years",
      icon:"⭐",
      text:"With steady antioxidant support, barrier care, and daily SPF, skin is more likely to maintain smoother texture, stronger visible resilience, and a more even-looking tone.",
      label:"With consistent support",
      highlight:true,
    },
  ];

  return (
    <div style={{ animation:"fadeUp .6s ease both" }}>

      {/* Hero section */}
      {isMobile ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, marginBottom:28 }}>
          <div style={{ position:"relative", width:130, height:160, borderRadius:18,
            overflow:"hidden", boxShadow:"0 10px 36px rgba(119,33,53,.18)", flexShrink:0 }}>
            <img src={imgSrc} alt="your skin" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0,
              background:"linear-gradient(transparent,rgba(44,24,16,.75))", padding:"20px 10px 10px" }}>
              <div style={{ color:"rgba(255,255,255,.7)", fontFamily:"Montserrat", fontSize:8,
                fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" }}>
                Skin pattern in this photo
              </div>
              <div style={{ color:"#fff", fontFamily:"Playfair Display", fontSize:13 }}>
                {analysis.skinType}
              </div>
            </div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
              letterSpacing:".16em", textTransform:"uppercase", marginBottom:6 }}>
              Your skin snapshot
            </div>
            <h2 style={{ fontFamily:"Playfair Display", fontSize:26, color:C.text,
              lineHeight:1.2, marginBottom:0 }}>
              Your overall skin score:{" "}
              <span style={{ color:C.burgundy }}>{analysis.overallScore}</span>
              <span style={{ fontSize:15, color:C.muted }}>/100</span>
            </h2>
          </div>
          <AgeComparison skinAge={analysis.skinAge} userAge={userAge}/>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:28,
          alignItems:"start", marginBottom:32 }}>
          <div style={{ position:"relative", width:150, height:190, borderRadius:18,
            overflow:"hidden", boxShadow:"0 10px 36px rgba(119,33,53,.18)", flexShrink:0 }}>
            <img src={imgSrc} alt="your skin" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", bottom:0, left:0, right:0,
              background:"linear-gradient(transparent,rgba(44,24,16,.75))", padding:"24px 12px 12px" }}>
              <div style={{ color:"rgba(255,255,255,.7)", fontFamily:"Montserrat", fontSize:9,
                fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" }}>
                Skin pattern in this photo
              </div>
              <div style={{ color:"#fff", fontFamily:"Playfair Display", fontSize:15 }}>
                {analysis.skinType}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
              letterSpacing:".16em", textTransform:"uppercase", marginBottom:6 }}>
              Your skin snapshot
            </div>
            <h2 style={{ fontFamily:"Playfair Display", fontSize:"clamp(22px,3vw,32px)",
              color:C.text, lineHeight:1.2, marginBottom:18 }}>
              Your overall skin score:{" "}
              <span style={{ color:C.burgundy }}>{analysis.overallScore}</span>
              <span style={{ fontSize:16, color:C.muted }}>/100</span>
            </h2>
            <AgeComparison skinAge={analysis.skinAge} userAge={userAge}/>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div style={{
        display:"grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
        gap:16,
        marginBottom:28,
      }}>
        {metrics.map(({ key, label, icon, data, badge }) => (
          <div key={key} className="ff-hover" style={{ background:C.warm, borderRadius:18, padding:20,
            border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <Badge level={badge}/>
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:12 }}>
              <CircularScore score={data?.score ?? 0} size={isMobile ? 90 : 100}/>
            </div>
            <div style={{ fontFamily:"Montserrat", fontSize:12, fontWeight:700,
              color:C.text, marginBottom:6 }}>{label}</div>
            <p style={{ fontFamily:"Montserrat", fontSize:11, color:C.muted, lineHeight:1.6 }}>
              {data?.description}
            </p>
            {key === "acne" && data?.causes?.length > 0 && (
              <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:5 }}>
                {data.causes.map((c, i) => (
                  <span key={i} style={{ background:"rgba(119,33,53,.07)", color:C.burgundy,
                    borderRadius:10, padding:"2px 9px", fontSize:10, fontFamily:"Montserrat",
                    fontWeight:500 }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Long-term skin outlook */}
      <div style={{ background:C.warm, borderRadius:20, padding: isMobile ? "20px 16px" : 28,
        border:`1px solid ${C.border}`, marginBottom:28, boxShadow:"0 2px 12px rgba(0,0,0,.04)" }}>
        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
          letterSpacing:".16em", textTransform:"uppercase", marginBottom:4 }}>
          Long-term skin outlook
        </div>
        <h3 style={{ fontFamily:"Playfair Display", fontSize: isMobile ? 20 : 24,
          color:C.text, marginBottom:10 }}>
          Where your skin may be headed
        </h3>
        <p style={{ fontFamily:"Montserrat", fontSize:12, color:C.muted, lineHeight:1.7,
          marginBottom:24, fontStyle:"italic" }}>
          This forward-looking view is directional and based on the visible markers in this photo.
          It is not a guarantee or medical assessment.
        </p>
        <div style={{
          display:"grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(140px, 1fr))",
          gap:12,
        }}>
          {simNodes.map((node, i) => (
            <div key={i} style={{ borderRadius:16, padding:18, position:"relative",
              background: node.highlight
                ? "linear-gradient(145deg, rgba(119,33,53,.06), rgba(201,169,110,.1))"
                : "rgba(0,0,0,.025)",
              border:`1.5px solid ${node.highlight ? C.burgundy : C.border}` }}>
              {node.highlight && (
                <div style={{ position:"absolute", top:-9, left:"50%", transform:"translateX(-50%)",
                  background:C.burgundy, color:"#fff", fontSize:8, fontWeight:700,
                  padding:"2px 10px", borderRadius:10, fontFamily:"Montserrat",
                  letterSpacing:".07em", whiteSpace:"nowrap" }}>
                  MOST SUPPORTED OUTCOME
                </div>
              )}
              <div style={{ fontSize:22, marginBottom:10 }}>{node.icon}</div>
              <div style={{ fontFamily:"Playfair Display", fontSize:17,
                color: node.highlight ? C.burgundy : C.text, marginBottom:2 }}>{node.year}</div>
              {node.label && (
                <div style={{ fontFamily:"Montserrat", fontSize:9, color:C.muted, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>{node.label}</div>
              )}
              <p style={{ fontFamily:"Montserrat", fontSize:11, color:C.muted, lineHeight:1.6 }}>
                {node.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Support plan */}
      <div style={{ background:`linear-gradient(140deg, ${C.burgundy} 0%, ${C.dark} 100%)`,
        borderRadius:20, padding: isMobile ? "20px 18px" : 28, marginBottom:20, color:"#fff" }}>
        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, letterSpacing:".16em",
          textTransform:"uppercase", opacity:.65, marginBottom:6 }}>Personalized for You</div>
        <h3 style={{ fontFamily:"Playfair Display", fontSize: isMobile ? 20 : 24, marginBottom:24 }}>
          Your Future Face support plan
        </h3>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            {
              heading: "Protect daily",
              body: "Use a broad-spectrum SPF 30+ every morning and reapply during prolonged UV exposure.",
            },
            {
              heading: "Support from within",
              body: "Add daily antioxidant support with 365 SkinFuel to help skin deal with ongoing oxidative stress.",
            },
            {
              heading: "Hydrate on the surface",
              body: "Use a barrier-supportive moisturizer 365 SkinDrench morning and night to help skin hold water more effectively.",
            },
          ].map((rec, i) => (
            <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
              <div style={{ width:30, height:30, borderRadius:"50%",
                background:"rgba(255,255,255,.15)", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"Playfair Display", fontSize:14, fontWeight:700, color:"#fff" }}>{i + 1}</div>
              <p style={{ fontFamily:"Montserrat", fontSize:13, lineHeight:1.7,
                opacity:.9, paddingTop:5, margin:0 }}>
                <strong style={{ display:"block", marginBottom:2, opacity:1 }}>{rec.heading}</strong>
                {rec.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Product bridge */}
      <div style={{ background:C.warm, border:`1px solid ${C.border}`, borderRadius:16,
        padding:"20px 24px", marginBottom:28 }}>
        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700, color:C.burgundy,
          letterSpacing:".14em", textTransform:"uppercase", marginBottom:14 }}>
          Recommended system for this result
        </div>
        {[
          { name:"365 SkinFuel", desc:"Daily internal antioxidant support" },
          { name:"365 SkinDrench", desc:"Barrier-first hydration and smoother wear under makeup" },
        ].map((p, i) => (
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12,
            paddingBottom: i === 0 ? 14 : 0,
            borderBottom: i === 0 ? `1px solid ${C.border}` : "none",
            marginBottom: i === 0 ? 14 : 0 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.burgundy,
              flexShrink:0, marginTop:5 }}/>
            <div>
              <div style={{ fontFamily:"Montserrat", fontSize:13, fontWeight:700,
                color:C.text }}>{p.name}</div>
              <div style={{ fontFamily:"Montserrat", fontSize:12, color:C.muted,
                marginTop:2 }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div style={{ background:"rgba(119,33,53,.04)", borderRadius:14, padding:"14px 18px",
        marginBottom:28, border:"1px solid rgba(119,33,53,.12)" }}>
        <p style={{ fontFamily:"Montserrat", fontSize:11, color:C.muted, lineHeight:1.6,
          textAlign:"center", margin:0 }}>
          This analysis is designed for informational and cosmetic guidance only. It is not a
          diagnosis or a substitute for medical care. For persistent or clinical skin concerns,
          consult a licensed dermatologist.
        </p>
      </div>

     {/* CTAs */}
      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap",
        flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
        <a href="https://futureface.ca/shop/" target="_blank" rel="noopener noreferrer"
          className="ff-btn"
          style={{ background:`linear-gradient(135deg, ${C.burgundy}, ${C.dark})`, color:"#fff",
            padding:"15px 24px", borderRadius:14, fontFamily:"Montserrat", fontSize:13,
            fontWeight:700, textDecoration:"none", letterSpacing:".04em",
            textTransform:"uppercase", boxShadow:"0 6px 20px rgba(119,33,53,.35)",
            textAlign:"center", wordBreak:"keep-all", whiteSpace: isMobile ? "normal" : "nowrap",
            boxSizing:"border-box", width: isMobile ? "100%" : "auto" }}>
          Build my Future Face routine →
        </a>
        <button onClick={onReset} className="ff-btn"
          style={{ background:"none", border:`1.5px solid ${C.border}`, color:C.muted,
            padding:"15px 28px", borderRadius:14, fontFamily:"Montserrat", fontSize:13,
            cursor:"pointer", textAlign:"center" }}>
          Upload a new photo
        </button>
      </div>
    </div>
  );
}

// ── Confirmation Screen ───────────────────────────────────────────────────────
function ConfirmationScreen({ email, onReset }) {
  return (
    <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center",
      animation:"fadeUp .6s ease both" }}>
      <div style={{ width:80, height:80, borderRadius:"50%",
        background:"rgba(119,33,53,.08)", border:`2px solid ${C.burgundy}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        margin:"0 auto 28px", fontSize:32 }}>
        ✉️
      </div>
      <div style={{ fontFamily:"Montserrat", fontSize:11, fontWeight:700,
        color:C.burgundy, letterSpacing:".18em", textTransform:"uppercase",
        marginBottom:12 }}>
        Report sent
      </div>
      <h2 style={{ fontFamily:"Playfair Display", fontSize:"clamp(26px,4vw,36px)",
        color:C.text, lineHeight:1.2, marginBottom:14 }}>
        Check your inbox
      </h2>
      <p style={{ fontFamily:"Montserrat", fontSize:14, color:C.muted,
        lineHeight:1.7, marginBottom:8 }}>
        Your full skin snapshot has been sent to
      </p>
      <div style={{ fontFamily:"Montserrat", fontSize:15, fontWeight:700,
        color:C.burgundy, marginBottom:28 }}>
        {email}
      </div>
      <div style={{ background:C.warm, border:`1px solid ${C.border}`,
        borderRadius:16, padding:"20px 24px", marginBottom:32, textAlign:"left" }}>
        <div style={{ fontFamily:"Montserrat", fontSize:10, fontWeight:700,
          color:C.burgundy, letterSpacing:".14em", textTransform:"uppercase",
          marginBottom:12 }}>
          Your report includes
        </div>
        {[
          "Full skin snapshot & overall score",
          "Visible skin age estimate",
          "Long-term skin outlook",
          "Your Future Face support plan",
          "Recommended products for your result",
        ].map((item, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
            padding:"6px 0", fontFamily:"Montserrat", fontSize:13, color:C.text,
            borderBottom: i < 4 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ color:C.green, fontSize:12, flexShrink:0 }}>✓</span>
            {item}
          </div>
        ))}
      </div>
      <p style={{ fontFamily:"Montserrat", fontSize:11, color:C.muted,
        lineHeight:1.6, marginBottom:32 }}>
        Didn't receive it? Check your spam folder. It usually arrives within a minute.
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:12, alignItems:"stretch" }}>
        <a href="https://futureface.ca/shop/" target="_blank" rel="noopener noreferrer"
          style={{ background:`linear-gradient(135deg, ${C.burgundy}, ${C.dark})`,
            color:"#fff", padding:"15px 32px", borderRadius:14,
            fontFamily:"Montserrat", fontSize:13, fontWeight:700,
            textDecoration:"none", letterSpacing:".08em",
            textTransform:"uppercase", textAlign:"center",
            boxShadow:"0 6px 20px rgba(119,33,53,.35)" }}>
          Build my Future Face routine →
        </a>
        <button onClick={onReset}
          style={{ background:"none", border:`1.5px solid ${C.border}`,
            color:C.muted, padding:"15px 28px", borderRadius:14,
            fontFamily:"Montserrat", fontSize:13, cursor:"pointer" }}>
          Upload a new photo
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FutureFaceSkinAnalysis() {
  const [phase,      setPhase]      = useState("upload");
  const [imgSrc,     setImgSrc]     = useState(null);
  const [imgB64,     setImgB64]     = useState(null);
  const [imgType,    setImgType]    = useState("image/jpeg");
  const [age,        setAge]        = useState("");
  const [ageError,   setAgeError]   = useState("");
  const [apiError,   setApiError]   = useState("");
  const [analysis,   setAnalysis]   = useState(null);
  const [progress,   setProgress]   = useState(0);
  const [stepIdx,    setStepIdx]    = useState(0);
  const [email,      setEmail]      = useState("");
  const [emailError, setEmailError] = useState("");
  const [marketing,  setMarketing]  = useState(false);
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  const loadFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else        { w = Math.round((w * MAX) / h); h = MAX; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);
        setImgSrc(compressed);
        setImgB64(compressed.split(",")[1]);
        setImgType("image/jpeg");
        setPhase("age");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    const currentAge = age?.toString().trim();
    const n = parseInt(currentAge);
    if (!currentAge || isNaN(n) || n < 10 || n > 100) {
      setAgeError("Please enter a valid age between 10 and 100.");
      return;
    }
    setAgeError(""); setApiError("");
    setPhase("analyzing"); setProgress(0); setStepIdx(0);

    STEPS.forEach((_, i) => {
      setTimeout(() => {
        setStepIdx(i);
        setProgress(Math.round(((i + 1) / STEPS.length) * 88));
      }, i * 1300);
    });

    try {
      const res = await fetch("/api/analyze-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgB64, mimeType: imgType, age: n }),
      });
      if (!res.ok) throw new Error("API error");
      const { result } = await res.json();
      setAnalysis(result);
      setProgress(100);
      setTimeout(() => setPhase("teaser"), 700);
    } catch {
      setApiError("Analysis failed. Please check your image and try again.");
      setPhase("age");
    }
  };

  const handleSendReport = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    try {
      const res = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          analysis,
          userAge: parseInt(age),
          marketing,
        }),
      });
      if (!res.ok) throw new Error();
      setPhase("confirmation");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    }
  };

  const reset = () => {
    setPhase("upload"); setImgSrc(null); setImgB64(null);
    setAge(""); setAnalysis(null); setApiError(""); setAgeError("");
    setEmail(""); setEmailError(""); setMarketing(false);
  };

  const phases = ["upload", "age", "analyzing", "teaser", "confirmation", "results"];

  return (
    <div style={{ minHeight:"100vh", background:C.cream, fontFamily:"Montserrat, sans-serif",
      display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ padding:"18px clamp(16px,4vw,48px)", display:"flex", alignItems:"center",
        justifyContent:"space-between", borderBottom:`1px solid ${C.border}`,
        background:C.warm, position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontFamily:"Playfair Display", fontSize:22, fontWeight:700,
          color:C.burgundy, letterSpacing:".02em" }}>Future Face</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {phase !== "upload" && (
            <div style={{ display:"flex", gap:6 }}>
              {phases.map((p, i) => (
                <div key={p} style={{ width:6, height:6, borderRadius:"50%",
                  background: phases.indexOf(phase) >= i ? C.burgundy : C.border,
                  transition:"background .3s" }}/>
              ))}
            </div>
          )}
          <div style={{ background:C.burgundy, color:"#fff", padding:"4px 12px", borderRadius:20,
            fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
            whiteSpace:"nowrap" }}>
            AI Skin Analysis
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, padding:"clamp(24px,5vw,64px) clamp(14px,4vw,48px)",
        maxWidth:960, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>

        {phase === "upload" && (
          <UploadScreen onFile={loadFile} fileRef={fileRef} cameraRef={cameraRef} />
        )}
        {phase === "age" && (
          <AgeScreen imgSrc={imgSrc} age={age} setAge={setAge}
    error={ageError} setAgeError={setAgeError} apiError={apiError}
    onBack={reset} onAnalyze={handleAnalyze}/>
        )}
        {phase === "analyzing" && (
          <AnalyzingScreen imgSrc={imgSrc} progress={progress} stepIdx={stepIdx}/>
        )}
        {phase === "teaser" && analysis && (
          <TeaserScreen
  analysis={analysis}
  email={email}
  setEmail={setEmail}
  emailError={emailError}
  setEmailError={setEmailError}
  marketing={marketing}
  setMarketing={setMarketing}
  onSubmit={handleSendReport}
/>
        )}
        {phase === "confirmation" && (
          <ConfirmationScreen email={email} onReset={reset} />
        )}
        {phase === "results" && (
          <ResultsScreen analysis={analysis} imgSrc={imgSrc}
            userAge={parseInt(age)} onReset={reset}/>
        )}
      </div>
    </div>
  );
}