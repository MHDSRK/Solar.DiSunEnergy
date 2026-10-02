import { ImageResponse } from 'next/og'

export const alt = 'DiSun Energy International'
export const size = { width: 1080, height: 1080 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
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
      <img
        width="1080"
        height="1080"
        src="https://solardisunenergy.vercel.app/logo-social.svg"
        alt="DiSun Energy International"
      />
    </div>,
    { width: 1080, height: 1080 }
  )
}
