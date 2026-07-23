import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  Phone, 
  MapPin, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare,
  BookOpen,
  FileText
} from 'lucide-react';

export default function AboutApp() {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const phoneNumber = '+967774655282';
  const whatsappUrl = `https://wa.me/967774655282?text=${encodeURIComponent('السلام عليكم ورحمة الله وبركاته، أستفسر بخصوص تطبيق إدارة شؤون الأفراد والعديد (اللواء 43 عمالقة)')}`;
  const facebookUrl = 'https://facebook.com';
  const instagramUrl = 'https://instagram.com';

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-2.5 text-right select-none font-sans p-1 sm:p-2" dir="rtl">
      
      {/* Main Single-Screen Frame Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-3 sm:p-4 space-y-3">
        
        {/* 1. Header Banner - Ultra Compact */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-slate-100 rounded-xl p-3 sm:p-4 relative overflow-hidden border border-slate-800 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-[10px] font-black">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>اللواء 43 عمالقة - إدارة شؤون الأفراد</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
              حول المنظومة والجهة المطورة
            </h1>
            <p className="text-[11px] text-slate-300 font-bold leading-tight">
              تطوير شركة <span className="text-emerald-400 font-extrabold">الصرم للتقنية والبرمجيات</span>
            </p>
          </div>

          <div className="shrink-0 p-2.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-center">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-lg mx-auto flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5 stroke-[2]" />
            </div>
            <span className="text-[10px] font-black text-white block mt-1 leading-none">شركة الصرم</span>
          </div>
        </div>

        {/* 2. Developer & Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* Developer Card */}
          <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <div className="p-1.5 bg-emerald-100/80 text-emerald-800 rounded-lg shrink-0">
                <User className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xs font-black text-slate-800">بيانات المصمم والشركة</h2>
                <p className="text-[10px] text-slate-400 font-bold">التطوير البرمجي والملكية</p>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] font-sans">
              <div className="flex items-center justify-between bg-white p-1.5 px-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-bold">الشركة المطورة:</span>
                <span className="font-black text-slate-800">الصرم للتقنية والبرمجيات</span>
              </div>

              <div className="flex items-center justify-between bg-white p-1.5 px-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-bold">المصمم:</span>
                <span className="font-black text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                  درويش رياض صالح درويش
                </span>
              </div>

              <div className="flex items-center justify-between bg-white p-1.5 px-2 rounded-lg border border-slate-100">
                <span className="text-slate-500 font-bold">العنوان:</span>
                <span className="font-black text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-600 inline" />
                  عدن - صلاح الدين
                </span>
              </div>
            </div>
          </div>

          {/* Contact & Phone Card */}
          <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                <div className="p-1.5 bg-indigo-100/80 text-indigo-700 rounded-lg shrink-0">
                  <Phone className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-800">الدعم المباشر</h2>
                  <p className="text-[10px] text-slate-400 font-bold">خدمة التواصل الفني</p>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 p-2 sm:p-2.5 rounded-xl border border-slate-800 space-y-1.5 dir-rtl">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">هاتف الدعم المباشر:</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.2 rounded text-[9px]">متاح 24/7</span>
                </div>

                <div className="flex items-center justify-between gap-1.5 bg-slate-800/90 px-2 py-1.5 rounded-lg border border-slate-700 dir-ltr">
                  <a 
                    href={`tel:${phoneNumber}`}
                    className="font-mono text-xs sm:text-sm font-black text-emerald-300 hover:text-emerald-200 tracking-wider"
                  >
                    {phoneNumber}
                  </a>

                  <button
                    onClick={handleCopyPhone}
                    className="p-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    title="نسخ الرقم"
                  >
                    {copiedPhone ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <a
              href={`tel:${phoneNumber}`}
              className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>إجراء اتصال مباشر</span>
            </a>
          </div>

          {/* Usage Guide Card (NEW) */}
          <div className="p-2.5 sm:p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-2 flex flex-col justify-between group hover:border-emerald-500/40 hover:bg-emerald-50/20 transition-all sm:col-span-2 lg:col-span-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100/80 text-amber-800 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-800">دليل الاستخدام والتعليمات</h2>
                    <p className="text-[10px] text-slate-400 font-bold">شرح وافي لوظائف النظام والكتائب</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                  توجيهات
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                  يتضمن كتيب إرشادي شامل لكيفية تحضير الأفراد، طباعة النشرات اليومية، تقارير الجاهزية، وإدارة السجلات الرقمية للواء 43 عمالقة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                alert('📘 دليل استخدام المنظومة:\n\n1. تحضير الأفراد: اختر اليوم ثم حدد الحالة (حاضر، غائب، إجازة، مهمة).\n2. التقارير والكشوفات: انتقل لتبويب التقارير للتبديل بين الكشف اليومي والكشف الشهري.\n3. النشرة اليومية: يمكنك استخراجها وطباعتها بضغطة زر.\n4. الملفات الفردية: يمكنك الاطلاع على سجل كل فرد وتحديث رتبته وبياناته.');
              }}
              className="w-full mt-1.5 py-1.5 bg-slate-900 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>عرض دليل الاستخدام والشروحات</span>
            </button>
          </div>

        </div>

        {/* 3. Social Media Horizontal Row ( strictly Horizontal 3-column ) */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              <span>قنوات التواصل السريع:</span>
            </span>
            <span className="text-[9px] text-slate-400 font-bold">روابط تحويل مباشرة</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-2 sm:p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/60 hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/10 rounded-xl transition-all duration-300 flex items-center justify-center sm:justify-between gap-1.5 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#25D366] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800 group-hover:text-emerald-900 block leading-tight transition-colors">الواتساب</span>
                  <span className="text-[9px] text-emerald-700 font-bold hidden xs:inline">محادثة حية</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden sm:block group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-2 sm:p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/60 hover:-translate-y-1 hover:shadow-md hover:shadow-blue-500/10 rounded-xl transition-all duration-300 flex items-center justify-center sm:justify-between gap-1.5 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800 group-hover:text-blue-900 block leading-tight transition-colors">الفيسبوك</span>
                  <span className="text-[9px] text-blue-700 font-bold hidden xs:inline">المرجع الرسمي</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0 hidden sm:block group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {/* Instagram */}
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group p-2 sm:p-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/60 hover:-translate-y-1 hover:shadow-md hover:shadow-purple-500/10 rounded-xl transition-all duration-300 flex items-center justify-center sm:justify-between gap-1.5 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-slate-800 group-hover:text-purple-900 block leading-tight transition-colors">انستقرام</span>
                  <span className="text-[9px] text-purple-700 font-bold hidden xs:inline">معرض الصور</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-purple-600 shrink-0 hidden sm:block group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

          </div>
        </div>

        {/* Footer Note */}
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>منظومة موحدة لقيادة وتوثيق شؤون أفراد اللواء 43 عمالقة</span>
          </div>
          <p className="text-[9px] text-slate-400 font-bold">جميع الحقوق محفوظة © شركة الصرم للتقنية والبرمجيات</p>
        </div>

      </div>

    </div>
  );
}
