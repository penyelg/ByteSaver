import React, { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { ShieldAlert } from 'lucide-react';
import { MobileBrand } from '../../../components/mobile/MobileNavigation';
import '../styles/account.css';
import '../styles/AccountSuspendedPage.css';

// Explain the access restriction without removing the account’s verification or saved items.
export default function AccountSuspendedPage({ access, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  
  // The parent refreshes account access and handles leaving this screen after reactivation.
  const checkStatus = async () => {
    setChecking(true);
    try {
      const result = await onRefresh();
      setMessage(
        result?.error?.message ||
          "Status checked. Your account is still suspended.",
      );
    } catch {
      setMessage("Unable to check your status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="profile-setup-shell account-suspended-page">
      <section className="profile-setup-panel">
        <MobileBrand />
        <ShieldAlert className="shop-status-icon shop-status-icon--restricted" aria-hidden="true" />
        <h1>Your account is suspended.</h1>
        <p className="profile-setup-intro">
          Marketplace access is paused. Your verification record and saved items
          are preserved. Contact the ByteSaver administrator if you believe this
          needs review.
        </p>
        {/* Show the administrator’s recorded reason so the account owner understands the restriction. */}
        <div className="verification-notice">
          <strong>Reason for suspension</strong>
          <p>{access.reason}</p>
        </div>
        <p className="verification-help" role="status">
          {message}
        </p>

        <button
          className="profile-setup-submit"
          disabled={checking}
          onClick={checkStatus}
        >
          {checking ? "CHECKING…" : "CHECK ACCOUNT STATUS"}
          <span aria-hidden="true">↗</span>
        </button>

        <button
          className="profile-setup-signout"
          onClick={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) setMessage(error.message);
          }}
        >
          Sign out
        </button>
        
      </section>
    </main>
  );
}
