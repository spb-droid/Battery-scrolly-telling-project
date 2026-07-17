window.addEventListener("DOMContentLoaded", function () {
console.log("JS LOADED ✔");

const svg = d3.select(".viz");
const W = 300, H = 200;
svg.attr("viewBox", `0 0 ${W} ${H}`);

const GREEN = {
  0:"#ffffff",50:"#edf5f0",100:"#d0e9da",200:"#aac8ba",300:"#6e9783",
  400:"#4f7663",500:"#34634a",600:"#214e3d",700:"#14412f",800:"#062417",900:"#020d01"
};
const BLUE = { ocean:"#14283a", land:"#1e3448", border:"rgba(255,255,255,.12)", grid:"rgba(255,255,255,.05)" };
const POWDER = { cathode:"#4a4a48", anode:"#26241f" };

let proj, geoPath, baseScale, baseTranslate;
function setupProjection(){
  baseScale = W/5.5; baseTranslate=[W*0.46,H*0.52];
  proj = d3.geoNaturalEarth1().scale(baseScale).translate(baseTranslate);
  geoPath = d3.geoPath().projection(proj);
}
let countryFeatures, countryPaths, graticulePath, mapReady=false;

function drawBaseMap(world){
  svg.append("defs").append("clipPath").attr("id","frame-clip").append("rect").attr("width",W).attr("height",H);
  svg.append("g").attr("id","g-clipped").attr("clip-path","url(#frame-clip)");
  countryFeatures = topojson.feature(world, world.objects.countries);
  svg.select("#g-clipped").append("rect").attr("id","ocean-bg").attr("width",W).attr("height",H).style("fill",BLUE.ocean);
  graticulePath = svg.select("#g-clipped").append("path").datum(d3.geoGraticule()())
    .style("fill","none").style("stroke",BLUE.grid).style("stroke-width",0.3).attr("d",geoPath);
  countryPaths = svg.select("#g-clipped").append("g").attr("id","g-countries").selectAll("path")
    .data(countryFeatures.features).join("path").attr("class","country-shape")
    .style("fill",BLUE.land).style("stroke",BLUE.border).style("stroke-width",0.3).attr("d",geoPath)
    .on("mouseover",function(ev,d){d3.select(this).style("fill","#2a4a62");showCountryTip(ev,d);})
    .on("mousemove",showCountryTip)
    .on("mouseout",function(){d3.select(this).style("fill",BLUE.land);hideCountryTip();});
  svg.select("#g-clipped").append("g").attr("id","g-flow");
  svg.select("#g-clipped").append("g").attr("id","g-proc");
  svg.select("#g-clipped").append("g").attr("id","g-mine");
  svg.append("g").attr("id","g-overlay").style("opacity",0);
}

setupProjection();
d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world=>{
  drawBaseMap(world); buildSceneElements(); buildLegend(); mapReady=true;
  proj.scale(baseScale).center([0,10]).translate([W/2,H/2]); redrawMap();
  mineNodes.style("opacity",0); scroller.resize();
}).catch(err=>{
  console.error("MAP LOAD FAILED:",err);
  svg.append("rect").attr("width",W).attr("height",H).style("fill",BLUE.ocean);
  svg.append("text").attr("x",W/2).attr("y",H/2).attr("text-anchor","middle").style("fill",GREEN[200]).style("font-size","8px").text("Map blocked");
  buildSceneElements(); buildLegend(); mapReady=true; mineNodes.style("opacity",0); scroller.resize();
});

const MINES=[
  {mat:"Lithium",country:"Australia",lon:134,lat:-25,r:6,shade:400,electrode:"cathode"},
  {mat:"Lithium",country:"Chile",lon:-70,lat:-22,r:5,shade:500,electrode:"cathode"},
  {mat:"Lithium",country:"China",lon:96,lat:32,r:4,shade:600,electrode:"cathode"},
  {mat:"Lithium",country:"Argentina",lon:-64,lat:-28,r:3,shade:500,electrode:"cathode"},
  {mat:"Graphite",country:"China",lon:122,lat:47,r:6,shade:400,electrode:"anode"},
  {mat:"Graphite",country:"Mozambique",lon:38,lat:-13,r:4,shade:500,electrode:"anode"},
  {mat:"Graphite",country:"Madagascar",lon:47,lat:-19,r:3,shade:500,electrode:"anode"},
  {mat:"Iron / Phosphate",country:"China",lon:112,lat:27,r:5,shade:700,electrode:"cathode"},
  {mat:"Copper",country:"Chile",lon:-68,lat:-32,r:5,shade:400,electrode:"anode"},
  {mat:"Copper",country:"Peru",lon:-75,lat:-10,r:4,shade:500,electrode:"anode"},
  {mat:"Aluminium (bauxite)",country:"Guinea",lon:-10,lat:10,r:4,shade:400,electrode:"cathode"},
  {mat:"Aluminium (bauxite)",country:"Australia",lon:128,lat:-16,r:4,shade:500,electrode:"cathode"},
];
const PROC_HUBS=[
  {label:"Lithium refining",lon:119,lat:36,mat:"Lithium"},
  {label:"Graphite purification",lon:113,lat:38,mat:"Graphite"},
  {label:"LFP precursor",lon:117,lat:31,mat:"Iron / Phosphate"},
  {label:"Copper foil",lon:121,lat:30,mat:"Copper"},
  {label:"Aluminium foil",lon:114,lat:23,mat:"Aluminium (bauxite)"},
];
let mineNodes;
function buildSceneElements(){
  mineNodes = svg.select("#g-mine").selectAll(".mine-node").data(MINES).enter().append("circle")
    .attr("class","mine-node").attr("data-mat",d=>d.mat)
    .attr("cx",d=>proj([d.lon,d.lat])[0]).attr("cy",d=>proj([d.lon,d.lat])[1]).attr("r",d=>d.r)
    .style("fill",d=>GREEN[d.shade]).style("stroke",GREEN[50]).style("stroke-width",0.4)
    .style("opacity",0).style("cursor","pointer")
    .on("mouseover",function(ev,d){d3.select(this).transition().attr("r",d.r*1.5).style("stroke",GREEN[0]);})
    .on("mouseout",function(ev,d){d3.select(this).transition().attr("r",d.r).style("stroke",GREEN[50]);});
}

let countryTip=document.getElementById("country-tip");
if(!countryTip){
  countryTip=document.createElement("div"); countryTip.id="country-tip";
  countryTip.style.cssText=`position:absolute;pointer-events:none;display:none;background:${GREEN[900]};color:${GREEN[50]};font-family:sans-serif;font-size:11px;padding:4px 8px;border-radius:3px;border:1px solid ${GREEN[600]};z-index:20;`;
  document.querySelector(".chart").appendChild(countryTip);
}
function showCountryTip(ev,d){
  const name=d.properties&&d.properties.name?d.properties.name:null;
  if(!name){hideCountryTip();return;}
  countryTip.style.display="block"; countryTip.textContent=name;
  const rect=document.querySelector(".chart").getBoundingClientRect();
  countryTip.style.left=(ev.clientX-rect.left+10)+"px"; countryTip.style.top=(ev.clientY-rect.top-24)+"px";
}
function hideCountryTip(){countryTip.style.display="none";}

function buildLegend(){
  const materials=[...new Set(MINES.map(d=>d.mat))];
  let legendDiv=document.getElementById("map-legend");
  if(!legendDiv){legendDiv=document.createElement("div");legendDiv.id="map-legend";
    document.querySelector(".chart").parentElement.insertBefore(legendDiv,document.querySelector(".chart"));}
  legendDiv.style.cssText=`display:flex;flex-wrap:wrap;justify-content:center;gap:14px;font-family:sans-serif;font-size:11px;padding:8px 4px 12px;color:${GREEN[700]};`;
  legendDiv.innerHTML=materials.map(mat=>{const s=MINES.find(m=>m.mat===mat);
    return `<div class="legend-item" data-mat="${mat}" style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:3px 8px;border-radius:12px;transition:background 0.2s;"><span style="width:9px;height:9px;border-radius:50%;background:${GREEN[s.shade]};flex-shrink:0;display:inline-block"></span><span>${mat}</span></div>`;}).join("");
  document.querySelectorAll(".legend-item").forEach(item=>{
    item.addEventListener("mouseenter",()=>{filterByMaterial(item.dataset.mat);item.style.background=GREEN[100];});
    item.addEventListener("mouseleave",()=>{filterByMaterial(null);item.style.background="transparent";});
  });
}
function filterByMaterial(mat){
  if(!mineNodes)return;
  if(mat===null)mineNodes.transition().duration(300).style("opacity",0.95);
  else mineNodes.transition().duration(300).style("opacity",d=>d.mat===mat?1:0.08);
}

function zoomTo(lon,lat,scale,dur,onTick){
  const sS=proj.scale(),sC=proj.invert([W/2,H/2]);
  const iS=d3.interpolate(sS,scale),iLon=d3.interpolate(sC[0],lon),iLat=d3.interpolate(sC[1],lat);
  return d3.transition().duration(dur).ease(d3.easeCubicInOut).tween("zoom",()=>t=>{
    proj.scale(iS(t)).center([iLon(t),iLat(t)]).translate([W/2,H/2]); redrawMap(); if(onTick)onTick(t);
  }).end();
}
function redrawMap(){
  if(countryPaths)countryPaths.attr("d",geoPath);
  if(graticulePath)graticulePath.attr("d",geoPath);
  if(mineNodes)mineNodes.attr("cx",d=>proj([d.lon,d.lat])[0]).attr("cy",d=>proj([d.lon,d.lat])[1]);
  svg.select("#g-flow").selectAll(".flow-line").attr("d",d=>geoPath(d.geo));
  svg.select("#g-proc").selectAll(".proc-node").attr("cx",d=>proj([d.lon,d.lat])[0]).attr("cy",d=>proj([d.lon,d.lat])[1]);
  svg.select("#g-proc").selectAll(".proc-label").attr("x",d=>proj([d.lon,d.lat])[0]+5).attr("y",d=>proj([d.lon,d.lat])[1]+2);
}

let renderGen=0, flowAnimTimers=[], electrodeTimers=[];
function clearFlowAnims(){flowAnimTimers.forEach(t=>clearTimeout(t));flowAnimTimers=[];}
function clearElectrodeAnims(){electrodeTimers.forEach(t=>{clearTimeout(t);clearInterval(t);});electrodeTimers=[];}

/* STEPS 1 & 2 — JOURNEY TRACKS from mines into China (these are the
   tracks that were being lost — restored as animated great-circle
   flow lines that draw on as you scroll into China) */
function buildFlowLines(myGen){
  if(myGen!==renderGen)return;
  const fL=svg.select("#g-flow"); fL.selectAll("*").remove(); clearFlowAnims();
  MINES.forEach((mine,i)=>{
    const hub=PROC_HUBS.find(h=>h.mat===mine.mat)||PROC_HUBS[0];
    const midLon=(mine.lon+hub.lon)/2, midLat=(mine.lat+hub.lat)/2+8;
    const lineGeo={type:"LineString",coordinates:[[mine.lon,mine.lat],[midLon,midLat],[hub.lon,hub.lat]]};
    const path=fL.append("path").datum({geo:lineGeo}).attr("class","flow-line").attr("d",geoPath)
      .style("fill","none").style("stroke",GREEN[200]).style("stroke-width",0.6).style("opacity",0);
    const pl=path.node().getTotalLength();
    path.style("stroke-dasharray",pl).style("stroke-dashoffset",pl)
      .transition().delay(i*80).duration(900).ease(d3.easeCubicOut).style("opacity",0.85).style("stroke-dashoffset",0);
    const dot=fL.append("circle").attr("class","flow-dot").attr("r",1.6).style("fill",GREEN[0]).style("opacity",0);
    const node=path.node();
    function anim(){ if(myGen!==renderGen)return;
      const len=node.getTotalLength();
      dot.style("opacity",0.9).transition().duration(1400).ease(d3.easeLinear)
        .attrTween("transform",()=>t=>{const p=node.getPointAtLength(t*len);return `translate(${p.x},${p.y})`;})
        .on("end",function(){if(myGen!==renderGen)return;dot.style("opacity",0);const id=setTimeout(anim,600+Math.random()*1200);flowAnimTimers.push(id);});
    }
    const sId=setTimeout(anim,i*80+1000); flowAnimTimers.push(sId);
  });
}
function buildProcNodes(myGen){
  if(myGen!==renderGen)return;
  const pL=svg.select("#g-proc"); pL.selectAll("*").remove();
  const nodes=pL.selectAll(".proc-node").data(PROC_HUBS).enter().append("circle").attr("class","proc-node")
    .attr("cx",d=>proj([d.lon,d.lat])[0]).attr("cy",d=>proj([d.lon,d.lat])[1]).attr("r",0)
    .style("fill",GREEN[800]).style("stroke",GREEN[100]).style("stroke-width",0.5).style("opacity",0);
  nodes.transition().delay((_,i)=>600+i*150).duration(400).attr("r",4.5).style("opacity",1);
  pL.selectAll(".proc-label").data(PROC_HUBS).enter().append("text").attr("class","proc-label")
    .attr("x",d=>proj([d.lon,d.lat])[0]+5).attr("y",d=>proj([d.lon,d.lat])[1]+2).text(d=>d.label)
    .style("font-family","sans-serif").style("font-size","4.5px").style("fill",GREEN[100]).style("opacity",0)
    .transition().delay((_,i)=>800+i*150).duration(400).style("opacity",0.95);
}

function getRepMines(){const b={};MINES.forEach(m=>{if(!b[m.mat]||m.r>b[m.mat].r)b[m.mat]=m;});return Object.values(b);}

/* STEP 3 — CATHODE/ANODE with real journey tracks from map nodes */
function buildElectrodeScene(myGen){
  if(myGen!==renderGen)return;
  const g=svg.select("#g-overlay"); g.selectAll("*").remove(); clearElectrodeAnims();
  const catX=W*0.25, anX=W*0.75, fY=H*0.50, fH=H*0.14, signY=H*0.72, ptY=H*0.78, pbY=H*0.93, lblY=H*0.985;
  g.append("text").text("CATHODE").attr("x",catX).attr("y",H*0.10).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","7px").style("font-weight","bold").style("letter-spacing","1px").style("fill",GREEN[700]).style("opacity",0).transition().delay(100).duration(400).style("opacity",1);
  g.append("text").text("ANODE").attr("x",anX).attr("y",H*0.10).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","7px").style("font-weight","bold").style("letter-spacing","1px").style("fill",GREEN[700]).style("opacity",0).transition().delay(100).duration(400).style("opacity",1);
  const rep=getRepMines();
  const catS=rep.filter(m=>m.electrode==="cathode"), anS=rep.filter(m=>m.electrode==="anode");
  const keys=new Set([...catS,...anS].map(m=>m.country+m.mat));
  mineNodes.transition().duration(400).style("opacity",d=>keys.has(d.country+d.mat)?0.95:0.06);
  mineNodes.filter(d=>keys.has(d.country+d.mat)).each(function(d){d3.select(this).transition().delay(100).duration(300).attr("r",d.r*1.3).transition().duration(300).attr("r",d.r);});
  function tracks(src,dx,delay,tint){
    src.forEach((mine,i)=>{
      const [mx,my]=proj([mine.lon,mine.lat]);
      const cY=fY-4-(src.length-1-i)*3;
      const pathD=`M${mx},${my} L${dx},${my} L${dx},${cY}`;
      const path=g.append("path").attr("d",pathD).style("fill","none").style("stroke",tint).style("stroke-width",0.6).style("opacity",0);
      const len=path.node().getTotalLength(); const ld=delay+i*220;
      path.style("stroke-dasharray",len).style("stroke-dashoffset",len).transition().delay(ld).duration(750).ease(d3.easeCubicOut).style("opacity",0.85).style("stroke-dashoffset",0);
      g.append("text").text(mine.mat.split(" ")[0]).attr("x",mx).attr("y",my-6).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5px").style("fill",GREEN[800]).style("font-weight","600").style("opacity",0).transition().delay(ld).duration(300).style("opacity",1);
      const node=path.node();
      function tr(){if(myGen!==renderGen)return;const dot=g.append("circle").attr("r",1.2).style("fill",GREEN[800]).style("opacity",0.85);
        dot.transition().duration(1000).ease(d3.easeLinear).attrTween("transform",()=>t=>{const p=node.getPointAtLength(t*len);return `translate(${p.x},${p.y})`;}).on("end",function(){d3.select(this).remove();if(myGen!==renderGen)return;const id=setTimeout(tr,400+Math.random()*900);electrodeTimers.push(id);});}
      const sId=setTimeout(tr,ld+750); electrodeTimers.push(sId);
    });
  }
  tracks(catS,catX,900,GREEN[600]); tracks(anS,anX,900,GREEN[600]);
  const maxL=Math.max(catS.length,anS.length), fDelay=900+maxL*220+700;
  function factory(cx,tint,delay){
    const fg=g.append("g").style("opacity",0);
    fg.append("rect").attr("x",cx-20).attr("y",fY).attr("width",40).attr("height",fH).attr("rx",1.5).style("fill",GREEN[800]).style("stroke",tint).style("stroke-width",0.6);
    fg.append("path").attr("d",`M${cx-20},${fY} L${cx-12},${fY-6} L${cx-2},${fY} Z`).style("fill",GREEN[700]);
    fg.append("path").attr("d",`M${cx+2},${fY} L${cx+12},${fY-6} L${cx+20},${fY} Z`).style("fill",GREEN[700]);
    fg.append("rect").attr("x",cx-16).attr("y",fY-12).attr("width",3).attr("height",7).style("fill",GREEN[600]);
    const bY=fY+fH-6;
    fg.append("rect").attr("x",cx-20).attr("y",bY).attr("width",40).attr("height",4).style("fill",GREEN[900]).style("stroke",GREEN[600]).style("stroke-width",0.3);
    const bc=`belt-${Math.round(cx)}`;
    if(svg.select("defs").empty())svg.append("defs");
    svg.select("defs").append("clipPath").attr("id",bc).append("rect").attr("x",cx-20).attr("y",bY).attr("width",40).attr("height",4);
    const cg=fg.append("g").attr("clip-path",`url(#${bc})`);
    cg.selectAll(".chev").data(d3.range(8)).enter().append("path").attr("class","chev")
      .attr("d",(d,i)=>{const x=cx-24+i*6;return `M${x},${bY+4} L${x+3},${bY} L${x+4.5},${bY} L${x+1.5},${bY+4} Z`;}).style("fill",tint).style("opacity",0.5);
    function belt(){if(myGen!==renderGen)return;cg.selectAll(".chev").transition().duration(1400).ease(d3.easeLinear).attr("transform","translate(48,0)").on("end",function(){if(myGen!==renderGen)return;d3.select(this).attr("transform","translate(0,0)");});}
    fg.selectAll(".win").data(d3.range(3)).enter().append("rect").attr("class","win").attr("x",(d,i)=>cx-13+i*10).attr("y",fY+5).attr("width",4).attr("height",5).style("fill",tint).style("opacity",0.55);
    fg.transition().delay(delay).duration(500).style("opacity",1).on("end",()=>{if(myGen!==renderGen)return;belt();const iv=setInterval(belt,1400);electrodeTimers.push(iv);});
  }
  factory(catX,GREEN[300],fDelay); factory(anX,GREEN[300],fDelay);
  function sign(cx,sym,delay){const sg=g.append("g").style("opacity",0);
    sg.append("circle").attr("cx",cx).attr("cy",signY).attr("r",7).style("fill","none").style("stroke",GREEN[700]).style("stroke-width",0.8);
    sg.append("text").text(sym).attr("x",cx).attr("y",signY+2.8).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","10px").style("font-weight","bold").style("fill",GREEN[700]);
    sg.transition().delay(delay).duration(400).style("opacity",1);}
  sign(catX,"+",fDelay+500); sign(anX,"–",fDelay+500);
  function pile(cx,color,label,delay){const pg=g.append("g").style("opacity",0);const bw=24;
    pg.append("path").attr("d",`M${cx-bw/2},${pbY} C${cx-bw/2+4},${ptY+10} ${cx-5},${ptY+1} ${cx-1},${ptY} C${cx+3},${ptY+2} ${cx+bw/2-4},${ptY+9} ${cx+bw/2},${pbY} Z`).style("fill",color).style("opacity",0.92);
    const sp=pg.append("g");for(let i=0;i<50;i++){const rx=cx-bw/2+Math.random()*bw,ry=ptY+Math.random()*(pbY-ptY),dc=Math.abs(rx-cx)/(bw/2),hf=(ry-ptY)/(pbY-ptY);if(dc<(0.3+hf*0.8))sp.append("circle").attr("cx",rx).attr("cy",ry).attr("r",0.35+Math.random()*0.4).style("fill","rgba(255,255,255,0.08)");}
    pg.append("ellipse").attr("cx",cx).attr("cy",pbY+1).attr("rx",bw/2+1).attr("ry",1.2).style("fill","rgba(0,0,0,0.18)");
    pg.append("text").text(label).attr("x",cx).attr("y",lblY).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5.5px").style("fill",GREEN[700]);
    pg.transition().delay(delay).duration(600).style("opacity",1);}
  pile(catX,POWDER.cathode,"LFP powder",fDelay+900); pile(anX,POWDER.anode,"Graphite powder",fDelay+900);
}

/* STEP 4 — CELL ASSEMBLY: layer-by-layer build in correct order
   Cathode(Al foil+LFP) → Separator → Anode(graphite+Cu foil) →
   Electrolyte fill → Casing seal → Formation (SEI) */
function buildCellScene(myGen){
  if(myGen!==renderGen)return;
  const g=svg.select("#g-overlay"); g.selectAll("*").remove(); clearElectrodeAnims();
  const cx=W*0.42, lw=70, lh=9, x0=cx-lw/2, y0=H*0.22;
  g.append("text").text("CELL ASSEMBLY").attr("x",cx).attr("y",H*0.12).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","7px").style("font-weight","bold").style("letter-spacing","1px").style("fill",GREEN[700]).style("opacity",0).transition().duration(400).style("opacity",1);
  // Layers in correct stacking order (top to bottom)
  const layers=[
    {name:"Aluminium foil (cathode collector)",fill:"#9aa4a0"},
    {name:"LFP cathode",fill:POWDER.cathode},
    {name:"Separator (polypropylene)",fill:GREEN[200]},
    {name:"Graphite anode",fill:POWDER.anode},
    {name:"Copper foil (anode collector)",fill:"#b06a3a"},
  ];
  let delay=400;
  layers.forEach((L,i)=>{
    const y=y0+i*(lh+1);
    g.append("rect").attr("x",x0).attr("y",y).attr("width",0).attr("height",lh).attr("rx",1).style("fill",L.fill).style("opacity",0.92)
      .transition().delay(delay).duration(500).ease(d3.easeCubicOut).attr("width",lw);
    g.append("line").attr("x1",x0+lw).attr("y1",y+lh/2).attr("x2",x0+lw+6).attr("y2",y+lh/2).style("stroke",GREEN[600]).style("stroke-width",0.4).style("opacity",0).transition().delay(delay+300).duration(300).style("opacity",1);
    g.append("text").text(L.name).attr("x",x0+lw+9).attr("y",y+lh/2+2).style("font-family","sans-serif").style("font-size","5px").style("fill",GREEN[700]).style("opacity",0).transition().delay(delay+300).duration(300).style("opacity",1);
    delay+=650;
  });
  const stackBot=y0+layers.length*(lh+1);
  // Electrolyte fill — animated droplets seeping into the stack
  const elDelay=delay+200;
  g.append("text").text("Electrolyte (LiPF₆) filled").attr("x",cx).attr("y",stackBot+12).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5px").style("fill",GREEN[500]).style("opacity",0).transition().delay(elDelay).duration(400).style("opacity",1);
  function drip(){if(myGen!==renderGen)return;
    const dx=x0+5+Math.random()*(lw-10);
    const d=g.append("circle").attr("cx",dx).attr("cy",y0-6).attr("r",0.8).style("fill",GREEN[300]).style("opacity",0.8);
    d.transition().duration(700).ease(d3.easeCubicIn).attr("cy",stackBot-3).style("opacity",0).on("end",function(){d3.select(this).remove();});}
  const dripId=setTimeout(function loop(){if(myGen!==renderGen)return;drip();const id=setTimeout(loop,300);electrodeTimers.push(id);},elDelay);
  electrodeTimers.push(dripId);
  // Casing seal — rectangle drawn around the stack
  const caseDelay=elDelay+1400;
  g.append("rect").attr("x",x0-4).attr("y",y0-4).attr("width",lw+8).attr("height",layers.length*(lh+1)+6).attr("rx",2).style("fill","none").style("stroke",GREEN[800]).style("stroke-width",1.5).style("opacity",0)
    .transition().delay(caseDelay).duration(600).style("opacity",1);
  // Terminal tabs (+ and -)
  g.append("rect").attr("x",x0+8).attr("y",y0-9).attr("width",6).attr("height",5).style("fill",GREEN[600]).style("opacity",0).transition().delay(caseDelay+300).duration(300).style("opacity",1);
  g.append("text").text("+").attr("x",x0+11).attr("y",y0-5).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5px").style("font-weight","bold").style("fill",GREEN[100]).style("opacity",0).transition().delay(caseDelay+400).duration(300).style("opacity",1);
  g.append("rect").attr("x",x0+lw-14).attr("y",y0-9).attr("width",6).attr("height",5).style("fill",GREEN[600]).style("opacity",0).transition().delay(caseDelay+300).duration(300).style("opacity",1);
  g.append("text").text("–").attr("x",x0+lw-11).attr("y",y0-5).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5px").style("font-weight","bold").style("fill",GREEN[100]).style("opacity",0).transition().delay(caseDelay+400).duration(300).style("opacity",1);
  g.append("text").text("Sealed & formation (SEI layer forms)").attr("x",cx).attr("y",stackBot+24).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5px").style("fill",GREEN[700]).style("opacity",0).transition().delay(caseDelay+600).duration(400).style("opacity",1);
  g.append("text").text("= one battery CELL").attr("x",cx).attr("y",stackBot+36).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","6px").style("font-weight","bold").style("fill",GREEN[800]).style("opacity",0).transition().delay(caseDelay+1000).duration(400).style("opacity",1);
}

/* STEP 5 — BATTERY ASSEMBLY: cell → module → pack (+BMS) */
function buildBatteryScene(myGen){
  if(myGen!==renderGen)return;
  const g=svg.select("#g-overlay"); g.selectAll("*").remove(); clearElectrodeAnims();
  g.append("text").text("BATTERY ASSEMBLY").attr("x",W/2).attr("y",H*0.12).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","7px").style("font-weight","bold").style("letter-spacing","1px").style("fill",GREEN[700]).style("opacity",0).transition().duration(400).style("opacity",1);
  const midY=H*0.5;
  // Stage 1: single CELL
  const cellX=W*0.13;
  g.append("rect").attr("x",cellX-4).attr("y",midY-12).attr("width",8).attr("height",24).attr("rx",1).style("fill",GREEN[600]).style("stroke",GREEN[800]).style("stroke-width",0.5).style("opacity",0).transition().delay(400).duration(500).style("opacity",1);
  g.append("text").text("Cell").attr("x",cellX).attr("y",midY+22).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5.5px").style("fill",GREEN[700]).style("opacity",0).transition().delay(700).duration(300).style("opacity",1);
  // Arrow
  g.append("text").text("→").attr("x",W*0.24).attr("y",midY+2).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","9px").style("fill",GREEN[500]).style("opacity",0).transition().delay(1000).duration(300).style("opacity",1);
  // Stage 2: MODULE (group of cells)
  const modX=W*0.40;
  for(let i=0;i<5;i++){
    g.append("rect").attr("x",modX-12+i*5).attr("y",midY-12).attr("width",4).attr("height",24).attr("rx",0.5).style("fill",GREEN[600]).style("stroke",GREEN[800]).style("stroke-width",0.4).style("opacity",0).transition().delay(1300+i*120).duration(300).style("opacity",1);
  }
  g.append("rect").attr("x",modX-15).attr("y",midY-15).attr("width",30).attr("height",30).attr("rx",2).style("fill","none").style("stroke",GREEN[700]).style("stroke-width",0.8).style("opacity",0).transition().delay(1900).duration(400).style("opacity",1);
  g.append("text").text("Module").attr("x",modX).attr("y",midY+25).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","5.5px").style("fill",GREEN[700]).style("opacity",0).transition().delay(2000).duration(300).style("opacity",1);
  // Arrow
  g.append("text").text("→").attr("x",W*0.56).attr("y",midY+2).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","9px").style("fill",GREEN[500]).style("opacity",0).transition().delay(2300).duration(300).style("opacity",1);
  // Stage 3: PACK (modules + BMS)
  const packX=W*0.78;
  for(let r=0;r<2;r++)for(let c=0;c<3;c++){
    g.append("rect").attr("x",packX-22+c*15).attr("y",midY-16+r*16).attr("width",12).attr("height",13).attr("rx",1).style("fill",GREEN[500]).style("stroke",GREEN[800]).style("stroke-width",0.4).style("opacity",0).transition().delay(2600+(r*3+c)*100).duration(300).style("opacity",1);
  }
  g.append("rect").attr("x",packX-25).attr("y",midY-19).attr("width",48).attr("height",38).attr("rx",2).style("fill","none").style("stroke",GREEN[800]).style("stroke-width",1.2).style("opacity",0).transition().delay(3300).duration(500).style("opacity",1);
  g.append("rect").attr("x",packX-25).attr("y",midY+13).attr("width",48).attr("height",6).attr("rx",1).style("fill",GREEN[700]).style("opacity",0).transition().delay(3500).duration(300).style("opacity",1);
  g.append("text").text("BMS").attr("x",packX-1).attr("y",midY+17.5).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","4px").style("fill",GREEN[100]).style("opacity",0).transition().delay(3700).duration(300).style("opacity",1);
  g.append("text").text("Battery Pack").attr("x",packX).attr("y",midY+30).attr("text-anchor","middle").style("font-family","sans-serif").style("font-size","6px").style("font-weight","bold").style("fill",GREEN[800]).style("opacity",0).transition().delay(3800).duration(400).style("opacity",1);
}

let currentStep=-1, renderDebounceTimer=null;
function renderStep(index){
  if(renderDebounceTimer)clearTimeout(renderDebounceTimer);
  renderDebounceTimer=setTimeout(()=>actuallyRenderStep(index),60);
}
function actuallyRenderStep(index){
  if(!mapReady||!mineNodes)return; if(index===currentStep)return; currentStep=index;
  renderGen+=1; const myGen=renderGen;
  const legendDiv=document.getElementById("map-legend");
  const mapLayer=svg.select("#g-clipped"), overlayLayer=svg.select("#g-overlay");
  clearFlowAnims(); clearElectrodeAnims();
  svg.select("#g-proc").selectAll("*").remove(); svg.select("#g-flow").selectAll("*").remove(); svg.select("#g-overlay").selectAll("*").remove();

  // STEP 0 — Introduction: blank, no visualisation
  if(index===0){
    if(legendDiv)legendDiv.style.display="none";
    mapLayer.transition().duration(300).style("opacity",0);
    overlayLayer.transition().duration(300).style("opacity",0);
    mineNodes.transition().duration(300).style("opacity",0);
  }
  if(index===1){
    mapLayer.style("opacity",1); overlayLayer.transition().duration(300).style("opacity",0);
    if(legendDiv)legendDiv.style.display="flex";
    zoomTo(0,10,baseScale,700); mineNodes.transition().duration(600).style("opacity",0.95);
  }
  if(index===2){
    mapLayer.style("opacity",1); overlayLayer.transition().duration(300).style("opacity",0);
    if(legendDiv)legendDiv.style.display="none";
    zoomTo(110,32,baseScale*5.5,1200,(t)=>{if(myGen!==renderGen)return;mineNodes.style("opacity",0.95-t*0.45);})
      .then(()=>{if(myGen!==renderGen)return;buildProcNodes(myGen);buildFlowLines(myGen);});
  }
  if(index===3){
    if(legendDiv)legendDiv.style.display="none";
    zoomTo(0,10,baseScale,600).then(()=>{if(myGen!==renderGen)return;
      mapLayer.transition().duration(400).style("opacity",0.4); buildElectrodeScene(myGen); overlayLayer.transition().duration(400).style("opacity",1);});
  }
  if(index===4){
    if(legendDiv)legendDiv.style.display="none";
    mapLayer.transition().duration(400).style("opacity",0);
    buildCellScene(myGen); overlayLayer.transition().duration(400).style("opacity",1);
  }
  if(index===5){
    if(legendDiv)legendDiv.style.display="none";
    mapLayer.transition().duration(400).style("opacity",0);
    buildBatteryScene(myGen); overlayLayer.transition().duration(400).style("opacity",1);
  }
  // STEP 6 — Conclusion: blank, no visualisation
  if(index===6){
    if(legendDiv)legendDiv.style.display="none";
    mapLayer.transition().duration(300).style("opacity",0);
    overlayLayer.transition().duration(300).style("opacity",0);
  }
}

const scroller=scrollama();
scroller.setup({container:"#scroll",step:".step",offset:0.85})
  .onStepEnter(({element,index})=>{
    document.querySelectorAll(".step").forEach(s=>s.classList.remove("is-active"));
    element.classList.add("is-active"); renderStep(index);
  });
window.addEventListener("resize",()=>scroller.resize());
});
