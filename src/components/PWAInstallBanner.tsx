import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Wifi, WifiOff, Smartphone, Laptop, Info, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return localStorage.getItem('pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if running in standalone mode (already installed PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      if (isStandaloneMedia || isIOSStandalone) {
        setIsStandalone(true);
      }
    };

    checkStandalone();

    // Check device type
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setBannerDismissed(true);
      localStorage.setItem('pwa_banner_dismissed', 'true');
    };

    // Online/Offline status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setDeferredPrompt(null);
        setIsStandalone(true);
        setBannerDismissed(true);
        localStorage.setItem('pwa_banner_dismissed', 'true');
      }
    } else if (isIOS) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setBannerDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // If already installed as PWA or dismissed by user, hide completely
  if (isStandalone || bannerDismissed) {
    return null;
  }

  return (
    <div className="space-y-3 font-sans" dir="rtl">
      {/* Network Status Badge & PWA Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm text-xs">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold">
              <Wifi className="w-3.5 h-3.5" />
              <span>متصل بالشبكة (أونلاين)</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-bold animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>وضع عدم الاتصال (أوفلاين) - جاهز للعمل</span>
            </span>
          )}

          {isStandalone ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>التطبيق مثبت كـ PWA</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-semibold">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>تطبيق الويب التفاعلي</span>
            </span>
          )}
        </div>

        {/* Install Button if available or on iOS */}
        <div className="flex items-center gap-2">
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer text-xs"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>تثبيت التطبيق على الجهاز</span>
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="إخفاء شريط التثبيت"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Banner for quick install when prompt available and not dismissed */}
      {!isStandalone && !bannerDismissed && (deferredPrompt || isIOS) && (
        <div className="relative p-4 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <button
            onClick={handleDismiss}
            className="absolute top-2.5 left-2.5 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-1">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shrink-0">
              <Download className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <span>تثبيت منظومة إدارة الفرد كـ تطبيق مستقل (PWA)</span>
              </h4>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                يمكنك إضافة المنظومة للشاشة الرئيسية للوصول السريع، العمل بدون انترنت، وتجربة سلسة بدون شريط المتصفح.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isIOS ? 'تعليمات التثبيت (iOS)' : 'تثبيت الآن'}</span>
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal/Card */}
      {showIOSInstructions && (
        <div className="p-4 bg-slate-900 border border-amber-500/40 rounded-2xl space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h5 className="font-black text-amber-400 text-sm flex items-center gap-2">
              <Share className="w-4 h-4" />
              <span>خطوات تثبيت التطبيق على أجهزة آيفون / آيباد (iOS):</span>
            </h5>
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-slate-200 font-semibold leading-relaxed">
            <li>افتح الرابط في متصفح Safari على جهازك.</li>
            <li>اضغط على زر المشاركة <Share className="w-3.5 h-3.5 inline text-blue-400 mx-1" /> أسفل الشاشة.</li>
            <li>اختر من القائمة <span className="text-amber-300 font-bold">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
            <li>اضغط على <span className="text-emerald-400 font-bold">"إضافة" (Add)</span> في الزاوية العلوية.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
