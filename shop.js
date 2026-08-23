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
  const COINS_KEY='motya-coins-v1';
  const START_COINS=120;
  const LONG_PRESS=520;
  const HOLD_SLOP=8;

  const catalog=[
    {type:'armchair',category:'furniture',name:'Кресло',price:45,src:'assets/armchair.webp',w:285,foot:86,y:690},
    {type:'sofa',category:'furniture',name:'Диван',price:180,src:'assets/sofa.webp',w:505,foot:150,y:665},
    {type:'bookcase',category:'furniture',name:'Книжный шкаф',price:220,src:'assets/bookcase.webp',w:405,foot:112,y:635},
    {type:'stove',category:'furniture',name:'Камин',price:160,src:'assets/stove.webp',w:285,foot:82,y:625},
    {type:'table',category:'furniture',name:'Чайный столик',price:35,src:'assets/table.webp',w:225,foot:70,pad:25,y:730},
    {type:'nightstand',category:'furniture',name:'Тумбочка',price:55,src:'assets/nightstand.webp',w:175,foot:58,pad:6,y:700},
    {type:'garden',category:'furniture',name:'Тумба с растениями',price:140,src:'assets/garden.webp',w:400,foot:105,y:610},
    {type:'rug',category:'furniture',name:'Джутовый ковёр',price:75,src:'assets/rug.webp',w:545,foot:170,flat:true,y:760},
    {type:'round_bed',category:'furniture',name:'Круглая лежанка',price:60,src:'assets/round_bed.webp',w:220,foot:76,pad:4,y:710},
    {type:'bed_wicker',category:'furniture',name:'Плетёная лежанка',price:110,src:'assets/bed_wicker.webp',w:235,foot:82,y:710},
    {type:'bed_house',category:'furniture',name:'Домик-лежанка',price:200,src:'assets/bed_house.webp',w:245,foot:86,y:705},

    {type:'plant_monstera',category:'plants',name:'Монстера',price:25,src:'assets/plant.webp',w:180,foot:52,pad:13,y:675,ambient:true},
    {type:'plant_leafy',category:'plants',name:'Пышное растение',price:45,src:'assets/plant_alt1.webp',w:180,foot:52,pad:13,y:675,ambient:true},
    {type:'plant_trailing',category:'plants',name:'Свисающее растение',price:95,src:'assets/plant_alt2.webp',w:180,foot:52,pad:13,y:675,ambient:true}
  ];

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const depth=y=>.88+clamp((y-floor.top)/(floor.bottom-floor.top),0,1)*.20;
  const itemByType=type=>catalog.find(x=>x.type===type);

  let stored=[];
  try{stored=JSON.parse(localStorage.getItem(STORE_KEY)||'[]')}catch{stored=[]}
  if(!Array.isArray(stored))stored=[];

  let coins=START_COINS;
  try{
    const saved=Number(localStorage.getItem(COINS_KEY));
    if(Number.isFinite(saved)&&saved>=0)coins=Math.floor(saved);
  }catch{}

  const added=[];
  let deleteTarget=null;
  let activeCategory='furniture';

  function saveCoins(){try{localStorage.setItem(COINS_KEY,String(coins))}catch{}}
  function coinMarkup(value){return `<span class="coin-price-icon" aria-hidden="true">★</span><span>${value}</span>`}

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
    el.className='item shop-added'+(def.flat?' flat':'')+(def.ambient?' ambient':'')+(def.category==='plants'?' shop-plant':'');
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

  const coinPill=document.createElement('div');
  coinPill.className='coin-balance';
  coinPill.setAttribute('aria-label','Баланс монет');
  coinPill.innerHTML='<span class="coin-balance-icon" aria-hidden="true">★</span><b class="coin-balance-value"></b>';
  stage.appendChild(coinPill);

  const shopBtn=document.createElement('button');
  shopBtn.id='shopBtn';shopBtn.className='shop-float';shopBtn.type='button';shopBtn.setAttribute('aria-label','Магазин мебели и растений');shopBtn.setAttribute('aria-expanded','false');
  shopBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16l-1.3 10.2H5.3L4 7.5Z"/><path d="M8 7.5a4 4 0 0 1 8 0"/><path d="M9 11v1M15 11v1"/></svg><span>Магазин</span>';
  stage.appendChild(shopBtn);

  const backdrop=document.createElement('div');backdrop.className='shop-backdrop';stage.appendChild(backdrop);
  const panel=document.createElement('section');panel.className='shop-panel';panel.setAttribute('aria-hidden','true');
  panel.innerHTML=`
    <div class="shop-handle"></div>
    <div class="shop-head">
      <div><small>Каталог для комнаты</small><b>Магазин</b><p class="shop-wallet"><span class="coin-price-icon" aria-hidden="true">★</span><strong id="shopWalletValue"></strong> монет</p></div>
      <button class="shop-close" type="button" aria-label="Закрыть">×</button>
    </div>
    <div class="shop-tabs" role="tablist" aria-label="Категории магазина">
      <button type="button" class="shop-tab active" data-category="furniture" role="tab" aria-selected="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.2 11.5v-1.2a3.4 3.4 0 0 1 3.4-3.4h4.8a3.4 3.4 0 0 1 3.4 3.4v1.2"/><path d="M5 11.5a1.8 1.8 0 0 0-1.8 1.8v3.4h17.6v-3.4a1.8 1.8 0 0 0-1.8-1.8"/></svg>
        <span>Мебель</span>
      </button>
      <button type="button" class="shop-tab" data-category="plants" role="tab" aria-selected="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20v-8"/><path d="M12 13c-4.1 0-6.5-2.4-6.5-6.8 4.1 0 6.5 2.3 6.5 6.8Z"/><path d="M12 11c3.8 0 6.3-2 6.5-6.2-3.9 0-6.3 2.1-6.5 6.2Z"/><path d="M8.5 20h7"/></svg>
        <span>Растения</span>
      </button>
    </div>
    <div class="shop-grid"></div>`;
  stage.appendChild(panel);
  const grid=panel.querySelector('.shop-grid');
  const tabs=[...panel.querySelectorAll('.shop-tab')];
  const coinValue=coinPill.querySelector('.coin-balance-value');
  const shopWalletValue=panel.querySelector('#shopWalletValue');

  function updateCoinDisplays(animate=false){
    coinValue.textContent=String(coins);
    shopWalletValue.textContent=String(coins);
    if(animate){
      coinPill.classList.remove('coin-changed');
      void coinPill.offsetWidth;
      coinPill.classList.add('coin-changed');
      setTimeout(()=>coinPill.classList.remove('coin-changed'),420);
    }
  }

  function renderCatalog(category){
    activeCategory=category;
    tabs.forEach(tab=>{
      const active=tab.dataset.category===category;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',String(active));
    });
    grid.replaceChildren();
    catalog.filter(def=>def.category===category).forEach(def=>{
      const locked=coins<def.price;
      const card=document.createElement('button');
      card.type='button';
      card.className='shop-card'+(def.category==='plants'?' plant-card':'')+(locked?' shop-card-locked':'');
      card.disabled=locked;
      card.setAttribute('aria-label',locked?`${def.name}, ${def.price} монет, недостаточно монет`:`${def.name}, ${def.price} монет`);
      card.innerHTML=`<span class="shop-thumb"><img src="${def.src}" alt="${def.name}"></span><span class="shop-name">${def.name}</span><span class="shop-price">${coinMarkup(def.price)}</span>${locked?'<span class="shop-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/></svg></span>':''}`;
      if(!locked)card.addEventListener('click',()=>buy(def.type));
      grid.appendChild(card);
    });
    grid.scrollTop=0;
  }

  tabs.forEach(tab=>tab.addEventListener('click',()=>renderCatalog(tab.dataset.category)));
  updateCoinDisplays(false);
  renderCatalog(activeCategory);

  function openShop(){
    hideDelete();
    document.getElementById('variantClose')?.click();
    updateCoinDisplays(false);
    renderCatalog(activeCategory);
    stage.classList.add('shop-open');backdrop.classList.add('open');panel.classList.add('open');panel.setAttribute('aria-hidden','false');shopBtn.setAttribute('aria-expanded','true');
  }
  function closeShop(){
    stage.classList.remove('shop-open');backdrop.classList.remove('open');panel.classList.remove('open');panel.setAttribute('aria-hidden','true');shopBtn.setAttribute('aria-expanded','false');
  }
  function buy(type){
    const def=itemByType(type);if(!def||coins<def.price)return;
    coins-=def.price;
    saveCoins();
    updateCoinDisplays(true);
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
