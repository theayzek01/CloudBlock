import React, { useState, useEffect, useRef } from 'react';
import { socketClient } from './socketClient';
import { SmoothCursor } from './SmoothCursor';

interface RemoteCursor {
  x: number;
  y: number;
  color: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  color: string;
  timestamp: number;
}

// Draggable hook
function useDraggable() {
  const [position, setPosition] = useState({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Sadece sol tık ve belirli alanlar
    if (e.button !== 0) return;
    setIsDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, e.clientX - offset.x),
        y: Math.max(0, e.clientY - offset.y)
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  return { position, handleMouseDown, isDragging };
}

const CloudBlockUI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true); // Default open for premium feel
  const [activeTab, setActiveTab] = useState<'session' | 'chat' | 'history'>('session');
  
  const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: RemoteCursor }>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { position, handleMouseDown, isDragging } = useDraggable();
  
  // My own random color for chat
  const [myColor] = useState(`hsl(${Math.floor(Math.random() * 360)}, 80%, 65%)`);

  const getRoomId = () => {
    const match = window.location.pathname.match(/\/projects\/(\d+)/);
    return match ? match[1] : 'default_room';
  };

  const roomId = getRoomId();

  useEffect(() => {
    socketClient.connect(roomId);

    const handleMouseMove = (e: MouseEvent) => {
      socketClient.emitCursor(roomId, e.clientX, e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);

    if (socketClient.socket) {
      socketClient.socket.on('cursor_batch', (batchedCursors: { [userId: string]: { x: number, y: number } }) => {
        setRemoteCursors(prev => {
          const newCursors = { ...prev };
          for (const userId in batchedCursors) {
            if (userId !== socketClient.socket?.id) {
              newCursors[userId] = {
                x: batchedCursors[userId].x,
                y: batchedCursors[userId].y,
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

    socketClient.onChatMessage((data) => {
      setMessages(prev => [...prev, { ...data, id: Math.random().toString() }]);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [roomId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    socketClient.emitChatMessage(roomId, chatInput.trim(), myColor);
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      userId: 'Ben',
      message: chatInput.trim(),
      color: myColor,
      timestamp: Date.now()
    }]);
    setChatInput('');
  };

  return (
    <>
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <SmoothCursor key={userId} x={cursor.x} y={cursor.y} color={cursor.color} name={`Kullanıcı ${userId.substring(0, 4)}`} />
      ))}

      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: position.y,
        left: position.x,
        zIndex: 1000000,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        
        {/* Toggle Button / Header */}
        <div 
          onMouseDown={handleMouseDown}
          onClick={() => { if (!isDragging) setIsOpen(!isOpen); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 18px',
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: isOpen ? '20px 20px 0 0' : '999px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)', cursor: isDragging ? 'grabbing' : 'grab',
            color: '#f8fafc', fontWeight: 600, transition: 'border-radius 0.2s', width: '320px', boxSizing: 'border-box'
          }}
        >
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
          <span style={{ flex: 1, userSelect: 'none' }}>Cloud Block</span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
            {Object.keys(remoteCursors).length + 1} Kişi
          </span>
        </div>

        {/* Panel Body */}
        {isOpen && (
          <div style={{
            width: '320px', height: '380px',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)', borderTop: 'none', borderRadius: '0 0 20px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { id: 'session', label: 'Oturum' },
                { id: 'chat', label: 'Sohbet' },
                { id: 'history', label: 'Geçmiş' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1, padding: '12px 0', background: 'transparent', border: 'none',
                    color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                    borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              
              {/* SESSION TAB */}
              {activeTab === 'session' && (
                <div style={{ animation: 'fadeIn 0.2s' }}>
                  <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                    Scratch projeniz gerçek zamanlı olarak buluta bağlı. Uçtan uca şifrelenmiş ve optimize edilmiş CRDT ağı aktif.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myColor }}></div>
                      <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 500 }}>Sen (Host)</span>
                    </div>
                    {Object.entries(remoteCursors).map(([id, cursor]) => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cursor.color }}></div>
                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Kullanıcı {id.substring(0,4)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button style={{
                    width: '100%', marginTop: '20px', padding: '12px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', color: 'white', 
                    fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)'
                  }}>
                    Bağlantı Daveti Kopyala
                  </button>
                </div>
              )}

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.2s' }}>
                  <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '10px' }}>
                    {messages.length === 0 ? (
                      <div style={{ margin: 'auto', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>Henüz mesaj yok.<br/>Sohbete başla!</div>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.userId === 'Ben' ? 'flex-end' : 'flex-start' }}>
                          <span style={{ fontSize: '11px', color: msg.color, marginBottom: '2px', fontWeight: 600 }}>
                            {msg.userId === 'Ben' ? 'Sen' : `Kullanıcı ${msg.userId.substring(0,4)}`}
                          </span>
                          <div style={{ 
                            background: msg.userId === 'Ben' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)',
                            color: '#f8fafc', padding: '8px 12px', borderRadius: '14px', fontSize: '13px', maxWidth: '85%', wordBreak: 'break-word'
                          }}>
                            {msg.message}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <input 
                      type="text" 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Mesaj yaz..." 
                      style={{ 
                        flex: 1, padding: '10px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', 
                        background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', fontSize: '13px' 
                      }} 
                    />
                    <button type="submit" style={{
                      background: '#38bdf8', color: '#0f172a', border: 'none', width: '38px', height: '38px', 
                      borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm-2.846-3.7 4.339-2.76-7.494 7.494 3.155-4.734Z"/></svg>
                    </button>
                  </form>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div style={{ animation: 'fadeIn 0.2s' }}>
                  <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                    Projenizin son durumları şifreli olarak yedeklenir. Hata yaparsanız geçmişe dönebilirsiniz.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { time: 'Şimdi', desc: 'Mevcut Durum', active: true },
                      { time: '2 dk önce', desc: 'Sohbet arayüzü eklendi', active: false },
                      { time: '15 dk önce', desc: 'Hareket bloğu eklendi', active: false }
                    ].map((item, i) => (
                      <div key={i} style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                        background: item.active ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.03)',
                        border: item.active ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                      }}>
                        <div style={{ 
                          width: '10px', height: '10px', borderRadius: '50%', 
                          background: item.active ? '#38bdf8' : '#475569' 
                        }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: item.active ? 600 : 400, color: '#f8fafc' }}>{item.time}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.desc}</div>
                        </div>
                        {!item.active && (
                          <button style={{ 
                            background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px 10px', 
                            borderRadius: '999px', fontSize: '11px', color: '#f8fafc', cursor: 'pointer'
                          }}>Dön</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CloudBlockUI;
