import { createObject, deleteAllObjects, deleteObject, getZonesForFarm, toggleDevice, updateObjectPosition } from "./apiService";
import { createObject as createObjectMesh } from "./objects";
import { handleSensorClick } from "./sensorOverlay";

export function setupEventListeners(context) {
    const { renderer, camera, scene, ground, objectsRef, objectConfigs, controls } = context;

    // Local state variables
    let objects = objectsRef;
    let selectedObjectType = null;
    let deleteMode = false;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let contextMenuTarget = null;

    // Drag-to-move state
    let dragObject = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let isDragging = false;
    const DRAG_THRESHOLD = 5; // pixels
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

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
            const toggleableTypes = ['sprinkler', 'waterPump', 'streetLight'];
            
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
        document.body.classList.add('context-menu-open');
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
        const actuators = ['sprinkler', 'waterPump', 'streetLight'];

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
        document.body.classList.remove('context-menu-open');
        contextMenuTarget = null;
    }

    // Zone selector for IoT devices
    async function showZoneSelectorModal(objectType, point) {
        const farmId = localStorage.getItem('selectedFarmId');

        try {
            const zones = await getZonesForFarm(farmId);

            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.id = 'zone-selector-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #151522;
                padding: 30px;
                border-radius: 15px;
                border: 2px solid #7c6df9;
                text-align: center;
                color: white;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                z-index: 1001;
            `;

            modal.innerHTML = `
                <h3 style="color: #7c6df9; margin-bottom: 20px;">Select Zone for ${objectConfigs[objectType]?.name || objectType}</h3>
                <div id="zone-buttons" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-bottom: 20px;">
                </div>
                <button id="cancel-zone-btn" style="
                    padding: 10px 20px;
                    background: #555;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Add zone buttons
            const zoneButtonsContainer = modal.querySelector('#zone-buttons');
            zones.forEach(zone => {
                const btn = document.createElement('button');
                btn.textContent = zone.name;
                btn.style.cssText = `
                    padding: 10px 15px;
                    background: #7c6df9;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                `;
                btn.onmouseover = () => btn.style.background = '#9a8fff';
                btn.onmouseout = () => btn.style.background = '#7c6df9';

                btn.addEventListener('click', async () => {
                    overlay.remove();
                    await placeObjectInZone(objectType, point, zone.id);
                });

                zoneButtonsContainer.appendChild(btn);
            });

            // Cancel button
            modal.querySelector('#cancel-zone-btn').addEventListener('click', () => {
                overlay.remove();
                deselectAllObjects();
            });

        } catch (error) {
            console.error('Failed to load zones:', error);
            alert('Error loading zones. Please try again.');
            deselectAllObjects();
        }
    }

    // Place object in specific zone
    async function placeObjectInZone(objectType, point, zoneId) {
        try {
            const farmId = localStorage.getItem('selectedFarmId');
            const category = objectConfigs[objectType]?.category || 'unknown';

            const metadata = {};
            if (category === 'iot') {
                metadata.is_running = false;
                metadata.sensor_value = 0;
            } else if (category === 'crops') {
                metadata.growth = 0.4;
            }

            const objectData = {
                object_name: objectType,
                category: category,
                position_x: point.x,
                position_y: point.y,
                position_z: point.z,
                metadata: metadata
            };

            // Only add zone_id if provided
            if (zoneId !== null) {
                objectData.zone_id = zoneId;
            }

            const newDbObject = await createObject(farmId, objectData);
            console.log('Object saved to DB:', newDbObject);

            addObject(scene, objectsRef, newDbObject.object_name, point, newDbObject, objectConfigs);

            updateObjectCount();
            deselectAllObjects();
            window.updateFarmDashboard?.();
        } catch (error) {
            console.error('Failed to create object:', error);
            alert(`Error creating object: ${error.message}`);
        }
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
            const intersectTargets = [ground, ...objects]

            const intersects = raycaster.intersectObjects(intersectTargets, true)
            const validIntersects = intersects.filter(hit => {
                if (hit.object === ground) return true
                return hit.point.y < 2.5 && hit.face && hit.face.normal.y > 0.5
            })

            if (validIntersects.length > 0) {
                const intersection = validIntersects[0];
                const point = intersection.point.clone();
                point.x = Math.round(point.x * 2) / 2;
                point.z = Math.round(point.z * 2) / 2;
                point.y = intersection.point.y;

                if (Math.abs(point.x) < 40 && Math.abs(point.z) < 40) {
                    const category = objectConfigs[selectedObjectType]?.category || 'unknown';

                    // IoT devices (except tempSensor, streetLight which are farm-wide) need zone selection
                    const ZONE_REQUIRED_TYPES = new Set(['moistureSensor', 'sprinkler', 'waterPump']);

                    if (category === 'iot' && ZONE_REQUIRED_TYPES.has(selectedObjectType)) {
                        // Show zone selector for zone-based IoT devices
                        showZoneSelectorModal(selectedObjectType, point);
                    } else {
                        // For non-IoT or farm-wide IoT devices, create immediately
                        placeObjectInZone(selectedObjectType, point, null);  // null zone_id for farm-wide objects
                    }
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
                    handleSensorClick(clickedObject, event.clientX, event.clientY);
                    contextMenuTarget = clickedObject; // for arrow-key positioning
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


    // ===== Drag to Move =====
    function onPointerDown(event) {
        if (event.button !== 0) return;
        if (selectedObjectType || deleteMode) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const objectMeshes = [];
        objects.forEach(obj => obj.traverse(child => { if (child.isMesh) objectMeshes.push(child); }));
        const intersects = raycaster.intersectObjects(objectMeshes);
        if (intersects.length > 0) {
            dragObject = findParentGroup(intersects[0].object);
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            isDragging = false;
            // Update dragPlane to the object's Y so it drags at the right height
            dragPlane.constant = -dragObject.position.y;
        }
    }

    function onPointerMove(event) {
        if (!dragObject) return;

        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        if (!isDragging && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        isDragging = true;
        if (controls) controls.enabled = false;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const target = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, target)) {
            dragObject.position.x = target.x;
            dragObject.position.z = target.z;
        }
    }

    async function onPointerUp() {
        if (controls) controls.enabled = true;  // always re-enable, even if drag was cancelled
        if (!dragObject) return;

        if (isDragging) {
            // Save new position to DB
            const farmId = localStorage.getItem('selectedFarmId');
            const dbId = dragObject.userData.dbId;
            if (farmId && dbId) {
                try {
                    await updateObjectPosition(farmId, dbId, {
                        position_x: dragObject.position.x,
                        position_y: dragObject.position.y,
                        position_z: dragObject.position.z
                    });
                } catch (e) {
                    console.error('[Drag] Failed to save position:', e);
                }
            }
        }

        dragObject = null;
        isDragging = false;
    }

    // ===== Event Listener Setup =====
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    // Catch pointerup when the cursor leaves the canvas mid-drag
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
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

    obj.userData.growth = 0.2
    
    if (dbData) {
        // Always set dbId so position saving works even if metadata is null
        obj.userData.dbId = dbData.id;
        obj.userData.zoneId = dbData.zone_id ?? dbData.zoneId ?? null;

        if (dbData.metadata) {
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
