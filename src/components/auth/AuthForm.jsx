import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthForm({ mode }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)

  const signInWithGoogle = async () => {
    setNotice(null)
    setBusy(true)

    if (!supabase) {
      setNotice({ type: 'error', text: 'Supabase is not configured yet. Add the VITE_SUPABASE values to your .env file.' })
      setBusy(false)
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin },
    })

    if (error) {
      setNotice({ type: 'error', text: error.message })
      setBusy(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setNotice(null)
    setBusy(true)

    if (!supabase) {
      setNotice({ type: 'error', text: 'Supabase is not configured yet. Add the VITE_SUPABASE values to your .env file.' })
      setBusy(false)
      return
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })

    if (result.error) {
      setNotice({ type: 'error', text: result.error.message })
    } else if (mode === 'register') {
      setNotice({ type: 'success', text: 'Account created. Check your inbox if email confirmation is enabled.' })
    } else {
      navigate('/')
    }
    setBusy(false)
  }

  return (
    <>
      <GoogleSignInButton onClick={signInWithGoogle} busy={busy} />

      <div className="auth-divider">
        <span>OR USE EMAIL</span>
      </div>

      <form onSubmit={submit} noValidate>
      {mode === 'register' && (
        <label>DISPLAY NAME
          <input required value={name} 
          
            onChange={(e) => 
            setName(e.target.value)}
          
            placeholder="e.g. Peniel Padilla" 
            autoComplete="name" 

          />
        </label>
      )}

      <label>EMAIL ADDRESS
        <input required type="email" value={email} 
        
          onChange={(e) => 
          setEmail(e.target.value)} 

          placeholder="you@example.com" 
          autoComplete="email" 
          
        />
        </label>

      <label>PASSWORD
        <input required minLength={6} type="password" value={password} 
        
        onChange={(e) => 
        setPassword(e.target.value)} 
        
        placeholder="Minimum 6 characters" 
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'} 
        />
      </label>

      {mode === 'login' && <button className="text-button" type="button">Forgot password?</button>}
      {notice && <div className={`notice notice--${notice.type}`} role="alert">{notice.text}</div>}
      <button className="submit-button" type="submit" disabled={busy}>{busy ? 'CONNECTING…' : mode === 'login' ? 'ENTER MARKETPLACE' : 'CREATE ACCOUNT'}<span>↗</span></button>
      </form>
    </>
  )
}
