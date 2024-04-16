
import React, { useState } from 'react'

const ValueListEditor = ({ existingValues, onSave, onClose }) => {
    // Ensure existingValues is converted to a string
    const [inputValue, setInputValue] = useState(existingValues.join ? existingValues.join(', ') : '');

    // Handle the save operation
    const handleSave = () => {
        // Check if inputValue is a string and then split it into an array
        onSave(inputValue.split(',').map(v => v.trim()));
    };

    // Handle the save operation
    const handleClose = () => {
        // Check if inputValue is a string and then split it into an array
        onClose();
    };

    return (
        <div>
            <textarea style={{width: '400px', height: '230px'}} value={inputValue} onChange={e => setInputValue(e.target.value)} />
            <div style={{textAlign: 'right'}}>
                <button onClick={handleSave}>Save</button>
                <button onClick={handleClose}>Close</button>
            </div>
        </div>
    );
};

export default ValueListEditor;