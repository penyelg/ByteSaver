import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { MobileBrand } from "../../../components/mobile/MobileNavigation";
import { supabase } from "../../../lib/supabase";
import { getBarangays, getProfile } from "../services/profileService";
import { submitIdentity } from "../services/verificationService";
import {
  ID_TYPES,
  normalizeMobile,
  validateIdentityPhoto,
} from "../utils/verification";
import '../styles/account.css';
import '../styles/ProfileSetupPage.css';

const STEPS = ["Name and number", "Location", "Identification"];

// Guide the applicant through personal details, location, and a private ID submission.
export default function ProfileSetupPage({
  session,
  profile,
  loadError,
  onComplete,
  onReviewIdentities,
}) {
  const [step, setStep] = useState(0);
  const stepHeading = useRef(null);
  const [barangays, setBarangays] = useState([]);
  // Keep all steps’ values in the parent component so Back/Continue preserves the entered details.
  const [details, setDetails] = useState({
    fullName: profile?.full_name || "",
    address: profile?.address || "",
    phone: profile?.phone || "",
    barangayId: profile?.barangay_id || "",
    idType: "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(loadError || "");
  const [acknowledged, setAcknowledged] = useState(false);

  // Move focus to the new step heading for keyboard and screen-reader users.
  useEffect(() => {
    stepHeading.current?.focus();
  }, [step]);

  // Load location choices once; avoid updating state if this request outlives the component.
  useEffect(() => {
    let active = true;
    getBarangays()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setBarangays(data || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Unable to load barangays. Reload to try again.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  // Preview the photo locally and release its object URL when the selection changes or the page unmounts.
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Validate before retaining a selected file; reset the input so the same file can be chosen again.
  const choosePhoto = (event) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    const message = validateIdentityPhoto(nextFile);
    setError(message);
    setFile(message ? null : nextFile);
    event.target.value = "";
  };
  const update = (event) =>
    setDetails((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  // Validate each completed step before advancing; upload and submit only on the final step.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (details.fullName.trim().length < 2 || !normalizeMobile(details.phone)) {
      setStep(0);
      return setError(
        details.fullName.trim().length < 2
          ? "Enter your full name as shown on your ID."
          : "Enter a Philippine mobile number such as 09123456789 or +639123456789.",
      );
    }
    if (step === 0) return setStep(1);
    if (
      details.address.trim().length < 3 ||
      !barangays.some(
        (barangay) => String(barangay.id) === String(details.barangayId),
      )
    ) {
      setStep(1);
      return setError(
        "Enter your street / sitio / purok and select your barangay.",
      );
    }
    if (step === 1) return setStep(2);
    if (!details.idType) return setError("Select your ID type.");
    const photoError = validateIdentityPhoto(file);
    if (photoError) return setError(photoError);
    if (!acknowledged)
      return setError("Please acknowledge the ID review notice.");
    setSaving(true);
    try {
      await submitIdentity(session.user.id, details, file);
      const { data, error: refreshError } = await getProfile(session.user.id);
      // Submission already succeeded: advance to pending review even if the follow-up profile read fails.
      if (refreshError) {
        onComplete({
          ...profile,
          full_name: details.fullName.trim(),
          address: details.address.trim(),
          phone: normalizeMobile(details.phone),
          barangay_id: details.barangayId,
          verification: { status: "pending_review" },
        });
      } else onComplete(data);
    } catch (failure) {
      setError(
        failure.message || "Unable to submit your ID. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className={`profile-setup-shell profile-setup-page${step === 2 ? " profile-setup-shell--identification" : ""}`}
    >
      <section className="profile-setup-panel">
        <span className="section-index">ACCOUNT VERIFICATION / REQUIRED</span>
        <MobileBrand />
        <h1>Let’s get you verified.</h1>
        <p className="profile-setup-intro">
          Complete your details and submit a valid ID. An administrator must
          approve your account before you can buy or sell.
        </p>
        {/* Derive completed/current/upcoming step appearances from the active step index. */}
        <nav
          className="verification-progress"
          aria-label="Account verification progress"
        >
          <ol>
            {STEPS.map((label, index) => (
              <li
                key={label}
                className={
                  index < step
                    ? "is-complete"
                    : index === step
                      ? "is-current"
                      : ""
                }
                aria-current={index === step ? "step" : undefined}
              >
                <span className="verification-step-number" aria-hidden="true">
                  {index < step ? (
                    <Check size={22} strokeWidth={4} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="verification-step-label">
                  {label}
                  <span className="verification-step-status">
                    {index < step
                      ? "Completed"
                      : index === step
                        ? "Current step"
                        : "Upcoming"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </nav>
        {profile?.verification?.status === "rejected" && (
          <div className="profile-setup-error" role="status">
            <strong>Your submission needs an update.</strong>
            <br />
            {profile.verification.review_reason}
            <br />
            Correct your details or photo and submit again.
          </div>
        )}
        {error && (
          <div className="profile-setup-error" role="alert">
            {error}
          </div>
        )}
        <form className="profile-setup-form" onSubmit={handleSubmit}>
          <div className="verification-step-heading">
            <span>
              STEP {step + 1} OF {STEPS.length}
            </span>
            <h2 ref={stepHeading} tabIndex={-1}>
              {STEPS[step]}
            </h2>
            <p>
              {
                [
                  "Start with the name on your ID and your mobile number.",
                  "Tell us where you’re located in Isabel, Leyte.",
                  "Add a clear photo of your valid ID for administrator review.",
                ][step]
              }
            </p>
          </div>
          {/* This container scrolls independently on Identification so previews cannot overlap the action buttons. */}
          <div className="verification-fields">
            {step === 0 && (
              <fieldset disabled={saving || Boolean(loadError)}>
                <legend className="verification-sr-only">
                  Name and number
                </legend>
                <label>
                  Full name
                  <input
                    name="fullName"
                    autoComplete="name"
                    value={details.fullName}
                    onChange={update}
                    minLength={2}
                    maxLength={150}
                    required
                    placeholder="Name shown on your ID"
                  />
                </label>
                <label>
                  Mobile number
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={details.phone}
                    onChange={update}
                    required
                    placeholder="09123456789"
                  />
                  <small>
                    For order coordination. We check the format; ownership is
                    not verified by SMS.
                  </small>
                </label>
              </fieldset>
            )}
            {step === 1 && (
              <fieldset disabled={saving || Boolean(loadError)}>
                <legend className="verification-sr-only">Location</legend>
                <label>
                  Street / sitio / purok
                  <input
                    name="address"
                    autoComplete="street-address"
                    value={details.address}
                    onChange={update}
                    minLength={3}
                    maxLength={500}
                    required
                    placeholder="House number, street, sitio or purok"
                  />
                </label>
                <label>
                  Barangay · Isabel, Leyte
                  <select
                    name="barangayId"
                    value={details.barangayId}
                    onChange={update}
                    disabled={loading || !barangays.length}
                    required
                  >
                    <option value="">
                      {loading ? "Loading barangays…" : "Select your barangay"}
                    </option>
                    {barangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                  {!loading && !barangays.length && (
                    <small>
                      Barangays could not be loaded. Reload to try again.
                    </small>
                  )}
                </label>
              </fieldset>
            )}
            {step === 2 && (
              <fieldset disabled={saving || Boolean(loadError)}>
                <legend className="verification-sr-only">Identification</legend>
                <label>
                  ID type
                  <select
                    name="idType"
                    value={details.idType}
                    onChange={update}
                    required
                  >
                    <option value="">Select ID type</option>
                    {ID_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <p className="verification-help">
                  Photograph the side showing your name and photo. Keep all
                  corners visible and avoid glare. JPG, PNG, or WebP, up to 5
                  MB.
                </p>
                <div className="photo-actions">
                  <label className="photo-picker">
                    Take ID photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={choosePhoto}
                      aria-label="Take ID photo"
                    />
                  </label>
                  <label className="photo-picker">
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={choosePhoto}
                      aria-label="Upload ID photo"
                    />
                  </label>
                </div>
                {preview && (
                  <figure className="identity-preview">
                    <img src={preview} alt="Your selected ID photo" />
                    <figcaption>
                      Check that the photo is clear before submitting.
                    </figcaption>
                    <button
                      type="button"
                      className="verification-secondary"
                      onClick={() => setFile(null)}
                    >
                      Remove photo
                    </button>
                  </figure>
                )}
                <div className="verification-notice">
                  Your ID photo is private and available to you and authorized
                  administrators for account review. It will not appear on your
                  marketplace profile or listings.
                </div>
                <label className="verification-consent">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    required
                  />
                  <span>
                    I understand that my ID and the details above will be
                    submitted for administrator review.
                  </span>
                </label>
              </fieldset>
            )}
          </div>
          {/* Keep navigation outside the scrolling fields, with a final submit action only on Identification. */}
          <div className="verification-step-actions">
            {step > 0 && (
              <button
                className="verification-secondary"
                type="button"
                disabled={saving}
                onClick={() => {
                  setError("");
                  setStep((current) => current - 1);
                }}
              >
                ← Back
              </button>
            )}
            <button
              className="profile-setup-submit"
              type="submit"
              disabled={
                saving ||
                Boolean(loadError) ||
                (step > 0 && (loading || !barangays.length))
              }
            >
              {saving
                ? "SUBMITTING…"
                : step === 2
                  ? "SUBMIT FOR REVIEW"
                  : "CONTINUE"}{" "}
              <span aria-hidden="true">{step === 2 ? "↗" : "→"}</span>
            </button>
          </div>
        </form>
        {loadError && (
          <button
            className="verification-secondary"
            onClick={() => window.location.reload()}
          >
            Retry loading account
          </button>
        )}
        {onReviewIdentities && (
          <button
            className="profile-setup-signout"
            disabled={saving}
            onClick={onReviewIdentities}
          >
            Back to admin dashboard
          </button>
        )}
        <button
          className="profile-setup-signout"
          type="button"
          disabled={saving}
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
