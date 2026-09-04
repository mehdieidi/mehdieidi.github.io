import { galleries, collection, media, accuracyNotes, researchSources } from './museum-data.js?v=5.0.0';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const ui = {
  canvas: $('#museum'), intro: $('#intro'), loading: $('#loading'), progress: $('#loadProgress'), loadText: $('#loadText'), fatal: $('#fatal'),
  roomNumber: $('#roomNumber'), roomEra: $('#roomEra'), roomTitle: $('#roomTitle'), hover: $('#hoverLabel'), reticle: $('#reticle'),
  drawer: $('#exhibitDrawer'), drawerBackdrop: $('#drawerBackdrop'),
  exhibitGallery: $('#exhibitGallery'), exhibitTitle: $('#exhibitTitle'), exhibitSubtitle: $('#exhibitSubtitle'), exhibitFigure: $('#exhibitFigure'), exhibitImage: $('#exhibitImage'), exhibitCredit: $('#exhibitCredit'), exhibitPaper: $('#exhibitPaper'), exhibitMeaning: $('#exhibitMeaning'), sourceBasisTitle: $('#sourceBasisTitle'), sourcesSection: $('#sourcesSection'), exhibitSources: $('#exhibitSources'), accuracySection: $('#accuracySection'), exhibitAccuracy: $('#exhibitAccuracy'), accuracyLink: $('#accuracyLink'), provenanceSection: $('#provenanceSection'), exhibitProvenance: $('#exhibitProvenance'), mediaLink: $('#mediaLink'), exhibitTags: $('#exhibitTags'),
  mapModal: $('#mapModal'), collectionModal: $('#collectionModal'), sourceModal: $('#sourceModal'), helpModal: $('#helpModal'), mapCanvas: $('#mapCanvas'), mapCurrent: $('#mapCurrent'),
  collectionGrid: $('#collectionGrid'), collectionSearch: $('#collectionSearch'), collectionType: $('#collectionType'), collectionCount: $('#collectionCount'),
  coverageGrid: $('#coverageGrid'), paperGrid: $('#paperGrid'), researchGrid: $('#researchGrid'), accuracyGrid: $('#accuracyGrid'), referencesGrid: $('#referencesGrid'),
  prev: $('#prevGallery'), next: $('#nextGallery'), guided: $('#guidedMode')
};

let THREE;
let scene, camera, renderer, raycaster;
let interactive = [];
let currentGallery = 0;
let yaw = 0, pitch = 0;
let lastTime = performance.now();
let fly = null;
let entered = false;
const keys = new Set();
const mobileMove = new Set();
const walkable = [];
const roomDoorSides = [];
const pointer = {down:false, id:null, x:0, y:0, sx:0, sy:0, moved:false, ndcX:0, ndcY:0, hoverX:0, hoverY:0};
const H = 1.65;
const ROOM = 18;
const HALF = ROOM/2;
const WALL_H = 5.8;
const DOOR = 6.4;
const DOOR_H = 3.55;
const GALLERY_STEP = 21.0;

function setProgress(p, text){ ui.progress.style.width = `${Math.max(4,Math.min(100,p))}%`; if(text) ui.loadText.textContent = text; }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function lerp(a,b,t){ return a+(b-a)*t; }
function smooth(t){ return t*t*(3-2*t); }
function angleDelta(a,b){ let d=(b-a+Math.PI)%(Math.PI*2)-Math.PI; if(d<-Math.PI)d+=Math.PI*2; return d; }
function lookAngles(pos,target){ const dx=target[0]-pos[0], dy=target[1]-pos[1], dz=target[2]-pos[2]; const flat=Math.hypot(dx,dz); return {yaw:Math.atan2(-dx,-dz), pitch:Math.atan2(dy,flat)}; }
function updateCameraRotation(){ camera.rotation.order='YXZ'; camera.rotation.y=yaw; camera.rotation.x=pitch; }

function direction(a,b){ const dx=b[0]-a[0], dz=b[1]-a[1]; if(Math.abs(dx)>Math.abs(dz)) return dx>0?'E':'W'; return dz>0?'S':'N'; }
function opposite(d){ return ({N:'S',S:'N',E:'W',W:'E'})[d]; }

let layoutNormalized=false;
function normalizeGalleryLayout(){
  if(layoutNormalized||!galleries.length)return;layoutNormalized=true;
  const oldCenters=galleries.map(g=>[...g.center]);
  const oldCamera=galleries.map(g=>[...g.camera]);
  const oldLook=galleries.map(g=>[...g.look]);
  const nextCenters=[[...oldCenters[0]]];
  for(let i=1;i<galleries.length;i++){
    const d=direction(oldCenters[i-1],oldCenters[i]),p=nextCenters[i-1];
    const delta=d==='E'?[GALLERY_STEP,0]:d==='W'?[-GALLERY_STEP,0]:d==='S'?[0,GALLERY_STEP]:[0,-GALLERY_STEP];
    nextCenters.push([p[0]+delta[0],p[1]+delta[1]]);
  }
  galleries.forEach((g,i)=>{
    const old=oldCenters[i],neu=nextCenters[i];
    const camRel=[oldCamera[i][0]-old[0],oldCamera[i][1],oldCamera[i][2]-old[1]];
    const lookRel=[oldLook[i][0]-old[0],oldLook[i][1],oldLook[i][2]-old[1]];
    g.center=neu;g.camera=[neu[0]+camRel[0],camRel[1],neu[1]+camRel[2]];g.look=[neu[0]+lookRel[0],lookRel[1],neu[1]+lookRel[2]];
  });
}

function buildDoorMap(){
  galleries.forEach((g,i)=>{ const s=new Set(); if(i>0)s.add(direction(g.center,galleries[i-1].center)); if(i<galleries.length-1)s.add(direction(g.center,galleries[i+1].center)); roomDoorSides[i]=s; });
}

function addWalkableRect(x0,x1,z0,z1){ walkable.push({x0:Math.min(x0,x1),x1:Math.max(x0,x1),z0:Math.min(z0,z1),z1:Math.max(z0,z1)}); }
function buildWalkable(){
  galleries.forEach(g=>addWalkableRect(g.center[0]-8.45,g.center[0]+8.45,g.center[1]-8.45,g.center[1]+8.45));
  for(let i=0;i<galleries.length-1;i++){
    const a=galleries[i].center,b=galleries[i+1].center;
    if(a[1]===b[1]) addWalkableRect(Math.min(a[0],b[0])-0.05,Math.max(a[0],b[0])+0.05,a[1]-(DOOR/2-.28),a[1]+(DOOR/2-.28));
    else addWalkableRect(a[0]-(DOOR/2-.28),a[0]+(DOOR/2-.28),Math.min(a[1],b[1])-0.05,Math.max(a[1],b[1])+0.05);
  }
}
function canStand(x,z){ return walkable.some(r=>x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1); }

function canvasTexture(draw,w=1024,h=512){
  const c=document.createElement('canvas'); c.width=w;c.height=h; const ctx=c.getContext('2d'); draw(ctx,w,h); const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=Math.min(8,renderer?.capabilities?.getMaxAnisotropy?.()||1); return tex;
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=10){
  const words=text.split(/\s+/); let line='',lines=[];
  for(const word of words){ const test=line?line+' '+word:word; if(ctx.measureText(test).width>maxWidth && line){lines.push(line);line=word;}else line=test; }
  if(line)lines.push(line);
  if(lines.length>maxLines){ lines=lines.slice(0,maxLines); let l=lines[maxLines-1]; while(ctx.measureText(l+'…').width>maxWidth&&l.length>2)l=l.slice(0,-1); lines[maxLines-1]=l+'…'; }
  lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
  return lines.length;
}
function truncate(s,n=235){ return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s; }

