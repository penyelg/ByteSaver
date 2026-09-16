import React from 'react'
import { Link } from 'react-router-dom'

export default function AuthModeSwitch({ mode }) {
  return (
    <div className="mode-switch" role="tablist" aria-label="Authentication mode">
      <Link className={mode === 'login' ? 'active' : ''} to="/?mode=login">SIGN IN</Link>
      <Link className={mode === 'register' ? 'active' : ''} to="/?mode=register">REGISTER</Link>
    </div>
  )
}
