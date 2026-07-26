import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ToastContainer';
import PluginLoader from './components/PluginLoader';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PluginLoader>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PluginLoader>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);