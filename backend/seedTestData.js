const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('./models/User');
const Group = require('./models/Group');
const Quiz = require('./models/Quiz');
const QuizResult = require('./models/QuizResult');
const Resource = require('./models/Resource');
const LearningPath = require('./models/LearningPath');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/educationApp')
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Clear existing data
const clearCollections = async () => {
  try {
    await User.deleteMany({});
    await Group.deleteMany({});
    await Quiz.deleteMany({});
    await QuizResult.deleteMany({});
    await Resource.deleteMany({});
    await LearningPath.deleteMany({});
    console.log('All collections cleared');
  } catch (err) {
    console.error('Error clearing collections:', err);
    process.exit(1);
  }
};

// Create test users
const createUsers = async () => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create student users
    const students = await User.create([
      {
        name: 'Student 1',
        email: 'student1@example.com',
        password: hashedPassword,
        role: 'student',
        bio: 'Eager learner interested in web development',
        profilePicture: 'https://i.pravatar.cc/150?img=1'
      },
      {
        name: 'Student 2',
        email: 'student2@example.com',
        password: hashedPassword,
        role: 'student',
        bio: 'Math enthusiast and problem solver',
        profilePicture: 'https://i.pravatar.cc/150?img=2'
      },
      {
        name: 'Student 3',
        email: 'student3@example.com',
        password: hashedPassword,
        role: 'student',
        bio: 'Science lover and curious mind',
        profilePicture: 'https://i.pravatar.cc/150?img=3'
      }
    ]);
    
    // Create teacher user
    const teachers = await User.create([
      {
        name: 'Teacher 1',
        email: 'teacher1@example.com',
        password: hashedPassword,
        role: 'teacher',
        bio: 'Web development instructor with 10+ years experience',
        profilePicture: 'https://i.pravatar.cc/150?img=11'
      },
      {
        name: 'Teacher 2',
        email: 'teacher2@example.com',
        password: hashedPassword,
        role: 'teacher',
        bio: 'Mathematics professor specialized in algebra and calculus',
        profilePicture: 'https://i.pravatar.cc/150?img=12'
      }
    ]);
    
    // Create admin user
    const admins = await User.create([
      {
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        bio: 'System administrator',
        profilePicture: 'https://i.pravatar.cc/150?img=20'
      }
    ]);
    
    console.log(`Created ${students.length} students, ${teachers.length} teachers, and ${admins.length} admins`);
    return { students, teachers, admins };
  } catch (err) {
    console.error('Error creating users:', err);
    process.exit(1);
  }
};

// Create collaboration groups
const createGroups = async (users) => {
  try {
    const groups = await Group.create([
      {
        name: 'Web Development Group',
        description: 'A group for students interested in learning web development technologies',
        subject: 'Web Development',
        members: [users.students[0]._id, users.students[1]._id, users.teachers[0]._id],
        maxMembers: 10,
        messages: [
          {
            sender: users.students[0]._id,
            content: 'Hello everyone! Excited to learn more about React!',
            timestamp: new Date()
          },
          {
            sender: users.teachers[0]._id,
            content: 'Welcome! We will be covering React fundamentals next week.',
            timestamp: new Date(Date.now() + 3600000)
          }
        ]
      },
      {
        name: 'Mathematics Study Group',
        description: 'Study group for advanced mathematics concepts',
        subject: 'Mathematics',
        members: [users.students[1]._id, users.students[2]._id, users.teachers[1]._id],
        maxMembers: 8,
        messages: [
          {
            sender: users.students[2]._id,
            content: 'Does anyone have resources for linear algebra?',
            timestamp: new Date()
          },
          {
            sender: users.teachers[1]._id,
            content: 'I\'ll share some great materials in our next session.',
            timestamp: new Date(Date.now() + 3600000)
          }
        ]
      },
      {
        name: 'JavaScript Experts',
        description: 'Deep-dive into advanced JavaScript concepts and frameworks',
        subject: 'JavaScript',
        members: [users.students[0]._id, users.students[2]._id, users.teachers[0]._id],
        maxMembers: 10,
        messages: [
          {
            sender: users.students[0]._id,
            content: 'How can we implement async/await effectively?',
            timestamp: new Date()
          },
          {
            sender: users.teachers[0]._id,
            content: 'That\'s a great question. Let\'s cover promises first!',
            timestamp: new Date(Date.now() + 3600000)
          }
        ]
      },
      {
        name: 'Data Science Club',
        description: 'Exploring data analysis, visualization and machine learning',
        subject: 'Data Science',
        members: [users.students[1]._id, users.students[2]._id, users.teachers[1]._id],
        maxMembers: 12,
        messages: [
          {
            sender: users.students[1]._id,
            content: 'What Python libraries should I learn for data visualization?',
            timestamp: new Date()
          },
          {
            sender: users.teachers[1]._id,
            content: 'Start with Matplotlib and Seaborn, then move to Plotly.',
            timestamp: new Date(Date.now() + 3600000)
          }
        ]
      }
    ]);
    
    console.log(`Created ${groups.length} collaboration groups`);
    return groups;
  } catch (err) {
    console.error('Error creating groups:', err);
    process.exit(1);
  }
};

