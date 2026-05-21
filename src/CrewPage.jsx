import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { supabase } from './SupabaseClient';

// --- Komponen Ikon Premium SVG ---
const CoffeeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
);
const WorkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
);
const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

export default function CrewPage({ user, onLogout }) {
  const [currentBreak, setCurrentBreak] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ efficient: [], undisciplined: [] });
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('Standby Kerja');
  const [timer, setTimer] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('start');
  const [hasReminded, setHasReminded] = useState(false);
  const [dailyQuote, setDailyQuote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [dbUserPoints, setDbUserPoints] = useState(100);
  const [dbProfileUrl, setDbProfileUrl] = useState(null);
  const [greeting, setGreeting] = useState('Selamat Bekerja');

  const [searchName, setSearchName] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterTime, setFilterTime] = useState('month');
  const [filterDate, setFilterDate] = useState('');

  const webcamRef = useRef(null);
  const profileInputRef = useRef(null);

  const quotesPool = [
    "Halo! Semangat kerjanya ya, yuk fokus berikan pelayanan terbaik hari ini! 🔥",
    "Kerja keras hari ini adalah modal sukses masa depanmu. 😊",
    "Jaga kekompakan tim di lapangan ya! Kerja solid, hasil pasti selangit. 🚀",
    "Setiap kontribusi kecilmu sangat berarti untuk kemajuan bersama. Mantap! 👍",
    "Fokus pada solusi, bukan hambatan di lapangan. 💪",
    "Utamakan keselamatan kerja dan kualitas pelayanan ya, Bos! ✨",
    "Kerja cerdas, kerja ikhlas. Energi positifmu menular ke seluruh tim! 🤝"
  ];

  const toWITATime = (dateObj) => {
    try {
      return new Date(dateObj.toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
    } catch (e) {
      return dateObj;
    }
  };

  useEffect(() => {
    fetchUserDBData();
    fetchActiveBreak();
    fetchMetrics();
    
    const dayIndex = new Date().getDate() % quotesPool.length;
    setDailyQuote(quotesPool[dayIndex]);

    const clock = setInterval(() => {
      const nowWITA = toWITATime(new Date());
      setCurrentTime(nowWITA);
      
      const hrs = nowWITA.getHours();
      if (hrs >= 4 && hrs < 11) setGreeting('Selamat Pagi');
      else if (hrs >= 11 && hrs < 15) setGreeting('Selamat Siang');
      else if (hrs >= 15 && hrs < 18) setGreeting('Selamat Sore');
      else setGreeting('Selamat Malam');
    }, 1000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [searchName, filterRole, filterTime, filterDate, currentTime, currentBreak]);

  useEffect(() => {
    let interval;
    if (currentBreak) {
      interval = setInterval(() => {
        const start = toWITATime(new Date(currentBreak.start_time)).getTime();
        const now = toWITATime(new Date()).getTime();
        const diffInSeconds = Math.floor((now - start) / 1000);
        setTimer(diffInSeconds);

        const diffInMinutes = Math.floor(diffInSeconds / 60);

        if (diffInMinutes >= 55 && diffInMinutes < 60 && !hasReminded) {
          alert(`Halo ${user.name}, waktu istirahat tinggal 5 menit lagi ya! Yuk bersiap-siap kembali ke station kerja.`);
          setHasReminded(true);
        }

        if (diffInMinutes >= 60) {
          setStatus('Waktu Break Habis (Over!)');
        } else {
          setStatus('Sedang Istirahat');
        }
      }, 1000);
    } else {
      setStatus('Standby Kerja');
      setTimer(0);
      setHasReminded(false);
    }
    return () => clearInterval(interval);
  }, [currentBreak, hasReminded]);

  const fetchUserDBData = async () => {
    const { data } = await supabase.from('users').select('points, profile_url').eq('id', user.id).maybeSingle();
    if (data) {
      if (data.points !== undefined && data.points !== null) setDbUserPoints(data.points);
      if (data.profile_url) setDbProfileUrl(data.profile_url);
    }
  };

  const fetchActiveBreak = async () => {
    const { data } = await supabase.from('break_logs').select('*').eq('user_id', user.id).eq('status', 'on_break').maybeSingle();
    if (data) setCurrentBreak(data);
  };

  const fetchHistory = async () => {
    let query = supabase.from('break_logs').select('*, users(name, role)');

    if (searchName.trim() !== '' || filterRole !== 'all') {
      let userQuery = supabase.from('users').select('id');
      if (searchName.trim() !== '') userQuery = userQuery.ilike('name', `%${searchName}%`);
      if (filterRole !== 'all') userQuery = userQuery.eq('role', filterRole);
      
      const { data: usersData } = await userQuery;
      const userIds = usersData?.map(u => u.id) || [];
      query = query.in('user_id', userIds);
    }

    if (filterDate) {
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.gte('start_time', startOfDay.toISOString()).lte('start_time', endOfDay.toISOString());
    } else {
      const now = new Date();
      if (filterTime === 'day') {
        now.setHours(0, 0, 0, 0);
        query = query.gte('start_time', now.toISOString());
      } else if (filterTime === 'week') {
        query = query.gte('start_time', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
      } else if (filterTime === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('start_time', thirtyDaysAgo.toISOString());
      }
    }

    const { data } = await query.order('start_time', { ascending: false });
    if (data) setHistory(data);
  };

  const fetchMetrics = async () => {
    const { data: logs } = await supabase.from('break_logs').select('*, users(name, role)');
    if (!logs) return;

    const stats = {};
    logs.forEach(log => {
      if (!stats[log.user_id]) {
        stats[log.user_id] = { name: log.users?.name, role: log.users?.role, totalOverMinutes: 0, violationCount: 0 };
      }
      if (log.end_time) {
        const duration = (new Date(log.end_time) - new Date(log.start_time)) / 60000;
        const overTime = Math.max(0, duration - 60);
        stats[log.user_id].totalOverMinutes += overTime;
        if (overTime > 2) stats[log.user_id].violationCount += 1;
      }
    });

    const sorted = Object.values(stats);
    setLeaderboard({
      efficient: [...sorted].sort((a, b) => a.totalOverMinutes - b.totalOverMinutes).slice(0, 3),
      undisciplined: [...sorted].filter(u => u.violationCount > 0).sort((a, b) => b.violationCount - a.violationCount).slice(0, 3)
    });
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `profiles/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('break-photos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('break-photos').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('users').update({ profile_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;

      setDbProfileUrl(publicUrl);
      alert("Foto profil kamu berhasil diperbarui, Bos!");
    } catch (err) {
      alert("Gagal unggah foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const syncPointsToDatabase = async (startTimeStr, endTimeStr) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);
    const durationMinutes = (end - start) / 60000;

    let pointChange = 0;
    if (durationMinutes > 60) {
      const lateMins = Math.ceil(durationMinutes - 60);
      pointChange = -lateMins; 
    } else {
      pointChange = 10;
    }

    const finalPoints = dbUserPoints + pointChange;
    const { error } = await supabase.from('users').update({ points: finalPoints }).eq('id', user.id);
    if (!error) setDbUserPoints(finalPoints);
  };

  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
  };

  const handleCaptureSelfie = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return alert("Kamera error, coba klik ulang.");

    try {
      setUploading(true);
      const blob = dataURLtoBlob(imageSrc);
      const fileName = `${user.id}-${Date.now()}-${cameraMode}.jpg`;
      const filePath = `selfies/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('break-photos').upload(filePath, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('break-photos').getPublicUrl(filePath);

      if (cameraMode === 'start') {
        const { data, error: insertError } = await supabase
          .from('break_logs')
          .insert([{
            user_id: user.id,
            start_time: new Date().toISOString(),
            status: 'on_break',
            photo_url: publicUrl
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setCurrentBreak(data);
      } else {
        const endTime = new Date();
        const startTime = new Date(currentBreak.start_time);
        const diffInMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
        const finalStatus = diffInMinutes > 60 ? 'over_break' : 'completed';

        // UPDATE DATABASE UNTUK MENYIMPAN FOTO KEDUA
        const { error: updateError } = await supabase
          .from('break_logs')
          .update({ 
            end_time: endTime.toISOString(), 
            status: finalStatus,
            photo_end_url: publicUrl
          })
          .eq('id', currentBreak.id);

        if (updateError) throw updateError;
        
        await syncPointsToDatabase(currentBreak.start_time, endTime.toISOString());
        setCurrentBreak(null);
        fetchMetrics();
      }
      setShowCamera(false);
    } catch (error) {
      alert("Error sistem: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const triggerCamera = (mode) => {
    setCameraMode(mode);
    setShowCamera(true);
  };

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBadge = () => {
    const pts = dbUserPoints;
    if (pts >= 250) return { label: 'Kru Teladan Emas', color: 'from-amber-500 to-orange-600' };
    if (pts >= 150) return { label: 'Kru Disiplin', color: 'from-emerald-500 to-teal-600' };
    if (pts < 80) return { label: 'Butuh Pengawasan', color: 'from-rose-500 to-red-600' };
    return { label: 'Kru Standar', color: 'from-slate-600 to-slate-700' };
  };

  const renderLiveStatusOrDuration = (log) => {
    if (log.end_time) {
      const duration = Math.round((new Date(log.end_time) - new Date(log.start_time)) / 60000);
      return `${duration} menit`;
    }
    const elapsedSeconds = Math.floor((currentTime.getTime() - new Date(log.start_time).getTime()) / 1000);
    const remainingSeconds = (60 * 60) - elapsedSeconds;

    if (remainingSeconds <= 0) {
      const overSeconds = Math.abs(remainingSeconds);
      return <span className="text-rose-400 font-black animate-pulse">Lewat {Math.floor(overSeconds / 60)}m {overSeconds % 60}s!</span>;
    } else {
      return (
        <div className="flex flex-col">
          <span className="text-blue-400 font-mono font-black tracking-tight animate-pulse">Sisa {Math.floor(remainingSeconds / 60)}m {remainingSeconds % 60}s</span>
          <span className="text-[9px] text-slate-500 font-normal">Jalan: {Math.floor(elapsedSeconds / 60)}m</span>
        </div>
      );
    }
  };

  // PERBAIKAN LOGIKA AVATAR PROFIL (TIDAK AKAN MENGAMBIL FOTO BREAK LAGI)
  const getProfileAvatar = () => {
    if (dbProfileUrl) return dbProfileUrl;
    // Jika belum upload, beri inisial bawaan yang profesional
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&bold=true`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased pb-12">
      
      {/* NAVBAR */}
      <nav className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-blue-500/50 shadow-md bg-slate-800">
              <img src={getProfileAvatar()} className="w-full h-full object-cover" alt="User Profile" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-300">{greeting}, <span className="text-blue-400 font-black">{user.name}</span></span>
                <span className="px-2 py-0.5 rounded text-[8px] font-black font-mono bg-blue-600/20 text-blue-400 border border-blue-500/30 uppercase">
                  {user.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Zona Waktu: WITA (Asia/Makassar)</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 hover:bg-rose-600/20 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all">
            Keluar Aplikasi
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Banner Motivasi */}
        <div className="mb-6 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/40 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30 text-blue-400 text-lg">💡</div>
          <p className="text-xs sm:text-sm font-medium text-slate-200 tracking-wide italic">"{dailyQuote}"</p>
        </div>

        {/* KARTU PROFIL MANDIRI */}
        <div className="mb-6 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-4 col-span-1 border-r border-slate-800 pb-4 md:pb-0">
            <div className="relative">
              <img src={getProfileAvatar()} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow" alt="" />
              <button 
                onClick={() => profileInputRef.current.click()}
                className="absolute -bottom-1.5 -right-1.5 bg-blue-600 p-1.5 rounded-lg border border-slate-900 text-white hover:bg-blue-500 transition-colors"
                title="Ganti Foto Profil"
              >
                <CameraIcon />
              </button>
              <input type="file" hidden ref={profileInputRef} accept="image/*" onChange={handleProfileImageUpload} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{user.name}</h3>
              <p className="text-xs text-slate-400 capitalize mt-0.5 font-medium">Jabatan: <span className="text-slate-200 font-bold uppercase">{user.role.replace('_',' ')}</span></p>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-start col-span-1 border-r border-slate-800 pb-4 md:pb-0 justify-center">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1.5">Badge Keaktifan Bulan Ini</span>
            <span className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-wide text-white bg-gradient-to-r shadow-md shadow-black/20 ${getBadge().color}`}>
              👑 {getBadge().label}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center col-span-1">
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Poin Reward Lapangan</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black font-mono tracking-tight ${dbUserPoints >= 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {dbUserPoints}
              </span>
              <span className="text-xs text-slate-500 font-bold uppercase">PTS</span>
            </div>
            <p className="text-[9px] text-slate-500 font-medium text-center mt-1">
              ( Tepat Waktu: <span className="text-emerald-500">+10 Pts</span> | Terlambat: <span className="text-rose-500">-1 Pts/Menit</span> )
            </p>
          </div>
        </div>

        {/* WORKSPACE OPERASIONAL TERMINAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-slate-800/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between min-h-[380px]">
              <div className="text-center w-full">
                <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Status Kamu Sekarang</h2>
                
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold text-[11px] uppercase border
                  ${status === 'Standby Kerja' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                  ${status === 'Sedang Istirahat' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : ''}
                  ${status === 'Waktu Break Habis (Over!)' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : ''}
                `}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status === 'Standby Kerja' ? 'bg-emerald-400' : status === 'Sedang Istirahat' ? 'bg-blue-400' : 'bg-rose-400'}`}></span>
                  {status}
                </div>

                {timer > 0 && (
                  <div className="mt-5 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Durasi Istirahat (Maks 60 Menit)</p>
                    <span className="text-3xl font-mono font-black text-white tracking-tight">{formatTimer(timer)}</span>
                  </div>
                )}
              </div>

              {showCamera && (
                <div className="my-3 overflow-hidden rounded-xl border border-blue-500/40 shadow-md relative bg-slate-950">
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full object-cover scale-x-[-1]" />
                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] text-blue-400 font-bold uppercase">
                    Mode: {cameraMode === 'start' ? 'Masuk Break' : 'Kembali Kerja'}
                  </div>
                </div>
              )}

              <div className="w-full mt-4">
                {!currentBreak ? (
                  !showCamera ? (
                    <button onClick={() => triggerCamera('start')} className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/10 transition-all text-xs tracking-wide uppercase">
                      <CoffeeIcon /> Mulai Istirahat
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setShowCamera(false)} className="w-1/3 bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded-xl transition text-xs font-bold uppercase">Batal</button>
                      <button onClick={handleCaptureSelfie} disabled={uploading} className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition text-xs tracking-wide uppercase">
                        {uploading ? 'Mengunci...' : 'Foto & Mulai'}
                      </button>
                    </div>
                  )
                ) : (
                  !showCamera ? (
                    <button onClick={() => triggerCamera('end')} className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs tracking-wide uppercase">
                      <WorkIcon /> Selesai Istirahat
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setShowCamera(false)} className="w-1/3 bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded-xl transition text-xs font-bold uppercase">Batal</button>
                      <button onClick={handleCaptureSelfie} disabled={uploading} className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition text-xs tracking-wide uppercase">
                        {uploading ? 'Verifikasi...' : 'Foto & Kerja'}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl h-full flex flex-col">
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300 mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/80"></span>
                </span>
                Live Monitor Break Tim
              </h3>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs text-slate-400">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-2 font-mono text-[10px] uppercase">
                      <th className="p-3">Foto Mulai</th>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Jam Mulai (WITA)</th>
                      <th className="p-3">Lama Break / Sisa Waktu</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {history.filter(h => !h.end_time).length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-slate-500 font-medium">Saat ini tidak ada rekan tim yang sedang beristirahat.</td></tr>
                    ) : (
                      history.filter(h => !h.end_time).map((log) => {
                        const start = toWITATime(new Date(log.start_time));
                        return (
                          <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-3">
                              <img src={log.photo_url} className="h-9 w-9 rounded-xl object-cover border border-slate-700 shadow-sm" alt="Start" />
                            </td>
                            <td className="p-3 font-bold text-slate-200">{log.users?.name} {log.user_id === user.id && <span className="text-[10px] text-blue-400 font-normal ml-1">(Kamu)</span>}</td>
                            <td className="p-3 font-mono text-slate-400">
                              {start.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: "Asia/Makassar" })}
                            </td>
                            <td className="p-3 font-bold">{renderLiveStatusOrDuration(log)}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">istirahat</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* METRIK TIM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-slate-800/20 border border-slate-800/60 p-5 rounded-2xl shadow-md">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-3 uppercase tracking-wider">🏆 Peringkat Poin Tertinggi (Bakal Dapat Penghargaan)</h3>
            <div className="divide-y divide-slate-800/40 text-xs">
              {leaderboard.efficient.slice(0, 2).map((u, i) => (
                <div key={i} className="py-2.5 flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">{i + 1}. {u.name}</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold text-[10px]">Tepat Waktu (+10 Pts)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/20 border border-slate-800/60 p-5 rounded-2xl shadow-md">
            <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 mb-3 uppercase tracking-wider">⚠️ Peringkat Kru Paling Bebal (Lebih Dari 60m)</h3>
            <div className="divide-y divide-slate-800/40 text-xs">
              {leaderboard.undisciplined.length === 0 ? (
                <p className="text-slate-500 text-center py-4 font-medium">Bulan ini belum ada data kru bebal. Pertahankan! 👍</p>
              ) : (
                leaderboard.undisciplined.slice(0, 2).map((u, i) => (
                  <div key={i} className="py-2.5 flex justify-between items-center px-1">
                    <span className="font-semibold text-slate-300">{i + 1}. {u.name}</span>
                    <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold">{u.violationCount}x Melanggar</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODUL ARSIP SEJARAH DAN LIVE SEARCH */}
        <div className="bg-slate-800/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl mt-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 pb-3 border-b border-slate-800/60">
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                📁 Riwayat & Pencarian Arsip Break Lengkap
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Audit data absen seluruh kru, manager, dan struktur berdasarkan periode waktu tanggal</p>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
              <input 
                type="text" 
                placeholder="Cari nama kru..." 
                value={searchName} 
                onChange={(e) => setSearchName(e.target.value)} 
                className="border border-slate-800 px-3 py-1.5 rounded-xl text-xs bg-transparent text-slate-200 outline-none focus:border-blue-500 transition-colors w-32" 
              />
              
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)} 
                className="border border-slate-800 px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-slate-300 outline-none focus:border-blue-500"
              >
                <option value="all">Semua Jabatan</option>
                <option value="crew">Crew</option>
                <option value="new_structure">New Structure</option>
                <option value="manager">Manager</option>
              </select>

              <select 
                value={filterTime} 
                disabled={!!filterDate}
                onChange={(e) => setFilterTime(e.target.value)} 
                className="border border-slate-800 px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-slate-300 outline-none focus:border-blue-500 disabled:opacity-40"
              >
                <option value="day">Hari Ini</option>
                <option value="week">7 Hari Terakhir</option>
                <option value="month">30 Hari Terakhir</option>
              </select>

              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={(e) => setFilterDate(e.target.value)} 
                  className="bg-transparent border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 outline-none focus:border-blue-500 cursor-pointer" 
                  style={{ colorScheme: 'dark' }}
                />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="text-[10px] text-rose-400 font-bold hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg">Reset</button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 pb-2 font-mono text-[10px] uppercase bg-slate-950/20">
                  <th className="p-3">Bukti Foto (Mulai - Selesai)</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Tanggal & Waktu (WITA)</th>
                  <th className="p-3">Total Durasi</th>
                  <th className="p-3">Status Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 font-medium">
                      Data tidak ditemukan. Silakan sesuaikan kembali filter pencarian.
                    </td>
                  </tr>
                ) : (
                  history.map((log) => {
                    const start = toWITATime(new Date(log.start_time));
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-all duration-150">
                        <td className="p-3">
                          <div className="flex gap-2">
                            <a href={log.photo_url} target="_blank" rel="noreferrer" className="inline-block" title="Foto Mulai Break">
                              <img src={log.photo_url} className="h-8 w-8 object-cover rounded-lg border border-slate-700 shadow-sm" alt="Mulai" />
                            </a>
                            {log.photo_end_url ? (
                              <a href={log.photo_end_url} target="_blank" rel="noreferrer" className="inline-block" title="Foto Selesai Break">
                                <img src={log.photo_end_url} className="h-8 w-8 object-cover rounded-lg border border-slate-700 shadow-sm" alt="Selesai" />
                              </a>
                            ) : (
                              <div className="h-8 w-8 rounded-lg border border-slate-700 border-dashed flex items-center justify-center bg-slate-800/50 text-[8px] text-slate-500" title="Belum Selesai">-</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-200">{log.users?.name}</td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-400">
                            {log.users?.role === 'new_structure' ? 'New Structure' : log.users?.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {start.toLocaleDateString('id-ID')} — {start.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: "Asia/Makassar" })}
                        </td>
                        <td className="p-3 font-bold text-slate-300">
                          {log.end_time ? `${Math.round((new Date(log.end_time) - new Date(log.start_time)) / 60000)} menit` : <span className="text-blue-400 font-medium animate-pulse">Berjalan...</span>}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider
                            ${log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                            ${log.status === 'over_break' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                            ${log.status === 'on_break' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                          `}>
                            {log.status === 'over_break' ? 'lewat batas' : log.status === 'on_break' ? 'berjalan' : 'selesai'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}