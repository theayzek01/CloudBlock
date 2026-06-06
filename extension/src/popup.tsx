declare const chrome: any;
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { db, initUserId, firebaseClient } from './firebaseClient';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const PopupApp: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [uid, setUid] = useState('');

  useEffect(() => {
    let active = true;
    let unsub1 = () => {};
    let unsub2 = () => {};

    const setup = async () => {
      const resId = await initUserId();
      if (!active) return;
      setUid(resId);

      let scratchUser = '';
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const res = await new Promise<any>((resolve) => {
          chrome.storage.local.get(['myScratchUsername'], resolve);
        });
        scratchUser = res?.myScratchUsername || '';
      }

      if (!active) return;
      setLoading(false);

      const invitationsCol = collection(db, 'invitations');
      let list1: any[] = [];
      let list2: any[] = [];

      const updateInvitations = () => {
        const merged = [...list1, ...list2].filter((item, index, self) => 
          self.findIndex(t => t.id === item.id) === index
        );
        setInvitations(merged);

        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'set_badge',
            text: merged.length > 0 ? merged.length.toString() : ''
          });
        }
      };

      const q1 = query(invitationsCol, where('toUserId', '==', resId));
      unsub1 = onSnapshot(q1, (snap) => {
        list1 = [];
        const cutoff = Date.now() - 300000;
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'pending' && data.timestamp >= cutoff) {
            list1.push(data);
          }
        });
        updateInvitations();
      }, (err) => {
        console.error("Popup invitation list1 error:", err);
      });

      if (scratchUser) {
        const q2 = query(invitationsCol, where('toUsername', '==', scratchUser));
        unsub2 = onSnapshot(q2, (snap) => {
          list2 = [];
          const cutoff = Date.now() - 300000;
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status === 'pending' && data.timestamp >= cutoff) {
              list2.push(data);
            }
          });
          updateInvitations();
        }, (err) => {
          console.error("Popup invitation list2 error:", err);
        });
      }
    };

    setup();

    return () => {
      active = false;
      unsub1();
      unsub2();
    };
  }, []);

  const handleAccept = (invite: any) => {
    // Open project in a new tab with the lobby hash
    const projectUrl = `https://scratch.mit.edu/projects/${invite.projectId}/#cloudblock-lobby`;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: projectUrl });
    } else {
      window.open(projectUrl, '_blank');
    }
    // Accept in firebase
    firebaseClient.respondToInvitation(invite.id, 'accepted');
  };

  const handleDecline = (inviteId: string) => {
    firebaseClient.respondToInvitation(inviteId, 'declined');
  };

  const handleOpenScratch = () => {
    const editorUrl = 'https://scratch.mit.edu/projects/editor/';
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: editorUrl });
    } else {
      window.open(editorUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', background: '#0b0f19', color: '#64748b', fontSize: '13px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', animation: 'cbSpin 0.8s linear infinite' }}></div>
          <span>Yükleniyor...</span>
        </div>
        <style>{`
          @keyframes cbSpin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: '#0b0f19',
      minHeight: '280px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      color: '#f8fafc',
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <img 
          src="Cloudblocklogo.png" 
          alt="Logo" 
          style={{ width: '36px', height: '36px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cloud Block
          </h2>
          <span style={{ fontSize: '9px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ID: #{uid}
          </span>
        </div>
        <span style={{
          background: 'rgba(52, 211, 153, 0.1)',
          color: '#34d399',
          padding: '2px 8px',
          borderRadius: '100px',
          fontSize: '9px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34d399' }}></span>
          Aktif
        </span>
      </div>

      {/* Invitations List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {invitations.length > 0 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'cbPulse 1.2s infinite' }}></span>
              Gelen Davetler ({invitations.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {invitations.map((invite) => (
                <div 
                  key={invite.id} 
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#151b2c',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.4' }}>
                    <strong style={{ color: '#818cf8' }}>{invite.fromUsername}</strong> sizi beraber çalışmaya davet ediyor.
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleDecline(invite.id)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'transparent',
                        color: '#94a3b8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Reddet
                    </button>
                    <button
                      onClick={() => handleAccept(invite)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#6366f1',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>login</span>
                      Katıl
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.06)',
            textAlign: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#6366f1', fontSize: '32px' }}>
              cloud_done
            </span>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Her Şey Hazır!</div>
            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
              Eklenti aktif. İş birliği menüsü Scratch projesinin içindedir.
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <button
        onClick={handleOpenScratch}
        style={{
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          color: 'white',
          border: 'none',
          padding: '12px 0',
          borderRadius: '100px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>rocket_launch</span>
        Scratch'i Aç
      </button>

      {/* CSS Animation inject */}
      <style>{`
        @keyframes cbPulse {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// Mount
const rootElement = document.getElementById('popup-root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<PopupApp />);
}
