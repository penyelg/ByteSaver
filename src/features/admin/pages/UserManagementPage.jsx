import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Search, Users, RefreshCw, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AdminProfileAvatar from '../components/AdminProfileAvatar';
import { getIdentityReviewAvatars } from '../services/adminService';
import { changeUserAccess, getManagedUser, getManagedUsers } from '../services/userManagementService';
import '../styles/admin.css';
import '../styles/UserManagementPage.css';

const pageSize = 10;
const labels = { active: 'Active', suspended: 'Suspended', approved: 'Approved', pending_review: 'Pending review', rejected: 'Rejected', not_submitted: 'Not submitted' };
const dateLabel = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const nameLabel = (user) => user.full_name || user.display_name || user.email || 'Unnamed account';
const Badge = ({ value }) => <span className={`admin-status admin-user-status--${value}`}>{labels[value] || value}</span>;

export default function UserManagementPage({ session, onReview }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('user');
  const setSelectedId = (id) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (id) next.set('user', id);
    else next.delete('user');
    return next;
  }, { replace: true });
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ search: '', access: 'all', verification: 'all', page: 1 });
  const [result, setResult] = useState({ users: [], total: 0 });
  const [avatars, setAvatars] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const detailHeading = useRef(null);
  const detailDialog = useRef(null);
  const searchField = useRef(null);
  const detailOpen = Boolean(selectedId);

  useEffect(() => {
    if (!detailOpen) return;
    const dialog = detailDialog.current;
    const opener = document.activeElement;
    const fallback = searchField.current;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus();
      else fallback?.focus();
    };
  }, [detailOpen]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setResult({ users: [], total: 0 });
    getManagedUsers(filters).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) throw failure;
      if (filters.page > 1 && !data.users.length) {
        setFilters((current) => ({ ...current, page: Math.max(1, Math.ceil(data.total / pageSize)) }));
        return;
      }
      setResult(data); setLoading(false);
    }).catch((failure) => { if (active) { setError(failure.message || 'Unable to load users.'); setLoading(false); } });
    return () => { active = false; };
  }, [filters, revision]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setDetailLoading(true); setDetailError(''); setSelected(null); setReason('');
    getManagedUser(selectedId).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) throw failure;
      if (!data) throw new Error('This account is unavailable.');
      setSelected(data); setDetailLoading(false);
    }).catch((failure) => { if (active) { setDetailError(failure.message || 'Unable to load account details.'); setDetailLoading(false); } });
    return () => { active = false; };
  }, [selectedId, revision]);

  useEffect(() => { if (selected) detailHeading.current?.focus(); }, [selected]);

  const extraAvatarId = selected && !result.users.some((user) => user.id === selected.id) ? selected.id : null;
  useEffect(() => {
    const ids = new Set(result.users.map((user) => user.id));
    if (extraAvatarId) ids.add(extraAvatarId);
    if (!ids.size) return;
    const controller = new AbortController();
    async function loadAvatars() {
      const { data, error } = await getIdentityReviewAvatars([...ids]).abortSignal(controller.signal);
      if (!controller.signal.aborted && !error) {
        setAvatars(Object.fromEntries(data.map(({ user_id, avatar_url }) => [user_id, avatar_url])));
      }
    }
    loadAvatars();
    return () => controller.abort();
  }, [result.users, extraAvatarId]);

  const updateFilter = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value, page: 1 }));
    setSelectedId(null); setNotice('');
  };
  const saveAccess = async (event) => {
    event.preventDefault();
    if (reason.trim().length < 3) return setDetailError('Enter a reason of at least 3 characters.');
    setSaving(true); setDetailError(''); setNotice('');
    try {
      const { error: failure } = await changeUserAccess(selected, reason);
      if (failure) throw failure;
      setNotice(`${nameLabel(selected)} ${selected.access_status === 'active' ? 'has been suspended.' : 'has been reactivated.'}`);
      setRevision((value) => value + 1);
    } catch (failure) { setDetailError(failure.message || 'Unable to change account access.'); }
    finally { setSaving(false); }
  };
  const protectedAccount = selected && (selected.is_admin || selected.id === session.user.id);

  return <section className="admin-users" aria-label="User management">
    <div className="admin-card">
      <div className="admin-card-heading"><h2>Account directory</h2><button className="admin-secondary-button" type="button" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh</button></div>
      <form className="admin-user-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: query.trim(), page: 1 })); setSelectedId(null); setNotice(''); }}>
        <div className="admin-user-search"><label htmlFor="admin-user-search">Search accounts</label><div><input id="admin-user-search" ref={searchField} type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={150} placeholder="Name, email, or mobile number" disabled={saving} /><button className="admin-secondary-button" type="submit" disabled={saving}><Search size={16} aria-hidden="true" />Search</button></div></div>
        <label>Access<select name="access" value={filters.access} onChange={updateFilter} disabled={saving}><option value="all">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
        <label>Verification<select name="verification" value={filters.verification} onChange={updateFilter} disabled={saving}><option value="all">All verification states</option>{['not_submitted', 'pending_review', 'approved', 'rejected'].map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
      </form>
      {notice && <div className="admin-review-notice" role="status">{notice}</div>}
      {error ? <div className="admin-error" role="alert">{error}<button onClick={() => setRevision((value) => value + 1)}>Try again</button></div> : loading ? <div className="admin-empty" role="status">Loading accounts…</div> : result.users.length ? <div className="admin-table-scroll"><table className="admin-table admin-users-table">
        <thead><tr><th scope="col">Account</th><th scope="col">Verification</th><th scope="col">Access</th><th scope="col">Joined</th><th scope="col"><span className="admin-sr-only">Details</span></th></tr></thead>
        <tbody>{result.users.map((user) => <tr key={user.id} className={selectedId === user.id ? 'is-selected' : ''}>
          <td><div className="admin-applicant"><AdminProfileAvatar name={nameLabel(user)} url={avatars[user.id]} /><span><strong>{nameLabel(user)}{user.is_admin && <small className="admin-role-label">Administrator</small>}</strong><small>{user.email || 'No email'}{user.id === session.user.id ? ' · You' : ''}</small></span></div></td>
          <td><Badge value={user.verification_status} /></td><td><Badge value={user.access_status} /></td><td>{dateLabel(user.created_at)}</td>
          <td><button className="admin-secondary-button" type="button" aria-haspopup="dialog" disabled={saving} aria-label={`View ${nameLabel(user)}`} onClick={() => { setSelectedId(user.id); setNotice(''); }}>View account <ArrowRight size={15} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table></div> : <div className="admin-empty"><Users size={28} aria-hidden="true" /><h3>No accounts found.</h3><p>Try another search or change your filters.</p></div>}
      <div className="admin-card-footer admin-user-pagination"><span role="status">{!loading && !error ? `${result.total} account${result.total === 1 ? '' : 's'} · Page ${filters.page} of ${Math.max(1, Math.ceil(result.total / pageSize))}` : 'Accounts directory'}</span><div><button className="admin-secondary-button" disabled={loading || saving || filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><button className="admin-secondary-button" disabled={loading || saving || filters.page * pageSize >= result.total} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></div></div>
    </div>

    {detailOpen && <dialog ref={detailDialog} className="admin-user-dialog" aria-labelledby="admin-account-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) setSelectedId(null); }}
      onClick={(event) => { if (event.target === event.currentTarget && !saving) setSelectedId(null); }}>
      <section className="admin-review admin-user-detail" aria-busy={detailLoading}>
      <header className="admin-user-detail-heading">
        <div className="admin-applicant">
          {selected && <AdminProfileAvatar name={nameLabel(selected)} url={avatars[selected.id]} />}
          <div><h2 id="admin-account-title" ref={detailHeading} tabIndex={-1}>{selected ? nameLabel(selected) : 'Account details'}</h2>
          {selected && <><p className="admin-user-profile-role">{selected.is_admin ? 'Administrator' : 'Marketplace member'}</p>
            <div className="admin-user-detail-status"><Badge value={selected.verification_status} /><Badge value={selected.access_status} /></div>
          </>}</div>
        </div>
        <button type="button" className="admin-secondary-button" aria-label="Close account details" disabled={saving} onClick={() => setSelectedId(null)}><X size={18} aria-hidden="true" /></button>
      </header>
      {notice && <div className="admin-review-notice" role="status">{notice}</div>}
      {detailError && <div className="admin-error" role="alert">{detailError}<button disabled={saving} onClick={() => setRevision((value) => value + 1)}>Reload account</button></div>}
      {detailLoading ? <p className="admin-muted" role="status">Loading account details…</p> : selected && <>
        <section className="admin-user-profile-details" aria-labelledby="admin-user-information">
          <div className="admin-user-section-heading">
            <h3 id="admin-user-information">Account information</h3>
            {selected.verification_id && <button className="admin-text-button" type="button" disabled={saving} onClick={() => onReview(selected.verification_id, selected.verification_status)}>View ID review <ArrowRight size={14} aria-hidden="true" /></button>}
          </div>
          <dl className="admin-user-facts">
            <div><dt>Email</dt><dd>{selected.email || '—'}</dd></div>
            <div><dt>Mobile number</dt><dd>{selected.phone || '—'}</dd></div>
            <div><dt>Location</dt><dd>{[selected.address, selected.barangay_name, selected.barangay_name ? 'Isabel, Leyte' : null].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Joined</dt><dd>{dateLabel(selected.created_at)}</dd></div>
            <div className="admin-user-account-id"><dt>Account ID</dt><dd>{selected.id}</dd></div>
          </dl>
        </section>
        {protectedAccount ? <p className="admin-review-notice">Administrator accounts and your own account are protected from access changes here.</p> : <form className="admin-review-form" onSubmit={saveAccess}>
          <h3>{selected.access_status === 'active' ? 'Suspend account' : 'Reactivate account'}</h3>
          <p className="admin-muted">{selected.access_status === 'active' ? 'Suspension blocks marketplace access and new listings, and hides this seller’s existing listings. Their verification record is preserved.' : 'Reactivation restores marketplace access according to the account’s existing verification status and makes their listings visible again.'}</p>
          <label>Reason for {selected.access_status === 'active' ? 'suspension' : 'reactivation'}<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={1000} disabled={saving} placeholder="Record why this account’s access should change." /><span className="admin-muted">This reason is recorded in the access history. A suspension reason is also shown to the account owner.</span></label>
          <div><button className={selected.access_status === 'active' ? 'admin-secondary-button admin-danger-button' : 'admin-primary-button'} disabled={saving} type="submit">{saving ? 'Saving…' : selected.access_status === 'active' ? 'Suspend account' : 'Reactivate account'}</button></div>
        </form>}
        <details className="admin-access-history">
          <summary><span>Access history <span className="admin-user-history-count">({selected.history.length})</span></span><ChevronDown size={16} aria-hidden="true" /></summary>
          {selected.history.length ? <ol>{selected.history.map((entry) => <li key={entry.id}><div><Badge value={entry.status} /><time dateTime={entry.changed_at}>{dateLabel(entry.changed_at)}</time></div><p>{entry.reason}</p><small>By {entry.changed_by_name || entry.changed_by || 'Former administrator'}</small></li>)}</ol> : <p className="admin-muted">No access changes recorded.</p>}
        </details>
      </>}
      </section>
    </dialog>}
  </section>;
}
