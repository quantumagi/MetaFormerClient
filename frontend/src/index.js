import React from 'react';
import { createRoot } from 'react-dom/client'; // Import from react-dom/client
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Use the new createRoot API
const container = document.getElementById('root');
const root = createRoot(container); // Create a root.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
reportWebVitals();
