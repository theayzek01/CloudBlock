import React from 'react';

interface CursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
}

export const SmoothCursor: React.FC<CursorProps> = ({ x, y, color, name }) => {
  // Figma tarzı pürüzsüz hareket için CSS transform ve transition kullanıyoruz.
  // "transform" özelliği GPU hızlandırması kullanarak 60+ FPS sağlar.
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 999999,
        transform: `translate(${x}px, ${y}px)`,
        transition: 'transform 0.08s linear', // Ultra smooth interpolation
      }}
    >
      {/* Fare İmleci SVG'si */}
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
      >
        <path
          d="M5.65376 2.15376C5.40114 1.90114 5 2.08007 5 2.4375V33.5625C5 33.9199 5.40114 34.0989 5.65376 33.8462L13.8462 25.6538C13.9392 25.5608 14.0654 25.5086 14.1969 25.5086H25.5625C25.9199 25.5086 26.0989 25.1075 25.8462 24.8549L5.65376 2.15376Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Pill-shaped İsim Etiketi */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '12px',
          backgroundColor: color,
          color: 'white',
          padding: '4px 10px',
          borderRadius: '999px', // Ultra soft
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {name}
      </div>
    </div>
  );
};
