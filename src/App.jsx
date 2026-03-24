import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { nanoid } from 'nanoid';
import { Shield, Send, Link as LinkIcon, XCircle, Lock, User, CheckCircle } from 'lucide-react';
import { generateRoomKey, encryptMessage, decryptMessage } from './utils/crypto';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

function App() {
  const [room, setRoom] = useState(null);
  const [key, setKey] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [isRevoked, setIsRevoked] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Initialize from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const hashKey = window.location.hash.slice(1);

    if (roomId && hashKey) {
      setRoom(roomId);
      setKey(hashKey);
      setIsHost(false);
    }
  }, []);

  // Socket Connection
  useEffect(() => {
    if (room && key) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.emit('join-room', room);

      newSocket.on('receive-message', async (encryptedData) => {
        const decrypted = await decryptMessage(encryptedData, key);
        setMessages((prev) => [...prev, { text: decrypted, sender: 'other', timestamp: new Date() }]);
      });

      newSocket.on('room-revoked', () => {
        setIsRevoked(true);
      });

      newSocket.on('error', (msg) => {
        alert(msg);
        window.location.href = '/';
      });

      return () => newSocket.close();
    }
  }, [room, key]);

  // Auto Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateRoom = async () => {
    const roomId = nanoid(10);
    const roomKey = await generateRoomKey();
    
    setRoom(roomId);
    setKey(roomKey);
    setIsHost(true);

    // Update URL without refresh
    const newUrl = `${window.location.origin}/?room=${roomId}#${roomKey}`;
    window.history.replaceState(null, '', newUrl);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || isRevoked) return;

    const encrypted = await encryptMessage(input, key);
    socket.emit('send-message', { roomId: room, message: encrypted });
    
    setMessages((prev) => [...prev, { text: input, sender: 'me', timestamp: new Date() }]);
    setInput('');
  };

  const handleRevoke = () => {
    if (socket && isHost) {
      socket.emit('revoke-room', room);
      setIsRevoked(true);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/?room=${room}#${key}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (!room) {
    return (
      <div className="glass" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: 'auto' }}>
        <div style={{ background: 'var(--primary-glow)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <Shield size={48} style={{ margin: 'auto' }} />
        </div>
        <h1>X-Private Chat</h1>
        <p style={{ marginBottom: '2rem' }}>
          Secure, encrypted, and disposable communication. Create a private link and share it with someone.
        </p>
        <button onClick={handleCreateRoom} className="btn" style={{ width: '100%', justifyContent: 'center', filter: 'none' }}>
          <Lock size={18} /> Generate Secure Link
        </button>
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
          * Sistemde veritabanı bulunmamaktadır. Şifreleme anahtarı `#` (hash) kısmında saklanır ve asla sunucuya gitmez.
          Oturum kapandığında veya 1 saat sonunda tüm veriler (bellekten bile) silinir.
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
            <div style={{ fontSize: '1rem', fontWeight: '700' }}>Private Session</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isHost ? 'Host Mode (Revocable)' : 'Guest Mode'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={copyLink} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            {copySuccess ? <CheckCircle size={18} /> : <LinkIcon size={18} />}
            {copySuccess ? 'Copied' : 'Share Link'}
          </button>
          {isHost && (
            <button onClick={handleRevoke} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }} disabled={isRevoked}>
              <XCircle size={18} /> Revoke Link
            </button>
          )}
        </div>
      </div>

      {isRevoked && (
        <div className="revoked-banner">
          <XCircle size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          This chat session has been revoked. No further messages can be sent.
        </div>
      )}

      <div className="chat-messages">
        <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.5, fontSize: '0.8rem' }}>
          <Lock size={12} style={{ marginRight: '0.4rem' }} />
          End-to-End Encrypted. Only you and the recipient can read these messages.
        </div>
        
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
            {msg.text}
            <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.4rem', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          placeholder={isRevoked ? "Session Revoked" : "Type a secure message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isRevoked}
        />
        <button type="submit" className="btn" disabled={isRevoked || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default App;