function box(x,y,z,mat){ const m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat); return m; }
function placeOnWall(obj,side,cx,cz,offset=0,y=2.5,depth=.11){
  if(side==='N'){obj.position.set(cx+offset,y,cz-HALF+depth);obj.rotation.y=0;}
  if(side==='S'){obj.position.set(cx-offset,y,cz+HALF-depth);obj.rotation.y=Math.PI;}
  if(side==='W'){obj.position.set(cx-HALF+depth,y,cz-offset);obj.rotation.y=Math.PI/2;}
  if(side==='E'){obj.position.set(cx+HALF-depth,y,cz+offset);obj.rotation.y=-Math.PI/2;}
}
function addWallSegment(group,side,cx,cz,len,offset,mat){
  let m;
  if(side==='N'||side==='S'){
    m=box(len,WALL_H,.18,mat);m.position.set(cx+offset,WALL_H/2,cz+(side==='N'?-HALF:HALF));
  }else{
    m=box(.18,WALL_H,len,mat);m.position.set(cx+(side==='W'?-HALF:HALF),WALL_H/2,cz+offset);
  }
  group.add(m);
}
function addTrimRun(group,side,cx,cz,len,offset,y,height,depth,mat){
  const trim=(side==='N'||side==='S')?box(len,height,depth,mat):box(depth,height,len,mat);
  if(side==='N'||side==='S') trim.position.set(cx+offset,y,cz+(side==='N'?-HALF+.13:HALF-.13));
  else trim.position.set(cx+(side==='W'?-HALF+.13:HALF-.13),y,cz+offset);
  group.add(trim);
}
function addWainscotPanels(group,side,cx,cz,len,offset,mats){
  const count=Math.max(1,Math.round(len/4.5));
  const cell=len/count, pw=Math.max(.8,cell-.42);
  for(let j=0;j<count;j++){
    const local=offset-len/2+cell*(j+.5);
    const panel=(side==='N'||side==='S')?box(pw,.78,.055,mats.wainscot):box(.055,.78,pw,mats.wainscot);
    if(side==='N'||side==='S')panel.position.set(cx+local,.59,cz+(side==='N'?-HALF+.145:HALF-.145));
    else panel.position.set(cx+(side==='W'?-HALF+.145:HALF-.145),.59,cz+local);
    group.add(panel);
  }
}
function addDecoratedWallSegment(group,side,cx,cz,len,offset,mats){
  addWallSegment(group,side,cx,cz,len,offset,mats.wall);
  addTrimRun(group,side,cx,cz,len,offset,.16,.28,.12,mats.baseboard);
  addTrimRun(group,side,cx,cz,len,offset,1.12,.09,.10,mats.trim);
  addTrimRun(group,side,cx,cz,len,offset,WALL_H-.19,.22,.13,mats.crown);
  addWainscotPanels(group,side,cx,cz,len,offset,mats);
}
function addRoomWalls(group,g,i,mats){
  for(const side of ['N','E','S','W']){
    if(roomDoorSides[i].has(side)){
      const seg=(ROOM-DOOR)/2, off=(DOOR+seg)/2;
      addDecoratedWallSegment(group,side,g.center[0],g.center[1],seg,-off,mats);
      addDecoratedWallSegment(group,side,g.center[0],g.center[1],seg,off,mats);
      const lintelH=WALL_H-DOOR_H; let lintel;
      if(side==='N'||side==='S'){
        lintel=box(DOOR,lintelH,.19,mats.wall);
        lintel.position.set(g.center[0],DOOR_H+lintelH/2,g.center[1]+(side==='N'?-HALF:HALF));
      }else{
        lintel=box(.19,lintelH,DOOR,mats.wall);
        lintel.position.set(g.center[0]+(side==='W'?-HALF:HALF),DOOR_H+lintelH/2,g.center[1]);
      }
      group.add(lintel);
      addTrimRun(group,side,g.center[0],g.center[1],DOOR,0,WALL_H-.19,.22,.13,mats.crown);
    }else addDecoratedWallSegment(group,side,g.center[0],g.center[1],ROOM,0,mats);
  }
}
function addCornerPilasters(g,mats){
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const p=box(.28,WALL_H-.32,.28,mats.pilaster);p.position.set(g.center[0]+sx*(HALF-.20),(WALL_H-.32)/2,g.center[1]+sz*(HALF-.20));scene.add(p);
  }
}
function addFloorBorder(g,mats){
  const d=13.8,w=.055,y=.012;
  for(const z of [-d/2,d/2]){const r=box(d,.015,w,mats.brass);r.position.set(g.center[0],y,g.center[1]+z);scene.add(r);}
  for(const x of [-d/2,d/2]){const r=box(w,.015,d,mats.brass);r.position.set(g.center[0]+x,y,g.center[1]);scene.add(r);}
}
function addCeilingCoffer(g,mats){
  const y=WALL_H-.075,outer=13.6,beam=.14;
  for(const z of [-outer/2,outer/2]){const b=box(outer,.11,beam,mats.ceilingTrim);b.position.set(g.center[0],y,g.center[1]+z);scene.add(b);}
  for(const x of [-outer/2,outer/2]){const b=box(beam,.11,outer,mats.ceilingTrim);b.position.set(g.center[0]+x,y,g.center[1]);scene.add(b);}
  const glow=box(4.8,.035,1.05,mats.ceilingGlow);glow.position.set(g.center[0],WALL_H-.13,g.center[1]);scene.add(glow);
}
function addWallBackdrop(g,i,mats){
  const free=['N','E','S','W'].filter(s=>!roomDoorSides[i].has(s));
  for(const side of free){
    const panel=box(15.7,4.42,.055,mats.wallBay); placeOnWall(panel,side,g.center[0],g.center[1],0,2.83,.13);scene.add(panel);
    const top=box(15.9,.075,.075,mats.brass); placeOnWall(top,side,g.center[0],g.center[1],0,5.09,.17);scene.add(top);
  }
}
function makeRoomTitleTexture(g){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#26231f';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b58c4f';ctx.fillRect(0,h-12,w,12);
    ctx.fillStyle='#d8c29b';ctx.font='700 25px Arial';ctx.letterSpacing='4px';ctx.fillText(`GALLERY ${g.number}  ·  ${g.years}`,54,58);
    ctx.fillStyle='#fffdf7';ctx.font='500 48px Georgia';wrapText(ctx,g.title,54,118,w-108,54,2);
    ctx.fillStyle='#c7c0b5';ctx.font='400 19px Arial';ctx.fillText(g.paperSection,54,h-34);
  },1400,320);
}
function makeNextGalleryTexture(next){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#f1ede4';ctx.fillRect(0,0,w,h);ctx.fillStyle='#2d2924';ctx.fillRect(0,0,w,94);ctx.fillStyle='#b58c4f';ctx.fillRect(0,94,w,8);
    ctx.fillStyle='#e8d7b8';ctx.font='700 23px Arial';ctx.letterSpacing='3px';ctx.fillText(`NEXT GALLERY  ${next.number}  ·  ${next.years}`,48,58);
    ctx.fillStyle='#1b1a18';ctx.font='500 43px Georgia';const used=wrapText(ctx,next.title,48,154,w-96,48,3);
    let y=154+used*48+20;ctx.fillStyle='#6a635b';ctx.font='600 18px Arial';ctx.fillText('WHAT YOU WILL ENCOUNTER',48,y);y+=38;
    ctx.fillStyle='#37332e';ctx.font='400 22px Georgia';
    const ideas=(next.ideas||[]).slice(0,2);for(const idea of ideas){ctx.fillText('•',52,y);const n=wrapText(ctx,idea,76,y,w-124,30,2);y+=n*30+13;}
    ctx.fillStyle='#8f6f32';ctx.font='700 20px Arial';ctx.fillText('ENTER THROUGH THIS DOOR  →',48,h-42);
  },1050,650);
}
function createPortalSurround(g,side,mats){
  const grp=new THREE.Group();
  const jambH=DOOR_H+.22;
  for(const x of [-(DOOR/2+.22),DOOR/2+.22]){const j=box(.36,jambH,.34,mats.portal);j.position.set(x,jambH/2,0);grp.add(j);}
  const head=box(DOOR+.92,.40,.36,mats.portal);head.position.set(0,DOOR_H+.18,0);grp.add(head);
  const corn=box(DOOR+1.24,.12,.42,mats.brass);corn.position.set(0,DOOR_H+.43,.015);grp.add(corn);
  const lintelLight=box(1.65,.055,.09,new THREE.MeshStandardMaterial({color:0xc49a5b,emissive:0x7b5528,emissiveIntensity:.55,metalness:.35,roughness:.42}));
  lintelLight.position.set(0,DOOR_H+.03,.23);grp.add(lintelLight);
  placeOnWall(grp,side,g.center[0],g.center[1],0,0,.25); grp.position.y=0; scene.add(grp);
}
function createTitlePanel(g,i){
  const side=i>0?direction(g.center,galleries[i-1].center):(i<galleries.length-1?direction(g.center,galleries[i+1].center):'N');
  const grp=new THREE.Group();
  const shadow=box(5.95,1.42,.12,new THREE.MeshStandardMaterial({color:0x1c1a17,roughness:.6}));grp.add(shadow);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(5.70,1.18),new THREE.MeshBasicMaterial({map:makeRoomTitleTexture(g),toneMapped:false}));p.position.z=.071;grp.add(p);
  placeOnWall(grp,side,g.center[0],g.center[1],0,4.62,.19);scene.add(grp);
}
function createNextGalleryPanel(g,i){
  if(i>=galleries.length-1)return;
  const next=galleries[i+1],side=direction(g.center,next.center);
  const grp=new THREE.Group();
  const frame=box(4.35,2.82,.12,new THREE.MeshStandardMaterial({color:0x302a23,roughness:.52}));grp.add(frame);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(4.06,2.52),new THREE.MeshBasicMaterial({map:makeNextGalleryTexture(next),toneMapped:false}));p.position.z=.071;grp.add(p);
  // Always place the wayfinding board on the left side of the exit as the visitor faces it.
  placeOnWall(grp,side,g.center[0],g.center[1],-5.80,2.65,.20);scene.add(grp);
}

