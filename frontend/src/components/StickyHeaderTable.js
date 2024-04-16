import React, { useState, useEffect, useCallback, memo } from 'react';
import { useDashboard } from './Dashboard';

const StickyHeaderTable = memo(({ columns, fetchData, pageSize }) => {
    const [rows, setRows] = useState([]);
    const { dataWindow, uploadedRows } = useDashboard();
    
    const loadItems = useCallback(async (rowsLength) => {
        try {
            const firstRow = Math.max((dataWindow.pageNumber - 1) * pageSize + 1, 1);
            const startRow = rowsLength + firstRow;
            const numRows = pageSize;
            // Fetch new data if not in cache
            try {
                const data = await fetchData(startRow, numRows);
                return data;
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        } finally {
        }
    }, [fetchData, pageSize, dataWindow]);

    const addMoreRows = useCallback((prevCount) => {
        loadItems(prevCount).then(fetchedRows => {
            if (!fetchedRows || fetchedRows.length === 0) {
                return;
            }
            setRows(prevRows => {
                if (prevRows.length === prevCount) {
                    return [...prevRows, ...fetchedRows];
                }
                return prevRows;
            });
        }).catch(error => {
            console.error('Error fetching data:', error);
        });
    }, [loadItems]); // Keeping rows.length to re-instantiate the callback when rows change
    
    useEffect(() => {
        if (dataWindow?.is_dataset) {
            setRows([]);
        }
    }, [dataWindow, addMoreRows]); // Combine into a single effect if appropriate

    useEffect(() => {
        if (rows.length === 0)
            addMoreRows(0);
    }, [rows, addMoreRows]);

    const handleScroll = useCallback((event) => {
        if (rows.length >= uploadedRows) {
            return;
        }
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
        //if (scrollHeight - scrollTop <= clientHeight * 1.5) { // Check if near bottom
        if ((scrollTop + clientHeight) * 1.2 > scrollHeight) {
            addMoreRows(rows.length);
        }
    }, [addMoreRows, rows, uploadedRows]); 

    function mapRow(row) {
        // Use the exceptions mapped in the last column to draw some cells with
        // a different background color. Exception map is of the form:
        // { colname: value, ...}. Add the exception value as a mouse-over hint.
        const exceptions = row[row.length - 1];
        return row.slice(0, -1).map((cell, cellIndex) => {
            const col = columns[cellIndex];
            if (exceptions && exceptions[col.accessor]) {
                return (
                    <td key={cellIndex} className="exception">{exceptions[col.accessor]}</td> 
                );
            }
            const cellValue = col.cellRenderer({'colName': col.accessor, 'value': cell });
            return <td key={cellIndex}>{cellValue}</td>;
        });
    }
    
    return (
        <div className="table-grid-container" onScroll={handleScroll}>
            <table>
                <thead>
                    <tr>{columns.map(col => <th key={col.accessor}>{col.Header}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {mapRow(row)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default StickyHeaderTable;
