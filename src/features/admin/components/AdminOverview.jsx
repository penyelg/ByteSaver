import React from 'react';
import { ArrowRight, Clock3, ShieldCheck, Users, Package, FileCheck2, CircleCheck, CircleX } from 'lucide-react';

const dateLabel = (value) => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminOverview({ summary, pending, loading, onReview }) {
  const metrics = [
    { label: 'Awaiting review', value: summary?.pending_review, note: 'Accounts that need your attention', icon: Clock3, emphasis: true },
    { label: 'Approved accounts', value: summary?.approved, note: 'Identity verified for buying and selling', icon: CircleCheck },
    { label: 'Rejected submissions', value: summary?.rejected, note: 'Includes earlier submission attempts', icon: CircleX },
    { label: 'Total ID submissions', value: summary ? summary.pending_review + summary.approved + summary.rejected : null, note: 'All verification attempts', icon: FileCheck2 },
  ];
  return <>
    <div className="admin-metrics" aria-label="Verification statistics" aria-busy={loading}>
      {metrics.map(({ label, value, note, icon: Icon, emphasis }) => <article className={`admin-metric ${emphasis ? 'admin-metric-primary' : ''}`} key={label}>
        <div><span>{label}</span><Icon size={17} aria-hidden="true" /></div>
        <strong>{loading || value == null ? '—' : value.toLocaleString()}</strong><small>{note}</small>
      </article>)}
    </div>
    <div className="admin-overview-grid">
      <section className="admin-card admin-pending-card">
        <div className="admin-card-heading"><div><span className="admin-eyebrow">YOUR WORK QUEUE</span><h2>New verification requests</h2></div>
          <button className="admin-text-button" onClick={() => onReview()}>View queue <ArrowRight size={15} aria-hidden="true" /></button></div>
        <p className="admin-card-description">Start with the oldest submissions waiting for approval.</p>
        {loading ? <div className="admin-empty" role="status">Loading verification requests…</div> : pending.length ? <div className="admin-table-scroll"><table className="admin-table">
          <thead><tr><th>Applicant</th><th>Submitted</th><th>Status</th><th><span className="admin-sr-only">Action</span></th></tr></thead>
          <tbody>{pending.slice(0, 5).map((row) => <tr key={row.id}>
            <td><div className="admin-applicant"><span className="admin-avatar" aria-hidden="true">{row.full_name.slice(0, 1).toUpperCase()}</span><span><strong>{row.full_name}</strong><small>{row.id_type}</small></span></div></td>
            <td>{dateLabel(row.submitted_at)}</td><td><span className="admin-status"><i />Pending</span></td>
            <td><button className="admin-row-action" aria-label={`Review ${row.full_name}`} onClick={() => onReview(row.id)}><ArrowRight size={17} aria-hidden="true" /></button></td>
          </tr>)}</tbody>
        </table></div> : <div className="admin-empty"><ShieldCheck size={30} aria-hidden="true" /><h3>You’re all caught up.</h3><p>New ID submissions will appear here when an account is ready for review.</p></div>}
        <div className="admin-card-footer"><span>{pending.length ? 'Showing up to 5 of the oldest pending requests' : 'No pending requests'}</span><span>Private documents · Admin access</span></div>
      </section>
      <aside className="admin-card admin-checklist">
        <span className="admin-eyebrow">BEFORE YOU APPROVE</span><h2>A careful review builds trust.</h2>
        <ol><li><span>01</span><div><strong>Check the photo</strong><p>The ID should be readable, with its details and corners visible.</p></div></li>
          <li><span>02</span><div><strong>Compare the details</strong><p>Review the submitted name and information against the ID.</p></div></li>
          <li><span>03</span><div><strong>Record your decision</strong><p>Leave a clear note, especially when something needs correcting.</p></div></li></ol>
        <button className="admin-primary-button" onClick={() => onReview()}>Open verification queue <ArrowRight size={16} aria-hidden="true" /></button>
      </aside>
    </div>
    <section className="admin-roadmap" aria-label="Future administration tools"><div className="admin-section-label"><h2>Your admin workspace, growing with ByteSaver.</h2><span>COMING LATER</span></div>
      <div className="admin-future-grid">{[{ icon: Users, title: 'User management', copy: 'A dedicated place to monitor accounts and manage user access.' }, { icon: Package, title: 'Listing moderation', copy: 'Review and approve hardware listings when moderation is introduced.' }].map(({ icon: Icon, title, copy }) => <article className="admin-future-card" key={title}><Icon size={22} aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div><span>Planned</span></article>)}</div>
    </section>
  </>;
}
