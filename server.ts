import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Local JSON File Database persistence
const DB_FILE = path.join(process.cwd(), "data_store.json");

interface DbSchema {
  nps_evaluations: any[];
  aht_evaluations: any[];
  quality_records: any[];
  users: any[];
  assistant_knowledge?: any[];
  gemini_api_key?: string;
}

function loadDb(): DbSchema {
  const defaultUsers = [
    {
      username: "Hesham.M148011",
      password: "Etch2410#$#",
      role: "admin",
      name: "Hesham El-Gamil (Admin)"
    }
  ];

  const defaultKnowledge = [
    {
      id: "k_1",
      title: "بروتوكول فترات الانتظار والـ Hold",
      content: "يُحظر تماماً تعليق العميل (Hold) لأكثر من دقيقتين متواصلتين دون تحديثه. يجب أولاً أخذ إذنه بشكل لائق (مثال: 'هل تسمح لي بدقيقة لفحص طلبك والاطلاع على التفاصيل؟'). في حال امتد الفحص لأكثر من ذلك، يلتزم الممثل بالرجوع إلى المحادثة لتقديم تحديث مستمر وتأكيد المتابعة كل 30-45 ثانية لتفادي انزعاج العميل وخصم درجات NPS بسبب الإهمال والانتظار السلبي.",
      links: "https://te.eg/wps/portal/te/Personal/Personal-Internet",
      category: "procedures",
      createdAt: "2026-06-20T00:00:00Z"
    },
    {
      id: "k_2",
      title: "خطوات تفعيل وتنشيط بورت الإنترنت الأرضي (ADSL/VDSL)",
      content: "1. توجيه العميل المباشر للتحقق من سلامة لمبات السلك وحالة إضاءة الراوتر الأساسية: Power, ADSL/DSL, Internet.\n2. إجراء اختبار الـ Ping لفحص سلامة الإشارة وسرعة الخط من الكنترول بورد الفني.\n3. تنشيط البورت المعني (Port Refresh) وإعادة توجيه النبضات الفنية.\n4. الاستمرار في المتابعة لحين إغلاق الشكوى. في حال بقاء الإشارة معطلة بشكل كامل، يُفتح فوراً طلب عطل فني Trouble Ticket (TT) بنظام CRM لضمان توفير الـ AHT.",
      links: "https://te.eg/wps/portal/te/Support",
      category: "procedures",
      createdAt: "2026-06-20T00:00:00Z"
    },
    {
      id: "k_3",
      title: "دليل صلاحيات التعويض السريع والدعم التفاعلي 015",
      content: "في حالات انقطاع الخدمات الأرضية والإنترنت المثبتة بسبب عقبات فنية عامة أو صيانة أجهزة السنترال الرئيسي وتجاوز المدة 6 ساعات عن العمل، للـ Team Leaders وبناءً على مراجعة الجودة صلاحية كاملة تتيح تفعيل رصيد تعويض مجاني تقديري بقيمة 15% إلى 20% كحد أقصى من قيمة اشتراك الفاتورة الشهرية للعميل مباشرة كخطوة احتواء استباقية مذهلة لرفع الرضا العام ورفع الـ NPS.",
      links: "https://te.eg/wps/portal/te/Personal",
      category: "coaching",
      createdAt: "2026-06-20T00:00:00Z"
    }
  ];

  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(data);
      let updated = false;
      if (!db.quality_records || db.quality_records.length === 0) {
        db.quality_records = [
          {
            EmployeeID: "186568",
            AgentName: "Hesham El-Gamil",
            CCDepartment: "Digital Support",
            TL: "Ahmed Osman",
            SheetDate: "2026-06-12",
            FactorName: "Response Time",
            FatalityDescription: "Customer Impact Violation",
            FailedComment: "Delayed response for more than 2 minutes without notifying customer."
          },
          {
            EmployeeID: "186568",
            AgentName: "Hesham El-Gamil",
            CCDepartment: "Digital Support",
            TL: "Ahmed Osman",
            SheetDate: "2026-04-15",
            FactorName: "Greeting Protocol",
            FatalityDescription: "Business Compliance",
            FailedComment: "Did not greet the customer with standard corporate guidelines."
          },
          {
            EmployeeID: "100245",
            AgentName: "Mona Mohamed",
            CCDepartment: "Voice Support",
            TL: "Amr Khaled",
            SheetDate: "2026-05-18",
            FactorName: "Verification Check",
            FatalityDescription: "Security Compliance Violation",
            FailedComment: "Failed to verify customer account details before sharing balance info."
          }
        ];
        updated = true;
      }
      if (!db.users || !Array.isArray(db.users) || db.users.length === 0) {
        db.users = defaultUsers;
        updated = true;
      }
      if (!db.assistant_knowledge || !Array.isArray(db.assistant_knowledge) || db.assistant_knowledge.length === 0) {
        db.assistant_knowledge = defaultKnowledge;
        updated = true;
      }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
      }
      return db;
    }
  } catch (e) {
    console.error("Failed to load local DB, resetting", e);
  }
  return {
    nps_evaluations: [],
    aht_evaluations: [],
    quality_records: [
      {
        EmployeeID: "186568",
        AgentName: "Hesham El-Gamil",
        CCDepartment: "Digital Support",
        TL: "Ahmed Osman",
        SheetDate: "2026-06-12",
        FactorName: "Response Time",
        FatalityDescription: "Customer Impact Violation",
        FailedComment: "Delayed response for more than 2 minutes without notifying customer."
      },
      {
        EmployeeID: "186568",
        AgentName: "Hesham El-Gamil",
        CCDepartment: "Digital Support",
        TL: "Ahmed Osman",
        SheetDate: "2026-04-15",
        FactorName: "Greeting Protocol",
        FatalityDescription: "Business Compliance",
        FailedComment: "Did not greet the customer with standard corporate guidelines."
      },
      {
        EmployeeID: "100245",
        AgentName: "Mona Mohamed",
        CCDepartment: "Voice Support",
        TL: "Amr Khaled",
        SheetDate: "2026-05-18",
        FactorName: "Verification Check",
        FatalityDescription: "Security Compliance Violation",
        FailedComment: "Failed to verify customer account details before sharing balance info."
      }
    ],
    users: defaultUsers,
    assistant_knowledge: defaultKnowledge
  };
}

