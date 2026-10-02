import React from 'react'
import wordmark from '../../assets/bytesaver-wordmark-primary.png'

export default function BrandPanel() {
  return (
    <section className="brand-panel" aria-label="ByteSaver introduction">
      <div className="brand-panel__grid" />
      <div className="brand-panel__content">
        <div className="eyebrow"><span className="status-dot" /> MARKETPLACE / ISABEL</div>
        <img className="brand-mark" src={wordmark} alt="ByteSaver" />
        <p className="brand-panel__lead">The smarter way to upgrade your setup.</p>
        <div className="signal-list" aria-label="Product benefits">
          <span><b>01</b> Pre-owned hardware, all in one place</span>
          <span><b>02</b> More performance for your budget</span>
          <span><b>03</b> Built for people who know their gear</span>
        </div>
        <div className="brand-panel__footer">SMART UPGRADES. LIGHTER PRICE.</div>
      </div>
    </section>
  )
}
