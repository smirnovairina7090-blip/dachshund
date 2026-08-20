(()=>{
  const W=1916,H=821,CAM=720;
  const stage=document.getElementById('stage'),scene=document.getElementById('scene'),objects=document.getElementById('objects'),floorGuide=document.getElementById('floorGuide'),selected=document.getElementById('selected'),hint=document.getElementById('hint'),mode=document.getElementById('mode');

  const defs=[
    {id:'garden',name:'Тумба с растениями',src:'assets/garden.webp',x:300,y:600,w:400,ambient:1,foot:105},
    {id:'stove',name:'Камин',src:'assets/stove.webp',x:565,y:615,w:285,fire:1,foot:82},
    {id:'armchair',name:'Кресло',src:'assets/armchair.webp',x:760,y:685,w:285,ambient:1,foot:86},
    {id:'sofa',name:'Диван',src:'assets/sofa.webp',x:1060,y:655,w:505,ambient:1,foot:150},
    {id:'rug',name:'Джутовый ковёр',src:'assets/rug.webp',x:1120,y:755,w:545,flat:1,locked:1},
    {id:'table',name:'Чайный столик',src:'assets/table.webp',x:1325,y:725,w:225,foot:70,pad:25},
    {id:'bed',name:'Лежанка Моти',src:'assets/round_bed.webp',x:1515,y:705,w:220,ambient:1,foot:76,pad:4},
    {id:'bookcase',name:'Книжный шкаф',src:'assets/bookcase.webp',x:1660,y:625,w:405,ambient:1,foot:112},
    {id:'plant',name:'Монстера',src:'assets/plant.webp',x:1835,y:665,w:180,ambient:1,foot:52,pad:13}
  ];

  const s={scale:1,camera:CAM,target:CAM,vel:0,p:null,items:[],last:performance.now()};
  let saved={};
  try{saved=JSON.parse(localStorage.getItem('motya-hq-layout-v4')||'{}')}catch{}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;

  // У комнаты прямой пол: точка опоры мебели должна быть ниже плинтуса.
  // Никакой искусственной перспективной трапеции - она и ломала расстановку.
  const floor={top:456,bottom:805,left:34,right:1882};
  function depth(y){return .84+clamp((y-floor.top)/(floor.bottom-floor.top),0,1)*.22}
  function constrain(i,x,y){
    const yy=clamp(y,floor.top,floor.bottom);
    const d=i.flat?1:depth(yy);
    const half=(i.foot||70)*d*.5;
    const xx=clamp(x,floor.left+half,floor.right-half);
    return {x:xx,y:yy,edge:xx!==x||yy!==y};
  }

  function render(i){
    const d=i.flat?1:depth(i.y);
    i.el.style.left=i.x+'px';
    i.el.style.top=(i.y+(i.pad||0)*d)+'px';
    i.el.style.setProperty('--scale',d.toFixed(4));
    i.el.style.setProperty('--shadow-w',Math.max(42,(i.foot||70)*.94)+'px');
    i.el.style.zIndex=i.flat?35:100+Math.round(i.y);
    if(!i.el.classList.contains('dragging')){
      i.el.style.filter=`drop-shadow(0 ${Math.round(5+d*4)}px ${Math.round(5+d*2)}px rgba(58,28,10,${(.14+(i.y-floor.top)/1800).toFixed(2)}))`;
    }
  }

  function add(d){
    const p=saved[d.id]||{};
    const pos=constrain(d,p.x??d.x,p.y??d.y);
    const i={...d,x:pos.x,y:pos.y};
    const el=document.createElement('div');
    el.className='item'+(d.ambient?' ambient':'')+(d.fire?' fire':'')+(d.flat?' flat':'')+(d.locked?' locked':'');
    el.dataset.id=d.id;el.style.width=d.w+'px';
    const img=document.createElement('img');img.src=d.src;img.alt='';img.draggable=false;
    el.appendChild(img);objects.appendChild(el);i.el=el;s.items.push(i);render(i);
  }
  defs.forEach(add);

  for(let n=0;n<24;n++){
    const q=document.createElement('i');q.style.left=(1050+Math.random()*520)+'px';q.style.top=(290+Math.random()*350)+'px';q.style.setProperty('--d',(6+Math.random()*8)+'s');q.style.setProperty('--x',(-22+Math.random()*50)+'px');q.style.animationDelay=(-Math.random()*10)+'s';document.getElementById('dust').appendChild(q);
  }

  function maxCam(){return Math.max(0,W-stage.clientWidth/s.scale)}
  function updateScale(){
    const r=stage.getBoundingClientRect();
    s.scale=r.width/r.height>.9?Math.max(r.height/H,r.width/W):r.height/H*.94;
    scene.style.top=r.height/2+'px';
    const m=maxCam();s.camera=clamp(s.camera,0,m);s.target=clamp(s.target,0,m);
  }
  function point(x,y){
    const r=stage.getBoundingClientRect(),top=r.height/2-H*s.scale/2;
    return {x:s.camera+(x-r.left)/s.scale,y:(y-r.top-top)/s.scale};
  }
  function from(t){const e=t.closest?.('.item:not(.locked)');return e?s.items.find(i=>i.id===e.dataset.id):null}
  function save(){
    const o={};s.items.forEach(i=>{if(!i.locked)o[i.id]={x:Math.round(i.x),y:Math.round(i.y)}});
    localStorage.setItem('motya-hq-layout-v4',JSON.stringify(o));
  }
  function vibrate(n){try{navigator.vibrate?.(n)}catch{}}

  let hintTimer=0;
  function showHint(text,ms=2200){
    clearTimeout(hintTimer);hint.style.display='';hint.classList.remove('hide');hint.textContent=text;
    hintTimer=setTimeout(()=>{hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)},ms);
  }
  function hideHint(){clearTimeout(hintTimer);hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)}

  selected.hidden=true;
  mode.textContent='Свайп - камера · тяни мебель';

  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||e.target.closest('.hud')||e.target.closest('.dock'))return;
    const item=from(e.target),w=point(e.clientX,e.clientY);
    stage.setPointerCapture?.(e.pointerId);s.vel=0;
    s.p={
      id:e.pointerId,kind:item?'item':'pan',item,
      sx:e.clientX,sy:e.clientY,lx:e.clientX,lt:performance.now(),cam:s.camera,
      dx:item?w.x-item.x:0,dy:item?w.y-item.y:0,started:false,buzz:false
    };
  });

  stage.addEventListener('pointermove',e=>{
    const p=s.p;if(!p||p.id!==e.pointerId)return;
    const totalX=e.clientX-p.sx,totalY=e.clientY-p.sy,distance=Math.hypot(totalX,totalY);

    if(p.kind==='pan'){
      if(!p.started){
        if(distance<7)return;
        if(Math.abs(totalY)>Math.abs(totalX)*1.35)return;
        p.started=true;stage.classList.add('panning');hideHint();
      }
      // Камеру оставляем ровно с тем поведением, которое уже понравилось.
      const m=maxCam();s.target=clamp(p.cam-totalX/s.scale,0,m);s.camera=s.target;
      const now=performance.now(),dt=Math.max(8,now-p.lt),raw=-((e.clientX-p.lx)/s.scale)/dt*16.67;
      s.vel=clamp(raw,-17,17);p.lx=e.clientX;p.lt=now;
      return;
    }

    if(!p.started){
      if(distance<3)return;
      p.started=true;p.item.el.classList.add('dragging');p.item.el.style.filter='';floorGuide.classList.add('show');hideHint();vibrate(5);
    }

    const w=point(e.clientX,e.clientY),i=p.item,pos=constrain(i,w.x-p.dx,w.y-p.dy);
    i.x=pos.x;i.y=pos.y;render(i);floorGuide.classList.toggle('edge',pos.edge);
    if(pos.edge&&!p.buzz){vibrate(3);p.buzz=true}else if(!pos.edge)p.buzz=false;
  });

  function finish(e){
    const p=s.p;if(!p||(e&&p.id!==e.pointerId))return;
    stage.classList.remove('panning');floorGuide.classList.remove('show','edge');
    if(p.kind==='item'){
      p.item.el.classList.remove('dragging');render(p.item);
      if(p.started){save();vibrate(4)}
      else showHint('Зажми мебель пальцем и сразу тяни её',1400);
    }else if(!p.started){s.vel=0}
    s.p=null;
  }
  stage.addEventListener('pointerup',finish);stage.addEventListener('pointercancel',finish);

  document.getElementById('reset').onclick=()=>{
    localStorage.removeItem('motya-hq-layout-v4');
    s.items.forEach(i=>{const d=defs.find(d=>d.id===i.id),p=constrain(d,d.x,d.y);i.x=p.x;i.y=p.y;render(i)});
    s.target=CAM;vibrate(8);showHint('Расстановка сброшена',1400);
  };

  document.getElementById('arrange').onclick=()=>{showHint('Мебель двигается напрямую: схвати и тяни',2600);vibrate(3)};
  document.getElementById('windowBtn').onclick=()=>{const vw=stage.clientWidth/s.scale;s.target=clamp(1330-vw/2,0,maxCam());vibrate(5)};

  function parallax(){
    const drift=s.camera-CAM;
    s.items.forEach(i=>{const t=clamp((i.y-floor.top)/(floor.bottom-floor.top),0,1),f=lerp(.05,-.012,t);i.el.style.setProperty('--px',clamp(drift*f,-25,25).toFixed(1)+'px')});
  }
  function tick(now){
    const dt=Math.min(32,now-s.last||16.67);s.last=now;const m=maxCam();
    if(!s.p){
      s.target=clamp(s.target+s.vel*dt/16.67,0,m);s.vel*=Math.pow(.80,dt/16.67);if(Math.abs(s.vel)<.035)s.vel=0;
      s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67));
    }else if(s.p.kind!=='pan'){
      s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67));
    }
    scene.style.transform=`translate3d(${-s.camera*s.scale}px,-50%,0) scale(${s.scale})`;parallax();requestAnimationFrame(tick);
  }

  window.addEventListener('resize',updateScale);updateScale();requestAnimationFrame(tick);
  showHint('Тяни мебель напрямую · свайпай пустое место для камеры',4800);
})();