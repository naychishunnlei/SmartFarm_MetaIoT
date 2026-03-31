import { init } from './farm-core.js';

(async () => {
  try {
    // Wait for THREE to be loaded
    const waitForTHREE = () => {
      return new Promise((resolve) => {
        if (typeof THREE !== 'undefined') {
          resolve();
        } else {
          const check = () => {
            if (typeof THREE !== 'undefined') {
              resolve();
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        }
      });
    };

    await waitForTHREE();
    console.log('THREE.js loaded');
    await init();
  } catch (err) {
    console.error('Failed to initialize farm:', err);
    // ensure loading overlay removed so error is visible
    const loading = document.getElementById('loading-screen');
    if (loading) { loading.classList.add('hidden'); loading.style.display = 'none'; }
  }
})();