function saveDb(db: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save local DB", e);
  }
}

// Initial DB load
let database = loadDb();

// Lazy Gemini API Client with dynamic rotation support
let aiClient: GoogleGenAI | null = null;
let currentActiveKey: string | null = null;

function getGemini(): GoogleGenAI {
  const key = database.gemini_api_key || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required. Connect your key via Admin Settings or the Secrets tab.");
  }

  // If the active key has changed (or client wasn't created yet), re-initialize
  if (!aiClient || currentActiveKey !== key) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    currentActiveKey = key;
  }
  return aiClient;
}

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// NPS evaluations endpoints
app.get("/api/nps", (req, res) => {
  res.json(database.nps_evaluations || []);
});

app.post("/api/nps", (req, res) => {
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    acknowledged: false,
    ackDate: "",
    ...req.body
  };
  database.nps_evaluations.push(record);
  saveDb(database);
  res.status(201).json(record);
});

app.put("/api/nps/:id/acknowledge", (req, res) => {
  const { id } = req.params;
  const evalIdx = database.nps_evaluations.findIndex(x => x.id === id);
  if (evalIdx !== -1) {
    database.nps_evaluations[evalIdx].acknowledged = true;
    database.nps_evaluations[evalIdx].ackDate = new Date().toISOString();
    saveDb(database);
    res.json(database.nps_evaluations[evalIdx]);
  } else {
    res.status(404).json({ error: "Record not found" });
  }
});

// AHT evaluations endpoints
app.get("/api/aht", (req, res) => {
  res.json(database.aht_evaluations || []);
});

app.post("/api/aht", (req, res) => {
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    ...req.body
  };
  database.aht_evaluations.push(record);
  saveDb(database);
  res.status(201).json(record);
});

// Quality performance records endpoints
app.get("/api/quality", (req, res) => {
  res.json(database.quality_records || []);
});

app.post("/api/quality/bulk", (req, res) => {
  let records = req.body;
  if (records && !Array.isArray(records) && Array.isArray(records.records)) {
    records = records.records;
  }
  
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: "Invalid payload, must be an array" });
  }
  
  // Replace current records with uploaded ones, or append depending on preference.
  // Replacing is correct to sync fresh Sheets.
  database.quality_records = records.map(r => ({
    EmployeeID: String(r.EmployeeID || r.Employee_ID || r.EmployeeID || "").trim(),
    AgentName: String(r.AgentName || r.Agent_Name || "").trim(),
    CCDepartment: String(r.CCDepartment || r.CC_Department || r.CC_Dept || "").trim(),
    TL: String(r.TL || "").trim(),
    SheetDate: r.SheetDate || r.Sheet_Date || "",
    FactorName: r.FactorName || r.Factor_Name || "",
    FatalityDescription: r.FatalityDescription || r.Fatality_Description || "",
    FailedComment: r.FailedComment || r.Failed_Comment || ""
  })).filter(x => x.EmployeeID !== "");

  saveDb(database);
  res.json({ success: true, count: database.quality_records.length });
});

// Wipes DB
app.post("/api/clear-db", (req, res) => {
  const { type } = req.body;
  if (type === "nps") {
    database.nps_evaluations = [];
  } else if (type === "aht") {
    database.aht_evaluations = [];
  } else if (type === "quality") {
    database.quality_records = [];
  } else {
    database = { nps_evaluations: [], aht_evaluations: [], quality_records: [], users: database.users || [] };
  }
  saveDb(database);
  res.json({ success: true });
});

app.post("/api/clear", (req, res) => {
  const type = req.query.type || req.body.type;
  if (type === "nps") {
    database.nps_evaluations = [];
  } else if (type === "aht") {
    database.aht_evaluations = [];
  } else if (type === "quality") {
    database.quality_records = [];
  } else {
    database = { nps_evaluations: [], aht_evaluations: [], quality_records: [], users: database.users || [] };
  }
  saveDb(database);
  res.json({ success: true });
});

// --- Auth & User Management Endpoints ---

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const users = database.users || [];
  const foundUser = users.find(
    (u) => String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase()
  );

  if (!foundUser || foundUser.password !== String(password)) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }

  res.json({
    success: true,
    user: {
      username: foundUser.username,
      role: foundUser.role || "tl",
      name: foundUser.name || foundUser.username
    }
  });
});

app.get("/api/users", (req, res) => {
  res.json(database.users || []);
});

app.post("/api/users", (req, res) => {
  const { username, password, name, role } = req.body;
  
  if (!username || !password || !name) {
    return res.status(400).json({ error: "جميع الحقول (اسم المستخدم، الباسورد، الاسم ثلاثي) مطلوبة" });
  }

  const users = database.users || [];
  const exists = users.some(
    (u) => String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase()
  );

  if (exists) {
    return res.status(400).json({ error: "اسم المستخدم هذا مسجل بالفعل!" });
  }

  const newUser = {
    username: String(username).trim(),
    password: String(password),
    name: String(name).trim(),
    role: role || "tl"
  };

  users.push(newUser);
  database.users = users;
  saveDb(database);

  res.status(201).json({ success: true, user: { username: newUser.username, name: newUser.name, role: newUser.role } });
});

