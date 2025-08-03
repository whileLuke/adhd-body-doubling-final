// server.js - Enhanced for deployment and multi-user support
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Allow your frontend domain
  credentials: true
}));
app.use(express.json());

// REMOVE THE STATIC FILE SERVING FOR SEPARATE SERVICES
// DON'T serve static files when using separate frontend/backend
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, 'build')));
// }

// Enhanced data structure for multi-user support
let userData = {
  users: {},
  gardens: {},
  chatHistory: {},
  friendships: {} // userId -> [friendIds]
};

// Plant icons organized by status and size
const plantIcons = {
  small: {
    todo: ['🌰', '🌱', '🔸'],
    inProgress: ['🌿', '☘️', '🟡'],
    completed: ['🍀', '🌾', '✅']
  },
  medium: {
    todo: ['🌸', '🌼', '🌻'],
    inProgress: ['🌹', '🌺', '🌷'],
    completed: ['💐', '🌽', '🍅', '🥕', '🥬']
  },
  big: {
    todo: ['🌳', '🌲', '🏔️'],
    inProgress: ['🌴', '🌵', '🔥'],
    completed: ['🎄', '🍎', '🍊', '🏆', '⭐']
  }
};

const getRandomPlantIcon = (type, status = 'todo') => {
  const icons = plantIcons[type][status];
  return icons[Math.floor(Math.random() * icons.length)];
};

// Determine task size based on description
const determineTaskSize = (description) => {
  const lowerDesc = description.toLowerCase();
  
  const smallKeywords = ['quick', 'small', 'easy', 'simple', 'brief', 'short', 'minor', 'check', 'email', 'call'];
  const bigKeywords = ['big', 'large', 'major', 'complex', 'difficult', 'project', 'long', 'extensive', 'presentation', 'report'];
  
  const timeIndicators = {
    small: ['minute', 'minutes', '5 min', '10 min', '15 min'],
    medium: ['hour', 'hours', '1 hour', '2 hours', 'afternoon', 'morning'],
    big: ['day', 'days', 'week', 'weeks', 'month']
  };
  
  let smallScore = 0;
  let bigScore = 0;
  
  smallKeywords.forEach(keyword => {
    if (lowerDesc.includes(keyword)) smallScore++;
  });
  
  bigKeywords.forEach(keyword => {
    if (lowerDesc.includes(keyword)) bigScore++;
  });
  
  Object.entries(timeIndicators).forEach(([size, indicators]) => {
    indicators.forEach(indicator => {
      if (lowerDesc.includes(indicator)) {
        if (size === 'small') smallScore += 2;
        else if (size === 'big') bigScore += 2;
      }
    });
  });
  
  if (smallScore > bigScore) return 'small';
  if (bigScore > smallScore) return 'big';
  return 'medium';
};

// Initialize user profile
const initializeUser = (userId, username) => {
  if (!userData.users[userId]) {
    userData.users[userId] = {
      id: userId,
      username: username || `User${userId.slice(-4)}`,
      createdAt: new Date(),
      lastActive: new Date()
    };
  }
  if (!userData.gardens[userId]) {
    userData.gardens[userId] = [];
  }
  if (!userData.chatHistory[userId]) {
    userData.chatHistory[userId] = [];
  }
  if (!userData.friendships[userId]) {
    userData.friendships[userId] = [];
  }
};

// Auto-plant task function
const autoPlantTask = (userId, taskDescription, taskSize, status = 'todo') => {
  if (!userData.gardens[userId]) {
    userData.gardens[userId] = [];
  }
  
  const newPlant = {
    id: Date.now() + Math.random(),
    type: taskSize,
    description: taskDescription,
    icon: getRandomPlantIcon(taskSize, status),
    status: status,
    timestamp: new Date(),
    planted: true,
    userId: userId
  };
  
  userData.gardens[userId].push(newPlant);
  return newPlant;
};

// Update task status
const updateTaskStatus = (userId, taskId, newStatus) => {
  if (!userData.gardens[userId]) return null;
  
  const taskIndex = userData.gardens[userId].findIndex(task => task.id == taskId);
  if (taskIndex === -1) return null;
  
  const task = userData.gardens[userId][taskIndex];
  task.status = newStatus;
  task.icon = getRandomPlantIcon(task.type, newStatus);
  task.updatedAt = new Date();
  
  return task;
};

// User registration/login endpoint
app.post('/api/users/register', (req, res) => {
  const { username } = req.body;
  const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  
  initializeUser(userId, username);
  
  res.json({
    success: true,
    user: userData.users[userId],
    userId: userId
  });
});

