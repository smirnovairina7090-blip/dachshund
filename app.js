(()=>{
  const W=1916,H=821,CAM=720,MIN_ZOOM=.65,MAX_ZOOM=1.15;
  const stage=document.getElementById('stage'),scene=document.getElementById('scene'),objects=document.getElementById('objects'),floorGuide=document.getElementById('floorGuide'),hint=document.getElementById('hint'),modeLabel=document.getElementById('mode'),viewBtn=document.getElementById('viewMode'),arrangeBtn=document.getElementById('arrange'),windowBtn=document.getElementById('windowBtn');

  const zoomStyle=document.createElement('style');
  zoomStyle.textContent=`
    .zoom-badge{position:absolute;z-index:5190;right:14px;top:max(82px,calc(env(safe-area-inset-top) + 68px));min-width:58px;padding:7px 10px;border-radius:15px;text-align:center;font-size:12px;font-weight:900;color:#54341f;background:rgba(255,248,232,.88);border:1px solid rgba(255,255,255,.52);box-shadow:0 7px 22px rgba(65,32,13,.18),inset 0 1px rgba(255,255,255,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;transform:translateY(-5px) scale(.94);pointer-events:none;transition:opacity .16s ease,transform .16s ease}
    .zoom-badge.show{opacity:1;transform:translateY(0) scale(1)}
    .stage.pinching .vignette{opacity:.68}
    .vignette{transition:opacity .18s ease}
    .stage.zoomed .scene{filter:saturate(1.035) contrast(1.01) drop-shadow(0 18px 32px rgba(42,20,8,.18))}
  `;
  document.head.appendChild(zoomStyle);
  const zoomBadge=document.createElement('div');zoomBadge.className='zoom-badge';zoomBadge.textContent='100%';stage.appendChild(zoomBadge);

  const defs=[
    {id:'garden',name:'Тумба с растениями',src:'assets/garden.webp',x:300,y:610,w:400,ambient:1,foot:105},
    {id:'stove',name:'Камин',src:'assets/stove.webp',x:565,y:625,w:285,fire:1,foot:82},
    {id:'armchair',name:'Кресло',src:'assets/armchair.webp',x:760,y:690,w:285,ambient:1,foot:86},
    {id:'sofa',name:'Диван',src:'assets/sofa.webp',x:1060,y:665,w:505,ambient:1,foot:150},
    {id:'rug',name:'Джутовый ковёр',src:'assets/rug.webp',x:1120,y:760,w:545,flat:1,locked:1},
    {id:'table',name:'Чайный столик',src:'assets/table.webp',x:1325,y:730,w:225,foot:70,pad:25},
    {id:'bed',name:'Лежанка Моти',src:'assets/round_bed.webp',x:1515,y:710,w:220,ambient:1,foot:76,pad:4},
    {id:'bookcase',name:'Книжный шкаф',src:'assets/bookcase.webp',x:1660,y:635,w:405,ambient:1,foot:112},
    {id:'plant',name:'Монстера',src:'assets/plant.webp',x:1835,y:675,w:180,ambient:1,foot:52,pad:13}
  ];

  const s={baseScale:1,scale:1,zoom:1,camera:CAM,target:CAM,vel:0,p:null,pinch:null,pointers:new Map(),items:[],last:performance.now(),mode:'view'};
  let saved={};
  try{saved=JSON.parse(localStorage.getItem('motya-hq-layout-v5')||'{}')}catch{}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const floor={top:535,bottom:802,left:40,right:1876};
  function depth(y){return .88+clamp((y-floor.top)/(floor.bottom-floor.top),0,1)*.20}
  function constrain(i,x,y){
    const yy=clamp(y,floor.top,floor.bottom),d=i.flat?1:depth(yy),half=(i.foot||70)*d*.5,xx=clamp(x,floor.left+half,floor.right-half);
    return{x:xx,y:yy,edge:xx!==x||yy!==y};
  }

  function render(i){
    const d=i.flat?1:depth(i.y);
    i.el.style.left=i.x+'px';i.el.style.top=(i.y+(i.pad||0)*d)+'px';i.el.style.setProperty('--scale',d.toFixed(4));i.el.style.setProperty('--shadow-w',Math.max(42,(i.foot||70)*.94)+'px');i.el.style.zIndex=i.flat?35:100+Math.round(i.y);
    if(!i.el.classList.contains('dragging'))i.el.style.filter=`drop-shadow(0 ${Math.round(5+d*4)}px ${Math.round(5+d*2)}px rgba(58,28,10,${(.14+(i.y-floor.top)/1600).toFixed(2)}))`;
  }

  function add(d){
    const p=saved[d.id]||{},pos=constrain(d,p.x??d.x,p.y??d.y),i={...d,x:pos.x,y:pos.y},el=document.createElement('div');
    el.className='item'+(d.ambient?' ambient':'')+(d.fire?' fire':'')+(d.flat?' flat':'')+(d.locked?' locked':'');el.dataset.id=d.id;el.style.width=d.w+'px';
    const img=document.createElement('img');img.src=d.src;img.alt='';img.draggable=false;el.appendChild(img);objects.appendChild(el);i.el=el;s.items.push(i);render(i);
  }
  defs.forEach(add);

  for(let n=0;n<24;n++){
    const q=document.createElement('i');q.style.left=(1050+Math.random()*520)+'px';q.style.top=(290+Math.random()*350)+'px';q.style.setProperty('--d',(6+Math.random()*8)+'s');q.style.setProperty('--x',(-22+Math.random()*50)+'px');q.style.animationDelay=(-Math.random()*10)+'s';document.getElementById('dust').appendChild(q);
  }

  function maxCam(){return Math.max(0,W-stage.clientWidth/s.scale)}
  function updateScale(){
    const r=stage.getBoundingClientRect();
    s.baseScale=r.width/r.height>.9?Math.max(r.height/H,r.width/W):r.height/H*.94;
    s.scale=s.baseScale*s.zoom;scene.style.top=r.height/2+'px';
    const m=maxCam();s.camera=clamp(s.camera,0,m);s.target=clamp(s.target,0,m);
  }
  function point(x,y){
    const r=stage.getBoundingClientRect(),top=r.height/2-H*s.scale/2;
    return{x:s.camera+(x-r.left)/s.scale,y:(y-r.top-top)/s.scale};
  }
  function from(t){const e=t.closest?.('.item:not(.locked)');return e?s.items.find(i=>i.id===e.dataset.id):null}
  function save(){const o={};s.items.forEach(i=>{if(!i.locked)o[i.id]={x:Math.round(i.x),y:Math.round(i.y)}});localStorage.setItem('motya-hq-layout-v5',JSON.stringify(o))}
  function vibrate(n){try{navigator.vibrate?.(n)}catch{}}

  let hintTimer=0,zoomTimer=0;
  function showHint(text,ms=2200){clearTimeout(hintTimer);hint.style.display='';hint.classList.remove('hide');hint.textContent=text;hintTimer=setTimeout(()=>{hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)},ms)}
  function hideHint(){clearTimeout(hintTimer);hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)}
  function showZoomBadge(linger=0){
    clearTimeout(zoomTimer);zoomBadge.textContent=Math.round(s.zoom*100)+'%';zoomBadge.classList.add('show');
    stage.classList.toggle('zoomed',Math.abs(s.zoom-1)>.015);
    if(linger)zoomTimer=setTimeout(()=>zoomBadge.classList.remove('show'),linger);
  }
  function setZoomAt(next,clientX){
    const r=stage.getBoundingClientRect(),localX=(clientX??(r.left+r.width/2))-r.left,anchorWorld=s.camera+localX/s.scale;
    s.zoom=clamp(next,MIN_ZOOM,MAX_ZOOM);s.scale=s.baseScale*s.zoom;
    s.camera=clamp(anchorWorld-localX/s.scale,0,maxCam());s.target=s.camera;s.vel=0;showZoomBadge();
  }
  function resetZoom(announce=false){
    if(Math.abs(s.zoom-1)<.005)return;
    setZoomAt(1,stage.getBoundingClientRect().left+stage.clientWidth/2);showZoomBadge(900);
    if(announce)showHint('Масштаб снова 100%',1300);
  }

  function pinchPair(){return Array.from(s.pointers.values()).slice(0,2)}
  function beginPinch(){
    if(s.mode!=='view'||s.pointers.size<2)return;
    const [a,b]=pinchPair(),dist=Math.hypot(b.x-a.x,b.y-a.y);if(dist<8)return;
    const r=stage.getBoundingClientRect(),cx=(a.x+b.x)/2,localX=cx-r.left;
    s.pinch={startDist:dist,startZoom:s.zoom,anchorWorld:s.camera+localX/s.scale};s.p=null;s.vel=0;stage.classList.remove('panning');stage.classList.add('pinching');hideHint();showZoomBadge();
  }
  function updatePinch(){
    if(!s.pinch||s.pointers.size<2)return;
    const [a,b]=pinchPair(),dist=Math.hypot(b.x-a.x,b.y-a.y),cx=(a.x+b.x)/2,r=stage.getBoundingClientRect(),localX=cx-r.left;
    s.zoom=clamp(s.pinch.startZoom*(dist/s.pinch.startDist),MIN_ZOOM,MAX_ZOOM);s.scale=s.baseScale*s.zoom;
    s.camera=clamp(s.pinch.anchorWorld-localX/s.scale,0,maxCam());s.target=s.camera;s.vel=0;showZoomBadge();modeLabel.textContent='Смотреть комнату · масштаб '+Math.round(s.zoom*100)+'%';
  }
  function endPinch(){
    if(!s.pinch)return;
    s.pinch=null;stage.classList.remove('pinching');showZoomBadge(1100);modeLabel.textContent='Смотреть · свайп + 2 пальца = масштаб';
    if(s.pointers.size===1){const [id,pt]=Array.from(s.pointers.entries())[0];s.p={id,kind:'pan',sx:pt.x,sy:pt.y,lx:pt.x,lt:performance.now(),cam:s.camera,started:false}}
  }

  function setMode(next,announce=true){
    s.p=null;s.pinch=null;s.pointers.clear();stage.classList.remove('panning','pinching');
    if(next==='arrange')resetZoom(false);
    s.mode=next;s.vel=0;s.target=s.camera;
    const arrange=next==='arrange';stage.classList.toggle('view-mode',!arrange);stage.classList.toggle('arrange-mode',arrange);viewBtn.classList.toggle('active',!arrange);arrangeBtn.classList.toggle('active',arrange);
    modeLabel.textContent=arrange?'Перестановка · камера зафиксирована':'Смотреть · свайп + 2 пальца = масштаб';
    if(arrange){
      s.items.filter(i=>!i.locked).forEach((i,k)=>{const img=i.el.querySelector('img');setTimeout(()=>img.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.09)',offset:.45},{filter:'brightness(1)'}],{duration:360,easing:'ease-out'}),Math.min(k*32,220))});
      if(announce)showHint('Перестановка: камера фиксирована · мебель только по полу',3000);
    }else if(announce)showHint('Смотреть: 1 палец - камера · 2 пальца - масштаб',3000);
    vibrate(4);
  }

  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||e.target.closest('.hud')||e.target.closest('.dock'))return;
    stage.setPointerCapture?.(e.pointerId);s.vel=0;
    if(s.mode==='view'){
      s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(s.pointers.size>=2){beginPinch();return;}
      s.p={id:e.pointerId,kind:'pan',sx:e.clientX,sy:e.clientY,lx:e.clientX,lt:performance.now(),cam:s.camera,started:false};return;
    }
    const item=from(e.target);if(!item){s.p={id:e.pointerId,kind:'none'};return;}
    const w=point(e.clientX,e.clientY);s.p={id:e.pointerId,kind:'item',item,sx:e.clientX,sy:e.clientY,dx:w.x-item.x,dy:w.y-item.y,started:false,buzz:false};
  });

  stage.addEventListener('pointermove',e=>{
    if(s.mode==='view'&&s.pointers.has(e.pointerId)){
      s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(s.pinch){updatePinch();return;}
    }
    const p=s.p;if(!p||p.id!==e.pointerId)return;
    if(p.kind==='pan'){
      const totalX=e.clientX-p.sx,totalY=e.clientY-p.sy,distance=Math.hypot(totalX,totalY);
      if(!p.started){if(distance<7)return;if(Math.abs(totalY)>Math.abs(totalX)*1.35)return;p.started=true;stage.classList.add('panning');hideHint()}
      const m=maxCam();s.target=clamp(p.cam-totalX/s.scale,0,m);s.camera=s.target;
      const now=performance.now(),dt=Math.max(8,now-p.lt),raw=-((e.clientX-p.lx)/s.scale)/dt*16.67;s.vel=clamp(raw,-17,17);p.lx=e.clientX;p.lt=now;return;
    }
    if(p.kind!=='item')return;
    const distance=Math.hypot(e.clientX-p.sx,e.clientY-p.sy);
    if(!p.started){if(distance<3)return;p.started=true;p.item.el.classList.add('dragging');p.item.el.style.filter='';hideHint();vibrate(5)}
    const w=point(e.clientX,e.clientY),i=p.item,pos=constrain(i,w.x-p.dx,w.y-p.dy);i.x=pos.x;i.y=pos.y;render(i);floorGuide.classList.toggle('edge',pos.edge);
    if(pos.edge&&!p.buzz){vibrate(3);p.buzz=true}else if(!pos.edge)p.buzz=false;
  });

  function finishArrange(e){
    const p=s.p;if(!p||p.id!==e.pointerId)return;
    floorGuide.classList.remove('edge');
    if(p.kind==='item'){
      p.item.el.classList.remove('dragging');render(p.item);
      if(p.started){save();vibrate(4);const img=p.item.el.querySelector('img');img.animate?.([{transform:'translateY(-2px) scale(1.008)'},{transform:'translateY(1px) scale(.997)',offset:.62},{transform:'none'}],{duration:210,easing:'cubic-bezier(.2,.78,.25,1)'})}
    }
    s.p=null;
  }

  function finishView(e){
    s.pointers.delete(e.pointerId);
    if(s.pinch){if(s.pointers.size<2)endPinch();return;}
    const p=s.p;if(!p||p.id!==e.pointerId)return;
    stage.classList.remove('panning');if(!p.started)s.vel=0;s.p=null;
  }

  stage.addEventListener('pointerup',e=>s.mode==='view'?finishView(e):finishArrange(e));
  stage.addEventListener('pointercancel',e=>s.mode==='view'?finishView(e):finishArrange(e));

  document.getElementById('reset').onclick=()=>{
    localStorage.removeItem('motya-hq-layout-v5');s.items.forEach(i=>{const d=defs.find(d=>d.id===i.id),p=constrain(d,d.x,d.y);i.x=p.x;i.y=p.y;render(i)});resetZoom(false);s.target=CAM;s.camera=clamp(s.camera,0,maxCam());vibrate(8);showHint('Мебель и масштаб сброшены',1500);
  };

  viewBtn.onclick=()=>{
    if(s.mode==='view'&&Math.abs(s.zoom-1)>.015){resetZoom(true);return;}
    setMode('view');
  };
  arrangeBtn.onclick=()=>setMode('arrange');
  windowBtn.onclick=()=>{
    if(s.mode!=='view')setMode('view',false);
    const vw=stage.clientWidth/s.scale;s.target=clamp(1330-vw/2,0,maxCam());vibrate(5);showHint('Камера плавно переходит к окну',1300);
  };

  function parallax(){const drift=s.camera-CAM;s.items.forEach(i=>{const t=clamp((i.y-floor.top)/(floor.bottom-floor.top),0,1),f=lerp(.05,-.012,t);i.el.style.setProperty('--px',clamp(drift*f,-25,25).toFixed(1)+'px')})}
  function tick(now){
    const dt=Math.min(32,now-s.last||16.67);s.last=now;const m=maxCam();
    if(s.mode==='view'&&!s.p&&!s.pinch){s.target=clamp(s.target+s.vel*dt/16.67,0,m);s.vel*=Math.pow(.80,dt/16.67);if(Math.abs(s.vel)<.035)s.vel=0;s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67))}
    else if(s.mode==='view'&&s.p?.kind!=='pan'&&!s.pinch)s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67));
    scene.style.transform=`translate3d(${-s.camera*s.scale}px,-50%,0) scale(${s.scale})`;parallax();requestAnimationFrame(tick);
  }

  window.addEventListener('resize',updateScale);updateScale();setMode('view',false);requestAnimationFrame(tick);
  showHint('Смотреть: свайп - камера · щипок двумя пальцами - масштаб',5200);
})();
