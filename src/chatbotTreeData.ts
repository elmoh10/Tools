/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatbotTreeItem {
  id: string;
  mainCaseAr: string;
  mainCaseEn: string;
  subCaseAr: string;
  subCaseEn: string;
  scriptAr: string;
  scriptEn: string;
  keywords: string[]; // Keywords to auto-detect this case in customer messages
  triggerPhrases: string[]; // Key parts of the script to detect if the agent sent it
}

export const CHATBOT_TREE_DATA: ChatbotTreeItem[] = [
  {
    id: 'current_plan',
    mainCaseAr: 'النظام والاستهلاك',
    mainCaseEn: 'package and consumption',
    subCaseAr: 'النظام الحالي',
    subCaseEn: 'package',
    scriptAr: 'حضرتك ممكن تعرف نظامك الحالي في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة نظامك الحالي واستهلاكك)',
    scriptEn: 'You can know your current plan in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet then Click on Know your package and consumption',
    keywords: ['نظامي', 'النظام الحالي', 'ايه نظامي', 'باقتي الحالية', 'خطة الأسعار', 'نظام الباقة', 'current plan', 'my plan', 'my package', 'what system'],
    triggerPhrases: ['نظامك الحالي', 'المساعد الذكي', 'معرفة نظامك الحالي', 'Know your package', 'current plan']
  },
  {
    id: 'consumption',
    mainCaseAr: 'النظام والاستهلاك',
    mainCaseEn: 'package and consumption',
    subCaseAr: 'الاستهلاك',
    subCaseEn: 'consumption',
    scriptAr: 'حضرتك ممكن تعرف إستهلاكك في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة نظامك الحالي واستهلاكك)',
    scriptEn: 'You can check the consumption in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your package and consumption',
    keywords: ['استهلاكك', 'الاستهلاك', 'استهلاك', 'جيجا باقية', 'فاضل كام جيجا', 'كام جيجا', 'consumption', 'consumed', 'how many Giga', 'usage'],
    triggerPhrases: ['إستهلاكك', 'المساعد الذكي', 'معرفة نظامك الحالي', 'Know your package', 'consumption']
  },
  {
    id: 'remaining_quota',
    mainCaseAr: 'النظام والاستهلاك',
    mainCaseEn: 'package and consumption',
    subCaseAr: 'سعة الاستخدام المتبقية',
    subCaseEn: 'remaining quota',
    scriptAr: 'حضرتك ممكن تعرف سعة الاستخدام المتبقية في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة نظامك الحالي واستهلاكك)',
    scriptEn: 'You can check the remaining quota in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your package and consumption',
    keywords: ['السعة المتبقية', 'المتبقي من الباقة', 'سعة الاستخدام', 'المتبقية', 'باقي كام جيجا', 'remaining quota', 'leftover gigas', 'remaining capacity'],
    triggerPhrases: ['سعة الاستخدام المتبقية', 'المساعد الذكي', 'معرفة نظامك الحالي', 'remaining quota']
  },
  {
    id: 'renewal_date',
    mainCaseAr: 'النظام والاستهلاك',
    mainCaseEn: 'package and consumption',
    subCaseAr: 'تاريخ التجديد',
    subCaseEn: 'renewal date',
    scriptAr: 'حضرتك ممكن تعرف تاريخ التجديد في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة نظامك الحالي واستهلاكك)',
    scriptEn: 'You can know the renewal date in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet then Click on Know your package and consumption',
    keywords: ['تاريخ التجديد', 'ميعاد التجديد', 'الباقة هتتجدد', 'امتى التجديد', 'تجديد الباقة امتى', 'renewal date', 'renew date', 'when to renew'],
    triggerPhrases: ['تاريخ التجديد', 'المساعد الذكي', 'معرفة نظامك الحالي', 'renewal date']
  },
  {
    id: 'balance',
    mainCaseAr: 'خدمات الشحن والرصيد',
    mainCaseEn: 'Recharge and Balance Services',
    subCaseAr: 'معرفة الرصيد',
    subCaseEn: 'balance',
    scriptAr: 'حضرتك ممكن تعرف رصيدك في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة رصيدك)',
    scriptEn: 'You can check the current balance in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your balance',
    keywords: ['الرصيد', 'رصيدي', 'عندي رصيد كام', 'فلوس بالخط', 'رصيد كام', 'balance', 'credit', 'how much money', 'my balance'],
    triggerPhrases: ['تعرف رصيدك', 'المساعد الذكي', 'معرفة رصيدك', 'Know your balance', 'balance']
  },
  {
    id: 'subscription_fees',
    mainCaseAr: 'خدمات الشحن والرصيد',
    mainCaseEn: 'Recharge and Balance Services',
    subCaseAr: 'قيمة الإشتراك',
    subCaseEn: 'subscription fees',
    scriptAr: 'حضرتك ممكن تعرف قيمة الاشتراك في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة رصيدك)',
    scriptEn: 'You can check the package subscription fees in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your balance',
    keywords: ['قيمة الاشتراك', 'الاشتراك كام', 'اشتراك الباقة', 'سعر الباقة', 'subscription fees', 'subscription cost', 'plan price', 'package cost'],
    triggerPhrases: ['قيمة الاشتراك', 'المساعد الذكي', 'معرفة رصيدك', 'subscription fees']
  },
  {
    id: 'recharge_methods',
    mainCaseAr: 'خدمات الشحن والرصيد',
    mainCaseEn: 'Recharge and Balance Services',
    subCaseAr: 'شحن الرصيد ومعرفة طرق شحن',
    subCaseEn: 'recharge the balance and recharge methods',
    scriptAr: 'حضرتك ممكن تشحن الرصيد من خلال حسابك علي تطبيق MY WE او موقعنا www.te.eg او من خلال تطبيق We Pay و فروع WE و خدمات الدفع من فوري، مصاري، أمان، سداد، بي، ممكن، خدماتي.',
    scriptEn: 'You can recharge your line through MY WE APP, or our website my.te.eg, WE PAY APP, Fawry, Masary, Aman, Sadad, Momken, Bee, Khadamaty, and all WE Stores.',
    keywords: ['طرق الشحن', 'اشحن ازاي', 'سداد الرصيد', 'اشحن كارت', 'عايز اشحن', 'طريقة الشحن', 'recharge', 'how to recharge', 'recharge methods', 'pay balance'],
    triggerPhrases: ['تشحن الرصيد', 'We Pay', 'فوري', 'مصاري', 'أمان', 'سداد', 'Recharge your line', 'my.te.eg']
  },
  {
    id: 'pay_bill',
    mainCaseAr: 'خدمات الشحن والرصيد',
    mainCaseEn: 'Recharge and Balance Services',
    subCaseAr: 'دفع الفاتورة / postpaid',
    subCaseEn: 'pay the bill / postpaid',
    scriptAr: 'حضرتك ممكن تدفع الفاتورة من خلال حسابك علي تطبيق MY WE او موقعنا www.te.eg او من خلال تطبيق We Pay و فروع WE و خدمات الدفع من فوري، مصاري، أمان، سداد، بي، ممكن، خدماتي.',
    scriptEn: 'You can pay your bill through MY WE APP, or our website my.te.eg, WE PAY APP, Fawry, Masary, Aman, Sadad, Momken, Bee, Khadamaty, and all WE Stores.',
    keywords: ['الفاتورة', 'دفع الفاتورة', 'الفواتير', 'ادفع فاتورة', 'pay bill', 'bill payment', 'postpaid bill', 'invoices'],
    triggerPhrases: ['تدفع الفاتورة', 'We Pay', 'فوري', 'مصاري', 'أمان', 'سداد', 'Pay your bill', 'my.te.eg']
  },
  {
    id: 'line_status',
    mainCaseAr: 'معرفة حالة الخط وميعاد التجديد',
    mainCaseEn: 'line status and the renewal date',
    subCaseAr: 'حالة الخط Active / Disable',
    subCaseEn: 'line status Active / Disable',
    scriptAr: 'حضرتك ممكن تعرف حالة الخط في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة حالة خطك وميعاد التجديد)',
    scriptEn: 'You can know the line status in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your line status and the renewal date',
    keywords: ['حالة الخط', 'الخط شغال ولا', 'الخط واقف', 'active', 'disable', 'line status', 'is line running', 'line condition'],
    triggerPhrases: ['حالة الخط', 'المساعد الذكي', 'معرفة حالة خطك', 'Know your line status', 'line status']
  },
  {
    id: 'renewal_line_status',
    mainCaseAr: 'معرفة حالة الخط وميعاد التجديد',
    mainCaseEn: 'line status and the renewal date',
    subCaseAr: 'ميعاد التجديد',
    subCaseEn: 'renewal date',
    scriptAr: 'حضرتك ممكن تعرف ميعاد التجديد في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (معرفة حالة خطك وميعاد التجديد)',
    scriptEn: 'You can know the renewal date in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Know your line status and the renewal date',
    keywords: ['ميعاد التجديد', 'ميعاد التجديد للخط', 'تجديد الخط الارضي', 'تجديد الحرارة', 'telephony renewal', 'line renewal'],
    triggerPhrases: ['ميعاد التجديد', 'المساعد الذكي', 'معرفة حالة خطك', 'line status and the renewal date']
  },
  {
    id: 'early_renewal',
    mainCaseAr: 'التجديد المبكر',
    mainCaseEn: 'early renewal',
    subCaseAr: 'التجديد المبكر',
    subCaseEn: 'early renewal',
    scriptAr: 'حضرتك تقدر تجدد مبكر في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg ثم إختيار (التجديد المبكر لنظامك)',
    scriptEn: 'You can early renewal your package in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on for package early renewal',
    keywords: ['تجديد مبكر', 'اجدد الباقة بدري', 'اجدد قبل الميعاد', 'التجديد المبكر', 'early renewal', 'renew early', 'renew before date'],
    triggerPhrases: ['تجدد مبكر', 'المساعد الذكي', 'التجديد المبكر لنظامك', 'early renewal', 'early renewal your package']
  },
  {
    id: 'recharge_addons',
    mainCaseAr: 'باقات الإنترنت الإضافية',
    mainCaseEn: 'extra internet Top Up',
    subCaseAr: 'باقات الشحن الاضافية',
    subCaseEn: 'Recharge add-ons',
    scriptAr: 'حضرتك ممكن تشترك في باقة شحن إضافية في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (الاشتراك في باقة انترنت إضافية) ثم إختيار باقات الشحن الاضافية',
    scriptEn: 'You can subscribe to Recharge add-ons in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Subscribe to an extra internet Top Up Then clicking on Recharge add-ons',
    keywords: ['باقة اضافية', 'باقة شحن', 'باقات الشحن الإضافية', 'باقة مضافة', 'extra internet', 'add-ons', 'extra package', 'top up quota'],
    triggerPhrases: ['باقة شحن إضافية', 'المساعد الذكي', 'الاشتراك في باقة انترنت إضافية', 'Recharge add-ons']
  },
  {
    id: 'playstation_addons',
    mainCaseAr: 'باقات الإنترنت الإضافية',
    mainCaseEn: 'extra internet Top Up',
    subCaseAr: 'باقات ال Play Station',
    subCaseEn: 'PS - PlayStation Bundle',
    scriptAr: 'حضرتك ممكن تشترك في باقة البلاي استيشن PS في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (الاشتراك في باقة انترنت إضافية) ثم إختيار باقات الـ Gaming او باقة بلاي استيشن PS',
    scriptEn: 'You can subscribe to PlayStation Bundle in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Subscribe to an extra internet Top Up and finally selecting Gaming add-ons PS - PlayStation Bundle',
    keywords: ['بلايستيشن', 'بلاي استيشن', 'باقة بلايستيشن', 'gaming bundle', 'playstation bundle', 'gaming add-ons', 'ps bundle'],
    triggerPhrases: ['البلاي استيشن PS', 'المساعد الذكي', 'باقات الـ Gaming', 'PlayStation Bundle', 'PlayStation']
  },
  {
    id: 'game_on_addons',
    mainCaseAr: 'باقات الإنترنت الإضافية',
    mainCaseEn: 'extra internet Top Up',
    subCaseAr: 'باقة GAME ON',
    subCaseEn: 'GAME ON - Gaming Bundle',
    scriptAr: 'حضرتك ممكن تشترك في باقة GAME ON في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg بالإختيار (الانترنت الأرضي) ثم إختيار (الاشتراك في باقة انترنت إضافية) ثم إختيار باقة GAME ON او باقة الالعاب',
    scriptEn: 'You can subscribe to Gaming Bundle in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg by selecting Fixed Internet Then clicking on Subscribe to an extra internet Top Up and finally selecting GAME ON - Gaming Bundle',
    keywords: ['game on', 'جيم اون', 'باقة الألعاب', 'باقة الالعاب', 'gaming on', 'games bundle'],
    triggerPhrases: ['باقة GAME ON', 'المساعد الذكي', 'باقة GAME ON او باقة الالعاب', 'GAME ON - Gaming Bundle', 'Gaming Bundle']
  },
  {
    id: 'outage_technical_complaint',
    mainCaseAr: 'انقطاع الحرارة والانترنت',
    mainCaseEn: 'Data and Voice Down',
    subCaseAr: 'انقطاع الحرارة والانترنت',
    subCaseEn: 'Data and Voice Down',
    scriptAr: 'حضرتك ممكن تقدم أو تتابع شكوي فنية في المرات القادمة من خلال المساعد الذكي عن طريق الحساب الخاص بك علي تطبيق MY WE او موقعنا www.te.eg مع ضرورة الوجود بجانب الراوتر مع توصيله مباشرة بخط التليفون الارضي من خلال خدمات (الانترنت الارضي) ثم إختيار (تقديم شكوي فنية علي خطك او متابعة شكوي) اضغط علي (انا الان بجانب الراوتر) اضغط علي (لدي عطل في خدمة الانترنت والخط الارضي) ثم إختيار (الراوتر الخاص بي متصل مباشرة بخط التليفون الارضي) مع ادخال رقم الموبايل للاتصال بك عند الحاجة اضغط علي (لدي عطل في خدمة الانترنت والتليفون الارضي)',
    scriptEn: 'You can submit a technical complaint in the future through the Smart Assistant using your account on the MY WE app or our website www.te.eg It is required to be near the router, ensuring it is directly connected to the main telephone line Choose Fixed Internet Click on Submitting a complaint about your line & follow up Click on You are near to the router Select You are facing a problem in both your internet and landline services Tap on Your router is connected directly to the main phone line Enter your mobile number for contact when needed and finally selecting You have a problem in internet and landline service',
    keywords: ['بورت', 'الاعطال', 'الخط الفاصل', 'النت فاصل', 'عطل فني', 'الحرارة وبس', 'الحرارة فاصلة', 'الحراره', 'المشكلة الفنية', 'technical complaint', 'outage', 'internet down', 'no dial tone'],
    triggerPhrases: ['تقدم أو تتابع شكوي فنية', 'الوجود بجانب الراوتر', 'تقديم شكوي فنية', 'submit a technical complaint', 'near to the router', 'complaint about your line']
  }
];
