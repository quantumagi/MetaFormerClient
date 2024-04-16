import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';
import TreeNavigation from './TreeNavigation';
import Datagrid from './Datagrid';
import UploadArea from './UploadArea';
import ColumnTypeEditor from './ColumnTypeEditor';
import TreeDataManager from './TreeDataManager';
import InferenceManager from './InferenceManager';
import axios from 'axios';

// Create the context
const DashboardContext = createContext();

// Create a Provider Component
export const DashboardProvider = ({ children }) => {
  const [dataWindow, setDataWindow] = useState({
        pageNumber: 1,
        pageSize: 1000,
        filter: '',
        tolerance: 0,
        preferred_types: []
    });

  const [treeManager, setTreeManager] = useState(() => new TreeDataManager({
      '': { name: 'Root', path: '', children: [], is_dataset: false }
  }));

  const [uploadedRows, setUploadedRows] = useState(0);
  const [inferredRows, setInferredRows] = useState(0);

  const updateDataWindow = useCallback((updates) => {
    setDataWindow(prev => ({ ...prev, ...updates }));
  }, [setDataWindow]); // dependency array contains the state setter

  const fetchTreeData = useCallback(async (nodePath, depth) => {
    try {
        const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/enumerate_datasets`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
            params: {
                path: nodePath,
                depth: depth
            }
        });
        if (response.status !== 200) {
            console.error(`Server responded with status: ${response.status}`);
            throw new Error(`Server responded with status: ${response.status}`);
        }
        return response.data;
    } catch (error) {
        console.error("API call failed:", error);
        return null;  // Returning null to indicate failure
    }
  }, []); 

  const getColumnType = useCallback((columnName) => {
    const node = treeManager.findNode(dataWindow.path)
    const schema = node.schema_data || {};
    const inferredTypes = schema.column_types?.[columnName] || {};
    const categoryValues = schema.category_values?.[columnName] || [];

    // Iterate through the types in the order defined in dataTypeToFriendlyName
    let selectedType = ['object', []];
    if (inferredTypes) {
        for (const dataTypeKey of ['bool', 'int8', 'int16', 'int32', 'int64', 'float32', 'float64', 'complex', 'timedelta', 'datetime_d', 'datetime_y', 'datetime', 'category', 'object']) {
            const count = inferredTypes[dataTypeKey];
            if (count !== undefined && count <= dataWindow.tolerance) {
                // Category is only selected if there are values
                if (dataTypeKey === 'category' && categoryValues.length === 0) {
                    continue;
                }
                selectedType = [dataTypeKey, categoryValues]; // Preserve the category values
                break; // Stop at the first type meeting the condition
            }
        }
    }

    return selectedType;
  }, [dataWindow, treeManager]);

  const getCursor = useCallback(() => {    
    return (dataWindow?.path) ? treeManager.findNode(dataWindow.path) : null;
  }, [dataWindow, treeManager]);

  const providerValue = useMemo(() => ({
    getCursor, dataWindow, setDataWindow, updateDataWindow, treeManager, setTreeManager, fetchTreeData, setUploadedRows, uploadedRows, setInferredRows, inferredRows, getColumnType
  }), [getCursor, dataWindow, updateDataWindow, treeManager, fetchTreeData, uploadedRows, inferredRows, getColumnType]);

  return (
      <DashboardContext.Provider value={providerValue}>
          {children}
      </DashboardContext.Provider>
  );
};

// Hook to use the Dashboard context
export const useDashboard = () => useContext(DashboardContext);

function Dashboard() {
  const [event] = useState(null);

  return (
    <DashboardProvider>
      <table><tbody><tr>
        <td valign="top"><table><tbody><tr>
          <td valign="top"><TreeNavigation/></td>
          </tr><tr>
          <td valign="top"><UploadArea /></td>
          </tr><tr>
          <td valign="top"><InferenceManager /></td>
        </tr></tbody></table></td>
        <td valign="top"><table><tbody><tr>
          <td valign="top"><ColumnTypeEditor onEvent={event} /></td>
          </tr><tr>
          <td valign="top" colSpan="2"><Datagrid onEvent={event} /></td>
        </tr></tbody></table></td>
      </tr></tbody></table>
    </DashboardProvider>
  );
}

export default Dashboard;
