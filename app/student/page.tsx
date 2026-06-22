'use client';
import { useEffect, useState, useCallback } from 'react';

interface AttendanceRecord { date: string; status: string }
interface Stats { total: number; present: number; percentage: number | null }

interface WeekGroup {
  label: string;      // e.g. "16 Jun – 20 Jun"
  weekKey: string;    // YYYY-Www for sorting
  days: { date: string; dayShort: string; status: string | null }[];
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function buildWeekGroups(records: AttendanceRecord[]): WeekGroup[] {
  const byDate: Record<string, string> = {};
  for (const r of records) byDate[r.date] = r.status;

  const weekKeys = new Set<string>();
  // Always include current week
  const today = new Date();
  weekKeys.add(getISOWeekKey(today));
  for (const r of records) weekKeys.add(getISOWeekKey(new Date(r.date + 'T00:00:00')));

  const groups: WeekGroup[] = [];
  for (const wk of weekKeys) {
    // Reconstruct Monday from week key
    const [yearStr, wStr] = wk.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(wStr);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (week - 1) * 7);

    const days = [];
    let present = 0, absent = 0, late = 0, excused = 0;
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayShort = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
      const status = byDate[dateStr] ?? null;
      days.push({ date: dateStr, dayShort, status });
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'excused') excused++;
    }
    const fri = days[4].date;
    const monDate = days[0].date;
    const fmt = (s: string) => {
      const dt = new Date(s + 'T00:00:00');
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    groups.push({
      label: `${fmt(monDate)} – ${fmt(fri)}`,
      weekKey: wk,
      days,
      present, absent, late, excused,
      total: present + absent + late + excused,
    });
  }
  return groups.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  present: { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
  absent:  { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  late:    { bg: '#fefce8', text: '#854d0e', dot: '#eab308' },
  excused: { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

// Convert VAPID base64 public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

export default function StudentDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState('');

  useEffect(() => {
    fetch('/api/student/attendance').then(r => r.json()).then(data => {
      setRecords(data.records);
      setStats(data.stats);
      setClassName(data.className || '');
      const groups = buildWeekGroups(data.records);
      setWeekGroups(groups);
      // Auto-expand current week
      if (groups.length > 0) setExpandedWeeks(new Set([groups[0].weekKey]));
      setLoading(false);
    });
  }, []);

  // Check push support and current subscription state
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setPushSupported(true);
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setPushEnabled(!!sub);
      });
    });
  }, []);

  const enablePush = useCallback(async () => {
    setPushLoading(true);
    setPushError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError('Notification permission denied. Please allow notifications in your browser settings.');
        setPushLoading(false);
        return;
      }

      const keyRes = await fetch('/api/push/vapid-key');
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      setPushEnabled(true);
    } catch (err) {
      setPushError('Could not enable notifications. ' + (err instanceof Error ? err.message : ''));
    }
    setPushLoading(false);
  }, []);

  const disablePush = useCallback(async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setPushEnabled(false);
    } catch {}
    setPushLoading(false);
  }, []);

  const absences = records.filter(r => r.status === 'absent');

  if (loading) return <div className="text-center py-16 text-gray-400">Loading your attendance…</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">My Attendance</h2>
      {className && <p className="text-sm text-gray-500 mb-6">{className}</p>}

      {/* Push notification opt-in banner */}
      {pushSupported && (
        <div className="mb-6 rounded-2xl border p-4 flex items-center gap-4"
          style={pushEnabled
            ? { background: '#f0fdf4', borderColor: '#bbf7d0' }
            : { background: '#fefce8', borderColor: '#fde68a' }}>
          <span className="text-2xl flex-shrink-0">{pushEnabled ? '🔔' : '🔕'}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 text-sm">
              {pushEnabled ? 'Absence notifications are on' : 'Get notified when marked absent'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {pushEnabled
                ? 'You\'ll receive a notification on this device when attendance is marked.'
                : 'Tap below to receive instant alerts on this device.'}
            </div>
            {pushError && <div className="text-xs text-red-600 mt-1">{pushError}</div>}
          </div>
          <button
            onClick={pushEnabled ? disablePush : enablePush}
            disabled={pushLoading}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-colors"
            style={{ background: pushEnabled ? '#6b7280' : '#1B2F5E' }}>
            {pushLoading ? '…' : pushEnabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      )}

      {/* Attendance percentage ring */}
      {stats && stats.total > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f0f0f0" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none"
                stroke={stats.percentage !== null && stats.percentage >= 80 ? '#22c55e' : '#f59e0b'}
                strokeWidth="12"
                strokeDasharray={`${(stats.percentage || 0) * 2.513} 251.3`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-800">
                {stats.percentage !== null ? `${stats.percentage}%` : '–'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800 mb-1">
              {stats.percentage !== null ? `${stats.percentage}% Attendance` : 'No records yet'}
            </div>
            <div className="text-sm text-gray-500">{stats.present} present out of {stats.total} recorded days</div>
            {absences.length > 0 && (
              <div className="text-sm text-red-600 mt-1">{absences.length} absence{absences.length !== 1 ? 's' : ''} recorded</div>
            )}
            {stats.percentage !== null && stats.percentage < 80 && (
              <div className="mt-2 text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full inline-block">
                ⚠ Below 80% attendance threshold
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly overview */}
      {weekGroups.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Weekly Overview</h3>
          <div className="space-y-2">
            {weekGroups.map((wg, idx) => {
              const isCurrentWeek = idx === 0;
              const isExpanded = expandedWeeks.has(wg.weekKey);
              const toggle = () => setExpandedWeeks(prev => {
                const next = new Set(prev);
                if (next.has(wg.weekKey)) next.delete(wg.weekKey); else next.add(wg.weekKey);
                return next;
              });
              return (
                <div key={wg.weekKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Week header row */}
                  <button onClick={toggle} className="w-full flex items-center px-5 py-3 gap-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{wg.label}</span>
                        {isCurrentWeek && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: '#1B2F5E' }}>This week</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {wg.total === 0 ? (
                          <span>No records yet</span>
                        ) : (
                          <>
                            {wg.present > 0 && <span className="text-green-600">✓ {wg.present} present</span>}
                            {wg.late > 0 && <span className="text-yellow-600">◷ {wg.late} late</span>}
                            {wg.absent > 0 && <span className="text-red-600">✗ {wg.absent} absent</span>}
                            {wg.excused > 0 && <span className="text-blue-600">○ {wg.excused} excused</span>}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Mini status dots */}
                    <div className="flex gap-1.5 flex-shrink-0">
                      {wg.days.map(d => {
                        const color = d.status === 'present' ? '#22c55e'
                          : d.status === 'absent' ? '#ef4444'
                          : d.status === 'late' ? '#eab308'
                          : d.status === 'excused' ? '#3b82f6'
                          : '#e5e7eb';
                        return <span key={d.date} className="w-2.5 h-2.5 rounded-full" style={{ background: color }} title={d.dayShort} />;
                      })}
                    </div>
                    <span className="text-gray-400 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded day-by-day */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 px-5 py-3">
                      <div className="grid grid-cols-5 gap-2">
                        {wg.days.map(d => {
                          const style = d.status ? STATUS_STYLES[d.status] : null;
                          return (
                            <div key={d.date} className="flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-400 font-medium">{d.dayShort}</span>
                              <div
                                className="w-full rounded-xl py-2 flex flex-col items-center gap-0.5"
                                style={{ background: style ? style.bg : '#f9fafb' }}>
                                <span className="w-2 h-2 rounded-full" style={{ background: style ? style.dot : '#d1d5db' }} />
                                <span className="text-xs font-medium capitalize" style={{ color: style ? style.text : '#9ca3af' }}>
                                  {d.status ?? '–'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-300 text-center leading-tight">
                                {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Absence highlight */}
      {absences.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Absence Dates</h3>
          <div className="flex flex-wrap gap-2">
            {absences.map(r => (
              <span key={r.date} className="px-3 py-1.5 rounded-full text-sm bg-red-50 text-red-700 border border-red-100">
                {formatDate(r.date)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full record list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Full Attendance History</h3>
        </div>
        {records.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-400">No attendance records yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map(r => {
              const style = STATUS_STYLES[r.status] || STATUS_STYLES.absent;
              return (
                <div key={r.date} className="flex items-center px-5 py-3 gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: style.dot }} />
                  <span className="flex-1 text-sm text-gray-700">{formatDate(r.date)}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
                    style={{ background: style.bg, color: style.text }}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
