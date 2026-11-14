import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Check, Clock3 } from 'lucide-react';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import '../styles/account.css';
import '../styles/VerificationPendingPage.css';

// Keep applicants informed while their submitted ID awaits an administrator’s decision.
export default function VerificationPendingPage({ verification, onRefresh, onReviewIdentities }) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  // Recheck through the parent; its updated profile determines whether this screen is still needed.
  const refresh = async () => {
    setChecking(true);
    try {
      const result = await onRefresh();
      setMessage(result?.error ? result.error.message : 'Status checked. Your submission is still awaiting review.');
    } catch { setMessage('Unable to check your status. Please try again.'); }
    finally { setChecking(false); }
  };
  // Also recheck when the user returns to this tab, and remove the listener on cleanup.
  useEffect(() => {
    const checkOnFocus = () => { if (document.visibilityState === 'visible') onRefresh(); };
    document.addEventListener('visibilitychange', checkOnFocus);
    return () => document.removeEventListener('visibilitychange', checkOnFocus);
  }, [onRefresh]);
  return <main className="profile-setup-shell verification-pending-page"><section className="profile-setup-panel">
    <MobileBrand />
    <Clock3 className="shop-status-icon" aria-hidden="true" />
    <h1>Verification in progress</h1>
    <p className="profile-setup-intro">Your details were submitted successfully. An administrator will review your ID before your account can buy or sell.</p>
    <ol className="shop-verification-timeline"><li><Check aria-hidden="true" /><div><strong>Profile completed</strong><span>Your personal details are saved.</span></div></li><li><Check aria-hidden="true" /><div><strong>ID submitted</strong><span>Your photo was received.</span></div></li><li><Clock3 aria-hidden="true" /><div><strong>Admin review</strong><span>Waiting for a decision.</span></div></li></ol>
    {verification.submitted_at && <p className="verification-help">Submitted {new Date(verification.submitted_at).toLocaleString()}</p>}
    <div className="verification-notice">You don’t need to submit again. Check your status here after the administrator reviews your account.</div>
    <p className="verification-help" role="status">{message}</p>
    <button className="profile-setup-submit" disabled={checking} onClick={refresh}>{checking ? 'CHECKING…' : 'CHECK APPROVAL STATUS'} <span>↗</span></button>
    {onReviewIdentities && <button className="profile-setup-signout" onClick={onReviewIdentities}>Back to admin dashboard</button>}
    <button className="profile-setup-signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
  </section></main>;
}
