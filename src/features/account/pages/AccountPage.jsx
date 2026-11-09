import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronRight, ClipboardList, LogOut, UserRound } from 'lucide-react';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import { supabase } from '../../../lib/supabase';
import '../../listings/styles/SellListingPage.css';
import '../styles/AccountPage.css';

export default function AccountPage({ session, profile, onBack, onAdmin }) {
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState(null);
  const { avatar_url, picture } = session.user.user_metadata || {};
  const avatarUrl = avatar_url || picture;

  async function signOut() {
    setSigningOut(true);
    setError('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError('Unable to sign out. Try again.');
      setSigningOut(false);
    }
  }

  return (
    <main className="sell-page member-account">
      <MobileBrand />
      <button className="back-button" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Back to marketplace</button>
      <section className="sell-page-panel">
        <div className="sell-page-heading member-account-heading">
          <span className="member-account-avatar" aria-hidden="true">
            {avatarUrl && avatarUrl !== failedAvatar ? (
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatarUrl)} />
            ) : <UserRound />}
          </span>
          <div>
            <h1>Account</h1>
            <p>{profile?.full_name || session.user.email || 'ByteSaver member'}</p>
          </div>
        </div>
        <div className="member-account-links">
          <Link to="/listings/manage"><ClipboardList aria-hidden="true" /> Manage Listings <ChevronRight aria-hidden="true" /></Link>
          <Link to="/reservations"><CalendarDays aria-hidden="true" /> My Reservations <ChevronRight aria-hidden="true" /></Link>
          {onAdmin && <button type="button" onClick={onAdmin}>Admin dashboard</button>}
          <button type="button" disabled={signingOut} onClick={signOut}><LogOut aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
