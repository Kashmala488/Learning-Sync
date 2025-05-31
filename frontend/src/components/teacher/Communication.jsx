import React, { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faUsers, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import DashboardLayout from '../layout/DashboardLayout';
import LoadingSpinner from '../../ui/LoadingSpinner';
import api from '../../utils/api';

const Communication = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [success, setSuccess] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const messagesEndRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const [userId, setUserId] = useState('');

  const API_URL = 'http://localhost:4000/api';

  useEffect(() => {
    // Get the current user's ID from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
      setUserId(user.id);
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsResponse, messagesResponse] = await Promise.all([
        api.get(`${API_URL}/teachers/students/progress`),
        api.get(`${API_URL}/teachers/messages`)
      ]);
      setStudents(studentsResponse.data);
      setMessages(messagesResponse.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Group messages by student
  const getStudentConversations = () => {
    const conversations = new Map();
    
    // Group messages by student
    messages.forEach(message => {
      const isFromMe = message.senderId._id === userId;
      let otherPersonId, otherPersonName;
      
      if (isFromMe) {
        // If I'm the sender, get the first recipient
        if (message.recipientIds && message.recipientIds.length > 0) {
          otherPersonId = message.recipientIds[0]._id;
          otherPersonName = message.recipientIds[0].name || 'Student';
        } else {
          return; // Skip if no recipient
        }
      } else {
        // If I'm the recipient, get the sender
        otherPersonId = message.senderId._id;
        otherPersonName = message.senderId.name;
      }
      
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post(`${API_URL}/teachers/message`, {
        recipientIds: selectedStudents,
        content: messageContent
      });
      setSuccess('Message sent successfully');
      setMessageContent('');
      setSelectedStudents([]);
      await fetchData();
      scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post(`${API_URL}/teachers/message`, {
        recipientIds: [selectedStudent.id],
        content: replyContent,
        parentMessageId: selectedStudent.lastMessage._id
      });
      setSuccess('Reply sent successfully');
      setReplyContent('');
      await fetchData();
      scrollToBottom();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    if (student && userId) {
      const studentMessages = messages.filter(msg => 
        msg.senderId._id === student.id && 
        !msg.isRead.includes(userId)
      );
      
      studentMessages.forEach(async (message) => {
      try {
        await api.put(`${API_URL}/teachers/messages/${message._id}/read`);
          
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
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Setup polling for new messages
  useEffect(() => {
    const pollForNewMessages = async () => {
      try {
        const messagesResponse = await api.get(`${API_URL}/teachers/messages`);
        
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
  }, [messages]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Scroll to bottom whenever messages change or student selected
  useEffect(() => {
    scrollToBottom();
  }, [selectedStudent, messages]);

  if (loading && messages.length === 0) return <LoadingSpinner />;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  const conversations = getStudentConversations();
  
  // Get the current conversation messages
  const currentMessages = selectedStudent ? 
    conversations.find(c => c.id === selectedStudent.id)?.messages || [] : [];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Communication</h1>

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
                    onClick={() => selectStudent(convo)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors duration-200 ${
                      selectedStudent?.id === convo.id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
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
                <p className="text-gray-600">No conversations</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md flex flex-col">
            {selectedStudent ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Chat with {selectedStudent.name}
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
                <form onSubmit={handleReply} className="mt-auto">
                  <div className="flex">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows="2"
                      placeholder="Type your reply..."
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

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
            Send New Message
          </h2>
          <form onSubmit={handleSendMessage}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Select Students</label>
              {students.length > 0 ? (
                <select
                  multiple
                  value={selectedStudents}
                  onChange={(e) => setSelectedStudents(Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full p-2 border rounded"
                >
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-600">No students available. Please assign students to your classes.</p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Message</label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows="5"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={students.length === 0}
              className={`px-4 py-2 rounded text-white ${
                students.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Communication;