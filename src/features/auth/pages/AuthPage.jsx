import React, { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import AuthModeSwitch from "../components/AuthModeSwitch";
import BrandPanel from "../../../components/brand/BrandPanel";
import '../styles/AuthPage.css';
const PixelSnow = lazy(() => import('../../../components/visuals/PixelSnow'));

export default function AuthPage() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "register" ? "register" : "login";
  const [showBackdrop, setShowBackdrop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 801px) and (prefers-reduced-motion: no-preference)');
    const update = () => setShowBackdrop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <main className="auth-shell">
      {showBackdrop && <Suspense fallback={null}><div className="pixel-snow-layer">
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
      </div></Suspense>}
      <div className="auth-layout">
        <BrandPanel />
        <section
          className="form-panel"
          aria-label={mode === "login" ? "Sign in" : "Create an account"}
        >
          <div className="form-wrap">
            <div className="form-heading">
              <h1>{mode === "login" ? "Your next upgrade starts here." : "Join ByteSaver."}</h1>
              <p>
                {mode === "login"
                  ? "Sign in to browse pre-owned hardware and manage your listings."
                  : "One account to buy and sell pre-owned hardware."}
              </p>
            </div>
            <AuthModeSwitch mode={mode} />
            <AuthForm mode={mode} />
          </div>
        </section>
      </div>
    </main>
  );
}
