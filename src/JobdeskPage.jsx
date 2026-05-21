import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';

export default function JobdeskPage({ user, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [deadline, setDeadline] = useState('');

  // Filter State
  const [searchManager, setSearchManager] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriode, setFilterPeriode] = useState('monthly'); 

  // Validasi Akun Store Manager Utama (Pemilik Hak Akses Create)
  const isStoreManager = user.email === 'ramdhanhidayat.career@gmail.com' || user.role === 'admin';

  useEffect(() => {
    fetchTasks();
    if (isStoreManager) fetchManagers();
  }, [searchManager, filterStatus, filterPeriode]);

  const fetchTasks = async () => {
    let query = supabase.from('jobdesk_tasks').select('*, users!jobdesk_tasks_manager_id_fkey(name, role, profile_url)');
    
    if (searchManager) {
      const { data: userData } = await supabase.from('users').select('id').ilike('name', `%${searchManager}%`);
      const ids = userData?.map(u => u.id) || [];
      query = query.in('manager_id', ids);
    }

    if (filterStatus !== 'all') query = query.eq('status', filterStatus);

    const now = new Date();
    if (filterPeriode === 'daily') {
      query = query.gte('created_at', new Date(now.setHours(0,0,0,0)).toISOString());
    } else if (filterPeriode === 'weekly') {
      query = query.gte('created_at', new Date(now.setDate(now.getDate() - 7)).toISOString());
    } else if (filterPeriode === 'monthly') {
      query = query.gte('created_at', new Date(now.setMonth(now.getMonth() - 1)).toISOString());
    }

    if (!isStoreManager) query = query.eq('manager_id', user.id);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) setTasks(data);
  };

  const fetchManagers = async () => {
    const { data } = await supabase.from('users').select('id, name, role, profile_url').in('role', ['manager', 'new_structure']);
    if (data) setManagers(data);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title || !selectedManager || !deadline) return alert("Form wajib diisi lengkap, Bos!");
    setLoading(true);
    const { error } = await supabase.from('jobdesk_tasks').insert([{
      title, description, manager_id: selectedManager, deadline: new Date(deadline).toISOString()
    }]);
    setLoading(false);
    if (!error) { setTitle(''); setDescription(''); setSelectedManager(''); setDeadline(''); fetchTasks(); }
  };

  const handleStartTask = async (id) => {
    await supabase.from('jobdesk_tasks').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', id);
    fetchTasks();
  };

  const handleFinishTask = async (taskId, e, taskDeadline) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(taskId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `jobdesk_proofs/${Date.now()}.${fileExt}`;
      await supabase.storage.from('break-photos').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('break-photos').getPublicUrl(filePath);
      
      await supabase.from('jobdesk_tasks').update({
        status: 'completed', completed_at: new Date().toISOString(),
        is_overdue: new Date() > new Date(taskDeadline),
        document_url: publicUrl
      }).eq('id', taskId);
      fetchTasks();
    } catch (err) { alert(err.message); }
    setUploading(null);
  };

  const calculateSuccessRate = () => {
    const completed = tasks.filter(t => t.status === 'completed');
    const onTime = completed.filter(t => !t.is_overdue).length;
    return completed.length ? Math.round((onTime / completed.length) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans p-4 md:p-8 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl p-5 rounded-3xl">
          <div>
            <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">DAILY TASK MONITORING</h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Control Panel & Kecepatan Eksekusi Kerja</p>
          </div>
          <button onClick={onBack} className="bg-slate-950 border border-slate-800 hover:bg-slate-800/60 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md">
            ← Menu Utama
          </button>
        </div>

        {/* METRICS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/50 p-5 rounded-2xl flex justify-between items-center shadow-xl backdrop-blur-md">
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Rasio Keberhasilan</p>
              <p className="text-xs text-slate-300 font-bold mt-0.5">Tepat Waktu vs Target</p>
            </div>
            <span className="text-3xl font-mono font-black text-emerald-400">{calculateSuccessRate()}%</span>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/50 p-5 rounded-2xl flex justify-between items-center shadow-xl backdrop-blur-md">
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-blue-400">🏆 Kategori Terdisiplin</p>
              <p className="text-xs font-black text-slate-200 mt-1">Sistem Otomatis</p>
            </div>
            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">Monitoring</span>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/50 p-5 rounded-2xl flex justify-between items-center shadow-xl backdrop-blur-md">
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-rose-400">⚠️ Kategori Terlambat</p>
              <p className="text-xs font-black text-slate-200 mt-1">Audit Evaluasi</p>
            </div>
            <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-1 rounded-lg">Realtime</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* SISI KIRI: FORM HANYA MUNCUL DI LAYAR STORE MANAGER */}
          {isStoreManager && (
            <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl p-5 rounded-3xl shadow-2xl h-fit">
              <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest mb-5">✍️ Delegasikan Tugas Baru</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <input type="text" placeholder="Nama / Judul Pekerjaan..." value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white outline-none focus:border-blue-500 transition-colors" />
                <textarea placeholder="Detail instruksi kerja..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white outline-none focus:border-blue-500 h-24 resize-none" />
                <select value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-slate-400 outline-none focus:border-blue-500">
                  <option value="">Pilih PIC Anggota</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role.toUpperCase()})</option>)}
                </select>
                <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-slate-400 outline-none focus:border-blue-500 font-mono" style={{ colorScheme: 'dark' }} />
                <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all">
                  {loading ? 'Memproses...' : '✓ Kirim Instruksi'}
                </button>
              </form>
            </div>
          )}

          {/* SISI KANAN: TABEL UTAMA DENGAN BAR FILTER PREMIUM */}
          <div className={isStoreManager ? "lg:col-span-8" : "lg:col-span-12"}>
            <div className="bg-slate-900/20 border border-slate-800/80 backdrop-blur-xl p-5 rounded-3xl shadow-2xl">
              
              {/* ADVANCED BAR FILTER */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">📋 Progres Lembar Kerja</h3>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <input type="text" placeholder="Filter PIC..." value={searchManager} onChange={(e) => setSearchManager(e.target.value)} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-white outline-none w-28 focus:border-blue-500" />
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-xl text-[11px] text-slate-300 outline-none">
                    <option value="all">Semua Status</option>
                    <option value="assigned">Antrean</option>
                    <option value="in_progress">Progres</option>
                    <option value="completed">Selesai</option>
                  </select>
                  <select value={filterPeriode} onChange={(e) => setFilterPeriode(e.target.value)} className="bg-slate-900 border border-slate-800 px-2 py-1.5 rounded-xl text-[11px] font-black text-blue-400 outline-none">
                    <option value="daily">Periode: Hari Ini</option>
                    <option value="weekly">Periode: Mingguan</option>
                    <option value="monthly">Periode: Bulanan</option>
                  </select>
                </div>
              </div>

              {/* LIST TABLE LENGKAP JABATAN & PROFILE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] font-mono uppercase tracking-widest text-slate-500 border-b border-slate-800/60 bg-slate-950/20">
                      <th className="p-3">Manager PIC</th>
                      <th className="p-3">Nama Pekerjaan</th>
                      <th className="p-3">Batas Waktu</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30 text-xs">
                    {tasks.map((task) => {
                      const dl = new Date(task.deadline);
                      const isOverNow = new Date() > dl && task.status !== 'completed';
                      return (
                        <tr key={task.id} className="hover:bg-slate-900/30 transition-colors">
                          {/* FOTO PROFIL & JABATAN */}
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                                <img src={task.users?.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.users?.name || 'M')}&background=0D8ABC&color=fff&bold=true`} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div>
                                <p className="font-black text-slate-200">{task.users?.name}</p>
                                <p className="text-[9px] uppercase tracking-wide font-bold text-slate-500 mt-0.5">{task.users?.role.replace('_',' ')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-300">{task.title}</p>
                            {task.description && <p className="text-[10px] text-slate-500 font-normal mt-0.5 max-w-[180px] truncate">{task.description}</p>}
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">
                            {dl.toLocaleDateString('id-ID', {day:'2-digit', month:'short'})} — {dl.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-0.5 items-start">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${
                                task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' : 'bg-slate-800 text-slate-400 border-slate-700/60'
                              }`}>
                                {task.status === 'completed' ? (task.is_overdue ? 'Telat' : 'Selesai') : task.status === 'in_progress' ? 'Progres' : 'Antrean'}
                              </span>
                              {isOverNow && <span className="text-[8px] bg-rose-600 text-white font-black px-1.5 py-0.5 rounded tracking-wide uppercase">Overdue 🚨</span>}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {task.manager_id === user.id && task.status === 'assigned' && (
                              <button onClick={() => handleStartTask(task.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition-all">Kerjakan</button>
                            )}
                            {task.manager_id === user.id && task.status === 'in_progress' && (
                              <label className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl cursor-pointer block text-center transition-all">
                                {uploading === task.id ? 'Loading' : 'Selesai'}
                                <input type="file" accept="image/*" capture="environment" hidden disabled={uploading === task.id} onChange={(e) => handleFinishTask(task.id, e, task.deadline)} />
                              </label>
                            )}
                            {task.status === 'completed' && task.document_url && (
                              <a href={task.document_url} target="_blank" rel="noreferrer" className="text-blue-400 text-[10px] font-black hover:underline">[Bukti Foto]</a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {tasks.length === 0 && <p className="text-center py-10 text-xs text-slate-600 font-medium">Belum ada rekaman log tugas.</p>}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}