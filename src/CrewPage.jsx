import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { supabase } from './SupabaseClient';

// --- Komponen Ikon Premium SVG untuk Bottom Navigation ---
const BreakIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
);
const LiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="15" x="2" y="3" rx="2" ry="2"/><polyline points="12 18 12 21"/><polyline points="17 21 7 21"/></svg>
);
const RankIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a5 5 0 0 0-5 5v5a5 5 0 0 0 10 0V7a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/></svg>
);
const LogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

// Ikon tambahan untuk tombol ubah foto profil
const CameraSmallIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

export default function CrewPage({ user, onLogout, onBack }) {
  // Ambil tab terakhir yang disimpan di localStorage agar ketika di-reload tidak melompat halamannya
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('bengon_active_tab') || 'break';
  });

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

  // State Filter History Log
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

  // Simpan riwayat tab aktif saat ini ke local storage agar persisten sewaktu direfresh
  useEffect(() => {
    localStorage.setItem('bengon_active_tab', activeTab);
  }, [activeTab]);

  // --- AI VOICE REMINDER TEXT-TO-SPEECH ---
  const playAlarmSound = (type, crewName = '') => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;

      synth.cancel(); 

      let textToSpeak = '';
      if (type === 'warning') {
        textToSpeak = `Perhatian untuk ${crewName}. Waktu istirahat Anda sisa lima menit lagi. Ayo siap-siap masuk dan kembali ke posisi kerja. Terima kasih.`;
      } else if (type === 'over') {
        textToSpeak = `Peringatan darurat. ${crewName} waktu istirahat Anda telah habis dan melewati batas! Segera kembali ke stasiun kerja sekarang juga!`;
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'id-ID'; 
      utterance.rate = 1.0;     
      utterance.pitch = 1.1;    

      synth.speak(utterance);
    } catch (e) {
      console.log("AI Speech diblokir browser.");
    }
  };

  // --- FUNGSI GEOTAG LOCK LOKASI GPS ---
  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
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
      const location = await getCurrentLocation();

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
            photo_url: publicUrl,
            latitude: location.lat,
            longitude: location.lng
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setCurrentBreak(data);
      } else {
        const endTime = new Date();
        const finalStatus = (endTime - new Date(currentBreak.start_time)) / 60000 > 60 ? 'over_break' : 'completed';

        const { error: updateError } = await supabase
          .from('break_logs')
          .update({ 
            end_time: endTime.toISOString(), 
            status: finalStatus,
            photo_end_url: publicUrl,
            latitude_end: location.lat,
            longitude_end: location.lng
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

    const start = new Date(log.start_time).getTime();
    const now = new Date().getTime();
    const elapsedSeconds = Math.floor((now - start) / 1000);
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const targetName = log.users?.name || 'Crew';

    if (elapsedMinutes >= 55 && elapsedMinutes < 60) {
      if (elapsedSeconds % 20 === 0) playAlarmSound('warning', targetName);
    }

    if (elapsedMinutes >= 60) {
      if (elapsedSeconds % 10 === 0) playAlarmSound('over', targetName);
    }

    if (elapsedMinutes < 60) {
      const remainingSeconds = (60 * 60) - elapsedSeconds;
      const remMins = Math.floor(remainingSeconds / 60);
      const remSecs = remainingSeconds % 60;
      
      return (
        <div className="flex flex-col">
          {elapsedMinutes >= 55 ? (
            <div className="text-amber-400 font-mono font-black tracking-tight animate-bounce flex flex-col">
              <span>⚠️ SIAP MASUK! ({remMins}m {remSecs}s)</span>
              <span className="text-[8px] bg-amber-500/10 border border-amber-500/30 text-center py-0.5 rounded mt-1 font-sans font-normal text-slate-300">
                Rapikan station kerja!
              </span>
            </div>
          ) : (
            <>
              <span className="text-blue-400 font-mono font-black tracking-tight animate-pulse">Sisa {remMins}m {remSecs}s</span>
              <span className="text-[9px] text-slate-500 font-normal">Jalan: {elapsedMinutes}m</span>
            </>
          )}
        </div>
      );
    } else {
      const overMinutes = elapsedMinutes - 60;
      const overSeconds = elapsedSeconds % 60;
      return (
        <div className="flex flex-col items-end">
          <span className="text-rose-400 font-black animate-pulse tracking-tighter">
            🚨 OVER BREAK {overMinutes}m {overSeconds}s!
          </span>
          <span className="text-[8px] bg-rose-500/20 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded mt-1 font-bold">
            ALARM AKTIF CALL MANAGER
          </span>
        </div>
      );
    }
  };

  const getProfileAvatar = () => {
    if (dbProfileUrl) return dbProfileUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0D8ABC&color=fff&bold=true`;
  };

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 font-sans pb-24 relative overflow-hidden flex flex-col justify-between">
      
      <div className="bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-xl px-5 py-4 flex justify-between items-center sticky top-0 z-50 max-w-md w-full mx-auto rounded-b-2xl">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-blue-400 font-bold uppercase">BPPHAR SYSTEM</span>
          <h1 className="text-sm font-black text-white tracking-tight mt-0.5 capitalize">Halo, {user.name}</h1>
        </div>
        <div className="flex gap-1.5">
          {user.role === 'manager' && (
            <button onClick={onBack} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-400">Hub</button>
          )}
          <button onClick={onLogout} className="bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/30 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-400">Keluar</button>
        </div>
      </div>

      <div className="flex-1 p-5 max-w-md w-full mx-auto">

        {/* TAB 1: BREAK */}
        {activeTab === 'break' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-900/20 to-slate-900/40 border border-slate-800/60 p-4 rounded-2xl flex items-center gap-3 shadow-md">
              <span className="text-base">💡</span>
              <p className="text-[11px] font-medium text-slate-300 italic">"{dailyQuote}"</p>
            </div>

            <div className="text-center py-1">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-[10px] uppercase border
                ${status === 'Standby Kerja' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                ${status === 'Sedang Istirahat' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : ''}
                ${status === 'Waktu Break Habis (Over!)' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : ''}
              `}>
                <span className={`h-1.5 w-1.5 rounded-full ${status === 'Standby Kerja' ? 'bg-emerald-400' : status === 'Sedang Istirahat' ? 'bg-blue-400' : 'bg-rose-400'}`}></span>
                {status}
              </div>
            </div>

            <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/80 p-8 rounded-[2.5rem] shadow-2xl text-center backdrop-blur-xl relative">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">DURASI ISTIRAHAT (MAKS 60 MENIT)</p>
              <div className="text-5xl font-mono font-black text-white tracking-tight">
                {formatTimer(timer)}
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full mt-6 overflow-hidden p-0.5 border border-slate-900">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${timer > 3600 ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`}
                  style={{ width: `${Math.min((timer / 3600) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {showCamera && (
              <div className="overflow-hidden rounded-2xl border border-blue-500/40 shadow-lg relative bg-slate-950">
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: "user" }} className="w-full object-cover scale-x-[-1]" />
                <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] text-blue-400 font-bold uppercase tracking-wide">
                  📍 GEOTAG LOCK AKTIF
                </div>
              </div>
            )}

            <div className="pt-2">
              {!currentBreak ? (
                !showCamera ? (
                  <button onClick={() => triggerCamera('start')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-4 rounded-2xl shadow-xl transition-all text-xs tracking-widest uppercase">
                    ☕ Ambil Absen Break Sekarang
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setShowCamera(false)} className="w-1/3 bg-slate-800 border border-slate-700 text-slate-400 py-4 rounded-2xl text-xs font-bold">Batal</button>
                    <button onClick={handleCaptureSelfie} disabled={uploading} className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition text-xs tracking-widest">
                      {uploading ? 'Mengunci GPS...' : 'Foto & Mulai Break'}
                    </button>
                  </div>
                )
              ) : (
                !showCamera ? (
                  <button onClick={() => triggerCamera('end')} className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-4 px-4 rounded-2xl shadow-xl transition-all text-xs tracking-widest">
                    🧳 Selesai Istirahat (Kembali Kerja)
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setShowCamera(false)} className="w-1/3 bg-slate-800 border border-slate-700 text-slate-400 py-4 rounded-2xl text-xs font-bold">Batal</button>
                    <button onClick={handleCaptureSelfie} disabled={uploading} className="w-2/3 bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition text-xs tracking-widest">
                      {uploading ? 'Verifikasi GPS...' : 'Foto & Selesai'}
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500/80"></span>
              </span>
              Live Monitor Break Tim Resto
            </h3>

            {history.filter(h => !h.end_time).length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium font-mono">
                Saat ini tidak ada rekan tim yang sedang beristirahat.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.filter(h => !h.end_time).map((log) => {
                  const start = toWITATime(new Date(log.start_time));
                  return (
                    <div key={log.id} className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-blue-500">
                      <div className="flex items-center gap-3">
                        <img src={log.photo_url} className="h-10 w-10 rounded-xl object-cover border border-slate-700 shadow-sm" alt="" />
                        <div>
                          <h4 className="text-xs font-black text-white capitalize">{log.users?.name} {log.user_id === user.id && <span className="text-[9px] text-blue-400 font-normal">(Kamu)</span>}</h4>
                          <p className="text-[9px] font-mono font-bold text-slate-500 uppercase mt-0.5">{log.users?.role.replace('_',' ')}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <p className="text-[10px] text-slate-400 font-bold">{start.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="mt-1 text-[11px] font-bold">{renderLiveStatusOrDuration(log)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-3 flex items-center gap-1.5">🏆 Peringkat Poin Tertinggi</h4>
              <div className="divide-y divide-slate-800/40 text-xs">
                {leaderboard.efficient.slice(0, 3).map((u, i) => (
                  <div key={i} className="py-2.5 flex justify-between items-center">
                    <span className="font-bold text-slate-300">{i + 1}. {u.name} <span className="text-[8px] font-mono text-slate-500 uppercase">({u.role})</span></span>
                    <span className="text-emerald-400 font-mono font-bold text-[10px]">Tepat Waktu (+10 Pts)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl shadow-sm">
              <h4 className="text-xs font-black uppercase text-rose-400 tracking-wider mb-3 flex items-center gap-1.5">⚠️ Peringkat Kru Paling Bebal (&gt;60m)</h4>
              <div className="divide-y divide-slate-800/40 text-xs">
                {leaderboard.undisciplined.length === 0 ? (
                  <p className="text-slate-500 text-center py-4 font-medium">Buku pelanggaran bersih. Pertahankan! 👍</p>
                ) : (
                  leaderboard.undisciplined.slice(0, 3).map((u, i) => (
                    <div key={i} className="py-2.5 flex justify-between items-center">
                      <span className="font-bold text-slate-300">{i + 1}. {u.name}</span>
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded text-[10px] font-mono font-bold">{u.violationCount}x Melanggar</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl space-y-2 flex flex-col">
              <input type="text" placeholder="Cari nama kru..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="border border-slate-800 px-3 py-2 rounded-xl text-xs bg-slate-950 text-slate-200 outline-none focus:border-blue-500 w-full" />
              <div className="grid grid-cols-2 gap-2">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border border-slate-800 px-3 py-2 rounded-xl text-xs bg-slate-950 text-slate-400 font-bold outline-none">
                  <option value="all">Semua Jabatan</option>
                  <option value="crew">Crew</option>
                  <option value="stocker">Stocker</option>
                  <option value="quality_control">QC</option>
                  <option value="cel">Cel</option>
                  <option value="manager">Manager</option>
                </select>
                <select value={filterTime} disabled={!!filterDate} onChange={(e) => setFilterTime(e.target.value)} className="border border-slate-800 px-3 py-2 rounded-xl text-xs bg-slate-950 text-slate-400 font-bold outline-none disabled:opacity-40">
                  <option value="day">Hari Ini</option>
                  <option value="week">7 Hari Lalu</option>
                  <option value="month">30 Hari Lalu</option>
                </select>
              </div>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300 outline-none cursor-pointer" style={{ colorScheme: 'dark' }} />
              {filterDate && <button onClick={() => setFilterDate('')} className="text-[10px] text-rose-400 font-bold py-1 bg-rose-500/10 rounded-lg">Reset Kalender</button>}
            </div>

            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">Arsip data tidak ditemukan.</div>
              ) : (
                history.map((log) => {
                  const start = toWITATime(new Date(log.start_time));
                  return (
                    <div key={log.id} className="bg-slate-900/30 border border-slate-800/60 p-4 rounded-xl flex flex-col gap-3 font-mono text-xs shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-200 capitalize">{log.users?.name}</h4>
                          <span className="text-[8px] uppercase font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 inline-block mt-1">{log.users?.role.replace('_',' ')}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border
                          ${log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                          ${log.status === 'over_break' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : ''}
                          ${log.status === 'on_break' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                        `}>
                          {log.status === 'over_break' ? 'lewat batas' : log.status === 'on_break' ? 'berjalan' : 'selesai'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950/40 p-2 rounded-xl border border-slate-900/50">
                        <div className="flex gap-2">
                          <a href={log.photo_url} target="_blank" rel="noreferrer" title="Foto Mulai">
                            <img src={log.photo_url} className="h-9 w-9 object-cover rounded-lg border border-slate-700 shadow" alt="In" />
                          </a>
                          {log.photo_end_url ? (
                            <a href={log.photo_end_url} target="_blank" rel="noreferrer" title="Foto Selesai">
                              <img src={log.photo_end_url} className="h-9 w-9 object-cover rounded-lg border border-slate-700 shadow" alt="Out" />
                            </a>
                          ) : (
                            <div className="h-9 w-9 rounded-lg border border-slate-800 border-dashed flex items-center justify-center text-[8px] text-slate-600 font-sans">Jalan...</div>
                          )}
                        </div>
                        
                        {log.latitude && (
                          <a 
                            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[9px] font-sans font-bold text-blue-400 bg-blue-950/40 px-2.5 py-1.5 rounded-lg border border-blue-900/40 hover:bg-blue-900/20"
                          >
                            📍 Lokasi GPS
                          </a>
                        )}
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-900/60 pt-2 font-mono">
                        <span>{start.toLocaleDateString('id-ID')} ({start.toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit' })})</span>
                        <span className="font-black text-slate-300">{log.end_time ? `${Math.round((new Date(log.end_time) - new Date(log.start_time)) / 60000)} menit` : 'Berjalan...'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE CARD INTEGRATED (FIXED BLANK BUG) */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 p-6 rounded-[2rem] shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-600/10 to-teal-500/10 blur-xl"></div>
              
              <div className="relative h-20 h-20 w-20 mx-auto mb-3 z-10">
                <img src={getProfileAvatar()} className="w-full h-full object-cover rounded-2xl border-2 border-slate-700 shadow-md" alt="" />
                <button onClick={() => profileInputRef.current.click()} className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-lg border border-slate-900 text-white hover:bg-blue-500 shadow-lg flex items-center justify-center">
                  <CameraSmallIcon />
                </button>
                <input type="file" hidden ref={profileInputRef} accept="image/*" onChange={handleProfileImageUpload} disabled={uploading} />
              </div>

              <h2 className="text-base font-black tracking-tight text-white capitalize">{user.name}</h2>
              <span className="inline-block bg-slate-800/60 border border-slate-700/50 px-3 py-0.5 rounded-full text-[9px] font-mono uppercase font-black tracking-wider mt-1 text-slate-300">
                ROLE: {user.role.replace('_',' ')}
              </span>

              <div className="grid grid-cols-2 gap-2.5 mt-6 font-mono">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Badge Bulan Ini</p>
                  <p className="text-[10px] font-bold text-amber-400 mt-1">👑 {getBadge().label}</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Poin Reward</p>
                  <p className="text-sm font-black text-blue-400 mt-0.5">{dbUserPoints} <span className="text-[9px] text-slate-500">PTS</span></p>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-medium font-mono text-center mt-4 border-t border-slate-800/60 pt-3">
                Aturan Skor: Tepat Waktu +10 Pts | Terlambat: -1 Pts/Menit
              </p>
            </div>
          </div>
        )}

      </div>

      {/* --- FIXED BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 border-t border-slate-900 backdrop-blur-xl py-2 px-4 flex justify-around items-center z-50 max-w-md mx-auto rounded-t-3xl shadow-2xl">
        
        <button onClick={() => setActiveTab('break')} className={`flex flex-col items-center gap-1 py-1 px-3 transition-all ${activeTab === 'break' ? 'text-blue-400 scale-105' : 'text-slate-500'}`}>
          <BreakIcon />
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Break</span>
        </button>

        <button onClick={() => setActiveTab('live')} className={`flex flex-col items-center gap-1 py-1 px-3 transition-all ${activeTab === 'live' ? 'text-blue-400 scale-105' : 'text-slate-500'}`}>
          <LiveIcon />
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Live</span>
        </button>

        <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center gap-1 py-1 px-3 transition-all ${activeTab === 'leaderboard' ? 'text-blue-400 scale-105' : 'text-slate-500'}`}>
          <RankIcon />
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Rank</span>
        </button>

        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 py-1 px-3 transition-all ${activeTab === 'history' ? 'text-blue-400 scale-105' : 'text-slate-500'}`}>
          <LogIcon />
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Log</span>
        </button>

        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 py-1 px-3 transition-all ${activeTab === 'profile' ? 'text-blue-400 scale-105' : 'text-slate-500'}`}>
          <ProfileIcon />
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Profil</span>
        </button>

      </div>

    </div>
  );
}