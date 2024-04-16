import React, { useEffect, useCallback } from 'react';
import { useDashboard } from './Dashboard';
import TreeDataManager from './TreeDataManager';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import Card  from './Card';

const TreeNavigation = () => {
    const { dataWindow, setDataWindow, treeManager, setTreeManager, fetchTreeData } = useDashboard();
    const [expandedItems, setExpandedItems] = React.useState([]);

    // Function to handle expanded items change
    const handleExpandedItemsChange = (event, itemIds) => {
        treeManager.setExpandedItems(itemIds);
        if (event.clientX < 30) {
            setExpandedItems(itemIds);
        }
        setTreeManager(prevManager => new TreeDataManager(prevManager.getTree()));
    };
    
    const switchDataWindow = useCallback((path) => {
        if (path !== dataWindow.path) {
            // Find the old cursor node
            if (dataWindow.path) {
                const oldCursor = treeManager.findNode(dataWindow.path);
                if (oldCursor) {
                    oldCursor.dataWindow = {...dataWindow}; // Ensure a shallow copy is stored
                }
            }
            // Deep clone the node's dataWindow to avoid modifying the original object
            const cursor = treeManager.findNode(path);
            const nodeDataWindow = cursor?.dataWindow ? JSON.parse(JSON.stringify(cursor.dataWindow)) : null;
            const newWindow = {
                pageNumber: nodeDataWindow?.pageNumber ?? 1,
                pageSize: nodeDataWindow?.pageSize ?? dataWindow.pageSize ?? 100,
                filter: nodeDataWindow?.filter ?? '',
                tolerance: nodeDataWindow?.tolerance ?? dataWindow.tolerance ?? 0,
                preferred_types: nodeDataWindow?.preferred_types ?? [],
                path: cursor?.path,
                is_dataset: cursor?.children ? false : true
            };
            setDataWindow(newWindow);
        }
    }, [dataWindow, treeManager, setDataWindow]);

    // Function to handle click events on tree nodes
    const handleClick = async (nodePath) => {
        switchDataWindow(nodePath);
    };

    useEffect(() => {
        // If the root node already has children do nothing
        if (treeManager.getTree() && treeManager.getTree()['']['children'].length !== 0) return;

        const updateTree = async () => {
            if (await treeManager.updateNodeChildren(treeManager.getTree()[''], fetchTreeData)) {
                setTreeManager(prevManager => new TreeDataManager(prevManager.getTree()));
            }
        };

        updateTree();
    }, [treeManager, setTreeManager, fetchTreeData]);

    useEffect(() => {
        const updateNodeChildren = async () => {
            if (!dataWindow?.path) return;
            const node = treeManager.findNode(dataWindow.path);
            if (!node || node.is_dataset) return;
    
            const childrenUpdated = await treeManager.updateNodeChildren(node, fetchTreeData);
            if (childrenUpdated) {
                setTreeManager(prevManager => new TreeDataManager(prevManager.getTree()));
            }
        };
    
        updateNodeChildren().catch(error => console.error('Failed to update node children:', error));
    }, [treeManager, setTreeManager, dataWindow, fetchTreeData]); // Note: Using dataWindow.path if other properties in dataWindow are not relevant
    
    // Function to render tree items recursively
    const renderTreeItems = (node) => {
        return (
            <TreeItem 
                key={node.path}
                itemId={node.path}
                label={node.name} 
                onClick={() => handleClick(node.path)}>
                {node.children && Object.values(node.children).map(child => renderTreeItems(child))}
            </TreeItem>
        );
    };

    // Render the SimpleTreeView component
    return (
        <Card className="tree-container" header="Remote Repo">
            <SimpleTreeView expandedItems={expandedItems} onExpandedItemsChange={handleExpandedItemsChange}>
                {treeManager.getTree() && renderTreeItems(treeManager.getTree()[''])}
            </SimpleTreeView>
        </Card>
    );
};

export default TreeNavigation;