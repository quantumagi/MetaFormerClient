// File: Modal.js
import React from 'react';

const Modal = ({ children, onClose }) => {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex:1000, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: 20 }}>
                {children}
            </div>
        </div>
    );
};

export default Modal;
