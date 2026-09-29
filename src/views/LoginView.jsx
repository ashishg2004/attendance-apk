import React, { useState } from 'react';
import { User, Lock, Phone, Building2, LogIn, UserPlus, HardHat, ShieldCheck, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '../db/database';

export default function LoginView({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [siteName, setSiteName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const user = await registerUser({
          username,
          phone,
          password,
          site_name: siteName || `${username}'s Site`
        });
        onLoginSuccess(user);
      } else {
        const user = await loginUser({
          usernameOrPhone: username,
          password
        });
        onLoginSuccess(user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await loginUser({
        usernameOrPhone: 'demo',
        password: '123'
      });
      onLoginSuccess(user);
    } catch (err) {
      // Fallback: register demo if deleted
      const user = await registerUser({
        username: 'demo',
        phone: '9876543210',
        password: '123',
        site_name: 'Main Site Log'
      });
      onLoginSuccess(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1E382B] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Hero Accent Blobs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#1E382B]/10 rounded-full blur-3xl ambient-blob-1 pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#3B5A49]/10 rounded-full blur-3xl ambient-blob-2 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-[#EFEAE1] rounded-[32px] p-6 shadow-2xl relative z-10 page-view-enter">
        {/* App Branding Header */}
        <div className="text-center pb-6 border-b border-[#EFEAE1]">
          <div className="w-16 h-16 bg-[#1E382B] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#1E382B]/20 mb-3 tactile-btn">
            <HardHat className="w-9 h-9 text-[#E8F5E9] stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#1E382B]">
            Staff Attendance
          </h1>
          <p className="text-xs text-[#5A7A68] font-bold mt-1">
            Site Data Security & Confidentiality
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="flex p-1 bg-[#FAF7F2] rounded-2xl border border-[#EFEAE1] my-5">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? 'bg-[#1E382B] text-white shadow-md'
                : 'text-[#5A7A68] hover:text-[#1E382B]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-1.5 ${
              isSignUp
                ? 'bg-[#1E382B] text-white shadow-md'
                : 'text-[#5A7A68] hover:text-[#1E382B]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 mb-4 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
              Username / Phone <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-[#5A7A68]">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. rajesh_contractor"
                className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-bold shadow-xs"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
              Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-[#5A7A68]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-bold shadow-xs"
                required
              />
            </div>
          </div>

          {/* Additional Signup Fields */}
          {isSignUp && (
            <>
              {/* Phone */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#5A7A68]">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-bold shadow-xs"
                  />
                </div>
              </div>

              {/* Site / Project Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                  Site / Project Name
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#5A7A68]">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g. Dream Heights Site 2"
                    className="w-full pl-10 pr-4 py-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-bold shadow-xs"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#1E382B] hover:bg-[#14281E] text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#1E382B]/20 tactile-btn mt-2"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            <span>{loading ? 'Please wait...' : isSignUp ? 'Create New Account' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Login Option */}
        <div className="mt-5 pt-4 border-t border-[#EFEAE1] text-center">
          <p className="text-[11px] text-[#5A7A68] font-medium mb-2">
            Want to test without creating an account?
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="py-2 px-4 bg-[#FAF7F2] border border-[#EFEAE1] text-[#1E382B] font-black rounded-xl text-xs hover:bg-[#E8F5E9] tactile-btn flex items-center justify-center gap-1.5 mx-auto"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E5A44]" />
            <span>Login as Demo Manager (`demo` / `123`)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