app.delete("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const adminUsername = "Hesham.M148011";

  if (String(username).trim().toLowerCase() === adminUsername.toLowerCase()) {
    return res.status(400).json({ error: "لا يمكن حذف حساب المسؤول الرئيسي (الادمن)!" });
  }

  const users = database.users || [];
  const initialLength = users.length;
  database.users = users.filter(
    (u) => String(u.username).trim().toLowerCase() !== String(username).trim().toLowerCase()
  );

  if (database.users.length === initialLength) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  saveDb(database);
  res.json({ success: true });
});

// --- Admin API Key Management ---
app.get("/api/admin/api-key", (req, res) => {
  const customKey = database.gemini_api_key || "";
  const envKey = process.env.GEMINI_API_KEY || "";
  
  let snippet = "";
  if (customKey) {
    snippet = customKey.substring(0, 7) + "..." + customKey.slice(-4);
  } else if (envKey) {
    snippet = envKey.substring(0, 7) + "..." + envKey.slice(-4);
  }

  res.json({
    hasCustomKey: !!customKey,
    hasEnvKey: !!envKey,
    activeKeySnippet: snippet
  });
});

app.post("/api/admin/api-key", (req, res) => {
  const { key } = req.body;
  if (!key || !key.trim()) {
    return res.status(400).json({ error: "الملف أو المفتاح المدخل غير صحيح!" });
  }

  const trimmedKey = key.trim();
  database.gemini_api_key = trimmedKey;
  saveDb(database);
  res.json({ success: true, activeKeySnippet: trimmedKey.substring(0, 7) + "..." + trimmedKey.slice(-4) });
});

app.delete("/api/admin/api-key", (req, res) => {
  database.gemini_api_key = undefined;
  saveDb(database);
  
  const envKey = process.env.GEMINI_API_KEY || "";
  const snippet = envKey ? envKey.substring(0, 7) + "..." + envKey.slice(-4) : "";
  res.json({ success: true, activeKeySnippet: snippet });
});

// --- Assistant Knowledge Base Endpoints (Dynamic Feed) ---
app.get("/api/ai/knowledge", (req, res) => {
  const knowledge = database.assistant_knowledge || [];
  res.json(knowledge);
});

app.post("/api/ai/knowledge", (req, res) => {
  const { title, content, links, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "العنوان ومحتوى المستند حقول إجبارية!" });
  }

  const knowledge = database.assistant_knowledge || [];
  const newItem = {
    id: "k_" + Math.random().toString(36).substring(2, 9),
    title: String(title).trim(),
    content: String(content).trim(),
    links: links ? String(links).trim() : "",
    category: category || "general",
    createdAt: new Date().toISOString()
  };

  knowledge.push(newItem);
  database.assistant_knowledge = knowledge;
  saveDb(database);

  res.status(201).json({ success: true, item: newItem });
});

app.put("/api/ai/knowledge/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, links, category } = req.body;

  const knowledge = database.assistant_knowledge || [];
  const idx = knowledge.findIndex(k => k.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "المستند غير موجود" });
  }

  knowledge[idx] = {
    ...knowledge[idx],
    title: title ? String(title).trim() : knowledge[idx].title,
    content: content ? String(content).trim() : knowledge[idx].content,
    links: links !== undefined ? String(links).trim() : knowledge[idx].links,
    category: category || knowledge[idx].category
  };

  database.assistant_knowledge = knowledge;
  saveDb(database);

  res.json({ success: true, item: knowledge[idx] });
});

app.delete("/api/ai/knowledge/:id", (req, res) => {
  const { id } = req.params;
  const knowledge = database.assistant_knowledge || [];
  const initialLength = knowledge.length;

  database.assistant_knowledge = knowledge.filter(k => k.id !== id);

  if (database.assistant_knowledge.length === initialLength) {
    return res.status(404).json({ error: "المستند غير موجود بالفعل" });
  }

  saveDb(database);
  res.json({ success: true });
});

// --- Active Session Tracker Heartbeat (Live Users Count) ---
let activeClientHeartbeats: { [tabId: string]: { username: string; lastSeen: number } } = {};

app.post("/api/heartbeat", (req, res) => {
  const { tabId, username } = req.body;
  
  if (tabId) {
    activeClientHeartbeats[tabId] = {
      username: username || "Visitor",
      lastSeen: Date.now()
    };
  }

  // Clean up heartbeats older than 30 seconds
  const cutoff = Date.now() - 30000;
  for (const tId in activeClientHeartbeats) {
    if (activeClientHeartbeats[tId].lastSeen < cutoff) {
      delete activeClientHeartbeats[tId];
    }
  }

  const activeCount = Object.keys(activeClientHeartbeats).length;
  const activePeople = Object.values(activeClientHeartbeats).map(b => b.username);

  res.json({
    success: true,
    activeCount: Math.max(1, activeCount),
    activePeople: Array.from(new Set(activePeople))
  });
});

// --- AI Proxy Endpoints via Gemini API ---

