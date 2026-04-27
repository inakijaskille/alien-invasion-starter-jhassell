export default class Screens {
  constructor(game) {
    this.game = game;
    this._make('start', 'Press Space to Start');
    this._make('pause', 'Paused - Press P to Resume');
    this._make('gameover', 'Game Over - Press R to Restart');
    this._make('victory', 'Victory! Press R to Play Again');
    // Hook into any existing static overlays in index.html
    this.staticStart = document.getElementById('overlay');
    this.staticPause = document.getElementById('pauseOverlay');
    this.staticEnd = document.getElementById('endOverlay');

    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', ()=>{ this.show('none'); if (this.game.resetRun) this.game.resetRun(); });
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', ()=>{ this.show('none'); this.game.gameState = this.game.GS.PLAYING; });
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', ()=>{ this.game.resetGame(); this.show('none'); });
    const playAgain = document.getElementById('playAgainBtn');
    if (playAgain) playAgain.addEventListener('click', ()=>{ this.game.resetGame(); this.show('none'); });

    window.addEventListener('keydown', (e)=>{
      if (e.code === 'Space' && this.visible==='start') { this.show('none'); if (this.game.resetRun) this.game.resetRun(); }
      if (e.code === 'KeyR' && (this.visible==='gameover' || this.visible==='victory')) { this.game.resetGame(); this.show('none'); }
    });

    // start visible
    this.show('start');
  }

  _make(name, text) {
    const el = document.createElement('div');
    el.className = 'screen';
    el.style.position = 'absolute';
    el.style.left = '50%'; el.style.top = '50%';
    el.style.transform = 'translate(-50%,-50%)';
    el.style.padding = '20px 30px'; el.style.background = 'rgba(0,0,0,0.6)';
    el.style.color = '#fff'; el.style.fontFamily = 'sans-serif'; el.style.fontSize='20px';
    el.style.zIndex = '20'; el.textContent = text;
    document.body.appendChild(el);
    el.style.display = 'none';
    this[name] = el;
  }

  show(which) {
    this.visible = which;
    ['start','pause','gameover','victory'].forEach(n=>this[n].style.display = (which===n? 'block' : 'none'));
    // sync existing static overlays
    if (this.staticStart) this.staticStart.style.display = (which==='start' ? 'flex' : 'none');
    if (this.staticPause) this.staticPause.style.display = (which==='pause' ? 'flex' : 'none');
    if (this.staticEnd) this.staticEnd.style.display = (which==='gameover' || which==='victory' ? 'flex' : 'none');
    if (which==='gameover' && this.staticEnd) {
      const t = this.staticEnd.querySelector('#endTitle'); if (t) t.textContent = 'Game Over';
    }
    if (which==='victory' && this.staticEnd) {
      const t = this.staticEnd.querySelector('#endTitle'); if (t) t.textContent = 'Victory!';
    }
  }
}
