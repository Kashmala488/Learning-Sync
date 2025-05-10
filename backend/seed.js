const express = require('express');
const mongoose = require('mongoose');
const app = express();
require('dotenv').config();

app.use(express.json());
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });



// Define the Goal schema
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goals: [{ type: String }],
}, { timestamps: true });

// Create the Goal model
const Goal = mongoose.model('Goal', goalSchema);

// Seed data
const seedGoal = new Goal({
  userId: '67fea534b050d8d80a46dcfa',
  goals: [
    'Finish reading "Deep Work"',
    'Workout 4 times a week',
    'Build a full-stack app with MERN',
    'Learn GraphQL',
  ]
});

// Insert seed data
seedGoal.save()
  .then(() => {
    console.log('Seed goal added successfully!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error seeding goal:', err);
    mongoose.disconnect();
  });
