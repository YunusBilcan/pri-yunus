import React, { useState, useEffect, useRef } from 'react';
import { Peer } from 'peerjs';
import { Shield, Send, Link as LinkIcon, XCircle, Lock, User, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { generateRoomKey, encryptMessage, decryptMessage } from './utils/crypto';

function App() {
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [peerId, setPeerId] = useState(null);
  const [targetPeerId, setTargetPeerId] = useState(null);
  const [key, setKey] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isRevoked, setIsRevoked] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);

  // Initialize Peer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const remotePeerId = params.get('p');
    const hashKey = window.location.hash.slice(1);

    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setPeerId(id);
      if (remotePeerId && hashKey) {
        setTargetPeerId(remotePeerId);
        setKey(hashKey);
        // Connect to host
        const connection = newPeer.connect(remotePeerId);
        setupConnection(connection, hashKey);
      }
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      setError('Bağlantı hatası oluştu. Lütfen sayfayı yenileyin.');
    });

    newPeer.on('connection', (connection) => {
      // Host receives connection
      if (isRevoked) {
        connection.close();
        return;
      }
      setupConnection(connection, key);
    });

    setPeer(newPeer);

    return () => newPeer.destroy();
  }, [isRevoked, key]);

  const setupConnection = (c, encryptionKey) => {
    setConn(c);
    
    c.on('open', () => {
      setIsConnected(true);
    });

    c.on('data', async (data) => {
      if (data === 'REVOKE') {
        setIsRevoked(true);
        c.close();
        return;
      }
      
      const decrypted = await decryptMessage(data, encryptionKey);
      setMessages((prev) => [...prev, { text: decrypted, sender: 'other', timestamp: new Date() }]);
    });

    c.on('close', () => {
      setIsConnected(false);
    });
  };

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateRoom = async () => {
    const roomKey = await generateRoomKey();
    setKey(roomKey);
    // Update URL with our ID and Key
    const newUrl = `${window.location.origin}/?p=${peerId}#${roomKey}`;
    window.history.replaceState(null, '', newUrl);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !conn || isRevoked) return;

    const encrypted = await encryptMessage(input, key);
    conn.send(encrypted);
    
    setMessages((prev) => [...prev, { text: input, sender: 'me', timestamp: new Date() }]);
    setInput('');
  };

  const handleRevoke = () => {
    if (conn) {
      conn.send('REVOKE');
      conn.close();
    }
    setIsRevoked(true);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?p=${peerId}#${key}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (error) {
    return <div className="glass" style={{ padding: '2rem', textAlign: 'center' }}>{error}</div>;
  }

  if (!key) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: 'auto' }}>
        <div style={{ background: 'var(--primary-glow)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <Shield size={48} style={{ margin: 'auto' }} />
        </div>
        <h1>X-Private P2P Chat</h1>
        <p style={{ marginBottom: '2rem' }}>
          Şifreli ve Merkeziyetsiz Sohbet. Bir link oluşturun ve doğrudan eşinizle (P2P) konuşun.
        </p>
        <button onClick={handleCreateRoom} className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={!peerId}>
          {peerId ? <><Lock size={18} /> Güvenli Link Oluştur</> : 'Ağ Hazırlanıyor...'}
        </button>
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
          * Veritabanı yok. Sunucu yok. Mesajlar sadece tarayıcılar arası (P2P) iletilir. %100 Vercel uyumlu.
        </p>
      </div>
    );
  }

  return (
    <div className="glass chat-container">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield size={24} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '700' }}>Gizli P2P Oturumu</div>
            <div style={{ fontSize: '0.75rem', color: isConnected ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? 'Bağlantı Kuruldu' : 'Bağlantı Bekleniyor...'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={copyLink} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            {copySuccess ? <CheckCircle size={18} /> : <LinkIcon size={18} />}
            {copySuccess ? 'Kopyalandı' : 'Linki Paylaş'}
          </button>
          {!targetPeerId && (
            <button onClick={handleRevoke} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }} disabled={isRevoked}>
              <XCircle size={18} /> Oturumu Kapat
            </button>
          )}
        </div>
      </div>

      {isRevoked && (
        <div className="revoked-banner">
          <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Bu oturum kapatıldı.
        </div>
      )}

      <div className="chat-messages">
        <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>
          <Lock size={12} style={{ marginRight: '0.4rem' }} />
          Doğrudan Cihazdan Cihaza (WebRTC) Şifreli İletişim. Sunucu Devre Dışı.
        </div>
        
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
            {msg.text}
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.4rem', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {!isConnected && !isRevoked && targetPeerId && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Karşı tarafın bağlanması bekleniyor...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          placeholder={isRevoked ? "Oturum Kapalı" : isConnected ? "Şifreli mesaj yaz..." : "Bağlantı bekleniyor..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected || isRevoked}
        />
        <button type="submit" className="btn" disabled={!isConnected || isRevoked || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default App;
