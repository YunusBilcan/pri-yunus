/**
 * Crypto utilities for E2EE using Web Crypto API (AES-GCM)
 */

export const generateRoomKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

export const importRoomKey = async (base64Key) => {
  const rawKey = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (text, base64Key) => {
  const key = await importRoomKey(base64Key);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv))
  };
};

export const decryptMessage = async (encryptedData, base64Key) => {
  try {
    const key = await importRoomKey(base64Key);
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
    const content = Uint8Array.from(atob(encryptedData.content), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      content
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return '[Decryption Error: Invalid Key or Corrupted Message]';
  }
};
