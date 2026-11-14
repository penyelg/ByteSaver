import React, { useLayoutEffect } from 'react';
import { CalendarDays, Search, Tag, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import wordmark from '../../assets/bytesaver-wordmark-primary.png';
import './mobileNavigation.css';

const tabs = [
  { id: 'browse', label: 'Browse', path: '/', icon: Search },
  { id: 'sell', label: 'Sell', path: '/listings/new', icon: Tag },
  { id: 'reservations', label: 'Reservations', path: '/reservations', icon: CalendarDays },
  { id: 'account', label: 'Account', path: '/account', icon: UserRound },
];

export function MobileBrand() {
  return <img className="mobile-brand" src={wordmark} alt="ByteSaver" />;
}

export default function MobileNavigation({ screen, onBrowse, children }) {
  const showTabs = screen !== 'details' && screen !== 'payment';
  useLayoutEffect(() => {
    if (window.matchMedia('(max-width: 800px)').matches) window.scrollTo(0, 0);
  }, [screen]);

  return (
    <div className={showTabs ? 'member-shell member-shell--tabs' : 'member-shell'} data-screen={screen}>
      {children}
      {showTabs && (
        <nav className="mobile-tabs" aria-label="Marketplace navigation">
          {tabs.map(({ id, label, path, icon: Icon }) => (
            <Link key={id} to={path} aria-current={screen === id || (screen === 'manage' && id === 'account') ? 'page' : undefined}
              onClick={id === 'browse' ? (event) => { event.preventDefault(); onBrowse(); } : undefined}>
              <Icon aria-hidden="true" strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
