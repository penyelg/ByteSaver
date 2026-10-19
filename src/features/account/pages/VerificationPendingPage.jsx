import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import './ProfileSetupPage.css';

export default function VerificationPendingPage({ verification, onRefresh, onReviewIdentities }) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const refresh = async () => {
    setChecking(true);
    try {
      const result = await onRefresh();
      setMessage(result?.error ? result.error.message : 'Status checked. Your submission is still awaiting review.');
    } catch { setMessage('Unable to check your status. Please try again.'); }
    finally { setChecking(false); }
  };
  useEffect(() => {
    const checkOnFocus = () => { if (document.visibilityState === 'visible') onRefresh(); };
    document.addEventListener('visibilitychange', checkOnFocus);
    return () => document.removeEventListener('visibilitychange', checkOnFocus);
  }, [onRefresh]);
  return <main className="profile-setup-shell"><section className="profile-setup-panel">
    <span className="section-index">ACCOUNT VERIFICATION / PENDING</span>
    <h1>Your ID is in review.</h1>
    <p className="profile-setup-intro">Your details were submitted successfully. An administrator will review your ID before your account can buy or sell.</p>
    {verification.submitted_at && <p className="verification-help">Submitted {new Date(verification.submitted_at).toLocaleString()}</p>}
    <div className="verification-notice">You don’t need to submit again. Check your status here after the administrator reviews your account.</div>
    <p className="verification-help" role="status">{message}</p>
    <button className="profile-setup-submit" disabled={checking} onClick={refresh}>{checking ? 'CHECKING…' : 'CHECK APPROVAL STATUS'} <span>↗</span></button>
    {onReviewIdentities && <button className="profile-setup-signout" onClick={onReviewIdentities}>Back to admin dashboard</button>}
    <button className="profile-setup-signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
  </section></main>;
}
