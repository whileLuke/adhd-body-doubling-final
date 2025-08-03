import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || window.location.origin;

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [garden, setGarden] = useState([]);
  const [friendGardens, setFriendGardens] = useState({});
  const [friends, setFriends] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [pendingTaskSize, setPendingTaskSize] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [chatMode, setChatMode] = useState('assistant');
  const [gardenerPosition, setGardenerPosition] = useState({ x: 20, y: 70 });
  const [gardenerAction, setGardenerAction] = useState('idle');
  const [notification, setNotification] = useState('');
  const [debugInfo, setDebugInfo] = useState(''); // Added for debugging
  
  const lastCheckInRef = useRef(Date.now());
  const gardenerTimerRef = useRef(null);

  // Add debug info on component mount
  useEffect(() => {
    const info = `
Debug Info:
- API_BASE_URL: ${API_BASE_URL}
- Current URL: ${window.location.origin}
- Environment: ${process.env.NODE_ENV || 'development'}
- React App API URL: ${process.env.REACT_APP_API_URL || 'not set'}
    `;
    setDebugInfo(info);
    console.log(info);
  }, []);

  // Test API connection
  const testConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      console.log('Health check:', data);
      alert(`API Connection: ${response.ok ? 'SUCCESS' : 'FAILED'}\nStatus: ${response.status}\nData: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert(`API Connection FAILED: ${error.message}`);
    }
  };

  // Status colors and labels
  const statusConfig = {
    todo: { color: 'border-red-300 bg-red-50', label: 'To Do', bgColor: 'bg-red-100' },
    inProgress: { color: 'border-yellow-300 bg-yellow-50', label: 'In Progress', bgColor: 'bg-yellow-100' },
    completed: { color: 'border-green-300 bg-green-50', label: 'Completed', bgColor: 'bg-green-100' }
  };

  // Show notification helper
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Enhanced login with detailed debugging
  const handleLogin = async () => {
    if (!username.trim()) return;
    
    setIsLoading(true);
    const url = `${API_BASE_URL}/api/users/register`;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username.trim());
    console.log('API URL:', url);
    console.log('API_BASE_URL:', API_BASE_URL);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: username.trim() })
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('taskGardenUserId', data.userId);
        localStorage.setItem('taskGardenUser', JSON.stringify(data.user));
        setIsLoggedIn(true);
        loadGarden(data.userId);
        loadChatHistory(data.userId);
        loadUserProfile(data.userId);
        console.log('Login successful!');
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      
      // Show user-friendly error
      const errorMsg = `Login failed: ${error.message}`;
      showNotification(errorMsg);
      alert(errorMsg); // Also show alert for immediate feedback
    } finally {
      setIsLoading(false);
    }
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('taskGardenUserId');
    const savedUser = localStorage.getItem('taskGardenUser');
    
    if (savedUserId && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsLoggedIn(true);
        loadGarden(savedUserId);
        loadChatHistory(savedUserId);
        loadUserProfile(savedUserId);
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('taskGardenUserId');
        localStorage.removeItem('taskGardenUser');
      }
    }
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadGarden = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/garden/${userId}`);
      const data = await response.json();
      setGarden(data.garden);
    } catch (error) {
      console.error('Error loading garden:', error);
    }
  };

  const loadChatHistory = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-history/${userId}`);
      const data = await response.json();
      setChatMessages(data.history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Login screen with debug info
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Task Garden</h1>
          <p className="text-gray-600 mb-6 text-center">
            Create your account to start growing your productivity garden!
          </p>
          
          {/* Debug Panel */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-xs">
            <details>
              <summary className="cursor-pointer font-medium">Debug Info (Click to expand)</summary>
              <pre className="mt-2 whitespace-pre-wrap">{debugInfo}</pre>
            </details>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              disabled={isLoading}
            />
            
            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                disabled={!username.trim() || isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Connecting...' : 'Start Gardening'}
              </button>
              
              <button
                onClick={testConnection}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Test API
              </button>
            </div>
          </div>
          
          {/* Show notification */}
          {notification && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-lg text-sm">
              {notification}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {currentUser?.username}!
              </h1>
              <p className="text-gray-600">
                Manage your tasks and watch your productivity grow
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  localStorage.removeItem('taskGardenUserId');
                  localStorage.removeItem('taskGardenUser');
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Login Successful!</h2>
          <p className="text-gray-600">The app is working! You can now implement the rest of the features.</p>
        </div>
      </div>
    </div>
  );
}

export default App;