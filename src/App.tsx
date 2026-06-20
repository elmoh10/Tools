import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import NpsEvaluationComponent from "./components/NpsEvaluation";
import AhtEnhancement from "./components/AhtEnhancement";
import QualityTracker from "./components/QualityTracker";
import TrendAnalysis from "./components/TrendAnalysis";
import AiInspector from "./components/AiInspector";
import LoginScreen from "./components/LoginScreen";
import AdminPanel from "./components/AdminPanel";
import WeLogo from "./components/WeLogo";
import GeminiCopilot from "./components/GeminiCopilot";

import { NpsEvaluation, AhtEvaluation, QualityRecord } from "./types";
import { LayoutDashboard, Brain, Clock, BarChart2, TrendingDown, Eye, HelpCircle, ShieldAlert, Lock, LogOut } from "lucide-react";

interface UserSession {
  username: string;
  name: string;
  role: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "nps" | "aht" | "quality" | "trend" | "inspector" | "admin">("dashboard");
  const [npsEvaluations, setNpsEvaluations] = useState<NpsEvaluation[]>([]);
  const [ahtEvaluations, setAhtEvaluations] = useState<AhtEvaluation[]>([]);
  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem("we_digital_coach_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
  const [activeUsersNames, setActiveUsersNames] = useState<string[]>([]);
  const [tabId] = useState(() => {
    let tId = sessionStorage.getItem("we_coach_tab_id");
    if (!tId) {
      tId = "tab_" + Math.random().toString(36).substring(2, 11) + "_" + Math.floor(Date.now() / 1000);
      sessionStorage.setItem("we_coach_tab_id", tId);
    }
    return tId;
  });

  // Alive Heartbeat interval
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const response = await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tabId,
            username: currentUser ? currentUser.name : "زائر غير مسجل"
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setActiveUsersCount(data.activeCount || 1);
            setActiveUsersNames(data.activePeople || []);
          }
        }
      } catch (e) {
        console.error("Heartbeat sync error:", e);
      }
    };

    // Send immediately
    sendHeartbeat();

    // Send every 10 seconds
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [tabId, currentUser]);

  // Initial Fetch on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [npsRes, ahtRes, qualRes] = await Promise.all([
          fetch("/api/nps").then(r => r.ok ? r.json() : []),
          fetch("/api/aht").then(r => r.ok ? r.json() : []),
          fetch("/api/quality").then(r => r.ok ? r.json() : [])
        ]);

        setNpsEvaluations(npsRes);
        setAhtEvaluations(ahtRes);
        setQualityRecords(qualRes);
      } catch (err) {
        console.error("Failed to load initial server state:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // API Persistence Handlers
  const handleSaveNps = async (record: Partial<NpsEvaluation>) => {
    try {
      const response = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (response.ok) {
        const saved = await response.json();
        setNpsEvaluations(prev => [saved, ...prev]);
        return saved;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleSaveAht = async (record: Partial<AhtEvaluation>) => {
    try {
      const response = await fetch("/api/aht", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });

      if (response.ok) {
        const saved = await response.json();
        setAhtEvaluations(prev => [saved, ...prev]);
        return saved;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUploadBulkQuality = async (recs: any[]) => {
    try {
      const response = await fetch("/api/quality/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: recs }),
      });

      if (response.ok) {
        const updated = await response.json();
        // Reload all quality records
        const freshRes = await fetch("/api/quality").then(r => r.json());
        setQualityRecords(freshRes);
        return updated;
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleClearDatabase = async (type: "nps" | "aht" | "quality") => {
    if (!window.confirm("⚠️ هل أنت متأكد من رغبتك في تصفير وحذف جميع هذه السجلات التشغيلية؟ لا يمكن التراجع!")) return;
    try {
      const response = await fetch(`/api/clear?type=${type}`, { method: "POST" });
      if (response.ok) {
        if (type === "nps") setNpsEvaluations([]);
        if (type === "aht") setAhtEvaluations([]);
        if (type === "quality") setQualityRecords([]);
        alert("🧹 تم تصفير السجل وحذف البيانات بنجاح!");
      }
    } catch (err) {
      console.error(err);
      alert("فشل في مسح السجلات.");
    }
  };

  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem("we_digital_coach_user", JSON.stringify(user));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-white font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[var(--bg-card)] border-b md:border-b-0 md:border-r border-[var(--border-card)] p-5 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Official WE Branding */}
          <div className="flex items-center gap-3">
            <WeLogo className="w-10 h-10 shadow-lg shrink-0" />
            <div>
              <h1 className="text-sm font-black text-white tracking-widest uppercase">WE Digital Coach</h1>
              <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Optimizing Care</span>
            </div>
          </div>

          {/* Nav List */}
          <nav className="space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0" dir="rtl">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              <span>لوحة القيادة والمؤشرات</span>
            </button>

            <button
              onClick={() => setActiveTab("nps")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "nps"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <Brain size={14} />
              <span>محلل الـ NPS والشات</span>
            </button>

            <button
              onClick={() => setActiveTab("aht")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "aht"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <Clock size={14} />
              <span>منظومة قياس الـ AHT</span>
            </button>

            <button
              onClick={() => setActiveTab("quality")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "quality"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <BarChart2 size={14} />
              <span>نتائج رصد الجودة الشهرية</span>
            </button>

            <button
              onClick={() => setActiveTab("trend")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "trend"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <TrendingDown size={14} />
              <span>التحليل السلوكي للقسم (AI)</span>
            </button>

            <button
              onClick={() => setActiveTab("inspector")}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                activeTab === "inspector"
                  ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                  : "text-gray-400 hover:bg-[rgba(255,255,255,0.02)] hover:text-white"
              }`}
            >
              <ShieldAlert size={14} />
              <span>المفتش الذكي المتكامل</span>
            </button>

            {currentUser.role === "admin" && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  activeTab === "admin"
                    ? "bg-[rgba(139,92,246,0.15)] text-[var(--color-brand-magenta)] border-r-2 border-[var(--color-brand-magenta)]"
                    : "text-rose-400/90 hover:bg-[rgba(255,255,255,0.02)] hover:text-rose-300"
                }`}
              >
                <Lock size={14} />
                <span>التحكم والصلاحيات (Admin)</span>
              </button>
            )}
          </nav>
        </div>

        {/* Footer info/controls */}
        <div className="mt-8 pt-4 border-t border-[var(--border-card)] space-y-3 hidden md:block">
          {/* Active User session profile detail */}
          <div className="bg-[#140e24] p-3 rounded-xl border border-[#2b214c] space-y-2 text-right" dir="rtl">
            <div className="text-[10px] text-[var(--text-secondary)] font-bold">المستخدم الحالي:</div>
            <div className="text-xs font-black text-white truncate">{currentUser.name}</div>
            <div className="text-[9px] text-[#cca3ff] font-bold">
              {currentUser.role === "admin" ? "🛡️ مسؤول النظام (Admin)" : "🔑 قائد فريق (Team Leader)"}
            </div>
            
            <button
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem("we_digital_coach_user");
              }}
              className="w-full mt-1 py-1 px-2.5 bg-rose-950/20 text-rose-400 border border-rose-900/40 rounded-lg hover:bg-rose-950/40 hover:text-white text-[9px] font-black cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <LogOut size={10} />
              تسجيل خروج
            </button>
          </div>

          {/* Real-Time Live active sessions (HUD) */}
          <div className="bg-[#100b1e] border border-[#2d1b4e] p-3 rounded-xl space-y-2" dir="rtl" id="live-users-hud">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-gray-300 font-extrabold">المتواجدون بالمنظومة حالياً:</span>
              </div>
              <span className="text-xs font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/40">
                {activeUsersCount} لايف
              </span>
            </div>
            {activeUsersNames.length > 0 && (
              <p className="text-[9px] text-[var(--text-secondary)] font-medium leading-relaxed truncate" title={activeUsersNames.join(" ، ")}>
                قيد العمل: {activeUsersNames.join(" ، ")}
              </p>
            )}
          </div>

          <div className="flex justify-between text-[11px] font-bold text-[var(--text-secondary)]">
            <span>Server Proxy</span>
            <span className="text-emerald-400">Online ●</span>
          </div>
          {activeTab !== "quality" && activeTab !== "admin" && (
            <button
              onClick={() => handleClearDatabase(activeTab === "dashboard" ? "nps" : activeTab as any)}
              className="w-full py-1.5 bg-red-950/20 text-red-400 border border-red-900/40 rounded-lg hover:bg-rose-950/40 hover:text-white text-[10px] font-black cursor-pointer transition"
            >
              تصفير السجل الحالي 🧹
            </button>
          )}
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-3">
            <div className="w-10 h-10 border-4 border-t-[var(--color-brand-magenta)] border-[rgba(255,255,255,0.05)] rounded-full animate-spin" />
            <p className="text-xs text-[var(--text-secondary)] font-bold">جاري المزامنة السحابية وقراءة الملامح والبيانات...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === "dashboard" && (
               <Dashboard
                 evaluations={npsEvaluations}
                 ahtEvaluations={ahtEvaluations}
                 qualityRecords={qualityRecords}
               />
            )}
            
            {activeTab === "nps" && (
              <NpsEvaluationComponent onSave={handleSaveNps} />
            )}

            {activeTab === "aht" && (
              <AhtEnhancement
                evaluations={ahtEvaluations}
                onSave={handleSaveAht}
              />
            )}

            {activeTab === "quality" && (
              <QualityTracker
                records={qualityRecords}
                onUploadBulk={handleUploadBulkQuality}
              />
            )}

            {activeTab === "trend" && (
              <TrendAnalysis evaluations={npsEvaluations} />
            )}

            {activeTab === "inspector" && (
              <AiInspector
                npsEvaluations={npsEvaluations}
                ahtEvaluations={ahtEvaluations}
              />
            )}

            {activeTab === "admin" && currentUser.role === "admin" && (
              <AdminPanel />
            )}
          </div>
        )}
      </main>
      
      {/* Floating Interactive Gemini Chat Assistant */}
      <GeminiCopilot />
    </div>
  );
}
