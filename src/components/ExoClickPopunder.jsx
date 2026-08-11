import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../App';

export default function ExoClickPopunder() {
  const location = useLocation();
  const { user } = useAppContext();

  useEffect(() => {
    // Determine if we should block popunders
    const isVideoRoute = location.pathname.startsWith('/video/');
    const hasAdFreeTime = user && user.adFreeUntil && Date.now() < user.adFreeUntil;
    
    // Set global flag
    window.disablePopunder = !!(isVideoRoute || hasAdFreeTime);
    console.log('[ExoClick] disablePopunder set to:', window.disablePopunder, ' | isVideo:', isVideoRoute, ' | hasAdFreeTime:', !!hasAdFreeTime);

    // If already injected in this session, don't inject again
    // The script itself will check window.disablePopunder on every click,
    // so we don't need to manually remove event listeners.
    if (window.disablePopunder && !document.getElementById('exoclick-popunder-script')) {
      console.log('[ExoClick] Skipped initial injection because route is disabled.');
      return;
    }

    // If already injected in this session, don't inject again
    if (document.getElementById('exoclick-popunder-script')) {
      return;
    }

    // Inject the script natively
    const script = document.createElement('script');
    script.id = 'exoclick-popunder-script';
    script.type = 'application/javascript';
    script.src = '/popunder1000.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // We don't remove the script node because it has already executed,
      // but we do remove the event listeners if disablePopunder becomes true.
    };
  }, [location.pathname, user?.adFreeUntil]);

  return null;
}
