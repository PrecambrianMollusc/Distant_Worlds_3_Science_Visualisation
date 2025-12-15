import { App } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await App.init();
  } catch (err) {
    console.error('App failed to initialize', err);
  }
});
