class TreeDataManager {
    constructor(tree) {
        this.tree = tree || { '': { name: 'Root', path: '', children: [], is_dataset: false } };
    }

    // Retrieve a node by its path using recursive or iterative lookup
    findNode(path) {
        if (path == null) {
            console.error('No path provided to findNode');
            return null;
        }

        let current = this.tree[''];
        if (path === '') return current;

        let parts = path.split('/').filter(part => part !== '');
        for (const part of parts) {
            if (!current.children) return null;
            current = current.children[part];
            if (!current) return null;
        }

        return current;
    }

    toggleNode(path) {
        if (path == null) {
            console.error('No path provided to toggleNode');
            return;
        }

        const node = this.findNode(path);
        if (node && !node.is_dataset) {
            node.toggled = !node.toggled;
        }
    }

    setExpandedItems(items)
    {
        const expandRecursive = (node, items) => {
            node.toggled = items.includes(node.path);
            if (node.children) {
                Object.values(node.children).forEach(child => expandRecursive(child, items));
            }
        };
        expandRecursive(this.tree[''], items);
    }
    
    createNode(name, parentPath, nodeData) {
        let newNode = {
            name: name,
            path: `${parentPath ? `${parentPath}/` : ''}${name}`,
            is_dataset: nodeData.is_dataset
        };
        if (!newNode.is_dataset) {
            newNode.children = [];
            newNode.toggled = false;
        }
        else
        {            
            this.updateNode(nodeData, newNode);

            let dataWindow = {
                pageNumber: 1,
                pageSize: 1000,
                filter: '',
                tolerance: 0,
                preferred_types: nodeData.column_types,
                path: newNode.path,
            };                        
            newNode.dataWindow = dataWindow;
        }
        return newNode;
    }
    
    updateNode(nodeData, newNode) {
        if (nodeData.is_dataset) {
            newNode.completed = nodeData.upload_status === 'Ready';
            newNode.row_count = nodeData.row_count;
            newNode.schema_data = nodeData.schema_data;
            newNode.column_types = nodeData.column_types;
            newNode.tolerance = nodeData.tolerance;
            newNode.inference_status = nodeData.inference_status;
        }
    }
    
    // True if equal, false if different
    isUpToDate(nodeData, newNode) {
        if (!nodeData.is_dataset) {
            return true;
        }
        
        return (nodeData.upload_status === 'Ready') === newNode.completed &&
               nodeData.row_count === newNode.row_count &&
               nodeData.inference_status === newNode.inference_status &&
               nodeData.tolerance === newNode.tolerance &&
               JSON.stringify(nodeData.schema_data) === JSON.stringify(newNode.schema_data) &&
               JSON.stringify(nodeData.column_types) === JSON.stringify(newNode.column_types);
    }

    async updateNodeChildren(node, fetchData) {
        let changed = false;
        if (node && !node.is_dataset) {
            let childrenMap = {};
            let childrenData = await fetchData(node.path, 1); // Fetch one level of children
            childrenData.forEach(childData => {
                childrenMap[childData.name] = childData;
                const childName = childData.name.split('/').pop();
                if (node.children[childName]) {
                    if (!this.isUpToDate(childData, node.children[childName])) {
                        this.updateNode(childData, node.children[childName]);
                        changed = true;
                    }
                } else {
                    // If it's a new child, build it from scratch
                    let newNode = this.createNode(childName, node.path, childData);
                    node.children[childName] = newNode;
                    changed = true;
                }
            });
            // Children no longer present also count as a change
            Object.keys(node.children).forEach(childName => {
                if (!childrenMap[childName]) {
                    delete node.children[childName];
                    changed = true;                    
                }
            });
        }
        return changed;
    }

    async refreshNode(child, apiFetchFunction) {
        if (!child?.is_dataset) return;

        // Push the promise to an array to be handled later
        return apiFetchFunction(child.path, 0)
        .then(data => {
            // Deep compare the schema data to see if it has changed
            if (JSON.stringify(child.schema_data) !== JSON.stringify(data[0].schema_data) ||
                JSON.stringify(child.column_types) !== JSON.stringify(data[0].column_types) ||
                child.row_count !== data[0].row_count ||
                child.inference_status !== data[0].inference_status ||
                child.completed !== (data[0].upload_status === 'Ready')) {
                    child.schema_data = data[0].schema_data;
                    child.column_types = data[0].column_types;
                    child.row_count = data[0].row_count;
                    child.inference_status = data[0].inference_status;
                    child.completed = data[0].upload_status === 'Ready';                                    

                    return true;
            }

            return false;                
        })
        .catch(error => {
            console.error(`Failed to update data for node ${child.path}:`, error);
            return false;
        });    
    }
    
    // This method is updated to take an apiFetchFunction to abstract fetching logic
    async refreshIncompleteData(apiFetchFunction) {
        const promises = [];
    
        const refreshRecursive = (node) => {
            if (!node.children) return; // Skip datasets
    
            Object.values(node.children).forEach(child => {
                if (child.is_dataset) {
                    // Check if the child needs updating
                    if (!child.completed || !(child.schema_data?.status === 'completed')) {
                        // Push the promise to an array to be handled later
                        promises.push(this.refreshNode(child, apiFetchFunction));
                    }
                } else {
                    // Recursively handle non-dataset children
                    refreshRecursive(child);
                }
            });
        };
    
        // Start from the root and collect all promises
        refreshRecursive(this.tree['']);
        const results = await Promise.all(promises);
        const anyChanges = results.reduce((acc, result) => acc || result, false);
        return anyChanges;
    }
    
    getTree() {
        return this.tree;
    }
}

export default TreeDataManager;