import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Users, RefreshCw } from 'lucide-react';
import { changeUserAccess, getManagedUser, getManagedUsers } from '../services/userManagementService';
import '../styles/admin.css';
import '../styles/UserManagementPage.css';

const labels = { active: 'Active', suspended: 'Suspended', approved: 'Approved', pending_review: 'Pending review', rejected: 'Rejected', not_submitted: 'Not submitted' };
const dateLabel = (value) => value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const nameLabel = (user) => user.full_name || user.display_name || user.email || 'Unnamed account';
const Badge = ({ value }) => <span className={`admin-status admin-user-status--${value}`}>{labels[value] || value}</span>;

export default function UserManagementPage({ session, onReview }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ search: '', access: 'all', verification: 'all', page: 1 });
  const [result, setResult] = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const detailHeading = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setResult({ users: [], total: 0 });
    getManagedUsers(filters).then(({ data, error: failure }) => {
      if (!active) return;
      if (failure) throw failure;
      if (filters.page > 1 && !data.users.length) {
        setFilters((current) => ({ ...current, page: Math.max(1, Math.ceil(data.total / 20)) }));
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
      setSelected(data); setDetailLoading(false);
    }).catch((failure) => { if (active) { setDetailError(failure.message || 'Unable to load account details.'); setDetailLoading(false); } });
    return () => { active = false; };
  }, [selectedId, revision]);

  useEffect(() => { if (selected) detailHeading.current?.focus(); }, [selected]);

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
      <div className="admin-card-heading"><div><span className="admin-eyebrow">MARKETPLACE MEMBERS</span><h2>Accounts directory</h2></div><Users size={22} aria-hidden="true" /></div>
      <p className="admin-card-description">Find an account, check verification, and manage marketplace access.</p>
      <form className="admin-user-filters" onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: query.trim(), page: 1 })); setSelectedId(null); setNotice(''); }}>
        <label className="admin-user-search">Search accounts<div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={150} placeholder="Name, email, or mobile number" disabled={saving} /><button className="admin-secondary-button" type="submit" disabled={saving}><Search size={16} aria-hidden="true" />Search</button></div></label>
        <label>Access<select name="access" value={filters.access} onChange={updateFilter} disabled={saving}><option value="all">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
        <label>Verification<select name="verification" value={filters.verification} onChange={updateFilter} disabled={saving}><option value="all">All verification states</option>{['not_submitted', 'pending_review', 'approved', 'rejected'].map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
        <button className="admin-secondary-button" type="button" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh</button>
      </form>
      {notice && <div className="admin-review-notice" role="status">{notice}</div>}
      {error ? <div className="admin-error" role="alert">{error}<button onClick={() => setRevision((value) => value + 1)}>Try again</button></div> : loading ? <div className="admin-empty" role="status">Loading accounts…</div> : result.users.length ? <div className="admin-table-scroll"><table className="admin-table admin-users-table">
        <thead><tr><th scope="col">Account</th><th scope="col">Verification</th><th scope="col">Access</th><th scope="col">Joined</th><th scope="col"><span className="admin-sr-only">Details</span></th></tr></thead>
        <tbody>{result.users.map((user) => <tr key={user.id} className={selectedId === user.id ? 'is-selected' : ''}>
          <td><div className="admin-applicant"><span className="admin-avatar" aria-hidden="true">{nameLabel(user).slice(0, 1).toUpperCase()}</span><span><strong>{nameLabel(user)}{user.is_admin && <small className="admin-role-label">Administrator</small>}</strong><small>{user.email || 'No email'}{user.id === session.user.id ? ' · You' : ''}</small></span></div></td>
          <td><Badge value={user.verification_status} /></td><td><Badge value={user.access_status} /></td><td>{dateLabel(user.created_at)}</td>
          <td><button className="admin-text-button" disabled={saving} aria-label={`View ${nameLabel(user)}`} onClick={() => { setSelectedId(user.id); setNotice(''); }}>View <ArrowRight size={15} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table></div> : <div className="admin-empty"><Users size={28} aria-hidden="true" /><h3>No accounts found.</h3><p>Try another search or change your filters.</p></div>}
      <div className="admin-card-footer admin-user-pagination"><span role="status">{!loading && !error ? `${result.total} account${result.total === 1 ? '' : 's'} · Page ${filters.page} of ${Math.max(1, Math.ceil(result.total / 20))}` : 'Accounts directory'}</span><div><button className="admin-secondary-button" disabled={loading || saving || filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><button className="admin-secondary-button" disabled={loading || saving || filters.page * 20 >= result.total} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></div></div>
    </div>

    {selectedId && <section className="admin-review admin-user-detail" aria-label="Account details" aria-busy={detailLoading}>
      <div className="admin-user-detail-heading"><h2 ref={detailHeading} tabIndex={-1}>{selected ? nameLabel(selected) : 'Account details'}</h2><button className="admin-secondary-button" disabled={saving} onClick={() => { setSelectedId(null); document.querySelector('.admin-user-search input')?.focus(); }}>Close</button></div>
      {detailError && <div className="admin-error" role="alert">{detailError}<button disabled={saving} onClick={() => setRevision((value) => value + 1)}>Reload account</button></div>}
      {detailLoading ? <p className="admin-muted" role="status">Loading account details…</p> : selected && <>
        <div className="review-detail"><dl>
          <dt>Account ID</dt><dd>{selected.id}</dd><dt>Email</dt><dd>{selected.email || '—'}</dd><dt>Mobile number</dt><dd>{selected.phone || '—'}</dd>
          <dt>Location</dt><dd>{[selected.address, selected.barangay_name, selected.barangay_name ? 'Isabel, Leyte' : null].filter(Boolean).join(', ') || '—'}</dd>
          <dt>Joined</dt><dd>{dateLabel(selected.created_at)}</dd><dt>Role</dt><dd>{selected.is_admin ? 'Administrator' : 'Member'}</dd>
          <dt>Verification</dt><dd><Badge value={selected.verification_status} /> {selected.verification_id && <button className="admin-text-button" disabled={saving} onClick={() => onReview(selected.verification_id, selected.verification_status)}>View ID review <ArrowRight size={14} aria-hidden="true" /></button>}</dd>
          <dt>Account access</dt><dd><Badge value={selected.access_status} /></dd>
        </dl></div>
        {protectedAccount ? <p className="admin-review-notice">Administrator accounts and your own account are protected from access changes here.</p> : <form className="admin-review-form" onSubmit={saveAccess}>
          <h3>{selected.access_status === 'active' ? 'Suspend account' : 'Reactivate account'}</h3>
          <p className="admin-muted">{selected.access_status === 'active' ? 'Suspension blocks marketplace access and new listings, and hides this seller’s existing listings. Their verification record is preserved.' : 'Reactivation restores marketplace access according to the account’s existing verification status and makes their listings visible again.'}</p>
          <label>Reason for {selected.access_status === 'active' ? 'suspension' : 'reactivation'}<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={1000} disabled={saving} placeholder="Record why this account’s access should change." /><span className="admin-muted">This reason is recorded in the access history. A suspension reason is also shown to the account owner.</span></label>
          <div><button className={selected.access_status === 'active' ? 'admin-secondary-button admin-danger-button' : 'admin-primary-button'} disabled={saving} type="submit">{saving ? 'Saving…' : selected.access_status === 'active' ? 'Suspend account' : 'Reactivate account'}</button></div>
        </form>}
        <div className="admin-access-history"><h3>Access history</h3>{selected.history.length ? <ol>{selected.history.map((entry) => <li key={entry.id}><div><Badge value={entry.status} /><time dateTime={entry.changed_at}>{dateLabel(entry.changed_at)}</time></div><p>{entry.reason}</p><small>By {entry.changed_by_name || entry.changed_by || 'Former administrator'}</small></li>)}</ol> : <p className="admin-muted">No access changes recorded. Accounts start active.</p>}</div>
      </>}
    </section>}
  </section>;
}
