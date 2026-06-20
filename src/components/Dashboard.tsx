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

  // --- Dynamic CTC / CTB Calculations for any record (with retroactive fallback support) ---
  const getCtcAndCtbBreakdown = (ev: NpsEvaluation) => {
    let ctcTotal = ev.ctcCount !== undefined ? ev.ctcCount : 0;
    let ctbTotal = ev.ctbCount !== undefined ? ev.ctbCount : 0;
    
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
        if (needsInference) {
          ctcTotal++;
        }
      }
      if (summary.includes("empathy") || summary.includes("تعاطف") || summary.includes("احتواء") || summary.includes("استماع") || summary.includes("at-2")) {
        ctcEmpathy++;
        if (needsInference) {
          ctcTotal++;
        }
      }
      if (summary.includes("global") || summary.includes("concession") || summary.includes("015") || summary.includes("تعويض") || summary.includes("qu-1") || summary.includes("qu-2") || summary.includes("cf-1")) {
        ctcTechnical++;
        if (needsInference) {
          ctcTotal++;
        }
      }
      
      if (summary.includes("greeting") || summary.includes("ending") || summary.includes("تحية") || summary.includes("ختام") || summary.includes("at-1") || summary.includes("at-3")) {
        ctbGreetingClosing++;
        if (needsInference) {
          ctbTotal++;
        }
      }
      if (summary.includes("cancel") || summary.includes("إلغاء") || summary.includes("بدائل") || summary.includes("qu-3")) {
        ctbCancellation++;
        if (needsInference) {
          ctbTotal++;
        }
      }
      if (summary.includes("no answer") || summary.includes("chatbot") || summary.includes("شات بوت") || summary.includes("بروتوكول") || summary.includes("pr-1") || summary.includes("pr-2")) {
        ctbProtocol++;
        if (needsInference) {
          ctbTotal++;
        }
      }

      // Safeguard fallback for previous checklists with no words match
      if (needsInference && ctcTotal === 0 && ctbTotal === 0) {
        const estimatedErrors = Math.ceil((100 - ev.score) / 10) || 1;
        ctcTotal = Math.ceil(estimatedErrors * 0.6);
        ctbTotal = Math.max(0, estimatedErrors - ctcTotal) || 1;
      }
    }

    // Distribute missing breakdown metrics if they were overall summed but detail sums remained 0
    if (ctcTotal > 0 && ctcHoldResponse === 0 && ctcEmpathy === 0 && ctcTechnical === 0) {
      ctcHoldResponse = Math.ceil(ctcTotal * 0.4);
      ctcEmpathy = Math.ceil(ctcTotal * 0.3);
      ctcTechnical = Math.max(0, ctcTotal - ctcHoldResponse - ctcEmpathy);
    }
    
    if (ctbTotal > 0 && ctbGreetingClosing === 0 && ctbCancellation === 0 && ctbProtocol === 0) {
      ctbGreetingClosing = Math.ceil(ctbTotal * 0.4);
      ctbCancellation = Math.ceil(ctbTotal * 0.3);
      ctbProtocol = Math.max(0, ctbTotal - ctbGreetingClosing - ctbCancellation);
    }

    return {
      ctcTotal,
      ctbTotal,
      ctcHoldResponse,
      ctcEmpathy,
      ctcTechnical,
      ctbGreetingClosing,
      ctbCancellation,
      ctbProtocol
    };
  };

  // Compile total error statistics from database
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

  const getDoughnutSlices = () => {
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
  };

  const doughnutSlices = getDoughnutSlices();
  const totalErrorsInCenter = doughnutSlices.reduce((acc, s) => acc + s.value, 0);

  // --- Annual / Monthly performance database line chart engine ---
  const monthsNamesArabic = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  // List of all unique agents
  const uniqueAgentNamesList = Array.from(
    new Map(evaluations.map(ev => [ev.agentName.trim().toLowerCase(), ev.agentName.trim()])).values()
  ).sort((a, b) => a.localeCompare(b, "ar"));

  const getMonthlyTrendData = () => {
    return monthsNamesArabic.map((name, index) => {
      const filtered = evaluations.filter(ev => {
        const d = ev.date ? new Date(ev.date) : null;
        if (!d) return false;
        const monthMatches = d.getMonth() === index;
        const agentMatches = selectedAgentForTrend === "all" || ev.agentName.trim().toLowerCase() === selectedAgentForTrend.toLowerCase();
        return monthMatches && agentMatches;
      });

      const averageScore = filtered.length > 0 
        ? Math.round(filtered.reduce((sum, item) => sum + (item.score || 0), 0) / filtered.length)
        : 100; // Perfect score if no record this month yet

      return {
        month: name,
        score: averageScore,
        count: filtered.length
      };
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

      {/* NEW Row 2: Performance Trackers & Error Doughnut breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
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
                <option value="all">متوسط القسم (جميع الموظفين)</option>
                {uniqueAgentNamesList.map((agentNameStr, i) => (
                  <option key={i} value={agentNameStr}>{agentNameStr}</option>
                ))}
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
