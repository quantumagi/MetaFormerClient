import React, { useCallback, useState, useMemo } from 'react';
import axios from 'axios';
import { useDashboard } from './Dashboard';
import Card from './Card';
import StickyHeaderTable from './StickyHeaderTable';

const Datagrid = () => {
    const { getCursor, dataWindow, setDataWindow, updateDataWindow, getColumnType } = useDashboard();
    const [loading, setLoading] = useState(false);

    const raiseEvent = useCallback((onEvent) => {
        if (onEvent.type === 'pageSize') {
            updateDataWindow({pageSize: onEvent.value });
        }
        else if (onEvent.type === 'setPage') {
            updateDataWindow({pageNumber: onEvent.value });
        }
        else if (onEvent.type === 'gridLeft') {
            // setDataWindow(prev => ({ ...prev, ...updates }));
            setDataWindow(prevDataWindow => ({ ...prevDataWindow, ...{pageNumber: Math.max(1, prevDataWindow.pageNumber - 1)} }));
        }
        else if (onEvent.type === 'gridRight') {
            // setDataWindow(prev => ({ ...prev, ...updates }));
            setDataWindow(prevDataWindow => ({ ...prevDataWindow, ...{pageNumber: prevDataWindow.pageNumber + 1} }));
        }
    }, [setDataWindow, updateDataWindow]);
    
    // Memoize column definitions to avoid re-creating them on each render
    // Dynamically create column definitions based on preferred_types
    const columnDefs = useMemo(() => {
        function cellRenderer({ colName, value }) {
            // If its an object and its not complex then it can't be rendered
            const type = dataWindow.preferred_types.find(column => column.name === colName)?.type ?? getColumnType(colName)[0];

            if ((typeof value === 'object') !== (type === 'complex')) {
                return '';
            }

            switch (type) {
                case 'bool':
                    return value ? 'True' : 'False';
                case 'int8': case 'int16': case 'int32': case 'int64':
                    return value;
                case 'float32':
                    return parseFloat(Number(value).toPrecision(7));
                case 'float64':
                    return value;
                case 'complex':
                    return `${value.real.toFixed(2)} + ${value.imag.toFixed(2)}i`;
                case 'timedelta':
                    return formatTimeDelta(value);
                default:
                    return value;
            }
        }

        // Helper to format timedelta values
        function formatTimeDelta(value) {
            let seconds = value / 1e9; // convert nanoseconds to seconds
            let minutes = seconds / 60;
            seconds %= 60;
            let hours = minutes / 60;
            minutes %= 60;
            return `${Math.floor(hours)}h ${Math.floor(minutes)}m ${Math.floor(seconds)}s`;
        }

        return dataWindow?.preferred_types ? dataWindow.preferred_types.map(column  => ({
            Header: column.name,
            accessor: column.name,
            cellRenderer : cellRenderer
        })) : [];
    }, [dataWindow, getColumnType])

    const fetchRowData = useCallback(async (firstRow, numRows) => {
        if (!dataWindow?.path) {
            return [];
        }
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/download_data`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
                params: {
                    dataset_name: dataWindow.path,
                    start_row: firstRow,
                    num_rows: numRows,
                    tolerance: dataWindow.tolerance,
                    filter: dataWindow.filter,
                    preferred_types: JSON.stringify(dataWindow.preferred_types || [])
                }
            });
            const result = JSON.parse(response.data.rows);
            return result;
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    }, [dataWindow]);

    // Assuming StickyHeaderTable is already imported and set up to accept these props    
    return (
        <Card header="Data Grid"
            headerActions={[
                <span key="gridPageSizeLabel">Page-size:</span>,
                <select key="gridPageSizeSelect" value={dataWindow?.pageSize}
                  onChange={(e) => raiseEvent({type: 'pageSize', value: e.target.value, timestamp: new Date().getTime() })}
                  >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>,
              <button key="gridPageLeftButton" onClick={() => raiseEvent({type: 'gridLeft' })} disabled={dataWindow.pageNumber <= 1}>&lt;&lt;</button>,
              <input key="gridPageInput" onChange={(e) => raiseEvent({type: 'setPage', value: e.target.value})}  type="number" value={dataWindow?.pageNumber ?? 1} style={{ width: '50px' }} />,
              <button key="gridPageRightButton" onClick={() => raiseEvent({type: 'gridRight' })}>&gt;&gt;</button>  
            ]}>
            <StickyHeaderTable
                key={dataWindow.path}
                columns={columnDefs}
                fetchData={fetchRowData}
                loading={loading}
                pageSize={dataWindow.pageSize}
                totalUploadRows={getCursor()?.row_count}
            />
        </Card>
    );
};

export default Datagrid;
