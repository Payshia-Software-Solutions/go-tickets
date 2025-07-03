
'use client'

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

export const pageview = () => {
  if (window.fbq && FB_PIXEL_ID) {
    window.fbq('track', 'PageView')
  }
}

// https://developers.facebook.com/docs/facebook-pixel/advanced/
export const track = (name: string, options = {}) => {
  if (window.fbq && FB_PIXEL_ID) {
    console.log(`[Facebook Pixel] Tracking: ${name}`, options);
    window.fbq('track', name, options)
  }
}
