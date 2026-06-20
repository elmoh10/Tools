import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Sparkles, Send, Brain, Cpu, MessageCircle, HelpCircle, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  modelUsed?: string;
  thinkingMode?: boolean;
}

export default function GeminiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<"audit" | "trainer" | "analyst">("audit");
  const [modelName, setModelName] = useState<"gemini-3.1-flash-lite" | "gemini-3.5-flash" | "gemini-3.1-pro-preview">("gemini-3.5-flash");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message on role or model change when empty or reset
  useEffect(() => {
    if (messages.length === 0) {
      resetWelcomeMessage();
    }
  }, [role, messages]);

  const resetWelcomeMessage = () => {
    let welcomeText = "";
    if (role === "audit") {
      welcomeText = "مرحباً بك! أنا **خبير تدقيق جودة الدعم الفني الرقمي لشركة WE** 🕵️. \n\nمهمتي هي مساعدتك بمراجعة المحادثات وتحسين معايير الجودة (NPS & AHT) وتوريث التوجيهات لقادة الفرق. كيف يمكنني مساعدتك في تدقيق المحادثات اليوم؟";
    } else if (role === "trainer") {
      welcomeText = "مرحباً بك! أنا **مدرب الدعم التفاعلي بقسم WE الرقمي** 🎯. \n\nمستعد لتصميم ردود متعاطفة، ومحاكاة مواقف العملاء الغاضبين وتدريب ممثلي الدعم لرفع معدل الـ FCR. اسألني عن أي سيناريو تدريب أو صياغة ردود بديلة!";
    } else {
      welcomeText = "مرحباً بك! أنا **مسؤول مراقبة الامتثال والتحليل الإحصائي السلوكي** 📊. \n\nأقوم بتحليل ارتباطات الأرقام وتطوير الخطط الإستراتيجية لتقليص انحرافات العمليات. شاركني بأرقام أو مشاكل متكررة لنباشر تفكيكها سلوكياً.";
    }

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: welcomeText,
        timestamp: new Date(),
        modelUsed: "🤖 ترحيب المنظومة"
      }
    ]);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim() || isGenerating) return;

    if (!textToSend) {
      setInput("");
    }

    const userMsg: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: rawText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    // Prepare history payload for backend
    // Format messages as req.body expects: [{ role, content }]
    const historyPayload = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await fetch("/api/ai/multiturn-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          modelName,
          role
        })
      });

      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: data.text || "عذراً، لم يتم صياغة رد مناسب.",
        timestamp: new Date(),
        modelUsed: modelName === "gemini-3.1-pro-preview" ? "gemini-3.1-pro-preview (تفكير عميق)" : modelName,
        thinkingMode: modelName === "gemini-3.1-pro-preview"
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error("Failed to connect with chat assistant", e);
      // Fallback
      const assistantMsg: Message = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: `⚠️ تعذر إرسال طلبك إلى السيرفر الرئيسي.\n\nيرجى التحقق من اتصالك بالمنفذ 3000 أو تفعيل مفتاح الـ Gemini API في لوحة الإعدادات.`,
        timestamp: new Date(),
        modelUsed: "خطأ محلي"
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const getModelLabel = (m: string) => {
    if (m === "gemini-3.1-flash-lite") return "سرعة خاطفة ⚡";
    if (m === "gemini-3.5-flash") return "ذكاء متزن 🧠";
    return "تفكير فائق 🦖 Pro";
  };

  const starterQuestions = {
    audit: [
      "كيف أتعامل مع ممثل دعم يتخطى الـ Hold دائمًا؟",
      "كيف نكشف التعاطف الصادق مقابل المصطنع في الردود؟"
    ],
    trainer: [
      "اكتب سيناريو عطل راوتر لعميل غاضب وصياغة ردود محتوية.",
      "ما هي أفضل عبارات الترحيب والتحقق لخدمة WE؟"
    ],
    analyst: [
      "حلل العلاقة بين AHT منخفض جداً و NPS سلبي.",
      "كيف يمكن وضع خطة تحسين لنقاط الجودة المتكررة؟"
    ]
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" dir="rtl">
      {/* Trigger Bubble Button */}
      {!isOpen && (
        <motion.button
          id="we-copilot-trigger"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-tr from-[var(--color-brand-magenta)] to-indigo-600 text-white rounded-full p-4 shadow-[0_10px_30px_rgba(235,0,139,0.35)] flex items-center justify-center gap-2 cursor-pointer border border-[#eb008b]/40 relative overflow-hidden group"
          layoutId="copilot-container"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
          <span className="text-xs font-black tracking-wide pl-1">مساعد WE الذكي</span>
          
          {/* Pulse notification dot */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
         </motion.button>
      )}

      {/* Expanded Interactive Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="copilot-container"
            className="w-[92vw] sm:w-[460px] h-[640px] max-h-[85vh] bg-[#0c0817]/98 border border-[#3b2a64] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
          >
            {/* Header Section */}
            <div className="p-4 bg-gradient-to-r from-[#170e2b] to-[#0f091f] border-b border-[#2d1f4d] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-[rgba(235,0,139,0.15)] text-[var(--color-brand-magenta)] rounded-xl p-2 border border-[#eb008b]/20">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                    مساعد WE الذكي (AI Copilot)
                    <span className="bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded text-[8px] font-bold border border-indigo-700/30">Gemini Active</span>
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium">مستشارك الآلي لتحسين الـ NPS وجودة المكالمات</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Config Box: Role Tabs & Model Selector */}
            <div className="p-3 bg-[#130d25] border-b border-[#2a1b4d] space-y-2.5">
              {/* Role Selection */}
              <div className="space-y-1">
                <label className="text-[9px] text-gray-400 font-bold block">مجهود الاستشارة / دور المساعد:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => { setRole("audit"); setMessages([]); }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border cursor-pointer text-center whitespace-nowrap overflow-hidden ${
                      role === "audit"
                        ? "bg-[rgba(235,0,139,0.1)] text-[var(--color-brand-magenta)] border-[#eb008b]/40 shadow-sm"
                        : "bg-white/2 bg-opacity-10 text-gray-400 border-[#2a1c49] hover:bg-white/5"
                    }`}
                  >
                    🕵️ خبير جودة
                  </button>
                  <button
                    onClick={() => { setRole("trainer"); setMessages([]); }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border cursor-pointer text-center whitespace-nowrap overflow-hidden ${
                      role === "trainer"
                        ? "bg-indigo-950/40 text-indigo-400 border-indigo-800/50 shadow-sm"
                        : "bg-white/2 bg-opacity-10 text-gray-400 border-[#2a1c49] hover:bg-white/5"
                    }`}
                  >
                    🎯 مدرب تفاعلي
                  </button>
                  <button
                    onClick={() => { setRole("analyst"); setMessages([]); }}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition border cursor-pointer text-center whitespace-nowrap overflow-hidden ${
                      role === "analyst"
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/50 shadow-sm"
                        : "bg-white/2 bg-opacity-10 text-gray-400 border-[#2a1c49] hover:bg-white/5"
                    }`}
                  >
                    📊 مخطط مالي
                  </button>
                </div>
              </div>

              {/* Model Choice */}
              <div className="flex items-center justify-between gap-2 bg-[#090613] p-1.5 rounded-xl border border-[#231641]">
                <span className="text-[9px] text-gray-400 font-bold pr-1">طراز الذكاء الاصطناعي:</span>
                <div className="flex gap-1">
                  {(["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.1-pro-preview"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setModelName(m)}
                      className={`py-1 px-1.5 rounded-lg text-[9px] font-black transition cursor-pointer ${
                        modelName === m
                          ? "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-md border-0"
                          : "text-gray-400 hover:text-white bg-transparent"
                      }`}
                    >
                      {m === "gemini-3.1-flash-lite" ? "لايت ⚡" : m === "gemini-3.5-flash" ? "فلاش 🧠" : "جراند پرو 🦖"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Flow Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-radial from-[#120a27] via-[#070410] to-[#04020a]" style={{ scrollBehavior: "smooth" }}>
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex flex-col max-w-[85%] ${isUser ? "mr-auto items-start" : "ml-auto items-end"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] text-gray-400 font-bold">
                        {isUser ? "👤 مستخدم النظام" : role === "audit" ? "🕵️ جودة WE" : role === "trainer" ? "🎯 مدرب WE" : "📊 مخطط WE"}
                      </span>
                      {message.modelUsed && (
                        <span className="text-[8px] bg-[#1a1138] text-[rgb(220,180,255)] px-1 py-0.1 select-none rounded border border-[#30215e]/50 font-mono">
                          {getModelLabel(message.modelUsed)}
                        </span>
                      )}
                    </div>
                    
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap transition font-medium ${
                        isUser
                          ? "bg-gradient-to-tr from-[#8b5cf6] to-[#eb008b] text-white rounded-tr-none shadow-md"
                          : "bg-[#181131]/90 text-gray-200 rounded-tl-none border border-[#3e235e]/60 shadow-sm"
                      }`}
                    >
                      {message.content.split("**").map((part, idx) => {
                        // Very simple markdown bold parser
                        if (idx % 2 === 1) {
                          return <strong key={idx} className="text-white font-extrabold">{part}</strong>;
                        }
                        return part;
                      })}
                    </div>
                    
                    <span className="text-[8px] text-gray-500 font-medium mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}

              {/* Streaming loading placeholder */}
              {isGenerating && (
                <div className="flex flex-col max-w-[85%] ml-auto items-end animate-pulse">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] text-gray-400 font-bold">يقوم الفاحص بالصياغة...</span>
                    {modelName === "gemini-3.1-pro-preview" && (
                      <span className="text-[8px] bg-purple-950 text-yellow-300 px-1 py-0.1 rounded border border-yellow-500/30 animate-pulse font-bold">
                        🧠 نمط التفكير المعقد مفعل
                      </span>
                    )}
                  </div>
                  <div className="bg-[#181131] border border-[#3e235e]/60 p-4 rounded-2xl rounded-tl-none flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    {modelName === "gemini-3.1-pro-preview" && (
                      <span className="text-[10px] text-zinc-400 font-semibold pl-1.5">يقوم بنسج التفكير والاستنتاج...</span>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Starter Prompts Box */}
            {messages.length === 1 && !isGenerating && (
              <div className="px-3 py-1 bg-[#090514] border-t border-[#1d1235]">
                <p className="text-[9px] text-gray-400 font-bold mb-1">💡 أسئلة استرشادية مقترحة:</p>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pb-1">
                  {starterQuestions[role].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q)}
                      className="text-right p-1.5 bg-[#170e2f]/50 hover:bg-[#201342]/70 text-gray-300 font-medium text-[10px] rounded-lg border border-[#3c256e]/30 transition truncate cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form Section */}
            <div className="p-3 bg-[#0d091e] border-t border-[#291b4b] flex gap-2">
              <input
                type="text"
                value={input}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isGenerating ? "جاري انتظار رد السحاب..." : "اكتب استفسارك هنا للجودة..."}
                disabled={isGenerating}
                className="flex-1 py-2 px-3 bg-[#150f2f] border border-[#34245c] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-brand-magenta)] focus:ring-1 focus:ring-[var(--color-brand-magenta)] transition font-medium"
              />
              
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isGenerating}
                className={`p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer ${
                  input.trim() && !isGenerating
                    ? "bg-gradient-to-tr from-[var(--color-brand-magenta)] to-[#8b5cf6] text-white hover:opacity-90 shadow-md"
                    : "bg-[#21163e] text-gray-500 border border-[#2d1e53]"
                }`}
              >
                <Send className="w-4 h-4 scale-x-[-1]" />
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setTimeout(() => resetWelcomeMessage(), 50);
                }}
                title="تصفير المحادثة"
                className="p-2.5 bg-[#191136] hover:bg-[#2e1d5a] text-gray-400 hover:text-white rounded-xl border border-[#33215c]/60 transition cursor-pointer"
              >
                🧹
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
