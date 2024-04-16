import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useDashboard } from './Dashboard';
import Card from './Card';

const UploadArea = () => {
    const { getCursor, treeManager, fetchTreeData } = useDashboard();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [message, setMessage] = useState('');
    const [uploadFolder, setUploadFolder] = useState('');

    /**
     * Updates the uploadFolder based on the cursor's position in the tree hierarchy.
     * If the cursor is not pointing at a node with children (i.e., not a folder), it ascends to the parent node.
     * Sets uploadFolder to the parent node's ID (represents the path), or to an empty string if no valid node is found.
     */
    useEffect(() => {
        let currentFolder = getCursor();
        // Move up to the parent if the current cursor is not a folder (does not have children)
        if (currentFolder && !currentFolder.children) {
            currentFolder = currentFolder.parent;
        }
        // Set uploadFolder to the node's ID or fallback to an empty string
        setUploadFolder(currentFolder?.path ?? '');
    }, [getCursor]);

    const onDrop = useCallback(acceptedFiles => {
        const file = acceptedFiles[0];
        if (!file) {
            console.log("No file uploaded.");
            return;
        }

        // Use a small slice of the file to find the header assuming the header is within the first 1024 bytes
        const firstChunk = file.slice(0, 1024);
        const reader = new FileReader();
        reader.onload = (event) => {             
            const content = event.target.result;
            const firstNewLine = content.indexOf('\n');
            let headers = content.substring(0, firstNewLine).split(',').map(header => header.trim());
    
            // Create column definitions based on the header
            const column_types = headers.map(header => ({ name: header }));
            const schema = {
                'na_values': ['NA', 'N/A', 'null', 'None', 'Not Available'],
                'max_categories': 100
            };
    
            // Prepare the remaining file for upload starting from just past the first newline
            const remainingFile = file.slice(firstNewLine + 1);
            const formData = new FormData();
            const path = uploadFolder ? `${uploadFolder}/${file.name}` : file.name;
            formData.append('file', remainingFile, path);
            formData.append('schema', JSON.stringify(schema));
            formData.append('column_types', JSON.stringify(column_types));

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                onUploadProgress: progressEvent => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            };

            axios.post(`${process.env.REACT_APP_API_BASE_URL}/upload_data`, formData, config)
                .then(response => {
                    setMessage(`File uploaded to ${path}`);
                    treeManager.refreshNode(getCursor(), fetchTreeData);
                })
                .catch(error => {
                    console.error('Error uploading file', error);
                    setMessage(`Upload of ${path} failed: ${error.message}`);
                });
        };

        reader.onerror = () => {
            console.error('Error reading the file');
        };

        // Read only the first chunk to find the header
        reader.readAsText(firstChunk, "UTF-8");
    }, [uploadFolder, getCursor, fetchTreeData, treeManager]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop });

    return (
        <Card header="Upload Area">
            <div {...getRootProps()} style={{ border: '2px dashed gray', padding: '20px', cursor: 'pointer' }}>
                <input {...getInputProps()} />
                <div style={{ textAlign: 'center' }}>
                <p>Targeting<br/>'{uploadFolder?.name ?? 'Root'}'</p>
                <p>{message}</p>
                {uploadProgress > 0 && <p>Upload Progress: {uploadProgress}%</p>}
                </div>
            </div>
        </Card>
    );
};

export default UploadArea;
