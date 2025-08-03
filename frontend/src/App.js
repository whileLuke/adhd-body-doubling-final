import React, { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'https://adhd-body-doubling-final-production.up.railway.app/';  // process.env.REACT_APP_API_URL || window.location.origin;

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
  
  const lastCheckInRef = useRef(Date.now());
  const gardenerTimerRef = useRef(null);

  // Status colors and labels
  const statusConfig = {
    todo: { color: 'border-red-300 bg-red-50', label: 'To Do', bgColor: 'bg-red-100' },
    inProgress: { color: 'border-yellow-300 bg-yellow-50', label: 'In Progress', bgColor: 'bg-yellow-100' },
    completed: { color: 'border-green-300 bg-green-50', label: 'Completed', bgColor: 'bg-green-100' }
  };

  // Gardener actions and emojis
  const gardenerEmojis = {
    idle: '🧑‍🌾',
    watering: '🧑‍🌾💧',
    planting: '🧑‍🌾🌱',
    harvesting: '🧑‍🌾🎁',
    thinking: '🧑‍🌾💭'
  };

  // Gardener movement and actions
  useEffect(() => {
    if (!isLoggedIn) return;

    gardenerTimerRef.current = setInterval(() => {
      // Move gardener around the garden
      setGardenerPosition(prev => ({
        x: Math.max(5, Math.min(95, prev.x + (Math.random() - 0.5) * 4)),
        y: Math.max(60, Math.min(90, prev.y + (Math.random() - 0.5) * 2))
      }));

      // Change action occasionally
      if (Math.random() < 0.3) {
        const actions = ['idle', 'watering', 'thinking'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        setGardenerAction(randomAction);
        
        setTimeout(() => setGardenerAction('idle'), 2000);
      }
    }, 4000);

    return () => {
      if (gardenerTimerRef.current) clearInterval(gardenerTimerRef.current);
    };
  }, [isLoggedIn]);

  // Show notification helper
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Initialize user
  const handleLogin = async () => {
    if (!username.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('taskGardenUserId', data.userId);
        localStorage.setItem('taskGardenUser', JSON.stringify(data.user));
        setIsLoggedIn(true);
        loadGarden(data.userId);
        loadChatHistory(data.userId);
        loadUserProfile(data.userId);
      }
    } catch (error) {
      console.error('Error logging in:', error);
      showNotification('Error logging in. Please try again.');
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

  const loadFriendGarden = async (friendId) => {
    try {
      const userId = localStorage.getItem('taskGardenUserId');
      const response = await fetch(`${API_BASE_URL}/api/garden/${userId}/friend/${friendId}`);
      const data = await response.json();
      
      setFriendGardens(prev => ({
        ...prev,
        [friendId]: data
      }));
    } catch (error) {
      console.error('Error loading friend garden:', error);
    }
  };

  const addFriend = async () => {
    if (!friendUsername.trim()) return;
    
    try {
      const userId = localStorage.getItem('taskGardenUserId');
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/friends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendUsername: friendUsername.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends);
        setFriendUsername('');
        setShowFriendModal(false);
        showNotification(`Added ${data.friend.username} as friend!`);
      } else {
        showNotification(data.error || 'Error adding friend');
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      showNotification('Error adding friend. Please try again.');
    }
  };

  const plantTask = async (taskSize, taskDescription = '', status = 'todo') => {
    try {
      const userId = localStorage.getItem('taskGardenUserId');
      const response = await fetch(`${API_BASE_URL}/api/garden/${userId}/plant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskSize, description: taskDescription, status })
      });
      
      const data = await response.json();
      setGarden(data.garden);
      
      setGardenerAction('planting');
      setTimeout(() => setGardenerAction('idle'), 2000);
      
      showNotification(`Added "${taskDescription || `${taskSize} task`}" to your garden!`);
    } catch (error) {
      console.error('Error planting task:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const userId = localStorage.getItem('taskGardenUserId');
      const response = await fetch(`${API_BASE_URL}/api/garden/${userId}/task/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      setGarden(data.garden);
      
      if (newStatus === 'completed') {
        setGardenerAction('harvesting');
        setTimeout(() => setGardenerAction('idle'), 2000);
      } else if (newStatus === 'inProgress') {
        setGardenerAction('watering');
        setTimeout(() => setGardenerAction('idle'), 2000);
      }
      
      const task = data.garden.find(t => t.id == taskId);
      if (task) {
        showNotification(`"${task.description}" is now ${statusConfig[newStatus].label}!`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const sendMessageToAI = async (message) => {
    setIsLoading(true);
    lastCheckInRef.current = Date.now();
    
    try {
      const userId = localStorage.getItem('taskGardenUserId');
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          userId,
          username: currentUser?.username,
          isGardener: chatMode === 'harold'
        })
      });

      const data = await response.json();
      
      setChatMessages(prev => [...prev, 
        { role: 'user', content: message },
        { role: chatMode === 'harold' ? 'harold' : 'assistant', content: data.response || data.message }
      ]);
      
      if (data.plantAdded && data.garden) {
        setGarden(data.garden);
        setGardenerAction('planting');
        setTimeout(() => setGardenerAction('idle'), 2000);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages(prev => [...prev,
        { role: 'user', content: message },
        { role: chatMode === 'harold' ? 'harold' : 'assistant', content: "I'm having trouble right now. Try again in a moment." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      sendMessageToAI(inputMessage);
      setInputMessage('');
    }
  };

  const handleTaskButtonClick = (taskSize) => {
    setPendingTaskSize(taskSize);
    setShowTaskModal(true);
  };

  const handleModalSubmit = () => {
    if (taskDescription.trim()) {
      plantTask(pendingTaskSize, taskDescription.trim());
    }
    setShowTaskModal(false);
    setTaskDescription('');
    setPendingTaskSize('');
  };

  const getTasksByStatus = (status) => {
    return garden.filter(task => task.status === status);
  };

  const logout = () => {
    localStorage.removeItem('taskGardenUserId');
    localStorage.removeItem('taskGardenUser');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setGarden([]);
    setChatMessages([]);
    setFriends([]);
    setFriendGardens({});
  };

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Task Garden</h1>
          <p className="text-gray-600 mb-6 text-center">
            Create your account to start growing your productivity garden!
          </p>
          <div className="space-y-4">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={handleLogin}
              disabled={!username.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Start Gardening
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
                onClick={() => setShowFriendModal(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                👥 Add Friend
              </button>
              <button
                onClick={toggleChatMode}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chatMode === 'harold' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🧑‍🌾 Harold
              </button>
              <button
                onClick={toggleChatMode}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  chatMode === 'assistant' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🤖 Assistant
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
            {notification}
          </div>
        )}

        {/* Friend Modal */}
        {showFriendModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Friend</h3>
              <input
                type="text"
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                placeholder="Enter friend's username"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && addFriend()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowFriendModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addFriend}
                  disabled={!friendUsername.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Add Friend
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add {pendingTaskSize} Task</h3>
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="What task would you like to add?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleModalSubmit()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  disabled={!taskDescription.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Garden */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-xl shadow-lg p-6 relative overflow-hidden">
              {/* Task Planting Section */}
              <div className="mb-6">
                <h2 className="text-white text-xl font-semibold mb-4">Plant New Task</h2>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleTaskButtonClick('small')}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-4 rounded-lg flex flex-col items-center transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="text-2xl mb-2">🌱</span>
                    <span className="font-medium">Small Task</span>
                    <span className="text-sm opacity-75">Quick & Simple</span>
                  </button>
                  <button
                    onClick={() => handleTaskButtonClick('medium')}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-4 rounded-lg flex flex-col items-center transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="text-2xl mb-2">🌿</span>
                    <span className="font-medium">Medium Task</span>
                    <span className="text-sm opacity-75">Moderate Effort</span>
                  </button>
                  <button
                    onClick={() => handleTaskButtonClick('big')}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-4 rounded-lg flex flex-col items-center transition-all duration-200 transform hover:scale-105"
                  >
                    <span className="text-2xl mb-2">🌳</span>
                    <span className="font-medium">Big Task</span>
                    <span className="text-sm opacity-75">Major Project</span>
                  </button>
                </div>
              </div>

              {/* Garden Sections */}
              <div className="space-y-4">
                {/* To Do Section */}
                <div className="bg-red-100 bg-opacity-80 rounded-lg p-4">
                  <h3 className="text-red-800 font-semibold mb-3 flex items-center">
                    📝 To Do ({getTasksByStatus('todo').length})
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {getTasksByStatus('todo').map((task) => (
                      <TaskItem key={task.id} task={task} onStatusChange={updateTaskStatus} />
                    ))}
                    {getTasksByStatus('todo').length === 0 && (
                      <div className="col-span-full text-red-600 text-center py-4 opacity-75">
                        No pending tasks
                      </div>
                    )}
                  </div>
                </div>

                {/* In Progress Section */}
                <div className="bg-yellow-100 bg-opacity-80 rounded-lg p-4">
                  <h3 className="text-yellow-800 font-semibold mb-3 flex items-center">
                    🔄 In Progress ({getTasksByStatus('inProgress').length})
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {getTasksByStatus('inProgress').map((task) => (
                      <TaskItem key={task.id} task={task} onStatusChange={updateTaskStatus} />
                    ))}
                    {getTasksByStatus('inProgress').length === 0 && (
                      <div className="col-span-full text-yellow-600 text-center py-4 opacity-75">
                        No tasks in progress
                      </div>
                    )}
                  </div>
                </div>

                {/* Completed Section */}
                <div className="bg-green-100 bg-opacity-80 rounded-lg p-4">
                  <h3 className="text-green-800 font-semibold mb-3 flex items-center">
                    ✅ Completed ({getTasksByStatus('completed').length})
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {getTasksByStatus('completed').map((task) => (
                      <TaskItem key={task.id} task={task} onStatusChange={updateTaskStatus} />
                    ))}
                    {getTasksByStatus('completed').length === 0 && (
                      <div className="col-span-full text-green-600 text-center py-4 opacity-75">
                        No completed tasks yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Harold the Gardener */}
              <div 
                className="absolute transition-all duration-1000 ease-in-out z-10"
                style={{ 
                  left: `${gardenerPosition.x}%`, 
                  top: `${gardenerPosition.y}%`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              >
                <div className="text-3xl">
                  {gardenerEmojis[gardenerAction]}
                </div>
                {chatMode === 'harold' && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      Harold
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Friends Gardens */}
            {friends.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Friends' Gardens</h3>
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{friend.username}</span>
                        <button
                          onClick={() => {
                            setSelectedFriend(friend);
                            loadFriendGarden(friend.id);
                          }}
                          className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          View Garden
                        </button>
                      </div>
                      {friendGardens[friend.id] && (
                        <div className="text-sm text-gray-600">
                          🌱 {friendGardens[friend.id].garden?.length || 0} plants
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Interface */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-lg font-semibold mb-4">
                Chat with {chatMode === 'harold' ? 'Harold' : 'Assistant'}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto border mb-4">
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm">
                    {chatMode === 'harold' 
                      ? "Hello! I'm Harold, your task assistant. How can I help you today?" 
                      : "I'm here to help with your tasks and productivity. What are you working on?"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.slice(-4).map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : msg.role === 'harold'
                              ? 'bg-green-100 text-gray-800'
                              : 'bg-gray-200 text-gray-800'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={chatMode === 'harold' 
                    ? "Ask Harold for help..." 
                    : "Describe a task or ask for help..."}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    chatMode === 'harold'
                      ? 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white'
                  }`}
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Friend's Garden Modal */}
        {selectedFriend && friendGardens[selectedFriend.id] && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{selectedFriend.username}'s Garden</h3>
                <button
                  onClick={() => setSelectedFriend(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Friend's garden sections */}
                {['todo', 'inProgress', 'completed'].map((status) => {
                  const tasks = friendGardens[selectedFriend.id].garden?.filter(t => t.status === status) || [];
                  return (
                    <div key={status} className={`${statusConfig[status].bgColor} rounded-lg p-4`}>
                      <h4 className="font-semibold mb-3 capitalize">
                        {statusConfig[status].label} ({tasks.length})
                      </h4>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-3">
                        {tasks.map((task) => (
                          <div key={task.id} className="text-center">
                            <div className="text-2xl mb-1">{task.icon}</div>
                            <div className="text-xs truncate max-w-16">{task.description}</div>
                          </div>
                        ))}
                        {tasks.length === 0 && (
                          <div className="col-span-full text-center py-4 text-gray-500">
                            No {status} tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function toggleChatMode() {
    setChatMode(prev => prev === 'assistant' ? 'harold' : 'assistant');
  }
}

// Task Item Component
function TaskItem({ task, onStatusChange }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const statusConfig = {
    todo: { color: 'border-red-300 bg-red-50' },
    inProgress: { color: 'border-yellow-300 bg-yellow-50' },
    completed: { color: 'border-green-300 bg-green-50' }
  };

  const handleClick = () => {
    const statuses = ['todo', 'inProgress', 'completed'];
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onStatusChange(task.id, nextStatus);
  };

  return (
    <div
      className="relative cursor-pointer transform transition-all duration-200 hover:scale-110 flex flex-col items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      <div className={`p-2 rounded-lg border-2 ${statusConfig[task.status].color} mb-1`}>
        <div className="text-xl">{task.icon}</div>
      </div>
      <div className="text-xs text-center max-w-16 truncate text-gray-700">
        {task.description}
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-30">
          <div className="bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-nowrap max-w-48 text-center">
            <div className="font-medium">{task.type.charAt(0).toUpperCase() + task.type.slice(1)} Task</div>
            <div className="opacity-75">{task.description}</div>
            <div className="text-gray-400 mt-1">Click to change status</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;