// Create quizzes
const createQuizzes = async (users) => {
  try {
    const quizzes = await Quiz.create([
      {
        title: 'Web Development Fundamentals',
        subject: 'Web Development',
        difficulty: 'medium',
        createdBy: users.teachers[0]._id,
        questions: [
          {
            question: 'What does HTML stand for?',
            options: ['Hyper Text Markup Language', 'High Tech Machine Learning', 'Hyper Transfer Markup Language', 'Hybrid Text Machine Language'],
            answer: 'Hyper Text Markup Language',
            hint: 'Think about web page structure and content.'
          },
          {
            question: 'Which CSS property is used to change the text color of an element?',
            options: ['font-color', 'text-color', 'color', 'text-style'],
            answer: 'color',
            hint: 'It\'s the most straightforward property name.'
          },
          {
            question: 'What is the correct way to declare a JavaScript variable?',
            options: ['variable x = 5;', 'var x = 5;', 'x = 5;', 'int x = 5;'],
            answer: 'var x = 5;',
            hint: 'Modern JS also uses let and const.'
          }
        ]
      },
      {
        title: 'Advanced JavaScript Concepts',
        subject: 'JavaScript',
        difficulty: 'hard',
        createdBy: users.teachers[0]._id,
        questions: [
          {
            question: 'What is a closure in JavaScript?',
            options: [
              'A built-in JavaScript object',
              'A function that has access to variables from its outer scope',
              'A method to close browser windows',
              'A way to terminate functions'
            ],
            answer: 'A function that has access to variables from its outer scope',
            hint: 'Think about scope and variable access.'
          },
          {
            question: 'Which method creates a new array with the results of calling a provided function on every element?',
            options: ['forEach()', 'map()', 'filter()', 'reduce()'],
            answer: 'map()',
            hint: 'This method transforms each element and returns a new array.'
          },
          {
            question: 'What does the Promise.all() method do?',
            options: [
              'Resolves when any Promise resolves',
              'Resolves when all Promises resolve',
              'Rejects all Promises',
              'Creates multiple Promises'
            ],
            answer: 'Resolves when all Promises resolve',
            hint: 'Used when you need to wait for multiple async operations.'
          }
        ]
      },
      {
        title: 'Mathematics: Algebra Basics',
        subject: 'Mathematics',
        difficulty: 'easy',
        createdBy: users.teachers[1]._id,
        questions: [
          {
            question: 'What is the solution to the equation 2x + 5 = 15?',
            options: ['x = 5', 'x = 10', 'x = 7.5', 'x = 8'],
            answer: 'x = 5',
            hint: 'Isolate x by subtracting 5 from both sides first.'
          },
          {
            question: 'Which of the following is a quadratic equation?',
            options: ['y = mx + b', 'y = 2x', 'y = x^2 + 3x + 2', 'y = 2^x'],
            answer: 'y = x^2 + 3x + 2',
            hint: 'A quadratic equation contains x^2 as its highest power.'
          },
          {
            question: 'If f(x) = 3x - 7, what is f(4)?',
            options: ['5', '9', '12', '19'],
            answer: '5',
            hint: 'Substitute x = 4 into the function and calculate.'
          }
        ]
      },
      {
        title: 'Data Science Introduction',
        subject: 'Data Science',
        difficulty: 'medium',
        createdBy: users.teachers[1]._id,
        questions: [
          {
            question: 'Which Python library is primarily used for data manipulation and analysis?',
            options: ['NumPy', 'Pandas', 'Matplotlib', 'Scikit-learn'],
            answer: 'Pandas',
            hint: 'Known for its DataFrame data structure.'
          },
          {
            question: 'What technique is used to prevent overfitting in machine learning models?',
            options: ['Boosting', 'Regularization', 'Normalization', 'Standardization'],
            answer: 'Regularization',
            hint: 'This technique adds a penalty for model complexity.'
          },
          {
            question: 'Which of the following is NOT a type of supervised learning?',
            options: ['Regression', 'Classification', 'Clustering', 'Support Vector Machines'],
            answer: 'Clustering',
            hint: 'Think about learning methods that don\'t use labeled data.'
          }
        ]
      }
    ]);
    
    console.log(`Created ${quizzes.length} quizzes`);
    return quizzes;
  } catch (err) {
    console.error('Error creating quizzes:', err);
    process.exit(1);
  }
};

