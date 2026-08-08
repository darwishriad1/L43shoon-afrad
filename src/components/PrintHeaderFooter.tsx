import React from 'react';
import { ShieldCheck, Award, FileText, CheckCircle2 } from 'lucide-react';
import { PrintSettings, PrintTemplateId } from '../types';

export interface PrintTemplateInfo {
  id: PrintTemplateId;
  name: string;
  description: string;
  badge: string;
  badgeBg: string;
  accentColor: string;
  headerBg: string;
  borderColor: string;
  titleStyle: string;
}

export const PRINT_TEMPLATES: PrintTemplateInfo[] = [
  {
    id: 'royal_gold',
    name: 'النموذج الملكي الذهبي',
    description: 'إطار مذهّب فاخر بترويسة ملكية مزدوجة يناسب المعاملات السيادية والسندات الهامة.',
    badge: 'ملكـــي',
    badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
    accentColor: '#d97706',
    headerBg: 'bg-amber-50/40',
    borderColor: 'border-amber-600',
    titleStyle: 'font-serif text-amber-950 decoration-amber-600'
  },
  {
    id: 'military_tactical',
    name: 'النموذج العسكري التكتيكي',
    description: 'تصميم زيتي زاهي بهوية ميدانية صلبة للأوامر الإدارية وكشوفات الجاهزية والعتاد.',
    badge: 'تكتيكــي',
    badgeBg: 'bg-emerald-900 text-amber-300 border-amber-500/50',
    accentColor: '#059669',
    headerBg: 'bg-emerald-950 text-emerald-100',
    borderColor: 'border-emerald-800',
    titleStyle: 'font-mono text-emerald-950 tracking-wide'
  },
  {
    id: 'navy_official',
    name: 'النموذج الرسمي الكحلي',
    description: 'الهوية الرسمية المعتمدة للوزارات والقيادات التنفيذية بخطوط كحلية متزنة.',
    badge: 'رسـمــي',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    accentColor: '#0284c7',
    headerBg: 'bg-slate-900 text-white',
    borderColor: 'border-slate-900',
    titleStyle: 'font-sans text-slate-950'
  },
  {
    id: 'modern_minimal',
    name: 'النموذج الحديث الناعم',
    description: 'تصميم عصري ببساطة عالية وخطوط دقيقة يعزز وضوح الجداول وقراءة الكشوفات.',
    badge: 'حـديـث',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    accentColor: '#64748b',
    headerBg: 'bg-slate-50',
    borderColor: 'border-slate-300',
    titleStyle: 'font-sans text-slate-800 tracking-normal'
  },
  {
    id: 'slate_executive',
    name: 'النموذج القيادي التنفيذي',
    description: 'شريط رمادي فاحم مع حواف حادة يعطي طابعاً قيادياً جاداً للتقارير الاستراتيجية.',
    badge: 'تنفـيـذي',
    badgeBg: 'bg-slate-800 text-amber-300 border-slate-600',
    accentColor: '#334155',
    headerBg: 'bg-slate-800 text-white',
    borderColor: 'border-slate-800',
    titleStyle: 'font-serif text-slate-900'
  },
  {
    id: 'luxurious_crest',
    name: 'النموذج الزخرفي المذهّب',
    description: 'إطار مذهّب محيط بالكامل مع ختم ذهبي برّاق للمشاهد والشهادات والسندات الرسمية.',
    badge: 'فـاخــر',
    badgeBg: 'bg-gradient-to-r from-amber-600 to-amber-800 text-white border-amber-400',
    accentColor: '#b45309',
    headerBg: 'bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 text-amber-200',
    borderColor: 'border-amber-600',
    titleStyle: 'font-serif text-amber-900 font-black'
  }
];

export function getEffectivePrintSettings(customPrintSettings?: PrintSettings): Required<PrintSettings> {
  return {
    logoUrl: customPrintSettings?.logoUrl || null,
    signatureUrl: customPrintSettings?.signatureUrl || null,
    sealUrl: customPrintSettings?.sealUrl || null,
    countryName: customPrintSettings?.countryName || 'المملكة العربية السعودية',
    ministryName: customPrintSettings?.ministryName || 'وزارة الدفاع - القيادة العامة',
    commandName: customPrintSettings?.commandName || 'قيادة القوات البرية / المنطقة الشمالية الغربية',
    unitName: customPrintSettings?.unitName || 'كتيبة المشاة الآلية الثانية',
    headerText: customPrintSettings?.headerText || 'إشعار وتحضير قوة الجاهزية القتالية العاجلة',
    footerText: customPrintSettings?.footerText || 'هذا المستند سري ومحدود، ويخضع للتعليمات والأوامر العسكرية الصادرة.',
    showLogo: customPrintSettings?.showLogo ?? true,
    showSignature: customPrintSettings?.showSignature ?? true,
    showSeal: customPrintSettings?.showSeal ?? true,
    paperSize: customPrintSettings?.paperSize || 'A4',
    orientation: customPrintSettings?.orientation || 'portrait',
    templateId: customPrintSettings?.templateId || 'royal_gold'
  };
}

