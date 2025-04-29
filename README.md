# 🔗 Chrome Extension: Group-Based URL Sharing

A lightweight Chrome extension that allows users to create or join groups and share the current browser tab URL with others in real-time or asynchronously.

## 🚀 Features

- 🔐 Create and join groups using a group name or code
- 🌐 Share your current tab URL with group members
- 📥 View all URLs shared within your group
- ⚡ Real-time updates using WebSocket (optional)
- 🗃️ Persistent storage using MongoDB Atlas

---

## 🧩 How It Works

1. **Join or create a group** directly inside the extension popup.
2. **Once in a group**, you can instantly share your current tab URL.
3. Shared URLs will appear under the **Shared Content** tab for all group members.
4. When WebSockets are enabled, new URLs appear in real-time — no refresh needed.

---

## 🛠️ Tech Stack

### Frontend (Chrome Extension)
- HTML, CSS, JavaScript
- `popup.js` for all core logic
- Chrome Storage API (for temporary group state)

### Backend (API + Realtime)
- Express.js for REST API
- MongoDB Atlas for storing users, groups, and shared content
- Socket.IO for WebSocket-based real-time updates

---

## 📦 Folder Structure
