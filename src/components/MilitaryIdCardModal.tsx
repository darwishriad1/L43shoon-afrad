import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  QrCode, 
  Award, 
  Phone, 
  Heart, 
  Building2, 
  Calendar, 
  User, 
  BadgeCheck, 
  Share2, 
  Check, 
  Copy,
  Sparkles,
  Lock
} from 'lucide-react';
import { Soldier, Unit } from '../types';
import { triggerToast } from './ToastContainer';

interface MilitaryIdCardModalProps {
  soldier: Soldier;
  unit?: Unit;
  unitName?: string;
  onClose: () => void;
}

export default function MilitaryIdCardModal({ soldier, unit, unitName, onClose }: MilitaryIdCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const displayUnitName = unit?.name || unitName || soldier.unitId || 'قيادة اللواء';

  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    JSON.stringify({
      milId: soldier.militaryNumber,
      name: soldier.fullName,
      rank: soldier.rank,
      unit: displayUnitName,
      status: soldier.militaryStatus || 'على رأس العمل',
      validUntil: '2027-12-31'
    })
  )}`;

  const handlePrintCard = () => {
    window.print();
  };

  const handleCopyVerificationCode = () => {
    const code = `MIL-ID-${soldier.militaryNumber}-${soldier.rank.replace(/\s+/g, '')}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    triggerToast('تم نسخ الرمز العسكري الموثق بنجاح!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto animate-fadeIn">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <BadgeCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>بطاقة الهوية والتعريف العسكرية الرقمية</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  موثقة
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                اللواء 43 عمالقة • بطاقة مرور أمني وإثبات هوية ميدانية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls Top */}
        <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>معاينة البطاقة القياسية (CR80 Standard Format)</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyVerificationCode}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'تم النسخ' : 'نسخ الرمز'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCard}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة فورية</span>
            </button>
          </div>
        </div>

        {/* CARD CONTAINER (PRINTABLE) */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950">
          
          <div 
            ref={cardRef}
            className="w-full max-w-md bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-indigo-500/40 relative overflow-hidden space-y-4"
          >
            {/* Background Military Watermark Accents */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400"></div>
            <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>

            {/* Brigade Header Bar */}
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-lg shadow-inner">
                  🎖️
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-400 tracking-wide">
                    قوات ألوية العمالقة الجنوبية
                  </h4>
                  <p className="text-[10px] text-slate-300 font-bold">
                    قيادة اللواء 43 عمالقة • إدارة شؤون الأفراد
                  </p>
                </div>
              </div>

              <div className="text-left font-mono">
                <span className="text-[9px] block text-slate-400">SECURITY CODE</span>
                <span className="text-[11px] font-black text-emerald-400">#{soldier.militaryNumber}</span>
              </div>
            </div>

            {/* Soldier Info Center Grid */}
            <div className="grid grid-cols-3 gap-3 relative z-10 pt-1">
              
              {/* Photo & QR Col */}
              <div className="col-span-1 flex flex-col items-center space-y-2.5">
                <div className="w-24 h-28 rounded-2xl bg-slate-800 border-2 border-indigo-400/60 overflow-hidden shadow-md flex items-center justify-center relative">
                  {soldier.photoUrl ? (
                    <img 
                      src={soldier.photoUrl} 
                      alt={soldier.fullName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-indigo-300 p-2 text-center">
                      <User className="w-10 h-10 text-indigo-400/60 mb-1" />
                      <span className="text-[9px] font-bold">صورة الفرد</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/90 text-amber-300 font-black text-[8px] rounded border border-amber-500/40">
                    {soldier.rank}
                  </span>
                </div>

                <div className="w-20 h-20 bg-white p-1 rounded-xl shadow-md border border-indigo-300 flex items-center justify-center">
                  <img 
                    src={qrDataUrl} 
                    alt="QR Verification" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Data Details Col */}
              <div className="col-span-2 space-y-2 text-right">
                <div>
                  <span className="text-[9px] text-indigo-300 font-bold block">الاسم الكامل:</span>
                  <p className="text-xs sm:text-sm font-black text-white leading-tight">
                    {soldier.fullName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
                    <span className="text-[8px] text-slate-400 block font-bold">الرتبة:</span>
                    <span className="text-[11px] font-black text-amber-300">{soldier.rank}</span>
                  </div>

                  <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
                    <span className="text-[8px] text-slate-400 block font-bold">الرقم العسكري:</span>
                    <span className="text-[11px] font-mono font-black text-emerald-300">{soldier.militaryNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
                    <span className="text-[8px] text-slate-400 block font-bold">الوحدة / الكتيبة:</span>
                    <span className="text-[10px] font-bold text-slate-200 truncate block">
                      {unitName || soldier.unitId}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
                    <span className="text-[8px] text-slate-400 block font-bold">فصيلة الدم:</span>
                    <span className="text-[11px] font-mono font-black text-rose-400">
                      {soldier.bloodType || 'O+'}
                    </span>
                  </div>
                </div>

                {soldier.phoneNumber && (
                  <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
                    <span className="text-[8px] text-slate-400 font-bold">رقم الطوارئ:</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-300">
                      {soldier.phoneNumber}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[9px] font-semibold text-slate-400">
                  <span>الحالة: <strong className="text-emerald-400">{soldier.militaryStatus || 'على رأس العمل'}</strong></span>
                  <span>الصلاحية: <strong className="text-slate-300 font-mono">2027/12/31</strong></span>
                </div>
              </div>

            </div>

            {/* Bottom Official Validation Footer */}
            <div className="pt-2 border-t border-indigo-800/60 flex items-center justify-between text-[8px] text-slate-400 relative z-10">
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <Lock className="w-2.5 h-2.5" />
                <span>إثبات عسكري مشفر ومحمي برمز QR ميداني</span>
              </div>
              <span className="font-mono text-slate-500">SYS-VERIFIED • 43RD BRIGADE</span>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            تُستخدم هذه البطاقة للتحقق في نقاط التفتيش العسكرية والخفارات وبوابات المقرات.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
}
