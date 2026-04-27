import GameManager from './src/core/GameManager.js';

window.addEventListener('load', ()=>{
  const gm = new GameManager(document.body);
  // expose for debugging
  window.game = gm;
});
