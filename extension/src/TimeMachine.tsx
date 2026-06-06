import React from 'react';

interface TimeMachineProps {
  onClose: () => void;
}

export const TimeMachine: React.FC<TimeMachineProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      right: '16px',
      background: 'rgba(255, 255, 255, 0.90)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      border: '1px solid rgba(255,255,255,0.6)',
      borderRadius: '24px',
      padding: '20px',
      width: '300px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
      fontFamily: 'system-ui, sans-serif',
      pointerEvents: 'auto',
      animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Zaman Makinesi</h3>
        <button 
          onClick={onClose}
          style={{ 
            background: '#f1f5f9', border: 'none', borderRadius: '50%', 
            width: '28px', height: '28px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold'
          }}>✕</button>
      </div>
      
      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
        Projenizin son 50 büyük değişikliği bulutta güvendedir. Hata yaparsanız tek tıkla geçmişe dönebilirsiniz.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { time: 'Şimdi', desc: 'Mevcut Durum', active: true },
          { time: '2 dk önce', desc: 'Karakter silindi', active: false },
          { time: '15 dk önce', desc: 'Hareket bloğu eklendi', active: false }
        ].map((item, i) => (
          <div key={i} style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
            background: item.active ? 'rgba(99, 102, 241, 0.1)' : 'rgba(241, 245, 249, 0.5)',
            border: item.active ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <div style={{ 
              width: '10px', height: '10px', borderRadius: '50%', 
              background: item.active ? '#6366f1' : '#cbd5e1' 
            }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: item.active ? 700 : 500, color: '#1e293b' }}>{item.time}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</div>
            </div>
            {!item.active && (
              <button style={{ 
                background: '#e2e8f0', border: 'none', padding: '6px 12px', 
                borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer'
              }}>Dön</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