// Get user profile
app.get('/api/users/:userId', (req, res) => {
  const { userId } = req.params;
  
  if (!userData.users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  userData.users[userId].lastActive = new Date();
  
  res.json({
    user: userData.users[userId],
    friends: userData.friendships[userId].map(friendId => userData.users[friendId]).filter(Boolean)
  });
});

// Add friend endpoint
app.post('/api/users/:userId/friends', (req, res) => {
  const { userId } = req.params;
  const { friendUsername } = req.body;
  
  // Find friend by username
  const friendUser = Object.values(userData.users).find(user => user.username === friendUsername);
  
  if (!friendUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (friendUser.id === userId) {
    return res.status(400).json({ error: 'Cannot add yourself as friend' });
  }
  
  // Add friendship both ways
  if (!userData.friendships[userId].includes(friendUser.id)) {
    userData.friendships[userId].push(friendUser.id);
  }
  if (!userData.friendships[friendUser.id].includes(userId)) {
    userData.friendships[friendUser.id].push(userId);
  }
  
  res.json({ 
    success: true, 
    friend: friendUser,
    friends: userData.friendships[userId].map(id => userData.users[id]).filter(Boolean)
  });
});

// Get friend's garden
app.get('/api/garden/:userId/friend/:friendId', (req, res) => {
  const { userId, friendId } = req.params;
  
  // Check if they are friends
  if (!userData.friendships[userId] || !userData.friendships[userId].includes(friendId)) {
    return res.status(403).json({ error: 'Not friends with this user' });
  }
  
  const friendGarden = userData.gardens[friendId] || [];
  const friendUser = userData.users[friendId];
  
  res.json({ 
    garden: friendGarden,
    user: friendUser
  });
});

// Enhanced Gemini API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, username, isGardener = false } = req.body;
    
    // Initialize user if needed
    initializeUser(userId, username);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const userHistory = userData.chatHistory[userId] || [];
    const recentHistory = userHistory.slice(-6);
    
    let conversationContext = "";
    if (recentHistory.length > 0) {
      conversationContext = "\n\nRecent conversation:\n" + 
        recentHistory.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    }
    
    // Enhanced task detection patterns
    const taskPatterns = [
      /(?:i need to|i should|i have to|i want to|i'll|i will|let me|gonna|going to)\s+(.+)/i,
      /(?:add task|new task|create task):\s*(.+)/i,
      /(?:task|todo):\s*(.+)/i,
      /(?:can you add|please add|add)\s+(.+?)(?:\s+(?:to|as)\s+(?:task|todo))?$/i
    ];
    
    const completedPatterns = [
      /(?:i just|i finished|i completed|i did|just finished|just completed|just did|finished|completed|done with)\s+(.+)/i,
      /(?:i'm done with|all done with)\s+(.+)/i
    ];
    
    const inProgressPatterns = [
      /(?:i'm working on|working on|started|i started|currently doing|in the middle of)\s+(.+)/i
    ];
    
    let shouldAddTask = false;
    let plantedTask = null;
    
    // Check for task patterns
    for (const pattern of taskPatterns) {
      const match = message.match(pattern);
      if (match) {
        const taskDescription = match[1].trim()
          .replace(/\s*please\s*$/i, '')
          .replace(/^(a|an|the)\s+/i, '')
          .trim();
        
        if (taskDescription && taskDescription.length > 2) {
          const suggestedTaskSize = determineTaskSize(taskDescription);
          plantedTask = autoPlantTask(userId, taskDescription, suggestedTaskSize, 'todo');
          shouldAddTask = true;
          break;
        }
      }
    }
    
    // Check for completed tasks
    if (!shouldAddTask) {
      for (const pattern of completedPatterns) {
        const match = message.match(pattern);
        if (match) {
          const taskDescription = match[1].trim();
          const suggestedTaskSize = determineTaskSize(taskDescription);
          plantedTask = autoPlantTask(userId, taskDescription, suggestedTaskSize, 'completed');
          shouldAddTask = true;
          break;
        }
      }
    }
    
    // Check for in-progress tasks
    if (!shouldAddTask) {
      for (const pattern of inProgressPatterns) {
        const match = message.match(pattern);
        if (match) {
          const taskDescription = match[1].trim();
          const suggestedTaskSize = determineTaskSize(taskDescription);
          plantedTask = autoPlantTask(userId, taskDescription, suggestedTaskSize, 'inProgress');
          shouldAddTask = true;
          break;
        }
      }
    }
    
    // Create character-specific prompts
    let characterPrompt = "";
    if (isGardener) {
      characterPrompt = `You are Harold, an experienced task management assistant who helps users organize their work. You're practical, encouraging, and straightforward. You provide helpful advice about productivity and task management.

Personality traits:
- Professional but friendly
- Focuses on practical solutions
- Encouraging and supportive
- Clear and concise communication
- Helps with productivity strategies

Keep responses conversational and helpful (1-3 sentences usually). Focus on being useful rather than using garden metaphors.`;
    } else {
      characterPrompt = `You are a helpful AI assistant integrated into a task management app. Be conversational, concise, and supportive. Keep responses brief (1-3 sentences usually) unless the user specifically asks for detailed help.`;
    }
    
    const prompt = `${characterPrompt}

User's message: "${message}"${conversationContext}

${shouldAddTask ? `Note: I've already added "${plantedTask.description}" as a ${plantedTask.status} ${plantedTask.type} task to their task list.` : ''}

Respond naturally and helpfully:`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let aiResponse = response.text();
    
    // Add task confirmation if planted
    if (shouldAddTask && plantedTask) {
      const statusText = plantedTask.status === 'completed' ? 'completed' : 
                        plantedTask.status === 'inProgress' ? 'in-progress' : 'new';
      const emoji = plantedTask.status === 'completed' ? '✅' : 
                   plantedTask.status === 'inProgress' ? '🔄' : '➕';
      
      aiResponse += ` ${emoji} I've added "${plantedTask.description}" as a ${statusText} task!`;
    }
    
    // Store chat history
    userData.chatHistory[userId].push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: isGardener ? 'harold' : 'assistant', content: aiResponse, timestamp: new Date() }
    );
    
    // Keep chat history manageable
    if (userData.chatHistory[userId].length > 50) {
      userData.chatHistory[userId] = userData.chatHistory[userId].slice(-50);
    }
    
    res.json({ 
      response: aiResponse,
      plantAdded: shouldAddTask,
      plant: plantedTask,
      garden: userData.gardens[userId] || []
    });
  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    
    const fallbackResponse = isGardener ? 
      "I'm having trouble connecting right now. Please try again in a moment." :
      "I'm having trouble connecting right now. Please try again in a moment.";
    
    res.status(500).json({ 
      error: 'Failed to get AI response', 
      message: fallbackResponse
    });
  }
});

