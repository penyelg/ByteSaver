import React from 'react'

export default function GoogleSignInButton({ onClick, busy }) {
  return (
    <button className="google-button" type="button" onClick={onClick} disabled={busy}>
      <span className="google-mark" aria-hidden="true">G</span>
      <span>{busy ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}</span>
      <span className="google-arrow" aria-hidden="true">↗</span>
    </button>
  )
}
