import React, { useState, useEffect } from "react";
import { NpsEvaluation } from "../types";
import { TrendingDown, Copy, Download, Mail, RefreshCw } from "lucide-react";

interface TrendAnalysisProps {
  evaluations: NpsEvaluation[];
}

export default function TrendAnalysis({ evaluations }: TrendAnalysisProps) {
  const [timeFilter, setTimeFilter] = useState("month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState("");
  const [detractorsPayload, setDetractorsPayload] = useState<string[]>([]);

  // Statistics
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [detractorsCount, setDetractorsCount] = useState(0);

  // Re-run filter checks
  useEffect(() => {
    const now = new Date();
    let total = 0;
    let detractors = 0;
    const items: string[] = [];

    evaluations.forEach(ev => {
      if (!ev.date) return;
      const evDate = new Date(ev.date);

      let isIncluded = false;
      if (timeFilter === "all") {
        isIncluded = true;
      } else if (timeFilter === "today" && evDate.toDateString() === now.toDateString()) {
        isIncluded = true;
      } else if (timeFilter === "week") {
        const diffDays = Math.ceil(Math.abs(now.getTime() - evDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) isIncluded = true;
      } else if (timeFilter === "month" && evDate.getMonth() === now.getMonth() && evDate.getFullYear() === now.getFullYear()) {
        isIncluded = true;
      }

      if (isIncluded) {
        total++;
        if (ev.npsPrediction && ev.npsPrediction.includes("Detractor")) {
          detractors++;
          if (ev.manualSummary) {
            items.push(`الشكوى والأخطاء: ${ev.manualSummary.replace(/\n/g, " ")}`);
          }
        }
      }
    });

    setTotalFiltered(total);
    setDetractorsCount(detractors);
    setDetractorsPayload(items);
  }, [evaluations, timeFilter]);

  const generateReport = async () => {
    if (detractorsPayload.length === 0) {
      alert("لا يوجد شكاوى للمعارضين (Detractors) في هذه الفترة للتحليل.");
      return;
    }

    setIsGenerating(true);
    setReportHtml("");

    try {
      const response = await fetch("/api/ai/trend-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detractorsPayload }),
      });

      if (response.ok) {
        const data = await response.json();
        setReportHtml(data.text || "");
      } else {
        setReportHtml("<p className='text-rose-450'>تعذر إعداد وإستخراج التقرير بالذكاء الاصطناعي.</p>");
      }
    } catch (err) {
      console.error(err);
      setReportHtml("<p className='text-rose-450'>حدث خطأ أثناء رصد الأخطاء والتواصل بالسحابة.</p>");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReportToClipboard = () => {
    navigator.clipboard.writeText(document.getElementById("reportContent")?.innerText || "").then(() => {
      alert("تم نسخ التقرير بنجاح!");
    });
  };

  const downloadPdf = () => {
    const element = document.getElementById("reportContainer");
    if (element) {
      import("html2pdf.js").then((html2pdf: any) => {
        const opt = {
          margin: 10,
          filename: `Trend_Operational_Report_${timeFilter}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };
        html2pdf.default().set(opt).from(element).save();
      });
    }
  };

  const draftEmail = () => {
    const textStr = document.getElementById("reportContent")?.innerText || "";
    const formattedBody = encodeURIComponent(textStr).replace(/%0A/g, "%0D%0A");
    const subject = encodeURIComponent(`Operational Trend Analysis Report - ${timeFilter}`);
    window.location.href = `mailto:?subject=${subject}&body=${formattedBody}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-card)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>📉</span> Root-Cause Trend Analysis (AI)
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            يجمع الذكاء الاصطناعي ملامح تكرار شكاوى المعارضين لاستنباط المشكلات الفنية ومواطن قصور سلوكيات الموظفين بالقسم.
          </p>
        </div>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="bg-[var(--bg-input)] border border-[var(--border-card)] text-white text-xs font-bold rounded-xl py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)]"
        >
          <option value="all">كل الأوقات (All Time)</option>
          <option value="today">اليوم (Today)</option>
          <option value="week">آخر 7 أيام (This Week)</option>
          <option value="month">هذا الشهر (This Month)</option>
        </select>
      </div>

      {/* Metrics breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" dir="rtl">
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl text-center">
          <span className="text-xs font-bold text-[var(--text-secondary)]">إجمالي التقييمات للفترة المحددة</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{totalFiltered}</h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl text-center border-r-4 border-r-rose-500">
          <span className="text-xs font-bold text-rose-400">التقييمات السيئة للمعارضين (Detractors 🔴)</span>
          <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{detractorsCount}</h3>
        </div>
      </div>

      {/* Manual report generation trigger */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-6 rounded-2xl text-center space-y-4" dir="rtl">
        <h2 className="text-md font-bold text-white">هل تود استخراج التقرير الإداري للقسم؟ 🤖</h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          سيقوم النظام بتجميع تفاصيل الشكاوى وربطها مع السلوك مجمعاً، وتوجيهها للمحلل التشغيلي لاستنباط نقاط القوة وجداول التصحيح.
        </p>

        <button
          onClick={generateReport}
          disabled={isGenerating || detractorsCount === 0}
          className="mx-auto px-6 py-3 cursor-pointer rounded-xl bg-gradient-to-r from-[var(--color-brand-magenta)] to-[var(--color-brand-purple)] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="animate-spin" size={14} /> جاري دراسة تفاصيل تكرار القضايا بالفترة...
            </>
          ) : (
            `بدء التحليل الجذري لـ (${detractorsPayload.length}) شكاوى بالقسم ✨`
          )}
        </button>
      </div>

      {/* AI report output display */}
      {reportHtml && (
        <div className="animate-fade-in space-y-4">
          <div className="flex gap-2 justify-end" dir="rtl">
            <button
              onClick={copyReportToClipboard}
              className="py-1.5 px-3 cursor-pointer bg-[rgba(255,255,255,0.05)] border border-[var(--border-card)] hover:bg-[rgba(255,255,255,0.1)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Copy size={13} /> نسخ التقرير
            </button>
            <button
              onClick={downloadPdf}
              className="py-1.5 px-3 cursor-pointer bg-[rgba(255,255,255,0.05)] border border-[var(--border-card)] hover:bg-[rgba(255,255,255,0.1)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download size={13} /> تصدير PDF
            </button>
            <button
              onClick={draftEmail}
              className="py-1.5 px-3 cursor-pointer bg-[rgba(255,255,255,0.05)] border border-[var(--border-card)] hover:bg-[rgba(255,255,255,0.1)] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Mail size={13} /> إرسال عبر Outlook
            </button>
          </div>

          <div
            id="reportContainer"
            className="bg-[var(--bg-card)] border-2 border-emerald-500/20 p-6 rounded-2xl shadow-xl text-right leading-relaxed font-sans text-xs text-white"
            dir="rtl"
          >
            <div id="reportContent" className="prose prose-invert max-w-none text-white whitespace-pre-wrap">
              {reportHtml}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
