import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDashboard } from './Dashboard';
import Card from './Card';
import Modal from './Modal';
import ValueListEditor from './ValueListEditor';
import UploadArea from './UploadArea';

const InferenceManager = ({ filePath }) => {
    const { dataWindow, getCursor, treeManager, fetchTreeData, uploadedRows, setUploadedRows, inferredRows, setInferredRows } = useDashboard();
    const [uploadComplete, setUploadComplete] = useState(false);
    const [inferenceStatus, setInferenceStatus] = useState({});
    const [na_values, setNaValues] = useState([]);
    const [max_categories, setMaxCategories] = useState(100);
    const [showModal, setShowModal] = useState(false);
    const [cursor, setCursor] = useState(null);

    // Function to fetch the status from the server
    const fetchStatus = useCallback(async (force) => {
        try {
            const node = getCursor();
            if (!node || !treeManager) {
                return;
            }
            // If nothing will happen unless action is taken
            // then there is no sense in listening for updates
            if (!force) {
                // Unless there's an in-progress process or incomplete upload nothing will happen.
                if (uploadComplete) {
                    if (!inferenceStatus || inferenceStatus === 'SUCCESS') return;
                }
            }

            await treeManager.refreshNode(node, fetchTreeData);
            setUploadedRows(node?.row_count ?? 0);
            setInferredRows((node?.schema_data?.position ?? 1) - 1);
            if (node?.completed !== uploadComplete) {
                setUploadComplete(node?.completed ?? false);
            }
            if (node?.inference_status !== inferenceStatus) {
                setInferenceStatus(node?.inference_status);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    }, [getCursor, fetchTreeData, treeManager, inferenceStatus, uploadComplete, setInferredRows, setUploadedRows, setUploadComplete]);

    useEffect(() => {
        const node = getCursor();
        if (node && cursor?.path !== node.path) {
            setCursor(node);

            setNaValues(node?.schema_data?.na_values ?? ['N/A', 'Not Available', '-', '<NA>', 'None']);
            setMaxCategories(node?.schema_data?.max_categories ?? 100);
        }
    },[getCursor, cursor, na_values, max_categories]);

    const isInferenceComplete = () => {
        return (uploadComplete && inferredRows === uploadedRows);
    }

    const canStartInference = () => {
        return (inferenceStatus !== 'STARTED' && inferenceStatus !== 'PENDING' && inferenceStatus !== 'SUCCESS') && !isInferenceComplete();
    }

    // Function to send a stop or restart command to the server
    const sendCommand = async (command) => {
        try {
            const schema = {
                'na_values': na_values,
                'max_categories': parseInt(max_categories)
            };
            const payload = {
                dataset_name: dataWindow.path,
                command: command,
                schema: JSON.stringify(schema)
            };
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/manage_inference`, payload, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });

            if (command === 'start') {
                setInferenceStatus('PENDING');                
            } if (command === 'reset') {
                setInferenceStatus('STOPPED');
            }

            if (response.status !== 200) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error posting command', error);
        }
    };

    // Polling the status every few seconds
    useEffect(() => {
        // Wrap the aync "fetchStatus" function for use in a setInterval
        const pollStatus = async () => {
            await fetchStatus(false);
        };
        const intervalId = setInterval(pollStatus, 5000); // Poll every 5 seconds
        return () => clearInterval(intervalId);        
    }, [fetchStatus]);

    useEffect(() => {
        const pollStatus = async () => {
            await fetchStatus(true);
        };
        pollStatus();
    }, [fetchStatus, dataWindow]);

    if (!dataWindow?.path)
    {
        return <Card header="Inference Manager" />;
    }

    function handleNAValuesSave(newValues) {
        setNaValues(newValues);
        const node = getCursor();
        if (node) {
            node.schema_data.na_values = newValues;
            treeManager.updateNode(node.schema_data, node);
            treeManager.refreshNode(node, fetchTreeData);
        }
        setShowModal(false);
    }

    // Display buttons to either stop inference or restart inference depending on the running status
    return (
        <Card  header="Inference Manager"><div style={{ textAlign: 'center' }}>
            Max Categories: <input style={{width:'50px'}} type="number" value={max_categories} onChange={(e) => setMaxCategories(e.target.value)} /><br/>
            {uploadComplete && <p>Upload Completed ({uploadedRows} rows)</p>}
            {!uploadComplete && <p>Upload In Progress ({uploadedRows} rows)</p>}
            {canStartInference() && (
            <>
                <p>Inference {isInferenceComplete() ? 'Complete' : getCursor()?.inference_status ?? 'Stopped'}</p>
                {inferredRows === 0 && (
                    <>
                    <button onClick={() => setShowModal(true)}>NA Values</button>&nbsp;&nbsp;
                    </>
                )}
                <button onClick={() => sendCommand('start')}>Start Inference</button>
                </>
            )}
            {!canStartInference() && (
            <>
                {isInferenceComplete() && <p>Inference Complete ({inferredRows} rows)</p>}
                {!isInferenceComplete() && <p>Inference Running ({inferredRows} rows)</p>}
                <button onClick={() => setShowModal(true)}>NA Values</button>&nbsp;&nbsp;
                <button onClick={() => sendCommand('reset')}>Reset Inference</button>
            </>
            )}
            </div>
            
            {showModal && (
                <Modal onClose={() => setShowModal(false)}>
                    <ValueListEditor
                        existingValues={na_values}
                        onSave={(newValues) => { handleNAValuesSave(newValues); }}
                        onClose={() => setShowModal(false)}
                    />
                </Modal>
                )}
        </Card>
    );
};

export default InferenceManager;