// Create learning paths
const createLearningPaths = async (users, quizzes) => {
  try {
    // Create multiple learning paths for each student
    const learningPaths = [];
    
    // For student 1
    const student1Paths = [
      {
        title: 'Web Development Journey - HTML & CSS',
        description: 'Complete path to become a web developer focusing on frontend',
        teacherId: users.teachers[0]._id,
        studentId: users.students[0]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: false,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[0]._id,
            completed: true,
            score: 85
          }
        ],
        status: 'active',
        progress: 35
      },
      {
        title: 'JavaScript Mastery',
        description: 'Advanced JavaScript techniques and patterns',
        teacherId: users.teachers[0]._id,
        studentId: users.students[0]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: true,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[1]._id,
            completed: true,
            score: 67
          }
        ],
        status: 'active',
        progress: 67
      }
    ];
    
    // For student 2
    const student2Paths = [
      {
        title: 'Web Development Basics',
        description: 'Introduction to web development concepts',
        teacherId: users.teachers[0]._id,
        studentId: users.students[1]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: true,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[0]._id,
            completed: true,
            score: 67
          }
        ],
        status: 'active',
        progress: 40
      },
      {
        title: 'Mathematics Foundations',
        description: 'Core mathematical concepts every student should know',
        teacherId: users.teachers[1]._id,
        studentId: users.students[1]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: false,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[2]._id,
            completed: false,
            score: 0
          }
        ],
        status: 'active',
        progress: 20
      }
    ];
    
    // For student 3
    const student3Paths = [
      {
        title: 'Mathematics Advanced',
        description: 'Advanced mathematics for eager learners',
        teacherId: users.teachers[1]._id,
        studentId: users.students[2]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: true,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[2]._id,
            completed: true,
            score: 100
          }
        ],
        status: 'active',
        progress: 80
      },
      {
        title: 'Data Science for Beginners',
        description: 'Introduction to data science principles',
        teacherId: users.teachers[1]._id,
        studentId: users.students[2]._id,
        resources: [
          { 
            resourceId: new mongoose.Types.ObjectId(), 
            completed: false,
            order: 1
          }
        ],
        quizzes: [
          {
            quizId: quizzes[3]._id,
            completed: false,
            score: 0
          }
        ],
        status: 'active',
        progress: 15
      }
    ];
    
    // Combine all learning paths
    const allPaths = [...student1Paths, ...student2Paths, ...student3Paths];
    
    // Insert into database
    const createdPaths = await LearningPath.create(allPaths);
    
    console.log(`Created ${createdPaths.length} learning paths`);
    return createdPaths;
  } catch (err) {
    console.error('Error creating learning paths:', err);
    process.exit(1);
  }
};

