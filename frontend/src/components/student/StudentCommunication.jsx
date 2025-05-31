import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faEnvelope, faUser } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:4000/api';

const StudentCommunication = () => {
  const { token, userRole, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [success, setSuccess] = useState(null);
  const [userId, setUserId] = useState('');
  const messagesEndRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    // Get the current user's ID from localStorage
    if (currentUser?.id) {
      setUserId(currentUser.id);
    } else {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.id) {
        setUserId(user.id);
      }
    }
  }, [currentUser]);

  // Group messages by mentor
  const getMentorConversations = () => {
    const conversations = new Map();
    
    // Group messages by mentor/sender ID
    messages.forEach(message => {
      const isFromMe = message.senderId._id === userId;
      const otherPersonId = isFromMe 
        ? message.recipientIds[0]._id
        : message.senderId._id;
      const otherPersonName = isFromMe
        ? (message.recipientIds[0].name || 'Mentor')
        : message.senderId.name;
      
      if (!conversations.has(otherPersonId)) {
        conversations.set(otherPersonId, {
          id: otherPersonId,
          name: otherPersonName,
          messages: [],
          lastMessage: null,
          unreadCount: 0
        });
      }
      
      const conversation = conversations.get(otherPersonId);
      conversation.messages.push(message);
      
      // Count unread messages
      if (!isFromMe && !message.isRead.includes(userId)) {
        conversation.unreadCount++;
      }
      
      // Update last message
      if (!conversation.lastMessage || 
          new Date(message.createdAt) > new Date(conversation.lastMessage.createdAt)) {
        conversation.lastMessage = message;
      }
    });
    
    // Sort messages in each conversation by date
    conversations.forEach(conversation => {
      conversation.messages.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
    });
    
    // Convert Map to array and sort by latest message date
    return Array.from(conversations.values())
      .sort((a, b) => 
        new Date(b.lastMessage?.createdAt || 0) - 
        new Date(a.lastMessage?.createdAt || 0)
      );
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch messages
      const messagesResponse = await axios.get(`${API_URL}/students/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(messagesResponse.data);
      
      // Fetch groups to get mentors
      const groupsResponse = await axios.get(`${API_URL}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Extract unique mentors from groups
      const uniqueMentors = [];
      const mentorIds = new Set();
      
      groupsResponse.data.forEach(group => {
        if (group.mentor && !mentorIds.has(group.mentor._id)) {
          mentorIds.add(group.mentor._id);
          uniqueMentors.push({
            id: group.mentor._id,
            name: group.mentor.name,
            groupName: group.name
          });
        }
      });
      
      setMentors(uniqueMentors);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedMentor || !messageContent.trim()) {
      setError('Please select a mentor and enter a message');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/students/message`, {
        mentorId: selectedMentor.id,
        content: messageContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Message sent successfully');
      setMessageContent('');
      
      // Add the new message to the existing messages
      const newMessage = response.data.data;
      setMessages(prevMessages => [...prevMessages, {
        _id: newMessage.id,
        senderId: { _id: userId, name: currentUser?.name || 'You' },
        recipientIds: [{ _id: selectedMentor.id, name: selectedMentor.name }],
        content: newMessage.content,
        createdAt: newMessage.createdAt,
        isRead: []
      }]);
      
      // Scroll to bottom of message list
      scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectMentor = (mentor) => {
    setSelectedMentor(mentor);
    
    // Mark all messages from this mentor as read
    if (mentor && userId) {
      const mentorMessages = messages.filter(msg => 
        msg.senderId._id === mentor.id && 
        !msg.isRead.includes(userId)
      );
      
      mentorMessages.forEach(async (message) => {
        try {
          await axios.put(`${API_URL}/students/messages/${message._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Update message read status in the UI
          setMessages(prevMessages => 
            prevMessages.map(m => 
              m._id === message._id ? { ...m, isRead: [...m.isRead, userId] } : m
            )
          );
        } catch (err) {
          console.error('Error marking message as read:', err);
        }
      });
    }
    
    // Scroll to bottom of message list after selecting a mentor
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Setup polling for new messages
  useEffect(() => {
    const pollForNewMessages = async () => {
      if (!token) return;
      
      try {
        const messagesResponse = await axios.get(`${API_URL}/students/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Only update if we have new or different messages
        if (messagesResponse.data.length !== messages.length) {
          setMessages(messagesResponse.data);
        } else {
          // Check if any message content changed
          const hasChanges = messagesResponse.data.some((newMsg, i) => {
            const oldMsg = messages[i];
            return !oldMsg || 
                   newMsg._id !== oldMsg._id || 
                   newMsg.content !== oldMsg.content ||
                   newMsg.isRead.length !== oldMsg.isRead.length;
          });
          
          if (hasChanges) {
            setMessages(messagesResponse.data);
          }
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    };
    
    // Poll every 10 seconds
    refreshIntervalRef.current = setInterval(pollForNewMessages, 10000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [token, messages]);

  useEffect(() => {
    if (token) {
      fetchData();
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [token]);

  // Scroll to bottom whenever messages change or mentor selected
  useEffect(() => {
    scrollToBottom();
  }, [selectedMentor, messages]);

  if (loading && messages.length === 0) return <LoadingSpinner />;

  const conversations = getMentorConversations();
  
  // Get the current conversation messages
  const currentMessages = selectedMentor ? 
    conversations.find(c => c.id === selectedMentor.id)?.messages || [] : [];

  return (
    <DashboardLayout role={userRole}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Communication with Mentors</h1>

        {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-4">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
              Conversations
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {conversations.length > 0 ? (
                conversations.map(convo => (
                  <div
                    key={convo.id}
                    onClick={() => selectMentor({id: convo.id, name: convo.name})}
                    className={`p-4 rounded-lg cursor-pointer transition-colors duration-200 ${
                      selectedMentor?.id === convo.id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
                    } ${convo.unreadCount > 0 ? 'border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{convo.name}</p>
                        <p className="text-sm text-gray-600 truncate">
                          {convo.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      {convo.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 ml-2">
                          {convo.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {convo.lastMessage ? new Date(convo.lastMessage.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No conversations with mentors yet</p>
              )}
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Start a new conversation</h3>
              <select
                value={selectedMentor?.id || ''}
                onChange={(e) => {
                  const mentor = mentors.find(m => m.id === e.target.value);
                  if (mentor) {
                    selectMentor(mentor);
                  } else {
                    setSelectedMentor(null);
                  }
                }}
                className="w-full p-2 border rounded"
              >
                <option value="">-- Select a Mentor --</option>
                {mentors.map(mentor => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name} ({mentor.groupName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex flex-col">
            {selectedMentor ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Chat with {selectedMentor.name}
                </h2>
                <div className="flex-1 overflow-y-auto mb-4 max-h-[400px] border rounded-lg p-4">
                  {currentMessages.length > 0 ? (
                    <div className="space-y-4">
                      {currentMessages.map(message => (
                        <div 
                          key={message._id}
                          className={`flex ${message.senderId._id === userId ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 
                              ${message.senderId._id === userId 
                                ? 'bg-blue-100 text-blue-900' 
                                : 'bg-gray-100 text-gray-900'
                              }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs text-gray-500 mt-1 text-right">
                              {new Date(message.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">
                      No messages yet. Start a conversation!
                    </p>
                  )}
                </div>
                <form onSubmit={handleSendMessage} className="mt-auto">
                  <div className="flex">
                    <textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="2"
                      placeholder="Type your message..."
                      required
                    ></textarea>
                    <button
                      type="submit"
                      className="px-4 bg-blue-600 text-white rounded-r hover:bg-blue-700"
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-600">
                  <FontAwesomeIcon icon={faEnvelope} size="3x" className="mb-4 text-gray-400" />
                  <p>Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentCommunication; 