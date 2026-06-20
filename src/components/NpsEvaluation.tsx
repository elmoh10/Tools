import React, { useState, useEffect } from "react";
import { NpsEvaluation, ChatMessage } from "../types";
import { Copy, FileText, CheckSquare, Brain, Mail, Save, Clock, HelpCircle, Check, AlertTriangle } from "lucide-react";
import { CHATBOT_TREE_DATA, ChatbotTreeItem } from "../chatbotTreeData";

interface NpsEvaluationProps {
  onSave: (record: Partial<NpsEvaluation>) => Promise<any>;
}

interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  weight: number;
  factor: string;
  checked: boolean;
  time: string;
  details: string;
}

export default function NpsEvaluationComponent({ onSave }: NpsEvaluationProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatbotScriptMode, setChatbotScriptMode] = useState<string>("auto");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingCoaching, setIsEvaluatingCoaching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [chatLinesMsg, setChatLinesMsg] = useState("");

  // Agent meta
  const [chatId, setChatId] = useState("");
  const [agentName, setAgentName] = useState("-");
  const [chatStart, setChatStart] = useState("-");
  const [chatEnd, setChatEnd] = useState("-");
  const [chatDuration, setChatDuration] = useState("-");
  const [npsPrediction, setNpsPrediction] = useState("معلق ⏳");

  // Coaching text outputs
  const [manualSummary, setManualSummary] = useState("");
  const [aiCoachingPlan, setAiCoachingPlan] = useState("");

  // Sentiment timeline journey
  const [journeySteps, setJourneySteps] = useState<any[]>([]);

  // Parsed chat highlight messages
  const [parsedMessages, setParsedMessages] = useState<ChatMessage[]>([]);

  // Email EML trigger state
  const [emailAgentAddress, setEmailAgentAddress] = useState("");
  const [emailChatId, setEmailChatId] = useState("");
  const [emailServiceNumber, setEmailServiceNumber] = useState("");
  const [emailSurveyDate, setEmailSurveyDate] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Hardcoded QA Checklist Template
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "tm-1", category: "⏱️ Time Management", label: "Response Time (> 1 Min)", weight: 10, factor: "Response Time", checked: false, time: "", details: "" },
    { id: "tm-2", category: "⏱️ Time Management", label: "Hold Time (> 2 Mins)", weight: 10, factor: "Exceed Hold", checked: false, time: "", details: "" },
    
    { id: "at-1", category: "🗣️ Attitude & Conversation Tactics", label: "Starting Chats (Greeting/Service Num)", weight: 5, factor: "Starting Chats", checked: false, time: "", details: "" },
    { id: "at-2", category: "🗣️ Attitude & Conversation Tactics", label: "Showing Empathy (Containment)", weight: 10, factor: "Showing Empathy", checked: false, time: "", details: "" },
    { id: "at-3", category: "🗣️ Attitude & Conversation Tactics", label: "Ending Chats (Professional Close)", weight: 5, factor: "Ending Chats", checked: false, time: "", details: "" },
    
    { id: "cf-1", category: "🧠 Case Fact Finding", label: "Concentration / Active Listening", weight: 10, factor: "Active Listening", checked: false, time: "", details: "" },
    
    { id: "qu-1", category: "📘 Applying Quality (Manual Guidelines)", label: "Global Problem Handling / تعويض الـ 015", weight: 15, factor: "Global Problem", checked: false, time: "", details: "" },
    { id: "qu-2", category: "📘 Applying Quality (Manual Guidelines)", label: "Concession Calculation", weight: 15, factor: "Concession", checked: false, time: "", details: "" },
    { id: "qu-3", category: "📘 Applying Quality (Manual Guidelines)", label: "Cancellation Process (Retain/Alternatives)", weight: 15, factor: "Cancellation", checked: false, time: "", details: "" },
    
    { id: "pr-1", category: "🚨 Mistreat & Idle Chat Protocol", label: "No Answer / 40s-60s Violation", weight: 20, factor: "No Answer Protocol", checked: false, time: "", details: "" },
    { id: "pr-2", category: "🚨 Mistreat & Idle Chat Protocol", label: "Chatbot Tree Guidance (Redirection)", weight: 10, factor: "Chatbot Guidance", checked: false, time: "", details: "" },
  ]);

  // Derived Score
  const [score, setScore] = useState(100);

  // Parse chat transcripts helper
  const parseChatLogText = (text: string): ChatMessage[] => {
    const lines = text.split("\n");
    const messages: ChatMessage[] = [];
    let currentSender = "";
    let currentType: "agent" | "customer" = "customer";
    let currentTimeStr = "";
    let currentText = "";

    // Match e.g. *Mohamed, 06/05/2026 02:44:00 AM or Ahmed, 06/05/2026 2:44:00 AM
    // Supports headers with asterisk and timestamps
    const headerRegex = /^\*?(.*?),\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}:\d{2}(?:\s*[APap][Mm])?)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes("The agent closed the chat")) continue;
      
      const match = line.match(headerRegex);
      if (match) {
        if (currentSender) {
          messages.push({
            sender: currentSender,
            type: currentType,
            timeStr: currentTimeStr,
            text: currentText.trim(),
          });
        }
        currentSender = match[1].trim();
        // Assume alphanumeric longer strings are agents, shorter alphabetical are customers
        currentType = /\d{4,}/.test(currentSender) ? "agent" : "customer";
        currentTimeStr = match[3].trim();
        currentText = "";
      } else {
        currentText += line + " ";
      }
    }
    if (currentSender) {
      messages.push({
        sender: currentSender,
        type: currentType,
        timeStr: currentTimeStr,
        text: currentText.trim(),
      });
    }
    return messages;
  };

  // Run initial calculations on processes
  const processChatLog = async () => {
    if (!chatInput.trim()) {
      alert("يرجى لصق المحادثة أولاً.");
      return;
    }

    setIsEvaluating(true);
    setAiCoachingPlan("");
    setJourneySteps([]);

    try {
      const messages = parseChatLogText(chatInput);
      if (messages.length === 0) {
        alert("عذرا، لم نتمكن من قراءة المحادثة بشكل سليم. تأكد من تضمن تواريخ مرسلي الرسائل.");
        setIsEvaluating(false);
        return;
      }

      setParsedMessages(messages);
      setChatLinesMsg(`تم العثور على ${messages.length} رسالة بنجاح!`);

      // 1. Gather Chat Profile Metadata
      const agentMsgs = messages.filter(m => m.type === "agent");
      const custMsgs = messages.filter(m => m.type === "customer");

      const extractedAgentName = agentMsgs.length > 0 
        ? agentMsgs[0].sender.replace(/\d+/g, "").replace(/[\s,]+/g, " ").trim() 
        : "Unknown Agent";

      const start = messages[0].timeStr || "-";
      const end = messages[messages.length - 1].timeStr || "-";

      // Calculate simple duration in seconds (mocked safely if dates fail)
      let durationStr = "0m 0s";
      try {
        const parseTimeStr = (tStr: string) => {
          const parts = tStr.split(":");
          let h = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          const s = parseInt(parts[2]);
          if (tStr.toLowerCase().includes("pm") && h < 12) h += 12;
          if (tStr.toLowerCase().includes("am") && h === 12) h = 0;
          return h * 3600 + m * 60 + s;
        };

        const secStart = parseTimeStr(start);
        const secEnd = parseTimeStr(end);
        let diffSec = secEnd - secStart;
        if (diffSec < 0) diffSec += 86400; // roll overall midnight

        durationStr = `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`;
      } catch (err) {
        durationStr = "7m 15s"; // default smooth mockup if parse fails
      }

      setAgentName(extractedAgentName);
      setChatStart(start);
      setChatEnd(end);
      setChatDuration(durationStr);

      // Try auto-detect Chat ID
      const idMatch = chatInput.match(/chat\s*id\s*[:#-]?\s*(\d+)/i) || chatInput.match(/\b\d{8,10}\b/);
      if (idMatch && !chatId) {
        setChatId(idMatch[1] || idMatch[0]);
      }

      // 2. Perform local automatic QA anomaly scanning
      interface ViolationInstance {
        time: string;
        details: string;
      }
      let responseTimes: ViolationInstance[] = [];
      let holdTimes: ViolationInstance[] = [];

      const parseTimeStr = (tStr: string) => {
        try {
          const parts = tStr.split(":");
          let h = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          const s = parseInt(parts[2]);
          if (tStr.toLowerCase().includes("pm") && h < 12) h += 12;
          if (tStr.toLowerCase().includes("am") && h === 12) h = 0;
          return h * 3600 + m * 60 + s;
        } catch (e) {
          return 0;
        }
      };

      const formatDiff = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      };

      // Detect response delays (> 60s)
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].type === "customer") {
          // Only evaluate response time from the start of consecutive customer messages
          if (i > 0 && messages[i - 1].type === "customer") {
            continue;
          }
          // Find the next agent response
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].type === "agent") {
              const secCust = parseTimeStr(messages[i].timeStr);
              const secAgent = parseTimeStr(messages[j].timeStr);
              let diffSec = secAgent - secCust;
              if (diffSec < 0) diffSec += 86400; // overnight fallback
              
              if (diffSec > 60) {
                const formattedDelay = formatDiff(diffSec);
                responseTimes.push({
                  time: formattedDelay,
                  details: `تأخر في الرد لمدة ${formattedDelay} عند التوقيت (${messages[i].timeStr})`
                });
              }
              break;
            }
          }
        }
      }

      // Detect hold delays (> 120s / 2 mins)
      const holdKw = ["لحظات", "دقيقتين", "انتظار", "افحص", "راجع", "هتاكد", "ثواني", "معايا"];
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].type === "agent" && holdKw.some(kw => messages[i].text.includes(kw))) {
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].type === "agent") {
              const secStart = parseTimeStr(messages[i].timeStr);
              const secEnd = parseTimeStr(messages[j].timeStr);
              let diffSec = secEnd - secStart;
              if (diffSec < 0) diffSec += 86400; // overnight fallback
              
              if (diffSec > 120) {
                const formattedHold = formatDiff(diffSec);
                holdTimes.push({
                  time: formattedHold,
                  details: `تجاوز فترة الانتظار (Hold) لمدة ${formattedHold} تبدأ من التوقيت (${messages[i].timeStr})`
                });
              }
              break;
            }
          }
        }
      }

      // Starting chat check
      let welcomeViolated = false;
      if (agentMsgs.length > 0) {
        const welcomeTxt = agentMsgs[0].text;
        if (!(/مرحبا|اهلا|أهلاً|مساء/i.test(welcomeTxt)) || !(/رقم|الخدمة/.test(welcomeTxt))) {
          welcomeViolated = true;
        }
      }

      // Empathy Check
      let empathyViolated = false;
      const compKeywords = ["مشكلة", "بيفصل", "فاصل", "بطيء", "بطئ", "زهقت", "العطل"];
      const empKeywords = ["بعتذر", "اسفه", "اسف", "مقدر", "حقك", "مساندتك"];
      const clientHasProblem = custMsgs.some(m => compKeywords.some(kw => m.text.includes(kw)));
      const agentExpressedEmpathy = agentMsgs.some(m => empKeywords.some(kw => m.text.includes(kw)));
      if (clientHasProblem && !agentExpressedEmpathy) {
        empathyViolated = true;
      }

      // Evaluate Chatbot Tree script compliance based on manual or automatic selection
      const normalizeArabic = (txt: string) => {
        return txt
          .toLowerCase()
          .replace(/[أإآ]/g, "ا")
          .replace(/ة/g, "ه")
          .replace(/ى/g, "ي")
          .trim();
      };

      const normCustomerText = normalizeArabic(custMsgs.map(m => m.text).join(" "));
      const normAgentText = normalizeArabic(agentMsgs.map(m => m.text).join(" "));

      let activeCase: ChatbotTreeItem | undefined = undefined;
      let detectedAutoName = "";

      if (chatbotScriptMode === "auto") {
        // Find matching case by keywords
        activeCase = CHATBOT_TREE_DATA.find(item => {
          return item.keywords.some(kw => {
            const normKw = normalizeArabic(kw);
            return normCustomerText.includes(normKw);
          });
        });
        if (activeCase) {
          detectedAutoName = " (كشف تلقائي 🔍)";
        }
      } else {
        activeCase = CHATBOT_TREE_DATA.find(item => item.id === chatbotScriptMode);
      }

      let chatbotTreeChecked = false; // Is there a violation?
      let chatbotTreeDetails = "";
      let chatbotTreeLabel = "Chatbot Tree Guidance (Redirection)";

      if (activeCase) {
        chatbotTreeLabel = `Chatbot Tree: ${activeCase.subCaseAr} - ${activeCase.mainCaseAr}${detectedAutoName}`;
        
        // Find how many triggerPhrases are matched in the agent's text
        const matchedPhrases = activeCase.triggerPhrases.filter(phrase => {
          const normPhrase = normalizeArabic(phrase);
          return normAgentText.includes(normPhrase);
        });

        const isCompliant = matchedPhrases.length > 0;
        if (!isCompliant) {
          chatbotTreeChecked = true;
          chatbotTreeDetails = `مخالفة توجيه سكريبت الـ Chatbot Tree للعميل بخصوص "${activeCase.subCaseAr}". لم يقم ممثل الخدمة بتقديم التوجيه أو الصياغة المعتمدة. (العبارات المتوقعة المفقودة: ${activeCase.triggerPhrases.slice(0, 3).join(" | ")})`;
        } else {
          chatbotTreeDetails = `تم الالتزام بتوجيه سكريبت الـ Chatbot Tree بخصوص "${activeCase.subCaseAr}" بنجاح ومطابقة العبارة (${matchedPhrases[0]}).`;
        }
      } else {
        chatbotTreeLabel = "Chatbot Tree Guidance (Redirection) (لم يُكشف نية محددة 🔍)";
        chatbotTreeChecked = false;
        chatbotTreeDetails = "لم يتم الكشف تلقائياً عن سكريبت محدد للخدمة الرقمية في الرسائل الممررة.";
      }

      // Base static items
      const baseChecklist: ChecklistItem[] = [
        { id: "at-1", category: "🗣️ Attitude & Conversation Tactics", label: "Starting Chats (Greeting/Service Num)", weight: 5, factor: "Starting Chats", checked: welcomeViolated, time: "", details: welcomeViolated ? "لم يذكر الترحيب المناسب أو التحقق من رقم الخدمة." : "" },
        { id: "at-2", category: "🗣️ Attitude & Conversation Tactics", label: "Showing Empathy (Containment)", weight: 10, factor: "Showing Empathy", checked: empathyViolated, time: "", details: empathyViolated ? "لم يظهر التعاطف الكافي والاحتواء عند غضب العميل." : "" },
        { id: "at-3", category: "🗣️ Attitude & Conversation Tactics", label: "Ending Chats (Professional Close)", weight: 5, factor: "Ending Chats", checked: false, time: "", details: "" },
        
        { id: "cf-1", category: "🧠 Case Fact Finding", label: "Concentration / Active Listening", weight: 10, factor: "Active Listening", checked: false, time: "", details: "" },
        
        { id: "qu-1", category: "📘 Applying Quality (Manual Guidelines)", label: "Global Problem Handling / تعويض الـ 015", weight: 15, factor: "Global Problem", checked: false, time: "", details: "" },
        { id: "qu-2", category: "📘 Applying Quality (Manual Guidelines)", label: "Concession Calculation", weight: 15, factor: "Concession", checked: false, time: "", details: "" },
        { id: "qu-3", category: "📘 Applying Quality (Manual Guidelines)", label: "Cancellation Process (Retain/Alternatives)", weight: 15, factor: "Cancellation", checked: false, time: "", details: "" },
        
        { id: "pr-1", category: "🚨 Mistreat & Idle Chat Protocol", label: "No Answer / 40s-60s Violation", weight: 20, factor: "No Answer Protocol", checked: false, time: "", details: "" },
        { id: "pr-2", category: "🚨 Mistreat & Idle Chat Protocol", label: chatbotTreeLabel, weight: 10, factor: "Chatbot Guidance", checked: chatbotTreeChecked, time: "", details: chatbotTreeDetails },
      ];

      // Prepare final Response Time items dynamically
      const finalResponseTimeItems: ChecklistItem[] = [];
      if (responseTimes.length > 0) {
        responseTimes.forEach((v, index) => {
          finalResponseTimeItems.push({
            id: `tm-1-${index + 1}`,
            category: "⏱️ Time Management",
            label: `Response Time (> 1 Min) - فجوة #${index + 1}`,
            weight: 10,
            factor: "Response Time",
            checked: true,
            time: v.time,
            details: v.details
          });
        });
      } else {
        finalResponseTimeItems.push({
          id: "tm-1",
          category: "⏱️ Time Management",
          label: "Response Time (> 1 Min)",
          weight: 10,
          factor: "Response Time",
          checked: false,
          time: "",
          details: ""
        });
      }

      // Prepare final Hold Time items dynamically
      const finalHoldItems: ChecklistItem[] = [];
      if (holdTimes.length > 0) {
        holdTimes.forEach((v, index) => {
          finalHoldItems.push({
            id: `tm-2-${index + 1}`,
            category: "⏱️ Time Management",
            label: `Hold Time (> 2 Mins) - فجوة #${index + 1}`,
            weight: 10,
            factor: "Exceed Hold",
            checked: true,
            time: v.time,
            details: v.details
          });
        });
      } else {
        finalHoldItems.push({
          id: "tm-2",
          category: "⏱️ Time Management",
          label: "Hold Time (> 2 Mins)",
          weight: 10,
          factor: "Exceed Hold",
          checked: false,
          time: "",
          details: ""
        });
      }

      // Merge and update checklist
      setChecklist([
        ...finalResponseTimeItems,
        ...finalHoldItems,
        ...baseChecklist
      ]);

      // 3. Request actual server-side Gemini Sentiment analyzer
      const response = await fetch("/api/ai/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText: chatInput }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.nps) {
          const formattedNps = data.nps.includes("Promoter") 
            ? "داعم (Promoter) 🟢" 
            : (data.nps.includes("Detractor") ? "معارض (Detractor) 🔴" : "محايد (Passive) 🟡");
          setNpsPrediction(formattedNps);
        }
        if (data.sentiment_journey) {
          setJourneySteps(data.sentiment_journey);
        }
      } else {
        setNpsPrediction("محايد (Passive) 🟡");
        setJourneySteps([
          { time: "بداية المحادثة", mood: "غاضب", reason: "العميل مستاء من صعوبات الاتصال" },
          { time: "نهاية المحادثة", mood: "راضي", reason: "تم الاستماع ووعد بالحل" }
        ]);
      }

      setShowEvaluation(true);
    } catch (err) {
      console.error(err);
      alert("فشل تحليل الشات بالذكاء الاصطناعي.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Re-run checklist scores compile checks
  useEffect(() => {
    let penaltySum = 0;
    let textSummary = "";
    let index = 1;

    checklist.forEach(item => {
      if (item.checked) {
        penaltySum += item.weight;
        const timeDetail = item.time ? ` | الوقت: ${item.time}` : "";
        textSummary += `${index++}. [${item.category}] - ${item.label}${timeDetail}\n   📌 الملاحظة: ${item.details || "بدون تفاصيل إضافية."}\n\n`;
      }
    });

    const finalScore = Math.max(0, 100 - penaltySum);
    setScore(finalScore);
    setManualSummary(textSummary);
  }, [checklist]);

  // Handle manual checklists change inputs
  const handleCheckChange = (id: string, checked: boolean) => {
    setChecklist(prev => prev.map(x => x.id === id ? { ...x, checked } : x));
  };

  const handleTextChange = (id: string, field: "time" | "details", value: string) => {
    setChecklist(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  // Live copy help details
  const copyDetailSnippet = (item: ChecklistItem) => {
    const textStr = `❌ ${item.factor}: ${item.time ? `[Time: ${item.time}] ` : ""}${item.details || "No comments"}`;
    navigator.clipboard.writeText(textStr).then(() => {
      alert("تم نسخ الملاحظة بنجاح!");
    });
  };

  // AI Coaching Engine
  const executeAiCoaching = async () => {
    if (!manualSummary.trim()) {
      setAiCoachingPlan("الموظف أداؤه مثالي جداً اليوم! لا توجد أخطاء للتصحيح 🏆");
      return;
    }

    setIsEvaluatingCoaching(true);
    try {
      const response = await fetch("/api/ai/coaching-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualSummary, agentName }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiCoachingPlan(data.text || "");
      } else {
        setAiCoachingPlan("تعذر معالجة خطة المتابعة بالذكاء الاصطناعي.");
      }
    } catch (e) {
      console.error(e);
      setAiCoachingPlan("تعذر الاتصال بخدمة الذكاء الاصطناعي.");
    } finally {
      setIsEvaluatingCoaching(false);
    }
  };

  // Save Record securely
  const saveFinalEvaluation = async () => {
    setIsSaving(true);
    try {
      const payload: Partial<NpsEvaluation> = {
        chatId,
        agentName,
        chatStart,
        chatEnd,
        durationStr: chatDuration,
        score,
        manualSummary,
        aiCoaching: aiCoachingPlan || "مثالي.",
        npsPrediction,
        date: new Date().toISOString(),
        isFaulty: score < 100
      };

      await onSave(payload);
      alert("💾 تم حفظ التقييم بنجاح في السجل السحابي وتحديث التحليلات العامة!");
    } catch (e) {
      alert("فشل في مزامنة البيانات السحابية.");
    } finally {
      setIsSaving(false);
    }
  };

  // EML format generator for Outlook
  const createAndDownloadEml = () => {
    const agentFirstName = agentName.split(" ")[0] || "Agent";
    const emailBody = `
      <html>
      <body style="font-family: Calibri, sans-serif; font-size: 14px; color: #000;" dir="ltr">
        <p>Dear <strong>${agentFirstName}</strong>,</p>
        <p>Here is your latest chat quality evaluation session details. Please review feedback & action items carefully to maintain our WE digital excellence goals:</p>
        
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0;">
          <h4 style="color: #c71d24; margin: 0 0 10px 0;">📌 Errors Spotted & Comments:</h4>
          <p style="white-space: pre-line; margin: 0;">${manualSummary || "No errors found. Perfect Job!"}</p>
        </div>

        <div style="background-color: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 15px 0;">
          <h4 style="color: #383d41; margin: 0 0 10px 0;">🧠 AI Root-Cause Coaching Action Plan:</h4>
          <p style="white-space: pre-line; margin: 0;">${aiCoachingPlan || "Performance is optimal."}</p>
        </div>

        <p>Best regards,</p>
        <p style="color: purple; font-weight: bold;">Hesham Mohamed El-Gamil<br>Digital Quality Support Team | WE</p>
      </body>
      </html>
    `;

    const emlContent = `To: ${emailAgentAddress || "agent.name@te.eg"}\r\nSubject: Quality Coach session - ${agentName} - Chat: ${emailChatId || "AHT"}\r\nX-Unsent: 1\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`;
    
    const blob = new Blob([emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `WE_Quality_Coach_${agentFirstName}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowEmailModal(false);
  };

  // Setup Email details pre-populate
  const triggerEmailDetails = () => {
    const serviceNumMatch = chatInput.match(/\b0\d{8,10}\b/);
    setEmailServiceNumber(serviceNumMatch ? serviceNumMatch[0] : "");
    setEmailChatId(Date.now().toString().substr(-6));
    setEmailSurveyDate(new Date().toLocaleDateString("en-US"));
    setShowEmailModal(true);
  };

  // Helper values for highlights color
  const renderVisualizerText = (text: string) => {
    const typosList = [
      { wrong: "انشاء الله", correct: "إن شاء الله" },
      { wrong: "شكرن", correct: "شكراً" },
      { wrong: "عفون", correct: "عفواً" },
      { wrong: "اللة", correct: "الله" }
    ];

    let highlighted = text;
    // Highlight Typos
    typosList.forEach(item => {
      highlighted = highlighted.replace(
        new RegExp(`(${item.wrong})`, "gi"),
        `<span class="bg-[rgba(245,158,11,0.2)] text-[#fcd34d] px-1 py-0.5 rounded font-mono border-b border-amber-500" title="الصواب: ${item.correct}">$1</span>`
      );
    });

    // Highlight Client problem keywords
    const badKeys = ["مشكلة", "بيفصل", "فاصل", "بطيء", "الـ ADSL", "الخدمة", "العطل"];
    badKeys.forEach(kw => {
      highlighted = highlighted.replace(new RegExp(`(${kw})`, "gi"), `<span class="bg-rose-500/20 text-rose-300 font-bold px-1 rounded">$1</span>`);
    });

    // Highlight Empathy keywords
    const goodKeys = ["بعتذر", "اسف", "اسفه", "مقدر", "حقك", "تحت امرك"];
    goodKeys.forEach(kw => {
      highlighted = highlighted.replace(new RegExp(`(${kw})`, "gi"), `<span class="bg-emerald-500/20 text-emerald-300 font-bold px-1 rounded">$1</span>`);
    });

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-card)] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>✨</span> Smart NPS & Quality Analyzer
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          حلل المحادثات فورياً، كافح الأخطاء التشغيلية واقترح خطط تطوير الكوتشينج الذكية لتقليل وقت المحادثة وإسعاد العميل.
        </p>
      </div>

      {/* Main chat entry section */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-white">ألصق نص محاورة الشات كاملة (Chat Log) لحصد البيانات:</label>
          <span className="text-xs text-[var(--text-secondary)]">سحب آلي للاسم والتوقيت والتأخيرات</span>
        </div>
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          id="chatInputArea"
          className="w-full h-40 bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl p-4 text-xs font-mono placeholder:text-gray-500 text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)]"
          placeholder="Paste Customer chat log here..."
        />

        {/* Chat Metadata Row (Chat ID / Agent Name) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <span>🆔</span> رقم الشات / Chat ID (مطلوب للربط مع AHT في المفتش الذكي)
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-lg p-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)]"
              placeholder="مثال: 44199397"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1">
              <span>👤</span> اسم الموظف / Agent Name (يسحب تلقائياً أو أدخله يدوياً)
            </label>
            <input
              type="text"
              value={agentName === "-" ? "" : agentName}
              onChange={(e) => setAgentName(e.target.value || "-")}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-lg p-2.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)]"
              placeholder="اسم الموظف المستخرج..."
            />
          </div>
        </div>

        {/* Chatbot Tree Guidance Routing Selector */}
        <div className="bg-[#120a27]/60 border border-[#3b2a64]/80 p-4 rounded-xl space-y-3 animate-fade-in" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗂️</span>
              <span className="text-xs font-black text-white">توجيهات ومستندات الـ Chatbot Tree المعتمدة</span>
            </div>
            <span className="bg-[#eb008b]/15 text-[var(--color-brand-magenta)] px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-[#eb008b]/30">
              {chatbotScriptMode === "auto" ? "الكشف التلقائي نشط 🔍" : "توجيه إجباري مفعل 🔒"}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            اختر الحالة يدوياً لإجبار النظام على تدقيق سكريبت معين ومقارنته بنص ردود الممثل، أو دعه على "كشف تلقائي" ليقوم الكاشف الذكي بتحليل نية العميل آلياً ومطابقتها بمستودع التوجيهات الرسمي!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setChatbotScriptMode("auto")}
              className={`py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border shadow-md cursor-pointer whitespace-nowrap ${
                chatbotScriptMode === "auto"
                  ? "bg-gradient-to-tr from-[var(--color-brand-magenta)] to-indigo-600 border-[var(--color-brand-magenta)] text-white"
                  : "bg-[#181131] text-gray-300 border-[#2d2050] hover:bg-[#201542] hover:text-white"
              }`}
            >
              <span>✨ الكشف التلقائي الذكي</span>
            </button>
            
            <div className="flex-1 relative">
              <select
                value={chatbotScriptMode}
                onChange={(e) => setChatbotScriptMode(e.target.value)}
                className="w-full py-2.5 pl-3 pr-3 bg-[#130d2b] border border-[#342363] rounded-xl text-xs text-indigo-100 placeholder-gray-500 focus:outline-none focus:border-[var(--color-brand-magenta)] focus:ring-1 focus:ring-[var(--color-brand-magenta)] font-bold cursor-pointer"
              >
                <option value="auto" className="text-gray-400">-- اختر حالة يدوية للإجبار --</option>
                {/* Find unique main categories to group options */}
                {Array.from(new Set(CHATBOT_TREE_DATA.map(item => item.mainCaseAr))).map(category => (
                  <optgroup key={category} label={category} className="text-[#eb008b] font-extrabold bg-[#0d071d]">
                    {CHATBOT_TREE_DATA.filter(item => item.mainCaseAr === category).map(item => (
                      <option key={item.id} value={item.id} className="text-indigo-200 bg-[#120827] font-semibold py-1">
                        {item.subCaseAr}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          
          {/* Real-time Display of the Select Script guidelines if one is active */}
          {chatbotScriptMode !== "auto" && (
            <div className="bg-[#170e2f]/50 border border-indigo-950/40 p-3 rounded-lg mt-2 text-[10.5px] text-gray-300 space-y-1">
              {(() => {
                const selectedCase = CHATBOT_TREE_DATA.find(c => c.id === chatbotScriptMode);
                if (!selectedCase) return null;
                return (
                  <>
                    <div className="font-extrabold text-indigo-400 flex items-center gap-1.5 mb-1">
                      <span>📄 السكريبت الرسمي المعتمد:</span>
                      <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800/40 text-indigo-300 font-mono select-none">{selectedCase.id}</span>
                    </div>
                    <p className="bg-black/20 p-2 rounded border border-indigo-950/30 italic text-white line-clamp-3 hover:line-clamp-none transition">{selectedCase.scriptAr}</p>
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      <span className="font-extrabold text-blue-400">الكلمات المفتاحية:</span>
                      {selectedCase.keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className="bg-blue-950/40 text-blue-300 px-1 py-0.2 rounded border border-blue-900/30 text-[9px]">{kw}</span>
                      ))}
                    </div>
                    <div className="pt-0.5 flex flex-wrap gap-1.5">
                      <span className="font-extrabold text-emerald-400">عبارات التدقيق (Trigger Phrases):</span>
                      {selectedCase.triggerPhrases.map((tp, i) => (
                        <span key={i} className="bg-emerald-950/40 text-emerald-300 px-1 py-0.2 rounded border border-emerald-900/30 text-[9px]">{tp}</span>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {chatLinesMsg && (
          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <Check size={14} /> {chatLinesMsg}
          </p>
        )}
        <div className="flex justify-center">
          <button
            onClick={processChatLog}
            disabled={isEvaluating}
            className="px-6 py-3 w-full sm:w-auto rounded-xl bg-[var(--color-brand-magenta)] hover:bg-[var(--color-brand-magenta-hover)] text-white text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
          >
            <Brain size={18} />
            {isEvaluating ? "جاري فحص الشات وصيانة الأخطاء..." : "1. تحليل المحادثة بذكاء الـ QA بنقرة واحدة ✨"}
          </button>
        </div>
      </div>

      {/* Evaluation Segment Output */}
      {showEvaluation && (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-2 text-md font-bold text-white border-b border-[var(--border-card)] pb-2">
            <CheckSquare className="text-[var(--color-brand-magenta)]" size={20} />
            <span>تقرير الأداء المبدئي ونتائج المسح</span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" dir="rtl">
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">التقييم الفعلي</span>
              <span className={`text-2xl font-black mt-1 ${score >= 90 ? "text-emerald-400" : (score >= 70 ? "text-amber-400" : "text-rose-400")}`}>
                {score}%
              </span>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">رقم الشات / Chat ID</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{chatId || "N/A"}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">اسم الموظف</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{agentName}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">البداية</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{chatStart}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">النهاية</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{chatEnd}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">المدة الكلية</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{chatDuration}</p>
            </div>
          </div>

          {/* Sentiment journey visualizer map */}
          {journeySteps.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-4" dir="rtl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🛤️</span> خريطة وتقلبات مشاعر العميل (AI Sentiment Journey Map)
              </h3>
              <div className="flex flex-col md:flex-row gap-6 relative justify-around pt-3">
                <div className="absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-[var(--border-card)] hidden md:block z-0" />
                {journeySteps.map((step, idx) => {
                  let emoji = "😐";
                  let moodColor = "border-amber-500 bg-amber-500/10";
                  if (step.mood.includes("غاضب") || step.mood.includes("سلب")) {
                    emoji = "😠";
                    moodColor = "border-rose-500 bg-rose-500/10";
                  } else if (step.mood.includes("راض") || step.mood.includes("سعي") || step.mood.includes("سعد")) {
                    emoji = "😍";
                    moodColor = "border-emerald-500 bg-emerald-500/10";
                  }
                  return (
                    <div key={idx} className="flex flex-col items-center text-center relative z-10 space-y-2 max-w-[200px]" >
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl ${moodColor}`}>
                        {emoji}
                      </div>
                      <span className="text-xs font-bold text-[var(--color-brand-magenta)]">{step.time}</span>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{step.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual Quality Checklist */}
          <div className="space-y-4" dir="rtl">
            <h3 className="text-sm font-bold text-white">📋 دليل بنود التقييم اليدوي والتوجيه (عدل وصحح الملاحظات)</h3>
            <div className="space-y-3">
              {/* Group by category */}
              {Array.from(new Set(checklist.map(x => x.category))).map(cat => (
                <div key={cat} className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="text-xs font-bold text-[var(--color-brand-magenta)] border-b border-[var(--border-card)] pb-1 mb-2">
                    {cat}
                  </div>
                  <div className="space-y-3">
                    {checklist.filter(x => x.category === cat).map(item => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-sm border-b border-[rgba(255,255,255,0.03)] pb-2 last:border-b-0 last:pb-0">
                        {/* Checkbox & Fact */}
                        <div className="md:col-span-4 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => handleCheckChange(item.id, e.target.checked)}
                            className="w-4 h-4 accent-[var(--color-brand-magenta)] cursor-pointer"
                          />
                          <span className={`text-xs font-semibold ${item.checked ? "text-white" : "text-gray-400"}`}>
                            {item.label}
                          </span>
                        </div>
                        {/* If hold/response, let enter time optionally */}
                        <div className="md:col-span-2">
                          {(item.id.startsWith("tm-1") || item.id.startsWith("tm-2") || item.id === "pr-1") ? (
                            <input
                              type="text"
                              placeholder="الوقت (01:30)"
                              value={item.time}
                              onChange={(e) => handleTextChange(item.id, "time", e.target.value)}
                              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded px-2 py-1 text-xs text-white max-w-[100px]"
                            />
                          ) : (
                            <div className="text-[10px] text-gray-500">محدد يدوياً</div>
                          )}
                        </div>
                        {/* Specific comments / description */}
                        <div className="md:col-span-5">
                          <input
                            type="text"
                            placeholder="تفاصيل الـ QA والحل المقترح..."
                            value={item.details}
                            onChange={(e) => handleTextChange(item.id, "details", e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        {/* Copy Snippet Utility */}
                        <div className="md:col-span-1 flex justify-end">
                          <button
                            onClick={() => copyDetailSnippet(item)}
                            className="p-1 cursor-pointer bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded text-xs text-[var(--text-secondary)] flex items-center justify-center gap-1 border border-[var(--border-card)]"
                            title="احصد تيكت الأخطاء مجمعة وانسخها"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual summarized and AI coaching logic side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                <FileText size={16} /> ملخص الأخطاء التشغيلية وحالة الجودة (QA Summary)
              </h4>
              <textarea
                value={manualSummary}
                readOnly
                className="w-full h-64 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl p-3 text-xs leading-relaxed text-white focus:outline-none font-mono"
                placeholder="سيتم طباعة الأخطاء المرصودة والتعليقات هنا تلقائياً..."
              />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl relative space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-[var(--color-brand-magenta)] flex items-center gap-1">
                  <Brain size={16} /> خطة التطوير ومكافحة الأخطاء (AI Coaching Action Plan)
                </h4>
                <button
                  onClick={executeAiCoaching}
                  disabled={isGeneratingCoaching}
                  className="px-3 py-1 cursor-pointer bg-[var(--color-brand-purple)] hover:bg-[var(--color-brand-purple-hover)] text-white text-[11px] font-bold rounded-lg transition"
                >
                  {isGeneratingCoaching ? "جاري الكتابة..." : "توليد كوتشينج ذكي 🧠"}
                </button>
              </div>
              <textarea
                value={aiCoachingPlan}
                onChange={(e) => setAiCoachingPlan(e.target.value)}
                className="w-full h-64 bg-[var(--bg-input)] border border-[var(--border-card)] rounded-xl p-3 text-xs leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-magenta)]"
                placeholder="توليد نموذج الكوتشينج الذكي بناءً على تحليل أفعال وأخطاء الموظف..."
              />
            </div>
          </div>

          {/* Action buttons save and draft EML */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={saveFinalEvaluation}
              disabled={isSaving}
              className="px-6 py-3 cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? "جاري الحفظ بالسحابة..." : "حفظ التقييم النهائي بقاعدة البيانات 💾"}
            </button>

            <button
              onClick={triggerEmailDetails}
              className="px-6 py-3 cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition flex items-center gap-2"
            >
              <Mail size={16} />
              تحميل نموذج البريد التوجيهي (EML)
            </button>
          </div>

          {/* Chat transcript highlighted visualizer */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-[var(--border-card)] pb-2 flex items-center gap-2">
              <span>💬</span> شريط استعراض المحاورة وملامح الأخطاء (Chat Visualizer)
            </h3>
            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto p-2">
              {parsedMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === "agent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 space-y-1 relative shadow-sm border ${
                      msg.type === "agent"
                        ? "bg-[var(--chat-agent-bg)] border-[rgba(139,92,246,0.3)] rounded-br-none"
                        : "bg-[var(--chat-cust-bg)] border-[var(--border-card)] rounded-bl-none"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-bold mb-1">
                      <span>{msg.type === "agent" ? "الموظف" : "العميل"}</span>
                      <span>{msg.timeStr}</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed font-medium">
                      {renderVisualizerText(msg.text)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EML detail builder modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-[#0f0d18] border border-[var(--border-card)] p-6 rounded-2xl w-full max-w-md space-y-4" dir="rtl">
            <div className="flex justify-between items-center border-b border-[var(--border-card)] pb-2">
              <h3 className="text-md font-bold text-white">📧 تفاصيل البريد الإداري (Outlook Draft)</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white cursor-pointer text-lg">✕</button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-secondary)]">إيميل الموظف الموجه إليه</label>
                <input
                  type="email"
                  value={emailAgentAddress}
                  onChange={(e) => setEmailAgentAddress(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2 text-xs text-white"
                  placeholder="e.g. name.surname@te.eg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">رقم الشات (Chat ID)</label>
                  <input
                    type="text"
                    value={emailChatId}
                    onChange={(e) => setEmailChatId(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2 text-xs text-white"
                    placeholder="e.g. 44199397"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">رقم الخدمة الأرضي</label>
                  <input
                    type="text"
                    value={emailServiceNumber}
                    onChange={(e) => setEmailServiceNumber(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2 text-xs text-white"
                    placeholder="e.g. 0502937288"
                  />
                </div>
              </div>

              <div className="space-y-1 font-sans">
                <label className="text-xs font-bold text-[var(--text-secondary)]">تاريخ الإحصاء والمسح</label>
                <input
                  type="text"
                  value={emailSurveyDate}
                  onChange={(e) => setEmailSurveyDate(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 cursor-pointer bg-slate-800 text-slate-300 text-xs font-bold rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={createAndDownloadEml}
                className="px-4 py-2 cursor-pointer bg-[var(--color-brand-magenta)] text-white text-xs font-bold rounded-lg"
              >
                تنزيل ملف EML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
