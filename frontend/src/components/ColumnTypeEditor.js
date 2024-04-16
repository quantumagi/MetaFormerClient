import React, { useState, useEffect, useCallback } from 'react';
import { useDashboard } from './Dashboard';
import Modal from './Modal';
import axios from 'axios';
import Card from './Card';
import ValueListEditor from './ValueListEditor';

// This component shows the live inference statistics (cursor.schema_data.column_types) as counts for each column in its type dropdown.
// In the drop-down list we automatocally select the first type meeting the tolerance requirement (dataWindow.tolerance)
// or a type selected by the user. User selected types (overrides) are recorded by the user overriding automatic inference 
// and hitting the apply button. The user can also manually set the type to 'category' and enter specific category values.
// cursor.schema_data.column_types is a dictionary of column names to their inferred types and exception counts:
// {
//     "column1": {
//         "int64": 100,
//         "float64": 10,
//         "object": 5
//     },
//     "column2": {
//         "int64": 100,
//         "float64": 10,
//     }
// }
//
// dataWindow.preferred_types is an ordered list of column names and optional preferred types:
// [
//     {"name": "column1", "type": "int64"},
//     {"name": "column2"}
// ]
const ColumnTypeEditor = () => {
    const { getCursor, dataWindow, updateDataWindow, getColumnType } = useDashboard();
    const [editedTypes, setEditedTypes] = useState((dataWindow && dataWindow.preferred_types) || []);
    const [showModal, setShowModal] = useState(false);
    const [currentColumn, setCurrentColumn] = useState(null);
    const [tolerance, setTolerance] = useState(0);

    // Initialize state from the global context
    useEffect(() => {
        setTolerance(dataWindow.tolerance || 0);
        setEditedTypes((dataWindow && dataWindow.preferred_types) || []);
    }, [dataWindow]);

    const haveChanges = () => {
        return JSON.stringify(editedTypes) !== JSON.stringify(dataWindow.preferred_types) || tolerance !== dataWindow.tolerance;
    };

    const handleTypeChange = (columnName, newType) => {
        setEditedTypes(prev => prev.map(column => (
            column.name === columnName ? { 
              ...column, 
              type: newType
            } : column
        )));
    };

    const handlePreferredChange = (clickedColumn) => {
        if (!clickedColumn.type) {
            setEditedTypes(prev => prev.map(column => (
                column.name === clickedColumn.name ? { ...column, type: getImpliedType(clickedColumn)[0], category_values: getImpliedType(clickedColumn)[1] } : column
            )));
        }
        else {
            setEditedTypes(prev => prev.map(column => (
                column.name === clickedColumn.name ? { name: clickedColumn.name } : column
            )));
        }
    };

    // Safe access to schema data from cursor
    const getTypeCount = (column, dataTypeKey) => {
        const inferredTypes = getCursor()?.schema_data?.column_types?.[column.name] || {};
        return inferredTypes[dataTypeKey] || 0;
    };

    const getImpliedType = (column) => {
        if (column.type) return [column.type, column.category_values];
        return bestInferredType(column.name);
    };

    const bestInferredType = (columnName) => {
        return getColumnType(columnName)
        /*
        const schema = getCursor()?.schema_data || {};
        const inferredTypes = schema.column_types?.[columnName] || {};
        const categoryValues = schema.category_values?.[columnName] || [];
    
        // Iterate through the types in the order defined in dataTypeToFriendlyName
        let selectedType = ['object', []];
        if (inferredTypes) {
            for (const dataTypeKey of dataTypes) {
                const count = inferredTypes[dataTypeKey];
                if (count !== undefined && count <= tolerance) {
                    selectedType = [dataTypeKey, categoryValues]; // Preserve the category values
                    break; // Stop at the first type meeting the condition
                }
            }
        }
    
        return selectedType; // Default to 'object' if no type meets the condition
        */
    };
    
    const handleCategoryEdit = (columnName) => {
        setCurrentColumn(columnName);
        setShowModal(true);
    };  

    const handleCategoryValuesSave = (columnName, categoryValues) => {
        setEditedTypes(prev => prev.map(column => (
            column.name === columnName ? { ...column, category_values: categoryValues } : column
        )));
        setShowModal(false);
    };
    
    const saveChanges = useCallback(async () => {
        const payload = {
            dataset_name: dataWindow.path,
            preferred_types: editedTypes,
            tolerance: tolerance
        };
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/preferred_types`, payload, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            // Check for success
            if (response.status !== 200) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating data:', error);
        }
    }, [editedTypes, dataWindow, tolerance]);

    const raiseEvent = useCallback((onEvent) => {
        if (onEvent.type === 'apply') {
            // Call the API to save the changes
            saveChanges();
            // Update the dataWindow with the new preferred types            
            updateDataWindow({preferred_types: editedTypes, tolerance: tolerance});
        }
    }, [updateDataWindow, editedTypes, tolerance, saveChanges]);
    
    const dataTypeToFriendlyName = {
        'int8': 'Small Integer',
        'int16': 'Short Integer',
        'int32': 'Integer',
        'int64': 'Large Integer',
        'float32': 'Small Floating Point',
        'float64': 'Large Floating Point',
        'complex': 'Complex Number',
        'timedelta': 'Time Duration',
        'datetime_d': 'Date (D/M/Y)',
        'datetime_y': 'Date (Y/M/D)',
        'datetime': 'Date (M/D/Y)',
        'category': 'Category',
        'object': 'Text',
      };
    const dataTypes = Object.keys(dataTypeToFriendlyName);
    return (
        <Card header="Column Statistics and Inference Overrides" 
            headerActions={[
                <span key="toleranceLabel">Exception Tolerance:</span>,
                <input key="toleranceGrid"
                    id="gridTolerance"
                    type="number"
                    placeholder="Tolerance"
                    value={tolerance}
                    onChange={(e) => setTolerance(parseFloat(e.target.value))}
                    style={{ marginRight: '10px', width: '50px'}}
                />,
                <button key="toleranceButton" onClick={() => raiseEvent({type: 'apply'})} disabled={!haveChanges()}>Apply</button>
            ]}>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th title="The grid column name">Column</th>
                            <th title="Current inferred or preferred type">Type (Exceptions)</th>
                            <th title="Check to lock in your choice" style={{ alignContent: 'center' }}>Override</th>
                            <th title="List of possible values for category types" style={{ width: '50%' }}>Values</th>
                        </tr>
                    </thead>
                    <tbody>                       
                        {editedTypes.map(column => (
                        <tr key={column.name}>
                            <td>{column.name}</td>
                            <td>
                                <select
                                    value={getImpliedType(column)[0]}
                                    onChange={(e) => handleTypeChange(column.name, e.target.value)}
                                >
                                    {dataTypes.map(dataTypeKey => (
                                        <option key={dataTypeKey} value={dataTypeKey}>
                                            {dataTypeToFriendlyName[dataTypeKey]} ({getTypeCount(column, dataTypeKey)})
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={column.type != null} onChange={(e) => handlePreferredChange(column)} />
                            </td>
                            <td>
                                {column?.type === 'category' && (
                                        <button onClick={() => handleCategoryEdit(column.name)}>...</button>
                                )}
                                {getImpliedType(column)[0] === 'category' && getImpliedType(column)[1]?.length > 0 && (
                                    <span>&nbsp;{getImpliedType(column)[1]?.join(', ')}</span>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>

            </div>
            {showModal && (
                <Modal onClose={() => setShowModal(false)}>
                    <ValueListEditor
                        existingValues={(editedTypes.find(column => column.name === currentColumn) || {}).category_values || []}
                        onSave={(categoryValues) => {
                            handleCategoryValuesSave(currentColumn, categoryValues);
                        }}
                        onClose={() => setShowModal(false)}
                    />
                </Modal>
                )}
        </Card>
    );
};

export default ColumnTypeEditor;