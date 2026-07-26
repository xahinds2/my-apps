import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#0d0d0d',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: 14,
        color: '#28c840',
        letterSpacing: '0px',
        gap: 1,
      }}
    >
      $<span style={{ color: '#28c840', fontWeight: 400, opacity: 0.85 }}>_</span>
    </div>,
    { ...size },
  );
}
