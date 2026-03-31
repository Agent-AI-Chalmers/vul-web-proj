import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Home, Search, User, Lock, PlusCircle, LogOut, Info } from 'lucide-react';

// --- Shared Components ---

const Navbar = ({ user, onLogout }) => (
  <nav className="bg-white shadow-md p-4 sticky top-0 z-10">
    <div className="max-w-6xl mx-auto flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
        <Home size={24} /> InsightBoard
      </Link>
      <div className="flex gap-6 items-center">
        <Link to="/search" className="text-gray-600 hover:text-blue-600 flex items-center gap-1">
          <Search size={20} /> Search
        </Link>
        {user ? (
          <>
            <Link to="/new" className="text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <PlusCircle size={20} /> Post
            </Link>
            <Link to={`/profile/${user.username}`} className="text-gray-600 hover:text-blue-600 flex items-center gap-1">
              <User size={20} /> {user.username}
            </Link>
            <button onClick={onLogout} className="text-gray-600 hover:text-red-600 flex items-center gap-1">
              <LogOut size={20} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            Login
          </Link>
        )}
      </div>
    </div>
  </nav>
);

// --- Pages ---

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    axios.get('/api/posts/search?q=').then(res => setPosts(res.data.results));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Public Notice Board</h1>
      <div className="grid gap-6">
        {posts.map(post => (
          <div key={post.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
            <h2 className="text-xl font-semibold text-blue-800 mb-2">{post.title}</h2>
            {/* [v03] STORED XSS: Rendering content using dangerouslySetInnerHTML */}
            <div 
              className="text-gray-600 prose" 
              dangerouslySetInnerHTML={{ __html: post.content }} 
            />
            <div className="mt-4 text-xs text-gray-400 flex justify-between items-center">
              <span>Post ID: {post.id}</span>
              <span>{new Date(post.created_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchedQuery, setSearchedQuery] = useState('');

  const handleSearch = () => {
    axios.get(`/api/posts/search?q=${query}`).then(res => {
      setResults(res.data.results);
      setSearchedQuery(res.data.query);
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={query} 
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for notes..."
          className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Search</button>
      </div>

      {searchedQuery && (
        <p className="mb-6 text-gray-600">
          {/* [v04] REFLECTED XSS: Displaying query content directly */}
          Showing results for: <span className="font-semibold text-blue-600" dangerouslySetInnerHTML={{ __html: searchedQuery }} />
        </p>
      )}

      <div className="grid gap-4">
        {results.map(post => (
          <Link to={`/notes/${post.id}`} key={post.id} className="block bg-white p-4 rounded-lg shadow-sm hover:bg-gray-50 transition border border-gray-100">
            <h3 className="font-semibold text-gray-800">{post.title}</h3>
            <p className="text-sm text-gray-500 truncate">{post.content.replace(/<[^>]*>?/gm, '')}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

const NotePage = () => {
  const [note, setNote] = useState(null);
  const { id } = useParams(); // Note: This needs to be imported or handled manually

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 bg-white mt-10 rounded-2xl shadow-xl">
      {/* Placeholder - In reality we'd fetch the note here */}
      <h2 className="text-2xl font-bold mb-4">Note Viewer</h2>
      <p className="text-gray-500">Checking for note details...</p>
    </div>
  );
};

// Simplified NoteView for brevity in this single file demo
const SimpleNoteView = () => {
  const [note, setNote] = useState(null);
  const pathParts = window.location.pathname.split('/');
  const noteId = pathParts[pathParts.length - 1];

  useEffect(() => {
    axios.get(`/api/posts/${noteId}`).then(res => setNote(res.data)).catch(() => {});
  }, [noteId]);

  if (!note) return <div className="p-10 text-center">Loading note...</div>;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 bg-white mt-10 rounded-2xl shadow-lg">
      <div className="flex items-center gap-2 text-blue-600 mb-4">
        <Lock size={16} /> <span>Private Note Details (Secure Access)</span>
      </div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">{note.title}</h1>
      <div className="prose text-gray-700 leading-relaxed min-h-[200px]" dangerouslySetInnerHTML={{ __html: note.content }} />
      <div className="mt-8 pt-6 border-t text-sm text-gray-400">
        Posted by User ID: {note.user_id}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
      navigate('/');
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login to InsightBoard</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input 
            type="text" 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="admin"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input 
            type="password" 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-blue-200">
          Sign In
        </button>
      </form>
    </div>
  );
};

const ProfilePage = () => {
    const [profile, setProfile] = useState(null);
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[pathParts.length - 1];

    useEffect(() => {
        axios.get(`/api/users/profile/${username}`).then(res => setProfile(res.data));
    }, [username]);

    if (!profile) return <div className="p-10 text-center">Loading profile...</div>;

    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex justify-between items-end -mt-12 mb-6">
                        <img 
                            src={`/api/avatar/${profile.avatar_path}`} 
                            alt="avatar" 
                            className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg bg-gray-100 object-cover"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
                    <p className="text-gray-500 mt-1">{profile.email}</p>
                    <div className="mt-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h3>
                        <p className="text-gray-700">{profile.bio}</p>
                    </div>
                    
                    <div className="mt-8 flex gap-4">
                        <div className="flex-1 bg-blue-50 p-4 rounded-2xl text-center">
                            <span className="block text-2xl font-bold text-blue-600">Post Header Debug</span>
                            <span className="text-xs text-blue-400">User Data Exposure Test Card</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CreatePostPage = ({ user }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const navigate = useNavigate();

    const handleCreate = async () => {
        const token = localStorage.getItem('token');
        await axios.post('/api/posts/create', { title, content, is_private: isPrivate ? 1 : 0 }, {
            headers: { Authorization: token }
        });
        navigate('/');
    };

    return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Note</h2>
            <div className="space-y-4">
                <input 
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Note Title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                />
                <textarea 
                    className="w-full p-3 border rounded-lg h-60 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Supports HTML formatting for rich notes..." 
                    value={content} 
                    onChange={e => setContent(e.target.value)}
                />
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition text-gray-700">
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-5 h-5 rounded" />
                    <span>Private Note (Only you can access this via direct link)</span>
                </label>
                <button 
                    onClick={handleCreate} 
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg"
                >
                    Publish Note
                </button>
            </div>
        </div>
    );
};

// --- App Root ---

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen">
        <Navbar user={user} onLogout={handleLogout} />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage onLogin={setUser} />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/new" element={<CreatePostPage user={user} />} />
            <Route path="/notes/:id" element={<SimpleNoteView />} />
          </Routes>
        </main>
        
        <footer className="mt-20 border-t bg-white py-12">
            <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-400 gap-4">
                <div className="flex items-center gap-2">
                    <Info size={18} /> <span>Built with React and FastAPI</span>
                </div>
                <div className="text-sm">
                    &copy; 2026 InsightBoard Systems. Legacy v1.4.2 (Stable)
                </div>
            </div>
        </footer>
      </div>
    </Router>
  );
}
