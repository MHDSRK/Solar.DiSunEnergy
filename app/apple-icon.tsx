import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <svg width="180" height="180" viewBox="0 0 1080 1080">
        <rect width="1080" height="1080" fill="#fff" />
        <polygon
          points="250,515 300,430 430,430 480,515 430,600 300,600"
          fill="#0b5bd3"
          stroke="#173d78"
          strokeWidth="8"
        />
        <polygon
          points="390,365 445,275 545,275 675,515 620,605 520,605"
          fill="#5fe52a"
          stroke="#126e20"
          strokeWidth="8"
        />
        <polygon
          points="570,365 625,275 725,275 875,515 820,605 720,605"
          fill="#0b5bd3"
          stroke="#173d78"
          strokeWidth="8"
        />
      </svg>
    </div>,
    { width: 180, height: 180 }
  )
}
