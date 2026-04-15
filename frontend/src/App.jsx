import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';
import {
  LayoutDashboard, FileText, Settings, Zap, Star, MapPin,
  ExternalLink, X, ChevronRight, Loader2, CheckCircle2,
  AlertTriangle, Lock, Sparkles, BarChart3, TrendingUp,
  Brain, Briefcase, Building2, Calendar, Send, Eye, Trash2, Search, PenTool, Target
} from 'lucide-react';

import CVEditor from './components/CVBuilder/CVEditor';
import CVPreview from './components/CVBuilder/CVPreview';
import ATSScorer from './components/CVBuilder/ATSScorer';

const API = 'http://localhost:5000';
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

function Toast({ toast }) {
  if (!toast) return null;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <div className={`toast ${toast.type}`}>
      <span>{icons[toast.type]}</span>
      <span>{toast.msg}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ page, setPage, stats, profile }) {
  const plan = stats?.plan || 'free';
  const used = stats?.usageThisMonth || 0;
  const limit = stats?.usageLimit === Infinity ? 100 : (stats?.usageLimit || 3);
  const pct = Math.min(100, (used / limit) * 100);
  const name = profile?.candidate?.full_name?.split(' ')[0] || 'You';

  const nav = [
    { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
    { id: 'evaluations', icon: <FileText size={16} />, label: 'Evaluations', badge: stats?.total },
    { id: 'evaluate', icon: <Zap size={16} />, label: 'Evaluate Job' },
    { id: 'cvbuilder', icon: <PenTool size={16} />, label: 'ATS CV Builder' },
    { id: 'settings', icon: <Settings size={16} />, label: 'Settings' },
    { id: 'jobs', icon: <Search size={16} />, label: 'Discover Jobs' },
    { id: 'coverletter', icon: <Send size={16} />, label: 'Cover Letter' },
    { id: 'interview', icon: <Brain size={16} />, label: 'Interview Prep' },
    { id: 'upgrade', icon: <Star size={16} />, label: 'Upgrade Plan' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🚀</div>
        <div>
          <div className="logo-text">JobPilot</div>
        </div>
        <span className="logo-beta">BETA</span>
      </div>

      {PUBLISHABLE_KEY && (
        <div style={{ padding: '0 1rem 1rem 1rem' }}>
          <UserButton showName={true} />
        </div>
      )}

      <div className="sidebar-section-label">Navigation</div>
      <nav>
        {nav.map(({ id, icon, label, badge }) => (
          <div
            key={id}
            className={`nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
          >
            {icon}
            {label}
            {badge > 0 && <span className="nav-badge">{badge}</span>}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="plan-card">
          <div className="plan-name">
            {plan === 'free' ? '🆓 Free Plan' : plan === 'pro' ? '⚡ Pro Plan' : '🔥 Accelerator'}
          </div>
          <div className="plan-usage">
            {stats?.usageLimit === Infinity
              ? `${used} evaluations used`
              : `${used} / ${limit} evaluations`}
          </div>
          <div className="plan-bar">
            <div className="plan-bar-fill" style={{ width: `${plan === 'accelerator' ? 30 : pct}%` }} />
          </div>
          {plan === 'free' && (
            <button className="upgrade-btn" onClick={() => setPage('upgrade')}>
              Upgrade to Pro — $9/mo
            </button>
          )}
          {plan !== 'free' && (
            <div style={{ fontSize: '0.78rem', color: 'var(--success)' }}>✓ Active — {name}'s workspace</div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
function DashboardPage({ apps, stats, profile, onOpenReport, onDelete, onNavigate }) {
  const name = profile?.candidate?.full_name?.split(' ')[0] || 'there';

  const columns = [
    { id: 'evaluated', label: 'Evaluated', dot: '#6366f1', filter: a => a.status.toLowerCase().includes('eval') },
    { id: 'applied', label: 'Applied', dot: '#10b981', filter: a => a.status.toLowerCase().includes('apli') || a.status.toLowerCase().includes('env') },
    { id: 'interview', label: 'Interview', dot: '#f59e0b', filter: a => a.status.toLowerCase().includes('inter') || a.status.toLowerCase().includes('entrev') },
    { id: 'pending', label: 'Pending', dot: '#64748b', filter: a => !a.status.toLowerCase().includes('eval') && !a.status.toLowerCase().includes('apli') && !a.status.toLowerCase().includes('env') && !a.status.toLowerCase().includes('inter') },
  ];

  const avgStr = stats?.avgScore ? `${stats.avgScore}/5` : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {name} 👋</h1>
          <p className="subtitle">
            {stats?.total > 0
              ? `${stats.total} roles tracked · ${stats?.byStatus?.evaluated || 0} evaluated · ${stats?.usageRemaining} evaluations remaining`
              : 'Your career command center is ready. Paste a job URL to get started.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('evaluate')}>
          <Zap size={16} /> Evaluate a Job
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="card stat-card primary">
          <div className="stat-label">Total Tracked</div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-sub">roles in pipeline</div>
        </div>
        <div className="card stat-card success">
          <div className="stat-label">Avg Match Score</div>
          <div className="stat-value">{avgStr}</div>
          <div className="stat-sub">across all evaluations</div>
        </div>
        <div className="card stat-card warn">
          <div className="stat-label">Evaluations Left</div>
          <div className="stat-value">{stats?.usageRemaining ?? '—'}</div>
          <div className="stat-sub">this month ({stats?.plan || 'free'} plan)</div>
        </div>
        <div className="card stat-card info">
          <div className="stat-label">Best Match</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{stats?.topApp?.company || '—'}</div>
          <div className="stat-sub">{stats?.topApp?.score || 'No evaluations yet'}</div>
        </div>
      </div>

      {/* Kanban */}
      {apps.length === 0 ? (
        <div className="card" style={{ padding: '3rem' }}>
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No applications yet</h3>
            <p>Paste a job URL or description to run your first AI evaluation</p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => onNavigate('evaluate')}>
              <Zap size={16} /> Run First Evaluation
            </button>
          </div>
        </div>
      ) : (
        <div className="kanban-board">
          {columns.map(col => {
            const colApps = apps.filter(col.filter);
            return (
              <div className="kanban-col" key={col.id}>
                <div className="kanban-col-header">
                  <div className="kanban-col-dot" style={{ background: col.dot }} />
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-count">{colApps.length}</span>
                </div>
                {colApps.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Empty
                  </div>
                )}
                {colApps.map((app, i) => (
                  <AppCard key={i} app={app} onClick={() => onOpenReport(app)} onDelete={() => onDelete(app.id)} />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// APP CARD
// ─────────────────────────────────────────────
function AppCard({ app, onClick, onDelete }) {
  const scoreChar = (app.score || 'B')[0].toUpperCase();
  return (
    <div className="app-card">
      <span className="app-card-tag">Full Time</span>
      <div className="app-card-title">{app.role}</div>
      <div className="app-card-company">
        <Building2 size={12} />
        {app.company}
        <span style={{ opacity: 0.3 }}>·</span>
        <Calendar size={12} />
        {app.date}
      </div>
      <div className="app-card-footer">
        <span className={`score-pill score-${scoreChar}`}>{app.score}</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-sm btn-ghost" style={{ padding: '3px 8px' }} onClick={onClick}>
            <Eye size={13} />
          </button>
          <button className="btn btn-sm btn-danger" style={{ padding: '3px 8px' }} onClick={e => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EVALUATE PAGE
// ─────────────────────────────────────────────
function EvaluatePage({ stats, onRefresh, showToast, preFill, onClearPreFill }) {
  const [jobText, setJobText] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [done, setDone] = useState(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (preFill) {
      setJobText(preFill.text || '');
      setCompany(preFill.company || '');
      setRole(preFill.title || '');
      onClearPreFill();
    }
  }, [preFill]);

  const canEvaluate = !stats || stats?.usageRemaining === 'Unlimited' || (stats?.usageRemaining > 0);
  const hasApiKey = true; // validated server-side when evaluate is called

  async function runEvaluation() {
    if (!jobText.trim()) { showToast('Paste a job description or URL first', 'error'); return; }
    setLoading(true);
    setStreamText('');
    setDone(null);

    try {
      const res = await fetch(`${API}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText, company, role }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.upgradeRequired) {
          showToast(`Limit reached: ${err.error}`, 'error');
        } else {
          showToast(err.error || 'Evaluation failed', 'error');
        }
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) setStreamText(prev => prev + data.text);
              if (data.done) {
                setDone(data);
                onRefresh();
                showToast(`Evaluation saved! Score: ${data.score}`, 'success');
              }
              if (data.error) showToast(data.error, 'error');
            } catch {}
          }
        }
      }
    } catch (err) {
      showToast('Connection failed. Is the server running?', 'error');
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evaluate a Job</h1>
          <p className="subtitle">Paste a job description or URL — get a full A-F evaluation with CV match, salary research, and interview prep</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className={`badge ${canEvaluate ? 'badge-success' : 'badge-warn'}`}>
            {stats?.usageRemaining === 'Unlimited' ? '∞ Unlimited' : `${stats?.usageRemaining ?? '?'} left this month`}
          </span>
        </div>
      </div>

      <div className="card evaluate-panel">
        <h2><Brain size={18} /> AI Job Evaluator</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
          <div>
            <textarea
              className="evaluate-inputs"
              style={{ width: '100%', minHeight: '120px', resize: 'vertical', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'Inter', fontSize: '0.875rem', padding: '0.85rem 1rem' }}
              placeholder="Paste job description here, or a job URL (e.g. https://jobs.ashbyhq.com/openai/...)&#10;&#10;The AI will evaluate: CV match, compensation, gaps, interview prep, and personalization plan."
              value={jobText}
              onChange={e => setJobText(e.target.value)}
              disabled={loading}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input className="form-input" placeholder="Company name (optional)" value={company} onChange={e => setCompany(e.target.value)} disabled={loading} />
              <input className="form-input" placeholder="Role title (optional)" value={role} onChange={e => setRole(e.target.value)} disabled={loading} />
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: '1rem 1.5rem', alignSelf: 'flex-start', minWidth: '140px', justifyContent: 'center' }}
            onClick={runEvaluation}
            disabled={loading || !canEvaluate}
          >
            {loading ? <><Loader2 size={16} className="spin" /> Analyzing…</> : <><Send size={16} /> Evaluate</>}
          </button>
        </div>

        {!canEvaluate && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--warn-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--warn)' }}>
            ⚠️ You've reached your monthly evaluation limit. <strong style={{ cursor: 'pointer', textDecoration: 'underline' }}>Upgrade to Pro</strong> for 30 evaluations/month.
          </div>
        )}
      </div>

      {/* Streaming output */}
      {(streamText || loading) && (
        <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: 600 }}>
            {loading && <Loader2 size={14} className="spin" />}
            {!loading && done && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
            {loading ? 'LIVE EVALUATION IN PROGRESS…' : 'EVALUATION COMPLETE'}
          </div>
          <div className="md-content stream-output" ref={streamRef}>
            <ReactMarkdown>{streamText || ' '}</ReactMarkdown>
          </div>
          {done && (
            <div className="stream-done" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Saved to pipeline — Score: {done.score}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setStreamText(''); setDone(null); setJobText(''); setCompany(''); setRole(''); }}>
                New Evaluation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {!streamText && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            { icon: '🎯', title: 'CV Match Analysis', desc: 'Maps every JD requirement to your CV lines. Shows gaps with mitigation plans.' },
            { icon: '💰', title: 'Salary Research', desc: 'Estimates comp range for the role and location based on market data.' },
            { icon: '🎤', title: 'Interview Prep', desc: 'Generates 5 STAR+Reflection stories mapped to the specific JD requirements.' },
          ].map(tip => (
            <div key={tip.title} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{tip.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.9rem' }}>{tip.title}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{tip.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EVALUATIONS LIST PAGE
// ─────────────────────────────────────────────
function EvaluationsPage({ onOpenReport, showToast }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchEvals = useCallback(() => {
    setLoading(true);
    const offset = (page - 1) * limit;
    fetch(`${API}/api/applications?limit=${limit}&offset=${offset}&search=${search}`)
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLoading(false); 
      })
      .catch(() => { showToast('Could not load evaluations', 'error'); setLoading(false); });
  }, [showToast, page, search]);

  useEffect(() => {
    fetchEvals();
  }, [fetchEvals]);

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>All Evaluations</h1>
          <p className="subtitle">Track and review all AI career match assessments</p>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <input
              className="form-input"
              style={{ maxWidth: 300 }}
              placeholder="🔍 Search company or role…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{data.total} total evaluations</span>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
             <span style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages || 1}</span>
             <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
          </div>
        ) : data.items.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <div className="empty-icon">📋</div>
            <h3>No results found</h3>
            <p>Try a different search term or run a new evaluation</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Company', 'Role', 'Score', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((app) => {
                const sc = (app.score || 'B')[0].toUpperCase();
                return (
                  <tr
                    key={app.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: '0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{app.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>{app.company}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{app.role}</td>
                    <td style={{ padding: '1rem' }}><span className={`score-pill score-${sc}`}>{app.score}</span></td>
                    <td style={{ padding: '1rem' }}><span className="badge badge-info">{app.status}</span></td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{app.date}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => onOpenReport(app)}><Eye size={13} /> View</button>
                        <button className="btn btn-sm btn-danger" onClick={async () => {
                          if (confirm('Delete?')) {
                            await fetch(`${API}/api/applications/${app.id}`, { method: 'DELETE' });
                            fetchEvals();
                            showToast('Deleted', 'info');
                          }
                        }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
function SettingsPage({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings`).then(r => r.json()).then(d => { setSettings(d); });
  }, []);

  async function save() {
    setSaving(true);
    const payload = {};
    if (apiKey) payload.anthropicApiKey = apiKey;
    await fetch(`${API}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setApiKey('');
    showToast('Settings saved!', 'success');
    const updated = await fetch(`${API}/api/settings`).then(r => r.json());
    setSettings(updated);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Configure your API key and preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* API Key */}
        <div className="card settings-card" style={{ gridColumn: '1 / -1' }}>
          <h3><Brain size={16} /> Anthropic API Key</h3>
          <p className="settings-desc">
            Required for AI evaluations. Your key is stored locally on your machine and never shared.
            Get one free at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)' }}>console.anthropic.com</a>
          </p>

          {settings?.hasApiKey && (
            <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--success)' }}>
              <CheckCircle2 size={14} /> Key configured: {settings.apiKeyPreview}
            </div>
          )}

          {!settings?.hasApiKey && (
            <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: 'var(--warn-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--warn)' }}>
              <AlertTriangle size={14} /> No API key configured — evaluations won't work yet
            </div>
          )}

          <div className="form-group">
            <label>Enter new API key</label>
            <div className="api-key-row">
              <input
                className={`form-input ${settings?.hasApiKey ? 'has-value' : ''}`}
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-api03-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => setShowKey(!showKey)}>
                {showKey ? '🙈' : '👁️'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !apiKey}>
                {saving ? <Loader2 size={14} className="spin" /> : '💾 Save'}
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            💡 Tip: Claude Haiku is used by default for speed and cost efficiency (~$0.01 per evaluation)
          </div>
        </div>

        {/* Usage stats */}
        <div className="card settings-card">
          <h3><BarChart3 size={16} /> Usage This Month</h3>
          <p className="settings-desc">Your evaluation usage resets on the 1st of each month</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Evaluations Used', value: settings?.usageThisMonth || 0 },
              { label: 'Plan', value: (settings?.plan || 'free').toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.3rem' }}>{label}</div>
                <div style={{ fontFamily: 'Outfit', fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile read-only */}
        <div className="card settings-card">
          <h3><Briefcase size={16} /> Profile (profile.yml)</h3>
          <p className="settings-desc">Edit profile.yml directly to change your profile data</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Target roles', value: 'AI Engineer, FDE, ML Engineer' },
              { label: 'Location', value: 'Berlin, Germany' },
              { label: 'Target comp', value: '€65K–80K' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// UPGRADE / PRICING PAGE
// ─────────────────────────────────────────────
function UpgradePage({ currentPlan = 'free' }) {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      desc: 'Try it out — no credit card needed',
      features: [
        { text: '3 evaluations / month', ok: true },
        { text: '1 ATS PDF / month', ok: true },
        { text: 'Kanban dashboard', ok: true },
        { text: 'Portal scanner', ok: false },
        { text: 'Batch processing', ok: false },
        { text: 'Email job digest', ok: false },
        { text: 'Interview prep', ok: false },
      ],
    },
    {
      id: 'pro',
      name: 'Job Seeker Pro',
      price: '$9',
      priceNote: '/month',
      desc: 'For active job seekers — the main plan',
      popular: true,
      features: [
        { text: '30 evaluations / month', ok: true },
        { text: '10 ATS PDFs / month', ok: true },
        { text: 'Kanban dashboard', ok: true },
        { text: '5 portal scans', ok: true },
        { text: 'Interview prep + negotiation', ok: true },
        { text: 'Email: weekly job digest', ok: true },
        { text: 'Batch processing', ok: false },
      ],
    },
    {
      id: 'accelerator',
      name: 'Accelerator',
      price: '$29',
      priceNote: '/month',
      desc: 'For power users — unlimited everything',
      features: [
        { text: 'Unlimited evaluations', ok: true },
        { text: 'Unlimited ATS PDFs', ok: true },
        { text: 'All 45+ portal scans', ok: true },
        { text: 'Batch evaluate 10+ jobs', ok: true },
        { text: 'LinkedIn outreach drafts', ok: true },
        { text: 'STAR story bank', ok: true },
        { text: 'Zapier / Notion export', ok: true },
      ],
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Upgrade Your Plan</h1>
          <p className="subtitle">You're on the <strong>{currentPlan}</strong> plan. Unlock more to accelerate your job search.</p>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map(plan => (
          <div className={`card pricing-card ${plan.popular ? 'popular' : ''}`} key={plan.id}>
            {plan.popular && <div className="pricing-popular-badge">Most Popular</div>}
            <div className="pricing-tier">{plan.name}</div>
            <div className="pricing-price">
              {plan.price}
              {plan.priceNote && <span>{plan.priceNote}</span>}
            </div>
            <div className="pricing-desc">{plan.desc}</div>
            <ul className="pricing-features">
              {plan.features.map(f => (
                <li key={f.text}>
                  <span className={f.ok ? 'check' : 'lock'}>{f.ok ? '✓' : '🔒'}</span>
                  {f.text}
                </li>
              ))}
            </ul>
            {plan.id === currentPlan ? (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} disabled>Current Plan</button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => window.open('https://buy.stripe.com/placeholder', '_blank')}
              >
                {plan.id === 'free' ? 'Downgrade' : `Upgrade — ${plan.price}/mo`}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', maxWidth: 600 }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)' }}>💳 Coming soon:</strong> Full Stripe billing integration. 
          For now, to activate a paid plan, contact us at{' '}
          <span style={{ color: 'var(--primary-light)' }}>hello@jobpilot.dev</span> and we'll activate it manually.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CV BUILDER PAGE
// ─────────────────────────────────────────────
function CVBuilderPage({ showToast }) {
  const [resumes, setResumes] = useState([]);
  const [activeResumeId, setActiveResumeId] = useState(null);
  const [resumeName, setResumeName] = useState('Main CV');
  const [data, setData] = useState({
    basics: { name: '', label: '', email: '', phone: '', location: '', website: '' },
    work: [], education: [], skills: [], projects: []
  });

  const fetchResumes = async () => {
    try {
      const res = await fetch(`${API}/api/resumes`);
      const items = await res.json();
      setResumes(items);
      if (items.length > 0 && !activeResumeId) {
        await loadResume(items[0].id, items[0].name);
      }
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    }
  };

  const loadResume = async (id, name) => {
    try {
      const res = await fetch(`${API}/api/resumes/${id}`);
      const d = await res.json();
      setData(d);
      setActiveResumeId(id);
      setResumeName(name);
    } catch (err) {
      showToast('Failed to load resume', 'error');
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleSave = async (newData) => {
    try {
      const res = await fetch(`${API}/api/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeResumeId,
          name: resumeName,
          data: newData || data,
          isPrimary: false
        }),
      });
      const result = await res.json();
      if (!activeResumeId) setActiveResumeId(result.id);
      await fetchResumes();
      showToast('Resume variation saved', 'success');
    } catch (err) {
      showToast('Failed to save resume', 'error');
    }
  };

  const handleNew = () => {
    setActiveResumeId(null);
    setResumeName('New Variation');
    setData({
      basics: { name: '', label: '', email: '', phone: '', location: '', website: '' },
      work: [], education: [], skills: [], projects: []
    });
  };

  const handleDownload = async () => {
    showToast('Generating ATS PDF...', 'info');
    try {
      const res = await fetch(`${API}/api/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resume_${data.basics.name.replace(/\s+/g, '_')}.pdf`;
        a.click();
        showToast('PDF Downloaded!', 'success');
      }
    } catch (err) {
      showToast('Failed to generate PDF', 'error');
    }
  };

  const [optimization, setOptimization] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = async (jobDesc) => {
    if (!jobDesc) {
      showToast('Please provide a job description', 'warn');
      return;
    }
    setIsOptimizing(true);
    setOptimization(null);
    try {
      const res = await fetch(`${API}/api/cv/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: data, jobDesc }),
      });
      const result = await res.json();
      setOptimization(result);
      showToast('ATS Optimization Complete', 'success');
    } catch (err) {
      showToast('Optimization failed', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header compact">
        <div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>ATS CV Builder</h1>
          <p className="subtitle" style={{ fontSize: '0.75rem' }}>Professional single-column, ATS-ready resume management</p>
        </div>
      </div>

      <div className="cv-builder-container">
        <CVEditor 
          data={data} 
          onChange={(newData) => setData(newData)} 
          onSave={() => handleSave(data)}
          onDownload={handleDownload} 
          onOptimize={handleOptimize} 
          showToast={showToast}
          resumes={resumes}
          activeId={activeResumeId}
          onSwitch={(id, name) => loadResume(id, name)}
          onNew={handleNew}
          resumeName={resumeName}
          onRename={setResumeName}
        />
        <div className="cv-preview-container">
          <ATSScorer 
            onOptimize={handleOptimize} 
            result={optimization} 
            loading={isOptimizing} 
          />
          <CVPreview data={data} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORT PANEL
// ─────────────────────────────────────────────
function ReportPanel({ app, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app?.reportPath) { setContent('No report available for this entry.'); setLoading(false); return; }
    fetch(`${API}/api/report?path=${app.reportPath}`)
      .then(r => r.text())
      .then(t => { setContent(t); setLoading(false); })
      .catch(() => { setContent('Could not load report.'); setLoading(false); });
  }, [app]);

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-panel" onClick={e => e.stopPropagation()}>
        <div className="report-panel-header">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary-light)', marginBottom: '0.3rem' }}>Evaluation Report</div>
            <div style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700 }}>{app.role}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <Building2 size={13} /> {app.company}
              <span style={{ opacity: 0.4 }}>·</span>
              <span className={`score-pill score-${(app.score || 'B')[0]}`}>{app.score}</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="report-panel-body">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="spin" /> Loading report…
            </div>
          ) : (
            <div className="md-content">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// JOBS DISCOVERY PAGE
// ─────────────────────────────────────────────
function JobsDiscoveryPage({ showToast, onEvaluate }) {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [primaryResume, setPrimaryResume] = useState(null);
  const [scores, setScores] = useState({});
  const [checkingScore, setCheckingScore] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/resumes/primary`)
      .then(r => r.json())
      .then(d => setPrimaryResume(d))
      .catch(e => console.error('No primary resume found'));
  }, []);
  const [searchTerm, setSearchTerm] = useState('software engineer');
  const [location, setLocation] = useState('London');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const offset = (page - 1) * limit;
    fetch(`${API}/api/jobs?limit=${limit}&offset=${offset}&search=${tableSearch}`)
      .then(r => r.json())
      .then(d => { 
        setJobs(d.items || []); 
        setTotal(d.total || 0);
        setLoading(false); 
      })
      .catch(() => { showToast('Could not load jobs', 'error'); setLoading(false); });
  }, [showToast, page, tableSearch]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleScrape = async (e) => {
    e.preventDefault();
    setScraping(true);
    try {
      const res = await fetch(`${API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm, location, resultsWanted: 10 }),
      });
      if (!res.ok) throw new Error('Scrape failed');
      showToast('Scrape complete! Refreshing list...', 'success');
      fetchJobs();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setScraping(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Discover Jobs</h1>
          <p className="subtitle">Latest jobs scraped from LinkedIn and Indeed</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <form onSubmit={handleScrape} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Role Keyword</label>
            <input 
              className="form-input" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="e.g. Frontend Developer" 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Location</label>
            <input 
              className="form-input" 
              value={location} 
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. London" 
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={scraping}>
            {scraping ? <><Loader2 size={16} className="spin" /> Scraping...</> : <><Search size={16} /> Find New Jobs</>}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <input 
                className="form-input" 
                style={{ maxWidth: '240px' }}
                placeholder="🔍 Filter current jobs..." 
                value={tableSearch}
                onChange={e => { setTableSearch(e.target.value); setPage(1); }}
             />
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{total} jobs found</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
             <span style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages || 1}</span>
             <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
             <p style={{ color: 'var(--text-secondary)' }}>No jobs found matching your filter.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Source', 'Company', 'Role', 'ATS Match', 'Location', 'Salary', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const salary = job.salary_min && job.salary_max 
                  ? `${job.salary_currency || ''}${Math.round(job.salary_min / 1000)}k–${Math.round(job.salary_max / 1000)}k`
                  : job.salary_min ? `${job.salary_currency || ''}${Math.round(job.salary_min / 1000)}k+` : '—';
                
                return (
                  <tr key={job.id} style={{ borderBottom: '1px solid var(--border)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem' }}><span className="badge badge-info">{job.site}</span></td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{job.company}</td>
                    <td style={{ padding: '1rem' }}>{job.title}</td>
                    <td style={{ padding: '1rem' }}>
                      {scores[job.id] ? (
                        <span className={`score-pill score-${Math.floor(scores[job.id].score / 10) * 10}`}>
                          {scores[job.id].score}%
                        </span>
                      ) : (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          disabled={checkingScore === job.id || !primaryResume}
                          onClick={async () => {
                            setCheckingScore(job.id);
                            try {
                              const res = await fetch(`${API}/api/cv/score`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ resumeData: primaryResume, jobDesc: job.description }),
                              });
                              const s = await res.json();
                              setScores(prev => ({ ...prev, [job.id]: s }));
                            } catch (e) {
                              showToast('Score failed', 'error');
                            } finally {
                              setCheckingScore(null);
                            }
                          }}
                        >
                          {checkingScore === job.id ? <Loader2 size={12} className="spin" /> : <Target size={12} />} Check
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{job.location}</td>
                    <td style={{ padding: '1rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>{salary}</td>
                    <td style={{ padding: '1rem' }}>
                       <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {job.job_type && <span className="badge badge-sm" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem' }}>{job.job_type}</span>}
                          {job.is_remote && <span className="badge badge-sm badge-success" style={{ fontSize: '0.65rem' }}>Remote</span>}
                       </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{job.date_posted || 'Recently'}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href={job.job_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost"><ExternalLink size={14} /></a>
                        <button className="btn btn-sm btn-primary" onClick={() => onEvaluate(job.description, job.company, job.title)}><Zap size={14} /> Evaluate</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COVER LETTER PAGE
// ─────────────────────────────────────────────
function CoverLetterPage({ showToast }) {
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const generate = async () => {
    setLoading(true);
    try {
      const primaryRes = await fetch(`${API}/api/resumes/primary`).then(r => r.json());
      const res = await fetch(`${API}/api/cv/cover-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: primaryRes, jobDesc }),
      });
      const data = await res.json();
      setContent(data.content);
      showToast('Cover Letter Generated!', 'success');
    } catch (e) {
      showToast('Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Cover Letter Generator</h1>
          <p className="subtitle">Craft a world-class, tailored cover letter in seconds</p>
        </div>
      </div>

      {!content ? (
        <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
          <div className="form-group">
            <label>Paste the Job Description</label>
            <textarea 
              className="form-input" 
              style={{ height: 250, resize: 'vertical' }}
              placeholder="Paste the JD here..."
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-full mt-3" onClick={generate} disabled={loading || !jobDesc}>
            {loading ? <Loader2 className="spin" /> : <><Sparkles size={16} /> Generate Tailored Letter</>}
          </button>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3>Your Tailored Cover Letter</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setContent('')}>Edit JD</button>
          </div>
          <div className="md-content" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// INTERVIEW PREP PAGE
// ─────────────────────────────────────────────
function InterviewPrepPage({ showToast }) {
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const generate = async () => {
    setLoading(true);
    try {
      const primaryRes = await fetch(`${API}/api/resumes/primary`).then(r => r.json());
      const res = await fetch(`${API}/api/cv/interview-prep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: primaryRes, jobDesc }),
      });
      const data = await res.json();
      setContent(data.content);
      showToast('Interview Prep Guide Ready!', 'success');
    } catch (e) {
      showToast('Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Interview Prep Hub</h1>
          <p className="subtitle">10 custom STAR questions mapped to your profile and the role</p>
        </div>
      </div>

      {!content ? (
        <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
          <div className="form-group">
            <label>Paste the Job Description</label>
            <textarea 
              className="form-input" 
              style={{ height: 250, resize: 'vertical' }}
              placeholder="Paste the JD here..."
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-full mt-3" onClick={generate} disabled={loading || !jobDesc}>
            {loading ? <Loader2 className="spin" /> : <><Brain size={16} /> Generate Prep Guide</>}
          </button>
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3>Your Interview Battle Plan</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setContent('')}>Edit JD</button>
          </div>
          <div className="md-content" style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preFill, setPreFill] = useState(null);
  const { toast, show: showToast } = useToast();

  async function refresh() {
    try {
      const [appsData, statsData, profileData] = await Promise.all([
        fetch(`${API}/api/applications?limit=100`).then(r => r.json()),
        fetch(`${API}/api/stats`).then(r => r.json()),
        fetch(`${API}/api/profile`).then(r => r.json()).catch(() => null),
      ]);
      setApps(appsData.items || []);
      setStats(statsData);
      setProfile(profileData);
    } catch (err) {
      showToast('Backend server not responding. Run: node server.mjs', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function handleDelete(id) {
    if (!confirm(`Delete application #${id}?`)) return;
    await fetch(`${API}/api/applications/${id}`, { method: 'DELETE' });
    showToast('Removed from pipeline', 'success');
    refresh();
  }

  function handleOpenReport(app) {
    setSelectedApp(app);
  }

  const pageContent = {
    dashboard: (
      <DashboardPage
        apps={apps}
        stats={stats}
        profile={profile}
        onOpenReport={handleOpenReport}
        onDelete={handleDelete}
        onNavigate={setPage}
      />
    ),
    evaluations: (
      <EvaluationsPage
        onOpenReport={handleOpenReport}
        showToast={showToast}
      />
    ),
    evaluate: (
      <EvaluatePage
        stats={stats}
        onRefresh={refresh}
        showToast={showToast}
        preFill={preFill}
        onClearPreFill={() => setPreFill(null)}
      />
    ),
    settings: <SettingsPage showToast={showToast} />,
    cvbuilder: <CVBuilderPage showToast={showToast} />,
    upgrade: <UpgradePage currentPlan={stats?.plan || 'free'} />,
    jobs: (
      <JobsDiscoveryPage 
        showToast={showToast} 
        onEvaluate={(text, company, title) => {
          setPage('evaluate');
          setPreFill({ text, company, title });
        }} 
      />
    ),
    coverletter: <CoverLetterPage showToast={showToast} />,
    interview: <InterviewPrepPage showToast={showToast} />,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'var(--text-secondary)' }}>
        <Loader2 size={20} className="spin" />
        <span>Connecting to Career-Ops backend…</span>
      </div>
    );
  }

  const appContent = (
    <div className="app">
      <Sidebar page={page} setPage={setPage} stats={stats} profile={profile} />

      <main className="main">
        {pageContent[page] || pageContent.dashboard}
      </main>

      {selectedApp && (
        <ReportPanel app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}

      <Toast toast={toast} />
    </div>
  );

  // If Clerk is configured
  if (PUBLISHABLE_KEY) {
    return (
      <>
        <SignedOut>
          <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
            <SignIn />
          </div>
        </SignedOut>
        <SignedIn>
          {appContent}
        </SignedIn>
      </>
    );
  }

  // Graceful fallback for local mode without Clerk
  return appContent;
}
