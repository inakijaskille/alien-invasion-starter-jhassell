export default class Screens {
  constructor(game) {
    this.game = game;

    this._make('start', 'Press Space to Start');
    this._make('pause', 'Paused - Press P to Resume');
    this._make('gameover', 'Game Over - Press R to Restart');
    this._make('victory', 'Victory! Press R to Play Again');

    this.staticStart = document.getElementById('overlay');
    this.staticPause = document.getElementById('pauseOverlay');
    this.staticEnd = document.getElementById('endOverlay');
    this.hud = document.getElementById('hud');

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGameplay();
      });
    }

    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.show('none');
        this.game.gameState = this.game.GS.PLAYING;
        this.showHUD();
      });
    }

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this.game.resetGame) this.game.resetGame();
        this.show('none');
        this.showHUD();
      });
    }

    const playAgain = document.getElementById('playAgainBtn');
    if (playAgain) {
      playAgain.addEventListener('click', () => {
        if (this.game.resetGame) this.game.resetGame();
        this.show('none');
        this.showHUD();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.visible === 'start') {
        this.startGameplay();
      }

      if (e.code === 'KeyR' && (this.visible === 'gameover' || this.visible === 'victory')) {
        if (this.game.resetGame) this.game.resetGame();
        this.show('none');
        this.showHUD();
      }
    });

    this.show('start');
  }

  startGameplay() {
    this.show('none');

    if (this.game.resetRun) {
      this.game.resetRun();
    }

    if (this.game.GS) {
      this.game.gameState = this.game.GS.PLAYING;
    }

    this.showHUD();

    if (this.game.updateHUD) {
      this.game.updateHUD();
    }
  }

  showHUD() {
    this.hud = document.getElementById('hud');

    if (!this.hud) return;

    this.hud.style.display = 'flex';
    this.hud.style.opacity = '1';
    this.hud.style.visibility = 'visible';
    this.hud.style.position = 'fixed';
    this.hud.style.zIndex = '999';
  }

  hideHUD() {
    this.hud = document.getElementById('hud');

    if (!this.hud) return;

    this.hud.style.display = 'none';
  }

  _make(name, text) {
    const el = document.createElement('div');

    el.className = 'screen';
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.padding = '20px 30px';
    el.style.background = 'rgba(0,0,0,0.6)';
    el.style.color = '#fff';
    el.style.fontFamily = 'sans-serif';
    el.style.fontSize = '20px';
    el.style.zIndex = '50';
    el.style.textAlign = 'center';
    el.style.borderRadius = '10px';
    el.textContent = text;

    document.body.appendChild(el);

    el.style.display = 'none';
    this[name] = el;
  }

  show(which) {
    this.visible = which;

    ['start', 'pause', 'gameover', 'victory'].forEach((n) => {
      this[n].style.display = which === n ? 'block' : 'none';
    });

    if (this.staticStart) {
      this.staticStart.style.display = which === 'start' ? 'flex' : 'none';
    }

    if (this.staticPause) {
      this.staticPause.style.display = which === 'pause' ? 'flex' : 'none';
    }

    if (this.staticEnd) {
      this.staticEnd.style.display =
        which === 'gameover' || which === 'victory' ? 'flex' : 'none';
    }

    if (which === 'gameover' && this.staticEnd) {
      const t = this.staticEnd.querySelector('#endTitle');
      if (t) t.textContent = 'Game Over';
    }

    if (which === 'victory' && this.staticEnd) {
      const t = this.staticEnd.querySelector('#endTitle');
      if (t) t.textContent = 'Victory!';
    }

    if (which === 'none' || which === 'pause') {
      this.showHUD();
    }
  }
}