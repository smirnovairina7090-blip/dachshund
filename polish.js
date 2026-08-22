(()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  const floorGuide=document.getElementById('floorGuide');
  if(!stage||!scene)return;

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Living light, always behind furniture.
  if(!scene.querySelector('.polish-light')){
    const light=document.createElement('div');
    light.className='polish-light';
    if(floorGuide)scene.insertBefore(light,floorGuide);else scene.appendChild(light);
  }

  // Sliding shop indicator + one-time new dot for plants.
  const tabsWrap=stage.querySelector('.shop-tabs');
  const shopTabs=[...stage.querySelectorAll('.shop-tab')];
  let indicator=null;
  if(tabsWrap&&shopTabs.length){
    indicator=document.createElement('span');
    indicator.className='shop-tab-indicator';
    indicator.setAttribute('aria-hidden','true');
    tabsWrap.prepend(indicator);

    const plantsTab=shopTabs.find(t=>t.dataset.category==='plants');
    const PLANTS_SEEN='motya-shop-plants-polish-seen-v2';
    if(plantsTab&&!localStorage.getItem(PLANTS_SEEN))plantsTab.classList.add('has-new');

    const syncIndicator=()=>{
      const active=shopTabs.find(t=>t.classList.contains('active'))||shopTabs[0];
      indicator.style.transform=active?.dataset.category==='plants'?'translateX(calc(100% + 4px))':'translateX(0)';
    };
    const animateCards=()=>{
      if(reduceMotion)return;
      [...stage.querySelectorAll('.shop-grid .shop-card')].forEach((card,i)=>{
        card.classList.remove('polish-card-in');
        card.style.animationDelay=(i*34)+'ms';
        void card.offsetWidth;
        card.classList.add('polish-card-in');
      });
    };
    syncIndicator();
    requestAnimationFrame(animateCards);

    shopTabs.forEach(tab=>tab.addEventListener('click',()=>{
      if(tab.dataset.category==='plants'){
        tab.classList.remove('has-new');
        try{localStorage.setItem(PLANTS_SEEN,'1')}catch{}
      }
      requestAnimationFrame(()=>{syncIndicator();animateCards()});
    }));
    document.getElementById('shopBtn')?.addEventListener('click',()=>requestAnimationFrame(()=>{syncIndicator();animateCards()}));
  }

  // Clear, tactile selection feedback in arrange mode.
  let selected=null;
  function clearSelected(){selected?.classList.remove('polish-selected');selected=null}
  function select(el){
    if(selected===el)return;
    clearSelected();
    if(el?.isConnected){
      selected=el;
      selected.classList.add('polish-selected');
      if(!reduceMotion){
        const img=selected.querySelector('img');
        img?.animate?.([
          {transform:'translateY(0) scale(1)'},
          {transform:'translateY(-2px) scale(1.015)',offset:.58},
          {transform:'translateY(0) scale(1)'}
        ],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
      }
    }
  }
  stage.addEventListener('pointerdown',e=>{
    if(!stage.classList.contains('arrange-mode'))return clearSelected();
    if(e.target.closest?.('button,.dock,.shop-panel,.shop-backdrop,.variant-panel,.delete-confirm,.delete-confirm-backdrop'))return;
    const item=e.target.closest?.('.item');
    if(item)select(item);else clearSelected();
  });
  document.getElementById('viewMode')?.addEventListener('click',clearSelected);
  document.getElementById('shopBtn')?.addEventListener('click',clearSelected);

  // Entering arrange mode gets one visible floor flash + sequential object wake-up.
  function arrangeEntrance(){
    if(reduceMotion)return;
    const flash=document.createElement('div');
    flash.className='polish-mode-flash';
    stage.appendChild(flash);
    flash.addEventListener('animationend',()=>flash.remove(),{once:true});
    const items=[...stage.querySelectorAll('.item')].filter(el=>el.isConnected);
    items.forEach((el,i)=>{
      const img=el.querySelector('img');
      if(!img)return;
      setTimeout(()=>img.animate?.([
        {transform:'translateY(0) scale(1)',filter:'brightness(1)'},
        {transform:'translateY(-3px) scale(1.018)',filter:'brightness(1.11)',offset:.5},
        {transform:'translateY(0) scale(1)',filter:'brightness(1)'}
      ],{duration:330,easing:'cubic-bezier(.16,1,.3,1)'}),Math.min(i*38,300));
    });
  }
  document.getElementById('arrange')?.addEventListener('click',()=>setTimeout(arrangeEntrance,30));

  // Card -> room purchase flight. Real creation remains in shop.js.
  function flyPurchase(card){
    if(reduceMotion)return;
    const img=card.querySelector('img');
    if(!img)return;
    const r=img.getBoundingClientRect();
    const sr=stage.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const ghost=img.cloneNode(true);
    ghost.className='purchase-ghost';
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.appendChild(ghost);
    const sx=r.left+r.width/2,sy=r.top+r.height/2;
    const tx=sr.left+sr.width/2,ty=sr.top+sr.height*.68;
    const dx=tx-sx,dy=ty-sy;
    const a=ghost.animate([
      {transform:'translate3d(0,0,0) scale(1)',opacity:1,filter:'drop-shadow(0 10px 9px rgba(55,31,16,.24)) brightness(1)'},
      {transform:`translate3d(${dx*.32}px,${dy*.18}px,0) scale(.93) rotate(-1deg)`,opacity:1,offset:.28},
      {transform:`translate3d(${dx*.72}px,${dy*.62}px,0) scale(.68) rotate(1deg)`,opacity:.96,filter:'drop-shadow(0 7px 7px rgba(55,31,16,.18)) brightness(1.08)',offset:.68},
      {transform:`translate3d(${dx}px,${dy}px,0) scale(.48)`,opacity:0,filter:'drop-shadow(0 2px 3px rgba(55,31,16,.06)) blur(1px) brightness(1.18)'}
    ],{duration:590,easing:'cubic-bezier(.2,.78,.22,1)'});
    a.finished.then(()=>ghost.remove()).catch(()=>ghost.remove());
  }
  document.addEventListener('click',e=>{
    const card=e.target.closest?.('.shop-card');
    if(!card)return;
    card.classList.add('purchasing');
    flyPurchase(card);
    setTimeout(()=>card.classList.remove('purchasing'),260);
  },true);

  // Variant change: visible halo around the actual bed/plant.
  function morphHalo(item){
    if(reduceMotion||!item)return;
    const r=item.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const halo=document.createElement('div');
    halo.className='morph-halo';
    Object.assign(halo.style,{left:(r.left-8)+'px',top:(r.top-8)+'px',width:(r.width+16)+'px',height:(r.height+16)+'px'});
    document.body.appendChild(halo);
    const a=halo.animate([
      {opacity:0,transform:'scale(.9)'},
      {opacity:.92,transform:'scale(1.02)',offset:.36},
      {opacity:.35,transform:'scale(1.07)',offset:.7},
      {opacity:0,transform:'scale(1.12)'}
    ],{duration:520,easing:'cubic-bezier(.16,1,.3,1)'});
    a.finished.then(()=>halo.remove()).catch(()=>halo.remove());
  }
  document.addEventListener('click',e=>{
    if(!e.target.closest?.('.variant-option'))return;
    morphHalo(stage.querySelector('.picker-target'));
  },true);

  // Dissolve animation alongside existing delete persistence.
  function dissolveSelected(){
    if(reduceMotion)return;
    const item=stage.querySelector('.global-delete-selected');
    const img=item?.querySelector('img');
    if(!item||!img)return;
    const r=img.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    const ghost=img.cloneNode(true);
    ghost.className='delete-ghost';
    Object.assign(ghost.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    document.body.appendChild(ghost);
    const a=ghost.animate([
      {opacity:1,transform:'translate3d(0,0,0) scale(1)',filter:'blur(0) brightness(1)'},
      {opacity:.72,transform:'translate3d(0,-4px,0) scale(.96)',filter:'blur(.4px) brightness(1.08)',offset:.38},
      {opacity:.28,transform:'translate3d(0,-10px,0) scale(.86)',filter:'blur(2px) brightness(1.18)',offset:.7},
      {opacity:0,transform:'translate3d(0,-18px,0) scale(.72)',filter:'blur(7px) brightness(1.25)'}
    ],{duration:520,easing:'cubic-bezier(.3,.02,.3,1)'});
    a.finished.then(()=>ghost.remove()).catch(()=>ghost.remove());

    const cx=r.left+r.width/2,cy=r.top+r.height*.58;
    for(let i=0;i<9;i++){
      const p=document.createElement('i');
      p.className='delete-spark';
      p.style.left=(cx-2)+'px';p.style.top=(cy-2)+'px';document.body.appendChild(p);
      const angle=(-Math.PI*.95)+(i/8)*Math.PI*.9;
      const dist=22+Math.random()*34;
      const dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist-10-Math.random()*12;
      const pa=p.animate([
        {opacity:0,transform:'translate3d(0,0,0) scale(.45)'},
        {opacity:.95,transform:`translate3d(${dx*.32}px,${dy*.32}px,0) scale(1)`,offset:.3},
        {opacity:0,transform:`translate3d(${dx}px,${dy}px,0) scale(.15)`}
      ],{duration:430+Math.random()*150,easing:'ease-out'});
      pa.finished.then(()=>p.remove()).catch(()=>p.remove());
    }
  }
  document.addEventListener('click',e=>{if(e.target.closest?.('.delete-accept'))dissolveSelected()},true);

  const observer=new MutationObserver(()=>{if(selected&&!selected.isConnected)selected=null});
  observer.observe(stage,{childList:true,subtree:true});
})();
