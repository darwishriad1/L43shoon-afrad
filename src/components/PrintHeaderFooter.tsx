import React from 'react';
import { ShieldCheck, Shield } from 'lucide-react';
import { PrintSettings } from '../types';

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
    orientation: customPrintSettings?.orientation || 'portrait'
  };
}

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

  return (
    <div className="space-y-4">
      {/* Top Header Grid */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 dir-rtl text-slate-900">
        {/* Right Info: Country, Ministry, Command, Unit */}
        <div className="text-right text-xs font-black space-y-0.5">
          <p className="text-slate-900 font-black">{settings.countryName}</p>
          <p className="text-slate-800 font-bold">{settings.ministryName}</p>
          <p className="text-slate-700 font-semibold">{settings.commandName}</p>
          <p className="text-emerald-900 font-extrabold">{unitOverride || settings.unitName}</p>
        </div>

        {/* Center Info: Official Logo, Title, Header Text, Security Classification */}
        <div className="text-center px-2 flex-1">
          {settings.showLogo && settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="الشعار الرسمي" 
              className="w-16 h-16 object-contain mx-auto mb-1.5 shadow-xs"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-900 text-emerald-400 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-1.5 shadow-sm">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
          )}

          {documentTitle && (
            <h2 className="text-base font-black text-slate-950 tracking-wide">{documentTitle}</h2>
          )}
          
          {settings.headerText && (
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">{settings.headerText}</p>
          )}

          <div className="mt-1.5 inline-block">
            <span className="text-[9px] bg-rose-100 text-rose-900 font-black px-2.5 py-0.5 rounded border border-rose-300">
              سـرّي ومـحـدود
            </span>
          </div>
        </div>

        {/* Left Info: Date, Reference, Page */}
        <div className="text-left text-xs font-black space-y-0.5 font-mono">
          <p className="text-slate-900">التاريخ: {todayStr}</p>
          {documentRef && (
            <p className="text-slate-800 text-[11px]">المرجع: {documentRef}</p>
          )}
          <p className="text-slate-700">الصفحة: 01 / 01</p>
        </div>
      </div>

      {documentSubtitle && (
        <div className="text-center bg-slate-900 text-white p-2.5 rounded-xl shadow-xs">
          <h3 className="text-sm font-black text-white">{documentSubtitle}</h3>
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

  return (
    <div className="space-y-4 pt-4 border-t-2 border-slate-900 text-slate-900 dir-rtl">
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
              <div className="w-14 h-14 border-2 border-emerald-700 rounded-full flex items-center justify-center text-[9px] text-emerald-900 font-black rotate-[-12deg] bg-emerald-100/80 shadow-xs">
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
