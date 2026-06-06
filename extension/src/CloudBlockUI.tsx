import React, { useState, useEffect, useRef } from 'react';
import { firebaseClient, myUserId } from './firebaseClient';
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

interface Checkpoint {
  id: string;
  name: string;
  workspaceXml: string;
  author: string;
  timestamp: number;
}

// Draggable hook for free movement of the UI panel with screen boundaries
function useDraggable(isOpen: boolean) {
  const [position, setPosition] = useState({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click and header only
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
      const panelWidth = isOpen ? 325 : 120;
      const panelHeight = isOpen ? 436 : 48;

      const maxX = window.innerWidth - panelWidth;
      const maxY = window.innerHeight - panelHeight;

      setPosition({
        x: Math.min(Math.max(0, e.clientX - offset.x), maxX),
        y: Math.min(Math.max(0, e.clientY - offset.y), maxY)
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset, isOpen]);

  // Adjust panel position on expand/collapse to prevent screen overflow
  useEffect(() => {
    const panelWidth = isOpen ? 325 : 120;
    const panelHeight = isOpen ? 436 : 48;
    const maxX = window.innerWidth - panelWidth;
    const maxY = window.innerHeight - panelHeight;

    setPosition(prev => ({
      x: Math.min(Math.max(0, prev.x), maxX),
      y: Math.min(Math.max(0, prev.y), maxY)
    }));
  }, [isOpen]);

  return { position, handleMouseDown, isDragging };
}

const CloudBlockUI: React.FC = () => {
  // Determine if we are in the Scratch editor page or on a generic page
  const isEditor = window.location.pathname.includes('/editor');

  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'session' | 'chat' | 'history'>('session');
  
  // Lobby and mobile states
  const [inLobby, setInLobby] = useState(() => window.location.hash === '#cloudblock-lobby');
  const [lobbyUsers, setLobbyUsers] = useState<string[]>([]);
  const [shareCursor, setShareCursor] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [mobileShowStage, setMobileShowStage] = useState(false);

  // Invitation and online states
  const [myScratchUsername, setMyScratchUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInvite, setActiveInvite] = useState<any>(null);
  const [invitedUsers, setInvitedUsers] = useState<{ [userId: string]: boolean }>({});

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('cloudblock-theme') as 'light' | 'dark') || 'dark';
  });

  const [remoteCursors, setRemoteCursors] = useState<{ [userId: string]: RemoteCursor }>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyCheckpoints, setHistoryCheckpoints] = useState<Checkpoint[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { position, handleMouseDown, isDragging } = useDraggable(isOpen);
  
  // Google Meet-style color choices
  const lobbyColors = [
    '#4285f4', // Google Blue
    '#ea4335', // Google Red
    '#fbbc05', // Google Yellow
    '#34a853', // Google Green
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#f97316'  // Orange
  ];

  // User's custom selected cursor/chat color
  const [myColor, setMyColor] = useState(() => {
    return lobbyColors[Math.floor(Math.random() * lobbyColors.length)];
  });

  const getRoomId = () => {
    const match = window.location.pathname.match(/\/projects\/(\d+)/);
    return match ? match[1] : 'default_room';
  };

  const roomId = getRoomId();

  // Try to find Scratch logged in username from DOM
  const getScratchUsernameFromDom = () => {
    const profileNameEl = document.querySelector('.profile-name') || 
                          document.querySelector('.username') || 
                          document.querySelector('[class*="menu-bar_account-info"] span') ||
                          document.querySelector('.nav-user-link .username');
    return profileNameEl ? profileNameEl.textContent?.trim() || '' : '';
  };

  // Setup username check
  useEffect(() => {
    const checkUsername = () => {
      const name = getScratchUsernameFromDom();
      if (name) {
        setMyScratchUsername(name);
      } else {
        setMyScratchUsername(`Kullanıcı ${myUserId.substring(0, 4)}`);
      }
    };
    checkUsername();
    const t = setTimeout(checkUsername, 2000);
    return () => clearTimeout(t);
  }, []);

  // Heartbeat online user registration
  useEffect(() => {
    const cleanupHeartbeat = firebaseClient.startHeartbeat(
      isEditor ? roomId : 'home',
      () => myScratchUsername || `Kullanıcı ${myUserId.substring(0, 4)}`
    );
    return () => {
      cleanupHeartbeat();
    };
  }, [roomId, myScratchUsername, isEditor]);

  // Listen to other online users
  useEffect(() => {
    const unsub = firebaseClient.listenOnlineUsers((usersList) => {
      setOnlineUsers(usersList);
    });
    return unsub;
  }, []);

  // Listen for incoming invitations sent to us
  useEffect(() => {
    const unsub = firebaseClient.listenInvitations((invite) => {
      setActiveInvite(invite);
    });
    return unsub;
  }, []);

  // Inject animations and responsive mobile styles into document
  useEffect(() => {
    // 1. Inject animations
    const styleId = 'cloudblock-lobby-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes cbPulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.12); opacity: 0.95; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        @keyframes cbFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cbSlideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    // 2. Inject Mobile responsive override styles
    const mobileStyleId = 'cloudblock-mobile-styles';
    if (!document.getElementById(mobileStyleId)) {
      const style = document.createElement('style');
      style.id = mobileStyleId;
      style.textContent = `
        @media (max-width: 767px) {
          /* Compress Scratch Navigation bar */
          [class*="menu-bar_main-menu"] {
            display: none !important;
          }
          [class*="menu-bar_account-info"] {
            display: none !important;
          }
          
          /* Toggle visibility of Blockly editor and Scratch canvas stage */
          body:not(.cb-show-stage) [class*="stage-wrapper_stage-wrapper"] {
            display: none !important;
          }
          body:not(.cb-show-stage) [class*="sprite-selector_sprite-selector"] {
            display: none !important;
          }
          
          body.cb-show-stage [class*="gui_workspace-wrapper"],
          body.cb-show-stage [class*="scratchCategoryMenu"],
          body.cb-show-stage [class*="blocklyToolboxDiv"] {
            display: none !important;
          }
          
          /* Responsive UI stack layouts */
          [class*="gui_body-wrapper"],
          [class*="gui_flex-row"],
          [class*="gui_stage-and-target-wrapper"] {
            width: 100% !important;
            height: calc(100vh - 48px) !important;
            flex-direction: column !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          [class*="stage-wrapper_stage-wrapper"] {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          /* Auto scale Canvas to fit mobile width */
          [class*="stage_stage"] {
            transform: scale(0.8) !important;
            transform-origin: center center !important;
            margin: 0 auto !important;
          }

          .blocklySvg {
            width: 100% !important;
            height: 100% !important;
          }
          
          [class*="scratchCategoryMenu"],
          [class*="blocklyToolboxDiv"] {
            width: 48px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Listen to window size to trigger phone coding mode
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch active users once when in Lobby
  useEffect(() => {
    if (inLobby) {
      firebaseClient.getActiveUsersOnce(roomId).then((users) => {
        setLobbyUsers(users);
      });
    }
  }, [inLobby, roomId]);

  // Real-time editor synchronization starts only after joining the session
  useEffect(() => {
    if (inLobby || !isEditor) return;

    // Connect to Firebase
    firebaseClient.connect(roomId);

    // Update cursor position if cursor sharing is enabled
    const handleMouseMove = (e: MouseEvent) => {
      if (shareCursor) {
        firebaseClient.emitCursor(roomId, e.clientX, e.clientY);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Setup callbacks
    firebaseClient.onCursorUpdate((updatedCursors) => {
      setRemoteCursors(updatedCursors);
    });

    firebaseClient.onChatMessage((newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    firebaseClient.onHistoryChanged((checkpointsList) => {
      setHistoryCheckpoints(checkpointsList);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      firebaseClient.disconnect();
    };
  }, [roomId, inLobby, shareCursor, isEditor]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    firebaseClient.emitChatMessage(roomId, chatInput.trim(), myColor);
    setChatInput('');
  };

  const copyInviteLink = () => {
    const link = `https://scratch.mit.edu/projects/${roomId}/editor#cloudblock-lobby`;
    navigator.clipboard.writeText(link).then(() => {
      alert("Davet bağlantısı kopyalandı! Bu linki diğer kullanıcılarla paylaşarak gerçek zamanlı çalışabilirsiniz. Linki açan kişiler hazırlık odasından geçerek katılacaktır.");
    }).catch(err => {
      console.error(err);
    });
  };

  const joinOturum = () => {
    setInLobby(false);
    window.location.hash = ''; // Clear hash from the URL
  };

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('cloudblock-theme', nextTheme);
  };

  const createBackup = async () => {
    // @ts-ignore
    const Blockly = window.Blockly;
    if (!Blockly || !Blockly.getMainWorkspace) {
      alert("Blockly workspace bulunamadı!");
      return;
    }
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) {
      alert("Workspace hazır değil!");
      return;
    }
    
    const name = prompt("Yedek için bir isim girin:", `Yedek ${new Date().toLocaleTimeString('tr-TR')}`);
    if (name === null) return; // Canceled
    
    try {
      const xml = Blockly.Xml.workspaceToDom(workspace);
      const xmlText = Blockly.Xml.domToText(xml);
      await firebaseClient.saveCheckpoint(roomId, name.trim() || 'İsimsiz Yedek', xmlText);
    } catch (e) {
      console.error(e);
      alert("Yedek alınırken bir hata oluştu!");
    }
  };

  const restoreCheckpoint = async (cp: Checkpoint) => {
    // @ts-ignore
    const Blockly = window.Blockly;
    if (!Blockly || !Blockly.getMainWorkspace) {
      alert("Blockly workspace bulunamadı!");
      return;
    }
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) return;
    
    if (!confirm(`"${cp.name}" yedeğine dönmek istediğinize emin misiniz? Mevcut çalışma alanınız silinecektir.`)) {
      return;
    }
    
    try {
      // 1. Restore workspace locally
      const xml = Blockly.Xml.textToDom(cp.workspaceXml);
      // @ts-ignore
      Blockly.Events.disable();
      workspace.clear();
      // @ts-ignore
      Blockly.Xml.domToWorkspace(xml, workspace);
      // @ts-ignore
      Blockly.Events.enable();
      
      // 2. Broadcast to other room members
      firebaseClient.emitBlockEvent(roomId, {
        type: 'restore_workspace',
        workspaceXml: cp.workspaceXml
      });
      
      alert("Yedek başarıyla yüklendi ve diğer kullanıcılara senkronize edildi!");
    } catch (e) {
      console.error(e);
      alert("Yedek yüklenirken hata oluştu!");
    }
  };

  const toggleMobileStage = () => {
    const next = !mobileShowStage;
    setMobileShowStage(next);
    if (next) {
      document.body.classList.add('cb-show-stage');
    } else {
      document.body.classList.remove('cb-show-stage');
    }
  };

  const inviteUser = async (targetUser: any) => {
    try {
      await firebaseClient.sendInvitation(targetUser.userId, targetUser.username, myScratchUsername, roomId);
      setInvitedUsers(prev => ({ ...prev, [targetUser.userId]: true }));
      setTimeout(() => {
        // Clear invite status after 5 seconds
        setInvitedUsers(prev => ({ ...prev, [targetUser.userId]: false }));
      }, 5000);
    } catch (e) {
      alert("Davet gönderilirken bir hata oluştu!");
    }
  };

  const acceptInvite = () => {
    if (!activeInvite) return;
    firebaseClient.respondToInvitation(activeInvite.id, 'accepted');
    const targetUrl = `https://scratch.mit.edu/projects/${activeInvite.projectId}/editor#cloudblock-lobby`;
    setActiveInvite(null);
    window.location.href = targetUrl;
  };

  const declineInvite = () => {
    if (!activeInvite) return;
    firebaseClient.respondToInvitation(activeInvite.id, 'declined');
    setActiveInvite(null);
  };

  // Google Material Design 3 theme colors
  const themes = {
    dark: {
      bg: 'rgba(15, 23, 42, 0.96)', // Slate 900
      headerBg: 'rgba(30, 41, 59, 0.9)', // Slate 800
      cardBg: 'rgba(30, 41, 59, 0.55)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      border: 'rgba(255, 255, 255, 0.08)',
      activeTab: '#38bdf8', // Sky 400
      activeTabBg: 'rgba(56, 189, 248, 0.12)',
      btnBg: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
      btnText: '#ffffff',
      shadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
      inputBg: 'rgba(0, 0, 0, 0.25)',
      inputText: '#f8fafc',
      inputBorder: 'rgba(255, 255, 255, 0.12)',
      chatMeBg: 'linear-gradient(135deg, #0284c7, #0369a1)',
      chatOtherBg: 'rgba(255, 255, 255, 0.08)',
    },
    light: {
      bg: 'rgba(255, 255, 255, 0.99)',
      headerBg: 'rgba(241, 245, 249, 0.96)', // Slate 100
      cardBg: 'rgba(241, 245, 249, 0.65)',
      textPrimary: '#0f172a', // Slate 900
      textSecondary: '#475569', // Slate 600
      border: 'rgba(0, 0, 0, 0.08)',
      activeTab: '#0284c7', // Sky 600
      activeTabBg: 'rgba(2, 132, 199, 0.08)',
      btnBg: 'linear-gradient(135deg, #0284c7, #2563eb)',
      btnText: '#ffffff',
      shadow: '0 24px 64px rgba(0, 0, 0, 0.12)',
      inputBg: 'rgba(0, 0, 0, 0.04)',
      inputText: '#0f172a',
      inputBorder: 'rgba(0, 0, 0, 0.12)',
      chatMeBg: 'linear-gradient(135deg, #0284c7, #0369a1)',
      chatOtherBg: 'rgba(0, 0, 0, 0.06)',
    }
  };

  const t = themes[theme];

  // Filter search results
  const filteredUsers = onlineUsers.filter(user => {
    // Exclude users already in our room cursors list
    if (remoteCursors[user.userId]) return false;
    return user.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // RENDER INVITATION TOAST (sol alt köşede bildirim)
  const renderInviteToast = () => {
    if (!activeInvite) return null;
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 10000000,
        width: '330px',
        padding: '20px',
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: '20px',
        boxShadow: t.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        animation: 'cbSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
        color: t.textPrimary
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: t.activeTab, fontSize: '22px' }}>
            forum
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1px' }}>Proje Daveti!</span>
        </div>
        
        <div style={{ fontSize: '13px', color: t.textSecondary, lineHeight: 1.4 }}>
          <strong>{activeInvite.fromUsername}</strong> sizi Scratch projesinde beraber çalışmaya davet ediyor.
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={declineInvite}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '100px',
              border: `1px solid ${t.border}`,
              background: 'transparent',
              color: t.textSecondary,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
            onMouseOver={e => e.currentTarget.style.background = t.cardBg}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Reddet
          </button>
          
          <button
            onClick={acceptInvite}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '100px',
              border: 'none',
              background: t.btnBg,
              color: t.btnText,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Katıl
          </button>
        </div>
      </div>
    );
  };

  // IF WE ARE ON SCRATCH HOMEPAGE / NON-EDITOR PAGES:
  // Render ONLY the invite notification toast in the bottom-left corner!
  if (!isEditor) {
    return (
      <>
        {renderInviteToast()}
      </>
    );
  }

  // LOBBY (PREPARATION ROOM) SCREEN
  if (inLobby) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: theme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'auto',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Meet-style Card Container */}
        <div style={{
          width: '450px',
          padding: '32px',
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: '28px',
          boxShadow: t.shadow,
          display: 'flex',
          flexDirection: 'column',
          animation: 'cbFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          color: t.textPrimary
        }}>
          {/* Pulsating Glowing Bulut Sync Icon */}
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #0ea5e9 0%, rgba(14,165,233,0) 70%)',
              animation: 'cbPulse 2s infinite',
              zIndex: 0
            }}></div>
            <span className="material-symbols-outlined" style={{
              fontSize: '48px',
              color: t.activeTab,
              zIndex: 1,
              position: 'relative'
            }}>
              cloud_sync
            </span>
          </div>

          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: 700, 
            textAlign: 'center', 
            margin: '0 0 8px 0', 
            color: t.textPrimary,
            letterSpacing: '-0.3px'
          }}>
            Cloud Block Hazırlık Odası
          </h2>
          
          <p style={{ 
            fontSize: '13px', 
            color: t.textSecondary, 
            textAlign: 'center', 
            margin: '0 0 24px 0',
            lineHeight: 1.5 
          }}>
            Oturuma katılmadan önce ayarlarınızı ve imlecinizi yapılandırın.
          </p>

          {/* Active Users Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: t.textPrimary, 
              fontWeight: 600, 
              fontSize: '13px', 
              marginBottom: '10px' 
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
              Oturumdaki Aktif Kişiler ({lobbyUsers.length})
            </div>
            
            <div style={{
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: '16px',
              padding: '12px 16px',
              maxHeight: '90px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxSizing: 'border-box'
            }}>
              {lobbyUsers.length === 0 ? (
                <div style={{ color: t.textSecondary, fontSize: '12px', textAlign: 'center', padding: '6px 0' }}>
                  Şu an odada aktif kimse yok. İlk katılan sen olacaksın!
                </div>
              ) : (
                lobbyUsers.map(id => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: t.textPrimary }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: `hsl(${id.charCodeAt(0) * 55 % 360}, 85%, 60%)` }}></div>
                    Kullanıcı {id.substring(0, 4)} <span style={{ color: t.textSecondary, fontSize: '10px' }}>(#{id})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Settings Section */}
          <div style={{ 
            background: t.cardBg, 
            borderRadius: '16px', 
            padding: '16px', 
            border: `1px solid ${t.border}`,
            marginBottom: '24px'
          }}>
            
            {/* Color Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', borderBottom: `1px solid ${t.border}`, paddingBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: t.textSecondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>İmleç Rengini Seç</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="20" viewBox="0 0 24 36" fill="none">
                    <path d="M5.65376 2.15376C5.40114 1.90114 5 2.08007 5 2.4375V33.5625C5 33.9199 5.40114 34.0989 5.65376 33.8462L13.8462 25.6538C13.9392 25.5608 14.0654 25.5086 14.1969 25.5086H25.5625C25.9199 25.5086 26.0989 25.1075 25.8462 24.8549L5.65376 2.15376Z" fill={myColor} stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <span>Önizleme</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '6px' }}>
                {lobbyColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setMyColor(color)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: color,
                      border: myColor === color ? '3px solid white' : 'none',
                      boxShadow: myColor === color ? '0 0 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transform: myColor === color ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s, border 0.15s',
                      outline: 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Cursor Share Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: t.textSecondary, fontSize: '20px' }}>mouse</span>
                <div>
                  <div style={{ fontSize: '13px', color: t.textPrimary, fontWeight: 600 }}>Fare İmlecimi Göster</div>
                  <div style={{ fontSize: '10px', color: t.textSecondary }}>Hareketlerim başkalarına senkronize edilsin</div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={shareCursor} 
                onChange={(e) => setShareCursor(e.target.checked)} 
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: t.activeTab }}
              />
            </div>

            {/* Theme Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: t.textSecondary, fontSize: '20px' }}>
                  {theme === 'light' ? 'dark_mode' : 'light_mode'}
                </span>
                <div>
                  <div style={{ fontSize: '13px', color: t.textPrimary, fontWeight: 600 }}>Arayüz Teması</div>
                  <div style={{ fontSize: '10px', color: t.textSecondary }}>Tema seçimini buradan değiştirin</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextTheme = theme === 'light' ? 'dark' : 'light';
                  setTheme(nextTheme);
                  localStorage.setItem('cloudblock-theme', nextTheme);
                }}
                style={{
                  background: t.activeTabBg,
                  border: 'none',
                  color: t.activeTab,
                  padding: '6px 12px',
                  borderRadius: '100px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {theme === 'light' ? 'Karanlık Yap' : 'Aydınlık Yap'}
              </button>
            </div>
          </div>

          {/* Join Button */}
          <button
            onClick={joinOturum}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '100px',
              border: 'none',
              background: t.btnBg,
              color: t.btnText,
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: theme === 'dark' ? '0 8px 30px rgba(14, 165, 233, 0.4)' : '0 8px 20px rgba(2, 132, 199, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.1s, opacity 0.2s',
              outline: 'none'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>login</span>
            Oturuma Katıl
          </button>
        </div>
      </div>
    );
  }

  // MAIN CO-WORKING INTERFACE (RUNS WHEN NOT IN LOBBY)
  return (
    <>
      {/* Render Remote Cursors on screen */}
      {Object.entries(remoteCursors).map(([userId, cursor]) => (
        <SmoothCursor 
          key={userId} 
          x={cursor.x} 
          y={cursor.y} 
          color={cursor.color} 
          name={`Kullanıcı ${userId.substring(0, 4)}`} 
        />
      ))}

      {/* Main UI Container */}
      <div style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: position.y,
        left: position.x,
        zIndex: 1000000,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        
        {/* Toggle Button / Header (MINIMIZED COMPACT MODE OR FULL HEADER) */}
        {!isOpen ? (
          <div 
            onMouseDown={handleMouseDown}
            onClick={() => { if (!isDragging) setIsOpen(true); }}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              padding: '10px 14px',
              background: theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.75)', 
              backdropFilter: 'blur(12px)', 
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${t.border}`, 
              borderRadius: '999px',
              boxShadow: t.shadow, 
              cursor: isDragging ? 'grabbing' : 'grab',
              color: t.textPrimary, 
              fontWeight: 600, 
              transition: 'all 0.3s ease', 
              width: '120px', 
              boxSizing: 'border-box',
              userSelect: 'none',
              opacity: 0.65
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '0.65';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span className="material-symbols-outlined" style={{ color: t.activeTab, fontSize: '18px' }}>
              cloud
            </span>
            <span style={{ fontSize: '12px', letterSpacing: '0.1px' }}>Cloud</span>
            <span style={{ 
              background: t.activeTabBg, 
              color: t.activeTab, 
              padding: '2px 6px', 
              borderRadius: '100px', 
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              {Object.keys(remoteCursors).length + 1}
            </span>
          </div>
        ) : (
          /* Normal Expanded Header */
          <div 
            onMouseDown={handleMouseDown}
            onClick={() => { if (!isDragging) setIsOpen(false); }}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 18px',
              background: t.headerBg, 
              backdropFilter: 'blur(20px)', 
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${t.border}`, 
              borderRadius: isOpen ? '24px 24px 0 0' : '24px',
              boxShadow: t.shadow, 
              cursor: isDragging ? 'grabbing' : 'grab',
              color: t.textPrimary, 
              fontWeight: 600, 
              transition: 'border-radius 0.2s, background 0.3s, color 0.3s', 
              width: '325px', 
              boxSizing: 'border-box',
              userSelect: 'none'
            }}
          >
            {/* Drag Handle Icon */}
            <span 
              className="material-symbols-outlined" 
              style={{ color: t.textSecondary, fontSize: '20px' }}
            >
              drag_indicator
            </span>

            <span style={{ flex: 1, fontSize: '15px', letterSpacing: '0.2px' }}>Cloud Block</span>

            {/* Active Users Badge */}
            <span style={{ 
              background: t.activeTabBg, 
              color: t.activeTab, 
              padding: '4px 10px', 
              borderRadius: '100px', 
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>group</span>
              {Object.keys(remoteCursors).length + 1}
            </span>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: 'none',
                color: t.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = t.border}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {/* Collapse Icon */}
            <span 
              className="material-symbols-outlined"
              style={{ 
                color: t.textSecondary, 
                fontSize: '18px', 
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            >
              expand_more
            </span>
          </div>
        )}

        {/* Panel Body */}
        {isOpen && (
          <div style={{
            width: '325px', 
            height: '380px',
            background: t.bg, 
            backdropFilter: 'blur(30px)', 
            WebkitBackdropFilter: 'blur(30px)',
            border: `1px solid ${t.border}`, 
            borderTop: 'none', 
            borderRadius: '0 0 24px 24px',
            boxShadow: t.shadow, 
            boxSizing: 'border-box',
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            transition: 'background 0.3s, border-color 0.3s'
          }}>
            
            {/* Material Tabs */}
            <div style={{ 
              display: 'flex', 
              borderBottom: `1px solid ${t.border}`,
              background: t.headerBg,
              padding: '0 6px'
            }}>
              {[
                { id: 'session', label: 'Oturum', icon: 'people' },
                { id: 'chat', label: 'Sohbet', icon: 'chat' },
                { id: 'history', label: 'Zaman', icon: 'history' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1, 
                    padding: '12px 0', 
                    background: 'transparent', 
                    border: 'none',
                    color: activeTab === tab.id ? t.activeTab : t.textSecondary,
                    borderBottom: activeTab === tab.id ? `3px solid ${t.activeTab}` : '3px solid transparent',
                    fontWeight: 600, 
                    fontSize: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px 8px 0 0'
                  }}
                  onMouseOver={e => {
                    if (activeTab !== tab.id) e.currentTarget.style.color = t.textPrimary;
                  }}
                  onMouseOut={e => {
                    if (activeTab !== tab.id) e.currentTarget.style.color = t.textSecondary;
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              {/* SESSION TAB (ONLINE USERS & SEARCH BAR & INVITATIONS) */}
              {activeTab === 'session' && (
                <div style={{ animation: 'fadeIn 0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  
                  {/* Share Link button */}
                  <button 
                    onClick={copyInviteLink}
                    style={{
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '100px', 
                      border: 'none',
                      background: t.btnBg, 
                      color: t.btnText, 
                      fontWeight: 600, 
                      fontSize: '12px',
                      cursor: 'pointer', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginBottom: '14px'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link</span>
                    Bağlantıyı Kopyala
                  </button>

                  {/* Online Users Search Bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ 
                        position: 'absolute', 
                        left: '12px', 
                        color: t.textSecondary,
                        fontSize: '18px'
                      }}>
                        search
                      </span>
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Scratch kullanıcısı davet et..."
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          borderRadius: '100px',
                          border: `1px solid ${t.inputBorder}`,
                          background: t.inputBg,
                          color: t.inputText,
                          fontSize: '11px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* User List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
                    
                    {/* Search Results / Global Online Users */}
                    {searchQuery.trim() !== '' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: t.textSecondary, paddingLeft: '4px' }}>Arama Sonuçları</div>
                        {filteredUsers.length === 0 ? (
                          <div style={{ fontSize: '11px', color: t.textSecondary, padding: '4px 8px' }}>Kullanıcı bulunamadı.</div>
                        ) : (
                          filteredUsers.map(user => (
                            <div key={user.userId} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              padding: '8px 12px', 
                              background: t.cardBg, 
                              borderRadius: '12px',
                              border: `1px solid ${t.border}`
                            }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: `hsl(${user.userId.charCodeAt(0) * 55 % 360}, 85%, 60%)` }}></div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '12px', color: t.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {user.username}
                                </span>
                                <span style={{ fontSize: '9px', color: t.textSecondary }}>
                                  {user.roomId === 'home' ? 'Ana Menüde' : 'Editörde'}
                                </span>
                              </div>
                              <button
                                onClick={() => inviteUser(user)}
                                disabled={invitedUsers[user.userId]}
                                style={{
                                  background: invitedUsers[user.userId] ? 'transparent' : t.activeTabBg,
                                  color: invitedUsers[user.userId] ? t.textSecondary : t.activeTab,
                                  border: invitedUsers[user.userId] ? `1px solid ${t.border}` : 'none',
                                  padding: '5px 12px',
                                  borderRadius: '100px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: invitedUsers[user.userId] ? 'default' : 'pointer',
                                  outline: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                                  {invitedUsers[user.userId] ? 'done' : 'mail'}
                                </span>
                                {invitedUsers[user.userId] ? 'Davet Gitti' : 'Davet Et'}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Room Members */}
                    <div style={{ fontSize: '10px', fontWeight: 700, color: t.textSecondary, paddingLeft: '4px', marginTop: searchQuery.trim() !== '' ? '8px' : '0' }}>Odadaki Kişiler</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '8px 12px', 
                      background: t.cardBg, 
                      borderRadius: '12px',
                      border: `1px solid ${t.border}`
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: myColor, boxShadow: `0 0 6px ${myColor}` }}></div>
                      <span style={{ fontSize: '12px', color: t.textPrimary, fontWeight: 600 }}>{myScratchUsername} (Sen)</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: t.textSecondary }}>#{myUserId}</span>
                    </div>
                    {Object.entries(remoteCursors).map(([id, cursor]) => (
                      <div key={id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '8px 12px', 
                        background: t.cardBg, 
                        borderRadius: '12px',
                        border: `1px solid ${t.border}`
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cursor.color, boxShadow: `0 0 6px ${cursor.color}` }}></div>
                        <span style={{ fontSize: '12px', color: t.textPrimary }}>Kullanıcı {id.substring(0, 4)}</span>
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: t.textSecondary }}>#{id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.2s' }}>
                  {/* Messages container */}
                  <div 
                    ref={chatScrollRef} 
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px', 
                      paddingBottom: '12px' 
                    }}
                  >
                    {messages.length === 0 ? (
                      <div style={{ 
                        margin: 'auto', 
                        color: t.textSecondary, 
                        fontSize: '12px', 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px', color: t.textSecondary }}>forum</span>
                        Sohbet geçmişi boş.
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.userId === myUserId;
                        return (
                          <div 
                            key={msg.id} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: isMe ? 'flex-end' : 'flex-start' 
                            }}
                          >
                            <span style={{ 
                              fontSize: '10px', 
                              color: msg.color, 
                              marginBottom: '2px', 
                              fontWeight: 600,
                              marginRight: isMe ? '4px' : '0',
                              marginLeft: isMe ? '0' : '4px'
                            }}>
                              {isMe ? 'Sen' : `Kullanıcı ${msg.userId.substring(0, 4)}`}
                            </span>
                            <div style={{ 
                              background: isMe ? t.chatMeBg : t.chatOtherBg,
                              color: isMe ? '#ffffff' : t.textPrimary, 
                              padding: '8px 14px', 
                              borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px', 
                              fontSize: '13px', 
                              maxWidth: '85%', 
                              wordBreak: 'break-word',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                              border: isMe ? 'none' : `1px solid ${t.border}`
                            }}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input form */}
                  <form 
                    onSubmit={sendChatMessage} 
                    style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      marginTop: 'auto',
                      borderTop: `1px solid ${t.border}`,
                      paddingTop: '8px'
                    }}
                  >
                    <input 
                      type="text" 
                      value={chatInput} 
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Mesajınızı yazın..." 
                      style={{ 
                        flex: 1, 
                        padding: '10px 16px', 
                        borderRadius: '100px', 
                        border: `1px solid ${t.inputBorder}`, 
                        background: t.inputBg, 
                        color: t.inputText, 
                        outline: 'none', 
                        fontSize: '12px',
                        transition: 'border 0.2s'
                      }} 
                      onFocus={e => e.target.style.borderColor = t.activeTab}
                      onBlur={e => e.target.style.borderColor = t.inputBorder}
                    />
                    {/* Floating Action Send Button */}
                    <button 
                      type="submit" 
                      style={{
                        background: t.activeTab, 
                        color: '#ffffff', 
                        border: 'none', 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                    </button>
                  </form>
                </div>
              )}

              {/* HISTORY / TIME MACHINE TAB */}
              {activeTab === 'history' && (
                <div style={{ animation: 'fadeIn 0.2s', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ color: t.textSecondary, fontSize: '11px', lineHeight: 1.4, flex: 1, marginRight: '10px' }}>
                      Mevcut Blockly çalışma alanını buluta yedekleyebilir veya geçmiş yedeklere dönebilirsiniz.
                    </p>
                    
                    {/* Backup Save button */}
                    <button
                      onClick={createBackup}
                      style={{
                        padding: '6px 12px',
                        background: t.btnBg,
                        color: t.btnText,
                        border: 'none',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>save</span>
                      Yedek Al
                    </button>
                  </div>

                  {/* List of Checkpoints */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                    {historyCheckpoints.length === 0 ? (
                      <div style={{ 
                        margin: 'auto', 
                        color: t.textSecondary, 
                        fontSize: '12px', 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>history</span>
                        Henüz bulut yedeği yok.<br />İlk yedeğinizi alın!
                      </div>
                    ) : (
                      historyCheckpoints.map((cp) => {
                        const isCreatorMe = cp.author === myUserId;
                        return (
                          <div 
                            key={cp.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              padding: '10px 12px',
                              background: t.cardBg,
                              border: `1px solid ${t.border}`,
                              borderRadius: '14px',
                              transition: 'border-color 0.2s'
                            }}
                          >
                            <span 
                              className="material-symbols-outlined" 
                              style={{ 
                                color: isCreatorMe ? t.activeTab : t.textSecondary,
                                fontSize: '20px' 
                              }}
                            >
                              settings_backup_restore
                            </span>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: 600, 
                                color: t.textPrimary,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {cp.name}
                              </div>
                              <div style={{ fontSize: '10px', color: t.textSecondary, display: 'flex', gap: '4px' }}>
                                <span>{new Date(cp.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <span>{isCreatorMe ? 'Sen' : `Kullanıcı ${cp.author.substring(0, 4)}`}</span>
                              </div>
                            </div>

                            <button 
                              onClick={() => restoreCheckpoint(cp)}
                              style={{ 
                                background: t.activeTabBg, 
                                border: 'none', 
                                padding: '5px 12px', 
                                borderRadius: '100px', 
                                fontSize: '11px', 
                                fontWeight: 700,
                                color: t.activeTab, 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                              onMouseOut={e => e.currentTarget.style.opacity = '1'}
                            >
                              Dön
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Mobile Mode view toggling */}
      {isMobile && !inLobby && (
        <button
          onClick={toggleMobileStage}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            pointerEvents: 'auto',
            transition: 'transform 0.1s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
            {mobileShowStage ? 'code' : 'play_arrow'}
          </span>
        </button>
      )}

      {/* Invitation toast display */}
      {renderInviteToast()}
    </>
  );
};

export default CloudBlockUI;
