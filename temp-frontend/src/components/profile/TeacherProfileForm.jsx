import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faPlus, faTimes, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const TeacherProfileForm = ({ profile, onUpdateProfile, onUpdateTeacherProfile }) => {
  // Basic profile info
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Teacher profile info
  const [qualifications, setQualifications] = useState([]);
  const [expertise, setExpertise] = useState([]);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [certifications, setCertifications] = useState([]);
  const [availability, setAvailability] = useState('');
  const [teachingCourses, setTeachingCourses] = useState([]);

  // UI states
  const [newQualification, setNewQualification] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseIndex, setEditingCourseIndex] = useState(-1);
  const [courseInput, setCourseInput] = useState({
    name: '',
    description: '',
    level: 'beginner'
  });

  useEffect(() => {
    if (profile) {
      // Set basic profile info
      setName(profile.name || '');
      setBio(profile.bio || '');
      setPhoneNumber(profile.phoneNumber || '');
      setAddress(profile.address || '');
      setDateOfBirth(profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '');
      
      // Set teacher profile info
      if (profile.teacherProfile) {
        setQualifications(profile.teacherProfile.qualifications || []);
        setExpertise(profile.teacherProfile.expertise || []);
        setYearsOfExperience(profile.teacherProfile.yearsOfExperience || '');
        setCertifications(profile.teacherProfile.certifications || []);
        setAvailability(profile.teacherProfile.availability || '');
        setTeachingCourses(profile.teacherProfile.teachingCourses || []);
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

  const handleTeacherProfileSubmit = (e) => {
    e.preventDefault();
    onUpdateTeacherProfile({
      qualifications,
      expertise,
      yearsOfExperience: yearsOfExperience !== '' ? Number(yearsOfExperience) : undefined,
      certifications,
      availability,
      teachingCourses
    });
  };

  // Collection management functions
  const addQualification = () => {
    if (newQualification.trim()) {
      setQualifications([...qualifications, newQualification.trim()]);
      setNewQualification('');
    }
  };

  const removeQualification = (index) => {
    setQualifications(qualifications.filter((_, i) => i !== index));
  };

  const addExpertise = () => {
    if (newExpertise.trim()) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const removeExpertise = (index) => {
    setExpertise(expertise.filter((_, i) => i !== index));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setCertifications([...certifications, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const removeCertification = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  // Course management functions
  const addCourse = () => {
    if (courseInput.name.trim() && courseInput.description.trim()) {
      if (editingCourseIndex >= 0) {
        // Edit existing course
        const updatedCourses = [...teachingCourses];
        updatedCourses[editingCourseIndex] = { ...courseInput };
        setTeachingCourses(updatedCourses);
        setEditingCourseIndex(-1);
      } else {
        // Add new course
        setTeachingCourses([...teachingCourses, { ...courseInput }]);
      }
      
      // Reset form
      setCourseInput({
        name: '',
        description: '',
        level: 'beginner'
      });
      setShowCourseForm(false);
    }
  };

  const editCourse = (index) => {
    const course = teachingCourses[index];
    setCourseInput({
      name: course.name,
      description: course.description,
      level: course.level
    });
    setEditingCourseIndex(index);
    setShowCourseForm(true);
  };

  const removeCourse = (index) => {
    setTeachingCourses(teachingCourses.filter((_, i) => i !== index));
  };

  const cancelCourseEdit = () => {
    setCourseInput({
      name: '',
      description: '',
      level: 'beginner'
    });
    setEditingCourseIndex(-1);
    setShowCourseForm(false);
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
              placeholder="Tell students about yourself..."
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
      
      {/* Teacher Profile Form */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">Professional Information</h3>
        <form onSubmit={handleTeacherProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                min="0"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <input
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="e.g., Weekdays 9 AM - 5 PM"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Qualifications Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {qualifications.map((qualification, index) => (
                <div key={index} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center">
                  <span>{qualification}</span>
                  <button
                    type="button"
                    onClick={() => removeQualification(index)}
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
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                placeholder="Add a qualification"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addQualification}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          {/* Expertise Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Areas of Expertise</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {expertise.map((area, index) => (
                <div key={index} className="bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center">
                  <span>{area}</span>
                  <button
                    type="button"
                    onClick={() => removeExpertise(index)}
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
                value={newExpertise}
                onChange={(e) => setNewExpertise(e.target.value)}
                placeholder="Add an area of expertise"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addExpertise}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          {/* Certifications Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {certifications.map((certification, index) => (
                <div key={index} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full flex items-center">
                  <span>{certification}</span>
                  <button
                    type="button"
                    onClick={() => removeCertification(index)}
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
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Add a certification"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addCertification}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          
          {/* Courses Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Courses You Teach</label>
              <button
                type="button"
                onClick={() => setShowCourseForm(true)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                disabled={showCourseForm}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                Add Course
              </button>
            </div>
            
            {/* Course Form */}
            {showCourseForm && (
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h4 className="font-medium text-gray-800 mb-2">
                  {editingCourseIndex >= 0 ? 'Edit Course' : 'Add New Course'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                    <input
                      type="text"
                      value={courseInput.name}
                      onChange={(e) => setCourseInput({...courseInput, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
                    <textarea
                      value={courseInput.description}
                      onChange={(e) => setCourseInput({...courseInput, description: e.target.value})}
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Level</label>
                    <select
                      value={courseInput.level}
                      onChange={(e) => setCourseInput({...courseInput, level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelCourseEdit}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addCourse}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingCourseIndex >= 0 ? 'Update' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Course List */}
            <div className="space-y-3">
              {teachingCourses.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No courses added yet</p>
              ) : (
                teachingCourses.map((course, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{course.name}</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editCourse(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCourse(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                        {course.level}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <FontAwesomeIcon icon={faSave} className="mr-2" />
              Save Professional Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherProfileForm; 