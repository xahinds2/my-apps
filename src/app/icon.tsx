import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#0a0a0a',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        fontFamily: 'sans-serif',
        fontWeight: 800,
        fontSize: 18,
        color: 'white',
        letterSpacing: '-0.5px',
      }}
    >
      S
    </div>,
    { ...size },
  );
}
