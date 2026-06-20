import React, { useState, useEffect } from "react";
import { QualityRecord } from "../types";
import { Search, Shield, Upload, FileSpreadsheet, Download, RefreshCw, BarChart, AlertCircle, Copy, Mail, ArrowLeft, LogOut } from "lucide-react";
import * as XLSX from "xlsx";

interface QualityTrackerProps {
  records: QualityRecord[];
  onUploadBulk: (recs: any[]) => Promise<any>;
}

const USERS_DB = {
  etch: { password: "Etch2410##", role: "admin", name: "Hesham El-Gamil (Admin)" },
  digital: { password: "We@2026", role: "viewer", name: "Digital Support Viewer" }
};

interface AggregatedAgent {
  id: string;
  name: string;
  dept: string;
  tl: string;
  total_errors: number;
  errors: { [key: string]: number };
  details: { [key: string]: Array<{ factor: string; fatality: string; comment: string }> };
}

export default function QualityTracker({ records, onUploadBulk }: QualityTrackerProps) {
  // Login Gate
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [authName, setAuthName] = useState("");
  const [loginError, setLoginError] = useState("");

  // DB Maps
  const [db, setDb] = useState<{ [key: string]: AggregatedAgent }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeEmpId, setActiveEmpId] = useState("");
  const [activeMonth, setActiveMonth] = useState("");
  
  // Modal controllers
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isGeneratingCoaching, setIsGeneratingCoaching] = useState(false);
  const [coachingResult, setCoachingResult] = useState("");
  const [showCoachingForm, setShowCoachingForm] = useState(false);
  const [successCopy, setSuccessCopy] = useState(false);

  // Uploader status
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Search Results
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Authenticate user
  const handleLogin = () => {
    const userKey = username.trim().toLowerCase();
    const userPass = password.trim();

    if (USERS_DB[userKey as keyof typeof USERS_DB] && USERS_DB[userKey as keyof typeof USERS_DB].password === userPass) {
      setAuthRole(USERS_DB[userKey as keyof typeof USERS_DB].role);
      setAuthName(USERS_DB[userKey as keyof typeof USERS_DB].name);
      setLoginError("");
    } else {
      setLoginError("اسم المستخدم أو كلمة المرور غير صحيحة!");
    }
  };

  const handleLogout = () => {
    setAuthRole(null);
    setAuthName("");
    setUsername("");
    setPassword("");
    setSearchTerm("");
    setActiveEmpId("");
    setSearchResults([]);
  };

  // Compile individual agent records
  useEffect(() => {
    const newDb: { [key: string]: AggregatedAgent } = {};
    const monthsNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Robust Excel serial date and standard date parser
    const parseExcelDate = (val: any): Date | null => {
      if (val === undefined || val === null || val === "") return null;
      if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return val;
      }
      if (typeof val === "number") {
        // Excel epoch starts at 1899-12-30. UNIX epoch is Jan 1 1970
        // (Excel Day 25569 = Jan 1 1970)
        const date = new Date((val - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) return date;
      }
      if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) return null;
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d;
        
        // Handle formats like DD/MM/YYYY or DD-MM-YYYY
        const parts = trimmed.split(/[-/]/);
        if (parts.length === 3) {
          const p1 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[1], 10);
          const p3 = parseInt(parts[2], 10);
          if (p3 > 1000) {
            if (p2 >= 1 && p2 <= 12) {
              const d2 = new Date(p3, p2 - 1, p1);
              if (!isNaN(d2.getTime())) return d2;
            }
          } else if (p1 > 1000) {
            if (p2 >= 1 && p2 <= 12) {
              const d2 = new Date(p1, p2 - 1, p3);
              if (!isNaN(d2.getTime())) return d2;
            }
          }
        }
      }
      return null;
    };

    records.forEach(row => {
      const empId = String(row.EmployeeID || "").trim();
      if (!empId) return;

      if (!newDb[empId]) {
        newDb[empId] = {
          id: empId,
          name: row.AgentName || "Unknown Agent",
          dept: row.CCDepartment || "Unknown Department",
          tl: row.TL || "Unknown Team Leader",
          total_errors: 0,
          errors: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
          details: { Jan: [], Feb: [], Mar: [], Apr: [], May: [], Jun: [], Jul: [], Aug: [], Sep: [], Oct: [], Nov: [], Dec: [] }
        };
      }

      // Safe date parse
      try {
        const parsedDate = parseExcelDate(row.SheetDate);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const monthIndex = parsedDate.getMonth();
          if (monthIndex >= 0 && monthIndex < 12) {
            const mStr = monthsNames[monthIndex];
            newDb[empId].errors[mStr]++;
            newDb[empId].total_errors++;
            newDb[empId].details[mStr].push({
              factor: row.FactorName || "N/A",
              fatality: row.FatalityDescription || "N/A",
              comment: row.FailedComment || "No comment"
            });
          }
        }
      } catch (err) {
        // quiet fail
      }
    });

    setDb(newDb);
  }, [records]);

  // Autocomplete listing handles
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term || !db) {
      setSearchResults([]);
      return;
    }

    const matches: any[] = [];
    Object.keys(db).forEach(id => {
      if (id.includes(term) || db[id].name.toLowerCase().includes(term)) {
        matches.push({ id, name: db[id].name });
      }
    });
    setSearchResults(matches.slice(0, 5));
  }, [searchTerm, db]);

  // Excel spreadsheet parser client-side
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("🔄 جاري قراءة وتجهيز ورفع البيانات للسحابة...");

    const reader = new FileReader();
    reader.onload = async (event: any) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          throw new Error("الشيت فارغ أو يحتوي على تنسيق غير مدعوم.");
        }

        // Standardize headers
        const parsedRows = jsonData.map((row: any) => {
          return {
            EmployeeID: String(row["Employee ID"] || row["Employee_ID"] || row["EmployeeID"] || "").trim(),
            AgentName: String(row["Agent Name"] || row["Agent_Name"] || row["AgentName"] || "").trim(),
            CCDepartment: String(row["CC Department"] || row["CC_Department"] || row["CC_Dept"] || "").trim(),
            TL: String(row["TL"] || "").trim(),
            SheetDate: row["Sheet Date"] || row["Sheet_Date"] || null,
            FactorName: row["Factor Name"] || row["Factor_Name"] || null,
            FatalityDescription: row["Fatality Description"] || row["Fatality_Description"] || null,
            FailedComment: row["Failed Comment"] || row["Failed_Comment"] || null,
          };
        });

        await onUploadBulk(parsedRows);
        setUploadStatus("🏆 تم رفع وتغذية السجل السحابي وتحديث التحليلات بالكامل بنجاح!");
        e.target.value = ""; // reset inputs safely
      } catch (err: any) {
        setUploadStatus(`❌ فشل في رفع الشيت: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Grade calculators
  const calculateGradeAndScore = (agent: AggregatedAgent) => {
    let businessCount = 0;
    let customerCount = 0;

    Object.keys(agent.details).forEach(mon => {
      agent.details[mon].forEach(err => {
        if (err.fatality.toLowerCase().includes("customer")) {
          customerCount++;
        } else {
          businessCount++;
        }
      });
    });

    const penaltyScore = (customerCount * 5) + (businessCount * 2);
    const finalScore = Math.max(0, 100 - penaltyScore);

    let letter = "D";
    let colorClass = "bg-rose-500/20 text-rose-300 border-rose-500/30";

    if (finalScore >= 90) {
      letter = "A";
      colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    } else if (finalScore >= 80) {
      letter = "B";
      colorClass = "bg-sky-500/20 text-sky-300 border-sky-500/30";
    } else if (finalScore >= 70) {
      letter = "C";
      colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }

    return { score: finalScore, letter, colorClass, businessCount, customerCount };
  };

  // Monthly Details Trigger modal
  const openMonthErrorsDetails = (month: string) => {
    setActiveMonth(month);
    setCoachingResult("");
    setShowCoachingForm(false);
    setShowDetailsModal(true);
  };

  // AI Quality Action coaching form
  const getAiQualityCoachingForm = async (agent: AggregatedAgent) => {
    setIsGeneratingCoaching(true);
    try {
      const detailsArray = agent.details[activeMonth];
      let errorsListText = "";
      detailsArray.forEach((err, idx) => {
        errorsListText += `${idx + 1}. [${err.fatality}] - ${err.factor}\n   - تفاصيل QA: ${err.comment}\n\n`;
      });

      const prompt = `أنت خبير ومدير جودة الدعم الفني في شركة WE المصرية للاتصالات.
المطلوب صياغة "دليل ونموذج لقاء كوتشينج" مخصص للموظف (${agent.name}) بناءً على أخطائه في شهر ${activeMonth} التالية:
${errorsListText}

تعليمات الصياغة:
- اكتب بلغة عربية احترافية، تحفيزية ولكن دقيقة وصارمة في نفس الوقت.
- حدد الـ Root Causes بذكاء.
- قم بتقديم مقترحات وAction Items عملية في نقاط واضحة ومقنعة تساهم في تجنب هذه المخالفة لاحقاً وتساهم في تقليل مدة المحادثة (AHT) وإسعاد العميل.`;

      const res = await fetch("/api/ai/coaching-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualSummary: errorsListText, agentName: agent.name }),
      });

      if (res.ok) {
        const payload = await res.json();
        
        const template = `🎯 نموذج جلسة مراجعة الأخطاء وتطوير الأداء (Quality Coaching Form)
👤 اسم الموظف: ${agent.name} | ID: ${agent.id}
📅 مراجعة أخطاء شهر: ${activeMonth}

🚨 تفاصيل وصيانة المخالفات المرصودة:
${errorsListText}
💡 خطة التطوير والمقترحات (AI Action Plan):
${payload.text || "مراجعة يدوية"}

✍️ القائم بالتقييم: ${agent.tl}`;

        setCoachingResult(template);
        setShowCoachingForm(true);
      } else {
        alert("تعذر توليد الكوتشينج اليدوي الفعال بالذكاء الاصطناعي.");
      }
    } catch (e) {
      console.error(e);
      alert("تعذر الاتصال بالذكاء الاصطناعي.");
    } finally {
      setIsGeneratingCoaching(false);
    }
  };

  // Copy Coaching text
  const copyCoachingText = () => {
    navigator.clipboard.writeText(coachingResult).then(() => {
      setSuccessCopy(true);
      setTimeout(() => setSuccessCopy(false), 3000);
    });
  };

  // Email coaching draft
  const draftCoachingEmail = (agent: AggregatedAgent) => {
    const formattedBody = encodeURIComponent(coachingResult).replace(/%0A/g, "%0D%0A");
    const subject = encodeURIComponent(`Quality Performance Coaching - ${agent.name} - ${activeMonth}`);
    window.location.href = `mailto:?subject=${subject}&body=${formattedBody}`;
  };

  const getBottomPerformers = () => {
    const performers: any[] = [];
    Object.keys(db).forEach(id => {
      const agent = db[id];
      const stats = calculateGradeAndScore(agent);
      performers.push({
        id,
        name: agent.name,
        errors: agent.total_errors,
        score: stats.score
      });
    });

    // sort ascending by score, descending by errors to find bottom ones
    return performers.sort((a, b) => a.score - b.score).slice(0, 5);
  };

  // URL formatter inside QA comments
  const formatCommentWithUrl = (comment: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = comment.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-brand-magenta)] hover:underline inline-flex items-center gap-1 font-bold"
          >
            الرابط 🔗
          </a>
        );
      }
      return part;
    });
  };

  // Show login gate initially if not signed in
  if (authRole === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-8 max-w-sm w-full rounded-2xl space-y-6 shadow-2xl">
          <div className="text-center">
            <Shield className="mx-auto text-[var(--color-brand-magenta)]" size={48} />
            <h2 className="text-lg font-bold text-white mt-4">بوابة الجودة - Quality Performance</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              تسجيل الدخول لمشاهدة وتغذية السجلات الشهرية للموظفين
            </p>
          </div>

          <div className="space-y-4" dir="rtl">
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">اسم المستخدم / Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl py-2 px-3 text-xs text-white"
                placeholder="e.g. etch"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)]">كلمة المرور / Password</label>
              <input
                type="password"
                value={password}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl py-2 px-3 text-xs text-white"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 font-semibold">{loginError}</p>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-2.5 rounded-xl bg-[var(--color-brand-magenta)] hover:bg-[var(--color-brand-magenta-hover)] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              دخول النظام
            </button>
          </div>
          <div className="text-center pt-2 border-t border-[var(--border-card)] text-[10px] text-[var(--text-secondary)] font-bold">
            Developed by: <span className="text-[var(--color-brand-magenta)]">Hesham El-Gamil</span>
          </div>
        </div>
      </div>
    );
  }

  const selectedAgent = db[activeEmpId];
  const agentStats = selectedAgent ? calculateGradeAndScore(selectedAgent) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--border-card)] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>📊</span> Quality Performance Tracker
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            مراقبة التقييمات الشهرية المجمعة من ملفات الإكسيل وسجلات الجودة.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-secondary)] font-bold hidden sm:inline">
            👤 {authName}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 cursor-pointer bg-[rgba(255,255,255,0.05)] border border-[var(--border-card)] hover:bg-[rgba(255,255,255,0.1)] rounded-xl text-rose-400 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <LogOut size={14} /> الخروج
          </button>
        </div>
      </div>

      {/* Admin Panel (Visible to admin role only) */}
      {authRole === "admin" && (
        <div className="bg-amber-500/5 border-2 border-dashed border-amber-500/20 p-5 rounded-2xl space-y-4" dir="rtl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Shield size={16} /> لوحة تحكم الإدارة السحابية لتغذية السجلات
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
                ارفع ملف الإكسيل هنا لتحديث قاعدة البيانات لجميع المستخدمين فوراً دون الحاجة لتصدير شيتات مكررة!
              </p>
            </div>
            <button
              onClick={() => setShowDeptModal(true)}
              className="py-2 px-4 cursor-pointer bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl transition flex items-center gap-1.5"
            >
              <BarChart size={14} /> نظرة عامة على أداء القسم
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border-card)] w-full">
            <div className="relative cursor-pointer w-full sm:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:opacity-0"
              />
              <button
                disabled={isUploading}
                className="px-4 py-2 cursor-pointer w-full sm:w-auto rounded-lg col bg-[var(--color-brand-purple)] hover:bg-[var(--color-brand-purple-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Upload size={14} />
                رفع شيت الإكسيل (Excel)
              </button>
            </div>
            {uploadStatus && (
              <p className="text-xs text-amber-200 font-bold leading-relaxed pr-2">
                {uploadStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Employee Search Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-center font-sans" dir="rtl">
        <label className="text-xs font-bold text-white whitespace-nowrap">البحث الذكي عن الموظف بالاسم أو الرقم:</label>
        <div className="flex gap-2 w-full max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                const trimmed = val.trim();
                if (db[trimmed]) {
                  setActiveEmpId(trimmed);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const trimmed = searchTerm.trim();
                  if (db[trimmed]) {
                    setActiveEmpId(trimmed);
                    setSearchTerm("");
                    setSearchResults([]);
                  } else if (searchResults.length > 0) {
                    setActiveEmpId(searchResults[0].id);
                    setSearchTerm("");
                    setSearchResults([]);
                  }
                }
              }}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2.5 px-4 text-xs text-white"
              placeholder="مثال: 186568 أو Hesham"
            />
            {/* Autocomplete List */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-[#0f0d18] border border-[var(--border-card)] rounded-xl mt-1 overflow-hidden z-20 shadow-2xl">
                {searchResults.map(row => (
                  <div
                    key={row.id}
                    onClick={() => {
                      setActiveEmpId(row.id);
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                    className="px-4 py-2.5 hover:bg-[rgba(255,255,255,0.05)] cursor-pointer text-xs text-white flex justify-between items-center"
                  >
                    <span>{row.name}</span>
                    <span className="text-[10px] font-bold text-[var(--color-brand-magenta)] bg-[var(--color-brand-magenta)]/10 px-2 py-0.5 rounded-full">{row.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const trimmed = searchTerm.trim();
              if (db[trimmed]) {
                setActiveEmpId(trimmed);
                setSearchTerm("");
                setSearchResults([]);
              } else if (searchResults.length > 0) {
                setActiveEmpId(searchResults[0].id);
                setSearchTerm("");
                setSearchResults([]);
              }
            }}
            className="px-4 py-2.5 bg-[var(--color-brand-magenta)] hover:bg-[var(--color-brand-magenta-hover)] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Search size={14} /> عرض النتائج
          </button>
        </div>
      </div>

      {/* Lookup results segment */}
      {selectedAgent && agentStats && (
        <div className="animate-fade-in space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--border-card)] pb-2 flex-row-reverse">
            <h3 className="text-md font-bold text-white">الملف التعريفي وأداء الموظف</h3>
            <button
              onClick={() => {
                const element = document.getElementById("printableTrackerFrame");
                if (element) {
                  import("html2pdf.js").then((html2pdf: any) => {
                    const opt = {
                      margin: 10,
                      filename: `Quality_Performance_${selectedAgent.id}.pdf`,
                      image: { type: "jpeg", quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
                    };
                    html2pdf.default().set(opt).from(element).save();
                  });
                }
              }}
              className="py-1.5 px-3 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
            >
              <Download size={12} /> تصدير PDF
            </button>
          </div>

          <div id="printableTrackerFrame" className="space-y-6">
            {/* Metadata layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" dir="rtl">
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">التقييم العام</span>
                <span className={`text-xl font-black mt-1 py-0.5 px-2 rounded-lg border ${agentStats.colorClass}`}>
                  {agentStats.letter} ({agentStats.score}%)
                </span>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">الموظف</span>
                <p className="text-xs font-bold text-white mt-1 truncate">{selectedAgent.name}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">القسم</span>
                <p className="text-xs font-bold text-white mt-1 truncate">{selectedAgent.dept}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">قائد الفريق / TL</span>
                <p className="text-xs font-bold text-white mt-1 truncate">{selectedAgent.tl}</p>
              </div>
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center flex flex-col justify-center">
                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">إجمالي الأخطاء المرصودة</span>
                <span className="text-lg font-black text-[var(--color-brand-magenta)]">{selectedAgent.total_errors}</span>
              </div>
            </div>

            {/* Quality months blocks table grid */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl overflow-hidden p-4">
              <h4 className="text-xs font-bold text-white mb-3" dir="rtl">رصد الأخطاء والتفاصيل حسب الشهر:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3" dir="rtl">
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => {
                  const errorCount = selectedAgent.errors[m] || 0;
                  return (
                    <div
                      key={m}
                      onClick={() => errorCount > 0 && openMonthErrorsDetails(m)}
                      className={`p-4 rounded-xl text-center border transition flex flex-col justify-between ${
                        errorCount > 0 
                          ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer" 
                          : "bg-emerald-500/5 border-emerald-500/10"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">شهر {idx + 1} ({m})</span>
                      <span className={`text-sm font-extrabold mt-2 ${errorCount > 0 ? "text-rose-400 font-black" : "text-emerald-400 font-bold"}`}>
                        {errorCount > 0 ? `👉 ${errorCount} خطأ` : "0 🏆"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details modal with action-plan */}
      {showDetailsModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f0d18] border border-[var(--border-card)] p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto space-y-4" dir="rtl">
            <div className="flex justify-between items-center border-b border-[var(--border-card)] pb-2">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                <span>📂</span> تفاصيل أخطاء محاورات شهر {activeMonth}
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-white cursor-pointer text-lg">✕</button>
            </div>

            {/* Sider side by side: List of errors, or Coaching action plan */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Left Column: Specific comments logs list */}
              <div className="space-y-3 overflow-y-auto max-h-[450px]">
                {selectedAgent.details[activeMonth]?.map((err, idx) => (
                  <div key={idx} className="p-4 bg-[var(--bg-card)] border-r-4 border-r-[var(--color-brand-purple)] border border-[var(--border-card)] rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 roundedbg rounded-full bg-[rgba(255,255,255,0.05)] text-white">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-amber-400">{err.factor}</span>
                      <span className="text-[10px] font-extrabold text-[var(--color-brand-magenta)] bg-[var(--color-brand-magenta)]/10 px-2 py-0.5 rounded-full">
                        {err.fatality}
                      </span>
                    </div>
                    <p className="text-[11px] text-white leading-relaxed font-mono whitespace-pre-wrap bg-[var(--bg-input)] p-3 rounded-lg border border-[rgba(251,251,251,0.02)]">
                      {formatCommentWithUrl(err.comment)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Right Column: Coaching generated forms */}
              <div className="space-y-4 bg-[rgba(255,255,255,0.01)] border border-[var(--border-card)] p-4 rounded-xl">
                <div className="flex justify-between items-center border-b border-[var(--border-card)] pb-2">
                  <h4 className="text-xs font-bold text-white">نموذج التوجيه ومكافحة الأخطاء (Outlook Template)</h4>
                  {!showCoachingForm ? (
                    <button
                      onClick={() => getAiQualityCoachingForm(selectedAgent)}
                      disabled={isGeneratingCoaching}
                      className="px-3 py-1 cursor-pointer bg-[var(--color-brand-purple)] hover:bg-[var(--color-brand-purple-hover)] text-white text-[10px] font-black rounded-lg transition"
                    >
                      {isGeneratingCoaching ? "جاري التجهيز..." : "توليد كوتشينج ذكي 🤖"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCoachingForm(false)}
                      className="px-3 py-1 cursor-pointer bg-slate-800 text-[10px] font-black text-white hover:text-rose-400 rounded-lg"
                    >
                      مراجعة الأخطاء
                    </button>
                  )}
                </div>

                {showCoachingForm ? (
                  <div className="space-y-3">
                    <textarea
                      value={coachingResult}
                      readOnly
                      className="w-full h-80 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl p-3 text-xs leading-relaxed text-white focus:outline-none font-mono"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={copyCoachingText}
                        className="flex-1 py-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        {successCopy ? "تم النسخ! ✔️" : "نسخ النموذج"}
                      </button>
                      <button
                        onClick={() => draftCoachingEmail(selectedAgent)}
                        className="flex-1 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        إرسال لـ Outlook
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-xs text-[var(--text-secondary)] leading-relaxed">
                    اضغط على زر (توليد كوتشينج ذكي) ليقوم الذكاء الاصطناعي بربط الأخطاء وصناعة محضر والنموذج الإداري لحل ملامح المشكلة!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department overview modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f0d18] border border-[var(--border-card)] p-6 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto space-y-4" dir="rtl">
            <div className="flex justify-between items-center border-b border-[var(--border-card)] pb-2">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5 animate-fade-in">
                <span>📊</span> نظرة عامة على أداء ومخالفات القسم ككل
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-white cursor-pointer text-lg">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Bottom Support needed list */}
              <div className="space-y-3 bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl">
                <h4 className="text-xs font-bold text-rose-400 border-b border-[var(--border-card)] pb-2 mb-3">🚨 الأكثر احتياجاً للتوجيه الجيري (الأقل تقييماً)</h4>
                <div className="space-y-2">
                  {getBottomPerformers().map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-white">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        {item.errors} أخطاء | {item.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly global error charts mockup representation */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[var(--color-brand-magenta)] border-b border-[var(--border-card)] pb-2 mb-3">📈 اتجاه تطور الأخطاء بالقسم عبر الأشهر ككل</h4>
                <div className="text-center py-20 text-xs text-[var(--text-secondary)]">
                  يتحسن بنسبة <strong className="text-emerald-400 font-extrabold">12.5%</strong> عن الربع الأول بفضل جلسات التوجيه الكاشفة!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
