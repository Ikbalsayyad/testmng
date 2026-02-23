const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  age: { type: Number, default: 0 },
  password: { type: String, required: true },
  classes: { type: [String], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// MongoDB Connection - Cached for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }
  
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  
  cachedDb = await mongoose.connect(process.env.MONGO_URI);
  return cachedDb;
}

// Helper to send JSON response
const sendJson = (res, statusCode, data) => {
  res.status(statusCode).json(data);
};

// Main handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = (req.url || req.path || '/').split('?')[0];
  const method = req.method;

  try {
    // Health check - no database required
    if (path === '/api' || path === '/api/') {
      return sendJson(res, 200, {
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        endpoints: { users: '/api/users', user: '/api/users/:id' }
      });
    }

    // Test database connection
    if (path === '/api/health') {
      const startTime = Date.now();
      await connectToDatabase();
      return sendJson(res, 200, {
        success: true,
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        responseTime: `${Date.now() - startTime}ms`
      });
    }

    // Get all users
    if (path === '/api/users' && method === 'GET') {
      await connectToDatabase();
      const users = await User.find({}).select('-password');
      return sendJson(res, 200, { success: true, users });
    }

    // Create new user
    if (path === '/api/users' && method === 'POST') {
      await connectToDatabase();
      const { username, fullname, age, password, classes } = req.body || {};
      
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return sendJson(res, 400, { success: false, message: 'Username already exists' });
      }
      
      const user = new User({
        username,
        fullname,
        age: age || 0,
        password: password || '123456789',
        classes: classes || []
      });
      
      await user.save();
      return sendJson(res, 201, {
        success: true,
        message: 'User created successfully',
        user: { ...user.toObject(), password: undefined }
      });
    }

    // Single user operations
    const userMatch = path.match(/^\/api\/users\/([^\/]+)$/);
    if (userMatch) {
      const userId = userMatch[1];
      await connectToDatabase();

      // Get single user
      if (method === 'GET') {
        const user = await User.findById(userId).select('-password');
        if (!user) {
          return sendJson(res, 404, { success: false, message: 'User not found' });
        }
        return sendJson(res, 200, { success: true, user });
      }

      // Update user
      if (method === 'PUT') {
        const { fullname, age, password, classes } = req.body || {};
        const updateData = {};
        if (fullname !== undefined) updateData.fullname = fullname;
        if (age !== undefined) updateData.age = age;
        if (password !== undefined) updateData.password = password;
        if (classes !== undefined) updateData.classes = classes;
        
        const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select('-password');
        if (!user) {
          return sendJson(res, 404, { success: false, message: 'User not found' });
        }
        return sendJson(res, 200, { success: true, message: 'User updated successfully', user });
      }

      // Delete user
      if (method === 'DELETE') {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
          return sendJson(res, 404, { success: false, message: 'User not found' });
        }
        return sendJson(res, 200, { success: true, message: 'User deleted successfully' });
      }
    }

    // Classes operations
    const classesMatch = path.match(/^\/api\/users\/([^\/]+)\/classes$/);
    if (classesMatch) {
      const userId = classesMatch[1];
      await connectToDatabase();

      // Toggle class
      if (method === 'PATCH') {
        const { classValue, action } = req.body || {};
        const user = await User.findById(userId);
        if (!user) {
          return sendJson(res, 404, { success: false, message: 'User not found' });
        }
        
        if (action === 'add' && !user.classes.includes(classValue)) {
          user.classes.push(classValue);
        } else if (action === 'remove') {
          user.classes = user.classes.filter(c => c !== classValue);
        }
        
        await user.save();
        return sendJson(res, 200, {
          success: true,
          message: `Class ${action === 'add' ? 'assigned' : 'removed'} successfully`,
          classes: user.classes
        });
      }

      // Bulk update classes
      if (method === 'PUT') {
        const { classes } = req.body || {};
        const user = await User.findByIdAndUpdate(userId, { classes }, { new: true, runValidators: true }).select('-password');
        if (!user) {
          return sendJson(res, 404, { success: false, message: 'User not found' });
        }
        return sendJson(res, 200, { success: true, message: 'Classes updated successfully', user });
      }
    }

    // 404 for unmatched routes
    return sendJson(res, 404, { success: false, message: 'Route not found' });

  } catch (error) {
    console.error('API Error:', error);
    return sendJson(res, 500, { success: false, message: error.message });
  }
};