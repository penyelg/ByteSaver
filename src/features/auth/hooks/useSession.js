import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getProfile } from '../../account/services/profileService';

export default function useSession({ loadCart, clearCart }) {
  // undefined: restoring the session; null: signed out.
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const currentUserId = useRef(null);
  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return undefined
    }

    // Whenever login changes, load the matching profile before deciding which screen to show.
    let active = true;
    let generation = 0;
    const applySession = async (nextSession) => {
      const request = ++generation;
      currentUserId.current = nextSession?.user?.id || null;
      setSession(undefined)
      setProfile(null)
      setProfileError('')
      try {
        if (nextSession?.user) {
          const { data, error } = await getProfile(nextSession.user.id)
          if (!active || request !== generation) return;
          setProfile(data || null)
          setProfileError(error?.message || '')
          if (!error && data?.verification?.status === 'approved') await loadCart(nextSession.user.id)
          else clearCart()
        } else clearCart()
      } catch (error) {
        if (active && request === generation) {
          setProfile(null);
          setProfileError(error.message || 'Unable to load your account. Please retry.');
        }
      }
      if (active && request === generation) setSession(nextSession)
    }

    // Restore an existing login on page load, then keep the app updated on sign-in/sign-out.
    supabase.auth.getSession().then(({ data }) => { if (active) applySession(data.session); })
      .catch(() => { if (active) setSession(null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession?.user?.id === currentUserId.current && ['TOKEN_REFRESHED', 'SIGNED_IN'].includes(_event)) {
        setSession((current) => current === undefined ? current : nextSession);
        return;
      }
      // Run database work after the auth callback releases its session lock.
      setTimeout(() => { if (active) applySession(nextSession); }, 0);
    })

    return () => { active = false; currentUserId.current = null; listener.subscription.unsubscribe(); }
  }, [loadCart, clearCart])

  const completeProfile = (updatedProfile) => {
    setProfile(updatedProfile);
    setProfileError('');
  };
  const refreshProfile = useCallback(async () => {
    const userId = currentUserId.current;
    if (!userId) return { error: { message: 'Please sign in again.' } };
    let result;
    try { result = await getProfile(userId); }
    catch { return { error: { message: 'Unable to check approval status. Please try again.' } }; }
    if (currentUserId.current === userId && !result.error && result.data) {
      setProfile(result.data);
      setProfileError('');
      if (result.data.verification?.status === 'approved') await loadCart(userId);
    }
    return result;
  }, [loadCart]);
  return { session, profile, profileError, completeProfile, refreshProfile };
}
