// Small self-contained canvas confetti burst used on strong results screens.

const COLORS = ['#2ecc71', '#f4c542', '#3fb6e0', '#ef4444', '#ffffff', '#17a45f'];

export class Confetti {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this._running = false;
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 140) {
    this._resize();
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * this.canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 2 + Math.random() * 3.2,
        size: 4 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 3.2 + Math.random() * 1.5,
      });
    }
    if (!this._running) {
      this._running = true;
      this._lastT = performance.now();
      requestAnimationFrame(this._loop.bind(this));
    }
  }

  _loop(now) {
    const dt = Math.min((now - this._lastT) / 1000, 0.05);
    this._lastT = now;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += dt * 6;
      p.rotation += p.rotationSpeed;
      if (p.life > p.maxLife || p.y > this.canvas.height + 30) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(this._loop.bind(this));
    } else {
      this._running = false;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
