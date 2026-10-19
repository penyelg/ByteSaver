import React, { useEffect, useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function AccountMenu({ session, onReviewIdentities }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  // used as action event listener for account menu button
  useEffect(() => {
    const closeAccountMenu = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const displayName =
    session.user.user_metadata?.display_name ||
    session.user.email?.split("@")[0] ||
    "member";
  const avatarUrl =
    session.user.user_metadata?.avatar_url ||
    session.user.user_metadata?.picture ||
    session.user.user_metadata?.image_url;
  const signOut = async () => {
    setAccountOpen(false);
    await supabase?.auth.signOut();
  };

  return (
    <div className="account-menu" ref={accountRef}>
      <button
        className={`profile-trigger ${accountOpen ? "open" : ""}`}
        type="button"
        aria-label={`Open account menu for ${displayName}`}
        aria-expanded={accountOpen}
        aria-haspopup="menu"
        onClick={() => setAccountOpen((isOpen) => !isOpen)}
      >
        <span className="profile-trigger-icon">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <UserRound aria-hidden="true" />
          )}
        </span>
        <span className="online-dot" />
      </button>
      {accountOpen && (
        <div className="account-dropdown" role="menu">
          <div className="account-summary">
            <span className="account-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : (
                displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <span>
              <strong>{displayName}</strong>
              <small>{session.user.email}</small>
            </span>
          </div>
          <div className="account-divider" />
          {onReviewIdentities && <button className="sign-out-button" type="button" role="menuitem" onClick={() => { setAccountOpen(false); onReviewIdentities(); }}>Admin dashboard</button>}
          <button
            className="sign-out-button"
            type="button"
            role="menuitem"
            onClick={signOut}
          >
            <span>↪</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
