import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import './fontawesome';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { VideoCallProvider } from './contexts/VideoCallContext'; // Import VideoCallProvider
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Provider store={store}>
        <ErrorBoundary>
        <AuthProvider>
          <VideoCallProvider>
            <App />
          </VideoCallProvider>
        </AuthProvider>
        </ErrorBoundary>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();