function makeExhibitTextTexture(ex){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#f7f3ea';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#b9aa92';ctx.lineWidth=3;ctx.strokeRect(12,12,w-24,h-24);
    ctx.fillStyle='#8f6f32';ctx.font='700 22px Arial';ctx.fillText('INTERPRETIVE OBJECT',52,58);
    ctx.fillStyle='#171716';ctx.font='500 45px Georgia';let used=wrapText(ctx,ex.title,52,122,w-104,50,2);
    const sy=122+used*50+18;ctx.fillStyle='#6b675f';ctx.font='600 21px Arial';ctx.fillText(ex.subtitle||'',52,sy);
    ctx.fillStyle='#34322e';ctx.font='400 25px Georgia';wrapText(ctx,truncate(ex.paper,270),52,sy+54,w-104,35,6);
    ctx.fillStyle='#8a857b';ctx.font='400 18px Arial';ctx.fillText('Click to read the full museum dossier',52,h-42);
  },1100,700);
}
function makeCaptionTexture(ex){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,w,h);ctx.fillStyle='#b58c4f';ctx.fillRect(0,0,8,h);
    ctx.fillStyle='#1b1b19';ctx.font='600 31px Georgia';wrapText(ctx,ex.title,34,50,w-68,36,2);
    ctx.fillStyle='#706c64';ctx.font='400 19px Arial';wrapText(ctx,ex.subtitle||'',34,126,w-68,26,2);
    ctx.fillStyle='#8f6f32';ctx.font='700 15px Arial';ctx.fillText('CLICK TO INSPECT',34,h-28);
  },800,240);
}
function makeHybridTextTexture(ex){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#f7f3ea';ctx.fillRect(0,0,w,h);ctx.fillStyle='#8f6f32';ctx.fillRect(0,0,8,h);
    ctx.fillStyle='#8f6f32';ctx.font='700 18px Arial';ctx.fillText(ex.sourceLabel==='Historical record'?'HISTORICAL RECORD':'INTERPRETIVE WALL',42,44);
    ctx.fillStyle='#171716';ctx.font='500 37px Georgia';const used=wrapText(ctx,ex.title,42,92,w-84,41,2);
    const sy=92+used*41+8;ctx.fillStyle='#666159';ctx.font='600 17px Arial';wrapText(ctx,ex.subtitle||'',42,sy,w-84,22,2);
    ctx.fillStyle='#34322e';ctx.font='400 19px Georgia';wrapText(ctx,truncate(ex.paper,215),42,sy+50,w-84,27,5);
    ctx.fillStyle='#8a857b';ctx.font='400 14px Arial';ctx.fillText('Click for full text, provenance and sources',42,h-26);
  },1100,440);
}
function makePlaceholderTexture(title){
  return canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#ded7ca';ctx.fillRect(0,0,w,h);ctx.fillStyle='#c9c0b0';ctx.fillRect(0,0,w,16);
    ctx.fillStyle='#2b2a27';ctx.font='500 40px Georgia';wrapText(ctx,title,55,h/2-55,w-110,48,3);
    ctx.font='500 17px Arial';ctx.fillStyle='#665f55';ctx.fillText('Offline media cache pending — run run_museum.py once while online.',55,h-46);
  },1000,650);
}
async function loadLocalAttribution(){
  try{
    const res=await fetch('./assets/media/attribution.json?v=5.0.0',{cache:'no-store'});
    if(!res.ok)return;
    const records=await res.json();
    for(const [key,info] of Object.entries(records)){
      if(!media[key])continue;
      Object.assign(media[key],{
        local:info.local||media[key].local,
        title:info.title||media[key].title,
        source:info.source||media[key].source,
        credit:info.credit||media[key].credit,
        license:info.license||media[key].license
      });
    }
  }catch(err){console.info('Local media attribution manifest not present yet. run_museum.py will create it.',err?.message||err);}
}

