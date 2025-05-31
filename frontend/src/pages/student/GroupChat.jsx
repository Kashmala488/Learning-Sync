import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faArrowLeft, 
  faUsers, 
  faInfoCircle,
  faImage,
  faSmile,
  faEllipsisV,
  faFile,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileAlt,
  faTimes,
  faDownload,
  faPaperclip
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast } from 'react-toastify';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:4000/api';
const BASE_URL = 'http://localhost:4000'; // Add base URL for file access

const GroupChat = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const [userId, setUserId] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Get the current user's ID
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
      setUserId(user.id);
    }
  }, []);

  const fetchGroup = async () => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroup(response.data);
    } catch (err) {
      console.error('Error fetching group:', err);
      setError('Failed to load group information. Please try again.');
    }
  };

  const fetchMessages = async () => {
    if (!groupId) return;
    
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching group messages:', err);
      setError('Failed to load messages. Please try again.');
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() && !selectedFile) return;
    
    try {
      if (selectedFile) {
        setUploadingFile(true);
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (messageInput.trim()) {
          formData.append('content', messageInput);
        }
        
        await axios.post(`${API_URL}/groups/${groupId}/message/file`, 
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        setSelectedFile(null);
        setUploadingFile(false);
      } else {
        await axios.post(`${API_URL}/groups/${groupId}/message`, 
          { content: messageInput },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      }
      
      setMessageInput('');
      fetchMessages(); // Refresh messages after sending
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message:', err);
      setUploadingFile(false);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial fetch of group and messages
  useEffect(() => {
    if (groupId) {
      fetchGroup();
      fetchMessages();
    } else {
      navigate('/student/groups');
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [groupId, navigate]);

  // Setup polling for new messages
  useEffect(() => {
    if (groupId) {
      // Poll every 5 seconds for new messages
      refreshIntervalRef.current = setInterval(fetchMessages, 5000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [groupId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to safely check if current user is sender
  const isCurrentUserSender = (message) => {
    if (!message || !userId) return false;
    
    // Handle different message formats
    if (message.sender && message.sender._id) {
      return message.sender._id === userId;
    } else if (message.sender && typeof message.sender === 'string') {
      return message.sender === userId;
    }
    
    return false;
  };

  // Helper function to get sender name
  const getSenderName = (message) => {
    if (!message) return 'Unknown User';
    
    if (message.sender && message.sender.name) {
      return message.sender.name;
    } else if (message.senderName) {
      return message.senderName;
    }
    
    return 'Unknown User';
  };

  // Helper function to format date
  const formatMessageDate = (timestamp) => {
    const date = new Date(timestamp || Date.now());
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
        ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Helper function to get file icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return faFile;
    
    if (fileType.includes('image')) return faImage;
    if (fileType.includes('pdf')) return faFilePdf;
    if (fileType.includes('word') || fileType.includes('doc')) return faFileWord;
    if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv')) return faFileExcel;
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return faFilePowerpoint;
    
    return faFileAlt;
  };

  // Helper function to get proper URL for files
  const getFileUrl = (relativeUrl) => {
    if (!relativeUrl) return '';
    
    // If the URL already starts with http/https, return as is
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    // Otherwise, prepend the base URL
    return `${BASE_URL}${relativeUrl}`;
  };

  // Helper function to render message content
  const renderMessageContent = (message) => {
    // Handle shared resources
    if (message.resourceId) {
      // Extract the resource ID properly, handling both string IDs and object references
      const resourceId = typeof message.resourceId === 'object' && message.resourceId._id 
        ? message.resourceId._id 
        : message.resourceId;
        
      return (
        <div className="mt-2">
          <p className="mb-2">{message.content}</p>
          <div 
            className="flex items-center mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
            onClick={() => navigate(`/resources/${resourceId}`)}
          >
            <FontAwesomeIcon 
              icon={faFileAlt} 
              className="mr-3 text-blue-600" 
              size="lg"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700">View Learning Resource</p>
              <p className="text-xs text-blue-600">Click to open the shared resource</p>
            </div>
          </div>
        </div>
      );
    }
    
    // Handle file attachments
    if (message.fileUrl) {
      const isImage = message.fileType && message.fileType.startsWith('image/');
      const fullFileUrl = getFileUrl(message.fileUrl);
      
      return (
        <div className="mt-2">
          {message.content && <p className="mb-2">{message.content}</p>}
          
          {isImage ? (
            <div className="mt-1">
              <img 
                src={fullFileUrl} 
                alt="Shared image" 
                className="max-w-full rounded-lg shadow-sm max-h-80 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => window.open(fullFileUrl, '_blank')}
              />
            </div>
          ) : (
            <div className="flex items-center mt-1 p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
              <FontAwesomeIcon 
                icon={getFileIcon(message.fileType)} 
                className="mr-2 text-gray-600" 
                size="lg"
              />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{message.fileName}</p>
                <p className="text-xs text-gray-500">{message.fileSize ? `${Math.round(message.fileSize / 1024)} KB` : ''}</p>
              </div>
              <a 
                href={fullFileUrl} 
                download={message.fileName}
                className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faDownload} />
              </a>
            </div>
          )}
        </div>
      );
    }
    
    // Regular text message
    return <p className="mt-1">{message.content}</p>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => navigate('/student/groups')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Groups
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Chat Header */}
        <div className="bg-white border-b shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/student/groups')}
                className="mr-4 text-gray-600 hover:text-gray-800"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{group?.name || 'Group Chat'}</h1>
                <p className="text-sm text-gray-500">
                  {group?.subject} • {group?.members?.length || 0} members
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setShowMembers(!showMembers)}
                className="ml-2 p-2 rounded-full hover:bg-gray-100"
                title="Group Members"
              >
                <FontAwesomeIcon icon={faUsers} />
              </button>
              <button 
                className="ml-2 p-2 rounded-full hover:bg-gray-100"
                title="Group Info"
              >
                <FontAwesomeIcon icon={faInfoCircle} />
              </button>
              <button 
                className="ml-2 p-2 rounded-full hover:bg-gray-100"
                title="More Options"
              >
                <FontAwesomeIcon icon={faEllipsisV} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div 
                      key={message._id || index} 
                      className={`flex ${isCurrentUserSender(message) ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[75%] rounded-lg p-3 shadow-sm ${
                          isCurrentUserSender(message)
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        {!isCurrentUserSender(message) && (
                          <div className="font-semibold text-xs">
                            {getSenderName(message)}
                          </div>
                        )}
                        {renderMessageContent(message)}
                        <div className="text-xs text-right mt-1 opacity-75">
                          {formatMessageDate(message.timestamp || message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FontAwesomeIcon icon={faUsers} size="3x" className="mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to send a message in this group!</p>
                </div>
              )}
            </div>

            {/* Selected File Preview */}
            {selectedFile && (
              <div className="bg-gray-100 p-2 border-t flex items-center">
                <div className="flex items-center flex-1 bg-white rounded p-2 shadow-sm">
                  <FontAwesomeIcon 
                    icon={selectedFile.type.startsWith('image/') ? faImage : faFile} 
                    className="text-gray-500 mr-2"
                  />
                  <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                  <button 
                    onClick={removeSelectedFile}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t p-3 bg-white shadow-sm">
              <form onSubmit={sendMessage} className="flex items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
                <button 
                  type="button" 
                  onClick={triggerFileInput}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Attach File"
                  disabled={uploadingFile}
                >
                  <FontAwesomeIcon icon={faPaperclip} />
                </button>
                <button 
                  type="button" 
                  className="p-2 text-gray-500 hover:text-yellow-600 transition-colors mr-2"
                  title="Add Emoji"
                  disabled={uploadingFile}
                >
                  <FontAwesomeIcon icon={faSmile} />
                </button>
                <textarea 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={selectedFile ? "Add a caption (optional)" : "Type your message..."}
                  className="flex-1 border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="2"
                  disabled={uploadingFile}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageInput.trim() || selectedFile) sendMessage(e);
                    }
                  }}
                />
                <button 
                  type="submit"
                  className={`ml-2 ${uploadingFile ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white p-3 rounded-full flex items-center justify-center shadow-sm transition-colors`}
                  disabled={(!messageInput.trim() && !selectedFile) || uploadingFile}
                >
                  {uploadingFile ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Members Sidebar - conditionally shown */}
          {showMembers && (
            <div className="w-64 bg-white border-l overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Group Members</h3>
                <p className="text-sm text-gray-500">{group?.members?.length || 0} members</p>
              </div>
              <div className="p-2">
                {group?.members?.map((member, index) => (
                  <div key={index} className="flex items-center p-2 hover:bg-gray-50 rounded-md">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                      {typeof member === 'object' && member.name ? (
                        member.name.charAt(0).toUpperCase()
                      ) : (
                        'U'
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {typeof member === 'object' ? member.name : 'Unknown Member'}
                      </p>
                      {member.role && (
                        <p className="text-xs text-gray-500">{member.role}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupChat; 