(()=>{
  const stage=document.getElementById('stage');
  const scene=document.getElementById('scene');
  if(!stage||!scene)return;

  const VERSION='stable-motya-20260823-1';
  const FRAME_FILES={
    idle:'assets/motya/idle.webp',
    sit:'assets/motya/sit.webp',
    sleep:'assets/motya/sleep.webp',
    sad:'assets/motya/sad.webp'
  };
  const HOME={x:1120,y:748,w:230};
  const state={...HOME,pose:'idle',busy:false,sleeping:false,sleepTimer:0};
  const urlFor=name=>(FRAME_FILES[name]||FRAME_FILES.idle)+'?v='+VERSION;

  Object.values(FRAME_FILES).forEach(path=>{const img=new Image();img.decoding='async';img.src=path+'?v='+VERSION});

  function spriteMarkup(){
    return `<span class="motya-sprite" aria-hidden="true"><img class="motya-direct-img" src="${urlFor('idle')}" alt="" draggable="false"></span>`;
  }
  function setSprite(el,name){
    if(!el)return;
    const img=el.querySelector('.motya-direct-img');
    if(!img)return;
    const next=urlFor(name);
    el.dataset.frame=name;
    img.dataset.frameSrc=name;
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
    state.x=x;state.y=y;state.w=w;
    character.style.left=x+'px';
    character.style.top=y+'px';
    character.style.width=w+'px';
    character.style.zIndex=String(2600+Math.round(y));
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

  function restSpot(){
    const chair=document.querySelector('#objects .item[data-id="armchair"]');
    const bed=document.querySelector('#objects .item[data-id="bed"]');
    const usable=el=>el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&Number(getComputedStyle(el).opacity)>0.05;

    if(usable(chair)){
      const x=parseFloat(chair.style.left)||760;
      const y=parseFloat(chair.style.top)||690;
      // Отдельный якорь именно верхней зелёной поверхности пуфика.
      return{
        walkX:x+42, walkY:y+20,
        sleepX:x+36, sleepY:y-54, sleepW:94,
        sitX:x+36, sitY:y-38, sitW:108
      };
    }
    if(usable(bed)){
      const x=parseFloat(bed.style.left)||1515;
      const y=parseFloat(bed.style.top)||710;
      return{walkX:x-42,walkY:y+16,sleepX:x,sleepY:y-18,sleepW:148,sitX:x,sitY:y-8,sitW:154};
    }
    return{walkX:930,walkY:730,sleepX:930,sleepY:708,sleepW:160,sitX:930,sitY:724,sitW:174};
  }

  function walkTo(x,y,duration=1650){
    return new Promise(resolve=>{
      const sx=state.x,sy=state.y,start=performance.now(),left=x<sx;
      // Временно используем только чистый idle-спрайт. Никаких повреждённых walk-кадров.
      setPose('idle');
      character.classList.add('walking');
      character.classList.toggle('facing-left',left);
      const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      function step(now){
        const t=Math.min(1,(now-start)/duration),q=ease(t);
        setPosition(sx+(x-sx)*q,sy+(y-sy)*q,225);
        if(t<1)requestAnimationFrame(step);
        else{
          character.classList.remove('walking','facing-left');
          setPose('idle');
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
    await new Promise(r=>setTimeout(r,130));
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
    setPose('sit');setPosition(spot.sitX,spot.sitY,spot.sitW);
    say(auto?'Мотя проснулась!':'Доброе утро, Мотя!',1500);
    await new Promise(r=>setTimeout(r,900));
    await walkTo(HOME.x,HOME.y,1700);
    setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);
    state.busy=false;
  }

  function play(){
    if(state.busy||state.sleeping)return;
    state.busy=true;closeActions();
    // Пока без проблемного play.webp: чистый спрайт + игровая анимация корпуса.
    setPose('idle');
    character.classList.add('happy-bounce');
    say('Ура! Поиграем ♡',1800);
    setTimeout(()=>{character.classList.remove('happy-bounce');setPose('idle');state.busy=false},2200);
  }
  function mood(){
    if(state.busy||state.sleeping)return;
    state.busy=true;closeActions();
    setPose('sad');character.classList.add('sad-mode');
    say('Я чуть-чуть скучаю. Погладишь меня?',2500);
    setTimeout(()=>{character.classList.remove('sad-mode');setPose('idle');state.busy=false},3000);
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
    setPosition(HOME.x-260,HOME.y,HOME.w);
    await walkTo(HOME.x,HOME.y,1450);
    setPose('idle');setPosition(HOME.x,HOME.y,HOME.w);state.busy=false;
    say('Нажми на Мотю - выберем занятие.',2200);
    setTimeout(openActions,260);
  }
  function closeIntro(care=false){
    clearTimeout(timer);intro.classList.add('closing');stage.classList.remove('motya-intro-open');
    setTimeout(()=>intro.remove(),350);if(care)setTimeout(enterCare,390);
  }
  intro.addEventListener('click',e=>{
    if(e.target.closest('.motya-intro-close'))return closeIntro(false);
    const b=e.target.closest('[data-intro]');if(!b)return;
    if(b.dataset.intro==='care')return closeIntro(true);
    if(b.dataset.intro==='breed'){copy.hidden=true;introActions.hidden=true;introDog.classList.add('small');breed.hidden=false}
    else{breed.hidden=true;copy.hidden=false;introActions.hidden=false;introDog.classList.remove('small')}
  });

  window.motyaGame={openActions,goSleep,wakeUp,setPose};
})();
