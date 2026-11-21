import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import GoogleSignInButton from './GoogleSignInButton'

function publicAuthMessage(error, action) {
  const code = error?.code || error?.name

  if (code === 'email_not_confirmed') {
    return 'Please confirm your email using the link we sent you, then try again.'
  }
  if (code === 'weak_password' || code === 'password_too_short') {
    return 'Choose a stronger password and try again.'
  }
  if (['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'].includes(code)) {
    return 'Too many attempts. Please wait a little while and try again.'
  }
  if (code === 'email_address_invalid') {
    return 'Enter a valid email address and try again.'
  }
  if (action === 'login' && ['invalid_credentials', 'user_not_found'].includes(code)) {
    return 'Email or password is incorrect. Check your details and try again.'
  }
  if (action === 'register' && ['user_already_exists', 'email_exists'].includes(code)) {
    return 'We couldn’t create your account. Check your details or try signing in.'
  }
  if (/failed to fetch|network|load failed/i.test(error?.message || '')) {
    return 'We couldn’t connect. Check your internet connection and try again.'
  }
  return action === 'google'
    ? 'Google sign-in couldn’t be started. Please try again.'
    : action === 'register'
      ? 'We couldn’t create your account right now. Please try again.'
      : 'We couldn’t sign you in right now. Please try again.'
}

function isValidEmailAddress(value) {
  const email = value.trim()
  const [localPart, domain, ...extraParts] = email.split('@')
  if (!localPart || !domain || extraParts.length || localPart.length > 64 || email.length > 254) return false
  if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)) return false

  const labels = domain.split('.')
  if (labels.length < 2) return false
  if (labels.some((label) => !label || label.length > 63 || !/^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label))) return false
  return /^[A-Z]{2,}$/i.test(labels.at(-1))
}

export default function AuthForm({ mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const emailInput = React.useRef(null)

  useEffect(() => {
    setEmail('')
    setPassword('')
    setPasswordVisible(false)
    setName('')
    setNotice(null)
  }, [mode])

  const signInWithGoogle = async () => {
    setNotice(null)
    setBusy(true)

    if (!supabase) {
      setNotice({ type: 'error', text: 'Sign-in is temporarily unavailable. Please try again later.' })
      setBusy(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin },
      })
      if (error) setNotice({ type: 'error', text: publicAuthMessage(error, 'google') })
    } catch (error) {
      setNotice({ type: 'error', text: publicAuthMessage(error, 'google') })
    } finally {
      setBusy(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setNotice(null)

    const normalizedEmail = email.trim()
    if (mode === 'register' && !name.trim()) {
      setNotice({ type: 'error', text: 'Enter your name to create an account.' })
      return
    }
    if (mode === 'register' && name.trim().length < 4) {
      setNotice({ type: 'error', text: 'Your name must be at least 4 characters.' })
      return
    }
    if (!normalizedEmail) {
      setNotice({ type: 'error', text: 'Enter your email address.' })
      return
    }
    if (emailInput.current?.validity.typeMismatch || !isValidEmailAddress(normalizedEmail)) {
      setNotice({ type: 'error', text: 'Enter a valid email address with a domain ending, such as name@example.com.' })
      return
    }
    if (!password) {
      setNotice({ type: 'error', text: 'Enter your password.' })
      return
    }
    if (mode === 'register' && password.length < 8) {
      setNotice({ type: 'error', text: 'Choose a password with at least 8 characters.' })
      return
    }
    if (mode === 'register' && !/[a-z]/.test(password)) {
      setNotice({ type: 'error', text: 'Add at least one lowercase letter to your password.' })
      return
    }
    if (mode === 'register' && !/[A-Z]/.test(password)) {
      setNotice({ type: 'error', text: 'Add at least one uppercase letter to your password.' })
      return
    }
    if (mode === 'register' && !/\d/.test(password)) {
      setNotice({ type: 'error', text: 'Add at least one number to your password.' })
      return
    }
    if (mode === 'register' && !/[!@#$%^&*()_+\-=\[\]{};:'"\\|<>?,./~`]/.test(password)) {
      setNotice({ type: 'error', text: 'Add at least one symbol to your password.' })
      return
    }

    setBusy(true)

    if (!supabase) {
      setNotice({ type: 'error', text: 'Sign-in is temporarily unavailable. Please try again later.' })
      setBusy(false)
      return
    }

    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({ email: normalizedEmail, password, options: { data: { display_name: name.trim() } } })

      if (result.error) {
        setNotice({ type: 'error', text: publicAuthMessage(result.error, mode) })
      } else if (mode === 'register') {
        setNotice({ type: 'success', text: 'Account created. Check your email for a confirmation link if one was sent.' })
      } else if (location.pathname !== '/reservations/payment') {
        navigate('/')
      }
    } catch (error) {
      setNotice({ type: 'error', text: publicAuthMessage(error, mode) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <GoogleSignInButton onClick={signInWithGoogle} busy={busy} />
      <div className="auth-divider"><span>OR</span></div>
      <form onSubmit={submit} noValidate>
      {mode === 'register' && (
        <label>DISPLAY NAME
          <input required value={name} 
          
            onChange={(e) => 
            setName(e.target.value)}
          
            minLength={2} maxLength={100} placeholder="e.g. Peniel Padilla"
            autoComplete="name" 

          />
        </label>
      )}

      <label>EMAIL ADDRESS
        <input ref={emailInput} required type="email" maxLength={254} autoCapitalize="none" autoCorrect="off" value={email}
        
          onChange={(e) => 
          setEmail(e.target.value)} 

          placeholder="you@example.com" 
          autoComplete="email" 
          
        />
        </label>

      <div className="auth-password">
        <label>PASSWORD
          <input required minLength={mode === 'register' ? 8 : undefined} type={passwordVisible ? 'text' : 'password'} value={password}
            onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? '8+ characters, upper/lowercase, number, symbol' : 'Your password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        <button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible(!passwordVisible)}>
          {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>

      {mode === 'login' && <button className="text-button" type="button">Forgot password?</button>}
      {notice && <div className={`notice notice--${notice.type}`} role="alert">{notice.text}</div>}
      <button className="submit-button" type="submit" disabled={busy}>{busy ? 'CONNECTING…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}<span>↗</span></button>
      </form>
    </>
  )
}
