import React, { useState, useEffect } from "react";
import { NpsEvaluation, AhtEvaluation } from "../types";
import { Shield, Brain, AlertTriangle, AlertOctagon, UserCheck, CheckCircle, RefreshCw } from "lucide-react";

interface AiInspectorProps {
  npsEvaluations: NpsEvaluation[];
  ahtEvaluations: AhtEvaluation[];
}

interface AnomalyItem {
  agentName: string;
  type: string;
  desc: string;
  level: "warning" | "danger";
}

export default function AiInspector({ npsEvaluations, ahtEvaluations }: AiInspectorProps) {
  const [agentsCount, setAgentsCount] = useState(0);
  const [matchedChats, setMatchedChats] = useState(0);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectorReport, setInspectorReport] = useState("");

  // Find matched chats by Chat ID
  const correlatedChats = React.useMemo(() => {
    const map = new Map<string, { chatId: string; agentName: string; nps?: NpsEvaluation; aht?: AhtEvaluation }>();

    npsEvaluations.forEach(n => {
      if (n.chatId && n.chatId.trim() && n.chatId.trim() !== "N/A" && n.chatId.trim() !== "-") {
        const id = n.chatId.trim();
        if (!map.has(id)) {
          map.set(id, { chatId: id, agentName: n.agentName, nps: n });
        } else {
          const prev = map.get(id)!;
          prev.nps = n;
        }
      }
    });

    ahtEvaluations.forEach(a => {
      if (a.chatId && a.chatId.trim() && a.chatId.trim() !== "N/A" && a.chatId.trim() !== "-") {
        const id = a.chatId.trim();
        if (!map.has(id)) {
          map.set(id, { chatId: id, agentName: a.fullName, aht: a });
        } else {
          const prev = map.get(id)!;
          prev.aht = a;
          if (!prev.agentName || prev.agentName === "-") {
            prev.agentName = a.fullName;
          }
        }
      }
    });

    return Array.from(map.values()).sort((x, y) => y.chatId.localeCompare(x.chatId));
  }, [npsEvaluations, ahtEvaluations]);

  useEffect(() => {
    // Compile map of agent metrics combining NPS and AHT logs
    const agentsData: { [key: string]: { chatCount: number; detractors: number; totalSeconds: number } } = {};
    let totalMatched = 0;

    const parseDurationToSeconds = (durationStr: string): number => {
      if (!durationStr) return 0;
      const match = durationStr.match(/(\d+)m\s*(\d+)s/);
      return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
    };

    npsEvaluations.forEach(ev => {
      if (!ev.agentName) return;
      totalMatched++;
      const name = ev.agentName.trim().toLowerCase();
      if (!agentsData[name]) {
        agentsData[name] = { chatCount: 0, detractors: 0, totalSeconds: 0 };
      }
      agentsData[name].chatCount++;
      agentsData[name].totalSeconds += parseDurationToSeconds(ev.durationStr);
      if (ev.npsPrediction && ev.npsPrediction.includes("Detractor")) {
        agentsData[name].detractors++;
      }
    });

    setAgentsCount(Object.keys(agentsData).length);
    setMatchedChats(totalMatched);

    // Cross-reference to find anomalies (Red Flags)
    const list: AnomalyItem[] = [];

    // 1. Precise Chat ID Direct Cross-Matching Anomalies
    const npsMap = new Map<string, NpsEvaluation>();
    npsEvaluations.forEach(e => {
      if (e.chatId && e.chatId.trim()) {
        npsMap.set(e.chatId.trim().toLowerCase(), e);
      }
    });

    ahtEvaluations.forEach(aht => {
      const cid = aht.chatId ? aht.chatId.trim().toLowerCase() : "";
      if (!cid || cid === "n/a") return;
      
      const nps = npsMap.get(cid);
      if (nps) {
        // Find if actual AHT was too short but client is Detractor/Angry
        const ahtSecParts = aht.actualAht ? aht.actualAht.split(":") : [];
        const ahtSec = ahtSecParts.length === 2 ? parseInt(ahtSecParts[0]) * 60 + parseInt(ahtSecParts[1]) : 0;
        const isAngry = (nps.npsPrediction && nps.npsPrediction.includes("Detractor")) || nps.score < 80;

        if (isAngry && ahtSec > 0 && ahtSec < 180) {
          list.push({
            agentName: nps.agentName,
            type: "خلل مكالمة موحدة 🆔",
            desc: `مطابقة شات رقم (${aht.chatId}): الموظف أنهى المحادثة سريعا في (${aht.actualAht}) للتلاعب بـ AHT، بينما العميل خرج غاضباً (Detractor) في تقييم NPS وبمستوى جودة ${nps.score}%.`,
            level: "danger"
          });
        } else if (isAngry && (aht.respVio.length > 0 || aht.holdVio.length > 0)) {
          list.push({
            agentName: nps.agentName,
            type: "تأخر الخدمة والرضا 🔗",
            desc: `مطابقة شات رقم (${aht.chatId}): الموظف ارتكب تجاوزات استجابة أو فترات هولد، مما انعكس فوراً بغضب العميل (Detractor) في تقييم الـ NPS.`,
            level: "danger"
          });
        }
      }
    });

    // 2. Statistical agent-level Speed vs NPS Anomaly list
    Object.keys(agentsData).forEach(name => {
      const d = agentsData[name];
      const avgDurationSec = d.chatCount > 0 ? Math.round(d.totalSeconds / d.chatCount) : 0;

      // If average chat length is short (< 3 minutes / 180s) but customer has detractors (angry feedback)
      if (avgDurationSec > 0 && avgDurationSec < 180 && d.detractors > 0) {
        const cleanName = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        // Ensure not duplicating what was found in exact matches
        if (!list.some(item => item.agentName.toLowerCase() === name.toLowerCase())) {
          list.push({
            agentName: cleanName,
            type: "Speed vs NPS 🚨",
            desc: `معدل وقت الموظف للمحادثة يقل عن 3 دقائق ولكنه يسجل تقييمات عملاء مستائين وغاضبين (Detractors).`,
            level: "danger"
          });
        }
      }
    });

    setAnomalies(list);
  }, [npsEvaluations, ahtEvaluations]);

  const runAIInspectionReport = async () => {
    if (anomalies.length === 0) return;
    setIsInspecting(true);
    setInspectorReport("");

    const anomaliesText = anomalies.map((a, i) => `${i + 1}. الموظف ${a.agentName}: ${a.desc}`).join("\n");
    const prompt = `أنت مفتش جودة ومحلل سلوكيات (Behavioral Analyst) في كول سنتر.
قام النظام باصطياد التجاوزات والأخطاء المتداخلة التالية لبعض الموظفين (حيث يتعارض وقت الـ AHT مع رضا العميل NPS):

\"\"\"
${anomaliesText}
\"\"\"

المطلوب إعداد "تقرير المفتش السري" لمدير الكول سنتر ويشمل:
1. تحليل تشغيلي لسبب ارتكاب الموظفين لهذه الأخطاء (مثلاً: الهروب من المكالمات لتقليل الـ AHT، أو ضعف في المعلومات يؤدي لزيادة الوقت دون حل).
2. "خطة توجيهية" (Coaching Action Plan) مقترحة للتعامل مع هذه الحالات.

اكتب الإجابة باللغة العربية الاحترافية الصارمة.`;

    try {
      const response = await fetch("/api/ai/coaching-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualSummary: anomaliesText, agentName: "inspectors" }),
      });

      if (response.ok) {
        const data = await response.json();
        setInspectorReport(data.text || "");
      } else {
        setInspectorReport("تعذر استخراج تحليل التقرير بالذكاء الاصطناعي.");
      }
    } catch (err) {
      console.error(err);
      setInspectorReport("تعذر الاتصال بخدمة المفتش الذكي.");
    } finally {
      setIsInspecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-card)] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>🕵️‍♂️</span> Cross-Tool AI Inspector ( anomalies finder)
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          يقوم بربط ومطابقة تقييمات الـ AHT مع توقعات العميل NPS لاكتشاف الموظفين الذين يتلاعبون بتوقيت المحادثة أو يصرفون العميل سريعاً دون حل.
        </p>
      </div>

      {/* Metrics breakdown grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="rtl">
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl text-center">
          <span className="text-xs font-bold text-[var(--text-secondary)]">موظف تم فحصه</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{agentsCount}</h3>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl text-center">
          <span className="text-xs font-bold text-[var(--text-secondary)]">محادثة تم مطابقتها</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">{matchedChats}</h3>
        </div>
        <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl text-center border-r-4 border-r-rose-450">
          <span className="text-xs font-bold text-rose-400">مخالفات متداخلة (Red Flags) 🚩</span>
          <h3 className="text-3xl font-extrabold text-rose-400 mt-1">{anomalies.length}</h3>
        </div>
      </div>

      {/* Trigger AI comments */}
      <div className="flex flex-col justify-center pt-2">
        <button
          onClick={runAIInspectionReport}
          disabled={anomalies.length === 0 || isInspecting}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[var(--color-brand-magenta)] to-[var(--color-brand-purple)] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isInspecting ? (
            <>
              <RefreshCw className="animate-spin" size={14} /> جاري دراسة السلوكيات وصناعة خطط العمل التشغيلية...
            </>
          ) : (
            "🧠 استدعاء الذكاء الاصطناعي لتحليل هذه المخالفات وصياغة تقرير المفتش السري"
          )}
        </button>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4" dir="rtl">
        <h3 className="text-sm font-bold text-white mb-2">المخالفات المرصودة حالياً بالقسم:</h3>
        {anomalies.length === 0 ? (
          <div className="text-center p-12 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl text-xs text-[var(--text-secondary)] leading-relaxed">
            القسم سليم تماماً! لم يتم رصد أي تلاعب أو خلل متقاطع بين سرعة الخدمة ورضا العميل 🏆
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anom, idx) => (
              <div
                key={idx}
                className="bg-[var(--bg-card)] border border-[var(--border-card)] border-r-4 border-r-rose-500 p-4 rounded-xl flex justify-between items-center"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">👤 {anom.agentName}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">{anom.desc}</p>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {anom.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correlated Chats section */}
      <div className="space-y-4 pt-4" dir="rtl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-t border-[var(--border-card)] pt-6">
          <span>🔗</span> مطابقة وتحليل المحادثات المشتركة برقم الشات (AHT & NPS Correlated Chats)
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          تعرض هذه اللوحة المحادثات التي تم تقييمها برمز شات موحد (Chat ID)، لربط جودة المكالمة ورضا العميل بذكاء متفوق للبروتوكولات الزمنية:
        </p>
        {correlatedChats.length === 0 ? (
          <div className="text-center p-8 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl text-xs text-[var(--text-secondary)]">
            لا توجد محادثات مسجلة برقم شات (Chat ID) حتى الآن للمطابقة والربط ثنائي الأبعاد. يرجى إدخال رقم الشات عند التقييم.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {correlatedChats.map((item, idx) => {
              const hasBoth = !!(item.nps && item.aht);
              return (
                <div
                  key={idx}
                  className={`border rounded-2xl p-5 space-y-4 transition ${
                    hasBoth
                      ? "bg-[rgba(16,185,129,0.03)] border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-[var(--bg-card)] border-[var(--border-card)]"
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-[var(--bg-input)] border border-[var(--border-card)] px-3 py-1.5 rounded-lg text-white font-mono">
                        رقم الشات / ID: {item.chatId}
                      </span>
                      <h4 className="text-xs font-black text-white">👤 الموظف: {item.agentName}</h4>
                    </div>

                    {hasBoth ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span>🔗</span> ارتباط كامل ناجح (AHT + NPS Linked)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                        ⚠️ ارتباط جزئي (أدخل التقييم المقابل في الصفحة الأخرى بنفس رمز الشات)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* NPS side of things */}
                    <div className="bg-black/20 p-3.5 rounded-xl border border-[rgba(255,255,255,0.02)] space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] border-b border-[rgba(255,255,255,0.05)] pb-1.5">
                        <span>📊 مؤشرات تحليل الـ NPS والجودة</span>
                        {item.nps ? (
                          <span className="text-emerald-450">متوفر ✅</span>
                        ) : (
                          <span className="text-gray-500">غير متوفر ❌</span>
                        )}
                      </div>
                      {item.nps ? (
                        <div className="space-y-1">
                          <p className="text-xs text-white">
                            الدرجة الفعلية: <span className="font-extrabold text-[var(--color-brand-magenta)]">{item.nps.score}%</span>
                          </p>
                          <p className="text-xs text-white">
                            توقيت التقييم: <span className="text-gray-400 font-mono">{item.nps.chatStart} إلى {item.nps.chatEnd}</span>
                          </p>
                          <p className="text-xs text-white">
                            توقع الـ NPS: <span className="text-amber-300 font-bold">{item.nps.npsPrediction}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 line-clamp-2" title={item.nps.manualSummary}>
                            ملخص الملاحظات: {item.nps.manualSummary || "لا توجد أخطاء مرصودة."}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic">يرجى الذهاب لـ Smart NPS & Quality ولصق المحادثة مع كتابة رقم الشات ({item.chatId}).</p>
                      )}
                    </div>

                    {/* AHT side of things */}
                    <div className="bg-black/20 p-3.5 rounded-xl border border-[rgba(255,255,255,0.02)] space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] border-b border-[rgba(255,255,255,0.05)] pb-1.5">
                        <span>⏱️ مؤشرات قياس الـ AHT والانتظار</span>
                        {item.aht ? (
                          <span className="text-emerald-450">متوفر ✅</span>
                        ) : (
                          <span className="text-gray-500">غير متوفر ❌</span>
                        )}
                      </div>
                      {item.aht ? (
                        <div className="space-y-1">
                          <p className="text-xs text-white">
                            وقت المحادثة الفعلي: <span className="font-extrabold text-indigo-400 font-mono">{item.aht.actualAht}</span> / الحد المعتمد: {item.aht.targetAht}
                          </p>
                          <p className="text-xs text-white">
                            أقصى وقت رد: <span className="text-yellow-400 font-mono">{item.aht.responseTime}</span>
                          </p>
                          <p className="text-xs text-white">
                            أقصى وقت هولد: <span className="text-yellow-400 font-mono">{item.aht.holdTime}</span>
                          </p>
                          {item.aht.respVio.length > 0 || item.aht.holdVio.length > 0 ? (
                            <p className="text-[11px] text-rose-450 font-bold">
                              ⚠️ تم رصد تأخير في الجلسة ({item.aht.respVio.length + item.aht.holdVio.length} مرات).
                            </p>
                          ) : (
                            <p className="text-[11px] text-emerald-400 font-bold">✅ التزام تام بأوقات الرد والهولد.</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic font-medium">يرجى الذهاب لـ AHT Evaluation ولصق المحادثة مع كتابة رقم الشات ({item.chatId}).</p>
                      )}
                    </div>
                  </div>

                  {/* Smart automated cross-matching feedback */}
                  {hasBoth && item.nps && item.aht && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl">
                      <h5 className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center gap-1">
                        <span>💡</span> التحليل المتقاطع الذكي للمكالمة برقم الشات ({item.chatId}):
                      </h5>
                      <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
                        {(() => {
                          const ahtSecParts = item.aht.actualAht ? item.aht.actualAht.split(":") : [];
                          const ahtSec = ahtSecParts.length === 2 ? parseInt(ahtSecParts[0]) * 60 + parseInt(ahtSecParts[1]) : 0;
                          const isAngry = (item.nps.npsPrediction && item.nps.npsPrediction.includes("Detractor")) || item.nps.score < 80;

                          if (isAngry && ahtSec > 0 && ahtSec < 180) {
                            return `💥 الموظف استعجل بشكل حرج وأنهى الجلسة خلال ${item.aht.actualAht} فقط (أقل من 3 دقائق) مما جعل العميل يغادر وهو غاضب (NPS Detractor). ينصح بشدة بالتدخل التوجيهي لوقف ظاهرة الهروب من المحادثات السريعة.`;
                          } else if (isAngry && (item.aht.respVio.length > 0 || item.aht.holdVio.length > 0)) {
                            return `⚠️ العميل مستاء Detractor بسبب بطء الرد ومشاكل الهولد التي تسببت في تجاوز معايير الجودة للـ AHT وسجلت مخالفات تأخير. الكوتشينج المقترح: تدريب الموظف على الاختصار الذكي المعتمد دون التباطؤ بالرد.`;
                          } else if (!isAngry && ahtSec > 420) {
                            return `⏳ العميل راضٍ بشكل عام، ولكن الموظف أخذ وقتاً طويلاً للغاية (${item.aht.actualAht}) يتجاوز الحد المسموح. الكوتشينج المقترح: تدريب الموظف على السكريبت الرسمي المباشر لمعالجة الطلبات بسرعة أكبر لتقليل الـ AHT للمعدل المثالي.`;
                          } else {
                            return `🏆 أداء نموذجي متكامل! الموظف حقق توازناً عبقرياً بين سرعة الرد المعززة (${item.aht.actualAht}) وضمان رضا العميل التام NPS. يوصى بإرسال بريد تقديري تشجيعاً لاستمراريته ومشاركته كنموذج ريادي.`;
                          }
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Inspector report */}
      {inspectorReport && (
        <div className="animate-fade-in space-y-4 mt-6 bg-[var(--bg-card)] border-2 border-[var(--color-brand-magenta)]/30 p-6 rounded-2xl relative shadow-2xl" dir="rtl">
          <h3 className="text-sm font-bold text-[var(--color-brand-magenta)] border-b border-[var(--border-card)] pb-3 mb-4 flex items-center gap-1.5 leading-relaxed">
            <Shield size={18} /> تقرير المفتش السري لمدير الكول سنتر (AI Operational Inspector Report)
          </h3>
          <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
            {inspectorReport}
          </div>
        </div>
      )}
    </div>
  );
}
