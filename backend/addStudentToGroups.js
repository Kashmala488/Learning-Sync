const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
require('dotenv').config({ path: './config.env' });

async function addStudentToGroups() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Get command line argument for student email
    const studentEmail = process.argv[2] || 'student1@example.com';
    
    // Find the student
    const student = await User.findOne({ email: studentEmail });
    if (!student) {
      console.error(`Student with email ${studentEmail} not found`);
      return;
    }
    
    console.log(`Found student: ${student.name} (${student.email})`);
    
    // Find all groups
    const groups = await Group.find({});
    console.log(`Found ${groups.length} groups`);
    
    // Add student to each group if not already a member
    for (const group of groups) {
      const studentId = student._id.toString();
      const isAlreadyMember = group.members.some(memberId => 
        memberId.toString() === studentId
      );
      
      if (isAlreadyMember) {
        console.log(`Student is already a member of "${group.name}"`);
      } else {
        // Add student to group
        group.members.push(student._id);
        await group.save();
        console.log(`Added student to group "${group.name}"`);
      }
    }
    
    console.log('\nDone! Student has been added to all groups.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

addStudentToGroups(); 