// Update task status endpoint
app.patch('/api/garden/:userId/task/:taskId/status', (req, res) => {
  const { userId, taskId } = req.params;
  const { status } = req.body;
  
  if (!['todo', 'inProgress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const updatedTask = updateTaskStatus(userId, taskId, status);
  if (!updatedTask) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json({ 
    task: updatedTask,
    garden: userData.gardens[userId] || []
  });
});

// Garden endpoints
app.get('/api/garden/:userId', (req, res) => {
  const { userId } = req.params;
  const garden = userData.gardens[userId] || [];
  res.json({ garden });
});

app.post('/api/garden/:userId/plant', (req, res) => {
  const { userId } = req.params;
  const { taskSize, description, status = 'todo' } = req.body;
  
  if (!userData.gardens[userId]) {
    userData.gardens[userId] = [];
  }
  
  const newPlant = {
    id: Date.now() + Math.random(),
    type: taskSize,
    description: description || '',
    icon: getRandomPlantIcon(taskSize, status),
    status: status,
    planted: true,
    timestamp: new Date(),
    userId: userId
  };
  
  userData.gardens[userId].push(newPlant);
  res.json({ plant: newPlant, garden: userData.gardens[userId] });
});

// Get chat history
app.get('/api/chat-history/:userId', (req, res) => {
  const { userId } = req.params;
  const history = userData.chatHistory[userId] || [];
  res.json({ history });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Garden statistics
app.get('/api/garden/:userId/stats', (req, res) => {
  const { userId } = req.params;
  const garden = userData.gardens[userId] || [];
  
  const stats = {
    total: garden.length,
    bySize: {
      small: garden.filter(p => p.type === 'small').length,
      medium: garden.filter(p => p.type === 'medium').length,
      big: garden.filter(p => p.type === 'big').length,
    },
    byStatus: {
      todo: garden.filter(p => p.status === 'todo').length,
      inProgress: garden.filter(p => p.status === 'inProgress').length,
      completed: garden.filter(p => p.status === 'completed').length,
    },
    todayCount: garden.filter(p => {
      const plantDate = new Date(p.timestamp);
      const today = new Date();
      return plantDate.toDateString() === today.toDateString();
    }).length
  };
  
  res.json({ stats });
});

// REMOVE THE CATCH-ALL ROUTE FOR SEPARATE SERVICES
// Don't serve React app from backend when using separate services
// if (process.env.NODE_ENV === 'production') {
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
//   });
// }

app.listen(PORT, () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`✅ Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Set' : 'NOT SET!'}`);
});