import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, deleteDoc,
  collection, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ════════════════════════════════════════════════════
//  🔥 FIREBASE CONFIG — replace with your project values
// ════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
   apiKey: "AIzaSyB_gNokFnucM2nNAhhkRRnPsPNBAShYlMs",
  authDomain: "it-token.firebaseapp.com",
  projectId: "it-token",
  storageBucket: "it-token.firebasestorage.app",
  messagingSenderId: "804328953904",
  appId: "1:804328953904:web:e760545b579bf2527075f5",
};

// ════════════════════════════════════════════════════
//  🔐 AUTH CONFIG
//  - Admin: create a user in Firebase Console > Authentication > Email/Password
//  - Viewer: shared read-only PIN (no Firebase account needed)
// ════════════════════════════════════════════════════
const ADMIN_EMAIL  = "admin@fflc.app";   // ← change to your admin email
const VIEWER_PIN   = "fflc2026";         // ← change to your preferred viewer PIN

// Firestore collection paths  (compatible with existing security rules)
const APP_ID = typeof __app_id !== "undefined" ? __app_id : "fflc-portal";
const BASE   = `artifacts/${APP_ID}/public/data`;
const COL    = {
  members:  `${BASE}/fflc_members`,
  payments: `${BASE}/fflc_payments`,
  expenses: `${BASE}/fflc_expenses`,
  meta:     `${BASE}/meta`,
};

// ════════════════════════════════════════════════════
//  SEED DATA  (loaded from your original documents)
// ════════════════════════════════════════════════════
const MEMBERS_SEED = [
  { id:"1", name:"Shazali Mohd Musa",        designation:"Chairman"  },
  { id:"2", name:"Abba Bello Abba",           designation:"Secretary" },
  { id:"3", name:"Yahaya Mohd",               designation:"Treasurer" },
  { id:"4", name:"Fadil Bello Abba",          designation:"P.R.O"     },
  { id:"5", name:"Abubakar Abdussalam Bello", designation:"Member"    },
  { id:"6", name:"Bilal Bello Abba",          designation:"Member"    },
  { id:"7", name:"Muhammad Hashim Abba",      designation:"Member"    },
  { id:"8", name:"Aisha Bello Abba",          designation:"Member"    },
];

const PAYMENTS_SEED = {
  "1-2025-06":20000,"1-2025-07":20000,"1-2025-08":20000,"1-2025-09":20000,
  "1-2025-10":20000,"1-2025-11":20000,"1-2025-12":20000,
  "1-2026-01":20000,"1-2026-02":20000,
  "2-2025-06":20000,"2-2025-07":20000,"2-2025-08":20000,"2-2025-09":20000,
  "2-2025-10":20000,"2-2025-11":20000,"2-2025-12":20000,
  "3-2025-06":20000,"3-2025-07":20000,"3-2025-08":20000,"3-2025-09":20000,
  "3-2025-10":20000,"3-2025-11":20000,"3-2025-12":20000,
  "4-2025-06":20000,"4-2025-07":20000,"4-2025-08":20000,"4-2025-09":20000,
  "4-2025-10":20000,"4-2025-11":20000,"4-2025-12":20000,
  "5-2025-06":20000,"5-2025-07":20000,"5-2025-08":20000,"5-2025-09":20000,
  "5-2025-10":20000,"5-2025-11":20000,"5-2025-12":20000,
  "5-2026-01":20000,"5-2026-02":20000,
  "6-2025-06":20000,"6-2025-07":20000,"6-2025-08":20000,"6-2025-09":20000,
  "6-2025-10":20000,"6-2025-11":20000,
  "7-2025-06":20000,"7-2025-07":20000,"7-2025-08":20000,"7-2025-09":20000,
  "7-2025-10":20000,"7-2025-11":20000,"7-2025-12":20000,
  "8-2025-06":20000,"8-2025-07":20000,"8-2025-08":20000,"8-2025-09":20000,
  "8-2025-10":20000,"8-2025-11":20000,"8-2025-12":20000,
};

const EXPENSES_SEED = [
  { id:"e1", date:"2025-06-01", category:"Land Acquisition – M.I. Real Estate",  description:"Initial deposit + application form for plot #539, Langel Sabuwar Abuja Estate (40×40)", amount:210000 },
  { id:"e2", date:"2025-11-01", category:"Land Installment – M.I. Real Estate",  description:"November 2025 installment — Langel Sabuwar Abuja Estate",                                 amount:100000 },
  { id:"e3", date:"2025-12-01", category:"Land Installment – M.I. Real Estate",  description:"December 2025 installment — Langel Sabuwar Abuja Estate",                                 amount:100000 },
  { id:"e4", date:"2025-12-01", category:"Land Acquisition – Urwah Nigeria Ltd", description:"Transfer of ownership reimbursement to Abubakar — plot #46, Urwah Nigeria Ltd (40×40)",   amount:300000 },
  { id:"e5", date:"2025-12-01", category:"Land Installment – Urwah Nigeria Ltd", description:"December 2025 installment — plot #46 Urwah Nigeria Ltd",                                   amount:55000  },
  { id:"e6", date:"2025-06-01", category:"Transportation",                        description:"Transportation cost for site visitation",                                                  amount:5000   },
  { id:"e7", date:"2026-01-01", category:"Land Installment – Urwah Nigeria Ltd", description:"January 2026 installment — plot #46 Urwah Nigeria Ltd",                                    amount:55000  },
  { id:"e8", date:"2026-02-01", category:"Land Installment – Urwah Nigeria Ltd", description:"February 2026 installment — plot #46 Urwah Nigeria Ltd",                                   amount:55000  },
];

const EXPENSE_CATS = [
  "Land Acquisition – M.I. Real Estate",
  "Land Installment – M.I. Real Estate",
  "Land Acquisition – Urwah Nigeria Ltd",
  "Land Installment – Urwah Nigeria Ltd",
  "Administrative","Transportation","Legal & Documentation","Other",
];

const LAND_PROPS = [
  { id:"L1", name:"Langel Sabuwar Abuja Estate", vendor:"M.I. Real Estate & General Enterprises Ltd", catKey:"M.I.",  plotNo:"539", plotSize:"40 × 40", totalCost:2700000, monthly:100000, months:25, start:"Nov 2025" },
  { id:"L2", name:"Urwah Estate – Plot #46",     vendor:"Urwah Nigeria Limited (RC No. 1873308)",     catKey:"Urwah", plotNo:"46",  plotSize:"40 × 40", totalCost:1800000, monthly:55000,  months:32, start:"Dec 2025" },
];

