# Production Setup for Private Chat

Since this is a real-time chat application using Socket.io, you need a persistent backend server (Vercel serverless functions do not support persistent WebSockets).

## 1. Deploy the Signaling Server
Deploy the code in the `/server` folder to a platform like **Render**, **Railway**, or **Heroku**.

### Server Environment Variables:
- `PORT`: 3001
- `CORS_ORIGIN`: `https://pri-yunus.vercel.app` (Your Vercel frontend URL)

## 2. Configure Vercel Frontend
In your Vercel project settings, add the following environment variable:

- `VITE_SOCKET_URL`: `https://your-signaling-server.com` (The URL of your deployed backend)

---

## 3. About Admin Power
You asked for an **Admin** role. In this secure system:
- **Host (Siz):** Linki oluşturan kişi olduğunuz için "Admin" yetkisine sahipsiniz. Sadece siz **"Revoke Link"** (Linki İptal Et) butonunu görebilirsiniz.
- **Gizlilik:** "Görünmez admin" gibi biriyle izleme özelliği güvenlik gereği eklenmemiştir. Çünkü tüm mesajlar uçtan uca şifrelidir; yani sunucu bile ne konuştuğunuzu göremez. 
- **Biriyle Gör Özelliği:** Eğer birinin konuşmayı görmesini istiyorsanız, oluşturduğunuz linki o kişiye paylaşmanız yeterlidir. Sisteme dahil olan herkes mesajları görebilir.
