import React, { useState, useEffect } from "react";
import { AhtEvaluation, ChatMessage } from "../types";
import { Clock, CheckCircle2, XCircle, Mail, HelpCircle, RefreshCw } from "lucide-react";

const target720List = [
  "Eslam Ibrahim Yousef Saye",
  "Hala Samir Abdalla Ali",
  "Mahmoud Ayman Ahmed Elesawy",
  "Shady Alaa El Sayed Abu Talib",
  "Noura Samah Mohamed Amin",
  "Nesma Saad Nathan Gabra",
  "Sohila Mohamed Mohamed Mohamed",
  "Israa Adel Abd Elsamea Mahmoud",
  "Merna Nagy Youssef Soliman",
  "Khloud Samier El Sayed",
  "Ahmed Abdallah Kamal Abdelgaber"
];

interface AhtEnhancementProps {
  evaluations: AhtEvaluation[];
  onSave: (record: Partial<AhtEvaluation>) => Promise<any>;
}

export default function AhtEnhancement({ evaluations, onSave }: AhtEnhancementProps) {
  const [chatInput, setChatInput] = useState("");
  const [chatId, setChatId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [actualAht, setActualAht] = useState("00:00");
  const [responseTime, setResponseTime] = useState("00:00");
  const [holdTime, setHoldTime] = useState("00:00");
  const [chatLinesMsg, setChatLinesMsg] = useState("");

  const [lastEval, setLastEval] = useState<AhtEvaluation | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);

  // Helper formattings
  const formatTime = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Internal parser for AHT
  const parseChatLogText = (text: string) => {
    const lines = text.split("\n");
    const messages: any[] = [];
    let currentSender = "";
    let currentType = "";
    let currentTimeStr = "";
    let currentText = "";

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
            timeObj: new Date(`01/01/2026 ${currentTimeStr}`) // placeholder date
          });
        }
        currentSender = match[1].trim();
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
        timeObj: new Date(`01/01/2026 ${currentTimeStr}`)
      });
    }
    return messages;
  };

  const handleChatInputChange = (text: string) => {
    setChatInput(text);
    if (!text.trim()) {
      setChatLinesMsg("");
      return;
    }

    const messages = parseChatLogText(text);
    if (messages.length === 0) return;

    setChatLinesMsg(`✅ تم العثور على ${messages.length} رسالة!`);

    // Extract Agent Name
    const agentMsgs = messages.filter(m => m.type === "agent");
    if (agentMsgs.length > 0) {
      const rawName = agentMsgs[0].sender.replace(/\d+/g, "").replace(/[\s,]+/g, " ").trim();
      const matched = target720List.find(n => n.toLowerCase().includes(rawName.toLowerCase()) || rawName.toLowerCase().includes(n.toLowerCase())) || rawName;
      setAgentName(matched);
    }

    // Extract Duration/AHT
    try {
      const startObj = messages[0].timeObj;
      const endObj = messages[messages.length - 1].timeObj;
      let diffSec = Math.floor((endObj.getTime() - startObj.getTime()) / 1000);
      if (diffSec < 0) diffSec += 86400; // overnight fallback
      setActualAht(formatTime(diffSec));
    } catch (e) {
      setActualAht("07:15");
    }

    // Max Response Time
    let maxResp = 0;
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].type === "customer") {
        for (let j = i + 1; j < messages.length; j++) {
          if (messages[j].type === "agent") {
            const diff = Math.floor((messages[j].timeObj.getTime() - messages[i].timeObj.getTime()) / 1000);
            if (diff > maxResp) maxResp = diff;
            break;
          }
        }
      }
    }
    setResponseTime(formatTime(maxResp));

    // Max Hold Time
    let maxHold = 0;
    const holdKw = ["لحظات", "دقيقتين", "انتظار", "افحص", "راجع", "هتاكد", "ثواني", "معايا"];
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].type === "agent" && holdKw.some(kw => messages[i].text.includes(kw))) {
        for (let j = i + 1; j < messages.length; j++) {
          if (messages[j].type === "agent") {
            const diff = Math.floor((messages[j].timeObj.getTime() - messages[i].timeObj.getTime()) / 1000);
            if (diff > maxHold) maxHold = diff;
            break;
          }
        }
      }
    }
    setHoldTime(formatTime(maxHold));
  };

  const evaluateAHT = async () => {
    if (!agentName) return alert("الرجاء لصق نص المحادثة ليتم استخراج البيانات.");

    const targetVal = target720List.includes(agentName) ? "07:20" : "07:45";
    const respVio: string[] = [];
    const holdVio: string[] = [];
    const holdKw = ["لحظات", "دقيقتين", "انتظار", "افحص", "راجع", "هتاكد", "ثواني", "معايا"];

    const messages = parseChatLogText(chatInput);
    if (messages.length > 0) {
      for (let i = 0; i < messages.length - 1; i++) {
        const cur = messages[i];

        if (cur.type === "customer") {
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].type === "agent") {
              const diff = Math.floor((messages[j].timeObj.getTime() - cur.timeObj.getTime()) / 1000);
              if (diff > 60) {
                respVio.push(`تأخر في الرد لمدة ${formatTime(diff)} على سؤال العميل في التوقيت ${cur.timeStr}`);
              }
              break;
            }
          }
        }

        if (cur.type === "agent" && holdKw.some(kw => cur.text.includes(kw))) {
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].type === "agent") {
              const diff = Math.floor((messages[j].timeObj.getTime() - cur.timeObj.getTime()) / 1000);
              if (diff > 120) {
                holdVio.push(`تجاوز فترة الانتظار (Hold) لمدة ${formatTime(diff)} تبدأ من التوقيت ${cur.timeStr}`);
              }
              break;
            }
          }
        }
      }
    }

    const payload: Partial<AhtEvaluation> = {
      chatId: chatId || "N/A",
      fullName: agentName,
      targetAht: targetVal,
      actualAht: actualAht,
      responseTime: responseTime,
      holdTime: holdTime,
      isFaulty: respVio.length > 0 || holdVio.length > 0,
      respVio,
      holdVio,
      date: new Date().toISOString()
    };

    const saved = await onSave(payload);
    setLastEval(saved);
    setShowEvaluation(true);
  };

  const downloadEml = () => {
    if (!lastEval) return;
    const firstName = lastEval.fullName.split(" ")[0];
    const chatRef = lastEval.chatId !== "N/A" ? ` - ${lastEval.chatId}` : "";

    let vioHtml = "";
    if (lastEval.respVio.length > 0 || lastEval.holdVio.length > 0) {
      vioHtml += `
        <div style="background-color: #fdf2f2; border-right: 4px solid #ef4444; padding: 15px; margin-top: 15px;">
          <h4 style="color: #b91c1c; margin-top: 0; margin-bottom: 8px;" dir="rtl">⚠️ تفاصيل التأخيرات المرصودة (Chat ID: ${lastEval.chatId}):</h4>
          <ul dir='rtl' style='font-family: Arial, sans-serif; font-size: 13px; color: #333; margin-bottom: 0;'>
      `;
      lastEval.respVio.forEach(vio => {
        vioHtml += `<li><b>Response:</b> ${vio}</li>`;
      });
      lastEval.holdVio.forEach(vio => {
        vioHtml += `<li><b>Hold:</b> ${vio}</li>`;
      });
      vioHtml += `</ul></div>`;
    }

    const emailBody = `
      <html dir='ltr'>
      <body style='font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000;'>
        <p>Dear <b>${firstName}</b>,</p>
        <p>This is your automated AHT evaluation report. Kindly focus on our goal thresholds to retain excellence benchmarks:</p>
        <ul>
          <li><b>Target Limit:</b> ${lastEval.targetAht}</li>
          <li><b>Actual AHT:</b> ${lastEval.actualAht}</li>
          <li><b>Max Response interval:</b> ${lastEval.responseTime}</li>
          <li><b>Max Hold Protocol:</b> ${lastEval.holdTime}</li>
        </ul>
        <p><b>AHT Action Plan & Tips (Arabic):</b></p>
        <ul dir='rtl' style='font-family: Arial, sans-serif; font-size: 13px; color: #333333;'>
          <li>تجنب التباطؤ في الرد والمحافظة على رتم سريع لتفادي إحباط العميل.</li>
          <li>المتابعة الفعالة مع الدعم والأنظمة الفنية لعدم الإطالة بعد تفعيل فترة الهولد البديلة.</li>
        </ul>
        
        ${vioHtml}
        
        <br>
        <p style="color: #5c068c; font-weight: bold; margin-bottom: 5px;">Best regards,</p>
        <div style="font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #5c068c; line-height: 1.5;">
          Hesham Mohamed El-Gamil<br>
          Digital Support Team<br>
          Leader | Telecomegypt<br><br>
          E: <a href="mailto:Hesham.M148011@te.eg" style="color: blue; text-decoration: none;">Hesham.M148011@te.eg</a> M:<br>
          01114041548
        </div>
      </body>
      </html>
    `;

    const emlContent = `To: \r\nSubject: Coaching AHT Enhancement -- ${lastEval.fullName} -- Chat${chatRef}\r\nX-Unsent: 1\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}`;

    const blob = new Blob([emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AHT_Coaching_${firstName}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border-card)] pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>⏱️</span> AHT Evaluation Analyzer
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          حلل واحصد أوقات المحاورات آلياً وافحص فترات الانتظار ومستويات الاستجابة لتقليل الـ AHT وإفادة العميل.
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-5 rounded-2xl space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-[var(--text-secondary)]">1. ألصق المحاورة Chat Log (تقوم الأداة بحساب وتحميل المؤشرات فورياً):</label>
          <textarea
            value={chatInput}
            onChange={(e) => handleChatInputChange(e.target.value)}
            className="w-full h-40 bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl p-4 text-xs font-mono placeholder:text-gray-500 text-white leading-relaxed focus:outline-none"
            placeholder="Paste text transcription here..."
          />
          {chatLinesMsg && (
            <p className="text-xs text-emerald-400 font-semibold">{chatLinesMsg}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]">رقم الشات / Chat ID</label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2.5 text-xs text-white"
              placeholder="e.g. 44199397"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]">اسم الموظف</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2.5 text-xs text-white"
              placeholder="..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]">الفعلي / Actual AHT</label>
            <input
              type="text"
              value={actualAht}
              onChange={(e) => setActualAht(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2.5 text-xs text-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)] font-mono">Response Time</label>
            <input
              type="text"
              value={responseTime}
              onChange={(e) => setResponseTime(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2.5 text-xs text-white font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text-secondary)]">Hold Protocol</label>
            <input
              type="text"
              value={holdTime}
              onChange={(e) => setHoldTime(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] rounded-lg p-2.5 text-xs text-white font-mono"
            />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={evaluateAHT}
            className="px-6 py-2.5 w-full sm:w-auto rounded-xl bg-[var(--color-brand-magenta)] hover:bg-[var(--color-brand-magenta-hover)] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            📋 احسب الـ AHT وافحص المؤاشرات
          </button>
        </div>
      </div>

      {showEvaluation && lastEval && (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-2 text-md font-bold text-white border-b border-[var(--border-card)] pb-2">
            <Clock className="text-[var(--color-brand-purple)]" size={20} />
            <span>بيانات المحاكاة النهائية</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">المستهدف / Target</span>
              <p className="text-md font-extrabold text-[var(--color-brand-magenta)] mt-1">{lastEval.targetAht}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">الفعلي / Actual AHT</span>
              <p className="text-md font-extrabold text-white mt-1">{lastEval.actualAht}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] font-mono">Response Time</span>
              <p className="text-md font-extrabold text-white mt-1">{lastEval.responseTime}</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-card)] p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Hold Interval</span>
              <p className="text-md font-extrabold text-white mt-1">{lastEval.holdTime}</p>
            </div>
          </div>

          {/* Detailed checkouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir="rtl">
            {/* Response card */}
            <div className={`p-5 rounded-2xl border bg-[var(--bg-card)] flex flex-col justify-between ${lastEval.respVio.length === 0 ? "border-emerald-500/30 border-r-4 border-r-emerald-500" : "border-rose-500/30 border-r-4 border-r-rose-400"}`}>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {lastEval.respVio.length === 0 ? "✅" : "❌"} استجابة المحادثة (Response Time)
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {lastEval.respVio.length === 0 ? "عمل رائع ومواظب، لم يسجل أي انقطاع في الرد يتخطى الـ 60 ثانية." : "تم رصد تخطي لحد الاستجابة المسموح به خلال المحادثة:"}
                </p>
                {lastEval.respVio.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {lastEval.respVio.map((v, i) => (
                      <div key={i} className="text-[10px] p-2 rounded bg-rose-500/10 text-rose-300 font-mono border border-rose-500/10">
                        • {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hold card */}
            <div className={`p-5 rounded-2xl border bg-[var(--bg-card)] flex flex-col justify-between ${lastEval.holdVio.length === 0 ? "border-emerald-500/30 border-r-4 border-r-emerald-500" : "border-rose-500/30 border-r-4 border-r-rose-400"}`}>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {lastEval.holdVio.length === 0 ? "✅" : "❌"} بروتوكول الانتظار (Hold Protocol)
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {lastEval.holdVio.length === 0 ? "سليم، يراعي تنبيه العميل والالتزام بفترات الانتظار الأقل من دقيقتين." : "تم رصد تخطي لبروتوكول الانتظار المسموح به:"}
                </p>
                {lastEval.holdVio.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {lastEval.holdVio.map((v, i) => (
                      <div key={i} className="text-[10px] p-2 rounded bg-rose-500/10 text-rose-300 font-mono border border-rose-500/10">
                        • {v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={downloadEml}
              className="px-6 py-3 cursor-pointer rounded-xl bg-[var(--color-brand-purple)] hover:bg-[var(--color-brand-purple-hover)] text-white text-xs font-bold flex items-center gap-2"
            >
              <Mail size={16} /> Load EML Action Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
