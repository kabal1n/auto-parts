import { useEffect, useRef } from 'react';

// Barcode scanners send characters faster than 80 ms apart and finish with Enter.
// Human typing is slower, so the buffer resets between keystrokes and never triggers.
export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const callbackRef = useRef(onScan);
  useEffect(() => { callbackRef.current = onScan; });

  const buffer = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && buffer.current.length > 3) {
        callbackRef.current(buffer.current);
        buffer.current = '';
        return;
      }
      if (e.key.length === 1) {
        buffer.current += e.key;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { buffer.current = ''; }, 80);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
