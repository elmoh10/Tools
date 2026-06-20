import React, { useEffect, useState } from "react";
import { NpsEvaluation, AhtEvaluation, QualityRecord } from "../types";
import { Users, FileText, CheckCircle, AlertTriangle, RefreshCw, BarChart2, TrendingUp, AlertCircle } from "lucide-react";

interface DashboardProps {
  evaluations: NpsEvaluation[];
  ahtEvaluations?: AhtEvaluation[];
  qualityRecords?: QualityRecord[];
  onRefresh?: () => void;
}

export default function Dashboard({ evaluations, ahtEvaluations = [], qualityRecords = [], onRefresh }: DashboardProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAgentForTrend, setSelectedAgentForTrend] = useState<string>("all");
  const [errorFilter, setErrorFilter] = useState<"both" | "ctc" | "ctb">("both");

  // Helper to parse date format from spreadsheet securely
  const parseExcelDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val === "number") {
      return new Date((val - 25569) * 86400 * 1000);
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!trimmed) return null;
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
      const parts = trimmed.split(/[-/]/);
      if (parts.length === 3) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const p3 = parseInt(parts[2], 10);
        if (p3 > 1000) {
          if (p2 >= 1 && p2 <= 12) return new Date(p3, p2 - 1, p1);
        } else if (p1 > 1000) {
          if (p2 >= 1 && p2 <= 12) return new Date(p1, p2 - 1, p3);
        }
      }
    }
    return null;
  };

  const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsNamesArabic = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  // 1. Process Quality records directly to build current Quality database
  const qualityDb: { [key: string]: {
    id: string;
    name: string;
    dept: string;
    tl: string;
    total_errors: number;
    ctcCount: number;
    ctbCount: number;
    errors: { [key: string]: number };
    details: { [key: string]: Array<{ factor: string; fatality: string; comment: string }> };
  }} = {};

  qualityRecords.forEach(row => {
    const empId = String(row.EmployeeID || "").trim();
    if (!empId) return;

    if (!qualityDb[empId]) {
      qualityDb[empId] = {
        id: empId,
        name: row.AgentName || "Unknown Agent",
        dept: row.CCDepartment || "Unknown Department",
        tl: row.TL || "Unknown Team Leader",
        total_errors: 0,
        ctcCount: 0,
        ctbCount: 0,
        errors: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
        details: { Jan: [], Feb: [], Mar: [], Apr: [], May: [], Jun: [], Jul: [], Aug: [], Sep: [], Oct: [], Nov: [], Dec: [] }
      };
    }

    try {
      const parsedDate = parseExcelDate(row.SheetDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const monthIndex = parsedDate.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          const mStr = monthsNames[monthIndex];
          qualityDb[empId].errors[mStr]++;
          qualityDb[empId].total_errors++;
          
          const isCtc = (row.FatalityDescription || "").toLowerCase().includes("customer");
          if (isCtc) {
            qualityDb[empId].ctcCount++;
          } else {
            qualityDb[empId].ctbCount++;
          }

          qualityDb[empId].details[mStr].push({
            factor: row.FactorName || "N/A",
            fatality: row.FatalityDescription || "N/A",
            comment: row.FailedComment || "No comment"
          });
        }
      }
    } catch (err) {
      // safe fail
    }
  });

  // Calculate scores for all Quality agents
  const qualityAgentsList = Object.keys(qualityDb).map(empId => {
    const agent = qualityDb[empId];
    const penalty = (agent.ctcCount * 5) + (agent.ctbCount * 2);
    const score = Math.max(0, 100 - penalty);
    return {
      ...agent,
      score
    };
  });

  // Determine top performing agents in the Quality Tracker! (أعلى ناس جودة)
  const sortedQualityAgents = [...qualityAgentsList].sort(
    (a, b) => b.score - a.score || a.total_errors - b.total_errors
  );
  
  const hasQualityRecords = qualityRecords && qualityRecords.length > 0;
  const avgQualityScore = hasQualityRecords && qualityAgentsList.length > 0
    ? Math.round(qualityAgentsList.reduce((acc, a) => acc + a.score, 0) / qualityAgentsList.length)
    : (evaluations.length > 0 ? Math.round(evaluations.reduce((a, b) => a + (b.score || 0), 0) / evaluations.length) : 0);

  const totalEvals = evaluations.length;
  const uniqueAgents = hasQualityRecords ? Object.keys(qualityDb).length : new Set(evaluations.map(x => x.agentName.trim().toLowerCase())).size;

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

  // Custom SVG Doughnut Chart math (for NPS)
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

  // --- Dynamic CTC / CTB Calculations for fallback NPS logs ---
  const getCtcAndCtbBreakdown = (ev: NpsEvaluation) => {
    let ctcTotal = ev.ctcCount !== undefined ? ev.ctcCount : 0;
    let bTotal = ev.ctbCount !== undefined ? ev.ctbCount : 0;
    
    let ctcHoldResponse = 0;
    let ctcEmpathy = 0;
    let ctcTechnical = 0;
    
    let ctbGreetingClosing = 0;
    let ctbCancellation = 0;
    let ctbProtocol = 0;

    if (ev.score < 100) {
      const summary = (ev.manualSummary || "").toLowerCase();
      const needsInference = ev.ctcCount === undefined && ev.ctbCount === undefined;
      
      if (summary.includes("response") || summary.includes("hold") || summary.includes("انتظار") || summary.includes("استجابة") || summary.includes("tm-1") || summary.includes("tm-2")) {
        ctcHoldResponse++;
        if (needsInference) ctcTotal++;
      }
      if (summary.includes("empathy") || summary.includes("تعاطف") || summary.includes("احتواء") || summary.includes("استماع") || summary.includes("at-2")) {
        ctcEmpathy++;
        if (needsInference) ctcTotal++;
      }
      if (summary.includes("global") || summary.includes("concession") || summary.includes("015") || summary.includes("تعويض") || summary.includes("qu-1") || summary.includes("qu-2") || summary.includes("cf-1")) {
        ctcTechnical++;
        if (needsInference) ctcTotal++;
      }
      if (summary.includes("greeting") || summary.includes("ending") || summary.includes("تحية") || summary.includes("ختام") || summary.includes("at-1") || summary.includes("at-3")) {
        ctbGreetingClosing++;
        if (needsInference) bTotal++;
      }
      if (summary.includes("cancel") || summary.includes("إلغاء") || summary.includes("بدائل") || summary.includes("qu-3")) {
        ctbCancellation++;
        if (needsInference) bTotal++;
      }
      if (summary.includes("no answer") || summary.includes("chatbot") || summary.includes("شات بوت") || summary.includes("بروتوكول") || summary.includes("pr-1") || summary.includes("pr-2")) {
        ctbProtocol++;
        if (needsInference) bTotal++;
      }
      if (needsInference && ctcTotal === 0 && bTotal === 0) {
        const estimatedErrors = Math.ceil((100 - ev.score) / 10) || 1;
        ctcTotal = Math.ceil(estimatedErrors * 0.6);
        bTotal = Math.max(0, estimatedErrors - ctcTotal) || 1;
      }
    }

    if (ctcTotal > 0 && ctcHoldResponse === 0 && ctcEmpathy === 0 && ctcTechnical === 0) {
      ctcHoldResponse = Math.ceil(ctcTotal * 0.4);
      ctcEmpathy = Math.ceil(ctcTotal * 0.3);
      ctcTechnical = Math.max(0, ctcTotal - ctcHoldResponse - ctcEmpathy);
    }
    if (bTotal > 0 && ctbGreetingClosing === 0 && ctbCancellation === 0 && ctbProtocol === 0) {
      ctbGreetingClosing = Math.ceil(bTotal * 0.4);
      ctbCancellation = Math.ceil(bTotal * 0.3);
      ctbProtocol = Math.max(0, bTotal - ctbGreetingClosing - ctbCancellation);
    }

    return {
      ctcTotal,
      ctbTotal: bTotal,
      ctcHoldResponse,
      ctcEmpathy,
      ctcTechnical,
      ctbGreetingClosing,
      ctbCancellation,
      ctbProtocol
    };
  };

  // Compile total error statistics from NPS database (fallback)
  let totalCtcErrors = 0;
  let totalCtbErrors = 0;
  let ctcHoldResponseSum = 0;
  let ctcEmpathySum = 0;
  let ctcTechnicalSum = 0;
  let ctbGreetingClosingSum = 0;
  let ctbCancellationSum = 0;
  let ctbProtocolSum = 0;

  evaluations.forEach(ev => {
    const b = getCtcAndCtbBreakdown(ev);
    totalCtcErrors += b.ctcTotal;
    totalCtbErrors += b.ctbTotal;
    ctcHoldResponseSum += b.ctcHoldResponse;
    ctcEmpathySum += b.ctcEmpathy;
    ctcTechnicalSum += b.ctcTechnical;
    ctbGreetingClosingSum += b.ctbGreetingClosing;
    ctbCancellationSum += b.ctbCancellation;
    ctbProtocolSum += b.ctbProtocol;
  });

  // Compile exact statistics from real Quality Database
  let qCtcTotal = 0;
  let qCtbTotal = 0;
  const qCtcFactors: { [key: string]: number } = {};
  const qCtbFactors: { [key: string]: number } = {};

  qualityRecords.forEach(row => {
    const isCtc = (row.FatalityDescription || "").toLowerCase().includes("customer");
    const factor = row.FactorName || "N/A";
    if (isCtc) {
      qCtcTotal++;
      qCtcFactors[factor] = (qCtcFactors[factor] || 0) + 1;
    } else {
      qCtbTotal++;
      qCtbFactors[factor] = (qCtbFactors[factor] || 0) + 1;
    }
  });

  const getDoughnutSlices = () => {
    if (hasQualityRecords) {
      if (errorFilter === "both") {
        return [
          { label: "كواليتي العميل (CTC)", value: qCtcTotal, color: "#f97316", badge: "🟠" },
          { label: "كواليتي العمليات (CTB)", value: qCtbTotal, color: "#a855f7", badge: "🟣" }
        ].filter(s => s.value > 0);
      } else if (errorFilter === "ctc") {
        const colors = ["#06b6d4", "#0ea5e9", "#38bdf8", "#0284c7", "#0369a1"];
        return Object.keys(qCtcFactors).map((factor, idx) => ({
          label: factor,
          value: qCtcFactors[factor],
          color: colors[idx % colors.length],
          badge: "🎯"
        }));
      } else { // ctb
        const colors = ["#f43f5e", "#ec4899", "#fda4af", "#e11d48", "#be123c"];
        return Object.keys(qCtbFactors).map((factor, idx) => ({
          label: factor,
          value: qCtbFactors[factor],
          color: colors[idx % colors.length],
          badge: "⚙️"
        }));
      }
    } else {
      if (errorFilter === "both") {
        return [
          { label: "كواليتي العميل (CTC)", value: totalCtcErrors, color: "#f97316", badge: "🟠" },
          { label: "كواليتي العمليات (CTB)", value: totalCtbErrors, color: "#a855f7", badge: "🟣" }
        ];
      } else if (errorFilter === "ctc") {
        return [
          { label: "زمن الاستجابة والانتظار", value: ctcHoldResponseSum, color: "#06b6d4", badge: "⏳" },
          { label: "التعاطف والاحتواء", value: ctcEmpathySum, color: "#38bdf8", badge: "🤝" },
          { label: "المعايير والتعويضات", value: ctcTechnicalSum, color: "#a855f7", badge: "📘" }
        ];
      } else { // ctb
        return [
          { label: "معايير التحية والختام", value: ctbGreetingClosingSum, color: "#e879f9", badge: "👋" },
          { label: "بروتوكول الرد والتحويل", value: ctbProtocolSum, color: "#f43f5e", badge: "🚨" },
          { label: "إجراءات الإلغاء والبدائل", value: ctbCancellationSum, color: "#b45309", badge: "⚙️" }
        ];
      }
    }
  };

  const doughnutSlices = getDoughnutSlices();
  const totalErrorsInCenter = doughnutSlices.reduce((acc, s) => acc + s.value, 0);

  // --- Annual / Monthly performance database line chart engine ---
  const getMonthlyTrendData = () => {
    return monthsNames.map((mStr, index) => {
      const monthAr = monthsNamesArabic[index];
      
      if (hasQualityRecords) {
        if (selectedAgentForTrend === "all") {
          // Average score of all active agents in this month
          let totalActiveAgents = 0;
          let sumScores = 0;
          
          Object.keys(qualityDb).forEach(empId => {
            const agent = qualityDb[empId];
            const hasEval = agent.errors[mStr] > 0;
            if (hasEval) {
              let mBusiness = 0;
              let mCustomer = 0;
              agent.details[mStr].forEach(err => {
                if (err.fatality.toLowerCase().includes("customer")) {
                  mCustomer++;
                } else {
                  mBusiness++;
                }
              });
              const mPenalty = (mCustomer * 5) + (mBusiness * 2);
              const mScore = Math.max(0, 100 - mPenalty);
              sumScores += mScore;
              totalActiveAgents++;
            }
          });
          
          return {
            month: monthAr,
            score: totalActiveAgents > 0 ? Math.round(sumScores / totalActiveAgents) : 100,
            count: totalActiveAgents
          };
        } else {
          // Specific selected Quality agent
          const agent = qualityDb[selectedAgentForTrend];
          if (!agent) {
            return { month: monthAr, score: 100, count: 0 };
          }
          
          let mBusiness = 0;
          let mCustomer = 0;
          (agent.details[mStr] || []).forEach(err => {
            if (err.fatality.toLowerCase().includes("customer")) {
              mCustomer++;
            } else {
              mBusiness++;
            }
          });
          const mPenalty = (mCustomer * 5) + (mBusiness * 2);
          const mScore = Math.max(0, 100 - mPenalty);
          const hasEvaluations = agent.errors[mStr] > 0;
          
          return {
            month: monthAr,
            score: mScore,
            count: hasEvaluations ? 1 : 0
          };
        }
      } else {
        // Fallback to NPS evaluations
        const filtered = evaluations.filter(ev => {
          const d = ev.date ? new Date(ev.date) : null;
          if (!d) return false;
          const monthMatches = d.getMonth() === index;
          const agentMatches = selectedAgentForTrend === "all" || ev.agentName.trim().toLowerCase() === selectedAgentForTrend.toLowerCase();
          return monthMatches && agentMatches;
        });

        const averageScore = filtered.length > 0 
          ? Math.round(filtered.reduce((sum, item) => sum + (item.score || 0), 0) / filtered.length)
          : 100;

        return {
          month: monthAr,
          score: averageScore,
          count: filtered.length
        };
      }
    });
  };

  const trendData = getMonthlyTrendData();
  const minY = 50;
  const maxY = 100;
  const chartW = 500;
  const chartH = 220;
  const paddingX = 35;
  const paddingY = 25;
  const plotW = chartW - 2 * paddingX;
  const plotH = chartH - 2 * paddingY;

  const points = trendData.map((d, i) => {
    const x = paddingX + (i * (plotW / 11));
    const clScore = Math.max(minY, Math.min(maxY, d.score));
    const y = paddingY + plotH - ((clScore - minY) / (maxY - minY)) * plotH;
    return { x, y, month: d.month, score: d.score, count: d.count };
  });

  const pathD = points.length > 0 
    ? points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`), "")
    : "";

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartH - paddingY} L ${points[0].x} ${chartH - paddingY} Z`
    : "";

  // Dynamic pie calculation values
  const dRadius = 60;
  const dStrokeWidth = 18;
  const dCircumference = 2 * Math.PI * dRadius;
  let accumulatedPercentage = 0;

  // List of all unique agents for NPS fallback list
  const uniqueAgentNamesList = Array.from(
    new Map(evaluations.map(ev => [ev.agentName.trim().toLowerCase(), ev.agentName.trim()])).values()
  ).sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-card)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-[var(--color-brand-magenta)]">👁️‍عون</span> Command Center
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

      {/* 🏆 لوحة الشرف السنوية: أبطال رصيد الجودة الشهرية */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl animate-fade-in" dir="rtl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-card)] pb-3 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span className="text-amber-500 text-xl">🏆</span> لوحة الشرف السنوية: أبطال رصيد الجودة الشهرية (Quality Stars)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              الموظفون الأعلى كفاءة وتقييماً في معايير الجودة ومراجعة العمليات. <span className="text-[var(--color-brand-magenta)] font-bold">اضغط على بطاقة أي بطل لمتابعة مخطط جودته السنوي بالأسفل!</span>
            </p>
          </div>
          {hasQualityRecords && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono font-bold tracking-wide shrink-0">
              مزامنة تامة نشطة 🟢
            </span>
          )}
        </div>

        {!hasQualityRecords ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 border border-dashed border-white/10 rounded-xl">
            <span className="text-3xl mb-2">📥</span>
            <h4 className="text-sm font-bold text-white mb-1">في انتظار رفع ملف الإكسيل في أداة `Quality`</h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-md">
              عند قيامك برفع الملف، سيتم استخراج وتحديث بيانات أعلى موظفي الجودة وتحديد الأبطال تلقائياً على لوحة الشرف والرسوم البيانية المباشرة هنا!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {sortedQualityAgents.slice(0, 6).map((agent, index) => {
              const isSelected = selectedAgentForTrend === agent.id;
              
              let crown = "👤";
              let badgeBg = "bg-white/5 border-white/5 text-gray-300";
              let shadowEffect = "";
              
              if (index === 0) {
                crown = "👑";
                badgeBg = "bg-amber-500/10 border-amber-500/30 text-amber-300";
                shadowEffect = "shadow-[0_0_15px_rgba(245,158,11,0.15)]";
              } else if (index === 1) {
                crown = "🥈";
                badgeBg = "bg-slate-300/10 border-slate-300/30 text-slate-300";
                shadowEffect = "shadow-[0_0_15px_rgba(203,213,225,0.1)]";
              } else if (index === 2) {
                crown = "🥉";
                badgeBg = "bg-amber-700/10 border-amber-700/30 text-amber-600";
              } else if (index < 5) {
                crown = "⭐";
                badgeBg = "bg-purple-500/10 border-purple-500/20 text-purple-300";
              }

              return (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgentForTrend(agent.id);
                    const el = document.getElementById("annual-trend-chart-container");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-300 ${badgeBg} ${shadowEffect} ${
                    isSelected ? "ring-2 ring-[var(--color-brand-magenta)] bg-white/10 scale-105" : "hover:bg-white/5 hover:scale-102"
                  }`}
                >
                  <div className="absolute top-2 left-2 text-md">{crown}</div>
                  <div className="text-[10px] text-gray-500 font-mono tracking-wider mb-1">RANK #{index + 1}</div>
                  <h4 className="text-sm font-bold text-white truncate mb-1" title={agent.name}>{agent.name}</h4>
                  <p className="text-[9px] text-[var(--text-secondary)] truncate mb-2">{agent.dept}</p>
                  
                  <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                    <div>
                      <span className="text-[10px] text-gray-400 block">الجودة</span>
                      <strong className="text-sm font-extrabold text-white">{agent.score}%</strong>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-gray-400 block">أخطاء</span>
                      <strong className="text-xs font-bold text-rose-400">{agent.total_errors}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW Row 2: Performance Trackers & Error Doughnut breakdown */}
      <div id="annual-trend-chart-container" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Performance Line Chart from first to last month of the year (Annual Performance Trend) */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[var(--border-card)] pb-3 mb-4" dir="rtl">
            <div>
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                <BarChart2 className="text-[var(--color-brand-magenta)]" size={18} />
                مخطط أداء جودة الموظفين السنوي (Jan - Dec)
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)]">تتبع فوري ومستمر لمتوسط جودة المحادثات عبر الشهور</p>
            </div>
            
            <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
              <span className="text-[11px] text-gray-400 font-bold shrink-0">الموظف:</span>
              <select
                value={selectedAgentForTrend}
                onChange={(e) => setSelectedAgentForTrend(e.target.value)}
                className="bg-[#110c22] border border-[var(--border-card)] text-white text-xs font-bold rounded-xl py-1 px-3 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)] w-full sm:w-auto cursor-pointer"
              >
                {hasQualityRecords ? (
                  <>
                    <option value="all">📊 متوسط القسم الكلي في الجودة</option>
                    {sortedQualityAgents.map((agent, i) => {
                      let medal = "👤";
                      if (i === 0) medal = "🥇 الأول:";
                      else if (i === 1) medal = "🥈 الثاني:";
                      else if (i === 2) medal = "🥉 الثالث:";
                      else if (i < 5) medal = "⭐ متميز:";
                      
                      return (
                        <option key={agent.id} value={agent.id}>
                          {medal} {agent.name} ({agent.score}%)
                        </option>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <option value="all">📊 متوسط القسم (جميع الموظفين)</option>
                    {uniqueAgentNamesList.map((agentNameStr, i) => (
                      <option key={i} value={agentNameStr}>{agentNameStr}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <div className="min-w-[480px]">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible select-none">
                <defs>
                  {/* Linear gradient for trend line area fill */}
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cf0a70" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#cf0a70" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Linear gradient for stroke line */}
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5c246f" />
                    <stop offset="50%" stopColor="#cf0a70" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference Gridlines */}
                {[50, 60, 70, 80, 90, 100].map((scoreVal) => {
                  const y = paddingY + plotH - ((scoreVal - minY) / (maxY - minY)) * plotH;
                  return (
                    <g key={scoreVal}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartW - paddingX}
                        y2={y}
                        stroke="rgba(255,255,255,0.04)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        className="text-[9px] font-mono fill-gray-500 font-bold text-right"
                        textAnchor="end"
                      >
                        {scoreVal}%
                      </text>
                    </g>
                  );
                })}

                {/* Trend Area and Line Paths */}
                {points.length > 0 && (
                  <>
                    <path d={areaD} fill="url(#areaGrad)" />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="url(#lineGrad)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Plot Dots and Labels */}
                {points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={5}
                      className="fill-[#1b1136] stroke-[#cf0a70] stroke-2 transition duration-200 group-hover:r-7 group-hover:fill-[#cf0a70]"
                    />
                    {/* Circle Pulse on Hover */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={10}
                      fill="#cf0a70"
                      className="opacity-0 group-hover:opacity-20 transition duration-200"
                    />
                    
                    {/* Inline scores label on top of dot */}
                    {p.count > 0 ? (
                      <text
                        x={p.x}
                        y={p.y - 10}
                        className="text-[9px] font-mono font-black fill-emerald-400"
                        textAnchor="middle"
                      >
                        {p.score}%
                      </text>
                    ) : (
                      <text
                        x={p.x}
                        y={p.y - 10}
                        className="text-[8px] font-mono fill-gray-600"
                        textAnchor="middle"
                      >
                        -
                      </text>
                    )}

                    {/* Month Arabic text below the chart */}
                    <text
                      x={p.x}
                      y={chartH - paddingY + 15}
                      className="text-[9px] font-sans font-bold fill-gray-400"
                      textAnchor="middle"
                    >
                      {p.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Dynamic Critical To Customer (CTC) & Critical To Business (CTB) Doughnut Chart with interactive slices and center sum */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl flex flex-col justify-between">
          <div className="border-b border-[var(--border-card)] pb-3 mb-3 text-right" dir="rtl">
            <h3 className="text-md font-bold text-white flex items-center gap-1.5 justify-end">
              مخالفات التشغيل والأخطاء الحرجة
              <AlertCircle className="text-rose-400" size={18} />
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)]">توزيع أخطاء الرصد الكلي (التركيز على العميل مقابل العمليات)</p>
          </div>

          {/* Toggle Option Filter selector */}
          <div className="grid grid-cols-3 gap-1 bg-[#110c22] p-1.5 rounded-xl border border-[var(--border-card)] mb-4" dir="rtl">
            <button
              onClick={() => setErrorFilter("both")}
              className={`py-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer ${
                errorFilter === "both"
                  ? "bg-[var(--color-brand-magenta)] text-white shadow-md font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              كلاهما (CTC/CTB)
            </button>
            <button
              onClick={() => setErrorFilter("ctc")}
              className={`py-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer ${
                errorFilter === "ctc"
                  ? "bg-cyan-600 text-white shadow-md font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              العميل (CTC)
            </button>
            <button
              onClick={() => setErrorFilter("ctb")}
              className={`py-1 rounded-lg text-[10px] font-bold transition text-center cursor-pointer ${
                errorFilter === "ctb"
                  ? "bg-fuchsia-700 text-white shadow-md font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              العملية (CTB)
            </button>
          </div>

          {/* Doughnut SVG and Center number indicator */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 min-h-[160px]">
            <div className="relative w-[150px] h-[150px] flex-shrink-0 animate-fade-in">
              {totalErrorsInCenter === 0 ? (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-2 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-[20px]">🌟</span>
                  <span className="text-[9px] text-emerald-400 font-bold mt-1">تطابق نموذجي</span>
                  <span className="text-[8px] text-gray-500">لا يوجد أخطاء مسجلة</span>
                </div>
              ) : (
                <>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="75"
                      cy="75"
                      r={dRadius}
                      fill="transparent"
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth={dStrokeWidth}
                    />
                    {doughnutSlices.map((slice, idx) => {
                      const p = totalErrorsInCenter > 0 ? slice.value / totalErrorsInCenter : 0;
                      if (p === 0) return null;
                      const offset = dCircumference - p * dCircumference;
                      const rotation = accumulatedPercentage * 360;
                      accumulatedPercentage += p;

                      return (
                        <circle
                          key={idx}
                          cx="75"
                          cy="75"
                          r={dRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={dStrokeWidth}
                          strokeDasharray={dCircumference}
                          strokeDashoffset={offset}
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: "75px 75px",
                            transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                          }}
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                  {/* Total errors written right in the center */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                    <span className="text-[9px] text-[var(--text-secondary)] font-bold tracking-wider uppercase">مجموع الأخطاء</span>
                    <span className="text-2xl font-black text-white">{totalErrorsInCenter}</span>
                    <span className="text-[7px] text-gray-500">خطأ مرصود</span>
                  </div>
                </>
              )}
            </div>

            {/* Side legend lists with exact parameters counts */}
            <div className="flex flex-col gap-2.5 w-full text-right" dir="rtl">
              {doughnutSlices.map((slice, i) => {
                const percent = totalErrorsInCenter > 0 ? Math.round((slice.value / totalErrorsInCenter) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-xs">{slice.badge}</span>
                      <span className="text-xs font-semibold text-gray-200 truncate">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-white">{slice.value}</span>
                      <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded-full">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections (Chart + Live Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quality Chart */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-white border-b border-[var(--border-card)] pb-3 mb-6" dir="rtl">
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
          <h3 className="text-lg font-bold text-white border-b border-[var(--border-card)] pb-3 mb-4" dir="rtl">
            🔴 شريط التشغيل المباشر (Live Feed)
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1">
            {evaluations.length === 0 ? (
              <div className="text-center text-xs text-[var(--text-secondary)] py-10" dir="rtl">
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
                    <div className="flex justify-between items-center" dir="rtl">
                      <span className="font-bold text-xs text-white">👤 {item.agentName}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{formattedTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreClass}`}>
                        {item.score}%
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
                        {item.chatId && (
                          <span className="text-[9px] bg-indigo-950/40 border border-indigo-900/30 text-indigo-300 px-1.5 rounded font-mono">
                            ID: {item.chatId}
                          </span>
                        )}
                        <span>NPS: <strong className="text-white font-semibold">{item.npsPrediction || "معلق"}</strong></span>
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
