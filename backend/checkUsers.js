const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'config.env') });

// Import User model
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Get all users
      const users = await User.find({}).select('email name role');
      
      console.log('\nAll Users:');
      console.log('-------------------');
      users.forEach(user => {
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
        console.log('-------------------');
      });
      
      console.log(`\nTotal users: ${users.length}`);
      
      // Count users by role
      const teachers = users.filter(user => user.role === 'teacher').length;
      const students = users.filter(user => user.role === 'student').length;
      const admins = users.filter(user => user.role === 'admin').length;
      const unknownRoles = users.filter(user => !['teacher', 'student', 'admin'].includes(user.role)).length;
      
      console.log('\nUsers by role:');
      console.log(`Teachers: ${teachers}`);
      console.log(`Students: ${students}`);
      console.log(`Admins: ${admins}`);
      console.log(`Unknown roles: ${unknownRoles}`);
      
    } catch (err) {
      console.error('Error querying users:', err);
    } finally {
      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  }); 