import React from 'react'
import { useSearchParams } from 'react-router-dom'
import AuthForm from '../components/auth/AuthForm'
import AuthModeSwitch from '../components/auth/AuthModeSwitch'
import PixelSnow from '../components/visuals/PixelSnow'
import './AuthPage.css'

export default function AuthPage() {
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'register' ? 'register' : 'login'

  return (
    <main className="auth-shell">
      <div className="pixel-snow-layer">
        <PixelSnow
          color="#00d736"
          flakeSize={0.014}
          minFlakeSize={1.25}
          pixelResolution={500}
          speed={1.9}
          density={0.3}
          direction={100}
          brightness={1}
          depthFade={8.5}
          farPlane={15}
        />
      </div>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="form-heading">
            <span className="section-index">{mode === 'login' ? '01' : '02'} / ACCOUNT</span>
            <h1>{mode === 'login' ? 'Welcome!' : 'Create your account.'}</h1>
            <p>{mode === 'login' ? 'Sign in to browse verified hardware and manage your listings.' : 'Join a marketplace built for better hardware decisions.'}</p>
          </div>
          <AuthModeSwitch mode={mode} />
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  )
}
