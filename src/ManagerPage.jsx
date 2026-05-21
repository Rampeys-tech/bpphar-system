import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const AwardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
);
const ShieldAlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
);

export default function ManagerPage({ user, onLogout }) {
  const [realtimeBreaks, setRealtimeBreaks] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ efficient: [], undisciplined: [] });
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all, crew, new_structure
  const [filterTime, setFilterTime] = useState('month');

  useEffect(() => {
    fetchRealtimeBreaks();
    fetchHistoryLogs();
    fetchLeaderboardMetrics();

    const subscription = supabase
      .channel('live-manager-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'break_logs' }, () => {
        fetchRealtimeBreaks();
        fetchHistoryLogs();
        fetchLeaderboardMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filterName, filterRole, filterTime]);

  const fetchRealtimeBreaks = async () => {
    const { data } = await supabase
      .from('break_logs')
      .select('*, users(name, email, role)')
      .eq('status', 'on_break');
    if (data) setRealtimeBreaks(data);
  };

  const fetchHistoryLogs = async () => {
    let query = supabase.from('break_logs').select('*, users(name, email, role)');

    if (filterName.trim() !== '' || filterRole !== 'all') {
      let userQuery = supabase.from('users').select('id');
      if (filterName.trim() !== '') userQuery = userQuery.ilike('name', `%${filterName}%`);
      if (filterRole !== 'all') userQuery = userQuery.eq('role', filterRole);
      
      const { data: usersData } = await userQuery;
      const userIds = usersData?.map(u => u.id) || [];
      query = query.in('user_id', userIds);
    }

    const now = new Date();
    if (filterTime === 'day') {
      now.setHours(0, 0, 0, 0);
      query = query.gte('start_time', now.toISOString());
    } else if (filterTime === 'week') {
      query = query.gte('start_time', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
    } else if (filterTime === 'month') {
      const prevMonth = new Date();
      prevMonth.setDate(prevMonth.getDate() - 30);
      query = query.gte('start_time', prevMonth.toISOString());
    }

    const { data } = await query.order('start_time', { ascending: false });
    if (data) setHistory(data);
  };

  const fetchLeaderboardMetrics = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs } = await supabase
      .from('break_logs')
      .select('*, users(name, role)')
      .gte('start_time', thirtyDaysAgo.toISOString());

    if (!logs) return;

    const userStats = {};
    logs.forEach(log => {
      if (!userStats[log.user_id]) {
        userStats[log.user_id] = { name: log.users?.name || 'Unknown', role: log.users?.role, totalOverMinutes: 0, violationCount: 0 };
      }
      if (log.end_time) {
        const duration = (new Date(log.end_time) - new Date(log.start_time)) / 60000;
        const overTime = Math.max(0, duration - 15);
        userStats[log.user_id].totalOverMinutes += overTime;
        if (overTime > 5) userStats[log.user_id].violationCount += 1;
      }
    });

    const sortedStats = Object.values(userStats);
    const efficient = [...sortedStats].sort((a, b) => a.totalOverMinutes - b.totalOverMinutes).slice(0, 5);
    const undisciplined = [...sortedStats].filter(u => u.violationCount > 0).sort((a, b) => b.violationCount - a.violationCount).slice(0, 5);

    setLeaderboard({ efficient, undisciplined });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <nav className="max-w-6xl mx-auto bg-white shadow-sm border rounded-xl px-6 py-4 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Operations Control Master Room</h1>
          <p className="text-sm text-gray-500">Authorized Master: {user.name}</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm font-medium">
          <LogOutIcon /> Logout
        </button>
      </nav>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Realtime Dashboard Feed directly showing the uploaded face verification selfies */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <UsersIcon /> Live Break Monitoring Station ({realtimeBreaks.length})
          </h2>
          {realtimeBreaks.length === 0 ? (
            <p className="text-xs text-gray-400 bg-gray-50 p-4 rounded-lg">All crews and structures are currently checked-in at work stations.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {realtimeBreaks.map(log => (
                <div key={log.id} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col border-blue-200">
                  <div className="relative aspect-square bg-gray-100">
                    <img src={log.photo_url} className="w-full h-full object-cover" alt="Verification Portrait" />
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase shadow-sm text-white
                      ${log.users?.role === 'new_structure' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                      {log.users?.role === 'new_structure' ? 'NS' : 'Crew'}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 border-t flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-gray-900 text-xs truncate">{log.users?.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-1">Clocked out: {new Date(log.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Master Audited Analytics Leaderboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-xs font-bold text-green-700 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
              <AwardIcon /> Most Efficient Execution Rank (Min Extra Mins)
            </h3>
            <div className="divide-y text-xs">
              {leaderboard.efficient.map((u, i) => (
                <div key={i} className="py-2.5 flex justify-between items-center">
                  <span className="font-medium">{i + 1}. {u.name} <span className="text-[10px] text-gray-400 uppercase font-mono">({u.role?.replace('_',' ')})</span></span>
                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">{Math.round(u.totalOverMinutes)} mins over</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
              <ShieldAlertIcon /> System Disciplinary Flag List (Over-Break Cases)
            </h3>
            <div className="divide-y text-xs">
              {leaderboard.undisciplined.length === 0 ? (
                <p className="text-gray-400 py-4 text-center">Operational performance metrics within standard parameters.</p>
              ) : (
                leaderboard.undisciplined.map((u, i) => (
                  <div key={i} className="py-2.5 flex justify-between items-center">
                    <span className="font-medium">{i + 1}. {u.name} <span className="text-[10px] text-gray-400 uppercase font-mono">({u.role?.replace('_',' ')})</span></span>
                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] font-bold">{u.violationCount} alerts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Master Historical Audit Trail Room */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-sm font-bold text-gray-900">Historical Master Audit Trail Ledger</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <input type="text" placeholder="Search name..." value={filterName} onChange={(e) => setFilterName(e.target.value)} className="border px-3 py-1.5 rounded-lg text-xs bg-white outline-none w-full sm:w-36" />
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border px-3 py-1.5 rounded-lg text-xs bg-white outline-none">
                <option value="all">All Structures</option>
                <option value="crew">Crew Structure Only</option>
                <option value="new_structure">New Structure (NS) Only</option>
              </select>
              <select value={filterTime} onChange={(e) => setFilterTime(e.target.value)} className="border px-3 py-1.5 rounded-lg text-xs bg-white outline-none">
                <option value="day">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500">
              <thead className="bg-gray-50 text-gray-700 uppercase font-mono">
                <tr>
                  <th className="p-3">Face Portrait</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Dept Level</th>
                  <th className="p-3">Time Context</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((log) => {
                  const start = new Date(log.start_time);
                  const end = log.end_time ? new Date(log.end_time) : null;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <a href={log.photo_url} target="_blank" rel="noreferrer">
                          <img src={log.photo_url} className="w-8 h-8 object-cover rounded-md border shadow-sm hover:opacity-80 transition" alt="" />
                        </a>
                      </td>
                      <td className="p-3 font-semibold text-gray-900">{log.users?.name}</td>
                      <td className="p-3 text-gray-600 uppercase font-mono text-[10px]">{log.users?.role?.replace('_', ' ')}</td>
                      <td className="p-3">{start.toLocaleString()}</td>
                      <td className="p-3 font-medium">{end ? `${Math.round((end - start) / 60000)} mins` : <span className="text-blue-500 animate-pulse font-bold">Active Break</span>}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status === 'completed' ? 'bg-green-100 text-green-700' : log.status === 'over_break' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}