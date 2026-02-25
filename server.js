const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();

// JWT Secret - In production, use a strong secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'ultraminds-super-secret-jwt-key-2026';
const TOKEN_EXPIRY = '24h';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from root folder
app.use(express.static('.'));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

connectDB();

// User Schema (matching your existing structure)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  age: { type: Number, default: 0 },
  password: { type: String, required: true },
  Classes: [
    {
      title: String,
      description: String,
      price: Number,
      image: String,
      id: {
        type: String,
        require: true
      },
      // chapters: [{
      //   id: String,
      //   image: String,
      //   introText: String,
      //   isCompleted: Boolean,
      //   pdfUrl: String,
      //   teacherMaterial: String,
      //   title: String,
      //   videoUrl: String,
      // }],
    }
  ]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Admin Schema for authentication
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  role: { type: String, default: 'admin' },
  lastLogin: { type: Date }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

// ================== AUTHENTICATION MIDDLEWARE ==================

// Verify JWT token middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify admin still exists
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Admin not found.' 
      });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================== AUTH ROUTES ==================

// Initialize default admin (run once or if no admin exists)
app.post('/api/auth/init', async (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin already exists. Use login endpoint.' 
      });
    }
    
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const admin = new Admin({
      username,
      password: hashedPassword,
      email: email || `${username}@admin.local`
    });
    
    await admin.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Admin created successfully',
      admin: { username: admin.username, email: admin.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify token
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.admin._id,
      username: req.admin.username,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

// Logout (client-side token removal, but we can log it)
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Change password
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current and new password are required' 
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters' 
      });
    }
    
    // Verify current password
    const admin = await Admin.findById(req.admin._id);
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // Hash and update new password
    const saltRounds = 12;
    admin.password = await bcrypt.hash(newPassword, saltRounds);
    await admin.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ================== PROTECTED API ROUTES ==================

// Get all users
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single user
app.get('/api/users/:id', authMiddleware, async (req, res) => {
  try {
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
app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    const { username, fullname, age, password, Classes } = req.body;

    // Check if user existsS
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const user = new User({
      username,
      fullname,
      age: age || 0,
      password: password || '123456789',
      Classes: Classes || []
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
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    const { fullname, age, password, Classes } = req.body;

    const updateData = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (age !== undefined) updateData.age = age;
    if (password !== undefined) updateData.password = password;
    if (Classes !== undefined) updateData.Classes = Classes;

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
app.patch('/api/users/:id/classes', authMiddleware, async (req, res) => {
  try {
    const { classValue, action } = req.body; // action: 'add' or 'remove'

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'add') {
      if (!user.Classes.includes(classValue)) {
        user.Classes.push(classValue);
      }
    } else if (action === 'remove') {
      user.Classes = user.Classes.filter(c => c !== classValue);
    }

    await user.save();

    res.json({
      success: true,
      message: `Class ${action === 'add' ? 'assigned' : 'removed'} successfully`,
      Classes: user.Classes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
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
app.put('/api/users/:id/classes', authMiddleware, async (req, res) => {
  try {
    const { Classes } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { Classes },
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Admin Panel: http://localhost:${PORT}`);
});