(()=>{
  const W=1916,H=821,CAM=720,MIN_ZOOM=.65,MAX_ZOOM=1.15,LONG_PRESS=520,MOVE_SLOP=8;
  const $=id=>document.getElementById(id);
  const stage=$('stage'),scene=$('scene'),objects=$('objects'),floorGuide=$('floorGuide'),hint=$('hint'),modeLabel=$('mode'),viewBtn=$('viewMode'),arrangeBtn=$('arrange'),windowBtn=$('windowBtn');
  const variantPanel=$('variantPanel'),variantBackdrop=$('variantBackdrop'),variantTitle=$('variantTitle'),variantOptions=$('variantOptions'),variantClose=$('variantClose');

  const zoomBadge=document.createElement('div');
  zoomBadge.className='zoom-badge';zoomBadge.textContent='100%';stage.appendChild(zoomBadge);

  const families={
    plant:{title:'Выбери растение',variants:[
      {id:'monstera',label:'Монстера',src:'assets/plant.webp'},
      {id:'leafy',label:'Листья',src:'assets/plant_alt1.webp'},
      {id:'trailing',label:'Свисающее',src:'assets/plant_alt2.webp'}
    ]},
    bed:{title:'Выбери лежанку',variants:[
      {id:'round',label:'Круглая',src:'assets/round_bed.webp'},
      {id:'wicker',label:'Плетёная',src:'assets/bed_wicker.webp'},
      {id:'house',label:'Домик',src:'assets/bed_house.webp'}
    ]}
  };

  const defs=[
    {id:'garden',name:'Тумба с растениями',src:'assets/garden.webp',x:300,y:610,w:400,ambient:1,foot:105},
    {id:'stove',name:'Камин',src:'assets/stove.webp',x:565,y:625,w:285,fire:1,foot:82},
    {id:'armchair',name:'Кресло',src:'assets/armchair.webp',x:760,y:690,w:285,ambient:1,foot:86},
    {id:'sofa',name:'Диван',src:'assets/sofa.webp',x:1060,y:665,w:505,ambient:1,foot:150},
    {id:'rug',name:'Джутовый ковёр',src:'assets/rug.webp',x:1120,y:760,w:545,flat:1,locked:1},
    {id:'table',name:'Чайный столик',src:'assets/table.webp',x:1325,y:730,w:225,foot:70,pad:25},
    {id:'bed',name:'Лежанка Моти',family:'bed',variant:'round',src:'assets/round_bed.webp',x:1515,y:710,w:220,ambient:1,foot:76,pad:4},
    {id:'bookcase',name:'Книжный шкаф',src:'assets/bookcase.webp',x:1660,y:635,w:405,ambient:1,foot:112},
    {id:'plant',name:'Растение',family:'plant',variant:'monstera',src:'assets/plant.webp',x:1835,y:675,w:180,ambient:1,foot:52,pad:13}
  ];

  const s={baseScale:1,scale:1,zoom:1,camera:CAM,target:CAM,vel:0,p:null,pinch:null,pointers:new Map(),items:[],last:performance.now(),mode:'view',pickerItem:null};
  let saved={};
  try{saved=JSON.parse(localStorage.getItem('motya-hq-layout-v5')||'{}')}catch{}

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const floor={top:535,bottom:802,left:40,right:1876};
  function depth(y){return .88+clamp((y-floor.top)/(floor.bottom-floor.top),0,1)*.20}
  function constrain(i,x,y){const yy=clamp(y,floor.top,floor.bottom),d=i.flat?1:depth(yy),half=(i.foot||70)*d*.5,xx=clamp(x,floor.left+half,floor.right-half);return{x:xx,y:yy,edge:xx!==x||yy!==y}}
  function familyVariant(family,id){return families[family]?.variants.find(v=>v.id===id)}

  function render(i){
    const d=i.flat?1:depth(i.y);i.el.style.left=i.x+'px';i.el.style.top=(i.y+(i.pad||0)*d)+'px';i.el.style.setProperty('--scale',d.toFixed(4));i.el.style.setProperty('--shadow-w',Math.max(42,(i.foot||70)*.94)+'px');i.el.style.zIndex=i.flat?35:100+Math.round(i.y);
    if(!i.el.classList.contains('dragging')&&!i.el.classList.contains('holding'))i.el.style.filter=`drop-shadow(0 ${Math.round(5+d*4)}px ${Math.round(5+d*2)}px rgba(58,28,10,${(.14+(i.y-floor.top)/1600).toFixed(2)}))`;
  }

  function add(d){
    const p=saved[d.id]||{},variant=d.family&&familyVariant(d.family,p.variant)?p.variant:d.variant,src=d.family?familyVariant(d.family,variant)?.src||d.src:d.src,pos=constrain(d,p.x??d.x,p.y??d.y),i={...d,x:pos.x,y:pos.y,variant,src},el=document.createElement('div');
    el.className='item'+(d.ambient?' ambient':'')+(d.fire?' fire':'')+(d.flat?' flat':'')+(d.locked?' locked':'')+(d.family?' customizable':'');el.dataset.id=d.id;el.style.width=d.w+'px';
    const img=document.createElement('img');img.src=src;img.alt='';img.draggable=false;el.appendChild(img);objects.appendChild(el);i.el=el;s.items.push(i);render(i);
  }
  defs.forEach(add);

  for(let n=0;n<24;n++){const q=document.createElement('i');q.style.left=(1050+Math.random()*520)+'px';q.style.top=(290+Math.random()*350)+'px';q.style.setProperty('--d',(6+Math.random()*8)+'s');q.style.setProperty('--x',(-22+Math.random()*50)+'px');q.style.animationDelay=(-Math.random()*10)+'s';$('dust').appendChild(q)}

  function maxCam(){return Math.max(0,W-stage.clientWidth/s.scale)}
  function updateScale(){const r=stage.getBoundingClientRect();s.baseScale=r.width/r.height>.9?Math.max(r.height/H,r.width/W):r.height/H*.94;s.scale=s.baseScale*s.zoom;scene.style.top=r.height/2+'px';const m=maxCam();s.camera=clamp(s.camera,0,m);s.target=clamp(s.target,0,m)}
  function point(x,y){const r=stage.getBoundingClientRect(),top=r.height/2-H*s.scale/2;return{x:s.camera+(x-r.left)/s.scale,y:(y-r.top-top)/s.scale}}
  function from(t){const e=t.closest?.('.item:not(.locked)');return e?s.items.find(i=>i.id===e.dataset.id):null}
  function save(){const o={};s.items.forEach(i=>{if(!i.locked)o[i.id]={x:Math.round(i.x),y:Math.round(i.y),...(i.family?{variant:i.variant}:{})}});localStorage.setItem('motya-hq-layout-v5',JSON.stringify(o))}
  function vibrate(n){try{navigator.vibrate?.(n)}catch{}}

  let hintTimer=0,zoomTimer=0;
  function showHint(text,ms=2200){clearTimeout(hintTimer);hint.style.display='';hint.classList.remove('hide');hint.textContent=text;hintTimer=setTimeout(()=>{hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)},ms)}
  function hideHint(){clearTimeout(hintTimer);hint.classList.add('hide');setTimeout(()=>hint.style.display='none',420)}
  function showZoomBadge(linger=0){clearTimeout(zoomTimer);zoomBadge.textContent=Math.round(s.zoom*100)+'%';zoomBadge.classList.add('show');stage.classList.toggle('zoomed',Math.abs(s.zoom-1)>.015);if(linger)zoomTimer=setTimeout(()=>zoomBadge.classList.remove('show'),linger)}
  function setZoomAt(next,clientX){const r=stage.getBoundingClientRect(),localX=(clientX??(r.left+r.width/2))-r.left,anchorWorld=s.camera+localX/s.scale;s.zoom=clamp(next,MIN_ZOOM,MAX_ZOOM);s.scale=s.baseScale*s.zoom;s.camera=clamp(anchorWorld-localX/s.scale,0,maxCam());s.target=s.camera;s.vel=0;showZoomBadge()}
  function resetZoom(announce=false){if(Math.abs(s.zoom-1)<.005)return;setZoomAt(1,stage.getBoundingClientRect().left+stage.clientWidth/2);showZoomBadge(900);if(announce)showHint('Масштаб снова 100%',1300)}

  function pinchPair(){return Array.from(s.pointers.values()).slice(0,2)}
  function beginPinch(){if(s.mode!=='view'||s.pointers.size<2)return;const[a,b]=pinchPair(),dist=Math.hypot(b.x-a.x,b.y-a.y);if(dist<8)return;const r=stage.getBoundingClientRect(),cx=(a.x+b.x)/2,localX=cx-r.left;s.pinch={startDist:dist,startZoom:s.zoom,anchorWorld:s.camera+localX/s.scale};s.p=null;s.vel=0;stage.classList.remove('panning');stage.classList.add('pinching');hideHint();showZoomBadge()}
  function updatePinch(){if(!s.pinch||s.pointers.size<2)return;const[a,b]=pinchPair(),dist=Math.hypot(b.x-a.x,b.y-a.y),cx=(a.x+b.x)/2,r=stage.getBoundingClientRect(),localX=cx-r.left;s.zoom=clamp(s.pinch.startZoom*(dist/s.pinch.startDist),MIN_ZOOM,MAX_ZOOM);s.scale=s.baseScale*s.zoom;s.camera=clamp(s.pinch.anchorWorld-localX/s.scale,0,maxCam());s.target=s.camera;s.vel=0;showZoomBadge();modeLabel.textContent='Смотреть комнату · масштаб '+Math.round(s.zoom*100)+'%'}
  function endPinch(){if(!s.pinch)return;s.pinch=null;stage.classList.remove('pinching');showZoomBadge(1100);modeLabel.textContent='Смотреть · свайп + 2 пальца = масштаб';if(s.pointers.size===1){const[id,pt]=Array.from(s.pointers.entries())[0];s.p={id,kind:'pan',sx:pt.x,sy:pt.y,lx:pt.x,lt:performance.now(),cam:s.camera,started:false}}}

  function renderPicker(){
    const item=s.pickerItem;if(!item||!item.family)return;const family=families[item.family];variantTitle.textContent=family.title;variantOptions.replaceChildren();
    family.variants.forEach(v=>{const btn=document.createElement('button');btn.className='variant-option'+(item.variant===v.id?' active':'');btn.type='button';const pic=document.createElement('span');pic.className='variant-thumb';const img=document.createElement('img');img.src=v.src;img.alt=v.label;pic.appendChild(img);const label=document.createElement('span');label.className='variant-label';label.textContent=v.label;btn.append(pic,label);btn.addEventListener('click',()=>setItemVariant(item,v.id));variantOptions.appendChild(btn)})
  }
  function openPicker(item){if(!item?.family||s.mode!=='arrange')return;s.pickerItem=item;renderPicker();variantBackdrop.classList.add('open');variantPanel.classList.add('open');variantPanel.setAttribute('aria-hidden','false');stage.classList.add('picker-open');item.el.classList.remove('holding');item.el.classList.add('picker-target');hideHint();modeLabel.textContent=item.family==='bed'?'Выбери вариант лежанки':'Выбери вариант растения';vibrate(11)}
  function closePicker(){if(s.pickerItem){s.pickerItem.el.classList.remove('picker-target');render(s.pickerItem)}s.pickerItem=null;variantBackdrop.classList.remove('open');variantPanel.classList.remove('open');variantPanel.setAttribute('aria-hidden','true');stage.classList.remove('picker-open');if(s.mode==='arrange')modeLabel.textContent='Перестановка · удерживай для вариантов'}
  function setItemVariant(item,variantId){
    const v=familyVariant(item.family,variantId);if(!v||item.variant===variantId){closePicker();return}const img=item.el.querySelector('img');let done=false;
    const swap=()=>{if(done)return;done=true;item.variant=variantId;item.src=v.src;img.src=v.src;save();renderPicker();requestAnimationFrame(()=>img.animate?.([{opacity:.2,filter:'brightness(1.18)'},{opacity:1,filter:'brightness(1)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'}));vibrate(7);setTimeout(closePicker,190)};
    const a=img.animate?.([{opacity:1},{opacity:.18}],{duration:100,easing:'ease-in'});if(a)a.finished.then(swap).catch(swap);else swap();
  }
  variantClose.addEventListener('click',closePicker);variantBackdrop.addEventListener('click',closePicker);

  function clearHold(p){if(!p)return;clearTimeout(p.longTimer);clearTimeout(p.holdVisualTimer);if(p.item){p.item.el.classList.remove('holding');render(p.item)}}
  function armLongPress(p){if(!p.item?.family)return;p.holdVisualTimer=setTimeout(()=>{if(s.p===p&&!p.started&&!p.moved)p.item.el.classList.add('holding')},150);p.longTimer=setTimeout(()=>{if(s.p!==p||p.started||p.moved||s.mode!=='arrange')return;p.longPressed=true;p.kind='picker';p.item.el.classList.remove('holding');openPicker(p.item)},LONG_PRESS)}

  function setMode(next,announce=true){
    clearHold(s.p);s.p=null;s.pinch=null;s.pointers.clear();stage.classList.remove('panning','pinching');closePicker();if(next==='arrange')resetZoom(false);s.mode=next;s.vel=0;s.target=s.camera;const arrange=next==='arrange';stage.classList.toggle('view-mode',!arrange);stage.classList.toggle('arrange-mode',arrange);viewBtn.classList.toggle('active',!arrange);arrangeBtn.classList.toggle('active',arrange);modeLabel.textContent=arrange?'Перестановка · удерживай для вариантов':'Смотреть · свайп + 2 пальца = масштаб';
    if(arrange){s.items.filter(i=>!i.locked).forEach((i,k)=>{const img=i.el.querySelector('img');setTimeout(()=>img.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.09)',offset:.45},{filter:'brightness(1)'}],{duration:360,easing:'ease-out'}),Math.min(k*32,220))});if(announce)showHint('Тяни - двигай · удерживай растение или лежанку - варианты',3500)}else if(announce)showHint('Смотреть: 1 палец - камера · 2 пальца - масштаб',3000);vibrate(4)
  }

  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')||e.target.closest('.hud')||e.target.closest('.dock')||variantPanel.classList.contains('open'))return;stage.setPointerCapture?.(e.pointerId);s.vel=0;
    if(s.mode==='view'){s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(s.pointers.size>=2){beginPinch();return}s.p={id:e.pointerId,kind:'pan',sx:e.clientX,sy:e.clientY,lx:e.clientX,lt:performance.now(),cam:s.camera,started:false};return}
    const item=from(e.target);if(!item){s.p={id:e.pointerId,kind:'none'};return}const w=point(e.clientX,e.clientY),p={id:e.pointerId,kind:'item',item,sx:e.clientX,sy:e.clientY,dx:w.x-item.x,dy:w.y-item.y,started:false,moved:false,buzz:false,longPressed:false,longTimer:0,holdVisualTimer:0};s.p=p;armLongPress(p)
  });

  stage.addEventListener('pointermove',e=>{
    if(s.mode==='view'&&s.pointers.has(e.pointerId)){s.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(s.pinch){updatePinch();return}}
    const p=s.p;if(!p||p.id!==e.pointerId)return;
    if(p.kind==='pan'){const totalX=e.clientX-p.sx,totalY=e.clientY-p.sy,distance=Math.hypot(totalX,totalY);if(!p.started){if(distance<7)return;if(Math.abs(totalY)>Math.abs(totalX)*1.35)return;p.started=true;stage.classList.add('panning');hideHint()}const m=maxCam();s.target=clamp(p.cam-totalX/s.scale,0,m);s.camera=s.target;const now=performance.now(),dt=Math.max(8,now-p.lt),raw=-((e.clientX-p.lx)/s.scale)/dt*16.67;s.vel=clamp(raw,-17,17);p.lx=e.clientX;p.lt=now;return}
    if(p.kind!=='item')return;const distance=Math.hypot(e.clientX-p.sx,e.clientY-p.sy);if(distance>=MOVE_SLOP){p.moved=true;clearHold(p)}if(!p.started){if(distance<MOVE_SLOP)return;p.started=true;p.item.el.classList.add('dragging');p.item.el.style.filter='';hideHint();vibrate(5)}const w=point(e.clientX,e.clientY),i=p.item,pos=constrain(i,w.x-p.dx,w.y-p.dy);i.x=pos.x;i.y=pos.y;render(i);floorGuide.classList.toggle('edge',pos.edge);if(pos.edge&&!p.buzz){vibrate(3);p.buzz=true}else if(!pos.edge)p.buzz=false
  });

  function finishArrange(e){const p=s.p;if(!p||p.id!==e.pointerId)return;clearHold(p);floorGuide.classList.remove('edge');if(p.kind==='picker'||p.longPressed){s.p=null;return}if(p.kind==='item'){p.item.el.classList.remove('dragging','holding');render(p.item);if(p.started){save();vibrate(4);const img=p.item.el.querySelector('img');img.animate?.([{transform:'translateY(-2px) scale(1.008)'},{transform:'translateY(1px) scale(.997)',offset:.62},{transform:'none'}],{duration:210,easing:'cubic-bezier(.2,.78,.25,1)'})}}s.p=null}
  function finishView(e){s.pointers.delete(e.pointerId);if(s.pinch){if(s.pointers.size<2)endPinch();return}const p=s.p;if(!p||p.id!==e.pointerId)return;stage.classList.remove('panning');if(!p.started)s.vel=0;s.p=null}
  stage.addEventListener('pointerup',e=>s.mode==='view'?finishView(e):finishArrange(e));stage.addEventListener('pointercancel',e=>s.mode==='view'?finishView(e):finishArrange(e));

  $('reset').onclick=()=>{localStorage.removeItem('motya-hq-layout-v5');s.items.forEach(i=>{const d=defs.find(d=>d.id===i.id),p=constrain(d,d.x,d.y);i.x=p.x;i.y=p.y;if(i.family){i.variant=d.variant;i.src=familyVariant(i.family,i.variant).src;i.el.querySelector('img').src=i.src}render(i)});resetZoom(false);s.target=CAM;s.camera=clamp(s.camera,0,maxCam());vibrate(8);showHint('Мебель и варианты сброшены',1600)};
  viewBtn.onclick=()=>{if(s.mode==='view'&&Math.abs(s.zoom-1)>.01)resetZoom(true);else setMode('view')};arrangeBtn.onclick=()=>setMode('arrange');windowBtn.onclick=()=>{if(s.mode!=='view')setMode('view',false);const vw=stage.clientWidth/s.scale;s.target=clamp(1330-vw/2,0,maxCam());vibrate(5);showHint('Камера плавно переходит к окну',1300)};

  function parallax(){const drift=s.camera-CAM;s.items.forEach(i=>{const t=clamp((i.y-floor.top)/(floor.bottom-floor.top),0,1),f=lerp(.05,-.012,t);i.el.style.setProperty('--px',clamp(drift*f,-25,25).toFixed(1)+'px')})}
  function tick(now){const dt=Math.min(32,now-s.last||16.67);s.last=now;const m=maxCam();if(s.mode==='view'&&!s.p&&!s.pinch){s.target=clamp(s.target+s.vel*dt/16.67,0,m);s.vel*=Math.pow(.80,dt/16.67);if(Math.abs(s.vel)<.035)s.vel=0;s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67))}else if(s.mode==='view'&&s.p?.kind!=='pan'&&!s.pinch)s.camera+=(s.target-s.camera)*(1-Math.pow(.58,dt/16.67));scene.style.transform=`translate3d(${-s.camera*s.scale}px,-50%,0) scale(${s.scale})`;parallax();requestAnimationFrame(tick)}

  window.addEventListener('resize',updateScale);updateScale();setMode('view',false);requestAnimationFrame(tick);showHint('Смотреть: свайп и масштаб · Перестановка: удерживай предмет для вариантов',5200);
})();
