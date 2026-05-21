import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import CrewPage from './CrewPage';
import JobdeskPage from './JobdeskPage';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentScreen, setCurrentScreen] = useState('hub'); 
  const [liveWita, setLiveWita] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); 
  const [selectedRole, setSelectedRole] = useState('crew'); 

  useEffect(() => {
    const clock = setInterval(() => {
      try {
        setLiveWita(new Date().toLocaleTimeString('id-ID', { 
          timeZone: 'Asia/Makassar', 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        }));
      } catch (e) {
        setLiveWita(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('bengon_session');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      const isFrontline = ['crew', 'stocker', 'quality_control', 'cel'].includes(parsed.role);
      setCurrentScreen(isFrontline ? 'absen' : 'hub');
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: username, password });
      if (authError) throw authError;

      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
      if (profile) {
        setUser(profile);
        localStorage.setItem('bengon_session', JSON.stringify(profile));
        
        // KUNCI AKSES KETAT: Crew, Stocker, QC, dan CEL langsung dikunci ke Absen Break tanpa masuk HUB
        const isFrontline = ['crew', 'stocker', 'quality_control', 'cel'].includes(profile.role);
        setCurrentScreen(isFrontline ? 'absen' : 'hub');
      } else {
        setError('Data profil tidak terdaftar pada sistem.');
      }
    } catch (err) { 
      setError('Akses ditolak: Email atau Password salah, Bos!'); 
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName || !selectedRole) {
      return setError('Semua kolom wajib diisi, Bos!');
    }
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: username, password });
      if (authError) throw authError;

      if (authData?.user?.id) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { error: profileError } = await supabase
          .from('users')
          .update({ name: fullName, role: selectedRole })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;

        alert(`Sukses mendaftarkan anggota tim baru: ${fullName}! Silakan dicoba login.`);
        setIsRegisterMode(false);
        setUsername('');
        setPassword('');
        setFullName('');
        setError('');
      } else {
        throw new Error("Sistem Auth gagal memberikan ID User baru.");
      }
    } catch (err) {
      setError('Gagal mendaftar: ' + err.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('hub');
    localStorage.removeItem('bengon_session');
    supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-500 font-mono text-[10px] uppercase tracking-widest">
        Sinkronisasi Operasional Terminal...
      </div>
    );
  }

  if (user) {
    if (currentScreen === 'absen') {
      return <CrewPage user={user} onLogout={handleLogout} onBack={() => setCurrentScreen('hub')} />;
    }
    if (currentScreen === 'jobdesk') {
      return <JobdeskPage user={user} onBack={() => setCurrentScreen('hub')} />;
    }

    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-teal-500/10 blur-[150px] rounded-full"></div>

        <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-2xl flex flex-col justify-between relative z-10">
          <div>
            <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 p-5 rounded-3xl shadow-xl mb-6 relative">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">BPPHAR SYSTEM</p>
                  <h2 className="text-2xl font-black tracking-tight mt-1 capitalize text-white">{user.name}</h2>
                  <span className="inline-block bg-slate-800 border border-slate-700/60 px-3 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider mt-1.5 text-slate-300">
                    Role: {user.role.replace('_',' ')}
                  </span>
                </div>
                <div className="h-14 w-14 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-0.5">
                  <img src={user.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1e293b&color=3b82f6&bold=true`} className="w-full h-full object-cover rounded-xl" alt="" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-800/60 text-center font-mono text-[11px]">
                <div className="bg-slate-950/40 py-2 rounded-xl border border-slate-900">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Hari Ini</p>
                  <p className="font-bold text-slate-300 mt-0.5">{new Date().getDate()} Mei 2026</p>
                </div>
                <div className="bg-slate-950/40 py-2 rounded-xl border border-slate-900">
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Live WITA</p>
                  <p className="font-bold text-blue-400 mt-0.5">{liveWita}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/40 py-3.5 px-4 rounded-2xl flex items-center gap-2.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Terminal Operasional Berjalan Stabil</p>
            </div>

            <div className="space-y-3">
              <button onClick={() => setCurrentScreen('absen')} className="w-full bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl text-left transition-all flex items-center justify-between group shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-xl bg-slate-950 p-3 rounded-xl border border-slate-800/60 group-hover:bg-blue-600/10 transition-colors">☕</span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 group-hover:text-blue-400 transition-colors">Absen Break Tim</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Log Istirahat Kamera & Rekap Skor Poin Kru</p>
                  </div>
                </div>
                <span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all text-xs">→</span>
              </button>

              <button onClick={() => setCurrentScreen('jobdesk')} className="w-full bg-slate-900/40 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl text-left transition-all flex items-center justify-between group shadow-lg">
                <div className="flex items-center gap-4">
                  <span className="text-xl bg-slate-950 p-3 rounded-xl border border-slate-800/60 group-hover:bg-blue-600/10 transition-colors">📋</span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 group-hover:text-blue-400 transition-colors">Jobdesk Tracking</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Lembar Kerja Management & Kecepatan Target KPI</p>
                  </div>
                </div>
                <span className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all text-xs">→</span>
              </button>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full mt-8 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors text-center">
            Keluar Sesi Kerja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a11] flex justify-center items-center p-4 font-sans">
      <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl">
        
        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-white tracking-widest uppercase">BPPHAR SYSTEM</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            {isRegisterMode ? 'Tambahkan Anggota Tim Kerja Baru' : 'Sistem Otomatisasi Operasional Resto'}
          </p>
        </div>

        {isRegisterMode ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Nama Lengkap Anggota</label>
              <input type="text" placeholder="Nama lengkap..." value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-slate-600" />
            </div>
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Email Kerja (Untuk ID Login)</label>
              <input type="email" placeholder="contoh@email.com" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-slate-600" />
            </div>
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Password Sesi</label>
              <input type="password" placeholder="Minimal 6 karakter..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-slate-600 font-mono" />
            </div>
            
            <div>
              <label className="block text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Pilih Jabatan Kerja</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-2.5 text-slate-400 text-xs outline-none focus:border-slate-600 font-bold">
                <option value="crew">Crew</option>
                <option value="stocker">Stocker</option>
                <option value="quality_control">Quality Control</option>
                <option value="cel">Cel</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {error && <p className="text-rose-400 text-[10px] text-center font-mono font-bold">❌ {error}</p>}

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all mt-2">
              ✓ Daftarkan Anggota
            </button>
            <button type="button" onClick={() => { setIsRegisterMode(false); setError(''); }} className="w-full text-slate-500 hover:text-slate-400 text-[10px] font-bold uppercase tracking-wide text-center mt-2">
              Kembali ke Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Email / ID Kerja..." value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-slate-600 font-medium" />
            <input type="password" placeholder="Sandi Pengaman..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800/60 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-slate-600 font-mono" />
            
            {error && <p className="text-rose-400 text-[10px] text-center font-mono font-bold">❌ {error}</p>}
            
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">
              Masuk Dashboard Utama
            </button>
            
            <div className="text-center pt-3">
              <button type="button" onClick={() => { setIsRegisterMode(true); setError(''); }} className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Belum punya akun? Daftar Tim Baru →
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}