// Create educational resources
const createResources = async (users) => {
  try {
    const resources = await Resource.create([
      {
        title: 'HTML5 Complete Guide - Video',
        content: 'Comprehensive guide to HTML5 features and best practices.',
        type: 'video',
        url: 'https://example.com/html5-video',
        sharedBy: users.teachers[0]._id,
        ratings: [
          { userId: users.students[0]._id, score: 5 },
          { userId: users.students[1]._id, score: 4 }
        ],
        tags: ['html', 'web-development', 'frontend']
      },
      {
        title: 'JavaScript ES6 Tutorial - Article',
        content: 'Learn the modern features of JavaScript ES6 and how to use them effectively.',
        type: 'article',
        url: 'https://example.com/js-es6-article',
        sharedBy: users.teachers[0]._id,
        ratings: [
          { userId: users.students[0]._id, score: 5 },
          { userId: users.students[2]._id, score: 5 }
        ],
        tags: ['javascript', 'es6', 'programming']
      },
      {
        title: 'Calculus Made Easy - PDF',
        content: 'Simplified approach to calculus concepts with practical examples.',
        type: 'document',
        url: 'https://example.com/calculus-pdf',
        sharedBy: users.teachers[1]._id,
        ratings: [
          { userId: users.students[1]._id, score: 4 },
          { userId: users.students[2]._id, score: 3 }
        ],
        tags: ['mathematics', 'calculus', 'education']
      },
      {
        title: 'Python for Data Science - Video Tutorial',
        content: 'Introduction to using Python libraries for data analysis and visualization.',
        type: 'video',
        url: 'https://example.com/python-data-science',
        sharedBy: users.teachers[1]._id,
        ratings: [
          { userId: users.students[1]._id, score: 5 },
          { userId: users.students[2]._id, score: 5 }
        ],
        tags: ['python', 'data-science', 'programming']
      }
    ]);
    
    console.log(`Created ${resources.length} educational resources`);
    return resources;
  } catch (err) {
    console.error('Error creating resources:', err);
    process.exit(1);
  }
};

// Create quiz results
const createQuizResults = async (users, quizzes) => {
  try {
    const results = await QuizResult.create([
      {
        userId: users.students[0]._id,
        quizId: quizzes[0]._id,
        score: 85,
        answers: [
          { questionIndex: 0, selectedAnswer: 'Hyper Text Markup Language', isCorrect: true },
          { questionIndex: 1, selectedAnswer: 'color', isCorrect: true },
          { questionIndex: 2, selectedAnswer: 'var x = 5;', isCorrect: true }
        ],
        completedAt: new Date()
      },
      {
        userId: users.students[0]._id,
        quizId: quizzes[1]._id,
        score: 67,
        answers: [
          { questionIndex: 0, selectedAnswer: 'A function that has access to variables from its outer scope', isCorrect: true },
          { questionIndex: 1, selectedAnswer: 'forEach()', isCorrect: false },
          { questionIndex: 2, selectedAnswer: 'Resolves when all Promises resolve', isCorrect: true }
        ],
        completedAt: new Date()
      },
      {
        userId: users.students[1]._id,
        quizId: quizzes[0]._id,
        score: 67,
        answers: [
          { questionIndex: 0, selectedAnswer: 'Hyper Text Markup Language', isCorrect: true },
          { questionIndex: 1, selectedAnswer: 'text-color', isCorrect: false },
          { questionIndex: 2, selectedAnswer: 'var x = 5;', isCorrect: true }
        ],
        completedAt: new Date()
      },
      {
        userId: users.students[2]._id,
        quizId: quizzes[2]._id,
        score: 100,
        answers: [
          { questionIndex: 0, selectedAnswer: 'x = 5', isCorrect: true },
          { questionIndex: 1, selectedAnswer: 'y = x^2 + 3x + 2', isCorrect: true },
          { questionIndex: 2, selectedAnswer: '5', isCorrect: true }
        ],
        completedAt: new Date()
      }
    ]);
    
    console.log(`Created ${results.length} quiz results`);
    return results;
  } catch (err) {
    console.error('Error creating quiz results:', err);
    process.exit(1);
  }
};

// Run the seeding process
const seedDatabase = async () => {
  try {
    await clearCollections();
    const users = await createUsers();
    const groups = await createGroups(users);
    const quizzes = await createQuizzes(users);
    const learningPaths = await createLearningPaths(users, quizzes);
    const resources = await createResources(users);
    const quizResults = await createQuizResults(users, quizzes);
    
    console.log('Database seeded successfully!');
    console.log('\nTest user credentials:');
    console.log('Student: student1@example.com / password123');
    console.log('Teacher: teacher1@example.com / password123');
    console.log('Admin: admin@example.com / password123');
    
    mongoose.disconnect();
  } catch (err) {
    console.error('Error seeding database:', err);
    mongoose.disconnect();
  }
};

seedDatabase(); 