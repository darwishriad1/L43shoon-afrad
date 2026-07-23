import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Lock, Users, Activity, Radio, Award, ChevronLeft } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
  appName?: string;
  unitName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onEnter,
  appName = "منظومة إدارة الفرد والجاهزية العسكرية",
  unitName = "قيادة اللواء الأول - الإدارة العامة للفرد"
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const DURATION = 3000; // 3 seconds total
    const INTERVAL = 30; // update every 30ms
    const increment = 100 / (DURATION / INTERVAL);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onEnter();
          }, 150);
          return 100;
        }
        return prev + increment;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [onEnter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] bg-slate-950 text-white font-sans flex flex-col justify-between p-6 sm:p-10 overflow-hidden select-none dir-rtl cursor-pointer"
      onClick={onEnter}
      dir="rtl"
    >
      {/* Dynamic Animated Radar / Military Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      
      {/* Ambient Moving Glow Lines */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.35, 0.15]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
          </span>
          <span className="text-xs font-black font-mono text-emerald-400 tracking-wider">نظام الجاهزية الفورية V4.5</span>
        </div>
        
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>تشفير عسكري آمن</span>
        </div>
      </div>

      {/* Center Main Stage */}
      <div className="relative z-10 max-w-xl mx-auto my-auto text-center space-y-7 w-full">
        
        {/* Animated Central Emblem with Rotating Rings */}
        <div className="relative inline-block">
          {/* Outer Pulsing Glow Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 rounded-full border border-dashed border-emerald-500/30 pointer-events-none"
          />

          <motion.div 
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="relative"
          >
            <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-2 border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.35),inset_0_1px_2px_rgba(255,255,255,0.25)] flex items-center justify-center p-5 group">
              <Shield className="w-14 h-14 sm:w-16 sm:h-16 text-emerald-400 drop-shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-2 rounded-xl border border-amber-300 shadow-xl">
                <Award className="w-5 h-5 font-black" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Titles & Welcome Note */}
        <motion.div 
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>المنظومة القيادية الذكية لضباط وأفراد اللواء</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {appName}
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-400 font-bold max-w-md mx-auto">
            {unitName}
          </p>
        </motion.div>

        {/* Floating Interactive Badge requested by user */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 text-right"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black text-emerald-300">
                مرحباً بك في نظام إدارة شؤون الأفراد
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                جاري تجهيز بيانات القوة وكشوفات التحضير الميداني...
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0">
            جاهزية 100%
          </span>
        </motion.div>

        {/* Animated Progress Loader Bar requested by user */}
        <div className="space-y-2 pt-1 text-right">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              جاري فتح المنظومة تلقائياً...
            </span>
            <span className="text-emerald-400 font-black text-sm">{Math.round(progress)}%</span>
          </div>

          {/* Glowing Animated Loading Bar */}
          <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-3 p-0.5 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <motion.div 
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full relative shadow-[0_0_15px_#34d399]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            >
              {/* Shimmer light sweep on loading bar */}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-shimmer" />
            </motion.div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans pt-0.5">
            <span>انقر في أي مكان للتخطي السريع</span>
            <span className="flex items-center gap-1 text-slate-400">
              دخول مباشر تلقائي <ChevronLeft className="w-3 h-3 text-emerald-400" />
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Footer Info */}
      <div className="relative z-10 border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <span>© 2026 شركة الصرم للتقنية والبرمجيات والمصمم درويش رياض</span>
        <span className="font-mono text-[10px] bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400">
          حماية البيانات والتشفير العسكري • القيادة العامة
        </span>
      </div>
    </motion.div>
  );
};

export default SplashScreen;