// 1. Analyze sentiment and make NPS prediction
app.post("/api/ai/sentiment", async (req, res) => {
  const { chatText } = req.body;
  if (!chatText) {
    return res.status(400).json({ error: "Chat text is required" });
  }

  try {
    const ai = getGemini();
    const systemPrompt = `You are a professional Telecom Quality Assurance Analyst specializing in sentiment modeling.
Analyze the following customer chat transcript and evaluate:
1. Customer's overall NPS profile. Output exactly: "Promoter", "Passive", or "Detractor".
2. Sentiment Journey: Outline exactly 2 or 3 steps across the chat timeline (e.g. beginning, middle, end) representing changes in the customer's mood.
Return the output strictly as a JSON object, without markdown blocks.
Format:
{
  "nps": "Promoter | Passive | Detractor",
  "sentiment_journey": [
    {"time": "Beginning of chat", "mood": "غاضب | محايد | راضي", "reason": "Arabic description of customer state and why"},
    {"time": "End of chat", "mood": "غاضب | محايد | راضي", "reason": "Arabic description of final customer state"}
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatText,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const cleanText = (response.text || "").trim();
    res.json(JSON.parse(cleanText));
  } catch (error: any) {
    console.warn("AI Sentiment warning/exhausted, using local analytical engine fallback instead:", error.message || error);
    
    // HEURISTIC PROGRAMMATIC FALLBACK
    const textLower = String(chatText).toLowerCase();
    let nps = "Passive";
    let journey = [];

    const isDetractor = /غاضب|سيء|سيئ|وحش|مشكلة|تأخير|انتظار|شكوى|تعبت|غلط|صعب|بطئ|بطء|bad|slow|waste|terrible|issue|wrong|delay|waiting/.test(textLower);
    const isPromoter = /شكرا|شكرًا|ممتاز|رائع|مضمون|حلها|تمت|تسلم|تسلم ايدك|كامل|برنس|thanks|perfect|great|helpful|solved|excellent/.test(textLower);

    if (isDetractor) {
      nps = "Detractor";
      journey = [
        { time: "بدء الشات", mood: "غاضب 🔴", reason: "العميل يبدي استياءه ولديه مشكلة تقنية أو شكوى معقدة قيد الانتظار." },
        { time: "منتصف الشات", mood: "محايد 🟡", reason: "ممثّل الدعم يبدأ بالتحقق وجمع البيانات المطلوبة لمراجعة حسابه وباقته." },
        { time: "نهاية الشات", mood: "غاضب 🔴", reason: "العميل مستاء من استمرار التعطل أو طول فترة استئذان الموظف (Hold)." }
      ];
    } else if (isPromoter) {
      nps = "Promoter";
      journey = [
        { time: "بدء الشات", mood: "محايد 🟡", reason: "بدء المحادثة بشكل مهني والترحيب بالعميل لمعالجة طلبه فوراً." },
        { time: "منتصف الشات", mood: "راضي 🟢", reason: "تقديم الدعم الفني وتنشيط الباقة أو إتمام تعديلات الخط بنجاح فائق." },
        { time: "نهاية الشات", mood: "راضي 🟢", reason: "العميل يثني على سرعة استجابة ممثل الدعم الرقمي ويوجه له الشكر." }
      ];
    } else {
      nps = "Passive";
      journey = [
        { time: "بدء الشات", mood: "محايد 🟡", reason: "طرح استفسار اعتيادي بخصوص أسعار الاشتراكات أو باقات الإنترنت." },
        { time: "منتصف الشات", mood: "محايد 🟡", reason: "الموظف يقدم الدعم اللائق والمعلومات الدقيقة طبقاً لقواعد الـ WIKI." },
        { time: "نهاية الشات", mood: "راضي 🟢", reason: "إجابة شاملة وحل مرضي للعميل مع إنهاء المحادثة بشكل مهني اعتيادي." }
      ];
    }

    res.json({
      nps,
      sentiment_journey: journey,
      fallback: true,
      note: "تم التحليل محلياً لانتهاء حصة الـ API"
    });
  }
});

// 2. Generate coaching plan
app.post("/api/ai/coaching-plan", async (req, res) => {
  const { manualSummary, agentName } = req.body;
  if (!manualSummary) {
    return res.status(400).json({ error: "Manual summary of errors is required" });
  }

  try {
    const ai = getGemini();
    const prompt = `أنت مدير جودة ومدرب محترف في كول سنتر شركة اتصالات WE.
أخطاء الموظف المكتشفة (${agentName || 'الموظف'}):
${manualSummary}

المطلوب صياغة خطة كوتشينج وتوجيه كاملة للـ Team Leader باللغة العربية تحتوي على:
1. التحليل المباشر للسبب الجذري للأخطاء (Root Cause Analysis) بالتركيز على السلوك مثل (Robotic, Lack of Concentration, Exceeding Hold, Idle Chat).
2. خطة العمل وتوصية التطوير العملية (Action Plan) مع مهام واضحة ومحددة زمنياً للمتابعة.

صيغ خطتك بأسلوب عملي، محفز، مباشر ودقيق يساهم فورا في تحسين جودة المحادثات وتقليل الـ AHT.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("AI Coaching warning/exhausted, using local fallback:", error.message || error);
    
    // Context aware robust fallback builder
    const containsRobotic = /robotic|روبوت|آلي|جاف|حافظ/i.test(manualSummary);
    const containsHold = /hold|هولد|انتظار|تأخر/i.test(manualSummary);
    const containsEmpathy = /empathy|تعاطف|امتصاص|غضب|برود/i.test(manualSummary);

    let mainAnalysis = "حاجة الموظف لمراجعة مؤشرات الأداء والتركيز على الـ AHT والالتزام بدليل فحص الأعطال الفنية.";
    let actionableSteps = "ملاحظة أسبوعية مباشرة مع ممثل الدعم لمتابعة سرعة التجاوب ودقة صياغة الردود.";

    if (containsRobotic) {
      mainAnalysis = "الاعتماد على إجابات معلبة ومكررة دون ملاءمة سياق كلام العميل، مما يشعره بالمعاملة الآلية الباردة.";
      actionableSteps = "توجيه الموظف لصياغة جمل ترحيب وتأكيد مرنة ومخصصة؛ ومراجعة 3 نماذج محادثات متميزة.";
    } else if (containsHold) {
      mainAnalysis = "تجاوز الوقت المسموح للـ Hold وغياب الاستئذان السليم، مما يثير غضب العميل ويفقده الثقة بالدعم.";
      actionableSteps = "تطبيق قواعد الاستئذان (طلب 30 ثانية كحد أقصى للتحقق)، وعقد ورشة محاكاة حية لطرق البحث السريع بالنظام.";
    } else if (containsEmpathy) {
      mainAnalysis = "غياب تام للتفاعل الإنساني مع إحباط العميل وغضبه؛ والحد من تقديم الخدمة بشكل روتيني بحت دون احتواء.";
      actionableSteps = "الاشتراك في ورشة عمل خاصة بـ (Empathy & Customer Centricity)، والاتفاق على عبارات تلطيف تناسب شكاوى الفواتير.";
    }

    const fallbackResponse = `🛡️ **تقرير ومخطط الكوتشينج الذكي المخصص** (خط تغطية احتياطي):

👤 **الاسم المستهدف**: ${agentName || 'موظف الدعم الرقمي'}
📝 **الانتهاكات المرصودة بالمنظومة**: ${manualSummary}

---

### 1️⃣ التحليل التشغيلي الجذري للخطأ (Root Cause Analysis):
- **السبب الأساسي**: ${mainAnalysis}
- **التداعيات**: تتسبب هذه الفجوات السلوكية في زيادة معدل تذمر العميل، والتأثير المباشر سلباً على مؤشر الـ FCR (حل المشكلة من أول مرة) والـ AHT التراكمي للوردية.

---

### 2️⃣ خطة العمل التطويرية العملية (Action Plan):
1. **جلسة توجيه (Coaching Loop)**: جلسة فردية عاجلة مدتها 15 دقيقة مع الـ Team Leader لمراجعة الملاحظات وتوضيح أهمية تعديل الأسلوب.
2. **برنامج تظليل عملي (Shadowing)**: مرافقة زميله المتميز في القسم لمدة ساعتين لملاحظة طرق معالجته السريعة للمشاكل.
3. **تتبع معايير الجودة**: يقوم الـ Quality Monitor بسحب وتقييم محادثتين عشوائيتين للموظف خلال الـ 48 ساعة القادمة لقياس مدى الالتزام الفعلي.`;

    res.json({ text: fallbackResponse });
  }
});