function mediaTextureCandidates(md){
  const out=[];
  if(md?.local)out.push(md.local);
  const original=md?.url;
  if(original){
    try{
      const u=new URL(original);
      const m=u.pathname.match(/^\/wikipedia\/commons\/([^/]+)\/([^/]+)\/(.+)$/);
      if(m){const filename=m[3];out.push(`${u.origin}/wikipedia/commons/thumb/${m[1]}/${m[2]}/${filename}/1024px-${filename}`);}
    }catch(_){}
    out.push(original);
  }
  return [...new Set(out.filter(Boolean))];
}
function loadMediaTexture(md,onLoad,onFinalError){
  const candidates=mediaTextureCandidates(md);const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');let index=0;
  const attempt=()=>{if(index>=candidates.length){onFinalError?.();return;}const url=candidates[index++];loader.load(url,tex=>onLoad(tex,url),undefined,attempt);};attempt();
}
function addPictureLight(grp,w,h){
  const bar=box(Math.min(1.25,w*.34),.055,.085,new THREE.MeshStandardMaterial({color:0xb18a4f,emissive:0x6e4b20,emissiveIntensity:.55,metalness:.45,roughness:.42}));
  bar.position.set(0,h/2+.19,.18);grp.add(bar);
}
function createImageExhibit(g,ex,side,offset){
  const isPortrait=ex.kind==='portrait',w=isPortrait?3.25:5.2,h=isPortrait?3.65:3.15;const grp=new THREE.Group();
  const frame=box(w+.32,h+.32,.13,new THREE.MeshStandardMaterial({color:0x312a23,roughness:.5,metalness:.03}));grp.add(frame);
  const matBoard=box(w+.11,h+.11,.145,new THREE.MeshStandardMaterial({color:0xe8e0d3,roughness:.82}));matBoard.position.z=.035;grp.add(matBoard);
  const placeholder=makePlaceholderTexture(ex.title);const mat=new THREE.MeshBasicMaterial({map:placeholder,toneMapped:false});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);plane.position.z=.118;grp.add(plane);
  const cap=new THREE.Mesh(new THREE.PlaneGeometry(w,1.12),new THREE.MeshBasicMaterial({map:makeCaptionTexture(ex),toneMapped:false}));cap.position.set(0,-h/2-.72,.122);grp.add(cap);
  addPictureLight(grp,w,h);
  const hit=new THREE.Mesh(new THREE.PlaneGeometry(w+.5,h+1.55),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.set(0,-.32,.16);hit.userData.exhibit={gallery:g,exhibit:ex};grp.add(hit);interactive.push(hit);
  placeOnWall(grp,side,g.center[0],g.center[1],offset,isPortrait?3.5:3.25,.18);scene.add(grp);
  const md=media[ex.media];loadMediaTexture(md,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const iw=tex.image?.naturalWidth||tex.image?.width||w,ih=tex.image?.naturalHeight||tex.image?.height||h,ia=iw/ih,fa=w/h;if(ia>fa)plane.scale.set(1,fa/ia,1);else plane.scale.set(ia/fa,1,1);if(mat.map===placeholder)placeholder.dispose?.();mat.map=tex;mat.needsUpdate=true;},()=>{mat.map=makePlaceholderTexture(ex.title);mat.needsUpdate=true;});
}
function createTextExhibit(g,ex,side,offset){
  const w=5.2,h=3.25,grp=new THREE.Group();const back=box(w+.22,h+.22,.11,new THREE.MeshStandardMaterial({color:0x322b24,roughness:.58}));grp.add(back);
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:makeExhibitTextTexture(ex),toneMapped:false}));plane.position.z=.066;grp.add(plane);addPictureLight(grp,w,h);
  const hit=new THREE.Mesh(new THREE.PlaneGeometry(w+.45,h+.45),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.z=.12;hit.userData.exhibit={gallery:g,exhibit:ex};grp.add(hit);interactive.push(hit);placeOnWall(grp,side,g.center[0],g.center[1],offset,2.5,.17);scene.add(grp);
}
function createHybridExhibit(g,ex,side,offset){
  const w=5.2,h=3.82,photoH=1.86,textH=1.72,grp=new THREE.Group();const back=box(w+.30,h+.30,.13,new THREE.MeshStandardMaterial({color:0x312a23,roughness:.5}));grp.add(back);
  const mount=box(w+.08,h+.08,.145,new THREE.MeshStandardMaterial({color:0xe9e1d4,roughness:.8}));mount.position.z=.025;grp.add(mount);
  const photoBack=new THREE.Mesh(new THREE.PlaneGeometry(w,photoH),new THREE.MeshBasicMaterial({color:0x171613,toneMapped:false}));photoBack.position.set(0,.93,.108);grp.add(photoBack);
  const placeholder=makePlaceholderTexture(ex.title);const photoMat=new THREE.MeshBasicMaterial({map:placeholder,toneMapped:false});const photo=new THREE.Mesh(new THREE.PlaneGeometry(w,photoH),photoMat);photo.position.set(0,.93,.113);grp.add(photo);
  const text=new THREE.Mesh(new THREE.PlaneGeometry(w,textH),new THREE.MeshBasicMaterial({map:makeHybridTextTexture(ex),toneMapped:false}));text.position.set(0,-1.02,.114);grp.add(text);addPictureLight(grp,w,h);
  const hit=new THREE.Mesh(new THREE.PlaneGeometry(w+.45,h+.45),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.z=.16;hit.userData.exhibit={gallery:g,exhibit:ex};grp.add(hit);interactive.push(hit);placeOnWall(grp,side,g.center[0],g.center[1],offset,2.68,.18);scene.add(grp);
  const md=media[ex.wallMedia];if(!md)return;loadMediaTexture(md,tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());const iw=tex.image?.naturalWidth||tex.image?.width||w,ih=tex.image?.naturalHeight||tex.image?.height||photoH,ia=iw/ih,fa=w/photoH;if(ia>fa)photo.scale.set(1,fa/ia,1);else photo.scale.set(ia/fa,1,1);if(photoMat.map===placeholder)placeholder.dispose?.();photoMat.map=tex;photoMat.needsUpdate=true;},()=>{photoMat.map=makePlaceholderTexture(ex.title);photoMat.needsUpdate=true;});
}
function createRoomExhibits(g,i){
  const free=['N','E','S','W'].filter(s=>!roomDoorSides[i].has(s)),sides=free.length>=2?free:['N','S'],titleSide=sides[0],exhibitSides=sides.slice(1).concat(titleSide),buckets=new Map(exhibitSides.map(s=>[s,[]]));
  g.exhibits.forEach((ex,idx)=>buckets.get(exhibitSides[idx%exhibitSides.length]).push(ex));
  const offsetsFor=n=>n===1?[0]:n===2?[-3.05,3.05]:n===3?[-5.45,0,5.45]:Array.from({length:n},(_,k)=>-6.1+k*(12.2/(n-1)));
  for(const [side,items] of buckets){const offsets=offsetsFor(items.length);items.forEach((ex,j)=>{if(ex.media)createImageExhibit(g,ex,side,offsets[j]);else if(ex.wallMedia)createHybridExhibit(g,ex,side,offsets[j]);else createTextExhibit(g,ex,side,offsets[j]);});}
}
function createFloorInlay(g){
  const tex=canvasTexture((ctx,w,h)=>{ctx.clearRect(0,0,w,h);ctx.fillStyle='#a78147';ctx.font='600 80px Georgia';ctx.textAlign='center';ctx.fillText(g.number,w/2,96);ctx.fillStyle='#655f57';ctx.font='600 28px Arial';ctx.fillText(g.years,w/2,145);},500,180);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(2.7,.97),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false}));p.rotation.x=-Math.PI/2;p.position.set(g.center[0],.018,g.center[1]);scene.add(p);
}
function buildTransitionBay(a,b,mats){
  const ax=a.center[0],az=a.center[1],bx=b.center[0],bz=b.center[1],vestW=DOOR+.72;
  if(az===bz){
    const dir=Math.sign(bx-ax),start=ax+dir*HALF,end=bx-dir*HALF,len=Math.max(.32,Math.abs(end-start)),cx=(start+end)/2;
    const f=box(len,.16,vestW,mats.floor);f.position.set(cx,-.08,az);scene.add(f);
    const c=box(len,.11,vestW,mats.ceiling);c.position.set(cx,WALL_H+.055,az);scene.add(c);
    for(const zoff of [-vestW/2,vestW/2]){const w=box(len,WALL_H,.18,mats.portalReveal);w.position.set(cx,WALL_H/2,az+zoff);scene.add(w);}
    const glow=box(Math.max(.2,len-.2),.035,DOOR-.35,mats.ceilingGlow);glow.position.set(cx,WALL_H-.06,az);scene.add(glow);
    for(const zoff of [-DOOR/2,DOOR/2]){const s=box(len,.018,.055,mats.brass);s.position.set(cx,.012,az+zoff);scene.add(s);}
  }else{
    const dir=Math.sign(bz-az),start=az+dir*HALF,end=bz-dir*HALF,len=Math.max(.32,Math.abs(end-start)),cz=(start+end)/2;
    const f=box(vestW,.16,len,mats.floor);f.position.set(ax,-.08,cz);scene.add(f);
    const c=box(vestW,.11,len,mats.ceiling);c.position.set(ax,WALL_H+.055,cz);scene.add(c);
    for(const xoff of [-vestW/2,vestW/2]){const w=box(.18,WALL_H,len,mats.portalReveal);w.position.set(ax+xoff,WALL_H/2,cz);scene.add(w);}
    const glow=box(DOOR-.35,.035,Math.max(.2,len-.2),mats.ceilingGlow);glow.position.set(ax,WALL_H-.06,cz);scene.add(glow);
    for(const xoff of [-DOOR/2,DOOR/2]){const s=box(.055,.018,len,mats.brass);s.position.set(ax+xoff,.012,cz);scene.add(s);}
  }
}
function buildMuseum(){
  scene.background=new THREE.Color(0x57544f);scene.fog=new THREE.FogExp2(0x57544f,.0021);
  const mats={
    floor:new THREE.MeshStandardMaterial({color:0x6e685f,roughness:.82,metalness:.01}),
    wall:new THREE.MeshStandardMaterial({color:0xeee9df,roughness:.86}),
    wallBay:new THREE.MeshStandardMaterial({color:0xf7f3eb,roughness:.9}),
    wainscot:new THREE.MeshStandardMaterial({color:0xd7d0c4,roughness:.84}),
    ceiling:new THREE.MeshStandardMaterial({color:0xf1eee8,roughness:.93}),
    baseboard:new THREE.MeshStandardMaterial({color:0x3e342b,roughness:.65}),
    trim:new THREE.MeshStandardMaterial({color:0xc7b79e,roughness:.7}),
    crown:new THREE.MeshStandardMaterial({color:0x494039,roughness:.62}),
    pilaster:new THREE.MeshStandardMaterial({color:0xd4cab9,roughness:.76}),
    portal:new THREE.MeshStandardMaterial({color:0x352c24,roughness:.58}),
    portalReveal:new THREE.MeshStandardMaterial({color:0xc9c0b2,roughness:.78}),
    brass:new THREE.MeshStandardMaterial({color:0xa78147,roughness:.52,metalness:.42}),
    ceilingTrim:new THREE.MeshStandardMaterial({color:0x777065,roughness:.62}),
    ceilingGlow:new THREE.MeshBasicMaterial({color:0xffefd1})
  };
  scene.add(new THREE.HemisphereLight(0xf7f2e8,0x393630,1.62));scene.add(new THREE.AmbientLight(0xffffff,.48));
  galleries.forEach((g,i)=>{
    const group=new THREE.Group();const floor=box(ROOM,.18,ROOM,mats.floor);floor.position.set(g.center[0],-.09,g.center[1]);group.add(floor);const ceiling=box(ROOM,.14,ROOM,mats.ceiling);ceiling.position.set(g.center[0],WALL_H+.07,g.center[1]);group.add(ceiling);
    addRoomWalls(group,g,i,mats);scene.add(group);addCornerPilasters(g,mats);addFloorBorder(g,mats);addCeilingCoffer(g,mats);addWallBackdrop(g,i,mats);
    const light=new THREE.PointLight(0xfff1d6,18,22,2);light.position.set(g.center[0],4.65,g.center[1]);scene.add(light);
    for(const side of roomDoorSides[i])createPortalSurround(g,side,mats);
    createTitlePanel(g,i);createNextGalleryPanel(g,i);createRoomExhibits(g,i);createFloorInlay(g);
  });
  for(let i=0;i<galleries.length-1;i++)buildTransitionBay(galleries[i],galleries[i+1],mats);
  // The historical timeline is an inlaid brass line in the floor, not floating decoration.
  for(let i=0;i<galleries.length-1;i++){
    const a=galleries[i].center,b=galleries[i+1].center;if(a[1]===b[1]){const strip=box(Math.abs(b[0]-a[0]),.012,.05,mats.brass);strip.position.set((a[0]+b[0])/2,.017,a[1]);scene.add(strip);}else{const strip=box(.05,.012,Math.abs(b[1]-a[1]),mats.brass);strip.position.set(a[0],.017,(a[1]+b[1])/2);scene.add(strip);}
  }
}

