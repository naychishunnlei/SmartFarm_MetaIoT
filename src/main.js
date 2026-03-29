import { init } from './farm-core.js';

(async () => {
  try {
    await init();
  } catch (err) {
    console.error('Failed to initialize farm:', err);
    // ensure loading overlay removed so error is visible
    const loading = document.getElementById('loading-screen');
    if (loading) { loading.classList.add('hidden'); loading.style.display = 'none'; }
  }
})();