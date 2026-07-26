import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Lock, Users, Activity, ChevronLeft } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
  appName?: string;
  unitName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onEnter,
  appName = "منظومة إدارة أفراد اللواء",
  unitName = "قيادة اللواء الأول - منصة الريادة والجاهزية العسكرية"
}) => {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const DURATION = 3500; // 3.5 seconds
    const INTERVAL = 35;
    const increment = 100 / (DURATION / INTERVAL);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsDone(true);
            setTimeout(() => {
              onEnter();
            }, 500);
          }, 300);
          return 100;
        }
        return prev + increment;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [onEnter]);

  return (
    <div
      onClick={onEnter}
      className={`fixed inset-0 z-[1000] bg-[var(--splash-bg)] text-[var(--splash-text)] font-sans flex flex-col items-center justify-center p-4 select-none dir-rtl cursor-pointer transition-opacity duration-700 overflow-hidden ${
        isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      dir="rtl"
    >
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Background Animated Glowing Orbs */}
      <div 
        className="absolute top-[-100px] right-[-100px] w-[320px] h-[320px] rounded-full bg-[var(--splash-accent)] opacity-10 blur-[80px]"
        style={{ animation: 'orbFloat 10s infinite alternate ease-in-out' }}
      />
      <div 
        className="absolute bottom-[-80px] left-[-80px] w-[240px] h-[240px] rounded-full bg-amber-600 opacity-10 blur-[70px]"
        style={{ animation: 'orbFloat 12s infinite alternate ease-in-out', animationDelay: '-3s' }}
      />

      {/* Main Content Box */}
      <div className="relative z-10 text-center flex flex-col items-center gap-6 max-w-md w-full px-4 animate-[fadeUp_0.8s_ease-out_forwards]">
        
        {/* Animated Icon / Emblem with Rings */}
        <div className="relative w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] flex items-center justify-center">
          {/* Outer Ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-[var(--splash-accent)] opacity-30 pointer-events-none"
            style={{ animation: 'ringPulse 2s infinite ease-in-out' }}
          />

          {/* Inner Circle Emblem */}
          <div 
            className="w-[180px] h-[180px] sm:w-[210px] sm:h-[210px] rounded-full overflow-hidden bg-slate-950 border-2 border-[var(--splash-accent)] flex items-center justify-center p-3 relative shadow-2xl"
            style={{ animation: 'subtleGlow 3s infinite alternate' }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-600/30 flex flex-col items-center justify-center p-4 border border-amber-500/30 text-amber-400">
              <Shield className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_20px_rgba(245,166,35,0.8)]" />
              <span className="text-[11px] font-black tracking-widest text-amber-300 mt-1 uppercase">
                الريادة والسيطرة
              </span>
            </div>
          </div>
        </div>

        {/* Brand Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white drop-shadow-md">
            منص<span className="text-[var(--splash-accent)]">ة</span> الريادة
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-xs mx-auto">
            {appName}
          </p>
        </div>

        {/* Loading Status Text */}
        <div className="flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm font-semibold">
          <span>جاري تشغيل النظام</span>
          <span className="inline-flex gap-1 mr-1">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[dotTyping_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[dotTyping_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-[dotTyping_1.4s_infinite_ease-in-out_both]" style={{ animationDelay: '0.4s' }} />
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full max-w-[280px] flex flex-col gap-1.5">
          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden relative border border-white/5">
            <div 
              className="h-full rounded-full transition-all duration-100 ease-linear shadow-[0_0_12px_rgba(245,166,35,0.6)]"
              style={{ 
                width: `${Math.round(progress)}%`,
                background: 'linear-gradient(90deg, #f5a623, #fcd34d, #f5a623)',
                backgroundSize: '200% 100%',
                animation: 'progressShimmer 2s linear infinite'
              }}
            />
          </div>
          
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 px-0.5">
            <span>جارٍ التحميل...</span>
            <span className="text-[var(--splash-accent)] font-bold font-mono">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400/80 flex items-center gap-1 mt-1">
          <span>اضغط في أي مكان للتخطي الفوري</span>
          <ChevronLeft className="w-3 h-3 text-amber-400" />
        </div>

      </div>
    </div>
  );
};

export default SplashScreen;
