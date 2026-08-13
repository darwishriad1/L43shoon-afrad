import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Moon, 
  Sun, 
  ShieldAlert, 
  ShieldCheck, 
  Smartphone, 
  Info, 
  LockKeyhole, 
  Loader2,
  X
} from 'lucide-react';

interface LoginPageProps {
  loginUsername: string;
  setLoginUsername: (val: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
  loginError: string;
  loadingAuth: boolean;
  handleLocalLogin: (e: React.FormEvent) => void;
  otpEnabled: boolean;
  setOtpEnabled: (val: boolean) => void;
  otpValue: string;
  setOtpValue: (val: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  loadingAuth,
  handleLocalLogin,
  otpEnabled,
  setOtpEnabled,
  otpValue,
  setOtpValue,
}) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme === 'light') {
      setTheme('light');
      document.body.classList.add('light-mode');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 relative overflow-x-hidden bg-[var(--bg)] transition-colors duration-500 font-sans select-none dir-rtl" dir="rtl">
      
      {/* Floating Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-5 left-5 z-[100] w-12 h-12 rounded-full bg-[var(--toggle-bg)] backdrop-blur-md border border-[var(--card-border)] flex items-center justify-center text-[var(--toggle-icon)] text-xl cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg"
        title="تبديل الوضع الليلي / النهاري"
      >
        {theme === 'dark' ? <Moon className="w-5 h-5 text-amber-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
      </button>

      {/* Animated Background Blobs, Lines & Particles */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Blobs */}
        <div 
          className="absolute w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full blur-[90px] opacity-[var(--blob-opacity)] top-[-15%] left-[-20%]"
          style={{ 
            background: 'radial-gradient(circle, #f7b731, #f5a623)',
            animation: 'floatBlob 28s infinite alternate ease-in-out'
          }}
        />
        <div 
          className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full blur-[90px] opacity-[var(--blob-opacity)] bottom-[-25%] right-[-25%]"
          style={{ 
            background: 'radial-gradient(circle, #8b5cf6, #6d28d9)',
            animation: 'floatBlob 32s infinite alternate ease-in-out',
            animationDelay: '-4s'
          }}
        />
        <div 
          className="absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] rounded-full blur-[90px] opacity-[var(--blob-opacity)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ 
            background: 'radial-gradient(circle, #2dd4bf, #0d9488)',
            animation: 'floatBlob 35s infinite alternate ease-in-out',
            animationDelay: '-8s'
          }}
        />

        {/* Ambient Light Lines */}
        <div 
          className="absolute h-[2px] w-[80%] top-[20%] left-[-10%] opacity-[var(--line-opacity)] blur-[1px] rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(245, 166, 35, 0.6), rgba(139, 92, 246, 0.6), transparent)',
            animation: 'driftLine 22s infinite linear',
            transform: 'rotate(15deg)'
          }}
        />
        <div 
          className="absolute h-[2px] w-[70%] top-[60%] left-[-10%] opacity-[var(--line-opacity)] blur-[1px] rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(45, 212, 191, 0.6), rgba(139, 92, 246, 0.6), transparent)',
            animation: 'driftLine 26s infinite linear',
            animationDelay: '-7s',
            transform: 'rotate(-10deg)'
          }}
        />

        {/* Floating Particles */}
        <div className="absolute w-1 h-1 rounded-full bg-amber-400 top-[10%] left-[15%] opacity-0" style={{ animation: 'particleFloat 15s infinite ease-in-out' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-500 top-[25%] right-[20%] opacity-0" style={{ animation: 'particleFloat 15s infinite ease-in-out', animationDelay: '-3s' }} />
        <div className="absolute w-1 h-1 rounded-full bg-teal-400 bottom-[30%] left-[30%] opacity-0" style={{ animation: 'particleFloat 15s infinite ease-in-out', animationDelay: '-6s' }} />
        <div className="absolute w-1 h-1 rounded-full bg-amber-400 bottom-[15%] right-[25%] opacity-0" style={{ animation: 'particleFloat 15s infinite ease-in-out', animationDelay: '-9s' }} />
      </div>

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[440px] p-6 sm:p-9 bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--card-border)] rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl transition-all duration-500 my-auto">
        
        {/* Card Conic Glow Border Accent */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none p-[1.5px] bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-teal-500/20 -z-10 opacity-70" />

        {/* Brand Section with Golden Ring Emblem */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex relative w-20 h-20 mb-3 items-center justify-center">
            {/* Outer Golden Pulsing Ring */}
            <div 
              className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_15px_rgba(245,166,35,0.5)]"
              style={{ animation: 'goldenPulse 2s infinite alternate' }}
            />
            {/* Inner Ring with Emblem */}
            <div className="absolute inset-[1.5px] rounded-[14px] bg-[var(--logo-ring-inner-bg)] flex items-center justify-center overflow-hidden p-2 text-amber-400">
              <ShieldCheck className="w-10 h-10 drop-shadow-[0_0_10px_rgba(245,166,35,0.8)]" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            أهلاً بك
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-semibold">
            سجل دخولك لنظام إدارة الأفراد والجاهزية العسكرية
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLocalLogin} className="flex flex-col gap-4">
          
          {/* Email / Username Input Group */}
          <div className="relative">
            <input
              type="text"
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="اسم المستخدم أو البريد الإلكتروني"
              className="w-full py-3.5 pr-12 pl-4 bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--input-focus-border)] text-[var(--input-text)] placeholder-[var(--input-placeholder)] rounded-full font-sans text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-amber-500/10 shadow-inner"
            />
            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--social-color)] pointer-events-none transition-colors" />
          </div>

          {/* Password Input Group */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => {
                const isCaps = e.getModifierState && e.getModifierState('CapsLock');
                setCapsLockActive(isCaps);
              }}
              onKeyUp={(e) => {
                const isCaps = e.getModifierState && e.getModifierState('CapsLock');
                setCapsLockActive(isCaps);
              }}
              placeholder="كلمة المرور"
              className="w-full py-3.5 pr-12 pl-12 bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--input-focus-border)] text-[var(--input-text)] placeholder-[var(--input-placeholder)] rounded-full font-sans text-sm outline-none transition-all duration-300 focus:ring-4 focus:ring-amber-500/10 shadow-inner"
            />
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--social-color)] pointer-events-none transition-colors" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--social-color)] hover:text-amber-400 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Caps Lock Alert */}
          {capsLockActive && (
            <div className="text-amber-400 text-xs font-bold text-right flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl animate-fadeIn">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>تنبيه: زر الحروف الكبيرة (Caps Lock) مفعل!</span>
            </div>
          )}

          {/* Optional OTP 2FA Switcher */}
          <div className="bg-slate-900/30 border border-[var(--input-border)] p-3 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-[var(--text-primary)]">تفعيل التحقق الثنائي (OTP)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={otpEnabled} 
                  onChange={(e) => {
                    setOtpEnabled(e.target.checked);
                    if (!e.target.checked) setOtpValue('');
                  }}
                  className="sr-only peer" 
                />
                <div className="w-8 h-4.5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:content-[''] after:content-[''] after:absolute after:top-[2px] after:right-[16px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {otpEnabled && (
              <div className="space-y-2 animate-fadeIn pt-1">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] p-2 rounded-lg flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>يرجى إدخال رمز التحقق الثنائي (OTP) المكون من 6 أرقام</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="أدخل رمز (OTP) المكون من 6 أرقام"
                    className="w-full py-2.5 pr-10 pl-4 bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-amber-500 text-[var(--input-text)] rounded-xl font-mono text-center tracking-widest text-xs outline-none"
                  />
                  <LockKeyhole className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--social-color)]" />
                </div>
              </div>
            )}
          </div>

          {/* Options Row (Remember Checkbox + Forgot Password Link) */}
          <div className="flex items-center justify-between text-xs my-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4.5 h-4.5 rounded border border-[var(--remember-check-border)] accent-amber-500 cursor-pointer"
              />
              <span>تذكرني</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotHelp(true)}
              className="text-[var(--link-color)] hover:text-[var(--link-hover)] transition-colors font-medium hover:underline cursor-pointer"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          {/* Error Message Box */}
          {loginError && (
            <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-full text-xs text-center font-medium animate-fadeIn">
              {loginError}
            </div>
          )}

          {/* Main Shimmer Login Button */}
          <button
            type="submit"
            disabled={loadingAuth}
            className="w-full py-3.5 px-6 rounded-full font-bold text-sm text-[var(--btn-text)] shadow-lg hover:shadow-amber-500/30 active:scale-[0.98] disabled:opacity-70 transition-all cursor-pointer flex items-center justify-center gap-2 text-slate-950 mt-1"
            style={{
              background: 'linear-gradient(135deg, #f5a623, #d97706, #f5a623)',
              backgroundSize: '200% 200%',
              animation: 'shimmerBtn 4s ease-in-out infinite'
            }}
          >
            {loadingAuth ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>دخول</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-[11px] text-[var(--text-muted)] mt-5">
          منظومة إدارة أفراد اللواء • قيادة السيطرة والعمليات
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 relative shadow-2xl text-slate-200">
            <button
              type="button"
              onClick={() => setShowForgotHelp(false)}
              className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-3 mb-4 text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>إجراءات استعادة كلمة المرور العسكرية</span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                نظراً لحساسية وسرية البيانات داخل المنظومة الرقمية للسيطرة والقوة، يرجى التواصل مع مسؤول تكنولوجيا المعلومات أو ركن القوة البشرية لاستعادة كلمة المرور.
              </p>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="font-bold text-amber-400 text-xs">نقاط الاتصال بالدعم الفني:</div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1 text-[11px]">
                  <span>رئيس مركز العمليات الرقمية:</span>
                  <span className="font-mono text-amber-400">تحويلة 4015</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>ركن القوة البشرية والضباط:</span>
                  <span className="font-mono text-amber-400">تحويلة 8820</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
