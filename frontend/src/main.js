import { init } from './farm-core.js';

// 1. Get the credentials
const farmId = localStorage.getItem('selectedFarmId');
const token = localStorage.getItem('farmverseToken') || localStorage.getItem('token');

// 2. If they don't exist, kick them back to the map
if (!farmId || !token) {
    console.error("Missing credentials! Redirecting...");
    window.location.href = 'map.html';
}

// 3. Unified Initialization Flow (Strict Step-by-Step)
(async () => {
  try {
    // STEP A: Wait for THREE to be loaded
    await new Promise((resolve) => {
      if (typeof window.THREE !== 'undefined') return resolve();
      const check = setInterval(() => {
        if (typeof window.THREE !== 'undefined') {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
    console.log('THREE.js loaded');

    // STEP B: Fetch the Farm Data BEFORE starting the 3D scene
    console.log(`Fetching data for Farm ID: ${farmId}`);
    const response = await fetch(`http://localhost:5001/api/farms/${farmId}/objects`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const farmObjects = await response.json();
    console.log("Successfully loaded farm data!", farmObjects);

    // STEP C: Make the data globally available so farm-core.js can read it
    window.currentFarmObjects = farmObjects;

    // STEP D: Now that we have the data, start the 3D engine!
    // (If your init function accepts parameters, you can do init(farmObjects) instead)
    await init(); 

  } catch (err) {
    console.error('Failed to initialize farm:', err);
    
    // Make the error highly visible on the loading screen so you know exactly what broke
    const loading = document.getElementById('loading-screen');
    if (loading) { 
        loading.innerHTML = `
            <div style="color: #ffb8a8; text-align: center; font-family: monospace; background: rgba(0,0,0,0.8); padding: 2rem; border-radius: 10px;">
                <h2 style="color: #e76f51;">Error Loading Farm</h2>
                <p>${err.message}</p>
                <button onclick="window.location.href='map.html'" style="margin-top: 1rem; padding: 10px 20px; cursor: pointer;">Go Back to Map</button>
            </div>
        `;
    }
  }
})();