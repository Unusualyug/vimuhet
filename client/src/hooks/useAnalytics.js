import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { miscApi, consentApi } from '../services/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { readConsentSync } from '../context/ConsentContext.jsx';

/**
 * Page-view tracking.
 *
 * Requires analytics consent. Before the visitor has decided — or if they
 * rejected optional cookies — this does nothing at all: no identifiers are
 * created, no requests are made. That is deliberate; an "anonymous" identifier
 * is still tracking, so we simply do not measure.
 *
 * Privacy: no IPs, no precise geo, no cross-site identifiers.
 */
export function useAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  /**
   * The last path we actually *sent*.
   *
   * Marking the path as seen before the request fires is a trap: React's
   * StrictMode invokes effects twice on mount, so the first run would mark it,
   * its cleanup would cancel the timer, and the second run would bail out —
   * silently dropping the very first page view of every session. We only record
   * the path once the request has gone out, and reset it if the timer is
   * cancelled so a re-run can schedule again.
   */
  const lastSent = useRef(null);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (lastSent.current === path) return undefined;

    /* Re-check on every navigation so consent changes take effect immediately. */
    const consent = readConsentSync();
    if (!consent.analytics) return undefined;

    let sessionId = sessionStorage.getItem('vimuhet_session');
    if (!sessionId) {
      sessionId = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      sessionStorage.setItem('vimuhet_session', sessionId);
    }
    let visitorId = localStorage.getItem('vimuhet_visitor');
    if (!visitorId) {
      visitorId = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem('vimuhet_visitor', visitorId);
    }

    const timer = setTimeout(() => {
      lastSent.current = path;
      miscApi
        .track({
          type: 'page_view',
          sessionId,
          visitorId,
          path: location.pathname,
          referrer: document.referrer || '',
          isReturning: Boolean(localStorage.getItem('vimuhet_visited')),
          device: window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop',
          user: user?._id,
        })
        .catch(() => {});
      localStorage.setItem('vimuhet_visited', '1');
    }, 400);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, user?._id]);
}

/**
 * Fire a tracked interaction. Silently no-ops without analytics consent, so
 * callers never have to check consent themselves.
 */
export const trackEvent = (payload) => {
  const consent = readConsentSync();
  const category = payload?.category || 'analytics';
  if (!consent[category]) return Promise.resolve({ tracked: false, reason: 'consent_not_granted' });

  const sessionId = sessionStorage.getItem('vimuhet_session') || 'anon';
  const visitorId = localStorage.getItem('vimuhet_visitor') || 'anon';
  return miscApi.track({ ...payload, sessionId, visitorId }).catch(() => {});
};

/** Record a recently-viewed product. Requires functional consent. */
export const trackRecentView = (productId) => {
  if (!readConsentSync().functional) return Promise.resolve({ tracked: false });
  return consentApi.trackRecentView(productId).catch(() => {});
};