function setGalleryLabel(index){
  currentGallery=clamp(index,0,galleries.length-1); const g=galleries[currentGallery];
  ui.roomNumber.textContent=g.number;ui.roomEra.textContent=`${g.era} · ${g.years}`;ui.roomTitle.textContent=g.title;
  ui.prev.disabled=currentGallery===0;ui.next.disabled=currentGallery===galleries.length-1;
  ui.prev.style.opacity=currentGallery===0?.35:1;ui.next.style.opacity=currentGallery===galleries.length-1?.35:1;
  $$('.map-room').forEach((el,i)=>el.classList.toggle('current',i===currentGallery));
  renderMapCurrent();
}
function detectGallery(){
  let best=-1,bd=Infinity;galleries.forEach((g,i)=>{const dx=camera.position.x-g.center[0],dz=camera.position.z-g.center[1];const d=Math.hypot(dx,dz);if(d<bd){bd=d;best=i;}});
  if(best>=0 && bd<10.8 && best!==currentGallery)setGalleryLabel(best);
}
function teleportToGallery(index){
  index=clamp(index,0,galleries.length-1); const g=galleries[index]; camera.position.set(...g.camera); const a=lookAngles(g.camera,g.look);yaw=a.yaw;pitch=a.pitch;updateCameraRotation();fly=null;setGalleryLabel(index);
}
function startFlyTo(index){
  index=clamp(index,0,galleries.length-1); if(index===currentGallery){teleportToGallery(index);return;}
  const target=galleries[index];
  // Adjacent guided travel follows room centers and corridors; larger map jumps teleport cleanly instead of flying through walls.
  if(Math.abs(index-currentGallery)!==1){teleportToGallery(index);return;}
  const from=galleries[currentGallery]; const points=[
    [camera.position.x,H,camera.position.z],
    [from.center[0],H,from.center[1]],
    [target.center[0],H,target.center[1]],
    target.camera.slice()
  ];
  const cleaned=[points[0]];for(let i=1;i<points.length;i++){if(Math.hypot(points[i][0]-cleaned.at(-1)[0],points[i][2]-cleaned.at(-1)[2])>.35)cleaned.push(points[i]);}
  const segments=[];
  for(let i=0;i<cleaned.length-1;i++){
    const p0=cleaned[i],p1=cleaned[i+1],dist=Math.hypot(p1[0]-p0[0],p1[2]-p0[2]); const face=lookAngles(p0,p1);
    segments.push({p0,p1,duration:clamp(dist/5.8,.45,2.9),yaw:face.yaw,pitch:0});
  }
  const final=lookAngles(target.camera,target.look);segments.push({p0:target.camera,p1:target.camera,duration:.55,yaw:final.yaw,pitch:final.pitch,rotateOnly:true});
  fly={segments,seg:0,t:0,last:performance.now(),target:index,startYaw:yaw,startPitch:pitch};keys.clear();mobileMove.clear();
}
function updateFly(now){
  if(!fly)return;const s=fly.segments[fly.seg];const dt=(now-fly.last)/1000;fly.last=now;fly.t+=dt/s.duration;const t=smooth(clamp(fly.t,0,1));
  if(!s.rotateOnly){camera.position.set(lerp(s.p0[0],s.p1[0],t),H,lerp(s.p0[2],s.p1[2],t));}
  const dy=angleDelta(fly.startYaw,s.yaw);yaw=fly.startYaw+dy*t;pitch=lerp(fly.startPitch,s.pitch,t);updateCameraRotation();
  if(fly.t>=1){fly.seg++;fly.t=0;fly.startYaw=yaw;fly.startPitch=pitch;if(fly.seg>=fly.segments.length){const target=fly.target;fly=null;setGalleryLabel(target);}}
}

