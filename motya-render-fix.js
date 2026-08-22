(()=>{
  const stage=document.getElementById('stage');
  if(!stage)return;

  const pctToIndex=v=>{
    const n=parseFloat(v||'0');
    if(n>=75)return 2;
    if(n>=25)return 1;
    return 0;
  };

  function sync(sprite,img){
    const cs=getComputedStyle(sprite);
    const col=pctToIndex(cs.getPropertyValue('--motya-x'));
    const row=pctToIndex(cs.getPropertyValue('--motya-y'));
    img.style.left=(-col*100)+'%';
    img.style.top=(-row*100)+'%';
  }

  function mount(sprite){
    if(!sprite||sprite.dataset.realMotya==='1')return;
    sprite.dataset.realMotya='1';
    sprite.style.background='none';
    const img=document.createElement('img');
    img.className='motya-sheet-img';
    img.src='assets/motya-sheet.webp?v=real-1';
    img.alt='';
    img.draggable=false;
    img.decoding='sync';
    sprite.appendChild(img);
    sync(sprite,img);
    const obs=new MutationObserver(()=>sync(sprite,img));
    obs.observe(sprite,{attributes:true,attributeFilter:['style','class']});
    img.addEventListener('load',()=>sync(sprite,img),{once:true});
  }

  const scan=()=>document.querySelectorAll('.motya-sprite').forEach(mount);
  scan();
  const treeObs=new MutationObserver(scan);
  treeObs.observe(stage,{subtree:true,childList:true});
})();
