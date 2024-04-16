// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

// Provide a hook to access the context
export const useAuth = () => useContext(AuthContext);

// Define a provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if the user is already authenticated based on local storage
    return localStorage.getItem('accessToken') !== null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      const decodedToken = jwtDecode(accessToken);
      // Check if the token is expired
      if (decodedToken.exp * 1000 < Date.now()) {
        logout();
      } else {
        setIsAuthenticated(true);
        setCurrentUser(decodedToken);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    // Replace this URL with your JWT authentication endpoint
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.access); // Consider more secure storage options
      localStorage.setItem('refreshToken', data.refresh); // Consider more secure storage options

      const decodedToken = jwtDecode(data.access);
      setIsAuthenticated(true);
      setCurrentUser(decodedToken);
    } else {
      throw new Error('Failed to login');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    try {
      console.log('Refreshing access token');
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available.');
  
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
  
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.access);
        const decodedToken = jwtDecode(data.access);
        setIsAuthenticated(true);
        setCurrentUser(decodedToken);
        console.log('Refreshed token');
      } else {
        throw new Error(`Token refresh failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      logout(); // Logout user if there is an error refreshing token
    }
  };

  // Set up a timer to refresh the token before it expires
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      logout();
      return undefined;
    }

    const decodedToken = jwtDecode(accessToken);
    const expTime = decodedToken.exp * 1000; // Convert to milliseconds
    const buffer = 10 * 1000; // 10 seconds before token expires
    const timeoutDuration = expTime - Date.now() - buffer;

    if (timeoutDuration <= 0) {
      refreshAccessToken(); // Refresh immediately if token is expired or about to expire
    } else {
      const timer = setTimeout(refreshAccessToken, timeoutDuration);
      return () => clearTimeout(timer); // Cleanup on unmount or refresh
    }
  }, [currentUser]); // Dependency on currentUser to set up a new timer when it changes
  
  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