function movementBlockedByUI(){ return !entered || !ui.intro.classList.contains('closed') || ui.drawer.classList.contains('open') || $$('.modal:not([hidden])').length>0; }
function updateMovement(dt){
  if(fly||movementBlockedByUI())return;
  let f=0,r=0;
  if(keys.has('KeyW')||keys.has('ArrowUp')||mobileMove.has('forward'))f+=1;
  if(keys.has('KeyS')||keys.has('ArrowDown')||mobileMove.has('back'))f-=1;
  if(keys.has('KeyD')||keys.has('ArrowRight')||mobileMove.has('right'))r+=1;
  if(keys.has('KeyA')||keys.has('ArrowLeft')||mobileMove.has('left'))r-=1;
  if(!f&&!r)return;
  const norm=Math.hypot(f,r)||1;f/=norm;r/=norm;const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?6.2:3.4;
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
  const dx=(fx*f+rx*r)*speed*dt,dz=(fz*f+rz*r)*speed*dt;
  let nx=camera.position.x+dx,nz=camera.position.z+dz;
  if(canStand(nx,nz)){camera.position.x=nx;camera.position.z=nz;}else{
    if(canStand(nx,camera.position.z))camera.position.x=nx;
    if(canStand(camera.position.x,nz))camera.position.z=nz;
  }
  detectGallery();
}