const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const padM = i => String(i+1).padStart(2,"0");
const fmtK    = n => n>=1000000?`₦${(n/1000000).toFixed(2)}M`:n>=1000?`₦${Math.round(n/1000)}K`:`₦${n}`;
const fmtFull = n => `₦${n.toLocaleString()}`;

// ════════════════════════════════════════════════════
//  FIREBASE SINGLETON
// ════════════════════════════════════════════════════
let _app, _auth, _db;
function fb() {
  if (!_app) {
    _app  = initializeApp(FIREBASE_CONFIG);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
  }
  return { auth:_auth, db:_db };
}

// ════════════════════════════════════════════════════
//  ICONS
// ════════════════════════════════════════════════════
const S = { width:20, height:20 };
const I = {
  Grid:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Users:  p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Card:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Stack:  p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Home:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 11 12 2 21 11 21 21 3 21 3 11"/></svg>,
  Chart:  p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Plus:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Check:  p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>,
  Trash:  p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Edit:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Out:    p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Eye:    p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Shield: p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Spin:   p=><svg {...S} {...p} style={{animation:"_spin 1s linear infinite",...(p.style||{})}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
  Menu:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X:      p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Info:   p=><svg {...S} {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

// ════════════════════════════════════════════════════
//  GLOBAL STYLES
// ════════════════════════════════════════════════════
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{background:#070d14;color:#cdd6e0;font-family:'Bricolage Grotesque',sans-serif;overflow-x:hidden}
input,select,textarea,button{font-family:inherit}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#162030;border-radius:3px}
@keyframes _spin{to{transform:rotate(360deg)}}
@keyframes _up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes _pop{0%{transform:scale(0.94);opacity:0}100%{transform:scale(1);opacity:1}}
.aup{animation:_up 0.28s ease both}
.apop{animation:_pop 0.22s ease both}
input:focus,select:focus{outline:none;border-color:#22c55e!important;box-shadow:0 0 0 3px rgba(34,197,94,0.1)!important}
.tappable{transition:transform 0.12s,opacity 0.12s;cursor:pointer;-webkit-user-select:none;user-select:none}
.tappable:active{transform:scale(0.95);opacity:0.85}
.nav-btn{transition:all 0.15s}
.nav-btn:hover{background:rgba(34,197,94,0.07)!important}
.cell{transition:all 0.13s;cursor:pointer}
.cell:active{transform:scale(0.9)}
`;

// ════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════
export default function App() {
  const [role,    setRole]    = useState(null);   // null | "admin" | "viewer"
  const [fbUser,  setFbUser]  = useState(null);
  const [booting, setBooting] = useState(true);
  const [page,    setPage]    = useState("dashboard");
  const [drawer,  setDrawer]  = useState(false);

  // data state
  const [members,  setMembers]  = useState(MEMBERS_SEED);
  const [payments, setPayments] = useState(PAYMENTS_SEED);
  const [expenses, setExpenses] = useState(EXPENSES_SEED);
  const [online,   setOnline]   = useState(false);
  const [fbErr,    setFbErr]    = useState(null);

  const isAdmin = role === "admin";

  // ── Firebase auth listener ─────────────────────────────
  useEffect(() => {
    try {
      const { auth } = fb();
      return onAuthStateChanged(auth, user => {
        if (user) { setFbUser(user); setRole("admin"); setOnline(true); }
        setBooting(false);
      });
    } catch(e) {
      setFbErr("Firebase not configured — running on seed data.");
      setBooting(false);
    }
  }, []);

  // ── Real-time Firestore listeners ──────────────────────
  useEffect(() => {
    if (!online || !role) return;
    const unsubs = [];
    try {
      const { db } = fb();

      unsubs.push(onSnapshot(collection(db, COL.members), snap => {
        const docs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        if (docs.length) setMembers(docs.sort((a,b) => Number(a.id)-Number(b.id)));
      }));

      unsubs.push(onSnapshot(collection(db, COL.payments), snap => {
        let merged = {};
        snap.docs.forEach(d => { const data = d.data(); if (data.months) merged = {...merged,...data.months}; });
        if (Object.keys(merged).length) setPayments(merged);
      }));

      unsubs.push(onSnapshot(collection(db, COL.expenses), snap => {
        const docs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        if (docs.length) setExpenses(docs);
      }));
    } catch(e) { setFbErr(String(e)); }
    return () => unsubs.forEach(u => u());
  }, [online, role]);

  // ── Write helpers ──────────────────────────────────────
  const wMembers = useCallback(async list => {
    setMembers(list);
    if (!online) return;
    const { db } = fb();
    await Promise.all(list.map(m => setDoc(doc(db, COL.members, m.id), m)));
  }, [online]);

  const wPayments = useCallback(async map => {
    setPayments(map);
    if (!online) return;
    const { db } = fb();
    const byMid = {};
    Object.entries(map).forEach(([k,v]) => {
      const mid = k.split("-")[0];
      if (!byMid[mid]) byMid[mid] = {};
      byMid[mid][k] = v;
    });
    await Promise.all(Object.entries(byMid).map(([mid, months]) =>
      setDoc(doc(db, COL.payments, mid), { memberId:mid, months }, { merge:true })
    ));
  }, [online]);

  const wExpenses = useCallback(async list => {
    setExpenses(list);
    if (!online) return;
    const { db } = fb();
    await Promise.all(list.map(e => setDoc(doc(db, COL.expenses, e.id), e)));
  }, [online]);

  const delExpense = useCallback(async id => {
    const next = expenses.filter(e => e.id !== id);
    setExpenses(next);
    if (!online) return;
    const { db } = fb();
    await deleteDoc(doc(db, COL.expenses, id));
  }, [expenses, online]);

  // ── Seed initial data to Firestore ────────────────────
  const seedFirestore = useCallback(async () => {
    try {
      const { db } = fb();
      await Promise.all(MEMBERS_SEED.map(m => setDoc(doc(db, COL.members, m.id), m)));
      const byMid = {};
      Object.entries(PAYMENTS_SEED).forEach(([k,v]) => {
        const mid = k.split("-")[0];
        if (!byMid[mid]) byMid[mid] = {};
        byMid[mid][k] = v;
      });
      await Promise.all(Object.entries(byMid).map(([mid, months]) =>
        setDoc(doc(db, COL.payments, mid), { memberId:mid, months })
      ));
      await Promise.all(EXPENSES_SEED.map(e => setDoc(doc(db, COL.expenses, e.id), e)));
      await setDoc(doc(db, COL.meta, "fflc_init"), { seeded:true, at:serverTimestamp() });
      alert("✅ Data seeded to Firestore successfully!");
    } catch(e) { alert("Seed error: " + e.message); }
  }, []);

  // ── Login / logout ─────────────────────────────────────
  const loginAdmin = async (email, pw) => {
    const { auth } = fb();
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    setFbUser(cred.user); setRole("admin"); setOnline(true);
  };
  const loginViewer = pin => {
    if (pin !== VIEWER_PIN) throw new Error("Incorrect PIN. Try again.");
    setRole("viewer"); setOnline(true);
  };
  const logout = async () => {
    if (fbUser) { const { auth } = fb(); await signOut(auth); }
    setFbUser(null); setRole(null); setOnline(false); setPage("dashboard");
    setMembers(MEMBERS_SEED); setPayments(PAYMENTS_SEED); setExpenses(EXPENSES_SEED);
  };

  const totalIn  = Object.values(payments).reduce((s,v) => s+v, 0);
  const totalOut = expenses.reduce((s,e) => s+e.amount, 0);
  const balance  = totalIn - totalOut;

  if (booting) return <Splash />;
  if (!role)   return <LoginScreen onAdmin={loginAdmin} onViewer={loginViewer} fbErr={fbErr} />;

  const NAV = [
    { key:"dashboard", label:"Dashboard", Ic: I.Grid  },
    { key:"members",   label:"Members",   Ic: I.Users },
    { key:"payments",  label:"Payments",  Ic: I.Card  },
    { key:"expenses",  label:"Expenses",  Ic: I.Stack },
    { key:"land",      label:"Land",      Ic: I.Home  },
    { key:"reports",   label:"Reports",   Ic: I.Chart },
  ];

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ display:"flex", minHeight:"100dvh" }}>

        {/* Drawer overlay */}
        {drawer && <div onClick={()=>setDrawer(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:60 }} />}

        {/* Slide-in drawer (mobile) + fixed sidebar (desktop via media style below) */}
        <nav style={{ position:"fixed", top:0, left: drawer?0:-268, width:248, height:"100dvh", background:"#05090f", borderRight:"1px solid #0e1c28", zIndex:70, display:"flex", flexDirection:"column", transition:"left 0.25s cubic-bezier(.4,0,.2,1)", willChange:"left" }}>
          <NavInner NAV={NAV} page={page} setPage={k=>{setPage(k);setDrawer(false);}} isAdmin={isAdmin} online={online} onSeed={seedFirestore} onLogout={logout} onClose={()=>setDrawer(false)} />
        </nav>

        {/* Main column */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <TopBar label={NAV.find(n=>n.key===page)?.label||""} isAdmin={isAdmin} online={online} onMenu={()=>setDrawer(true)} />
          <main style={{ flex:1, padding:"14px 14px 88px", maxWidth:1060, width:"100%", margin:"0 auto" }} key={page} className="aup">
            {page==="dashboard" && <Dashboard members={members} payments={payments} expenses={expenses} totalIn={totalIn} totalOut={totalOut} balance={balance} />}
            {page==="members"   && <MembersPage  members={members} payments={payments} wMembers={wMembers} isAdmin={isAdmin} />}
            {page==="payments"  && <PaymentsPage members={members} payments={payments} wPayments={wPayments} isAdmin={isAdmin} />}
            {page==="expenses"  && <ExpensesPage expenses={expenses} wExpenses={wExpenses} delExpense={delExpense} isAdmin={isAdmin} />}
            {page==="land"      && <LandPage expenses={expenses} />}
            {page==="reports"   && <ReportsPage members={members} payments={payments} expenses={expenses} totalIn={totalIn} totalOut={totalOut} balance={balance} />}
          </main>
          <BottomNav NAV={NAV} page={page} setPage={setPage} />
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════
//  SPLASH
// ════════════════════════════════════════════════════
function Splash() {
  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#070d14", gap:14 }}>
      <style>{GLOBAL_CSS}</style>
      <Logo size={54} />
      <I.Spin width={20} height={20} style={{ color:"#22c55e" }} />
    </div>
  );
}

// ════════════════════════════════════════════════════
//  LOGO
// ════════════════════════════════════════════════════
function Logo({ size=38 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*.25), background:"linear-gradient(135deg,#16a34a 20%,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:Math.round(size*.38), color:"#fff", flexShrink:0, letterSpacing:"-0.03em" }}>
      FF
    </div>
  );
}

// ════════════════════════════════════════════════════
//  LOGIN SCREEN
// ════════════════════════════════════════════════════
function LoginScreen({ onAdmin, onViewer, fbErr }) {
  const [tab,   setTab]   = useState("viewer");
  const [email, setEmail] = useState("");
  const [pw,    setPw]    = useState("");
  const [pin,   setPin]   = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);
  const [show,  setShow]  = useState(false);

  async function go() {
    setErr(""); setBusy(true);
    try {
      if (tab==="admin") await onAdmin(email, pw);
      else onViewer(pin);
    } catch(e) {
      setErr(e.message?.replace("Firebase: ","")?.replace(/\s*\(auth.*\)/,"") || "Invalid credentials");
    }
    setBusy(false);
  }

  const inp = w => ({ style:{ width:w||"100%", background:"#09111a", border:"1px solid #152030", borderRadius:10, padding:"12px 14px", color:"#cdd6e0", fontSize:15 } });

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(150deg,#070d14 55%,#051509)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 16px" }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ width:"100%", maxWidth:370, animation:"_up 0.35s ease both" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Logo size={58} />
          <h1 style={{ marginTop:13, fontSize:23, fontWeight:800, color:"#eaf0f8", letterSpacing:"-0.04em" }}>FFLC Portal</h1>
          <p style={{ color:"#2d5060", fontSize:13, marginTop:5 }}>Family & Friends Landowners Cooperative</p>
        </div>

        <div style={{ background:"#091420", border:"1px solid #0e1e2c", borderRadius:18, padding:22, boxShadow:"0 20px 60px rgba(0,0,0,0.6)" }}>
          {/* Tab */}
          <div style={{ display:"flex", background:"#060d16", borderRadius:10, padding:3, marginBottom:20 }}>
            {[["viewer","👁  View Only"],["admin","🔐  Admin"]].map(([k,l])=>(
              <button key={k} onClick={()=>{setTab(k);setErr("");}} className="tappable"
                style={{ flex:1, padding:"9px 6px", borderRadius:8, border:"none", background:tab===k?"#16a34a":"transparent", color:tab===k?"#fff":"#2d5060", fontWeight:700, fontSize:13 }}>
                {l}
              </button>
            ))}
          </div>

          {tab==="viewer" ? (
            <div>
              <p style={{ fontSize:13, color:"#2d5060", marginBottom:14, lineHeight:1.55 }}>Enter the group PIN to browse FFLC data. You won't be able to make changes.</p>
              <Lbl>Group PIN</Lbl>
              <div style={{ position:"relative" }}>
                <input {...inp()} type={show?"text":"password"} value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" />
                <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#2d5060" }}>
                  <I.Eye width={16} height={16} />
                </button>
              </div>
            </div>
          ):(
            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
              <div><Lbl>Admin Email</Lbl><input {...inp()} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={ADMIN_EMAIL} onKeyDown={e=>e.key==="Enter"&&go()} /></div>
              <div>
                <Lbl>Password</Lbl>
                <div style={{ position:"relative" }}>
                  <input {...inp()} type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()} />
                  <button onClick={()=>setShow(s=>!s)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#2d5060" }}>
                    <I.Eye width={16} height={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {err && <div style={{ marginTop:13, background:"rgba(239,68,68,0.09)", border:"1px solid rgba(239,68,68,0.22)", borderRadius:8, padding:"10px 13px", color:"#f87171", fontSize:13 }}>{err}</div>}
          {fbErr && <div style={{ marginTop:10, background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:8, padding:"9px 13px", color:"#fbbf24", fontSize:12 }}>⚠️ {fbErr}</div>}

          <button onClick={go} disabled={busy} className="tappable"
            style={{ width:"100%", marginTop:18, background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:10, padding:"13px", color:"#fff", fontWeight:800, fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", gap:8, opacity:busy?.7:1 }}>
            {busy?<><I.Spin width={16} height={16} /> Signing in…</>:tab==="viewer"?"Enter Dashboard":"Sign In as Admin"}
          </button>
        </div>
        <p style={{ textAlign:"center", color:"#0e1e2c", fontSize:11, marginTop:18 }}>FFLC · Est. June 2025 · Kano, Nigeria</p>
      </div>
    </div>
  );
}
function Lbl({ children }) {
  return <div style={{ fontSize:10, color:"#2d5060", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>{children}</div>;
}

// ════════════════════════════════════════════════════
//  NAV INNER (used by drawer)
// ════════════════════════════════════════════════════
function NavInner({ NAV, page, setPage, isAdmin, online, onSeed, onLogout, onClose }) {
  return (
    <>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 14px 16px", borderBottom:"1px solid #0e1c28" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={36} />
          <div>
            <div style={{ fontWeight:800, fontSize:13, color:"#dde8f0", letterSpacing:"-0.01em" }}>FFLC</div>
            <div style={{ fontSize:9, color:"#162838", fontWeight:700, letterSpacing:"0.08em" }}>COOPERATIVE</div>
          </div>
        </div>
        <button onClick={onClose} className="tappable" style={{ background:"none", border:"none", color:"#162838", display:"flex", padding:4 }}><I.X width={18} height={18} /></button>
      </div>

      <div style={{ margin:"10px 10px 4px", background: isAdmin?"rgba(34,197,94,0.07)":"rgba(56,189,248,0.07)", border:`1px solid ${isAdmin?"rgba(34,197,94,0.15)":"rgba(56,189,248,0.15)"}`, borderRadius:8, padding:"7px 12px", display:"flex", alignItems:"center", gap:8 }}>
        {isAdmin?<I.Shield width={13} height={13} style={{ color:"#4ade80" }} />:<I.Eye width={13} height={13} style={{ color:"#38bdf8" }} />}
        <span style={{ fontSize:12, fontWeight:700, color:isAdmin?"#4ade80":"#38bdf8" }}>{isAdmin?"Admin Access":"View Only"}</span>
        {!online && <span style={{ fontSize:10, color:"#f59e0b", marginLeft:"auto" }}>Offline</span>}
      </div>

      <div style={{ flex:1, padding:"8px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
        {NAV.map(({ key, label, Ic }) => {
          const a = page===key;
          return (
            <button key={key} onClick={()=>setPage(key)} className="nav-btn tappable"
              style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:9, border:"none", background:a?"rgba(34,197,94,0.1)":"transparent", color:a?"#4ade80":"#2d5060", fontWeight:a?700:500, fontSize:14, textAlign:"left", width:"100%", borderLeft:a?"2px solid #22c55e":"2px solid transparent" }}>
              <Ic style={{ color:a?"#4ade80":"#2d5060" }} /> {label}
            </button>
          );
        })}
      </div>

      {isAdmin && !online && (
        <div style={{ padding:"0 8px 8px" }}>
          <button onClick={onSeed} className="tappable"
            style={{ width:"100%", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.18)", borderRadius:8, padding:"8px 12px", color:"#fbbf24", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            🌱 Seed data to Firestore
          </button>
        </div>
      )}

      <div style={{ padding:"0 8px 8px" }}>
        <button onClick={onLogout} className="tappable"
          style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 12px", borderRadius:9, border:"none", background:"transparent", color:"#f87171", fontSize:14, fontWeight:500, width:"100%", cursor:"pointer" }}>
          <I.Out width={18} height={18} /> Sign Out
        </button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════
//  TOP BAR
// ════════════════════════════════════════════════════
function TopBar({ label, isAdmin, online, onMenu }) {
  return (
    <header style={{ background:"#05090f", borderBottom:"1px solid #0e1c28", padding:"11px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:30 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onMenu} className="tappable" style={{ background:"none", border:"none", color:"#2d5060", display:"flex", padding:3 }}><I.Menu width={22} height={22} /></button>
        <span style={{ fontWeight:800, fontSize:16, color:"#dde8f0", letterSpacing:"-0.02em" }}>{label}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:6, background:isAdmin?"rgba(34,197,94,0.08)":"rgba(56,189,248,0.08)", border:`1px solid ${isAdmin?"rgba(34,197,94,0.18)":"rgba(56,189,248,0.18)"}`, borderRadius:20, padding:"4px 10px" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:online?(isAdmin?"#22c55e":"#38bdf8"):"#f59e0b" }} />
        <span style={{ fontSize:11, fontWeight:700, color:isAdmin?"#4ade80":"#38bdf8" }}>{isAdmin?"Admin":"Viewer"}</span>
      </div>
    </header>
  );
}

// ════════════════════════════════════════════════════
//  BOTTOM NAV (mobile)
// ════════════════════════════════════════════════════
function BottomNav({ NAV, page, setPage }) {
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(5,9,15,0.97)", backdropFilter:"blur(16px)", borderTop:"1px solid #0e1c28", display:"flex", zIndex:50, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
      {NAV.map(({ key, label, Ic }) => {
        const a = page===key;
        return (
          <button key={key} onClick={()=>setPage(key)} className="tappable"
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"9px 2px 8px", border:"none", background:"transparent", color:a?"#4ade80":"#1e3545", cursor:"pointer" }}>
            <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", width:30, height:30 }}>
              {a && <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(34,197,94,0.13)" }} />}
              <Ic width={19} height={19} style={{ position:"relative" }} />
            </div>
            <span style={{ fontSize:9, fontWeight:a?700:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ════════════════════════════════════════════════════
function Card({ children, style }) {
  return <div style={{ background:"#080f18", border:"1px solid #0e1c28", borderRadius:14, ...style }}>{children}</div>;
}
function Stat({ label, value, sub, color="#22c55e" }) {
  return (
    <Card style={{ padding:"16px 16px 14px" }}>
      <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:7 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color, letterSpacing:"-0.04em", lineHeight:1, fontFamily:"'DM Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#1e3545", marginTop:5 }}>{sub}</div>}
    </Card>
  );
}
function Pill({ text, color="#22c55e" }) {
  return <span style={{ fontSize:10, fontWeight:700, color, background:`${color}16`, border:`1px solid ${color}25`, borderRadius:20, padding:"2px 9px", whiteSpace:"nowrap" }}>{text}</span>;
}
function ReadOnlyBadge() {
  return (
    <div style={{ background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.14)", borderRadius:9, padding:"9px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:9 }}>
      <I.Info width={15} height={15} style={{ color:"#38bdf8", flexShrink:0 }} />
      <span style={{ fontSize:13, color:"#38bdf8" }}>You're in <strong>view-only mode</strong>. Sign in as admin to make changes.</span>
    </div>
  );
}
function Hdr({ title, right }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
      <h2 style={{ fontSize:18, fontWeight:800, color:"#dde8f0", letterSpacing:"-0.03em" }}>{title}</h2>
      {right}
    </div>
  );
}
function Btn({ children, onClick, red, style }) {
  return (
    <button onClick={onClick} className="tappable"
      style={{ display:"flex", alignItems:"center", gap:6, background:red?"rgba(185,28,28,0.9)":"#16a34a", border:`1px solid ${red?"#991b1b":"#15803d"}`, borderRadius:9, padding:"9px 15px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", ...style }}>
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}
const inp = { style:{ width:"100%", background:"#060c14", border:"1px solid #152030", borderRadius:9, padding:"11px 13px", color:"#cdd6e0", fontSize:14 } };

// ════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════
function Dashboard({ members, payments, expenses, totalIn, totalOut, balance }) {
  const paidLand   = expenses.filter(e=>e.category.includes("Land")).reduce((s,e)=>s+e.amount,0);
  const memberSums = members.map(m=>({ ...m, total:Object.entries(payments).filter(([k])=>k.startsWith(`${m.id}-`)).reduce((s,[,v])=>s+v,0) }));
  const recent     = [...expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Stat label="Total Raised"   value={fmtK(totalIn)}   sub={`${members.length} members`}       color="#22c55e" />
        <Stat label="Total Spent"    value={fmtK(totalOut)}  sub={`${expenses.length} entries`}       color="#f87171" />
        <Stat label="Balance"        value={fmtK(balance)}   sub="Available"                          color={balance>=0?"#4ade80":"#f87171"} />
        <Stat label="Land Paid"      value={fmtK(paidLand)}  sub="of ₦4.5M total"                    color="#38bdf8" />
      </div>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:13 }}>Land Progress</div>
        {LAND_PROPS.map(land => {
          const paid = expenses.filter(e=>e.category.includes(land.catKey)).reduce((s,e)=>s+e.amount,0);
          const pct  = Math.min(100, Math.round(paid/land.totalCost*100));
          return (
            <div key={land.id} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, fontSize:13 }}>
                <span style={{ fontWeight:700, color:"#b0c4d4" }}>{land.name}</span>
                <span style={{ fontWeight:800, color:"#4ade80", fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
              </div>
              <div style={{ height:8, background:"#0a1520", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#16a34a,#0ea5e9)", borderRadius:99, transition:"width 0.7s" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:11, color:"#1e3545" }}>
                <span>Paid: <span style={{ color:"#4ade80" }}>{fmtFull(paid)}</span></span>
                <span>Total: {fmtFull(land.totalCost)}</span>
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>Member Contributions</div>
        {memberSums.map(m => (
          <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #0a1520" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#16a34a20,#0ea5e920)", border:"1px solid #1a3040", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#4ade80" }}>{m.name.charAt(0)}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#b0c4d4" }}>{m.name.split(" ")[0]} {m.name.split(" ").pop()}</div>
                <div style={{ fontSize:10, color:"#1e3545" }}>{m.designation}</div>
              </div>
            </div>
            <div style={{ fontWeight:800, color:"#4ade80", fontSize:13, fontFamily:"'DM Mono',monospace" }}>{fmtK(m.total)}</div>
          </div>
        ))}
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>Recent Expenses</div>
        {recent.map(e => (
          <div key={e.id} style={{ padding:"8px 0", borderBottom:"1px solid #0a1520" }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
              <span style={{ fontSize:13, color:"#7a9ab0", flex:1, lineHeight:1.4 }}>{e.description.length>55?e.description.slice(0,55)+"…":e.description}</span>
              <span style={{ fontWeight:800, color:"#f87171", fontSize:13, flexShrink:0, fontFamily:"'DM Mono',monospace" }}>-{fmtK(e.amount)}</span>
            </div>
            <div style={{ fontSize:10, color:"#1e3545", marginTop:3 }}>{e.date} · {e.category.split("–")[0].trim()}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  MEMBERS PAGE
// ════════════════════════════════════════════════════
function MembersPage({ members, payments, wMembers, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [des,  setDes]  = useState("");

  function add() {
    if (!name.trim()) return;
    const id = String(Math.max(...members.map(m=>parseInt(m.id)||0),0)+1);
    wMembers([...members, { id, name:name.trim(), designation:des.trim()||"Member" }]);
    setName(""); setDes(""); setOpen(false);
  }
  function remove(id) {
    if (!window.confirm("Remove member? Payment history won't be deleted.")) return;
    wMembers(members.filter(m=>m.id!==id));
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
      <Hdr title={`Members (${members.length})`} right={isAdmin&&<Btn onClick={()=>setOpen(s=>!s)}><I.Plus width={14} height={14} /> Add</Btn>} />
      {!isAdmin && <ReadOnlyBadge />}

      {open && isAdmin && (
        <Card style={{ padding:18 }} className="apop">
          <div style={{ fontSize:14, fontWeight:700, color:"#b0c4d4", marginBottom:14 }}>New Member</div>
          <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            <Field label="Full Name"><input {...inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ahmad Bello" /></Field>
            <Field label="Designation"><input {...inp} value={des} onChange={e=>setDes(e.target.value)} placeholder="Member, Chairman, etc." /></Field>
            <div style={{ display:"flex", gap:8, marginTop:2 }}>
              <Btn onClick={add} style={{ flex:1, justifyContent:"center" }}>Save</Btn>
              <button onClick={()=>setOpen(false)} className="tappable" style={{ flex:1, background:"#0a1520", border:"1px solid #152030", borderRadius:9, color:"#2d5060", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {members.map(m => {
        const total  = Object.entries(payments).filter(([k])=>k.startsWith(`${m.id}-`)).reduce((s,[,v])=>s+v,0);
        const months = Object.keys(payments).filter(k=>k.startsWith(`${m.id}-`)).length;
        const desColor = { Chairman:"#fbbf24", Secretary:"#38bdf8", Treasurer:"#a78bfa", "P.R.O":"#fb923c" }[m.designation] || "#22c55e";
        return (
          <Card key={m.id} style={{ padding:16 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#16a34a,#0ea5e9)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20, color:"#fff", flexShrink:0 }}>{m.name.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:"#dde8f0" }}>{m.name}</div>
                  <div style={{ marginTop:4 }}><Pill text={m.designation} color={desColor} /></div>
                </div>
              </div>
              {isAdmin && (
                <button onClick={()=>remove(m.id)} className="tappable" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.14)", borderRadius:7, padding:"6px 7px", cursor:"pointer", color:"#f87171", display:"flex" }}><I.Trash width={13} height={13} /></button>
              )}
            </div>
            <div style={{ display:"flex", gap:20, marginTop:14, paddingTop:13, borderTop:"1px solid #0a1520" }}>
              {[["Total Paid",fmtK(total),"#4ade80"],["Months",String(months),"#38bdf8"],["Avg/Mo",months?fmtK(Math.round(total/months)):"—","#a78bfa"]].map(([k,v,c])=>(
                <div key={k}>
                  <div style={{ fontSize:9, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>{k}</div>
                  <div style={{ fontWeight:800, color:c, fontSize:16, fontFamily:"'DM Mono',monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════
//  PAYMENTS PAGE
// ════════════════════════════════════════════════════
function PaymentsPage({ members, payments, wPayments, isAdmin }) {
  const [year, setYear] = useState("2025");
  const monthKeys = MO.map((_,i) => padM(i));

  function toggle(mid, month) {
    if (!isAdmin) return;
    const k = `${mid}-${year}-${month}`;
    const n = { ...payments };
    if (n[k]) delete n[k]; else n[k] = 20000;
    wPayments(n);
  }
  function editAmt(mid, month) {
    if (!isAdmin) return;
    const k   = `${mid}-${year}-${month}`;
    const cur = payments[k] || 0;
    const raw = prompt(`Amount for ${MO[parseInt(month)-1]} ${year}:`, cur);
    if (raw===null) return;
    const n   = { ...payments };
    const amt = parseInt(raw.replace(/\D/g,""));
    if (!isNaN(amt) && amt>0) n[k]=amt; else delete n[k];
    wPayments(n);
  }

  const rowTotals = members.map(m => monthKeys.reduce((s,mo)=>s+(payments[`${m.id}-${year}-${mo}`]||0),0));
  const colTotals = monthKeys.map(mo => members.reduce((s,m)=>s+(payments[`${m.id}-${year}-${mo}`]||0),0));
  const yearTotal = rowTotals.reduce((s,v)=>s+v,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
      <Hdr title="Monthly Payments" right={
        <div style={{ display:"flex", gap:6 }}>
          {["2025","2026","2027"].map(y=>(
            <button key={y} onClick={()=>setYear(y)} className="tappable"
              style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${year===y?"#15803d":"#152030"}`, background:year===y?"#16a34a":"#0a1520", color:year===y?"#fff":"#2d5060", fontWeight:700, fontSize:12, cursor:"pointer" }}>
              {y}
            </button>
          ))}
        </div>
      } />

      {!isAdmin && <ReadOnlyBadge />}
      {isAdmin && (
        <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.14)", borderRadius:9, padding:"8px 13px", fontSize:12, color:"#fbbf24", display:"flex", gap:8, alignItems:"center" }}>
          <I.Info width={14} height={14} /> Tap cell to toggle ₦20K · Double-tap for custom amount
        </div>
      )}

      <Card style={{ overflow:"hidden" }}>
        <div style={{ padding:"11px 14px", borderBottom:"1px solid #0a1520", display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:11, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{year} Total</span>
          <span style={{ fontWeight:800, color:"#4ade80", fontSize:15, fontFamily:"'DM Mono',monospace" }}>{fmtFull(yearTotal)}</span>
        </div>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:620 }}>
            <thead>
              <tr>
                <th style={{ padding:"9px 12px", textAlign:"left", color:"#1e3545", fontWeight:700, borderBottom:"1px solid #0a1520", fontSize:11, background:"#060c14", whiteSpace:"nowrap" }}>Member</th>
                {MO.map((m,i)=>(
                  <th key={m} style={{ padding:"9px 4px", textAlign:"center", color:"#1e3545", fontWeight:700, borderBottom:"1px solid #0a1520", fontSize:10, background:"#060c14" }}>{m}</th>
                ))}
                <th style={{ padding:"9px 10px", textAlign:"right", color:"#1e3545", fontWeight:700, borderBottom:"1px solid #0a1520", fontSize:11, background:"#060c14", whiteSpace:"nowrap" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m,mi)=>(
                <tr key={m.id} style={{ background:mi%2?"#050b13":"transparent" }}>
                  <td style={{ padding:"9px 12px", borderBottom:"1px solid #0a1520", whiteSpace:"nowrap" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#7a9ab0" }}>{m.name.split(" ")[0]}</div>
                    <div style={{ fontSize:9, color:"#1e3545" }}>{m.designation}</div>
                  </td>
                  {monthKeys.map(mo=>{
                    const paid = payments[`${m.id}-${year}-${mo}`];
                    return (
                      <td key={mo} style={{ padding:"3px 2px", borderBottom:"1px solid #0a1520", textAlign:"center" }}>
                        <button
                          onClick={()=>toggle(m.id,mo)}
                          onDoubleClick={()=>editAmt(m.id,mo)}
                          className="cell"
                          style={{
                            width:36, height:25, borderRadius:6, border:`1px solid ${paid?"rgba(34,197,94,0.22)":"#0e1c28"}`,
                            background:paid?"rgba(34,197,94,0.12)":"#0a1218",
                            color:paid?"#4ade80":"#1e3545",
                            fontWeight:700, fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto",
                            cursor:isAdmin?"pointer":"default",
                          }}
                          title={paid?fmtFull(paid)+(isAdmin?" — tap to remove":""):isAdmin?"Tap to mark paid":"Not paid"}
                        >
                          {paid?(paid===20000?<I.Check width={9} height={9} />:fmtK(paid)):"–"}
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ padding:"9px 10px", borderBottom:"1px solid #0a1520", textAlign:"right", fontWeight:800, color:"#4ade80", fontSize:12, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
                    {fmtK(rowTotals[mi])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#060c14" }}>
                <td style={{ padding:"9px 12px", fontWeight:700, color:"#b0c4d4", fontSize:11 }}>∑ Month</td>
                {colTotals.map((t,i)=>(
                  <td key={i} style={{ padding:"9px 4px", textAlign:"center", fontWeight:700, color:t>0?"#38bdf8":"#0e1c28", fontSize:10, fontFamily:"'DM Mono',monospace" }}>
                    {t>0?fmtK(t):"–"}
                  </td>
                ))}
                <td style={{ padding:"9px 10px", textAlign:"right", fontWeight:800, color:"#38bdf8", fontFamily:"'DM Mono',monospace" }}>{fmtK(yearTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  EXPENSES PAGE
// ════════════════════════════════════════════════════
function ExpensesPage({ expenses, wExpenses, delExpense, isAdmin }) {
  const [open,   setOpen]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [cat,    setCat]    = useState("All");
  const [form,   setForm]   = useState({ date:"", category:EXPENSE_CATS[0], description:"", amount:"" });

  function openNew()  { setForm({ date:"", category:EXPENSE_CATS[0], description:"", amount:"" }); setEditId(null); setOpen(true); }
  function openEdit(e){ setForm({ date:e.date, category:e.category, description:e.description, amount:e.amount }); setEditId(e.id); setOpen(true); }
  function cancel()   { setOpen(false); setEditId(null); }

  async function save() {
    if (!form.date||!form.description||!form.amount) { alert("Please fill all fields."); return; }
    const amt = parseInt(String(form.amount).replace(/\D/g,""));
    if (!amt) return;
    if (editId) {
      await wExpenses(expenses.map(e=>e.id===editId?{...e,...form,amount:amt}:e));
    } else {
      await wExpenses([...expenses, { id:"e"+Date.now(), ...form, amount:amt }]);
    }
    cancel();
  }

  const shown = (cat==="All"?expenses:expenses.filter(e=>e.category===cat)).sort((a,b)=>b.date.localeCompare(a.date));
  const total = shown.reduce((s,e)=>s+e.amount,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
      <Hdr title="Expenditures" right={isAdmin&&<Btn onClick={openNew} red><I.Plus width={14} height={14} /> Add</Btn>} />
      {!isAdmin && <ReadOnlyBadge />}

      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {["All",...EXPENSE_CATS].map(c=>(
          <button key={c} onClick={()=>setCat(c)} className="tappable"
            style={{ padding:"5px 11px", borderRadius:20, border:`1px solid ${cat===c?"rgba(56,189,248,0.28)":"#0e1c28"}`, background:cat===c?"rgba(56,189,248,0.09)":"transparent", color:cat===c?"#38bdf8":"#1e3545", fontSize:10, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            {c==="All"?"All":c.split("–")[0].trim()}
          </button>
        ))}
      </div>

      <Card style={{ padding:"11px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total</span>
        <span style={{ fontWeight:800, color:"#f87171", fontSize:15, fontFamily:"'DM Mono',monospace" }}>{fmtFull(total)}</span>
      </Card>

      {open && isAdmin && (
        <Card style={{ padding:18 }} className="apop">
          <div style={{ fontSize:14, fontWeight:700, color:"#b0c4d4", marginBottom:14 }}>{editId?"Edit":"New"} Expense</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Date"><input {...inp} type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></Field>
            <Field label="Category">
              <select {...inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                {EXPENSE_CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Amount (₦)"><input {...inp} type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="e.g. 100000" /></Field>
            <Field label="Description"><input {...inp} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description" /></Field>
            <div style={{ display:"flex", gap:8, marginTop:2 }}>
              <Btn onClick={save} style={{ flex:1, justifyContent:"center" }}>{editId?"Update":"Save"}</Btn>
              <button onClick={cancel} className="tappable" style={{ flex:1, background:"#0a1520", border:"1px solid #152030", borderRadius:9, color:"#2d5060", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      {shown.map(e=>(
        <Card key={e.id} style={{ padding:15 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#b0c4d4", lineHeight:1.4, marginBottom:6 }}>{e.description}</div>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
                <Pill text={e.category.split("–")[0].trim()} color="#38bdf8" />
                <span style={{ fontSize:10, color:"#1e3545" }}>{e.date}</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <div style={{ fontWeight:800, color:"#f87171", fontSize:14, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>-{fmtFull(e.amount)}</div>
              {isAdmin && (
                <div style={{ display:"flex", gap:5 }}>
                  <button onClick={()=>openEdit(e)} className="tappable" style={{ background:"#0a1520", border:"1px solid #152030", borderRadius:6, padding:"5px 7px", cursor:"pointer", color:"#2d5060", display:"flex" }}><I.Edit width={12} height={12} /></button>
                  <button onClick={()=>delExpense(e.id)} className="tappable" style={{ background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.14)", borderRadius:6, padding:"5px 7px", cursor:"pointer", color:"#f87171", display:"flex" }}><I.Trash width={12} height={12} /></button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════
//  LAND PAGE
// ════════════════════════════════════════════════════
function LandPage({ expenses }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <Hdr title="Land Assets" />
      {LAND_PROPS.map(land=>{
        const paid    = expenses.filter(e=>e.category.includes(land.catKey)).reduce((s,e)=>s+e.amount,0);
        const remaining = Math.max(0,land.totalCost-paid);
        const pct     = Math.min(100,Math.round(paid/land.totalCost*100));
        const history = expenses.filter(e=>e.category.includes(land.catKey)).sort((a,b)=>b.date.localeCompare(a.date));
        return (
          <Card key={land.id} style={{ padding:17 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:3 }}>
              <h3 style={{ fontSize:15, fontWeight:800, color:"#dde8f0", letterSpacing:"-0.02em", flex:1, paddingRight:8 }}>{land.name}</h3>
              <Pill text={`Plot #${land.plotNo}`} color="#22c55e" />
            </div>
            <p style={{ fontSize:11, color:"#1e3545", marginBottom:14 }}>{land.vendor}</p>

            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                <span style={{ color:"#1e3545", fontWeight:700 }}>Progress</span>
                <span style={{ fontWeight:800, color:"#4ade80", fontFamily:"'DM Mono',monospace" }}>{pct}%</span>
              </div>
              <div style={{ height:9, background:"#0a1520", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#16a34a,#0ea5e9)", borderRadius:99, transition:"width 0.7s" }} />
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:15 }}>
              {[["Total Cost",fmtFull(land.totalCost),"#dde8f0"],["Paid",fmtFull(paid),"#4ade80"],["Outstanding",fmtFull(remaining),"#f87171"],["Monthly",fmtFull(land.monthly),"#38bdf8"],["Plot Size",land.plotSize,"#a78bfa"],["Duration",`${land.months} months`,"#fbbf24"]].map(([k,v,c])=>(
                <div key={k} style={{ background:"#060c14", borderRadius:9, padding:"10px 12px" }}>
                  <div style={{ fontSize:9, color:"#1e3545", textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700, marginBottom:4 }}>{k}</div>
                  <div style={{ fontWeight:700, color:c, fontSize:13, fontFamily:"'DM Mono',monospace" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:9 }}>Payment History</div>
            {history.map(e=>(
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #0a1520", gap:10 }}>
                <span style={{ fontSize:12, color:"#5a7a90", flex:1, lineHeight:1.3 }}>{e.description.length>46?e.description.slice(0,46)+"…":e.description}</span>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, color:"#f87171", fontSize:12, fontFamily:"'DM Mono',monospace" }}>{fmtFull(e.amount)}</div>
                  <div style={{ fontSize:9, color:"#1e3545" }}>{e.date}</div>
                </div>
              </div>
            ))}
          </Card>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════
//  REPORTS PAGE
// ════════════════════════════════════════════════════
function ReportsPage({ members, payments, expenses, totalIn, totalOut, balance }) {
  const byCat = EXPENSE_CATS.reduce((a,c)=>({...a,[c]:expenses.filter(e=>e.category===c).reduce((s,e)=>s+e.amount,0)}),{});
  const mData = members.map(m=>({ ...m, total:Object.entries(payments).filter(([k])=>k.startsWith(`${m.id}-`)).reduce((s,[,v])=>s+v,0), months:Object.keys(payments).filter(k=>k.startsWith(`${m.id}-`)).length })).sort((a,b)=>b.total-a.total);
  const mo25  = MO.map((_,i)=>({ mo:MO[i], t:members.reduce((s,m)=>s+(payments[`${m.id}-2025-${padM(i)}`]||0),0) }));
  const maxB  = Math.max(...mo25.map(m=>m.t),1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <Hdr title="Reports" />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Stat label="Raised"   value={fmtK(totalIn)}   color="#22c55e" />
        <Stat label="Spent"    value={fmtK(totalOut)}  color="#f87171" />
        <Stat label="Balance"  value={fmtK(balance)}   color={balance>=0?"#4ade80":"#f87171"} />
        <Stat label="2 Plots"  value={fmtK(4500000)}   color="#38bdf8" />
      </div>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:14 }}>Collections — 2025</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:76 }}>
          {mo25.map(({mo,t})=>(
            <div key={mo} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:"100%", background:t?"linear-gradient(180deg,#0ea5e9,#16a34a)":"#0a1218", height:`${Math.round(t/maxB*68)+2}px`, borderRadius:"3px 3px 0 0", minHeight:t?3:2, transition:"height 0.4s" }} />
              <div style={{ fontSize:8, color:"#1e3545", fontWeight:700 }}>{mo}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:13 }}>Expenditure by Category</div>
        {Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([c,amt])=>{
          const pct = totalOut?Math.round(amt/totalOut*100):0;
          return (
            <div key={c} style={{ marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                <span style={{ color:"#7a9ab0" }}>{c}</span>
                <span style={{ color:"#f87171", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{fmtK(amt)} <span style={{ color:"#1e3545" }}>({pct}%)</span></span>
              </div>
              <div style={{ height:5, background:"#0a1218", borderRadius:99 }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#dc2626,#f97316)", borderRadius:99 }} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:13 }}>Member Contributions</div>
        {mData.map(m=>{
          const pct = totalIn?Math.round(m.total/totalIn*100):0;
          return (
            <div key={m.id} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                <span style={{ fontWeight:600, color:"#7a9ab0" }}>{m.name.split(" ")[0]} {m.name.split(" ").pop()}</span>
                <span style={{ color:"#4ade80", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{fmtK(m.total)}</span>
              </div>
              <div style={{ height:5, background:"#0a1218", borderRadius:99 }}>
                <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#16a34a,#0ea5e9)", borderRadius:99 }} />
              </div>
              <div style={{ fontSize:10, color:"#1e3545", marginTop:3 }}>{m.months} months · {pct}% of total</div>
            </div>
          );
        })}
      </Card>

      <Card style={{ padding:16 }}>
        <div style={{ fontSize:10, color:"#1e3545", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:13 }}>Summary</div>
        {[["Started","June 2025"],["Members",`${members.length} active`],["Monthly/Member","₦20,000"],["All-time Raised",fmtFull(totalIn)],["All-time Spent",fmtFull(totalOut)],["Balance",fmtFull(balance)],["Plot 1 — M.I. (25mo)","₦2,700,000"],["Plot 2 — Urwah (32mo)","₦1,800,000"],["Combined Land Value","₦4,500,000"]].map(([k,v])=>(
          <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #0a1218", fontSize:13 }}>
            <span style={{ color:"#1e3545" }}>{k}</span>
            <span style={{ fontWeight:700, color:"#b0c4d4" }}>{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
