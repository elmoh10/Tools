import React, { useState, useEffect } from "react";
import { UserPlus, Trash2, Key, Users, ShieldAlert, Award, Star, Brain, Link2, BookOpen, FileText, Check, AlertCircle } from "lucide-react";

interface UserRecord {
  username: string;
  name: string;
  role: string;
  password?: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  links?: string;
  category: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Assistant knowledge management state
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [kTitle, setKTitle] = useState("");
  const [kContent, setKContent] = useState("");
  const [kLinks, setKLinks] = useState("");
  const [kCategory, setKCategory] = useState("procedures");
  const [kMsg, setKMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [kLoading, setKLoading] = useState(false);

  // Gemini API Key Dynamic Management State
  const [apiKeyInfo, setApiKeyInfo] = useState<{ hasCustomKey: boolean; hasEnvKey: boolean; activeKeySnippet: string } | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [apiKeyMsg, setApiKeyMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  // Fetch registered users
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Error loading users:", e);
    }
  };

  // Fetch API key info
  const fetchApiKeyInfo = async () => {
    try {
      const res = await fetch("/api/admin/api-key");
      if (res.ok) {
        const data = await res.json();
        setApiKeyInfo(data);
      }
    } catch (e) {
      console.error("Error loading API Key status:", e);
    }
  };

  // Fetch knowledge base articles
  const fetchKnowledge = async () => {
    try {
      const res = await fetch("/api/ai/knowledge");
      if (res.ok) {
        const data = await res.json();
        setKnowledge(data);
      }
    } catch (e) {
      console.error("Error loading knowledge items:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchKnowledge();
    fetchApiKeyInfo();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const trimmedUsername = username.trim();
    const trimmedName = name.trim();

    if (!trimmedUsername || !trimmedName || !password) {
      setMsg({ text: "⚠️ فضلاً أكمل جميع المدخلات أولاً", isError: true });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          name: trimmedName,
          password: password,
          role: "tl"
        })
      });

