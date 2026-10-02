import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DiSun Energy International',
    short_name: 'DiSun Energy',
    description: 'Solar power calculator and KSEB transformer feasibility for Kerala customers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#020f25',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  }
}
