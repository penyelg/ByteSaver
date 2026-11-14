import React, { useState } from 'react';

export default function AdminProfileAvatar({ name, url }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();

  return <span className="admin-avatar admin-profile-avatar" aria-hidden="true">
    {url && url !== failedUrl
      ? <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      : initials}
  </span>;
}
