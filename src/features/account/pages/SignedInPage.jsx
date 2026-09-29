import React from 'react'
import { supabase } from '../lib/supabase'
import './SignedInPage.css'

export default function SignedInPage({ session }) {
  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  const displayName = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'member'

  return (
    <main className="signed-in-shell">
      <section className="signed-in-panel">
        <span className="section-index">ACCESS VERIFIED / 03</span>
        <h1>Good to see you, {displayName}.</h1>
        <p>Your ByteSaver session is active. The marketplace workspace will appear here next.</p>
        <button className="submit-button" type="button" onClick={signOut}>SIGN OUT <span>↗</span></button>
      </section>
    </main>
  )
}
