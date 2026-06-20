import React, { useEffect, useState } from "react";
import { NpsEvaluation, AhtEvaluation, QualityRecord } from "../types";
import { Users, FileText, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface DashboardProps {
  evaluations: NpsEvaluation[];
  ahtEvaluations?: AhtEvaluation[];
  qualityRecords?: QualityRecord[];
  onRefresh?: () => void;
}

export default function Dashboard({ evaluations, ahtEvaluations = [], qualityRecords = [], onRefresh }: DashboardProps) {
  const [loading, setLoading] = useState(false);

  // Derived metrics
  const totalEvals = evaluations.length;
  const avgQualityScore = totalEvals > 0 ? Math.round(evaluations.reduce((a, b) => a + (b.score || 0), 0) / totalEvals) : 0;
  
  const uniqueAgents = new Set(evaluations.map(x => x.agentName.trim().toLowerCase())).size;

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  evaluations.forEach(ev => {
    if (ev.npsPrediction && ev.npsPrediction.toLowerCase().includes("promoter")) {
      promoters++;
    } else if (ev.npsPrediction && ev.npsPrediction.toLowerCase().includes("detractor")) {
      detractors++;
    } else {
      passives++;
    }
  });

  const handleManualRefresh = async () => {
    setLoading(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setLoading(false), 500);
  };

  // Custom SVG Doughnut Chart math
  const totalChartValues = promoters + passives + detractors;
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages and stroke offsets
  const promPercent = totalChartValues > 0 ? promoters / totalChartValues : 0;
  const passPercent = totalChartValues > 0 ? passives / totalChartValues : 0;
  const detrPercent = totalChartValues > 0 ? detractors / totalChartValues : 0;

  const promStrokeDashoffset = circumference - promPercent * circumference;
  const passStrokeDashoffset = circumference - passPercent * circumference;
  const detrStrokeDashoffset = circumference - detrPercent * circumference;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-card)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-[var(--color-brand-magenta)]">👁️‍🗨</span> Command Center
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            لوحة التحكم المركزية - المتابعة اللحظية لأداء قسم الدعم الرقمي بشركة WE
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:bg-[rgba(255,255,255,0.05)] text-sm font-medium transition cursor-pointer text-white"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          تحديث السحابة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-[var(--color-brand-purple)]">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              إجمالي التقييمات المسجلة
            </p>
            <FileText className="text-[var(--color-brand-purple)] opacity-30" size={32} />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{totalEvals}</h3>
        </div>

        <div className="relative bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-[var(--pass-color)]">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              متوسط جودة القسم (Quality)
            </p>
            <CheckCircle className="text-[var(--pass-color)] opacity-30" size={32} />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{avgQualityScore}%</h3>
        </div>

        <div className="relative bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-[var(--fail-color)]">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              حالات عدم الرضا (Detractors)
            </p>
            <AlertTriangle className="text-[var(--fail-color)] opacity-30" size={32} />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{detractors}</h3>
        </div>

        <div className="relative bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl flex flex-col justify-between overflow-hidden before:absolute before:top-0 before:right-0 before:w-1 before:h-full before:bg-[var(--color-brand-magenta)]">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              الموظفين المقيّمين
            </p>
            <Users className="text-[var(--color-brand-magenta)] opacity-30" size={32} />
          </div>
          <h3 className="text-3xl font-extrabold text-white">{uniqueAgents}</h3>
        </div>
      </div>

      {/* Main Sections (Chart + Live Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quality Chart */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white border-b border-[var(--border-card)] pb-3 mb-6">
            مؤشر أداء القسم (NPS & Quality Breakdown)
          </h3>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 min-h-[250px]">
            {/* SVG Interactive Chart */}
            <div className="relative w-[180px] h-[180px]">
              {totalChartValues === 0 ? (
                <div className="absolute inset-0 flex justify-center items-center text-center text-sm text-[var(--text-secondary)]">
                  لا توجد بيانات مخطط بعد
                </div>
              ) : (
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                  />
                  {promPercent > 0 && (
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={promStrokeDashoffset}
                      strokeLinecap="round"
                    />
                  )}
                  {passPercent > 0 && (
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={passStrokeDashoffset}
                      style={{
                        transform: `rotate(${promPercent * 360}deg)`,
                        transformOrigin: "90px 90px",
                      }}
                      strokeLinecap="round"
                    />
                  )}
                  {detrPercent > 0 && (
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke="#ef4444"
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={detrStrokeDashoffset}
                      style={{
                        transform: `rotate(${(promPercent + passPercent) * 360}deg)`,
                        transformOrigin: "90px 90px",
                      }}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              )}
              {/* Inner score */}
              <div className="absolute inset-0 flex flex-col justify-center items-center">
                <span className="text-[11px] text-[var(--text-secondary)] uppercase font-semibold">متوسط الدعم</span>
                <span className="text-2xl font-extrabold text-[var(--color-brand-magenta)]">{avgQualityScore}%</span>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-col gap-4 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-[rgba(255,255,255,0.01)] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                  <span className="text-sm font-semibold text-white">Promoters 🟢</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)]">
                  {promoters} ({totalChartValues > 0 ? Math.round(promPercent * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-[rgba(255,255,255,0.01)] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="text-sm font-semibold text-white">Passives 🟡</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)]">
                  {passives} ({totalChartValues > 0 ? Math.round(passPercent * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-[rgba(255,255,255,0.01)] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                  <span className="text-sm font-semibold text-white">Detractors 🔴</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-secondary)] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)]">
                  {detractors} ({totalChartValues > 0 ? Math.round(detrPercent * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-bold text-white border-b border-[var(--border-card)] pb-3 mb-4">
            🔴 شريط التشغيل المباشر (Live Feed)
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1">
            {evaluations.length === 0 ? (
              <div className="text-center text-xs text-[var(--text-secondary)] py-10">
                لا توجد أحداث ومحاورات مسجلة اليوم.
              </div>
            ) : (
              evaluations.slice().reverse().slice(0, 10).map((item) => {
                const formattedTime = new Date(item.date).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                
                const scoreClass = item.score >= 90 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : item.score >= 70
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/30";

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-[rgba(255,255,255,0.01)] border border-[var(--border-card)] rounded-xl flex flex-col gap-2 hover:bg-[rgba(255,255,255,0.03)] transition duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-white">👤 {item.agentName}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{formattedTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
                        <span>NPS: <strong className="text-white font-semibold">{item.npsPrediction || "معلق"}</strong></span>
                        {item.chatId && (
                          <span className="text-[9px] bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 px-1.5 rounded font-mono">
                            ID: {item.chatId}
                          </span>
                        )}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreClass}`}>
                        {item.score}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
