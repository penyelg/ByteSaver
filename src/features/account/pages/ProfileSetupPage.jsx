import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getBarangays, getProfile } from '../services/profileService';
import { submitIdentity } from '../services/verificationService';
import { ID_TYPES, normalizeMobile, validateIdentityPhoto } from '../utils/verification';
import './ProfileSetupPage.css';

export default function ProfileSetupPage({ session, profile, loadError, onComplete, onReviewIdentities }) {
  const [barangays, setBarangays] = useState([]);
  const [details, setDetails] = useState({ fullName: profile?.full_name || '', address: profile?.address || '',
    phone: profile?.phone || '', barangayId: profile?.barangay_id || '', idType: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(loadError || '');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let active = true;
    getBarangays().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setBarangays(data || []);
      setLoading(false);
    }).catch(() => { if (active) { setError('Unable to load barangays. Reload to try again.'); setLoading(false); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choosePhoto = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    const message = validateIdentityPhoto(nextFile);
    setError(message);
    setFile(message ? null : nextFile);
    event.target.value = '';
  };
  const update = (event) => setDetails((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!normalizeMobile(details.phone)) return setError('Enter a Philippine mobile number such as 09123456789 or +639123456789.');
    if (details.fullName.trim().length < 2 || details.address.trim().length < 3 || !details.barangayId || !details.idType)
      return setError('Complete your name, address, barangay, and ID type.');
    const photoError = validateIdentityPhoto(file);
    if (photoError) return setError(photoError);
    if (!acknowledged) return setError('Please acknowledge the ID review notice.');
    setSaving(true);
    try {
      await submitIdentity(session.user.id, details, file);
      const { data, error: refreshError } = await getProfile(session.user.id);
      if (refreshError) {
        onComplete({ ...profile, full_name: details.fullName.trim(), address: details.address.trim(),
          phone: normalizeMobile(details.phone), barangay_id: details.barangayId, verification: { status: 'pending_review' } });
      } else onComplete(data);
    } catch (failure) { setError(failure.message || 'Unable to submit your ID. Please try again.'); }
    finally { setSaving(false); }
  };

  return <main className="profile-setup-shell">
    <section className="profile-setup-panel">
      <span className="section-index">ACCOUNT VERIFICATION / REQUIRED</span>
      <h1>Let’s get you verified.</h1>
      <p className="profile-setup-intro">Complete your details and submit a valid ID. An administrator must approve your account before you can buy or sell.</p>
      {profile?.verification?.status === 'rejected' && <div className="profile-setup-error" role="status">
        <strong>Your submission needs an update.</strong><br />{profile.verification.review_reason}<br />Correct your details or photo and submit again.
      </div>}
      {error && <div className="profile-setup-error" role="alert">{error}</div>}
      <form className="profile-setup-form" onSubmit={handleSubmit}>
        <fieldset disabled={saving || Boolean(loadError)}>
          <legend>01 / Your details</legend>
          <label>Full name<input name="fullName" autoComplete="name" value={details.fullName} onChange={update} minLength={2} maxLength={150} required placeholder="Name shown on your ID" /></label>
          <label>Mobile number<input type="tel" name="phone" autoComplete="tel" value={details.phone} onChange={update} required placeholder="09123456789" /><small>For order coordination. We check the format; ownership is not verified by SMS.</small></label>
          <label>Street / sitio / purok<input name="address" autoComplete="street-address" value={details.address} onChange={update} minLength={3} maxLength={500} required placeholder="House number, street, sitio or purok" /></label>
          <label>Barangay · Isabel, Leyte<select name="barangayId" value={details.barangayId} onChange={update} disabled={loading || !barangays.length} required>
            <option value="">{loading ? 'Loading barangays…' : 'Select your barangay'}</option>
            {barangays.map((barangay) => <option key={barangay.id} value={barangay.id}>{barangay.name}</option>)}
          </select>{!loading && !barangays.length && <small>Barangays could not be loaded. Reload to try again.</small>}</label>
        </fieldset>
        <fieldset disabled={saving || Boolean(loadError)}>
          <legend>02 / Your valid ID</legend>
          <label>ID type<select name="idType" value={details.idType} onChange={update} required>
            <option value="">Select ID type</option>{ID_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select></label>
          <p className="verification-help">Photograph the side showing your name and photo. Keep all corners visible and avoid glare. JPG, PNG, or WebP, up to 5 MB.</p>
          <div className="photo-actions">
            <label className="photo-picker">Take ID photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} aria-label="Take ID photo" /></label>
            <label className="photo-picker">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-label="Upload ID photo" /></label>
          </div>
          {preview && <figure className="identity-preview"><img src={preview} alt="Your selected ID photo" /><figcaption>Check that the photo is clear before submitting.</figcaption>
            <button type="button" className="verification-secondary" onClick={() => setFile(null)}>Remove photo</button></figure>}
          <div className="verification-notice">Your ID photo is private and available to you and authorized administrators for account review. It will not appear on your marketplace profile or listings.</div>
          <label className="verification-consent"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} required />
            <span>I understand that my ID and the details above will be submitted for administrator review.</span></label>
        </fieldset>
        <button className="profile-setup-submit" type="submit" disabled={saving || loading || !barangays.length || Boolean(loadError)}>{saving ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW'} <span>↗</span></button>
      </form>
      {loadError && <button className="verification-secondary" onClick={() => window.location.reload()}>Retry loading account</button>}
      {onReviewIdentities && <button className="profile-setup-signout" disabled={saving} onClick={onReviewIdentities}>Back to admin dashboard</button>}
      <button className="profile-setup-signout" type="button" disabled={saving} onClick={() => supabase.auth.signOut()}>Sign out</button>
    </section>
  </main>;
}
