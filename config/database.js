const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('⚠️  Database connection failed:', error.message);
    console.log('🔄 Server will continue running without database connection');
    console.log('📝 To fix: Check your MongoDB Atlas IP whitelist and credentials');
    // Don't exit - let server continue running
  }
};

module.exports = connectDB;