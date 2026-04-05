import { createObject, deleteAllObjects, deleteObject, toggleDevice, updateObjectPosition } from "./apiService";
import { createObject as createObjectMesh } from "./objects";
import { handleSensorClick } from "./sensorOverlay";

export function setupEventListeners(context) {
    const { renderer, camera, scene, ground, objectsRef, objectConfigs } = context;
    
    // Local state variables
    let objects = objectsRef;
    let selectedObjectType = null;
    let deleteMode = false;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let contextMenuTarget = null;

    // ===== Helper Functions (Closure Access) =====
    
    function findParentGroup(mesh) {
        let current = mesh;
        while (current.parent) {
            if (current.userData && current.userData.type) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    function updateObjectCount() {
        const countElement = document.getElementById('object-count');
        if (countElement) {
            countElement.textContent = objects.length;
        }
    }

    function saveObjects() {
        const saveData = objects.map(obj => ({
            type: obj.userData.type,
            position: {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            },
            isRunning: obj.userData.isRunning || false,
            growth: obj.userData.growth || 1.0
 

        }));
        localStorage.setItem('farmObjects', JSON.stringify(saveData));
    }

    // Toggle handler function
    async function handleToggleClick() {
        if (contextMenuTarget) {
            const objectType = contextMenuTarget.userData.type;
            const toggleableTypes = ['sprinkler', 'waterPump', 'fan', 'streetLight'];
            
            if (toggleableTypes.includes(objectType)) {
                const newState = !contextMenuTarget.userData.isRunning;
                
                try {
                    // Update database if it has a dbId
                    if (contextMenuTarget.userData.dbId) {
                        const farmId = localStorage.getItem('selectedFarmId');
                        await toggleDevice(farmId, contextMenuTarget.userData.dbId, newState);
                    }

                    // Toggle running state in 3D object
                    contextMenuTarget.userData.isRunning = newState;
                    
                    // Show/hide water effect for sprinkler
                    if (objectType === 'sprinkler' && contextMenuTarget.waterEffect) {
                        contextMenuTarget.waterEffect.visible = contextMenuTarget.userData.isRunning;
                        
                        // Reset water particles when turning off
                        if (!contextMenuTarget.userData.isRunning) {
                            const waterEffect = contextMenuTarget.waterEffect;
                            const lifetimes = waterEffect.lifetimes;
                            for (let i = 0; i < lifetimes.length; i++) {
                                lifetimes[i] = waterEffect.maxLifetime + 1;
                            }
                        }
                    }
                    
                    // Save state
                    saveObjects()
                    window.updateFarmDashboard?.()

                    const targetToRefresh = contextMenuTarget

                    const menu = document.getElementById('context-menu');
                    const currentLeft = menu.style.left;
                    const currentTop = menu.style.top;
                    
                    // Close menu and reopen to refresh UI
                    hideContextMenu();
                    showContextMenu(
                        currentLeft,
                        currentTop,
                        targetToRefresh
                    );
                } catch (error) {
                    console.error('Failed to toggle device:', error);
                    alert(`Error toggling device: ${error.message}`);
                }
            }
        }
    }

    function selectObject(type) {
        selectedObjectType = type;
        document.querySelectorAll('.object-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.object === type) {
                btn.classList.add('selected');
            }
        });
    }

    function deselectAllObjects() {
        selectedObjectType = null;
        document.querySelectorAll('.object-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    async function removeObject(obj) {
        const farmId = localStorage.getItem('selectedFarmId')
        try {
            if (obj.userData.dbId) {
                await deleteObject(farmId, obj.userData.dbId)
            }

            scene.remove(obj)
            const index = objects.indexOf(obj)
            if (index > -1) {
                objects.splice(index, 1)
            }
            updateObjectCount()
            saveObjects()
            window.updateFarmDashboard?.()
        } catch (error) {
            console.error('failed to delete obj')
        }
    }

    async function clearAllObjects() {
        const farmId = localStorage.getItem('selectedFarmId');
        
        try {
            await deleteAllObjects(farmId);
            console.log('All objects deleted from database.');

            objects.forEach(obj => {
                scene.remove(obj);
            });
            objects.length = 0;
            updateObjectCount();
            saveObjects();
            window.updateFarmDashboard?.()
        } catch (error) {
            console.error('Failed to clear objects:', error);
            alert(`Error clearing objects: ${error.message}`);
        }
    }

    function showContextMenu(x, y, targetObject) {
        contextMenuTarget = targetObject;
        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) return;

        const objectName = targetObject.userData.name || targetObject.userData.type;
        const objectType = targetObject.userData.type;
        const category = targetObject.userData.category;

        const nameElement = document.getElementById('context-object-name');
        const statusLabel = document.getElementById('context-status-label');
        const statusElement = document.getElementById('context-status-value');
        const toggleBtn = document.getElementById('context-toggle-btn');

        if (nameElement) nameElement.textContent = objectName;

        const sensors = ['moistureSensor', 'tempSensor', 'humiditySensor'];
        const actuators = ['sprinkler', 'waterPump', 'fan', 'streetLight'];

        //Handle IoT Sensors
        if (category === 'iot' && sensors.includes(objectType)) {
            if (toggleBtn) toggleBtn.style.display = 'none';
            
            let unit = '%';
            let label = 'Value:';
            if (objectType === 'tempSensor') { unit = '°C'; label = 'Temp:'; }
            else if (objectType === 'moistureSensor') label = 'Moisture:';
            else if (objectType === 'humiditySensor') label = 'Humidity:';
            
            const val = targetObject.userData.sensorValue || 0;
            
            if (statusLabel) statusLabel.textContent = label;
            if (statusElement) {
                statusElement.textContent = `${val}${unit}`;
                statusElement.style.color = '#2196F3';
            }
        } 
        // Handle IoT Actuators
        else if (category === 'iot' && actuators.includes(objectType)) {
            if (statusLabel) statusLabel.textContent = 'State:';
            
            if (toggleBtn) {
                toggleBtn.style.display = 'block';
                const isRunning = targetObject.userData.isRunning || false;
                toggleBtn.textContent = isRunning ? 'Turn Off' : 'Turn On';
                toggleBtn.classList.toggle('active', isRunning);

                if (statusElement) {
                    statusElement.textContent = isRunning ? 'Running' : 'Off';
                    statusElement.style.color = isRunning ? '#4caf50' : '#f44336';
                }

                toggleBtn.onclick = null;
                toggleBtn.removeEventListener('click', handleToggleClick);
                toggleBtn.addEventListener('click', handleToggleClick);
            }
        } 
        //Handle Crops
        else if (category === 'crops') {
            if (toggleBtn) toggleBtn.style.display = 'none';
            if (statusLabel) statusLabel.textContent = 'Growth:';
            
            if (statusElement) {
                const percent = Math.round((targetObject.userData.growth || 0) * 100);
                statusElement.textContent = `${percent}%`;
                statusElement.style.color = percent >= 100 ? '#4caf50' : '#ff9800';
            }
        } 
        // Handle Default Objects 
        else {
            if (toggleBtn) toggleBtn.style.display = 'none';
            if (statusLabel) statusLabel.textContent = 'Status:';
            
            if (statusElement) {
                statusElement.textContent = 'In Farm';
                statusElement.style.color = '#666';
            }
        }

        // Positioning
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.add('show');

        const menuRect = contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            contextMenu.style.left = `${x - menuRect.width}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            contextMenu.style.top = `${y - menuRect.height}px`;
        }
    }

    function hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
        }
        contextMenuTarget = null;
    }

    function onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    //render the objs when click on ground
    function onCanvasClick(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (deleteMode) {
            const objectMeshes = [];
            objects.forEach(obj => {
                obj.traverse(child => {
                    if (child.isMesh) objectMeshes.push(child);
                });
            });

            const intersects = raycaster.intersectObjects(objectMeshes);
            if (intersects.length > 0) {
                const clickedObject = findParentGroup(intersects[0].object);
                if (clickedObject) {
                    removeObject(clickedObject);
                }
            }
        } else if (selectedObjectType) {
            //allow fan to be placed on existing objs
            let intersectTargets = [ground];
            if (selectedObjectType === 'fan') {
                intersectTargets = [ground, ...objects];
            }

            const intersects = raycaster.intersectObjects(intersectTargets, true);
            if (intersects.length > 0) {
                const intersection = intersects[0]
                const point = intersection.point.clone()
                point.x = Math.round(point.x * 2) / 2;
                point.z = Math.round(point.z * 2) / 2;
               

                if (selectedObjectType !== 'fan') {
                    point.y = 0;
                } else {
                    point.y = intersection.point.y + 0.05
                }

                if (Math.abs(point.x) < 40 && Math.abs(point.z) < 40) {
                    const farmId = localStorage.getItem('selectedFarmId')
                    const category = objectConfigs[selectedObjectType]?.category || 'unknown';

                    const metadata = {};
                    if (category === 'iot') {
                        metadata.is_running = false;
                        metadata.sensor_value = 0; 
                    } else if (category === 'crops') {
                        metadata.growth = 0.4;
                    }

                    const objectData = { 
                        object_name: selectedObjectType,
                        category: objectConfigs[selectedObjectType]?.category || 'unknown',
                        position_x: point.x,
                        position_y: point.y,
                        position_z: point.z,
                        metadata: metadata
                     }

                    createObject(farmId, objectData)
                        .then(newDbObject => {
                            console.log('Object saved to DB:', newDbObject);
                            
                            addObject(scene, objectsRef, newDbObject.object_name, point, newDbObject, objectConfigs);
                            
                            updateObjectCount();
                            deselectAllObjects();
                            window.updateFarmDashboard?.()
                        })
                        .catch(error => {
                            console.error('Failed to create object:', error);
                            alert(`Error creating object: ${error.message}`);
                        });
                

                }
            }
        } else {
            // Show context menu when clicking on objects (no item selected)
            const objectMeshes = [];
            objects.forEach(obj => {
                obj.traverse(child => {
                    if (child.isMesh) objectMeshes.push(child);
                });
            });

            const intersects = raycaster.intersectObjects(objectMeshes);
            if (intersects.length > 0) {
                const clickedObject = findParentGroup(intersects[0].object);
                if (clickedObject) {
                    handleSensorClick(intersectObjects);
                    showContextMenu(event.clientX, event.clientY, clickedObject);
                }
            } else {
                hideContextMenu();
            }
        }
    }

    function onCanvasRightClick(event) {
        event.preventDefault();

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const objectMeshes = [];
        objects.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh) objectMeshes.push(child);
            });
        });

        const intersects = raycaster.intersectObjects(objectMeshes);
        if (intersects.length > 0) {
            const clickedObject = findParentGroup(intersects[0].object);
            if (clickedObject) {
                showContextMenu(event.clientX, event.clientY, clickedObject);
            }
        } else {
            hideContextMenu();
        }
    }


    // ===== Event Listener Setup =====
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onCanvasClick);
    renderer.domElement.addEventListener('contextmenu', onCanvasRightClick);

    // Add Items button toggle
    const addItemsBtn = document.getElementById('add-items-btn');
    const addItemsDropdown = document.getElementById('add-items-dropdown');

    if (addItemsBtn && addItemsDropdown) {
        addItemsBtn.addEventListener('click', () => {
            addItemsBtn.classList.toggle('active');
            addItemsDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.add-items-container')) {
                addItemsBtn.classList.remove('active');
                addItemsDropdown.classList.remove('show');
            }
        });
    }

    // Category tab switching
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.category-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const category = tab.dataset.category;
            const categoryContent = document.getElementById(`${category}-category`);
            if (categoryContent) {
                categoryContent.classList.add('active');
            }

            deselectAllObjects();
        });
    });

    // Object selection buttons
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const objectType = btn.dataset.object;
            selectObject(objectType);
            deleteMode = false;
            const deleteModeBtn = document.getElementById('delete-mode-btn');
            if (deleteModeBtn) deleteModeBtn.classList.remove('active');

            if (addItemsBtn) addItemsBtn.classList.remove('active');
            if (addItemsDropdown) addItemsDropdown.classList.remove('show');
        });
    });

    // Delete mode button
    const deleteModeBtn = document.getElementById('delete-mode-btn');
    if (deleteModeBtn) {
        deleteModeBtn.addEventListener('click', () => {
            deleteMode = !deleteMode;
            deleteModeBtn.classList.toggle('active', deleteMode);
            if (deleteMode) {
                deselectAllObjects();
                if (addItemsBtn) addItemsBtn.classList.remove('active');
                if (addItemsDropdown) addItemsDropdown.classList.remove('show');
            }
        });
    }

    // Clear all button
    const clearAllBtn = document.getElementById('clear-all-btn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all objects?')) {
                clearAllObjects();
            }
        });
    }

    // Context menu delete button
    const contextDeleteBtn = document.getElementById('context-delete-btn');
    if (contextDeleteBtn) {
        contextDeleteBtn.addEventListener('click', () => {
            if (contextMenuTarget) {
                removeObject(contextMenuTarget);
                hideContextMenu();
            }
        });
    }

    // Context menu close on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });



    window.addEventListener('keydown', async (e) => {
        if (e.target.tagName === 'INPUT') return;

        if (contextMenuTarget) {
            const step = 0.2; 
            let moved = false;

             // SHIFT + arrow to move UP and DOWN (Y-axis for height)
            if (e.shiftKey) {
                if (e.key === 'ArrowUp') { contextMenuTarget.position.y += step; moved = true; }
                if (e.key === 'ArrowDown') { contextMenuTarget.position.y -= step; moved = true; }
            } 
            // arrows move along the ground X & Z
            else {
                if (e.key === 'ArrowUp') { contextMenuTarget.position.z -= step; moved = true; }
                if (e.key === 'ArrowDown') { contextMenuTarget.position.z += step; moved = true; }
                if (e.key === 'ArrowLeft') { contextMenuTarget.position.x -= step; moved = true; }
                if (e.key === 'ArrowRight') { contextMenuTarget.position.x += step; moved = true; }
            }

            // Prevent screen scrolling when using arrow keys
            if (moved) {
                e.preventDefault(); 
            }

            if (e.key === 'Enter') {
                const farmId = localStorage.getItem('selectedFarmId');
                const dbId = contextMenuTarget.userData.dbId;
                
                try {
                    await updateObjectPosition(farmId, dbId, {
                        position_x: contextMenuTarget.position.x,
                        position_y: contextMenuTarget.position.y,
                        position_z: contextMenuTarget.position.z
                    });
                    
                    console.log('Object moved and saved!');
                    saveObjects()

                } catch (error) {
                    console.error('Error saving new position:', error);
                }

                window.updateFarmDashboard?.()
            }
        }
    });
}

export function addObject(scene, objectsRef, type, position, dbData = null, objectConfigs = null) {
    
    const obj = createObjectMesh(type, position)
    
    const defaultCategory = obj.userData.category || 'unknown'
    const category = objectConfigs && objectConfigs[type] ? objectConfigs[type].category : defaultCategory
    obj.userData.category = category

    obj.userData.growth = 0.4
    
    if (dbData && dbData.metadata) {
        obj.userData.dbId = dbData.id;
        obj.userData.zoneId = dbData.zone_id ?? dbData.zoneId ?? null;
        obj.userData.isRunning = dbData.metadata.is_running || false;
        
        obj.userData.growth = (dbData.metadata.growth !== undefined && dbData.metadata.growth !== null) 
            ? parseFloat(dbData.metadata.growth) 
            : 0.4;

        obj.userData.sensorValue = (dbData.metadata.sensor_value !== undefined && dbData.metadata.sensor_value !== null)
            ? parseFloat(dbData.metadata.sensor_value)
            : 0.0;
    } else {
        obj.userData.growth = 0.4;
        obj.userData.isRunning = false;
    }
    
    if (category === 'crops') {
        const g = Math.max(0.4, Math.min(obj.userData.growth, 1.0))
        obj.userData.growth = g
        obj.scale.set(g, g, g)
    }
    
    scene.add(obj)
    objectsRef.push(obj)
}
