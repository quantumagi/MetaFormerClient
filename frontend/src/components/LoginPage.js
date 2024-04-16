// LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, login, logout } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        login(username, password);
        if (isAuthenticated) {
          navigate('/'); // Redirect to home page upon successful login
        } else {
          // It's better to parse the error and display a message accordingly
          alert('Failed to login. Please check your username and password.');
        }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again later.');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
