import React, { useEffect, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import ShopDialog from './ShopDialog';

let installPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
});

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export default function InstallAppButton() {
  const [installed, setInstalled] = useState(isStandalone);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    function onInstalled() {
      installPrompt = undefined;
      setInstalled(true);
    }
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  async function install() {
    const prompt = installPrompt;
    if (!prompt) {
      setShowInstructions(true);
      return;
    }

    installPrompt = undefined;
    try {
      const { outcome } = await prompt.prompt();
      if (outcome === 'accepted') setInstalled(true);
    } catch {
      setShowInstructions(true);
    }
  }

  if (installed) return null;

  return (
    <>
      <button type="button" onClick={install}>
        <Download aria-hidden="true" /> Install ByteSaver <ChevronRight aria-hidden="true" />
      </button>
      {showInstructions && (
        <ShopDialog title="Install ByteSaver" onClose={() => setShowInstructions(false)}>
          <p className="shop-help"><strong>Android</strong><br />Open Chrome’s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
          <p className="shop-help"><strong>iPhone</strong><br />In Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</p>
        </ShopDialog>
      )}
    </>
  );
}
