const serverless = require('serverless-http');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection - Optimized for serverless
let cachedDb = null;
let connectionPromise = null;

async function connectToDatabase() {
  // Return cached connection if available and connected
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  
  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }
  
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  
  // Create new connection with optimized settings for serverless
  connectionPromise = mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 75000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
  }).then((conn) => {
    cachedDb = conn;
    connectionPromise = null;
    return conn;
  }).catch((err) => {
    connectionPromise = null;
    throw err;
  });
  
  return connectionPromise;
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  age: { type: Number, default: 0 },
  password: { type: String, required: true },
  classes: { type: [String], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ================== API ROUTES ==================

// Health check / root route
app.get('/api', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is running',
    endpoints: {
      users: '/api/users',
      user: '/api/users/:id'
    }
  });
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    await connectToDatabase();
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    await connectToDatabase();
    const { username, fullname, age, password, classes } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    
    const user = new User({
      username,
      fullname,
      age: age || 0,
      password: password || '123456789',
      classes: classes || []
    });
    
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully', 
      user: { ...user.toObject(), password: undefined } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const { fullname, age, password, classes } = req.body;
    
    const updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (age !== undefined) updateData.age = age;
    if (password !== undefined) updateData.password = password;
    if (classes !== undefined) updateData.classes = classes;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle class for user
app.patch('/api/users/:id/classes', async (req, res) => {
  try {
    await connectToDatabase();
    const { classValue, action } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (action === 'add') {
      if (!user.classes.includes(classValue)) {
        user.classes.push(classValue);
      }
    } else if (action === 'remove') {
      user.classes = user.classes.filter(c => c !== classValue);
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: `Class ${action === 'add' ? 'assigned' : 'removed'} successfully`, 
      classes: user.classes 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk update classes for user
app.put('/api/users/:id/classes', async (req, res) => {
  try {
    await connectToDatabase();
    const { classes } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { classes },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, message: 'Classes updated successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Export for Vercel serverless
module.exports = serverless(app);