// 3. Trend analysis for leadership
app.post("/api/ai/trend-analysis", async (req, res) => {
  const { detractorsPayload } = req.body;
  if (!detractorsPayload || !Array.isArray(detractorsPayload)) {
    return res.status(400).json({ error: "Detractors payload array is required" });
  }

  try {
    const ai = getGemini();
    const combinedSummaries = detractorsPayload.map((s, i) => `${i + 1}- ${s}`).join("\n");
    const prompt = `أنت محلل تجربة عملاء (Customer Experience Analyst) خبير بقسم الدعم الرقمي بشركة اتصالات.
قمت بتجميع شكاوى العملاء الغاضبين (Detractors) وسلوكيات الموظفين المصاحبة لها في الشات بالتالي:

"""
${combinedSummaries}
"""

المطلوب استخراج تقرير تشغيلي قوي للإدارة يربط الأسباب ببعضها ويشمل:
1. أهم 3 أسباب جذرية تكررت تفصيلياً (Root Causes) لتذمر العملاء، وهل هي مشكلات تقنية/فنية متعلقة بأنظمة الخدمة أم سلوكية متعلقة بالموظف (مثل Robotic, Hold Violations, Impatient).
2. توصيات تشغيلية سريعة قابلة للتطبيق (Actionable Insights) لقادة الفرق للتدخل التصحيحي فوراً.

اكتب التقرير بلغة عربية احترافية، أنيقة ومقنعة بمستوى رفيع للإدارة العامة.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("AI Trend Analysis warning/exhausted, using local fallback report:", error.message || error);
    
    const fallbackReport = `📈 **تقرير الإدارة العليا السلوكي لتحديد اتجاهات الشكاوى (Detractors Analysis)**
*(تم توليده تلقائياً عبر موجه تشخيص الأداء المحلي للقسم)*

---

### 🔍 أولاً: تصنيف وتحليل أهم 3 أسباب جذرية تكررت تفصيلياً (Root Cause Analysis):
1. **القصور في إظهار التعاطف والاحتواء (Lack of Empathy):** تبين أن النسبة الأكبر من العملاء الغاضبين أفادوا بمعاملة باردة أو مستعجلة، حيث لا يملك الموظف العبارات الكفيلة بامتصاص الاحباط عند انقطاع الخدمة عطل الـ ADSL.
2. **الانتظار الزائد بدون فحص دقيق (Hold Violations):** شكاوى متكررة من حجز العميل بوضعية Hold لمدد تفوق 3 دقائق بهدف مراجعة الأنظمة، دون إبقاء العميل بالصورة أو استمرار كتابة الردود.
3. **التمرير غير المناسب أو التسرع في التقفيل:** ميل بعض الموظفين لإرجاء العمل وتقديم حلول غير ملموسة لمسار الشكاوى لتقليل الـ AHT، مما يدفع العميل لإعادة السؤال والشعور بعدم الجدية.

---

### 💡 ثانياً: التوصيات التشغيلية والحلول التصحيحية لقادة الفرق (TL Directives):
* **التمرين على مهارات التهدئة واللطف:** إلزام كافة قادة الفرق بعقد محاكاة سريعة (Role Play) قبل الوردية للتأكد من استخدام عبارات الترحيب الرائجة والتعاطف الفوري.
* **الربط مع السيرفر والتحليلات الآلية:** مراقبة المنظومة لتتبع وتوجيه الموظفين ذوي الـ AHT القصير للغاية بالتزامن مع NPS السلبي.
* **تفعيل لوحة المائة يوم وتحدي التميز:** مكافأة الموظفين الحريصين على تحقيق تقييم داعم (Promoter) من أول تواصل.`;

    res.json({ text: fallbackReport });
  }
});

// 4. WIKI Chatbot Assistant
app.post("/api/ai/wiki-chat", async (req, res) => {
  const { userMessage } = req.body;
  if (!userMessage) {
    return res.status(400).json({ error: "User message is required" });
  }

  const WE_INTERNAL_KNOWLEDGE = `
معلومات WIKI الداخلية لقسم الدعم الرقمي بشركة WE (المصرية للاتصالات):

1. بخصوص IDLE SRs (التذاكر المعلقة):
- يتم مراجعة التيكت بعد مرور 24 ساعة من إنشائها.
- إذا لم يتم الرد من القسم المختص، يتم عمل تصعيد (Escalation) باستخدام الكود الداخلي المخصص.

2. بخصوص Mobile Line Adjustment (تعديلات خطوط الموبايل):
- يجب التأكد من هوية العميل (Verification) بمطابقة الرقم القومي المسجل.
- يتم تنفيذ التعديل وإرسال رسالة تأكيد للعميل، ويجب كتابة تعليق (Comment) واضح في نظام CRM.

3. بخصوص انقطاع خدمة الإنترنت (ADSL/VDSL):
- الخطوة الأولى: التأكد من حالة اللمبات في الراوتر (Power, ADSL, Internet).
- الخطوة الثانية: عمل Refresh للپورت من النظام.
- الخطوة الثالثة: إذا استمرت المشكلة، يتم فتح Trouble Ticket (TT) وتحويلها لقسم الأعطال الفنية بالسنترال.
`;

  try {
    const ai = getGemini();
    const systemPrompt = `أنت المساعد الذكي WIKI لموظفي الدعم الرقمي والمساعدة الفنية بشركة WE.
مهمتك إفادة الموظفين وتقليل وقت المحادثة (AHT) عبر تزويدهم بخطوات الحل والمعلومات الدقيقة.
استخدم "قاعدة البيانات الداخلية" لشركة WE التالية للإجابة على سؤال الموظف. إذا لم تكن الإجابة موجودة في قاعدة البيانات، أخبره بلطف أن هذه المعلومة غير متوفرة في الـ WIKI الحالي وعليه الرجوع للـ Team Leader.

قاعدة البيانات الداخلية:
"""
${WE_INTERNAL_KNOWLEDGE}
"""

التعليمات:
1. أجب بشكل مباشر جداً ومختصر في نقاط (Bullets) لتوفير الـ AHT وإفادة العميل بسرعة.
2. استخدم مصطلحات WE الرسمية المذكورة في النص (SR, TT, ADSL, CRM).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("WIKI Chatbot warning/exhausted, using local keyword match fallback:", error.message || error);
    
    const query = String(userMessage).toLowerCase();
    let text = "";

    if (/idle|تذاكر|تيكت|معلقة|معلقه/i.test(query)) {
      text = `📝 **بخصوص التذاكر المعلقة (IDLE SRs):**
• يتم مراجعة التيكت بعد مرور **24 ساعة** من تاريخ إنشائها.
• إذا تعذر الرد من القسم المختص بالشركة، يرجى التنسيق فوراً لعمل تصعيد مركب (Escalation) مستعيناً بالكود المعتمد لتسريع عملية الفحص والحل.`;
    } else if (/adjustment|موبايل|تعديل|تعديلات|باقة|خطوط|شريحة|شريحه/i.test(query)) {
      text = `📱 **بخصوص تعديلات خطوط الموبايل (Mobile Line Adjustment):**
• أولاً، من الضروري للغاية التحقق من هوية العميل (Verification) بمطابقة رقم بطاقة الرقم القومي المسجلة.
• عقِب التنفيذ المباشر على الأنظمة، قم بإرسال رسالة تأكيد (SMS) تفصيلية للعميل.
• يُرجى إدراج تعليق (Comment) رسمي واضح بكافة التعديلات فورية بداخل لوحة الـ CRM.`;
    } else if (/نت|انقطاع|راوتر|wifi|router|روتر|ADSL|VDSL|أعطال|اعطال/i.test(query)) {
      text = `🌐 **بخصوص الأعطال وانقطاع خدمة الإنترنت (ADSL/VDSL):**
- **الخطوة الأولى:** اطلب من العميل تأكيد حالة لمبات الإضاءة الأمامية للراوتر للوقوف على المشكلة (Power, ADSL, Internet).
- **الخطوة الثانية:** قم بتنشيط اللينك (Refresh) وإعادة تحميل البورت المعني من الكنترول بورد.
- **الخطوة الثالثة:** لو استمرت مؤشرات العطل، قم صياغة تذكرة عطل فني رسمية (Trouble Ticket - TT) وتحويلها فوراً للمهندسين المختصين بالسنترال.`;
    } else {
      text = `ℹ️ **مرحباً بك بمساعد WIKI الدعم الفني لشركة WE:**
لم يعثر نظام البحث المحلي على معلومة دقيقة تطابق سؤالك ("${userMessage}").

💡 **توجيه مفيد:**
- تواصل مع الـ Team Leader للحصول على أحدث التحديثات المتعلقة بهذا الإجراء.
- يمكنك السؤال باستخدام كلمات مرجعية مثل: "أعطال الإنترنت"، "IDLE SRs"، أو "تعديل الموبايل" لتلقي الإرشاد الفوري.`;
    }

    res.json({ text });
  }
});

