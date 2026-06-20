import React, { useState } from "react";
import WeLogo from "./WeLogo";
import { Lock, User, RefreshCw, KeyRound, ArrowRightLeft } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: { username: string; name: string; role: string }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg("⚠️ فضلاً أدخل اسم المستخدم وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          onLoginSuccess(data.user);
        } else {
          setErrorMsg("عذراً، فشلت عملية المصادقة");
        }
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.error || "خطأ في تسجيل الدخول، يرجى التحقق من المدخلات");
      }
    } catch (err) {
      setErrorMsg("❌ عذراً، تعذر الاتصال بالخادم الداخلي حالياً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#07050e] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans"
      id="login-screen-outer"
    >
      {/* Decorative Brand Color Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#5E2390]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#ff007f]/5 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#0f0b1a] border border-[#231b33] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          {/* Official Vector WE Logo */}
          <WeLogo className="w-16 h-16 transform hover:scale-[1.05] transition-all duration-300 shadow-lg" />
          
          <div>
            <h1 className="text-xl font-black text-white tracking-wide">أداة قياس ومراقبة الأداء والإنتاجية</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#a855f7] font-extrabold mt-1">
              WE Digital Care • Team Leader Coach & Quality Tracker
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 bg-rose-950/40 border border-rose-900/40 text-rose-300 rounded-xl text-xs font-bold text-center animate-fade-in" dir="rtl">
            {errorMsg}
          </div>
        )}

        {/* Security / Role Warning Banner */}
        <div className="mb-6 p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[10px] text-gray-400 font-medium text-center" dir="rtl">
          🔒 هذه المنظومة مخصصة حصرًا لـ <strong className="text-indigo-300">قادة فرق الدعم الرقمي (Team Leaders)</strong> والمسئولين المصرح لهم بمتابعة جودة الأداء والإنتاجية.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-[11px] font-extrabold text-[#d1c4e9] mb-1.5 mr-1">كود الدخول أو اسم المستخدم (Username):</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم باللغة الإنجليزية"
                className="w-full bg-[#150f24] border border-[#31264c] focus:border-[#c084fc] rounded-xl py-3 px-4 pr-11 text-xs text-white placeholder-gray-600 transition duration-200 outline-none font-mono"
                required
              />
              <User className="absolute right-4 top-3.5 text-gray-500" size={14} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-[#d1c4e9] mb-1.5 mr-1">كلمة المرور / الباسورد (Password):</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#150f24] border border-[#31264c] focus:border-[#c084fc] rounded-xl py-3 px-4 pr-11 text-xs text-white placeholder-gray-600 transition duration-200 outline-none font-mono"
                required
              />
              <Lock className="absolute right-4 top-3.5 text-gray-500" size={14} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-l from-[#5e2390] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#5e2390] text-white font-bold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin text-white" size={13} />
                جاري التحقق من كود الدخول...
              </>
            ) : (
              <>
                تأكيد كود الدخول وفتح الأداة
                <KeyRound size={13} />
              </>
            )}
          </button>
        </form>

        {/* Footer Admin hint */}
        <div className="mt-8 text-center text-[10px] text-gray-600">
          في حال فقدان كلمة المرور، يرجى التواصل مع المسؤول الرئيسي للقسم الرقمي لتعديل أو تفعيل حسابك.
        </div>
      </div>
    </div>
  );
}
