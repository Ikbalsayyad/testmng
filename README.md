# LMS Admin Panel - MongoDB User Management

A simple and user-friendly admin panel to manage users and assign classes for your LMS (Learning Management System) robotics platform.

## Features

- **Secure Authentication**: JWT-based login system with password hashing
- **User Management**: Add, edit, and delete users
- **Class Assignment**: Easy toggle switches to assign/unassign classes to users
- **Search**: Quickly find users by username or name
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Changes reflect immediately in the interface
- **Session Management**: Remember me functionality with secure token storage

## Prerequisites

- Node.js (v14 or higher)
- MongoDB database (local or Atlas)

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ikbalsayyad/testmng.git
cd testmng
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

Create a `.env` file in the root directory with the following:

```env
# MongoDB Connection String (Required)
MONGO_URI=mongodb://localhost:27017/your-database-name

# Server Port (Optional, defaults to 5000)
PORT=5000

# JWT Secret for Authentication (Required - use a strong random string in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**For MongoDB Atlas**, your connection string will look like:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/your-database-name
```

### 4. Configure Classes (Optional)

If you need to modify the available classes, edit the `AVAILABLE_CLASSES` array in `app.js`:

```javascript
const AVAILABLE_CLASSES = [
  { 
    id: 'c1', 
    label: 'Robotics Level 1: Foundations', 
    val: "{ title: 'Robotics Level 1: Foundations', description: '...', image: '...' }" 
  },
  // Add more classes as needed
];
```

### 5. Start the server

```bash
npm start
```

### 6. Create Initial Admin Account

Before you can access the admin panel, you need to create an admin account. Use the following curl command or Postman:

```bash
curl -X POST http://localhost:5000/api/auth/init \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-secure-password", "email": "admin@example.com"}'
```

**Note**: This endpoint only works when no admin exists. Once an admin is created, this endpoint will return an error.

### 7. Access the Admin Panel

Open your browser and navigate to:
```
http://localhost:5000/login.html
```

Login with your admin credentials to access the dashboard.

## Usage Guide

### Adding a User

1. Click the **"Add User"** button in the top right
2. Fill in the user details:
   - **Username** (required, must be unique)
   - **Full Name** (required)
   - **Age** (optional)
   - **Password** (optional, defaults to "123456789")
3. Toggle the classes you want to assign
4. Click **"Save User"**

### Editing a User

1. Find the user card
2. Click the **edit icon** (pencil)
3. Modify the details and class assignments
4. Click **"Update User"**

### Deleting a User

1. Find the user card
2. Click the **delete icon** (trash)
3. Confirm the deletion

### Assigning Classes

When editing a user, use the toggle switches to:
- **Turn ON** (green) = Class is assigned to the user
- **Turn OFF** (gray) = Class is removed from the user

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/init` | Create initial admin (only if no admin exists) |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/verify` | Verify JWT token validity |
| POST | `/api/auth/logout` | Logout (client-side token removal) |
| PUT | `/api/auth/password` | Change admin password |

### Users (All require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get single user |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| PATCH | `/api/users/:id/classes` | Toggle single class |
| PUT | `/api/users/:id/classes` | Bulk update classes |

### Authentication Header

All protected endpoints require the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

The app works with your existing user schema:

```javascript
{
  username: String,      // Required, unique
  fullname: String,      // Required
  age: Number,           // Optional
  password: String,      // Required
  classes: [String],     // Array of class value strings
  __v: Number            // Version key (Mongoose)
}
```

## Project Structure

```
testmng/
├── server.js          # Express server (for local development)
├── api/
│   └── index.js       # Vercel serverless function
├── vercel.json        # Vercel configuration
├── package.json       # Dependencies
├── .env.example       # Environment variables template
├── .env               # Your actual environment variables (create this)
├── README.md          # This file
├── index.html         # Main HTML file
├── styles.css         # Styling
└── app.js             # Frontend JavaScript logic
```

## Troubleshooting

### "MongoDB Connection Error"
- Check your `MONGO_URI` in `.env`
- Ensure MongoDB is running (if local)
- Verify network access (if using Atlas)

### "Username already exists"
- Usernames must be unique. Choose a different username.

### Classes not showing correctly
- Verify the class values in `app.js` match your frontend's class structure

## Deploying to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Set environment variables:
```bash
vercel env add MONGO_URI
```
Then paste your MongoDB connection string.

### Method 2: Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variable:
   - Name: `MONGO_URI`
   - Value: Your MongoDB connection string
6. Click "Deploy"

### Important Notes for Vercel

- The app uses `serverless-http` for Vercel deployment
- `server.js` is for local development (runs with `npm start`)
- `api/index.js` is for Vercel serverless functions
- Static files (`index.html`, `styles.css`, `app.js`) are served from root
- Set `MONGO_URI` in Vercel's environment variables

## Security Features

This admin panel now includes **secure authentication**:

- **JWT-based Authentication**: Secure token-based authentication system
- **Password Hashing**: Passwords are hashed using bcryptjs with salt rounds of 12
- **Protected API Routes**: All user management endpoints require authentication
- **Token Expiration**: JWT tokens expire after 24 hours
- **Secure Storage**: Tokens stored in localStorage (remember me) or sessionStorage

### Additional Security Recommendations

For production deployment, consider adding:
- Rate limiting (e.g., express-rate-limit)
- HTTPS enforcement
- Input validation/sanitization
- CORS configuration for specific origins
- Strong JWT secret (use a long random string)
- Environment variable security

## License

ISC
