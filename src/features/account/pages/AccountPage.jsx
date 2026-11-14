import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CalendarDays, ChevronRight, ClipboardList, LogOut, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import InstallAppButton from '../../../components/mobile/InstallAppButton';
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
            <h1>My account</h1>
            <p className="shop-account-name">{profile?.full_name || session.user.email || 'ByteSaver member'}</p>
            <span className="shop-verified"><BadgeCheck aria-hidden="true" /> Verified identity</span>
          </div>
        </div>
        <details className="shop-personal-info">
          <summary><UserRound aria-hidden="true" /> Personal information <ChevronRight aria-hidden="true" /></summary>
          <dl><div><dt><Mail aria-hidden="true" /> Email</dt><dd>{session.user.email || 'Not provided'}</dd></div><div><dt><Phone aria-hidden="true" /> Phone</dt><dd>{profile?.phone || 'Not provided'}</dd></div><div><dt><MapPin aria-hidden="true" /> Address</dt><dd>{profile?.address || 'Not provided'}</dd></div></dl>
        </details>
        <div className="member-account-links">
          <Link to="/listings/manage"><ClipboardList aria-hidden="true" /> Manage Listings <ChevronRight aria-hidden="true" /></Link>
          <Link to="/reservations"><CalendarDays aria-hidden="true" /> My Reservations <ChevronRight aria-hidden="true" /></Link>
          <InstallAppButton />
          {onAdmin && <button type="button" onClick={onAdmin}>Admin dashboard</button>}
          <button type="button" disabled={signingOut} onClick={signOut}><LogOut aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
        {error && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
