import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { getBarangays } from "../services/profileService";
import {
  getIdentityPhoto,
  getReviewQueue,
  reviewIdentity,
} from "../services/verificationService";
import "./ProfileSetupPage.css";

export default function IdentityReviewPage({ session, onBack, onVerify }) {
  const [status, setStatus] = useState("pending_review");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [photo, setPhoto] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    getBarangays().then(({ data }) => setBarangays(data || []));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelected(null);
    setPhoto("");
    setError("");
    getReviewQueue(status)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRows([]);
          setError(error.message);
        } else setRows(data || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setRows([]);
          setError("Unable to load submissions. Try refreshing.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [status, revision]);
  useEffect(() => {
    let active = true;
    setPhoto("");
    setReason("");
    if (selected)
      getIdentityPhoto(selected.document_path)
        .then(({ data, error }) => {
          if (!active) return;
          if (error)
            setError(
              "Unable to load the private photo. Select the submission again to retry.",
            );
          else setPhoto(data.signedUrl);
        })
        .catch(() => {
          if (active) setError("Unable to load the ID photo.");
        });
    return () => {
      active = false;
    };
  }, [selected]);
  const decide = async (event, decision) => {
    event.preventDefault();
    if (reason.trim().length < 3)
      return setError("Enter a review note of at least 3 characters.");
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { error } = await reviewIdentity(selected.id, decision, reason);
      if (error) throw error;
      setNotice(`Submission ${decision}. The account status has been updated.`);
      setRevision((value) => value + 1);
    } catch (failure) {
      setError(failure.message || "Unable to save the decision.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="profile-setup-shell identity-review-shell">
      <section className="profile-setup-panel identity-review-panel">
        <span className="section-index">ADMINISTRATION / IDENTITY REVIEW</span>
        <h1>Review accounts.</h1>
        <p className="profile-setup-intro">
          Compare the submitted details with the ID photo. Approve only when the
          submission meets your verification criteria.
        </p>
        <div className="review-toolbar">
          <label>
            Status{" "}
            <select
              value={status}
              disabled={saving}
              onChange={(event) => {
                setNotice("");
                setStatus(event.target.value);
              }}
            >
              <option value="pending_review">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <button
            className="verification-secondary"
            disabled={saving || loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            Refresh queue
          </button>
          {onBack && (
            <button
              className="verification-secondary"
              disabled={saving}
              onClick={onBack}
            >
              Marketplace
            </button>
          )}
          {onVerify && (
            <button
              className="verification-secondary"
              disabled={saving}
              onClick={onVerify}
            >
              Verify my own account
            </button>
          )}
        </div>
        {error && (
          <div className="profile-setup-error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <p className="verification-notice" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status">Loading submissions…</p>
        ) : (
          <div className="review-layout">
            <div className="review-queue" aria-label="Identity submissions">
              {!rows.length && (
                <p className="verification-help">
                  No submissions in this queue.
                </p>
              )}
              {rows.map((row) => (
                <button
                  className={`review-item ${selected?.id === row.id ? "selected" : ""}`}
                  key={row.id}
                  disabled={saving}
                  onClick={() => {
                    setError("");
                    setSelected({ ...row });
                  }}
                >
                  <strong>{row.full_name}</strong>
                  <span>{row.id_type}</span>
                  <small>{new Date(row.submitted_at).toLocaleString()}</small>
                </button>
              ))}
              {rows.length === 100 && (
                <p className="verification-help">
                  Showing the first 100 submissions. Review pending accounts and
                  refresh for more.
                </p>
              )}
            </div>
            <div className="review-detail">
              {selected ? (
                <>
                  <h2>{selected.full_name}</h2>
                  <dl>
                    <dt>Address</dt>
                    <dd>
                      {selected.address},{" "}
                      {barangays.find(
                        (item) => item.id === selected.barangay_id,
                      )?.name || selected.barangay_id}
                      , Isabel, Leyte
                    </dd>
                    <dt>Mobile number</dt>
                    <dd>{selected.phone}</dd>
                    <dt>ID type</dt>
                    <dd>{selected.id_type}</dd>
                  </dl>
                  {photo ? (
                    <img
                      className="review-photo"
                      src={photo}
                      referrerPolicy="no-referrer"
                      alt={`Submitted ${selected.id_type} for ${selected.full_name}`}
                      onError={() => {
                        setPhoto("");
                        setError(
                          "Photo access expired or the image could not load. Select the submission again.",
                        );
                      }}
                    />
                  ) : (
                    <p className="verification-help">
                      Private photo preview is unavailable or loading.
                    </p>
                  )}
                  {selected.status === "pending_review" ? (
                    selected.user_id === session.user.id ? (
                      <p className="verification-notice">
                        You cannot review your own submission. Another
                        administrator must review it.
                      </p>
                    ) : (
                      <form
                        className="profile-setup-form"
                        onSubmit={(event) => decide(event, "approved")}
                      >
                        <label>
                          Review note
                          <textarea
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            required
                            minLength={3}
                            maxLength={1000}
                            disabled={saving}
                            placeholder="Record your assessment. For rejection, explain what the applicant must correct."
                          />
                        </label>
                        <div className="photo-actions">
                          <button
                            className="profile-setup-submit"
                            disabled={saving || !photo}
                            type="submit"
                          >
                            {saving ? "SAVING…" : "APPROVE ACCOUNT"}
                          </button>
                          <button
                            className="verification-secondary review-reject"
                            disabled={saving || !photo}
                            type="button"
                            onClick={(event) => decide(event, "rejected")}
                          >
                            Reject submission
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                    <div className="verification-notice">
                      <strong>{selected.status.toUpperCase()}</strong>
                      <p>{selected.review_reason}</p>
                      <small>
                        Reviewed{" "}
                        {new Date(selected.reviewed_at).toLocaleString()} ·
                        Reviewer {selected.reviewed_by}
                      </small>
                    </div>
                  )}
                </>
              ) : (
                <p className="verification-help">
                  Select a submission to inspect its details and private ID
                  photo.
                </p>
              )}
            </div>
          </div>
        )}
        <button
          className="profile-setup-signout"
          disabled={saving}
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
