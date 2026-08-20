(() => {
  const W = 1916;
  const H = 821;
  const FT = 470;
  const FB = 785;
  const CAMERA_HOME = 690;

  const stage = document.getElementById('stage');
  const scene = document.getElementById('scene');
  const layer = document.getElementById('objects');
  const card = document.getElementById('selectionCard');
  const nameEl = document.getElementById('selectionName');
  const hint = document.getElementById('hint');
  const reset = document.getElementById('resetBtn');
  const arrange = document.getElementById('arrangeBtn');
  const center = document.getElementById('centerBtn');
  const mode = document.getElementById('modeLabel');

  const floorGuide = document.createElement('div');
  floorGuide.className = 'floor-guide';
  scene.insertBefore(floorGuide, layer);

  const spriteStyle = document.createElement('style');
  spriteStyle.textContent = `
    .item .sprite{
      width:100%;
      aspect-ratio:1;
      background-size:300% 100%;
      background-repeat:no-repeat;
      pointer-events:none
    }
    .item.is-ambient .sprite{
      animation:breathe 5.8s ease-in-out infinite;
      transform-origin:center bottom
    }
    .item.fireplace .sprite{
      animation:firewarm 2.4s ease-in-out infinite
    }
  `;
  document.head.appendChild(spriteStyle);

  const initial = [
    {id:'rug',name:'Джутовый ковёр',tile:0,x:1040,y:712,w:440,base:.78,lockDepth:true,minY:620},
    {id:'sofa',name:'Диван',tile:1,x:1045,y:630,w:395,base:.88,ambient:true},
    {id:'stove',name:'Камин',tile:2,x:430,y:606,w:205,base:.82,cls:'fireplace'},
    {id:'bookcase',name:'Книжный шкаф',tile:3,x:1615,y:602,w:225,base:.78,ambient:true},
    {id:'armchair',name:'Кресло',tile:4,x:735,y:672,w:220,base:.82,ambient:true},
    {id:'table',name:'Чайный столик',tile:5,x:1285,y:718,w:205,base:.72},
    {id:'bed',name:'Лежанка Моти',tile:6,x:1490,y:720,w:220,base:.72,ambient:true},
    {id:'garden',name:'Тумба с растениями',tile:7,x:255,y:600,w:335,base:.75,ambient:true},
    {id:'plant',name:'Монстера',tile:8,x:1800,y:626,w:142,base:.70,ambient:true}
  ];

  const s = {
    scale: 1,
    camera: CAMERA_HOME,
    target: CAMERA_HOME,
    vel: 0,
    pointer: null,
    selected: null,
    items: [],
    last: performance.now()
  };

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('motya-room-layout') || '{}');
  } catch {}

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const depth = y => .78 + clamp((y - FT) / (FB - FT), 0, 1) * .28;

  // Пол комнаты - перспективная трапеция. Чем дальше предмет, тем уже допустимая зона.
  const floor = {
    backY: 505,
    frontY: 785,
    backLeft: 105,
    backRight: 1810,
    frontLeft: 20,
    frontRight: 1896
  };

  function floorEdges(y) {
    const t = clamp((y - floor.backY) / (floor.frontY - floor.backY), 0, 1);
    return {
      left: lerp(floor.backLeft, floor.frontLeft, t),
      right: lerp(floor.backRight, floor.frontRight, t)
    };
  }

  function constrainItem(i, x, y) {
    const minY = i.minY ?? floor.backY;
    const maxY = floor.frontY;
    const cy = clamp(y, minY, maxY);
    const d = i.lockDepth ? 1 : depth(cy);
    const half = i.w * i.base * d * .31 + 16;
    const edges = floorEdges(cy);
    return {
      x: clamp(x, edges.left + half, edges.right - half),
      y: cy,
      hitBoundary: y !== cy || x < edges.left + half || x > edges.right - half
    };
  }

  function render(i) {
    const d = i.lockDepth ? 1 : depth(i.y);
    i.el.style.left = `${i.x}px`;
    i.el.style.top = `${i.y}px`;
    i.el.style.setProperty('--item-scale', (i.base * d).toFixed(4));
    i.el.style.zIndex = 100 + Math.round(i.y);

    if (!i.el.classList.contains('is-selected') && !i.el.classList.contains('is-dragging')) {
      i.el.style.filter =
        `drop-shadow(0 ${Math.round(6 + d * 5)}px ${Math.round(5 + d * 3)}px rgba(64,33,15,${(.16 + clamp((i.y - FT) / 360, 0, 1) * .14).toFixed(2)}))`;
    }
  }

  function add(d) {
    const p = saved[d.id] || {};
    const start = constrainItem(d, p.x ?? d.x, p.y ?? d.y);
    const i = {...d, x:start.x, y:start.y};

    const el = document.createElement('div');
    el.className = `item ${d.ambient ? 'is-ambient' : ''} ${d.cls || ''}`;
    el.dataset.id = d.id;
    el.style.width = `${d.w}px`;

    const sp = document.createElement('div');
    const row = Math.floor(d.tile / 3);
    const col = d.tile % 3;
    sp.className = 'sprite';
    sp.style.backgroundImage = `url(assets/atlas${row}.webp)`;
    sp.style.backgroundPosition = `${col * 50}% 0%`;

    el.appendChild(sp);
    layer.appendChild(el);
    i.el = el;
    s.items.push(i);
    render(i);
  }

  initial.forEach(add);

  const dust = document.getElementById('dust');
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.style.left = `${980 + Math.random() * 590}px`;
    p.style.top = `${300 + Math.random() * 360}px`;
    p.style.setProperty('--dur', `${6 + Math.random() * 7}s`);
    p.style.setProperty('--dx', `${-25 + Math.random() * 55}px`);
    p.style.animationDelay = `${-Math.random() * 9}s`;
    dust.appendChild(p);
  }

  function updateScale() {
    const r = stage.getBoundingClientRect();
    const portraitFactor = r.width < r.height ? .91 : 1;
    const targetHeight = r.height * portraitFactor;
    s.scale = Math.max(r.height / H * .88, targetHeight / H);

    if (r.width / r.height > 1.25) {
      s.scale = Math.max(r.height / H, r.width / W);
    }

    scene.style.top = `${r.height / 2}px`;
    const m = maxCam();
    s.camera = clamp(s.camera, 0, m);
    s.target = clamp(s.target, 0, m);
  }

  function maxCam() {
    return Math.max(0, W - stage.clientWidth / s.scale);
  }

  function worldPoint(x, y) {
    const r = stage.getBoundingClientRect();
    const top = r.height / 2 - H * s.scale / 2;
    return {
      x: s.camera + (x - r.left) / s.scale,
      y: (y - r.top - top) / s.scale
    };
  }

  function itemFrom(target) {
    const el = target.closest?.('.item');
    return el ? s.items.find(i => i.id === el.dataset.id) : null;
  }

  function select(i) {
    if (s.selected && s.selected !== i) {
      s.selected.el.classList.remove('is-selected');
      render(s.selected);
    }

    s.selected = i;

    if (i) {
      i.el.classList.add('is-selected');
      i.el.style.filter = '';
      nameEl.textContent = i.name;
      card.hidden = false;
    } else {
      card.hidden = true;
    }
  }

  function save() {
    const data = {};
    s.items.forEach(i => {
      data[i.id] = {x: Math.round(i.x), y: Math.round(i.y)};
    });
    localStorage.setItem('motya-room-layout', JSON.stringify(data));
  }

  function hideHint() {
    hint.classList.add('is-hidden');
    setTimeout(() => {
      hint.style.display = 'none';
    }, 500);
  }

  function haptic(ms = 8) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch {}
    }
  }

  function showFloorGuide(show) {
    floorGuide.classList.toggle('is-visible', show);
  }

  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || e.target.closest('.dock') || e.target.closest('.hud')) return;

    stage.setPointerCapture?.(e.pointerId);
    const i = itemFrom(e.target);
    const w = worldPoint(e.clientX, e.clientY);

    s.pointer = {
      id: e.pointerId,
      type: i ? 'item' : 'pan',
      item: i,
      startX: e.clientX,
      lastX: e.clientX,
      lastT: performance.now(),
      startCam: s.target,
      dx: i ? w.x - i.x : 0,
      dy: i ? w.y - i.y : 0,
      boundaryBuzzed: false
    };

    s.vel = 0;

    if (i) {
      select(i);
      i.el.classList.add('is-dragging');
      i.el.style.filter = '';
      showFloorGuide(true);
      haptic(11);
    } else {
      select(null);
      stage.classList.add('is-panning');
    }
  });

  stage.addEventListener('pointermove', e => {
    const p = s.pointer;
    if (!p || p.id !== e.pointerId) return;

    hideHint();

    if (p.type === 'pan') {
      const dx = e.clientX - p.startX;
      const m = maxCam();
      const over = 50 / s.scale;
      s.target = clamp(p.startCam - dx / s.scale, -over, m + over);

      const now = performance.now();
      const dt = Math.max(8, now - p.lastT);
      s.vel = -((e.clientX - p.lastX) / s.scale) / dt * 16.67;
      p.lastX = e.clientX;
      p.lastT = now;
      return;
    }

    const w = worldPoint(e.clientX, e.clientY);
    const i = p.item;
    const rawX = w.x - p.dx;
    const rawY = w.y - p.dy;
    const pos = constrainItem(i, rawX, rawY);

    i.x = pos.x;
    i.y = pos.y;
    render(i);

    floorGuide.classList.toggle('is-at-edge', pos.hitBoundary);

    if (pos.hitBoundary && !p.boundaryBuzzed) {
      haptic(5);
      p.boundaryBuzzed = true;
    } else if (!pos.hitBoundary) {
      p.boundaryBuzzed = false;
    }
  });

  function finish(e) {
    const p = s.pointer;
    if (!p || (e && p.id !== e.pointerId)) return;

    stage.classList.remove('is-panning');
    showFloorGuide(false);
    floorGuide.classList.remove('is-at-edge');

    if (p.item) {
      const sprite = p.item.el.querySelector('.sprite');
      p.item.el.classList.remove('is-dragging');
      p.item.el.classList.add('is-selected');
      p.item.el.style.filter = '';
      haptic(8);

      if (sprite?.animate) {
        sprite.animate(
          [
            {transform:'translateY(-3px) scale(1.025)'},
            {transform:'translateY(1px) scale(.992)', offset:.62},
            {transform:'translateY(0) scale(1)'}
          ],
          {duration:260, easing:'cubic-bezier(.2,.8,.2,1)'}
        );
      }

      save();
    }

    s.pointer = null;
  }

  stage.addEventListener('pointerup', finish);
  stage.addEventListener('pointercancel', finish);

  reset.addEventListener('click', () => {
    localStorage.removeItem('motya-room-layout');

    s.items.forEach(i => {
      const d = initial.find(x => x.id === i.id);
      const pos = constrainItem(d, d.x, d.y);
      i.x = pos.x;
      i.y = pos.y;
      render(i);
    });

    s.target = CAMERA_HOME;
    select(null);
    haptic(10);

    reset.animate(
      [{transform:'rotate(0)'}, {transform:'rotate(-310deg)'}],
      {duration:460, easing:'cubic-bezier(.2,.8,.2,1)'}
    );
  });

  arrange.addEventListener('click', () => {
    stage.classList.toggle('arrange-mode');
    arrange.classList.toggle('is-active');
    mode.textContent = arrange.classList.contains('is-active')
      ? 'Переставляй мебель по полу'
      : 'Свайпай комнату';
    hideHint();
    haptic(7);
  });

  center.addEventListener('click', () => {
    const vw = stage.clientWidth / s.scale;
    s.target = clamp(1250 - vw / 2, 0, maxCam());
    haptic(6);
  });

  function updateParallax() {
    const drift = s.camera - CAMERA_HOME;

    s.items.forEach(i => {
      const depth01 = clamp((i.y - FT) / (FB - FT), 0, 1);
      // Дальняя мебель движется чуть медленнее комнаты, ближняя - чуть быстрее.
      const factor = lerp(.055, -.012, depth01);
      const px = clamp(drift * factor, -28, 28);
      i.el.style.setProperty('--parallax-x', `${px.toFixed(2)}px`);
    });

    floorGuide.style.setProperty('--guide-shift', `${clamp(drift * .018, -9, 9).toFixed(2)}px`);
  }

  function tick(now) {
    const dt = Math.min(32, now - s.last || 16.67);
    s.last = now;
    const m = maxCam();

    if (!s.pointer) {
      s.target += s.vel * dt / 16.67;
      s.vel *= Math.pow(.90, dt / 16.67);

      if (Math.abs(s.vel) < .01) s.vel = 0;
      if (s.target < 0) s.target += (0 - s.target) * .12;
      if (s.target > m) s.target += (m - s.target) * .12;
    }

    s.camera +=
      (clamp(s.target, -45 / s.scale, m + 45 / s.scale) - s.camera) *
      (1 - Math.pow(.77, dt / 16.67));

    scene.style.transform =
      `translate3d(${-s.camera * s.scale}px,-50%,0) scale(${s.scale})`;

    updateParallax();
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', updateScale);
  window.addEventListener('orientationchange', () => setTimeout(updateScale, 120));

  updateScale();
  requestAnimationFrame(tick);
  setTimeout(hideHint, 6500);
})();