function raycastAt(clientX,clientY){
  if(!raycaster||movementBlockedByUI())return null;
  const rect=ui.canvas.getBoundingClientRect();const x=((clientX-rect.left)/rect.width)*2-1,y=-((clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera({x,y},camera);const hits=raycaster.intersectObjects(interactive,false);return hits[0]?.object?.userData?.exhibit||null;
}
function updateHover(clientX,clientY){
  if(pointer.down||movementBlockedByUI()){ui.hover.hidden=true;ui.canvas.style.cursor='default';return;}
  const hit=raycastAt(clientX,clientY);if(hit){ui.hover.textContent=`${hit.exhibit.title} · click to inspect`;ui.hover.hidden=false;ui.hover.style.left=`${clamp(clientX,90,innerWidth-90)}px`;ui.hover.style.top=`${clamp(clientY-26,80,innerHeight-80)}px`;ui.canvas.style.cursor='pointer';}else{ui.hover.hidden=true;ui.canvas.style.cursor='grab';}
}
function inspectAt(clientX,clientY){const hit=raycastAt(clientX,clientY);if(hit)openExhibit(hit.gallery,hit.exhibit);}

function gallerySourceLabel(g){
  if(g.sourceType==='research')return 'Researched extension';
  if(g.sourceType==='mixed')return 'Booch paper + external historical record';
  return `Primary source p.${g.paperPages.join(', ')}`;
}
function sourceBasisHeading(g,ex){
  if(ex?.sourceLabel)return ex.sourceLabel;
  if(g.sourceType==='research')return 'Historical record';
  if(g.sourceType==='mixed')return 'Paper + historical record';
  return 'From Booch’s paper';
}
function renderExhibitSources(sources=[]){
  ui.sourcesSection.hidden=!sources.length;
  ui.exhibitSources.innerHTML=sources.map(s=>`<a href="${s.url}" target="_blank" rel="noreferrer">${escapeHtml(s.label)} ↗</a>`).join('');
}
function openRoomGuide(g){
  ui.exhibitGallery.textContent=`Gallery ${g.number} · ${g.years} · ${gallerySourceLabel(g)}`;
  ui.exhibitTitle.textContent=g.title;ui.exhibitSubtitle.textContent=g.paperSection;ui.sourceBasisTitle.textContent=g.sourceType==='research'?'Curatorial overview':g.sourceType==='mixed'?'Paper + researched context':'From Booch’s paper';
  ui.exhibitFigure.hidden=true;ui.provenanceSection.hidden=true;ui.accuracySection.hidden=true;ui.exhibitImage.removeAttribute('src');
  ui.exhibitPaper.textContent=g.summary;ui.exhibitMeaning.innerHTML='<ul class="room-ideas">'+g.ideas.map(x=>`<li>${escapeHtml(x)}</li>`).join('')+'</ul>';
  const sources=[...new Map(g.exhibits.flatMap(ex=>ex.sources||[]).map(x=>[x.url,x])).values()];renderExhibitSources(sources);
  const sourceTag=g.paperPages.length?`paper p.${g.paperPages.join(', ')}`:'research wing';ui.exhibitTags.innerHTML=`<span>${sourceTag}</span><span>${escapeHtml(g.era)}</span>`;
  ui.drawerBackdrop.hidden=false;ui.drawer.classList.add('open');ui.drawer.setAttribute('aria-hidden','false');ui.hover.hidden=true;
}

function openExhibit(g,ex){
  ui.exhibitGallery.textContent=`Gallery ${g.number} · ${g.title} · ${g.paperSection}`;ui.exhibitTitle.textContent=ex.title;ui.exhibitSubtitle.textContent=ex.subtitle||'';ui.sourceBasisTitle.textContent=sourceBasisHeading(g,ex);ui.exhibitPaper.textContent=ex.paper;ui.exhibitMeaning.textContent=ex.meaning;
  ui.exhibitTags.innerHTML=(ex.tags||[]).map(t=>`<span>${escapeHtml(t)}</span>`).join('');renderExhibitSources(ex.sources||[]);
  const mediaKey=ex.media||ex.wallMedia;
  if(mediaKey&&media[mediaKey]){const md=media[mediaKey];ui.exhibitFigure.hidden=false;ui.exhibitImage.onerror=null;ui.exhibitImage.src=md.local||md.url;ui.exhibitImage.alt=md.title;ui.exhibitImage.onerror=()=>{if(md.url&&ui.exhibitImage.src!==md.url){ui.exhibitImage.onerror=null;ui.exhibitImage.src=md.url;}};ui.exhibitCredit.textContent=`${md.credit}. ${md.license}.`;ui.provenanceSection.hidden=false;ui.exhibitProvenance.textContent=`${md.title}. ${md.credit}. License: ${md.license}.`;ui.mediaLink.href=md.source;}else{ui.exhibitFigure.hidden=true;ui.provenanceSection.hidden=true;ui.exhibitImage.onerror=null;ui.exhibitImage.removeAttribute('src');}
  if(ex.accuracy){ui.accuracySection.hidden=false;ui.exhibitAccuracy.textContent=ex.accuracy;ui.accuracyLink.href=ex.external||'#';ui.accuracyLink.hidden=!ex.external;}else{ui.accuracySection.hidden=true;}
  ui.drawerBackdrop.hidden=false;ui.drawer.classList.add('open');ui.drawer.setAttribute('aria-hidden','false');ui.hover.hidden=true;
}
function closeDrawer(){ui.drawer.classList.remove('open');ui.drawer.setAttribute('aria-hidden','true');ui.drawerBackdrop.hidden=true;}
function closeModals(){ $$('.modal').forEach(m=>m.hidden=true); closeDrawer(); }
function openModal(name){closeDrawer();const m=$(`#${name}Modal`);if(m)m.hidden=false;}

function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function renderCollection(){
  const types=[...new Set(collection.map(x=>x.type))].sort();ui.collectionType.innerHTML='<option value="all">All types</option>'+types.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  const draw=()=>{const q=ui.collectionSearch.value.trim().toLowerCase(),type=ui.collectionType.value;const rows=collection.filter(x=>(type==='all'||x.type===type)&&(!q||`${x.name} ${x.description} ${x.type}`.toLowerCase().includes(q)));ui.collectionCount.textContent=`${rows.length} of ${collection.length} indexed entries`;ui.collectionGrid.innerHTML=rows.map(x=>{const gi=galleries.findIndex(g=>g.id===x.gallery);return `<button class="collection-item" data-gallery="${gi}"><span class="type">${escapeHtml(x.type)}</span><h3>${escapeHtml(x.name)}</h3><p>${escapeHtml(x.description)}</p><footer><span>${escapeHtml(x.paper)}</span><span>Go to Gallery ${galleries[gi]?.number||'—'} →</span></footer></button>`}).join('');$$('.collection-item',ui.collectionGrid).forEach(el=>el.addEventListener('click',()=>{const gi=+el.dataset.gallery;closeModals();teleportToGallery(gi);}));};
  ui.collectionSearch.addEventListener('input',draw);ui.collectionType.addEventListener('change',draw);draw();
}
function renderCoverage(){
  ui.coverageGrid.innerHTML=galleries.map((g,i)=>{const basis=g.sourceType==='research'?'researched extension':g.sourceType==='mixed'?`paper p.${g.paperPages.join(', ')} + research`:`paper p.${g.paperPages.join(', ')}`;return `<article class="coverage-card ${g.sourceType==='research'?'research':''}"><small>Gallery ${g.number} · ${basis}</small><h3>${escapeHtml(g.title)}</h3><p><b>${escapeHtml(g.paperSection)}</b><br>${escapeHtml(g.summary)}</p><button data-gallery="${i}">Visit gallery →</button></article>`;}).join('');
  $$('button[data-gallery]',ui.coverageGrid).forEach(b=>b.addEventListener('click',()=>{closeModals();teleportToGallery(+b.dataset.gallery);}));
  ui.paperGrid.innerHTML=Array.from({length:7},(_,i)=>`<figure class="paper-page"><a href="./assets/paper/page-${i+1}.webp" target="_blank"><img src="./assets/paper/page-${i+1}.webp" alt="Page ${i+1} of Grady Booch's paper"></a><figcaption>Paper page ${i+1} · IEEE Software p. ${108+i}</figcaption></figure>`).join('');
  ui.researchGrid.innerHTML=researchSources.map(s=>`<article class="research-card"><small>${escapeHtml(s.year)} · ${escapeHtml(s.org)}</small><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.note)}</p><a href="${s.url}" target="_blank" rel="noreferrer">Open source ↗</a></article>`).join('');
  ui.accuracyGrid.innerHTML=accuracyNotes.map(n=>`<article class="accuracy-note"><h3>${escapeHtml(n.title)}</h3><dl><dt>In the paper</dt><dd>${escapeHtml(n.paper)}</dd><dt>In the museum</dt><dd>${escapeHtml(n.museum)}</dd></dl><a href="${n.source}" target="_blank" rel="noreferrer">Verification / source ↗</a></article>`).join('');
  const refs=[
    'A. Oettinger, “President’s Letter to the ACM Membership,” Communications of the ACM, vol. 9, no. 8, 1966.',
    'G. Boole, The Laws of Thought, Walton and Maberly, 1854.',
    'F. B. Gilbreth Jr. and E. Gilbreth Carey, Cheaper by the Dozen, Thomas Y. Crowell, 1948.',
    'W. J. Eckert, Punched Card Methods in Scientific Computing, Thomas J. Watson Astronomical Computing Bureau, Columbia University, 1940.',
    'J. von Neumann, First Draft of a Report on the EDVAC, U.S. Army Ordnance Department and University of Pennsylvania Moore School of Electrical Engineering, 1945.',
    'F. Brooks, The Mythical Man Month: Essays on Software Engineering, Addison-Wesley, 1975.',
    'J. Markoff, What the Dormouse Said, Penguin, 2005.',
    'A. Newell, “Fairytails,” Carnegie Mellon University, 1976.',
    'The Guide to the Software Engineering Body of Knowledge, IEEE Computer Society, 2004.',
    'Guide to the Systems Engineering Body of Knowledge (SEBoK), INCOSE, 2012.'
  ];
  ui.referencesGrid.innerHTML=`<section class="reference-list"><h3>References in Booch’s paper</h3><ol>${refs.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ol></section><aside class="author-card"><h3>Grady Booch</h3><p><b>In the supplied paper:</b> Booch is identified as an IBM Fellow and one of UML’s original authors. He says the essay grew from his 25 April 2018 ACM Learning Webinar.</p><p><b>In the broader historical record:</b> IEEE Computer Society recognizes Booch for pioneering work in object modeling that led to UML, and lists him as a co-author of UML and a founding member of the Agile Alliance and Hillside Group. In 2016 he received the IEEE Computer Pioneer Award.</p><p>The Computer History Museum also records that Booch’s 2002 email <i>“Preserving classic software products”</i> seeded what became its Software Preservation Group—making him part of the history of preserving software history itself.</p><p><a href="https://www.computer.org/profiles/grady-booch" target="_blank" rel="noreferrer">IEEE Computer Society profile ↗</a><br><a href="https://softwarepreservation.computerhistory.org/" target="_blank" rel="noreferrer">CHM Software Preservation Group ↗</a><br><a href="https://www.youtube.com/watch?v=QUz10Z1AfLc" target="_blank" rel="noreferrer">2018 ACM webinar ↗</a></p></aside>`;
}
function renderMap(){
  const xScale=8,zScale=2.72,ox=210,oz=28; const pos=g=>({x:ox+g.center[0]*xScale,y:oz+(-g.center[1])*zScale});
  const mapHeight=Math.max(520,...galleries.map(g=>pos(g).y+70));ui.mapCanvas.style.height=`${mapHeight}px`;
  let html='';
  for(let i=0;i<galleries.length-1;i++){const a=pos(galleries[i]),b=pos(galleries[i+1]);if(a.y===b.y){html+=`<div class="map-corridor" style="left:${Math.min(a.x,b.x)}px;top:${a.y-7}px;width:${Math.abs(b.x-a.x)}px;height:14px"></div>`;}else{html+=`<div class="map-corridor" style="left:${a.x-7}px;top:${Math.min(a.y,b.y)}px;width:14px;height:${Math.abs(b.y-a.y)}px"></div>`;}}
  galleries.forEach((g,i)=>{const p=pos(g);html+=`<button class="map-room${i===currentGallery?' current':''}" data-gallery="${i}" style="left:${p.x-72}px;top:${p.y-25}px;width:144px;height:50px"><span><b>${g.number}</b>${escapeHtml(g.title)}</span></button>`;});ui.mapCanvas.innerHTML=html;
  $$('.map-room',ui.mapCanvas).forEach(b=>b.addEventListener('click',()=>{closeModals();teleportToGallery(+b.dataset.gallery);}));
  renderMapCurrent();
}
function renderMapCurrent(){ if(!ui.mapCurrent)return;const g=galleries[currentGallery];ui.mapCurrent.innerHTML=`<div class="map-current-card"><small>YOU ARE HERE · GALLERY ${g.number}</small><br><b>${escapeHtml(g.title)}</b><p>${escapeHtml(g.summary)}</p></div>`; }

function bindUI(){
  $('#enterGuided').addEventListener('click',()=>{entered=true;ui.intro.classList.add('closed');teleportToGallery(0);setTimeout(()=>openModal('help'),650);});
  $('#enterFree').addEventListener('click',()=>{entered=true;ui.intro.classList.add('closed');teleportToGallery(0);});
  $('#homeButton').addEventListener('click',()=>{entered=true;ui.intro.classList.add('closed');closeModals();teleportToGallery(0);});
  $('#roomGuide').addEventListener('click',()=>openRoomGuide(galleries[currentGallery]));
  ui.prev.addEventListener('click',()=>startFlyTo(currentGallery-1));ui.next.addEventListener('click',()=>startFlyTo(currentGallery+1));ui.guided.addEventListener('click',()=>teleportToGallery(currentGallery));
  $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
  $$('[data-close]').forEach(b=>b.addEventListener('click',closeModals));ui.drawerBackdrop.addEventListener('click',closeDrawer);
  $('.modal',document)?.addEventListener?.('click',()=>{});
  $$('.modal').forEach(m=>m.addEventListener('pointerdown',e=>{if(e.target===m)closeModals();}));
  $('#resetView').addEventListener('click',()=>{closeModals();teleportToGallery(currentGallery);});
  $$('.source-tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.source-tabs button').forEach(x=>x.classList.toggle('active',x===b));$$('.source-panel').forEach(p=>p.classList.toggle('active',p.id===`${b.dataset.sourceTab}Panel`));}));
  window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Escape'){closeModals();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);if(fly)fly=null;}if(e.code==='KeyM')openModal('map');});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  $$('.mobile-move button').forEach(b=>{const name=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();mobileMove.add(name);b.setPointerCapture(e.pointerId);});const off=()=>mobileMove.delete(name);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);});
}
function bindCanvasInput(){
  const c=ui.canvas;
  c.addEventListener('pointerdown',e=>{if(movementBlockedByUI())return;e.preventDefault();pointer.down=true;pointer.id=e.pointerId;pointer.x=pointer.sx=e.clientX;pointer.y=pointer.sy=e.clientY;pointer.moved=false;c.setPointerCapture(e.pointerId);c.style.cursor='grabbing';if(fly)fly=null;});
  c.addEventListener('pointermove',e=>{
    pointer.hoverX=e.clientX;pointer.hoverY=e.clientY;
    if(pointer.down&&e.pointerId===pointer.id){e.preventDefault();const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;if(Math.hypot(e.clientX-pointer.sx,e.clientY-pointer.sy)>4)pointer.moved=true;yaw-=dx*.0042;pitch=clamp(pitch-dy*.0035,-1.12,1.12);updateCameraRotation();ui.hover.hidden=true;}else updateHover(e.clientX,e.clientY);
  });
  c.addEventListener('pointerup',e=>{if(e.pointerId!==pointer.id)return;const wasClick=!pointer.moved;pointer.down=false;pointer.id=null;c.releasePointerCapture?.(e.pointerId);c.style.cursor='grab';if(wasClick)inspectAt(e.clientX,e.clientY);else updateHover(e.clientX,e.clientY);});
  c.addEventListener('pointercancel',()=>{pointer.down=false;pointer.id=null;});
  c.addEventListener('wheel',e=>{if(movementBlockedByUI())return;e.preventDefault();if(fly)fly=null;const amount=clamp(-e.deltaY*.0045,-1.25,1.25);const fx=-Math.sin(yaw),fz=-Math.cos(yaw);const nx=camera.position.x+fx*amount,nz=camera.position.z+fz*amount;if(canStand(nx,nz)){camera.position.x=nx;camera.position.z=nz;detectGallery();}},{passive:false});
}

