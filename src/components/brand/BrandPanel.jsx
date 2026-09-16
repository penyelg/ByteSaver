import React from 'react'
import mark from '../../assets/bytesaver-mark-transparent.png'

export default function BrandPanel() {
  return (
    <section className="brand-panel" aria-label="ByteSaver introduction">
      <div className="brand-panel__grid" />
      <div className="brand-panel__content">
        <div className="eyebrow"><span className="status-dot" /> MARKETPLACE / 01</div>
        <img className="brand-mark" src={mark} alt="" />
        <p className="brand-panel__lead">The smarter way to upgrade your setup.</p>
        <div className="signal-list" aria-label="Product benefits">
          <span><b>01</b> Tested pre-owned hardware</span>
          <span><b>02</b> Better specs without the markup</span>
          <span><b>03</b> Built for people who know their gear</span>
        </div>
        <div className="brand-panel__footer">SMART UPGRADES. LIGHTER PRICE.</div>
      </div>
    </section>
  )
}