export const PrintWrapper: React.FC<{
  printSettings?: PrintSettings;
  children: React.ReactNode;
  className?: string;
}> = ({ printSettings, children, className = '' }) => {
  const settings = getEffectivePrintSettings(printSettings);
  const templateId = settings.templateId;

  if (templateId === 'royal_gold') {
    return (
      <div className={`bg-white p-6 rounded-xl border-4 border-double border-amber-600/80 shadow-xs relative text-slate-900 ${className}`}>
        {children}
      </div>
    );
  }
  if (templateId === 'luxurious_crest') {
    return (
      <div className={`bg-white p-6 rounded-xl border-4 border-amber-600 shadow-md relative text-slate-900 ${className}`}>
        <div className="border-2 border-amber-500/40 p-4 rounded-lg">
          {children}
        </div>
      </div>
    );
  }
  if (templateId === 'military_tactical') {
    return (
      <div className={`bg-white p-6 rounded-xl border-2 border-emerald-900 shadow-xs relative text-slate-900 ${className}`}>
        {children}
      </div>
    );
  }
  if (templateId === 'slate_executive') {
    return (
      <div className={`bg-white p-6 rounded-xl border-2 border-slate-800 shadow-xs relative text-slate-900 ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`bg-white p-6 rounded-xl border border-slate-300 shadow-xs relative text-slate-900 ${className}`}>
      {children}
    </div>
  );
};

interface PrintHeaderProps {
  printSettings?: PrintSettings;
  documentTitle?: string;
  documentSubtitle?: string;
  documentRef?: string;
  documentDate?: string;
  unitOverride?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  printSettings,
  documentTitle,
  documentSubtitle,
  documentRef,
  documentDate,
  unitOverride
}) => {
  const settings = getEffectivePrintSettings(printSettings);
  const todayStr = documentDate || new Date().toISOString().split('T')[0];
  const templateId = settings.templateId;

  // Header bottom border style according to template
  let headerBorderClass = 'border-b-2 border-slate-900';
  let subtitleContainerClass = 'bg-slate-900 text-white';
  let badgeClass = 'bg-rose-100 text-rose-900 border-rose-300';

  if (templateId === 'royal_gold') {
    headerBorderClass = 'border-b-4 border-double border-amber-600';
    subtitleContainerClass = 'bg-amber-950 text-amber-200 border border-amber-600/50';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-400 font-bold';
  } else if (templateId === 'military_tactical') {
    headerBorderClass = 'border-b-4 border-emerald-900';
    subtitleContainerClass = 'bg-emerald-950 text-amber-300 border border-emerald-800 font-mono';
    badgeClass = 'bg-emerald-900 text-amber-300 border-amber-500/50';
  } else if (templateId === 'slate_executive') {
    headerBorderClass = 'border-b-4 border-slate-800';
    subtitleContainerClass = 'bg-slate-800 text-amber-300';
    badgeClass = 'bg-slate-800 text-amber-300 border-slate-600';
  } else if (templateId === 'luxurious_crest') {
    headerBorderClass = 'border-b-2 border-amber-600';
    subtitleContainerClass = 'bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 text-white shadow-xs';
    badgeClass = 'bg-amber-600 text-white border-amber-300';
  } else if (templateId === 'modern_minimal') {
    headerBorderClass = 'border-b border-slate-300';
    subtitleContainerClass = 'bg-slate-100 text-slate-900 border border-slate-200';
    badgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
  }

  return (
    <div className="space-y-4">
      {/* Top Header Grid */}
      <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2 pb-4 dir-rtl text-slate-900 ${headerBorderClass}`}>
        {/* Right Info: Country, Ministry, Command, Unit */}
        <div className="text-center sm:text-right text-xs font-black space-y-0.5 order-2 sm:order-1">
          <p className="text-slate-900 font-black">{settings.countryName}</p>
          <p className="text-slate-800 font-bold">{settings.ministryName}</p>
          <p className="text-slate-700 font-semibold">{settings.commandName}</p>
          <p className="text-amber-700 font-extrabold">{unitOverride || settings.unitName}</p>
        </div>

        {/* Center Info: Official Logo, Title, Header Text, Security Classification */}
        <div className="text-center px-2 flex-1 order-1 sm:order-2">
          {settings.showLogo && settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="الشعار الرسمي" 
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain mx-auto mb-1.5 shadow-xs"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm">
              <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
            </div>
          )}

          {documentTitle && (
            <h2 className="text-sm sm:text-base font-black text-slate-950 tracking-wide">{documentTitle}</h2>
          )}
          
          {settings.headerText && (
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 mt-0.5">{settings.headerText}</p>
          )}

          <div className="mt-1.5 inline-block">
            <span className={`text-[9px] font-black px-2.5 py-0.5 rounded border ${badgeClass}`}>
              سـرّي ومـحـدود
            </span>
          </div>
        </div>

        {/* Left Info: Date, Reference, Page */}
        <div className="text-center sm:text-left text-xs font-black space-y-0.5 font-mono order-3">
          <p className="text-slate-900">التاريخ: {todayStr}</p>
          {documentRef && (
            <p className="text-slate-800 text-[11px]">المرجع: {documentRef}</p>
          )}
          <p className="text-slate-700">الصفحة: 01 / 01</p>
        </div>
      </div>

      {documentSubtitle && (
        <div className={`text-center p-2.5 rounded-xl shadow-xs ${subtitleContainerClass}`}>
          <h3 className="text-sm font-black">{documentSubtitle}</h3>
        </div>
      )}
    </div>
  );
};