function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;updateFly(now);updateMovement(dt);renderer.render(scene,camera);}

async function main(){
  normalizeGalleryLayout();
  await loadLocalAttribution();
  bindUI();renderCollection();renderCoverage();renderMap();buildDoorMap();buildWalkable();
  try{
    setProgress(15,'Loading the local 3D engine…');
    const threeSources=[
      './three.module.js',
      'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.js',
      'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
      'https://unpkg.com/three@0.170.0/build/three.module.js'
    ];
    let loadError;
    for(const src of threeSources){try{THREE=await import(src);break;}catch(err){loadError=err;}}
    if(!THREE)throw loadError||new Error('Unable to load Three.js');
    setProgress(34,'Constructing architectural galleries…');
    renderer=new THREE.WebGLRenderer({canvas:ui.canvas,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.setClearColor(0x57544f,1);
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.08,250);raycaster=new THREE.Raycaster();raycaster.far=16;
    teleportToGallery(0);buildMuseum();setProgress(78,'Hanging unique locally cached historical media…');bindCanvasInput();window.addEventListener('resize',resize);resize();
    setProgress(100,'Museum ready');setTimeout(()=>ui.loading.classList.add('done'),420);lastTime=performance.now();requestAnimationFrame(animate);
  }catch(err){console.error(err);ui.loading.classList.add('done');ui.fatal.hidden=false;}
}
main();
