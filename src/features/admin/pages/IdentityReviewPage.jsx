import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import AdminProfileAvatar from '../components/AdminProfileAvatar';
import { getBarangays } from '../../account/services/profileService';
import { getIdentityPhoto, getIdentityReviewAvatars, getReviewQueue, getReviewSubmission, reviewIdentity } from '../services/adminService';
import '../styles/admin.css';
import '../styles/IdentityReviewPage.css';

export default function IdentityReviewPage({ session, onDecision, initialSubmissionId, initialStatus = 'pending_review' }) {
  const [status, setStatus] = useState(initialStatus);
  const [rows, setRows] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [selected, setSelected] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [photo, setPhoto] = useState('');
  const photoDialog = useRef(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { getBarangays().then(({ data }) => setBarangays(data || [])); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setSelected(null); setPhoto(''); setError('');
    Promise.all([getReviewQueue(status), initialSubmissionId ? getReviewSubmission(initialSubmissionId) : Promise.resolve({ data: null })]).then(([queue, requested]) => {
      if (!active) return;
      const error = queue.error || requested.error;
      const selectedRow = requested.data?.status === status ? requested.data : null;
      const data = selectedRow && !queue.data?.some((row) => row.id === selectedRow.id) ? [selectedRow, ...(queue.data || [])] : queue.data;
      if (error) { setRows([]); setError(error.message); }
      else {
        setRows(data || []);
        if (initialSubmissionId) setSelected(selectedRow);
      }
      setLoading(false);
    }).catch(() => { if (active) { setRows([]); setError('Unable to load submissions. Try refreshing.'); setLoading(false); } });
    return () => { active = false; };
  }, [status, revision, initialSubmissionId]);
  useEffect(() => {
    const userIds = [...new Set(rows.map((row) => row.user_id))];
    if (!userIds.length) return;
    const controller = new AbortController();
    async function loadAvatars() {
      const { data, error } = await getIdentityReviewAvatars(userIds).abortSignal(controller.signal);
      if (!controller.signal.aborted && !error) {
        setAvatars(Object.fromEntries(data.map(({ user_id, avatar_url }) => [user_id, avatar_url])));
      }
    }
    loadAvatars();
    return () => controller.abort();
  }, [rows]);
  useEffect(() => {
    let active = true;
    setPhoto(''); setReason('');
    if (selected) getIdentityPhoto(selected.document_path).then(({ data, error }) => {
      if (!active) return;
      if (error) setError('Unable to load the private photo. Select the submission again to retry.');
      else setPhoto(data.signedUrl);
    }).catch(() => { if (active) setError('Unable to load the ID photo.'); });
    return () => { active = false; };
  }, [selected]);
  const decide = async (event, decision) => {
    event.preventDefault();
    if (reason.trim().length < 3) return setError('Enter a review note of at least 3 characters.');
    setSaving(true); setError(''); setNotice('');
    try {
      const { error } = await reviewIdentity(selected.id, decision, reason);
      if (error) throw error;
      setNotice(`Submission ${decision}. The account status has been updated.`);
      setRevision((value) => value + 1);
      onDecision?.();
    } catch (failure) { setError(failure.message || 'Unable to save the decision.'); }
    finally { setSaving(false); }
  };
  return <section className="admin-review admin-identity-workspace">
    <div className="review-toolbar">
      <label>Status <select value={status} disabled={saving} onChange={(event) => { setNotice(''); setStatus(event.target.value); }}>
        <option value="pending_review">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select></label>
      <button className="admin-review-secondary" disabled={saving || loading} onClick={() => setRevision((value) => value + 1)}>Refresh queue</button>
      {status === 'pending_review' && <span className="admin-muted">Oldest submissions first</span>}
    </div>
    {error && <div className="admin-review-error" role="alert">{error}</div>}
    {notice && <p className="admin-review-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading submissions…</p> : !rows.length && !selected
      ? <p className="admin-empty admin-identity-empty">No submissions in this queue.</p>
      : <div className="review-layout">
      <div className="admin-identity-queue">
        {rows.length > 0 ? <div className="admin-table-scroll"><table className="admin-table" aria-label="Identity submissions">
          <thead><tr><th scope="col">Applicant</th><th scope="col">Submitted</th><th scope="col"><span className="admin-sr-only">Action</span></th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className={selected?.id === row.id ? 'admin-identity-selected' : undefined}>
            <td><div className="admin-applicant">
              <AdminProfileAvatar name={row.full_name} url={avatars[row.user_id]} />
              <span><strong>{row.full_name}</strong><small>{row.id_type}</small></span>
            </div></td>
            <td>{new Date(row.submitted_at).toLocaleDateString('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' })}</td>
            <td><button type="button" className="admin-secondary-button" aria-pressed={selected?.id === row.id} aria-label={`Review ${row.full_name}`} disabled={saving} onClick={() => { setError(''); setSelected({ ...row }); document.getElementById('identity-review-detail')?.focus(); }}>Review</button></td>
          </tr>)}</tbody>
        </table></div> : <p className="admin-empty">No submissions in this queue.</p>}
        {rows.length === 100 && <p className="admin-review-help">Showing the first 100 submissions. Review pending accounts and refresh for more.</p>}
      </div>
      <section className="review-detail" id="identity-review-detail" tabIndex={-1} aria-label="Submission details">{selected ? <>
        <div className="admin-identity-applicant-heading">
          <AdminProfileAvatar name={selected.full_name} url={avatars[selected.user_id]} />
          <h2>{selected.full_name}</h2>
        </div>
        <dl><dt>Address</dt><dd>{selected.address}, {barangays.find((item) => item.id === selected.barangay_id)?.name || selected.barangay_id}, Isabel, Leyte</dd>
          <dt>Mobile number</dt><dd>{selected.phone}</dd><dt>ID type</dt><dd>{selected.id_type}</dd></dl>
        {photo ? <div className="admin-identity-preview">
          <button className="admin-identity-photo-trigger" type="button" aria-haspopup="dialog" onClick={() => photoDialog.current.showModal()}>
            <img className="review-photo" src={photo} referrerPolicy="no-referrer" alt="" onError={() => { setPhoto(''); setError('Photo access expired or the image could not load. Select the submission again.'); }} />
            <span className="admin-identity-photo-overlay">
              <span className="admin-identity-photo-label"><Maximize2 size={19} strokeWidth={1.7} aria-hidden="true" />View image</span>
            </span>
          </button>
          <dialog ref={photoDialog} className="admin-identity-photo-dialog" aria-label="Enlarged ID photo" onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}>
            <div className="admin-identity-photo-frame">
              <button className="admin-secondary-button" type="button" aria-label="Close ID photo" autoFocus onClick={() => photoDialog.current.close()}><X size={18} aria-hidden="true" /></button>
              <img src={photo} referrerPolicy="no-referrer" alt={`Submitted ${selected.id_type} for ${selected.full_name}`} />
            </div>
          </dialog>
        </div> : <p className="admin-review-help">Private photo preview is unavailable or loading.</p>}
        {selected.status === 'pending_review' ? selected.user_id === session.user.id ? <p className="admin-review-notice">You cannot review your own submission. Another administrator must review it.</p> :
          <form className="admin-review-form" onSubmit={(event) => decide(event, 'approved')}>
            <label>Review note<textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={1000} disabled={saving} placeholder="Record your assessment. For rejection, explain what the applicant must correct." /></label>
            <div className="admin-review-actions"><button className="admin-review-submit" disabled={saving || !photo} type="submit">{saving ? 'Saving…' : 'Approve account'}</button>
              <button className="admin-review-secondary review-reject" disabled={saving || !photo} type="button" onClick={(event) => decide(event, 'rejected')}>Reject submission</button></div>
          </form> : <div className="admin-review-notice"><strong>{selected.status.toUpperCase()}</strong><p>{selected.review_reason}</p><small>Reviewed {new Date(selected.reviewed_at).toLocaleString()} · Reviewer {selected.reviewed_by}</small></div>}
      </> : <p className="admin-empty">Select a submission to review its private ID photo.</p>}</section>
    </div>}
  </section>;
}

