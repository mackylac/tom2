import { useEffect, useState } from 'react';

export interface ViewportDeviceState {
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

function readViewportState(): ViewportDeviceState {
  if (typeof window === 'undefined') {
    return {
      width: 1440,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
    };
  }
  const w = window.innerWidth;
  const isTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches;

  return {
    width: w,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1024,
    isDesktop: w >= 1024,
    isTouchDevice: isTouch,
  };
}

export function useViewportDevice(): ViewportDeviceState {
  const [state, setState] = useState<ViewportDeviceState>(() =>
    readViewportState()
  );

  useEffect(() => {
    const handleResize = () => {
      setState(readViewportState());
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}