interface PrintFooterProps {
  printSettings?: PrintSettings;
  rightTitle?: string;
  centerTitle?: string;
  leftTitle?: string;
}

export const PrintFooter: React.FC<PrintFooterProps> = ({
  printSettings,
  rightTitle = 'ركن القوة البشرية',
  centerTitle = 'اعتماد قائد الكتيبة / التشكيل',
  leftTitle = 'ركن العمليات والسيطرة'
}) => {
  const settings = getEffectivePrintSettings(printSettings);
  const templateId = settings.templateId;

  let footerBorderClass = 'border-t-2 border-slate-900';
  if (templateId === 'royal_gold') {
    footerBorderClass = 'border-t-4 border-double border-amber-600';
  } else if (templateId === 'military_tactical') {
    footerBorderClass = 'border-t-4 border-emerald-900';
  } else if (templateId === 'slate_executive') {
    footerBorderClass = 'border-t-4 border-slate-800';
  } else if (templateId === 'luxurious_crest') {
    footerBorderClass = 'border-t-2 border-amber-600';
  } else if (templateId === 'modern_minimal') {
    footerBorderClass = 'border-t border-slate-300';
  }

  return (
    <div className={`space-y-4 pt-4 text-slate-900 dir-rtl ${footerBorderClass}`}>
      {/* Signatures and Stamp Block */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold items-center">
        {/* Right Officer */}
        <div className="space-y-2">
          <p className="text-slate-800 font-black">{rightTitle}</p>
          {settings.showSignature && settings.signatureUrl ? (
            <img 
              src={settings.signatureUrl} 
              alt="التوقيع الرسمي" 
              className="h-12 object-contain mx-auto max-w-[140px]" 
            />
          ) : (
            <p className="font-black text-slate-700 text-[11px] font-mono py-2">[ توقيع إلكتروني معتمد ]</p>
          )}
        </div>

        {/* Center Authority (Seal/Stamp) */}
        <div className="space-y-1.5">
          <p className="text-slate-800 font-black">{centerTitle}</p>
          {settings.showSeal && settings.sealUrl ? (
            <img 
              src={settings.sealUrl} 
              alt="الختم الرسمي" 
              className="w-16 h-16 object-contain mx-auto shadow-xs" 
            />
          ) : (
            <div className="flex justify-center my-1">
              <div className="w-14 h-14 border-2 border-amber-700 rounded-full flex items-center justify-center text-[9px] text-amber-900 font-black rotate-[-12deg] bg-amber-100/80 shadow-xs">
                ختم القيادة
              </div>
            </div>
          )}
          <p className="text-slate-900 font-black text-[10px]">مصادق عليه رسمياً</p>
        </div>

        {/* Left Officer */}
        <div className="space-y-2">
          <p className="text-slate-800 font-black">{leftTitle}</p>
          {settings.showSignature && settings.signatureUrl ? (
            <img 
              src={settings.signatureUrl} 
              alt="التوقيع الرسمي" 
              className="h-12 object-contain mx-auto max-w-[140px]" 
            />
          ) : (
            <p className="font-black text-slate-700 text-[11px] font-mono py-2">[ توقيع إلكتروني معتمد ]</p>
          )}
        </div>
      </div>

      {/* Official Footer Text */}
      {settings.footerText && (
        <div className="pt-2 text-center border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{settings.footerText}</p>
        </div>
      )}
    </div>
  );
};