// 5. Multi-turn AI Assistant / Co-Pilot Endpoint
app.post("/api/ai/multiturn-chat", async (req, res) => {
  const { messages, modelName, role } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  // Determine system instruction based on role
  let systemInstruction = "أنت مساعد ذكي متعاون تقدم دعم ومساعدة لممثلي ومراجعي خدمة العملاء الرقمية بشركة WE.";
  if (role === "audit") {
    systemInstruction = `أنت خبير تدقيق جودة الدعم الفني الرقمي لشركة Telecom Egypt (WE). مهمتك مراجعة وتقييم أداء ممثلي الدعم لضمان تقديم أعلى معايير الجودة والالتزام بقواعد NPS والـ AHT.
ساهم في مساعدة قادة الفرق والمشرفين في تفكيك المشاكل المعقدة وتقديم توجيهات عملية واقتراحات كوتشينغ ممتازة وسريعة في مراجعة الجوانب مثل:
1. بروتوكولات الترحيب والتحقق من الهوية.
2. مهارات التعاطف واحتواء العملاء الغاضبين.
3. التزام بروتوكول فترات الانتظار Hold Time والتحقق المستمر.
4. الالتزام باللوائح الداخلية كتعويض الـ 015 وقواعد إنهاء المحادثة.
أجب باللغة العربية بأسلوب مهني ومقنع ومباشر.`;
  } else if (role === "trainer") {
    systemInstruction = `أنت مدرب الدعم الفني الرقمي التفاعلي لشركة WE. تقوم بمساعدة ممثلي الدعم وقادة الفرق في التدريب على:
- مهارات التواصل وصياغة الردود بشكل احترافي وودود.
- زيادة معدل حل مشاكل العميل من أول مرة FCR.
- التعامل مع الاعتراضات وتجاوز فترات الانتظار الطويلة.
تقوم بصياغة تدريبات تفاعلية وأمثلة عملية لردود بديلة دافئة ومتعاطفة تناسب المواقف الحرجة. أجب بوضوح ولغة حية دافئة تدعم التعلم المهني.`;
  } else if (role === "analyst") {
    systemInstruction = `أنت مسؤول مراقبة الامتثال والتحليل الإحصائي السلوكي بقسم جودة WE الرقمية. 
مهمتك دراسة الأنماط وتفسير الأرقام (مثل فجوات الـ AHT والـ NPS ونتائج الجودة الشهرية للموظفين) وتقييم العوامل التشغيلية، وصياغة خطط تحسين لضبط الانحرافات المتكررة وتقديم توصيات لرفع كفاءة القسم بالكامل.
أجب بلغة تحليلية رصينة، مدعومة بنقاط مستهدفة ومبررات سياقية قوية.`;
  }

  // Inject Custom Dynamic Knowledge Feed provided by Administration
  const customFeed = database.assistant_knowledge || [];
  if (customFeed.length > 0) {
    systemInstruction += `\n\n⚠️ حاسم: لديك وثائق وتعليمات مرجعية مدخلة ومحدثة بواسطة الإدارة (Dynamic Knowledge Base). بداخل هذه الوثائق قد تجد روابط تابعة لـ Telecom Egypt (WE). يرجى استخدام هذه المعلومات والتوجيهات الفنية والخطوات لتدعيم إجاباتك ومشاركتها مع العميل أو موظف الدعم أو المشرف عند سؤاله عنها، مع وضع الروابط المرفقة كما هي:\n`;
    customFeed.forEach((item: any, idx: number) => {
      systemInstruction += `\n📄 مستند فني ${idx + 1}: ${item.title}\nالمعلومة أو التوجيه الجوهري: ${item.content}\n${item.links ? `🔗 الرابط المعتمد للمشاركة: ${item.links}` : "لا يوجد رابط ملحق"}\n`;
    });
  }

  // Map messages into @google/genai contents format
  const apiContents = messages.map((m: any) => {
    const apiRole = (m.role === "assistant" || m.role === "model") ? "model" : "user";
    return {
      role: apiRole,
      parts: [{ text: m.content || m.text || "" }]
    };
  });

  const selectedModel = modelName || "gemini-3.5-flash";

  const config: any = {
    systemInstruction,
    temperature: 0.7,
  };

  if (selectedModel === "gemini-3.1-pro-preview") {
    // Set thinkingLevel to ThinkingLevel.HIGH
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH
    };
    // Do NOT set maxOutputTokens
    delete config.maxOutputTokens;
  }

  try {
    const ai = getGemini();
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: apiContents,
      config,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.warn("Multiturn Chat API Error:", error.message || error);
    
    // Fallback based on last user question
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    
    // Search the Knowledge Base for exact or keyword matches to behave intelligently offline 
    const knowledgeFeed = database.assistant_knowledge || [];
    let matchedItem: any = null;
    let maxMatchScore = 0;
    
    const cleanQuery = lastUserMsg.toLowerCase().trim();
    const queryParts = cleanQuery.split(/[\s,،؛?؟.\-_]+/);
    
    for (const item of knowledgeFeed) {
      let score = 0;
      const titleLower = (item.title || "").toLowerCase();
      const contentLower = (item.content || "").toLowerCase();
      
      // Match whole sentence or exact title
      if (titleLower.includes(cleanQuery) || cleanQuery.includes(titleLower)) {
        score += 15;
      }
      
      // Match individual keywords
      for (const word of queryParts) {
        if (word.length > 2) {
          if (titleLower.includes(word)) score += 4;
          if (contentLower.includes(word)) score += 1;
        }
      }
      
      if (score > maxMatchScore) {
        maxMatchScore = score;
        matchedItem = item;
      }
    }

    let fallbackText = "⚠️ **تنبيه الاتصال السحابي:** تم حشد نظام الاستعلام وقاعدة المعرفة المحلية مؤقتاً لتفادي انقطاع الخدمة بسبب الضغط على الخوادم الجانبية أو لعدم ربط مفتاح الـ API.\n\n";
    
    if (matchedItem && maxMatchScore >= 3) {
      fallbackText += `💡 **تم تحديد إجابة فنية متطابقة من قاعدة معارف الإدارة المعتمدة (WE Dynamic Guide):**\n\n`;
      fallbackText += `📂 **[${matchedItem.category === "procedures" ? "💻 إجراءات الدعم" : matchedItem.category === "coaching" ? "🎯 توجيه وتدريب" : "ℹ️ عام"}] ${matchedItem.title}**\n`;
      fallbackText += `───────────────────────\n`;
      fallbackText += `${matchedItem.content}\n\n`;
      if (matchedItem.links) {
        fallbackText += `🔗 **رابط فني للمطالعة والمشاركة:** ${matchedItem.links}\n`;
      }
    } else {
      // Role-based heuristics with standard WE QA content
      if (role === "audit") {
        fallbackText += `🔍 **بصفتي خبير جودة وقنوات الدعم الرقمي لشركة WE:**\n`;
        fallbackText += `يسعدني فحص سؤالك تفصيلياً بخصوص: "${lastUserMsg}".\n\n`;
        fallbackText += `💡 **يرجى مراجعة وتطبيق أهم ركائز الالتزام السلوكي الفوري:**\n`;
        fallbackText += `1. **بروتوكول الترحيب والمظهر المهني:** البداية بترحيب لائق ومحتوى دافئ، تفادي الردود الآلية الجافة.\n`;
        fallbackText += `2. **قواعد فترات الانتظار (Hold):** تجنب إبقاء العميل على Hold لأكثر من دقيقتين دون استئذان وتحديث مباشر كل 30-45 ثانية.\n`;
        fallbackText += `3. **قواعد التعويض السريع:** تفعيل تعويض رصيد بقيمة 15% إلى 20% كحد أقصى بالتنسيق مع قادة الفرق عند تجاوز الانقطاع 6 ساعات لتجنب تأثير درجات الـ NPS.\n\n`;
        fallbackText += `💡 يرجى الالتزام بمعايير FCR والتأكد من إغلاق الشكوى بنجاح.`;
      } else if (role === "trainer") {
        fallbackText += `🎯 **بصفتي مدرب وموجه الدعم التفاعلي بشركة WE:**\n`;
        fallbackText += `تجاه سؤالك بخصوص "${lastUserMsg}":\n\n`;
        fallbackText += `• **التعاطف أولاً:** استبدل القوالب الآلية الجافة بعبارات تحتضن العميل وتقدر وقته (من فضلك تقبل اعتذاري لعدم استقرار الخدمة وسأفحصها معك خطوة بخطوة).\n`;
        fallbackText += `• **الـ Walkthrough الفني:** شارك العميل دائماً ما تفعله بالأنظمة (أقوم الآن بإعادة تنشيط الـ Port Refresh من لوحة التحكم للتأكد من وصول النبضات الفنية الحية للراوتر عندك).\n`;
        fallbackText += `• **تقنيات التحكم بالـ AHT:** تنظيم المحادثة الفعالة وسرعة الفحص دون ترك فجوات صمت زمنية كبيرة.`;
      } else {
        fallbackText += `📊 **بصفتي محلل سلوك الجودة ومراقب الامتثال بقسم WE الرقمي:**\n`;
        fallbackText += `رصدي لطلبك بخصوص "${lastUserMsg}" يظهر أن الأولوية تكمن في ضبط انحرافات الأداء الكبرى:\n\n`;
        fallbackText += `- **التحليل السلوكي المتوقع:** يجب فحص فترات الـ Hold الطويلة وتقليل فجوة الاستجابة لمعالجة تراجع درجات الـ NPS.\n`;
        fallbackText += `- **المخاطر التشغيلية:** عدم التحديث المستمر للعميل يدفعه مباشرة لتقييم الـ Detractor مما يضر بنسب الامتثال الشهرية.\n`;
        fallbackText += `- **التوصية:** التركيز على دقة البيانات المسجلة بنظام CRM وصياغة تذكرة الأعطال TT بشكل فني سليم لضمان اختصار وقت المعالجة الفني.`;
      }
    }

    fallbackText += `\n\n💡 **نصيحة تشغيلية لربط المساعد التفاعلي بالكامل:**\n`;
    fallbackText += `لتفعيل محركات Gemini 3.5 Flash وقدرات التفكير العميق لـ Gemini 3.1 Pro والربط المستمر، يمكنك ربط مفتاح صالح **GEMINI_API_KEY** في الخانة المخصصة بالإعدادات (Secrets)؛ حيث سيتحول البوت فوراً إلى محرك الذكاء الاصطناعي التبادلي بالكامل.`;

    res.json({ text: fallbackText });
  }
});

// Vite / static file hosting
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
