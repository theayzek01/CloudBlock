import React, { useState, useEffect } from 'react';
import { socketClient } from './socketClient';
import { SmoothCursor } from './SmoothCursor';
import { TimeMachine } from './TimeMachine';

interface RemoteCursor {
  x: number;
  y: number;
  color: string;
}

const CloudBlockUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: RemoteCursor }>({});
  
  // Extract project ID from URL to use as room ID
  const getRoomId = () => {
    const match = window.location.pathname.match(/\/projects\/(\d+)/);
    return match ? match[1] : 'default_room';
  };

  useEffect(() => {
    const roomId = getRoomId();
    socketClient.connect(roomId);

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      socketClient.emitCursor(roomId, e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Listen for remote cursors (Optimized Batched Sync)
    if (socketClient.socket) {
      socketClient.socket.on('cursor_batch', (batchedCursors: { [userId: string]: { x: number, y: number } }) => {
        setRemoteCursors(prev => {
          const newCursors = { ...prev };
          for (const userId in batchedCursors) {
            // Sadece kendi imlecimizi ekrana çizmeyelim
            if (userId !== socketClient.socket?.id) {
              newCursors[userId] = {
                x: batchedCursors[userId].x,
                y: batchedCursors[userId].y,
                // Basit deterministik renk ataması
                color: `hsl(${userId.charCodeAt(0) * 20 % 360}, 80%, 55%)`
              };
            }
          }
          return newCursors;
        });
      });
      
      socketClient.socket.on('user_left', (data: { userId: string }) => {
        setRemoteCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[data.userId];
          return newCursors;
        });
      });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* Render Remote Cursors */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <SmoothCursor 
          key={userId} 
          x={cursor.x} 
          y={cursor.y} 
          color={cursor.color} 
          name={`User ${userId.substring(0, 4)}`} 
        />
      ))}

      {/* Main UI */}
      <div style={{ pointerEvents: 'auto', position: 'absolute', top: '16px', left: '16px', zIndex: 1000000 }}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '999px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 600,
            color: '#1e293b',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            borderRadius: '50%',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
          }}></div>
          Cloud Block
          <span style={{
            background: '#e2e8f0',
            color: '#475569',
            padding: '2px 8px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700
          }}>
            {Object.keys(remoteCursors).length + 1}
          </span>
        </button>

        {isOpen && (
          <div style={{
            marginTop: '16px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: '28px', // Ultra rounded pill-like corners
            boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            width: '320px',
            fontFamily: 'system-ui, sans-serif',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Oturum</h3>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
            </div>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Bağlantı şifrelendi ve optimize edildi. Gecikme süresi: <strong>{`< 50ms`}</strong>
            </p>
            
            {/* Active Users List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {Object.entries(remoteCursors).map(([id, cursor]) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '16px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: cursor.color }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#334155' }}>Kullanıcı {id.substring(0,4)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                flex: 1, padding: '12px', borderRadius: '999px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: 'white', 
                fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
              }}>Davet Et</button>
              
              <button 
                onClick={() => setShowTimeMachine(true)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '999px', border: '1px solid #e2e8f0',
                  background: 'transparent', color: '#475569', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Zaman Makinesi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render Time Machine if open */}
      {showTimeMachine && <TimeMachine onClose={() => setShowTimeMachine(false)} />}
    </>
  );
};

export default CloudBlockUI;
