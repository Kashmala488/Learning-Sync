const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
require('dotenv').config({ path: './config.env' });

// Usage: node checkGroupMembership.js <userEmail> <groupId>
async function checkGroupMembership() {
  try {
    // Get arguments
    const userEmail = process.argv[2];
    const groupId = process.argv[3];
    
    if (!userEmail || !groupId) {
      console.error('Usage: node checkGroupMembership.js <userEmail> <groupId>');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find user
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`User with email ${userEmail} not found.`);
      process.exit(1);
    }
    
    console.log(`\nUser Information:`);
    console.log(`ID: ${user._id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    
    // Find group
    const group = await Group.findById(groupId);
    if (!group) {
      console.error(`Group with ID ${groupId} not found.`);
      process.exit(1);
    }
    
    console.log(`\nGroup Information:`);
    console.log(`ID: ${group._id}`);
    console.log(`Name: ${group.name}`);
    console.log(`Subject: ${group.subject}`);
    console.log(`Total members: ${group.members.length}`);
    
    // Check if user is a member
    const userIdStr = user._id.toString();
    const isMember = group.members.some(memberId => memberId.toString() === userIdStr);
    
    console.log(`\nMembership Check:`);
    console.log(`User ${user.name} (${user.email}) is${isMember ? '' : ' NOT'} a member of group "${group.name}"`);
    
    if (!isMember) {
      console.log(`\nGroup member IDs:`);
      group.members.forEach((memberId, index) => {
        console.log(`${index + 1}. ${memberId.toString()}`);
      });
    }
    
    // Add the user to the group if not a member
    if (!isMember) {
      console.log('\nWould you like to add this user to the group? (y/n)');
      process.stdin.once('data', async (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 'y' || answer === 'yes') {
          group.members.push(user._id);
          await group.save();
          console.log(`User ${user.name} has been added to group "${group.name}"`);
        }
        mongoose.connection.close();
        process.exit(0);
      });
    } else {
      mongoose.connection.close();
    }
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkGroupMembership(); 