import React from 'react'
import googleMark from '../../../assets/google-mark.png'

export default function GoogleSignInButton({ onClick, busy }) {
  return (
    <button className="google-button" type="button" onClick={onClick} disabled={busy}>
      <img className="google-mark" src={googleMark} alt="" aria-hidden="true" />
      <span>{busy ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}</span>
      <span className="google-arrow" aria-hidden="true">↗</span>
    </button>
  )
}
