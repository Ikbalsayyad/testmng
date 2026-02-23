// Simple test endpoint without mongoose
module.exports = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    hasMongoUri: !!process.env.MONGO_URI
  });
};