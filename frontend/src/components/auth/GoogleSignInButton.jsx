import { useEffect, useRef, useState, useCallback } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential, loading }) {
  const wrapperRef  = useRef(null);   // our visible button wrapper
  const hiddenRef   = useRef(null);   // div Google renders its iframe into
  const [scriptReady, setScriptReady] = useState(() => !!window.google?.accounts);

  // Wait for GIS script (async defer in index.html)
  useEffect(() => {
    if (scriptReady) return;
    let attempts = 0;
    const id = setInterval(() => {
      if (window.google?.accounts) { setScriptReady(true); clearInterval(id); }
      else if (++attempts > 40)     { clearInterval(id); }
    }, 250);
    return () => clearInterval(id);
  }, [scriptReady]);

  const renderHidden = useCallback(() => {
    if (!CLIENT_ID || !scriptReady || !hiddenRef.current || !wrapperRef.current) return;

    const w = Math.floor(wrapperRef.current.getBoundingClientRect().width) || 400;

    window.google.accounts.id.initialize({
      client_id:           CLIENT_ID,
      callback:            (res) => onCredential(res.credential),
      auto_select:         false,
      cancel_on_tap_outside: true,
    });

    // Clear any previous render before re-rendering
    hiddenRef.current.innerHTML = '';

    window.google.accounts.id.renderButton(hiddenRef.current, {
      theme:           'outline',
      size:            'large',
      width:           Math.min(w, 400), // Google hard-caps at 400px
      text:            'continue_with',
      shape:           'rectangular',
      logo_alignment:  'center',
    });
  }, [scriptReady, onCredential]);

  // Render hidden button once script is ready
  useEffect(() => { renderHidden(); }, [renderHidden]);

  // Re-render if container resizes
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(renderHidden);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [renderHidden]);

  if (!CLIENT_ID) {
    return (
      <p className="text-center text-xs text-neutral-400 py-2">
        Google Sign‑In not configured.
      </p>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* ── Our fully-width visible button ───────────────────────────────── */}
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{ opacity: loading ? 0.5 : 1, pointerEvents: loading ? 'none' : 'auto' }}
      >
        {/* Visible layer */}
        <div className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white border border-neutral-200 text-neutral-800 text-sm font-semibold shadow-sm select-none"
          style={{ cursor: 'pointer' }}>
          {/* Google G logo */}
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </div>

        {/* Google's real iframe — transparent overlay so clicks hit it */}
        {!scriptReady ? (
          <div className="absolute inset-0 rounded-xl bg-neutral-100 animate-pulse" />
        ) : (
          <div
            ref={hiddenRef}
            className="absolute inset-0 overflow-hidden rounded-xl"
            style={{ opacity: 0, cursor: 'pointer' }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
