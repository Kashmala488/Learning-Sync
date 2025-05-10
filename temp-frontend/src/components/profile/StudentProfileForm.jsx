import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

const StudentProfileForm = ({ profile, onUpdateProfile, onUpdateStudentProfile }) => {
  // Basic profile info
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Student profile info
  const [grade, setGrade] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [goals, setGoals] = useState([]);

  // UI states
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    if (profile) {
      // Set basic profile info
      setName(profile.name || '');
      setBio(profile.bio || '');
      setPhoneNumber(profile.phoneNumber || '');
      setAddress(profile.address || '');
      setDateOfBirth(profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '');
      
      // Set student profile info
      if (profile.studentProfile) {
        setGrade(profile.studentProfile.grade || '');
        setEducationLevel(profile.studentProfile.educationLevel || '');
        setInterests(profile.studentProfile.interests || []);
        setSkills(profile.studentProfile.skills || []);
        setGoals(profile.studentProfile.goals || []);
      }
    }
  }, [profile]);

  const handleBasicInfoSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      bio,
      phoneNumber,
      address,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined
    });
  };

  const handleStudentProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateStudentProfile({
      grade,
      educationLevel,
      interests,
      skills,
      goals
    });
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (index) => {
    setInterests(interests.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Basic Information Form */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Basic Information</h3>
        <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us a bit about yourself..."
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              Save Basic Info
            </button>
          </div>
        </form>
      </div>
      
      {/* Student Profile Form */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">Student Information</h3>
        <form onSubmit={handleStudentProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade/Year</label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
              <select
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select education level</option>
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="High School">High School</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Graduate">Graduate</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>
          
          {/* Interests Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {interests.map((interest, index) => (
                <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
                  <span>{interest}</span>
                  <button
                    type="button"
                    onClick={() => removeInterest(index)}
                    className="ml-2 text-blue-700 hover:text-blue-900"
                  >
                    <FontAwesomeIcon icon={faTimes} size="sm" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add an interest"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addInterest}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          {/* Skills Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((skill, index) => (
                <div key={index} className="bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center">
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="ml-2 text-green-700 hover:text-green-900"
                  >
                    <FontAwesomeIcon icon={faTimes} size="sm" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add a skill"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          {/* Goals Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Learning Goals</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {goals.map((goal, index) => (
                <div key={index} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full flex items-center">
                  <span>{goal}</span>
                  <button
                    type="button"
                    onClick={() => removeGoal(index)}
                    className="ml-2 text-purple-700 hover:text-purple-900"
                  >
                    <FontAwesomeIcon icon={faTimes} size="sm" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a learning goal"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addGoal}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              Save Student Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentProfileForm; 