      if (res.ok) {
        setMsg({ text: "✨ تمت إضافة قائد الفريق وتفعيل حسابه بنجاح!", isError: false });
        setName("");
        setUsername("");
        setPassword("");
        fetchUsers();
      } else {
        const err = await res.json();
        setMsg({ text: `❌ ${err.error || "عذراً فشل إنشاء الحساب"}`, isError: true });
      }
    } catch (err) {
      setMsg({ text: "❌ فشل الاتصال بالخادم، يرجى المحاولة لاحقاً", isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: string) => {
    if (!window.confirm(`⚠️ هل أنت متأكد من سحب صلاحيات الدخول للمستخدم (${userToDelete}) وحذفه بالكامل؟`)) return;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userToDelete)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setMsg({ text: "🗑️ تم حذف حساب قائد الفريق وسحب صلاحيات الدخول فوراً.", isError: false });
        fetchUsers();
      } else {
        const err = await res.json();
        setMsg({ text: `❌ ${err.error || "فشل حذف الحساب"}`, isError: true });
      }
    } catch (err) {
      setMsg({ text: "❌ حدث خطأ أثناء الاتصال بالخادم", isError: true });
    }
  };

  const handleCreateKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setKMsg(null);

    const trimmedTitle = kTitle.trim();
    const trimmedContent = kContent.trim();

    if (!trimmedTitle || !trimmedContent) {
      setKMsg({ text: "⚠️ فضلاً أكمل العنوان ومحتوى التوجيه أولاً", isError: true });
      return;
    }

    setKLoading(true);
    try {
      const res = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          links: kLinks.trim(),
          category: kCategory
        })
      });

      if (res.ok) {
        setKMsg({ text: "✨ تم حفظ المستند وتلقيمه لوعي المساعد الذكي وربط اللينكات بنجاح!", isError: false });
        setKTitle("");
        setKContent("");
        setKLinks("");
        setKCategory("procedures");
        fetchKnowledge();
      } else {
        const err = await res.json();
        setKMsg({ text: `❌ ${err.error || "عذراً، فشل تغذية المساعد بالمعلومات"}`, isError: true });
      }
    } catch (err) {
      setKMsg({ text: "❌ فشل الاتصال بالخادم، يرجى المحاولة لاحقاً", isError: true });
    } finally {
      setKLoading(false);
    }
  };

  const handleDeleteKnowledge = async (id: string) => {
    if (!window.confirm("⚠️ هل أنت متأكد من حذف هذه التعليمة/الرابط نهائياً فسيتم مسحه من وعي المساعد الذكي؟")) return;

    try {
      const res = await fetch(`/api/ai/knowledge/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setKMsg({ text: "🗑️ تم سحب المستند من وعي المساعد بالكامل ومسحه من قاعدة البيانات.", isError: false });
        fetchKnowledge();
      } else {
        const err = await res.json();
        setKMsg({ text: `❌ ${err.error || "عذراً فشل حذف المستند"}`, isError: true });
      }
    } catch (err) {
      setKMsg({ text: "❌ فشل الاتصال بالخادم أثناء مسح المستند", isError: true });
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyMsg(null);
    const keyToSubmit = newApiKey.trim();

    if (!keyToSubmit) {
      setApiKeyMsg({ text: "⚠️ يرجى إدخال مفتاح الـ API أولاً!", isError: true });
      return;
    }

    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/admin/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyToSubmit })
      });

      if (res.ok) {
        setApiKeyMsg({ text: "✨ تم تحديث مفتاح Gemini API وتفعيله بنجاح بالخادم!", isError: false });
        setNewApiKey("");
        fetchApiKeyInfo();
      } else {
        const err = await res.json();
        setApiKeyMsg({ text: `❌ ${err.error || "فشل حفظ المفتاح الجديد"}`, isError: true });
      }
    } catch (err) {
      setApiKeyMsg({ text: "❌ فشل الاتصال بالخادم لحفظ المفتاح", isError: true });
    } finally {
      setApiKeyLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!window.confirm("⚠️ هل أنت متأكد من حذف هذا المفتاح المخصص؟ سيقوم الخادم بالعودة لاستخدام المفتاح الافتراضي في ملف البيئة .env")) return;

    setApiKeyLoading(true);
    try {
      const res = await fetch("/api/admin/api-key", {
        method: "DELETE"
      });

      if (res.ok) {
        setApiKeyMsg({ text: "🗑️ تم حذف المفتاح المخصص والعودة للـ API Key الافتراضي للنظام.", isError: false });
        fetchApiKeyInfo();
      } else {
        const err = await res.json();
        setApiKeyMsg({ text: `❌ ${err.error || "فشل مسح المفتاح"}`, isError: true });
      }
    } catch (err) {
      setApiKeyMsg({ text: "❌ فشل الاتصال بالخادم لحذف المفتاح", isError: true });
    } finally {
      setApiKeyLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans" dir="rtl" id="admin-panel-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-card)] pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="text-[var(--color-brand-magenta)] animate-pulse" size={24} />
            لوحة الإشراف وصلاحيات الـ Team Leaders
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            بصفتك المسئول والادمن الرئيسي للقسم الرقمي، يمكنك التحكم بأسماء قادة الفرق وتفعيل أو إلغاء اكواد الدخول الخاصة بهم.
          </p>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] px-4 py-2 rounded-xl flex items-center gap-3">
          <Users className="text-[var(--color-brand-magenta)]" size={18} />
          <div>
            <div className="text-[10px] text-[var(--text-secondary)] font-bold">إجمالي قادة الفرق النشطين</div>
            <div className="text-sm font-black text-white">{users.filter(u => u.role !== "admin").length} قادة فرق</div>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 animate-fade-in ${
          msg.isError ? "bg-red-950/40 border border-red-900/40 text-rose-300" : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-300"
        }`}>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel to add TL */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5 border-b border-[var(--border-card)] pb-2.5">
            <UserPlus size={16} className="text-[var(--color-brand-magenta)]" />
            تفعيل حساب Team Leader جديد
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">الاسم ثلاثي (Team Leader Name):</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد عثمان"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">اسم المستخدم / كود الدخول (Username):</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: Ahmed.O1002"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">كلمة المرور / الباسورد (Password):</label>
              <div className="relative">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="باسورد مميز وسهل الحفظ"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 pl-8 text-xs text-white font-mono"
                  required
                />
                <Key className="absolute left-3 top-2.5 text-gray-500" size={13} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[var(--color-brand-magenta)] hover:bg-[var(--color-brand-magenta-hover)] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? "جاري تفعيل الحساب..." : "تفعيل الحساب وتوليد الصلاحية ✨"}
            </button>
          </form>
        </div>

        {/* List of active TL accounts */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5 border-b border-[var(--border-card)] pb-2.5">
            <Users size={16} className="text-[var(--color-brand-magenta)]" />
            حسابات قادة الفرق المصرح لهم باستعمال الأداة
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--border-card)] text-[var(--text-secondary)] font-bold">
                  <th className="pb-2.5">الاسم ثلاثي (قائد الفريق)</th>
                  <th className="pb-2.5 text-center">كود الدخول (Username)</th>
                  <th className="pb-2.5 text-center">كلمة المرور (Password)</th>
                  <th className="pb-2.5 text-center">الدور / الرتبة</th>
                  <th className="pb-2.5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {users.map((u) => (
                  <tr key={u.username} className="hover:bg-[rgba(255,255,255,0.01)] transition">
                    <td className="py-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-brand-purple)]/20 text-[var(--color-brand-magenta)] flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-gray-300 font-mono select-all">
                      {u.username}
                    </td>
                    <td className="py-3 text-center text-gray-300 font-mono select-all">
                      {u.password || "••••••••"}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        u.role === "admin" 
                          ? "bg-[var(--color-brand-magenta)]/15 text-[var(--color-brand-magenta)] border border-[var(--color-brand-magenta)]/20" 
                          : "bg-[var(--color-brand-purple)]/15 text-[var(--color-brand-purple-hover)] border border-[var(--color-brand-purple)]/20"
                      }`}>
                        {u.role === "admin" ? "مدير المشهد (Admin)" : "قائد فريق (TL)"}
                      </span>
                    </td>
                    <td className="py-3 text-left">
                      {u.role !== "admin" ? (
                        <button
                          onClick={() => handleDeleteUser(u.username)}
                          className="p-1 px-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition text-[10px] font-black cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 size={11} /> سحب الصلاحية
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-bold px-2">حساب أساسي 🔒</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 🧠 Smart Assistant Knowledge Feed Manager */}
      <div className="border-t border-[var(--border-card)] pt-8 space-y-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Brain className="text-[var(--color-brand-magenta)] animate-pulse" size={24} />
            إدارة وتلقيم المساعد الذكي بالمعلومات والروابط (Knowledge feed Control)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            من هنا يمكنك تزويد المساعد الذكي بأحدث التعاميم، البروتوكولات، روابط الدعم، وصلاحيات التعويض. سيقوم الذكاء الاصطناعي باستيعابها فوراً للتفاعل مع مستفسري قادة الفرق والـ Agents.
          </p>
        </div>

        {kMsg && (
          <div className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 animate-fade-in ${
            kMsg.isError ? "bg-red-950/40 border border-red-900/40 text-rose-300" : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-300"
          }`}>
            <span>{kMsg.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form to submit knowledge */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5 border-b border-[var(--border-card)] pb-2.5">
              <BookOpen size={16} className="text-[#8b5cf6]" />
              تغذية المساعد الذكي بوثيقة جديدة
            </h3>
            <form onSubmit={handleCreateKnowledge} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">عنوان التوجيه / العملية (Title):</label>
                <input
                  type="text"
                  value={kTitle}
                  onChange={(e) => setKTitle(e.target.value)}
                  placeholder="مثال: بروتوكول خصم باقة الموبايل"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">تصنيف العملية (Category):</label>
                <select
                  value={kCategory}
                  onChange={(e) => setKCategory(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white"
                >
                  <option value="procedures">💻 بروتوكولات وإجراءات الـ Support</option>
                  <option value="coaching">🎯 إرشادات تدريبية وكوتشينج (Coaching Guidelines)</option>
                  <option value="general">ℹ️ معلومات وروابط عامة</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">نص المادة / الشرح التفصيلي للذكاء الاصطناعي (Content):</label>
                <textarea
                  value={kContent}
                  onChange={(e) => setKContent(e.target.value)}
                  placeholder="اكتب التوجيهات بالتفصيل هنا لمشاركة وتوريث ذكاء المساعد الموحد لو بخصوص التعويضات أو الحلول الأرضية للراوترات..."
                  rows={6}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white leading-relaxed resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1">الرابط المرفق المعتمد / مرجع رسمي (URL):</label>
                <div className="relative">
                  <input
                    type="url"
                    value={kLinks}
                    onChange={(e) => setKLinks(e.target.value)}
                    placeholder="https://te.eg/... (اختياري)"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 pl-8 text-xs text-white font-mono"
                  />
                  <Link2 className="absolute left-3 top-2.5 text-gray-500" size={13} />
                </div>
              </div>

              <button
                type="submit"
                disabled={kLoading}
                className="w-full py-2.5 bg-gradient-to-r from-[#8b5cf6] to-[var(--color-brand-magenta)] hover:opacity-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {kLoading ? "جاري تعميم وثيقة المعرفة..." : "تلقيم وإمداد المساعد الذكي بالمعرفة 🚀"}
              </button>
            </form>
          </div>

          {/* List of active knowledge articles */}
          <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5 border-b border-[var(--border-card)] pb-2.5">
              <FileText size={16} className="text-[#8b5cf6]" />
              الوثائق وقاعدة المعرفة النشطة بذاكرة الروبوت حالياً ({knowledge.length} وثائق)
            </h3>

            {knowledge.length === 0 ? (
              <div className="text-center py-12 text-xs text-[var(--text-secondary)]">
                لم يتم إضافة وثائق أو معلومات خاصة حتى الآن. المساعد يقرأ معايير النظام الافتراضية فقط.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-[560px] overflow-y-auto pr-1 text-right">
                {knowledge.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[var(--border-card)] hover:border-[#8b5cf6]/30 bg-[var(--bg-input)]/25 p-4 rounded-xl space-y-3 transition"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          item.category === "procedures"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : item.category === "coaching"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}>
                          {item.category === "procedures" ? "💻 إجراءات الدعم" : item.category === "coaching" ? "🎯 توجيه وتدريب" : "ℹ️ عام"}
                        </span>
                        <h4 className="text-xs font-extrabold text-white mt-1.5">{item.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        className="p-1 px-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-lg transition text-[9px] font-bold cursor-pointer flex items-center gap-1"
                        title="حذف المستند"
                      >
                        <Trash2 size={10} /> لغو المستند
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>

                    {item.links && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-950/20 border border-indigo-500/10 rounded-lg text-[10px] font-mono text-indigo-300 select-all max-w-max">
                        <Link2 size={11} className="shrink-0" />
                        <a href={item.links} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">
                          {item.links}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔑 Dynamic API Key Settings */}
      <div className="border-t border-[var(--border-card)] pt-8 space-y-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Key className="text-[var(--color-brand-magenta)]" size={24} />
            إدارة مفاتيح التشغيل الذكي (Gemini API Key Controller)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            إذا تم استهلاك رصيد المفتاح الافتراضي أو واجهت مشكلة انقطاع المساعد، يمكنك تلقيم مفتاح تشغيل مخصص من Google AI Studio فوراً دون أي حاجة لتعديل الأكواد البرمجية.
          </p>
        </div>

        {apiKeyMsg && (
          <div className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 animate-fade-in ${
            apiKeyMsg.isError ? "bg-red-950/40 border border-red-900/40 text-rose-300" : "bg-emerald-950/40 border border-emerald-900/40 text-emerald-300"
          }`}>
            <span>{apiKeyMsg.text}</span>
          </div>
        )}

        <div className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Form to submit API Key */}
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-gray-300 mb-1.5">أدخل مفتاح الـ API Key الجديد:</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border-card)] focus:border-[var(--color-brand-magenta)] rounded-xl py-2 px-3 text-xs text-white font-mono placeholder:text-gray-600"
                    required
                  />
                  <button
                    type="submit"
                    disabled={apiKeyLoading}
                    className="px-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    {apiKeyLoading ? "جاري الحفظ..." : "حفظ المفتاح ✨"}
                  </button>
                </div>
              </div>

              <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 text-xs leading-relaxed text-indigo-200">
                💡 **احصل على مفتاح تشغيل مجاني تماماً:**
                <p className="mt-1 text-gray-400 text-[11px]">
                  يمكنك استخراج مفتاح API جديد بصورة فورية ومجانية من خلال التوجه إلى منصة Google AI Studio الرسمية:
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-[#8b5cf6] hover:opacity-95 text-white font-bold text-[10px] rounded-lg transition shrink-0"
                >
                  <Link2 size={12} /> انتقل إلى Google AI Studio للحصول على مفتاح مجاني 🚀
                </a>
              </div>
            </form>

            {/* Status overview */}
            <div className="bg-[var(--bg-input)]/20 border border-[var(--border-card)] rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-black text-white flex items-center gap-1.5 border-b border-[var(--border-card)] pb-2">
                <Check className="text-emerald-400" size={14} /> حالة المفتاح النشط بالخادم حالياً
              </h4>

              <div className="space-y-3 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">نوع المفتاح المستخدم حالياً:</span>
                  {apiKeyInfo?.hasCustomKey ? (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-black">
                      مفتاح مخصص للإشراف 👑
                    </span>
                  ) : apiKeyInfo?.hasEnvKey ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black">
                      المفتاح الافتراضي للنظام ⚙️
                    </span>
                  ) : (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-black">
                      غير مهيأ (أوفلاين محلي) ⚠️
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">المفتاح النشط (الرموز الأولى والأخيرة):</span>
                  <span className="font-mono text-gray-300 text-[11px] select-all bg-black/40 px-2.5 py-1 rounded border border-white/5">
                    {apiKeyInfo?.activeKeySnippet || "بلا قيمة معينة حتى الآن"}
                  </span>
                </div>

                {apiKeyInfo?.hasCustomKey && (
                  <div className="pt-2 border-t border-[var(--border-card)] flex justify-end">
                    <button
                      type="button"
                      disabled={apiKeyLoading}
                      onClick={handleDeleteApiKey}
                      className="px-3.5 py-1.5 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/40 text-rose-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      إعادة التعيين والعودة للمفتاح الافتراضي 🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
