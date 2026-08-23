(()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  if(!stage||!scene)return;

  const VERSION='motya-scale-crisp-20260823-1';
  const FRAME_FILES={
    idle:'assets/motya/idle.png',
    sit:'assets/motya/sit.png',
    sleep:'assets/motya/sleep.png',
    sad:'assets/motya/sad.png',
    play:'assets/motya/play.png',
    walk1:'assets/motya/walk1.png',
    walk2:'assets/motya/walk2.png',
    walk3:'assets/motya/walk3.png',
    walk4:'assets/motya/walk4.png'
  };
  const WALK=['walk1','walk2','walk3','walk4'];
  const CHARACTER_W=272;
  const WALK_W=272;
  const HOME={x:1120,y:748,w:CHARACTER_W};
  const state={...HOME,pose:'idle',busy:false,sleeping:false,sleepTimer:0,walkTimer:0};

  const urlFor=name=>(FRAME_FILES[name]||FRAME_FILES.idle)+'?v='+VERSION;
  const frameStatus={};
  const framesReady=Promise.allSettled(Object.entries(FRAME_FILES).map(([name,path])=>new Promise(resolve=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{frameStatus[name]=true;resolve()};
    img.onerror=()=>{frameStatus[name]=false;resolve()};
    img.src=path+'?v='+VERSION;
  })));

  function spriteMarkup(){
    return `<span class="motya-sprite" aria-hidden="true"><img class="motya-direct-img" src="${urlFor('idle')}" alt="" draggable="false"></span>`;
  }
  function setSprite(el,name){
    if(!el)return;
    const img=el.querySelector('.motya-direct-img');
    if(!img)return;
    const safeName=frameStatus[name]===false?'idle':name;
    const next=urlFor(safeName);
    el.dataset.frame=safeName;
    img.dataset.frameSrc=safeName;
    img.onerror=()=>{img.onerror=null;img.src=urlFor('idle')};
    if(img.getAttribute('src')!==next)img.src=next;
  }

  const character=document.createElement('button');
  character.id='motyaCharacter';
  character.className='motya-character';
  character.type='button';
  character.setAttribute('aria-label','Мотя');
  character.innerHTML=spriteMarkup();
  scene.appendChild(character);
  const sprite=character.querySelector('.motya-sprite');

  function setPosition(x,y,w=state.w){
    const px=Math.round(x);
    const py=Math.round(y);
    const pw=Math.round(w);
    state.x=px;state.y=py;state.w=pw;
    character.style.left=px+'px';
    character.style.top=py+'px';
    character.style.width=pw+'px';
    character.style.zIndex=String(2600+py);
  }
  function setPose(name){
    state.pose=name;
    character.dataset.pose=name;
    setSprite(sprite,name);
  }
  setPosition(HOME.x,HOME.y,HOME.w);
  setPose('idle');

  const actions=document.createElement('div');
  actions.className='motya-actions';
  actions.setAttribute('aria-hidden','true');
  actions.innerHTML='<div class="motya-actions-title"><span class="motya-paw">✦</span><b>Чем займёмся?</b></div><div class="motya-actions-row"><button type="button" data-action="sleep"><span>☾</span><b>Отдохнуть</b></button><button type="button" data-action="play"><span>♡</span><b>Поиграть</b></button><button type="button" data-action="mood"><span>☺</span><b>Как ты?</b></button></div>';
  stage.appendChild(actions);

  const toast=document.createElement('div');
  toast.className='motya-toast';
  toast.setAttribute('aria-live','polite');
  stage.appendChild(toast);
  let toastTimer=0;
  function say(text,ms=2200){clearTimeout(toastTimer);toast.textContent=text;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),ms)}
  function openActions(){if(state.busy||state.sleeping||stage.classList.contains('arrange-mode'))return;actions.classList.add('open');actions.setAttribute('aria-hidden','false')}
  function closeActions(){actions.classList.remove('open');actions.setAttribute('aria-hidden','true')}

  function depthAt(y){
    const t=Math.max(0,Math.min(1,(y-535)/(802-535)));
    return .88+t*.20;
  }

  function restSpot(){
    const chair=document.querySelector('#objects .item[data-id="armchair"]');
    const bed=document.querySelector('#objects .item[data-id="bed"]');
    const usable=el=>el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&Number(getComputedStyle(el).opacity)>0.05;

    if(usable(chair)){
      const x=parseFloat(chair.style.left)||760;
      const y=parseFloat(chair.style.top)||690;
      const rawW=parseFloat(chair.style.width)||285;
      const scaledW=rawW*depthAt(y);
      return{
        walkX:x+scaledW*.10,
        walkY:y+scaledW*.045,
        // Центр зелёного пуфика. Размер сна увеличен, но нижний якорь оставлен на поверхности.
        sleepX:x+scaledW*.165,
        sleepY:y-scaledW*.235,
        sleepW:scaledW*.52,
        sitX:x+scaledW*.15,
        sitY:y-scaledW*.17,
        sitW:scaledW*.48
      };
    }
    if(usable(bed)){
      const x=parseFloat(bed.style.left)||1515;
      const y=parseFloat(bed.style.top)||710;
      const rawW=parseFloat(bed.style.width)||220;
      const scaledW=rawW*depthAt(y);
      return{
        walkX:x-scaledW*.18,walkY:y+scaledW*.07,
        sleepX:x,sleepY:y-scaledW*.08,sleepW:scaledW*.82,
        sitX:x,sitY:y-scaledW*.04,sitW:scaledW*.76
      };
    }
    return{walkX:930,walkY:730,sleepX:930,sleepY:708,sleepW:190,sitX:930,sitY:724,sitW:185};
  }

  async function walkTo(x,y,duration=1650){
    await framesReady;
    return new Promise(resolve=>{
      clearInterval(state.walkTimer);
      const sx=state.x,sy=state.y,start=performance.now(),left=x<sx;
      character.classList.add('walking');
      character.classList.toggle('facing-left',left);
      let frame=0;
      setPose(WALK[frame]);
      setPosition(sx,sy,WALK_W);
      state.walkTimer=setInterval(()=>{
        frame=(frame+1)%WALK.length;
        setPose(WALK[frame]);
      },155);
      const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      function step(now){
        const t=Math.min(1,(now-start)/duration),q=ease(t);
        setPosition(sx+(x-sx)*q,sy+(y-sy)*q,WALK_W);
        if(t<1)requestAnimationFrame(step);
        else{
          clearInterval(state.walkTimer);state.walkTimer=0;
          character.classList.remove('walking','facing-left');
          setPose('idle');
          setPosition(x,y,CHARACTER_W);
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function goSleep(){
    if(state.busy)return;
    state.busy=true;closeActions();
    const spot=restSpot();
    say('Мотя идёт отдыхать…',1500);
    await walkTo(spot.walkX,spot.walkY,1750);
    character.classList.add('pose-swap');
    await new Promise(r=>setTimeout(r,120));
    setPose('sleep');
    setPosition(spot.sleepX,spot.sleepY,spot.sleepW);
    character.classList.remove('pose-swap');
    character.classList.add('sleeping');
    state.sleeping=true;state.busy=false;
    say('Тсс… Мотя уснула. Нажми на неё, чтобы разбудить.',2800);
    clearTimeout(state.sleepTimer);
    state.sleepTimer=setTimeout(()=>wakeUp(true),9000);
  }

  async function wakeUp(auto=false){
    if(!state.sleeping||state.busy)return;
    clearTimeout(state.sleepTimer);
    state.sleeping=false;state.busy=true;
    character.classList.remove('sleeping');
    const spot=restSpot();
    setPose('sit');
    setPosition(spot.sitX,spot.sitY,spot.sitW);
    say(auto?'Мотя проснулась!':'Доброе утро, Мотя!',1500);
    await new Promise(r=>setTimeout(r,950));
    await walkTo(HOME.x,HOME.y,1700);
    setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);
    state.busy=false;
  }

  async function play(){
    if(state.busy||state.sleeping)return;
    state.busy=true;closeActions();
    await framesReady;
    setPose('play');
    setPosition(state.x,state.y,CHARACTER_W);
    character.classList.add('happy-bounce');
    say('Ура! Поиграем ♡',1800);
    setTimeout(()=>{
      character.classList.remove('happy-bounce');
      setPose('idle');
      setPosition(state.x,state.y,CHARACTER_W);
      state.busy=false;
    },2300);
  }
  async function mood(){
    if(state.busy||state.sleeping)return;
    state.busy=true;closeActions();
    await framesReady;
    setPose('sad');
    setPosition(state.x,state.y,CHARACTER_W);
    character.classList.add('sad-mode');
    say('Я чуть-чуть скучаю. Погладишь меня?',2500);
    setTimeout(()=>{
      character.classList.remove('sad-mode');
      setPose('idle');
      setPosition(state.x,state.y,CHARACTER_W);
      state.busy=false;
    },3000);
  }

  actions.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    if(b.dataset.action==='sleep')goSleep();
    else if(b.dataset.action==='play')play();
    else mood();
  });
  character.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    if(state.sleeping)return wakeUp(false);
    if(state.busy)return;
    actions.classList.contains('open')?closeActions():openActions();
  });
  document.getElementById('arrange')?.addEventListener('click',closeActions);

  const intro=document.createElement('section');
  intro.className='motya-intro';
  intro.setAttribute('aria-label','Знакомство с Мотей');
  intro.innerHTML='<div class="motya-intro-card"><button class="motya-intro-close" type="button" aria-label="Закрыть знакомство">×</button><div class="motya-intro-dog">'+spriteMarkup()+'</div><div class="motya-intro-copy"><span class="motya-kicker">Твой цифровой питомец</span><div class="motya-type" aria-live="polite"></div><span class="motya-caret" aria-hidden="true"></span></div><div class="motya-intro-actions"><button type="button" data-intro="breed" class="secondary">Узнать о таксах</button><button type="button" data-intro="care" class="primary">Позаботиться о Моте</button></div><div class="motya-breed" hidden><b>Три вещи о таксах</b><p><span>01</span>Таксы обожают нюхать, искать и копать - это наследие норной охоты.</p><p><span>02</span>Длинную спину важно беречь от лишних прыжков и поддерживать мышцы.</p><p><span>03</span>Таксам полезны задачи для головы: поиск лакомств, команды и игры.</p><button type="button" data-intro="back">Вернуться к Моте</button></div></div>';
  stage.appendChild(intro);stage.classList.add('motya-intro-open');
  const introSprite=intro.querySelector('.motya-sprite');setSprite(introSprite,'idle');
  const typeEl=intro.querySelector('.motya-type'),caret=intro.querySelector('.motya-caret'),introActions=intro.querySelector('.motya-intro-actions'),breed=intro.querySelector('.motya-breed'),copy=intro.querySelector('.motya-intro-copy'),introDog=intro.querySelector('.motya-intro-dog');
  const message='Привет! Я Мотя. Я твой цифровой питомец и помогу тебе ухаживать за твоей таксой.';
  let i=0,timer=0;
  function typeNext(){if(i>=message.length){caret.classList.add('done');introActions.classList.add('ready');return}typeEl.textContent+=message[i++];timer=setTimeout(typeNext,26)}
  setTimeout(typeNext,350);

  async function enterCare(){
    state.busy=true;
    await framesReady;
    setPosition(HOME.x-310,HOME.y,CHARACTER_W);
    await walkTo(HOME.x,HOME.y,1550);
    setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);
    state.busy=false;
    say('Нажми на Мотю - выберем занятие.',2200);
    setTimeout(openActions,260);
  }
  function closeIntro(care=false){
    clearTimeout(timer);
    intro.classList.add('closing');stage.classList.remove('motya-intro-open');
    setTimeout(()=>intro.remove(),350);
    if(care)setTimeout(enterCare,390);
  }
  intro.addEventListener('click',e=>{
    if(e.target.closest('.motya-intro-close'))return closeIntro(false);
    const b=e.target.closest('[data-intro]');if(!b)return;
    if(b.dataset.intro==='care')return closeIntro(true);
    if(b.dataset.intro==='breed'){
      copy.hidden=true;introActions.hidden=true;introDog.classList.add('small');breed.hidden=false;
    }else{
      breed.hidden=true;copy.hidden=false;introActions.hidden=false;introDog.classList.remove('small');
    }
  });

  window.motyaGame={openActions,goSleep,wakeUp,setPose,frameFiles:FRAME_FILES};
})();
