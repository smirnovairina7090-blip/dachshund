(()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  const objects=document.getElementById('objects');
  const arrangeBtn=document.getElementById('arrange');
  const resetBtn=document.getElementById('reset');
  if(!stage||!scene||!objects||!arrangeBtn||!resetBtn)return;

  const W=1916,H=821;
  const floor={top:535,bottom:802,left:40,right:1876};
  const STORE_KEY='motya-shop-items-v1';
  const LONG_PRESS=520;
  const HOLD_SLOP=8;

  const catalog=[
    {type:'armchair',name:'Кресло',src:'assets/armchair.webp',w:285,foot:86,y:690},
    {type:'sofa',name:'Диван',src:'assets/sofa.webp',w:505,foot:150,y:665},
    {type:'bookcase',name:'Книжный шкаф',src:'assets/bookcase.webp',w:405,foot:112,y:635},
    {type:'stove',name:'Камин',src:'assets/stove.webp',w:285,foot:82,y:625},
    {type:'table',name:'Чайный столик',src:'assets/table.webp',w:225,foot:70,pad:25,y:730},
    {type:'nightstand',name:'Тумбочка',src:'assets/nightstand.webp',w:175,foot:58,pad:6,y:700},
    {type:'garden',name:'Тумба с растениями',src:'assets/garden.webp',w:400,foot:105,y:610},
    {type:'rug',name:'Джутовый ковёр',src:'assets/rug.webp',w:545,foot:170,flat:true,y:760},
    {type:'round_bed',name:'Круглая лежанка',src:'assets/round_bed.webp',w:220,foot:76,pad:4,y:710},
    {type:'bed_wicker',name:'Плетёная лежанка',src:'assets/bed_wicker.webp',w:235,foot:82,y:710},
    {type:'bed_house',name:'Домик-лежанка',src:'assets/bed_house.webp',w:245,foot:86,y:705}
  ];

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const depth=y=>.88+clamp((y-floor.top)/(floor.bottom-floor.top),0,1)*.20;
  const itemByType=type=>catalog.find(x=>x.type===type);

  let stored=[];
  try{stored=JSON.parse(localStorage.getItem(STORE_KEY)||'[]')}catch{stored=[]}
  if(!Array.isArray(stored))stored=[];
  const added=[];
  let deleteTarget=null;

  function sceneMetrics(){
    const r=scene.getBoundingClientRect();
    return {rect:r,scale:r.width/W};
  }
  function screenToWorld(x,y){
    const {rect,scale}=sceneMetrics();
    return {x:(x-rect.left)/scale,y:(y-rect.top)/scale};
  }
  function visibleWorldCenter(){
    const sr=stage.getBoundingClientRect();
    return screenToWorld(sr.left+sr.width/2,sr.top+sr.height/2).x;
  }
  function constrain(def,x,y){
    const yy=clamp(y,floor.top,floor.bottom);
    const d=def.flat?1:depth(yy);
    const half=(def.foot||70)*d*.5;
    return {x:clamp(x,floor.left+half,floor.right-half),y:yy};
  }
  function render(item){
    const d=item.def.flat?1:depth(item.y);
    item.el.style.left=item.x+'px';
    item.el.style.top=(item.y+(item.def.pad||0)*d)+'px';
    item.el.style.width=item.def.w+'px';
    item.el.style.setProperty('--scale',d.toFixed(4));
    item.el.style.setProperty('--shadow-w',Math.max(42,(item.def.foot||70)*.94)+'px');
    item.el.style.zIndex=item.def.flat?34:100+Math.round(item.y);
    if(!item.el.classList.contains('dragging')&&!item.el.classList.contains('shop-holding')&&!item.el.classList.contains('delete-ready')){
      item.el.style.filter=`drop-shadow(0 ${Math.round(5+d*4)}px ${Math.round(5+d*2)}px rgba(58,28,10,.18))`;
    }
  }
  function save(){
    localStorage.setItem(STORE_KEY,JSON.stringify(added.map(i=>({id:i.id,type:i.def.type,x:Math.round(i.x),y:Math.round(i.y)}))));
  }
  function hideDelete(){
    if(!deleteTarget)return;
    deleteTarget.el.classList.remove('delete-ready','shop-holding');
    render(deleteTarget);
    deleteTarget=null;
  }
  function showDelete(item){
    hideDelete();
    deleteTarget=item;
    item.el.classList.remove('shop-holding');
    item.el.classList.add('delete-ready');
    item.el.style.filter='';
    try{navigator.vibrate?.(11)}catch{}
  }
  function removeItem(item){
    if(!item)return;
    if(deleteTarget===item)deleteTarget=null;
    const index=added.indexOf(item);
    if(index>=0)added.splice(index,1);
    save();
    try{navigator.vibrate?.(8)}catch{}
    const animation=item.el.animate?.([
      {opacity:1,transform:getComputedStyle(item.el).transform},
      {opacity:0,transform:'translate3d(-50%,-100%,0) scale(.72)'}
    ],{duration:180,easing:'ease-in'});
    if(animation)animation.finished.then(()=>item.el.remove()).catch(()=>item.el.remove());
    else item.el.remove();
  }
  function createItem(data,animate=false){
    const def=itemByType(data.type);if(!def)return null;
    const pos=constrain(def,data.x??visibleWorldCenter(),data.y??def.y);
    const el=document.createElement('div');
    el.className='item shop-added'+(def.flat?' flat':'');
    el.dataset.shopId=data.id;
    const img=document.createElement('img');img.src=def.src;img.alt='';img.draggable=false;
    const del=document.createElement('button');
    del.type='button';del.className='shop-delete';del.setAttribute('aria-label','Удалить предмет');del.textContent='×';
    del.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
    del.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();removeItem(item)});
    el.append(img,del);objects.appendChild(el);
    const item={id:data.id,def,x:pos.x,y:pos.y,el};added.push(item);render(item);
    if(animate){
      el.animate?.([
        {opacity:0,transform:`translate3d(-50%,-88%,0) scale(${(def.flat?1:depth(pos.y))*.72})`},
        {opacity:1,transform:`translate3d(-50%,-102%,0) scale(${(def.flat?1:depth(pos.y))*1.03})`,offset:.72},
        {opacity:1,transform:`translate3d(-50%,-100%,0) scale(${def.flat?1:depth(pos.y)})`}
      ],{duration:340,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    return item;
  }
  stored.forEach(x=>createItem(x,false));

  const shopBtn=document.createElement('button');
  shopBtn.id='shopBtn';shopBtn.className='shop-float';shopBtn.type='button';shopBtn.setAttribute('aria-label','Магазин мебели');shopBtn.setAttribute('aria-expanded','false');
  shopBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16l-1.3 10.2H5.3L4 7.5Z"/><path d="M8 7.5a4 4 0 0 1 8 0"/><path d="M9 11v1M15 11v1"/></svg><span>Магазин</span>';
  stage.appendChild(shopBtn);

  const backdrop=document.createElement('div');backdrop.className='shop-backdrop';stage.appendChild(backdrop);
  const panel=document.createElement('section');panel.className='shop-panel';panel.setAttribute('aria-hidden','true');
  panel.innerHTML='<div class="shop-handle"></div><div class="shop-head"><div><small>Мебель для комнаты</small><b>Магазин</b><p>Пока всё бесплатно</p></div><button class="shop-close" type="button" aria-label="Закрыть">×</button></div><div class="shop-grid"></div>';
  stage.appendChild(panel);
  const grid=panel.querySelector('.shop-grid');

  catalog.forEach(def=>{
    const card=document.createElement('button');card.type='button';card.className='shop-card';
    card.innerHTML=`<span class="shop-thumb"><img src="${def.src}" alt="${def.name}"></span><span class="shop-name">${def.name}</span><span class="shop-price">Бесплатно</span>`;
    card.addEventListener('click',()=>buy(def.type));grid.appendChild(card);
  });

  function openShop(){
    hideDelete();
    document.getElementById('variantClose')?.click();
    stage.classList.add('shop-open');backdrop.classList.add('open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');shopBtn.setAttribute('aria-expanded','true');
  }
  function closeShop(){
    stage.classList.remove('shop-open');backdrop.classList.remove('open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');shopBtn.setAttribute('aria-expanded','false');
  }
  function buy(type){
    const def=itemByType(type);if(!def)return;
    arrangeBtn.click();
    closeShop();hideDelete();
    const same=added.filter(i=>i.def.type===type).length;
    const center=visibleWorldCenter()+((same%3)-1)*46;
    const id=`shop_${type}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    const item=createItem({id,type,x:center,y:def.y},true);
    save();
    try{navigator.vibrate?.(7)}catch{}
    if(item){item.el.classList.add('shop-new');setTimeout(()=>item.el.classList.remove('shop-new'),650)}
  }
  shopBtn.addEventListener('click',openShop);backdrop.addEventListener('click',closeShop);panel.querySelector('.shop-close').addEventListener('click',closeShop);
  panel.addEventListener('pointerdown',e=>e.stopPropagation());backdrop.addEventListener('pointerdown',e=>e.stopPropagation());

  let drag=null;
  function clearHold(){
    if(!drag)return;clearTimeout(drag.holdTimer);clearTimeout(drag.holdVisualTimer);
    if(drag.item&&!drag.item.el.classList.contains('delete-ready')){drag.item.el.classList.remove('shop-holding');render(drag.item)}
  }
  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest?.('.shop-delete'))return;
    const el=e.target.closest?.('.shop-added');
    if(!el){hideDelete();return}
    if(!stage.classList.contains('arrange-mode')||panel.classList.contains('open'))return;
    const item=added.find(i=>i.id===el.dataset.shopId);if(!item)return;
    if(deleteTarget&&deleteTarget!==item)hideDelete();
    e.preventDefault();e.stopPropagation();stage.setPointerCapture?.(e.pointerId);
    const p=screenToWorld(e.clientX,e.clientY);
    drag={id:e.pointerId,item,dx:p.x-item.x,dy:p.y-item.y,sx:e.clientX,sy:e.clientY,started:false,moved:false,longPressed:false,holdTimer:0,holdVisualTimer:0};
    drag.holdVisualTimer=setTimeout(()=>{if(drag&&!drag.started&&!drag.moved){item.el.classList.add('shop-holding');item.el.style.filter='';}},150);
    drag.holdTimer=setTimeout(()=>{
      if(!drag||drag.started||drag.moved)return;
      drag.longPressed=true;showDelete(item);
    },LONG_PRESS);
  },true);
  stage.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const distance=Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy);
    if(distance>=HOLD_SLOP&&!drag.moved){drag.moved=true;clearHold();hideDelete()}
    if(drag.longPressed)return;
    if(!drag.started&&distance>4){drag.started=true;hideDelete();drag.item.el.classList.add('dragging');drag.item.el.style.filter='';}
    if(!drag.started)return;
    const p=screenToWorld(e.clientX,e.clientY);const pos=constrain(drag.item.def,p.x-drag.dx,p.y-drag.dy);
    drag.item.x=pos.x;drag.item.y=pos.y;render(drag.item);
  },true);
  function finishDrag(e){
    if(!drag||drag.id!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    clearHold();
    if(drag.longPressed){drag=null;return}
    drag.item.el.classList.remove('dragging','shop-holding');render(drag.item);if(drag.started)save();drag=null;
  }
  stage.addEventListener('pointerup',finishDrag,true);stage.addEventListener('pointercancel',finishDrag,true);

  resetBtn.addEventListener('click',()=>{
    hideDelete();added.splice(0).forEach(i=>i.el.remove());localStorage.removeItem(STORE_KEY);closeShop();
  });
})();
