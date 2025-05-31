import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const ChatPanel = ({
  socket,
  roomId,
  currentUser,
  participants,
  messages,
  privateMessages,
  setMessages,
  setPrivateMessages,
}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [file, setFile] = useState(null);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, privateMessages, selectedUser]);

  const sendMessage = () => {
    if (!messageInput.trim() && !file) return;

    const messageData = { roomId };
    if (messageInput.trim()) {
      messageData.content = messageInput;
    }
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        messageData.file = {
          name: file.name,
          type: file.type,
          data: reader.result,
        };
        emitMessage(messageData);
        setMessageInput('');
        setFile(null);
      };
      reader.readAsDataURL(file);
    } else {
      emitMessage(messageData);
      setMessageInput('');
    }
  };

  const emitMessage = (messageData) => {
    if (selectedUser) {
      socket.emit('private-message', {
        roomId,
        to: participants.find((p) => p.id === selectedUser).socketId,
        ...messageData,
      });
    } else {
      socket.emit('group-message', messageData);
    }
  };

  return (
    <div className="w-[400px] bg-gray-800 shadow-lg flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
        <select
          value={selectedUser || ''}
          onChange={(e) => setSelectedUser(e.target.value || null)}
          className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1"
        >
          <option value="">Group Chat</option>
          {participants
            .filter((p) => p.id !== currentUser._id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>
      <div ref={chatRef} className="flex-1 p-4 overflow-y-auto">
        {(selectedUser ? privateMessages[selectedUser] || [] : messages).map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${msg.senderId === currentUser._id ? 'text-right' : ''}`}
          >
            <p className="text-sm text-gray-400">
              {msg.senderName} - {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
            {msg.content && (
              <p
                className={`inline-block p-2 rounded-lg ${
                  msg.senderId === currentUser._id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {msg.content}
              </p>
            )}
            {msg.file && (
              <div>
                {msg.file.type.startsWith('image/') ? (
                  <img src={msg.file.data} alt={msg.file.name} className="max-w-xs rounded" />
                ) : (
                  <a
                    href={msg.file.data}
                    download={msg.file.name}
                    className="text-blue-400 hover:underline"
                  >
                    {msg.file.name}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-700">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) =>
            e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())
          }
          placeholder="Type a message..."
          className="w-full border border-gray-600 bg-gray-700 text-white rounded p-2 mb-2"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2 text-white"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg w-full hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;