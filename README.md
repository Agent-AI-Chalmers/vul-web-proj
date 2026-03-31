# InsightBoard - Community Notice Board & Note-Taking Platform

InsightBoard is a modern, full-stack web application designed for community engagement and personal information management. It provides a secure, intuitive interface for users to share public announcements and maintain private digital notes.

## 🚀 Features

- **Community Wall**: A public space for all users to view and share announcements and notices.
- **Private Note-Taking**: Create personal notes that are only accessible by you via direct links or your profile.
- **Advanced Search**: Real-time search engine to quickly filter through thousands of notes by title or content keywords.
- **User Profiles**: Manage your digital identity with custom bios and profile pictures.
- **Rich Text Support**: Supports formatting for notes, allowing for clear and expressive communication.
- **Session Management**: Secure login and session persistence for a seamless user experience.

## 🛠️ Technology Stack

- **Backend**: Python (FastAPI), SQLite
- **Frontend**: React (TypeScript), Vite, Tailwind CSS

## 📦 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Quick Start (One-Click)

Launch both services simultaneously using the provided startup script:

```bash
chmod +x start.sh
./start.sh
```

Once started, access the platform at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

### Manual Setup (Optional)

1. **Backend Setup**
   ```bash
   cd backend
   pip install fastapi uvicorn
   python3 main.py
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📝 Usage

- **Registration**: Visit the site and log in with your credentials (default `admin` / `admin123`).
- **Creating Notes**: Use the "Post" button to create a new announcement. Toggle "Private" if you want to keep the note out of the public wall.
- **Searching**: Use the Search tab to find specific topics across the platform.

## 🛡️ Design Philosophy

InsightBoard is built with a focus on simplicity and accessibility. Our goal is to provide a "no-frills" experience for community boards, ensuring that information is always easy to find and share.

---
© 2026 InsightBoard Systems. All rights reserved.
