import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, LayoutDashboard, ShieldCheck, Users, Package, LogOut, RefreshCw, Menu, X } from 'lucide-react';
import wordmark from '../../../assets/bytesaver-wordmark-primary.png';
import { supabase } from '../../../lib/supabase';
import { getDashboardSummary, getPendingRequests } from '../services/adminService';
import AdminOverview from '../components/AdminOverview';
import IdentityReviewPage from './IdentityReviewPage';
import '../styles/admin.css';

export default function AdminDashboardPage({ session, onMarketplace, onVerify }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isReviews = location.pathname === '/admin/verifications';
  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([getDashboardSummary(), getPendingRequests()]).then(([counts, queue]) => {
      if (!active) return;
      if (queue.error) throw queue.error;
      setSummary(counts); setPending(queue.data || []); setLoading(false);
    }).catch((failure) => { if (active) { setError(failure.message || 'Unable to load dashboard data. Please refresh.'); setSummary(null); setPending([]); setLoading(false); } });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  const refreshSummary = useCallback(() => setRevision((value) => value + 1), []);
  const openReviews = (id = null) => { setSelectedId(id); setMenuOpen(false); navigate('/admin/verifications'); };
  const goOverview = () => { setMenuOpen(false); setSelectedId(null); navigate('/admin'); };
  const signOut = async () => {
    setSigningOut(true);
    try { const { error } = await supabase.auth.signOut(); if (error) throw error; }
    catch (failure) { setError(failure.message || 'Unable to sign out. Try again.'); }
    finally { setSigningOut(false); }
  };
  const name = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'Administrator';
  return <div className="admin-workspace">
    {menuOpen && <button className="admin-sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`admin-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Administrator workspace">
      <a className="admin-brand" href="/admin" onClick={(event) => { event.preventDefault(); goOverview(); }}><img src={wordmark} alt="ByteSaver" /><span>ADMIN WORKSPACE</span></a>
      <div className="admin-sidebar-label">WORKSPACE</div>
      <nav className="admin-navigation" aria-label="Administration navigation">
        <a href="/admin" aria-current={!isReviews ? 'page' : undefined} onClick={(event) => { event.preventDefault(); goOverview(); }}><LayoutDashboard size={18} aria-hidden="true" /><span>Overview</span></a>
        <a href="/admin/verifications" aria-current={isReviews ? 'page' : undefined} onClick={(event) => { event.preventDefault(); openReviews(); }}><ShieldCheck size={18} aria-hidden="true" /><span>Identity verification</span>{summary?.pending_review > 0 && <b>{summary.pending_review}</b>}</a>
        <button disabled title="User management is planned for a later update"><Users size={18} aria-hidden="true" /><span>Users</span><small>SOON</small></button>
        <button disabled title="Listing moderation is planned for a later update"><Package size={18} aria-hidden="true" /><span>Listings</span><small>SOON</small></button>
      </nav>
      <div className="admin-sidebar-bottom"><div className="admin-workspace-note"><ShieldCheck size={17} aria-hidden="true" /><p>A trusted marketplace<br /><span>starts with verified people.</span></p></div>
        {onMarketplace && <button className="admin-sidebar-link" onClick={onMarketplace}>Go to marketplace <ArrowUpRight size={16} aria-hidden="true" /></button>}
        {onVerify && <button className="admin-sidebar-link" onClick={onVerify}>Verify my own account <ArrowUpRight size={16} aria-hidden="true" /></button>}
        <div className="admin-profile"><span className="admin-avatar">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>Administrator</small></div><button aria-label="Sign out" title="Sign out" disabled={signingOut} onClick={signOut}><LogOut size={17} aria-hidden="true" /></button></div>
      </div>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><div><button className="admin-mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><span>Administration</span><span className="admin-breadcrumb-slash">/</span><strong>{isReviews ? 'Identity verification' : 'Overview'}</strong></div><span className="admin-topbar-date">{new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span></header>
      <main className="admin-content"><div className="admin-page-heading"><div><span className="admin-eyebrow">BYTESAVER CONTROL CENTER</span><h1>{isReviews ? 'Identity verification' : 'Dashboard overview'}</h1><p>{isReviews ? 'Review submitted IDs and help new members join the marketplace.' : 'A clear view of account verification and what needs your attention.'}</p></div>{!isReviews && <button className="admin-secondary-button" disabled={loading} onClick={refreshSummary}><RefreshCw size={15} className={loading ? 'admin-spinning' : ''} aria-hidden="true" />Refresh</button>}</div>
        {error && <div className="admin-error" role="alert">{error}<button onClick={refreshSummary}>Try again</button></div>}
        {isReviews ? <IdentityReviewPage session={session} initialSubmissionId={selectedId} onDecision={refreshSummary} /> : error && !summary ? <div className="admin-empty">Dashboard data is unavailable. Try refreshing to load your verification queue.</div> : <AdminOverview summary={summary} pending={pending} loading={loading} onReview={openReviews} />}
        <footer className="admin-footer"><span>ByteSaver · Administration</span><span>Isabel, Leyte</span></footer>
      </main>
    </div>
  </div>;
}
