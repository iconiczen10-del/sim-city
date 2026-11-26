// useIsPhone.ts — Viewport breakpoint detector matching Tailwind sm: (< 640px) for phone vs PC layout

import { useEffect, useState } from 'react';

const PHONE_QUERY = '(max-width: 639px)';

export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(PHONE_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setIsPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isPhone;
}
