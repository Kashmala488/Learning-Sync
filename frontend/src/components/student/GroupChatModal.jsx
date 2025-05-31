import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faTimes, 
  faUsers, 
  faImage, 
  faFile,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileAlt,
  faDownload,
  faPaperclip,
  faSmile
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:4000/api';
const BASE_URL = 'http://localhost:4000'; // Add base URL for file access

const GroupChatModal = ({ group, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const [userId, setUserId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get the current user's ID
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
      setUserId(user.id);
    }
  }, []);

  const fetchMessages = async () => {
    if (!group || !group._id) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/groups/${group._id}/messages`, {
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
      const token = localStorage.getItem('token');
      
      if (selectedFile) {
        setUploadingFile(true);
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (messageInput.trim()) {
          formData.append('content', messageInput);
        }
        
        await axios.post(`${API_URL}/groups/${group._id}/message/file`, 
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
        await axios.post(`${API_URL}/groups/${group._id}/message`, 
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

  // Initial fetch of messages
  useEffect(() => {
    if (isOpen && group) {
      fetchMessages();
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen, group]);

  // Setup polling for new messages
  useEffect(() => {
    if (isOpen && group) {
      // Poll every 5 seconds for new messages
      refreshIntervalRef.current = setInterval(fetchMessages, 5000);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen, group]);

  // Scroll to bottom when messages change or modal opens
  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);
  
  if (!isOpen) return null;

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
            onClick={() => {
              onClose(); // Close the modal first
              navigate(`/resources/${resourceId}`); // Then navigate to resource
            }}
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
    
    return <p className="mt-1">{message.content}</p>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faUsers} className="text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold">{group.name} - Group Chat</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 p-4">{error}</div>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
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
                      {formatMessageDate(message.timestamp || message.createdAt || Date.now())}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              No messages yet. Start the conversation!
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
        <form onSubmit={sendMessage} className="border-t p-3 bg-white shadow-sm">
          <div className="flex items-end">
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
          </div>
        </form>
        
        {/* Group Members */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Group Members ({group.members?.length || 0})</h3>
          <div className="flex flex-wrap gap-2">
            {group.members?.map((member, index) => (
              <span key={index} className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs">
                {typeof member === 'object' ? member.name : 'Unknown Member'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatModal; 