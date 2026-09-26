/* Kida — état, utilitaires, routeur, accueil, courses, fiche course, forme, météo. Scripts classiques chargés dans l'ordre (voir app.html) : ils partagent la portée globale. */

var K="kidahub:";
function save(k,v){try{localStorage.setItem(K+k,v)}catch(e){}}
function load(k){try{return localStorage.getItem(K+k)}catch(e){return null}}

var S={races:[],me:null,db:null,mcp:null,sample:null,wx:{},acts:null,gear:null,stOn:false,wxOn:{},ok:false,failed:false,view:"home",raceId:null,tab:null};
var $=function(id){return document.getElementById(id)};
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pd(s){var p=String(s).split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function todayKey(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function days(s){var t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());return Math.round((pd(s)-t)/864e5)}
function jx(s){var d=days(s);return d>1?"J−"+d:d===1?"DEMAIN":d===0?"JOUR J":"J+"+(-d)}
var MO=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
var DW=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
function fdate(s,long){var d=pd(s);return (long?DW[d.getDay()]+" ":"")+d.getDate()+" "+MO[d.getMonth()]+(long?" "+d.getFullYear():"")}
function hms(s){if(s==null||s==="")return "—";s=Math.round(s);var h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;
  return h?h+":"+String(m).padStart(2,"0")+":"+String(x).padStart(2,"0"):m+":"+String(x).padStart(2,"0")}
function mmss(s){s=Math.round(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function pace(t,km){return km?mmss(t/km):"—"}
function parseT(v){v=String(v||"").trim();if(!v)return null;var hr=/h/i.test(v);v=v.replace(/h/i,":").replace(/['′]/g,":").replace(/:$/,"");
  var p=v.split(":").map(Number);if(p.some(isNaN)||p.length>3)return NaN;if(hr&&p.length===2)p.push(0);
  var s=0;p.forEach(function(x){s=s*60+x});return s}
function km(r){return r.distanceKm?String(r.distanceKm).replace(".",",")+" km":""}
function toast(t){var el=document.createElement("div");el.className="toast";el.textContent=t;document.body.appendChild(el);setTimeout(function(){el.remove()},2200)}

function upcoming(){return S.races.filter(function(r){return r.status!=="done"&&days(r.date)>=0}).sort(function(a,b){return a.date<b.date?-1:1})}
function past(){return S.races.filter(function(r){return r.status==="done"||days(r.date)<0}).sort(function(a,b){return a.date<b.date?1:-1})}
function race(id){for(var i=0;i<S.races.length;i++)if(S.races[i].id===id)return S.races[i];return null}

/* ── icons ── */
var RUN='<svg viewBox="0 0 24 24"><circle cx="15" cy="4" r="1.6"/><path d="M8.5 21l2-5.2 2.6-2-1.6-5.2 3.2 2.6 3 .6M5.6 12.2L8.6 8l3-1"/></svg>';

/* ── router ── */
function go(v,id,tab){if(v==="coach"){S.coachRace=null;loadChat()}S.view=v;if(id!==undefined)S.raceId=id;S.tab=tab||null;
  document.querySelectorAll("nav button").forEach(function(b){b.classList.toggle("on",b.dataset.v===(v==="race"?"races":v))});
  render();
  scrollTo(0,0);if(v==="coach")chatBottom()}
document.querySelectorAll("nav button").forEach(function(b){b.onclick=function(){go(b.dataset.v)}});

function render(){
  var m=$("main");
  if(S.failed){m.innerHTML='<div class="empty" style="margin-top:18px"><b>Impossible de charger tes courses.</b><br>Vérifie ta connexion internet, puis rouvre l\'app.</div>';return}
  if(!S.ok){return}
  var nx=upcoming()[0],td=new Date(),dl=DW[td.getDay()];
  $("ttl").textContent=S.view==="races"?"Mes courses":S.view==="forme"?"Ma forme":S.view==="race"?"Fiche course":S.view==="coach"?"Coach":dl.charAt(0).toUpperCase()+dl.slice(1)+" "+td.getDate()+" "+MO[td.getMonth()];
  $("hsub").textContent=nx?jx(nx.date)+" · "+nx.name:"Aucune course prévue";
  m.innerHTML=S.view==="races"?vRaces():S.view==="forme"?vForme():S.view==="race"?vRace():S.view==="coach"?vCoach():vHome();
  bind();
  document.body.classList.toggle("chatmode",S.view==="coach");if(S.view==="coach")fitChat();
}

/* ── ACCUEIL ── */
var SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
var OKI='<svg viewBox="0 0 24 24" fill="none" stroke="#0f1012" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var CHK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var BUB='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 01-12.4 7.6L3 21l1.4-5.6A8.5 8.5 0 1121 12z"/></svg>';
function dayType(p,r){if(p.date===r.date)return "Course";var t=(p.title||"")+" "+(p.detail||"");
  if(/repos|garde/i.test(p.title||""))return "Repos";var mm=/[×x]\s*(\d+)\s*(m|′|')/.exec(t);if(/seuil|spécifique|tempo|fractionn|vma/i.test(p.title||"")||(mm&&(mm[2]!=="m"||+mm[1]>=400)))return "Clé";return "Léger"}
var DCOL={Repos:"var(--rest)",Léger:"var(--sage)",Clé:"var(--orange)",Course:"var(--lav)"};
function blocksFor(p,type){if(type==="Repos")return [];if(type==="Course")return [[1,1]];
  var m=/(\d+)\s*[×x]\s*(\d+)/.exec(p.title||"");if(m&&type==="Clé"){var n=Math.min(+m[1],8),a=[[3,.35]];for(var i=0;i<n;i++){a.push([2,1]);if(i<n-1)a.push([.6,.35])}a.push([1.5,.35]);return a}
  var l=/(\d+)\s*[×x]\s*\d+\s*m/.exec((p.title||"")+" "+(p.detail||""));if(l){var k=+l[1],b=[[4,.45]];for(var j=0;j<k;j++){b.push([.3,1]);if(j<k-1)b.push([.2,.45])}return b}
  return [[1,.45]]}
function medalSVG(kmv){var t=kmv?String(Math.round(kmv*10)/10).replace(".",","):"";
  return '<svg class="medal" viewBox="0 0 196 236" aria-hidden="true"><defs><linearGradient id="mrb1" x1="0" x2="1"><stop offset="0" stop-color="#1c1d22"/><stop offset=".5" stop-color="#3a3c45"/><stop offset="1" stop-color="#15161a"/></linearGradient><linearGradient id="mrb2" x1="0" x2="1"><stop offset="0" stop-color="#ff8f6b"/><stop offset="1" stop-color="#e75c43"/></linearGradient><radialGradient id="mgold" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff4c2"/><stop offset=".35" stop-color="#ffd35a"/><stop offset=".75" stop-color="#e9a21c"/><stop offset="1" stop-color="#b87308"/></radialGradient><radialGradient id="mgold2" cx=".6" cy=".7" r=".7"><stop offset="0" stop-color="#ffcf4d"/><stop offset="1" stop-color="#f3b52c"/></radialGradient><radialGradient id="msh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#5b43c7" stop-opacity=".35"/><stop offset="1" stop-color="#5b43c7" stop-opacity="0"/></radialGradient></defs>'+
  '<path d="M78 0 L104 0 L122 118 L96 124 Z" fill="url(#mrb1)"/><path d="M136 0 L160 0 L128 124 L104 118 Z" fill="url(#mrb2)"/><ellipse cx="116" cy="222" rx="62" ry="10" fill="url(#msh)"/><circle cx="114" cy="160" r="56" fill="url(#mgold)"/><circle cx="114" cy="160" r="41" fill="url(#mgold2)" stroke="#fff3c4" stroke-width="2" opacity=".95"/>'+
  '<text x="114" y="'+(t.length>3?154:156)+'" text-anchor="middle" font-family="Urbanist,sans-serif" font-weight="700" font-size="'+(t.length>3?24:30)+'" fill="#8a5705">'+esc(t)+'</text><text x="114" y="176" text-anchor="middle" font-family="Urbanist,sans-serif" font-weight="700" font-size="12" letter-spacing="2" fill="#8a5705">KM</text><path d="M78 128 A56 56 0 0 1 150 118" fill="none" stroke="#fff9dc" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>'}
function vHome(){
  var h="",n=upcoming()[0];
  if(!n){
    h+='<h3>Prochaine course</h3><div class="hero">'+medalSVG(10)+'<div class="ch3" style="margin-top:0">Aucune course prévue</div><button class="go" style="max-width:60%" data-add="1">Ajouter une course</button></div>';
    return h}
  watchWx(n);
  var pl=n.plan||[],tk=todayKey(),ck=(n.checks||{}).tap||{};
  if(S.dayIdx==null||S.dayRace!==n.id||S.dayIdx>=pl.length){S.dayRace=n.id;S.dayIdx=0;
    for(var i=0;i<pl.length;i++){if(pl[i].date>=tk){S.dayIdx=i;break}}}
  var p=pl[S.dayIdx];
  if(p){var ty=dayType(p,n),isT=p.date===tk,dn=!!ck[S.dayIdx],lbl=fdate(p.date,true).replace(/ \d{4}$/,"");
    h+='<h3>'+(isT?"Aujourd'hui":esc(lbl.charAt(0).toUpperCase()+lbl.slice(1)))+'<button class="x" data-goplan="'+esc(n.id)+'">Plan ›</button></h3>';
    h+='<div class="today'+(dn?" is-done":"")+'" style="background:'+DCOL[ty]+'"><div class="row1"><span class="tag">'+ty+'</span>'+(p.wx?'<span class="wxp">'+SUN+esc(p.wx.t)+(p.wx.r?' · pluie '+esc(p.wx.r):"")+'</span>':"")+'</div><span class="stamp">Fait</span>'+
      '<div class="t">'+esc(p.title)+'</div>'+(p.detail?'<div class="d">'+esc(p.detail)+'</div>':"")+(p.why?'<div class="wy">'+esc(p.why)+'</div>':"")+
      '<div class="blocks">'+blocksFor(p,ty).map(function(b){return '<i class="'+(b[1]===1?"w":"")+'" style="flex:'+b[0]+';height:'+(b[1]*100)+'%"></i>'}).join("")+'</div>'+
      '<div class="acts"><button class="done" data-done="'+S.dayIdx+'" aria-pressed="'+dn+'"><span class="ck">'+CHK+'</span><span>'+(dn?"Faite · annuler":ty==="Repos"?"Repos respecté":"Séance faite")+'</span></button>'+
      (S.sample?'<button class="cb" data-nav="coach" aria-label="Demander au coach">'+BUB+'</button>':"")+'</div></div>';
    h+='<div class="week" role="tablist" aria-label="Jours jusqu\'à la course">'+pl.map(function(q,i){var d=pd(q.date),t2=dayType(q,n);
      return '<button class="day'+(i===S.dayIdx?" on":"")+(t2==="Course"?" race":"")+'" role="tab" aria-selected="'+(i===S.dayIdx)+'" data-day="'+i+'">'+(ck[i]?'<span class="ok">'+OKI+'</span>':(t2!=="Repos"?'<span class="dot"></span>':""))+'<span class="d">'+DW[d.getDay()].charAt(0).toUpperCase()+DW[d.getDay()].slice(1,3)+'</span><span class="n">'+d.getDate()+'</span></button>'}).join("")+'</div>';
  }else h+='<h3>Aujourd\'hui</h3>'+(genBtn(n)||'<div class="empty">Pas encore de plan pour '+esc(n.name)+'.</div>');
  // course
  h+='<h3>Ta course<button class="x" data-race="'+esc(n.id)+'">Fiche ›</button></h3>';
  h+='<div class="hero" data-race="'+esc(n.id)+'" style="cursor:pointer">'+medalSVG(n.distanceKm)+'<div class="lab" style="position:relative;z-index:2">'+esc(fdate(n.date,true).replace(/ \d{4}$/,""))+(n.time?" · "+esc(n.time):"")+'</div><div class="ch3">'+esc(n.name)+'</div>'+
    '<div class="hchips"><span class="j">'+jx(n.date)+'</span>'+(n.distanceKm?'<span>'+km(n)+'</span>':"")+(goalT(n)?'<span>'+goalS(n)+'</span>':"")+'</div></div>';
  var key=pl.filter(function(q){return q.date>tk&&dayType(q,n)==="Clé"})[0];
  var lw=S.wx[n.id]&&S.wx[n.id].day,w=n.weather||{};
  h+='<div class="duo">'+
    (key?'<button class="mini" style="background:var(--sky)" data-dayd="'+esc(key.date)+'"><div class="k">Prochaine clé</div><div class="v">'+esc((key.title||"").replace(/^Spécifique\s*/i,""))+'</div><div class="s">'+esc(fdate(key.date,true).replace(/ \d{4}$/,""))+'<br>'+esc(key.detail||"")+'</div></button>'
        :'<div class="mini" style="background:var(--sky)"><div class="k">Prédiction</div><div class="v">'+(n.prediction&&n.prediction.s?hms(n.prediction.s):"—")+'</div><div class="s">'+esc((n.prediction&&n.prediction.src)||"")+'</div></div>')+
    '<div class="mini" style="background:var(--butter)"><div class="k">Météo jour J'+(lw?" · direct":"")+'</div><div class="v">'+(lw?esc(lw.displayTemperature||"—"):esc((w.temp||"—").replace(/ max/,"")))+'</div><div class="s">'+(lw?esc(((lw.extended||{}).wind)||"")+'<br>pluie '+esc(lw.precip||"—"):esc(w.wind||"")+(w.sky?'<br>'+esc(w.sky):""))+'</div></div></div>';
  return h}
function records(){var rec=(S.me&&S.me.records)||[];if(!rec.length)return '<div class="empty">Records à compléter.</div>';
  return '<div class="lc">'+rec.map(function(x){return '<div class="r"><span class="l">'+esc(x.k)+'</span><span class="v'+(x.s?"":" dm")+'">'+(x.s?esc(x.label||hms(x.s)):"à compléter")+(x.s&&x.km?'<u>'+pace(x.s,x.km)+'/km</u>':"")+(x.when?'<u>'+esc(x.when)+'</u>':"")+'</span></div>'}).join("")+'</div>'}
function goalT(r){var g=(r.goals||[]).filter(function(x){return x.k===(r.goalSel||"B")})[0]||(r.goals||[])[0];return g?g.s:null}
function goalS(r){var t=goalT(r);return t?hms(t):"—"}

function card(r){var up=r.status!=="done"&&days(r.date)>=0,d=pd(r.date),res=r.result||{};
  return '<button class="rc'+(up?" up":"")+'" data-race="'+esc(r.id)+'"><div class="dt"><b>'+d.getDate()+'</b><span>'+MO[d.getMonth()]+(up?"":" "+String(d.getFullYear()).slice(2))+'</span></div>'+
  '<div style="min-width:0"><div class="nm">'+(r.priority?'<span class="pr p'+esc(r.priority)+'">'+esc(r.priority)+'</span>':"")+esc(r.name)+'</div><div class="mt">'+[km(r),r.dplus?"D+ "+r.dplus+" m":"",r.place].filter(Boolean).map(esc).join(" · ")+'</div></div>'+
  '<div class="rt">'+(up?'<b class="g">'+jx(r.date)+'</b><span>'+(goalT(r)?"obj. "+goalS(r):"")+'</span>':'<b>'+(res.s?hms(res.s):"—")+'</b><span>'+esc(res.place||(res.s&&r.distanceKm?pace(res.s,r.distanceKm)+"/km":"résultat à saisir"))+'</span>')+'</div></button>'}

/* ── COURSES ── */
function vRaces(){var u=upcoming(),p=past(),h="";
  h+='<h3>À venir<button class="x" data-add="1">+ Ajouter</button></h3>';
  h+=u.length?'<div>'+u.map(card).join("")+'</div>':'<div class="empty">Aucune course à venir. <b>Ajoute la prochaine</b> avec le bouton ci-dessus.</div>';
  h+='<h3>Courses passées <span class="cnt dm">'+p.length+'</span></h3>';
  h+=p.length?'<div class="block">'+p.map(card).join("")+'</div>':'<div class="empty">Les courses terminées arriveront ici.</div>';
  return h}

/* ── FICHE COURSE ── */
function vRace(){var r=race(S.raceId);if(!r)return '<div class="empty" style="margin-top:18px">Course introuvable.</div>';
  var up=r.status!=="done"&&days(r.date)>=0,tab=S.tab||(up?"obj":"bilan"),res=r.result||{};
  var h='<div style="margin-top:10px"><button class="back" data-nav="races">‹ Courses</button></div>';
  h+='<div class="hero'+(up?"":" past")+'"><div class="hrow"><div><div class="lab">'+(r.priority?"Course "+esc(r.priority)+" · ":"")+esc(r.name)+'</div><div class="jj">'+(up?jx(r.date):(res.s?hms(res.s):"Terminée"))+'</div><div class="sub">'+fdate(r.date,true)+(r.time?" · "+esc(r.time):"")+(r.place?" · "+esc(r.place):"")+'</div></div></div>'+
    '<div class="inner"><div class="ic"><div class="k">Distance</div><div class="v">'+(r.distanceKm?esc(String(r.distanceKm).replace(".",",")):"—")+'<span style="font-size:13px"> km</span></div><div class="s">'+(r.dplus?"D+ "+r.dplus+" m":"&nbsp;")+'</div></div>'+
    '<div class="ic"><div class="k">'+(up?"Objectif "+esc(r.goalSel||""):"Allure")+'</div><div class="v" style="color:var(--grn)">'+(up?goalS(r):(res.s&&r.distanceKm?pace(res.s,r.distanceKm):"—"))+'</div><div class="s">'+(up?(goalT(r)&&r.distanceKm?pace(goalT(r),r.distanceKm)+"/km":"à définir"):(res.place?esc(res.place):"/km"))+'</div></div></div></div>';
  var T=[["obj","Objectif"],["plan","Plan"],["jj","Jour J"],["bilan","Bilan"]];
  h+='<div class="tabs">'+T.map(function(t){return '<button data-tab="'+t[0]+'" class="'+(t[0]===tab?"on":"")+'">'+t[1]+'</button>'}).join("")+'</div>';
  h+=tab==="plan"?tPlan(r):tab==="jj"?tJour(r):tab==="bilan"?tBilan(r):tObj(r);
  return h}
function todo(what){return '<div class="empty">'+what+' à compléter. Utilise <b>Générer la fiche</b> ou demande au coach.</div>'}

function tObj(r){var h="",w=r.weather;
  h+=coachBtn();if(!(r.plan||[]).length&&genBtn(r))h+='<div style="margin-top:12px">'+genBtn(r)+'</div>';
  var lw=w&&w.locationKey?S.wx[r.id]:null;
  if(lw&&lw.day){var d=lw.day,ex=d.extended||{};
    h+='<h3>Météo · '+fdate(r.date)+'<span class="live">'+(lw.at?"à jour "+lw.at:"en direct")+'</span></h3><div class="lc">'+
      '<div class="r"><span class="l">Température</span><span class="v a">'+esc(d.displayTemperature||"")+'<u>max · ressenti '+esc(d.realFeel||"—")+'</u></span></div>'+
      '<div class="r"><span class="l">Vent</span><span class="v s">'+esc(ex.wind||"—")+(ex.gusts?' · rafales '+esc(ex.gusts):"")+'</span></div>'+
      '<div class="r"><span class="l">Ciel</span><span class="v s">'+esc(d.iconPhrase||d.phrase||"")+' · pluie '+esc(d.precip||"—")+'</span></div></div>'+
      '<div class="why">'+esc(heatNote(d.temperature))+'</div>';
    w=null}
  else if(lw&&lw.msg){h+='<h3>Météo prévue<span class="live off">'+esc(lw.short||"hors ligne")+'</span></h3>'+(w&&(w.temp||w.sky)?"":'<div class="empty">'+esc(lw.msg)+'</div>');if(w&&(w.temp||w.sky))h+='<div class="empty" style="margin-bottom:10px">'+esc(lw.msg)+' Dernière prévision enregistrée :</div>'}
  if(w&&(w.temp||w.sky)){h+=(lw&&lw.msg?'':'<h3>Météo prévue</h3>')+'<div class="lc">'+(w.temp?'<div class="r"><span class="l">Température</span><span class="v a">'+esc(w.temp)+'</span></div>':"")+(w.wind?'<div class="r"><span class="l">Vent</span><span class="v s">'+esc(w.wind)+'</span></div>':"")+(w.sky?'<div class="r"><span class="l">Ciel</span><span class="v s">'+esc(w.sky)+'</span></div>':"")+'</div>'+(w.note?'<div class="why">'+esc(w.note)+'</div>':"")}
  h+='<h3>Objectif</h3>';
  if((r.goals||[]).length){h+='<div class="objs">'+r.goals.map(function(g){return '<button class="ob'+(g.k===(r.goalSel||"B")?" on":"")+'" data-goal="'+esc(g.k)+'"><div class="a1">'+esc(g.k)+'</div><div class="b">'+hms(g.s)+'</div><div class="c">'+(r.distanceKm?pace(g.s,r.distanceKm):"")+'</div></button>'}).join("")+'</div>'}
  else h+=todo("Objectif chrono");
  var t=goalT(r);
  if(t&&r.distanceKm&&r.distanceKm>=5){var n=Math.round(r.distanceKm),p=t/r.distanceKm,first=p+3,end=p-3,nEnd=n>=10?2:1,mid=(p*n-first-nEnd*end)/(n-1-nEnd);
    var P=r.racePlan||[];
    if(P.length){h+='<h3>Plan de course</h3><div class="lc">'+P.map(function(x){var pp=x.seg==="start"?first:x.seg==="end"?end:mid;
      return '<div class="ph"><span class="km">'+esc(x.km)+'</span><div><div class="p">'+mmss(pp)+'/km<u>'+esc(x.tag||"")+'</u></div><div class="t">'+esc(x.text)+'</div></div></div>'}).join("")+'</div>'+(r.racePlanNote?'<div class="why">'+esc(r.racePlanNote)+'</div>':"")}
    if(n<=21){var c=0,rows="<tr><th>Km</th><th>Split</th><th>Cumul</th></tr>";
      for(var k=1;k<=n;k++){var sk=k===1?first:k>n-nEnd?end:mid;c+=sk;rows+="<tr"+(k===n?' class="hi"':"")+"><td>"+k+"</td><td>"+mmss(sk)+"</td><td>"+hms(c)+"</td></tr>"}
      h+='<h3>Splits</h3><div class="lc tw" style="padding:16px 18px 6px"><table>'+rows+'</table></div>'}
  }
  var c1=r.course||{};
  h+='<h3>Le parcours</h3>';
  if(c1.start||c1.finish){h+='<div class="lc">'+(c1.start?'<div class="r"><span class="l">Départ</span><span class="v s">'+esc(c1.start)+'</span></div>':"")+(c1.finish?'<div class="r"><span class="l">Arrivée</span><span class="v s">'+esc(c1.finish)+'</span></div>':"")+
    '<div class="r"><span class="l">Distance</span><span class="v">'+esc(String(c1.exactKm||r.distanceKm||"").replace(".",","))+'<u>km'+(r.dplus?" · D+ "+r.dplus+" m":"")+'</u></span></div>'+
    (r.time?'<div class="r"><span class="l">Départ</span><span class="v g">'+esc(r.time)+(c1.sas?'<u>'+esc(c1.sas)+'</u>':"")+'</span></div>':"")+'</div>'+(c1.warn?'<div class="warn"><b>'+esc(c1.warn[0])+'</b> '+esc(c1.warn[1])+'</div>':"")}
  else h+=todo("Parcours");
  return h}

function tPlan(r){var h=coachBtn(),pl=r.plan||[],tk=todayKey(),ck=(r.checks||{}).tap||{};
  h+='<h3>Plan jusqu\'au jour J</h3>';
  if(pl.length){var nd=pl.filter(function(_,i){return ck[i]}).length;
    h+='<div class="pbar"><div class="m"><i style="width:'+Math.round(nd/pl.length*100)+'%"></i></div><b>'+nd+' / '+pl.length+' jours</b></div>';
    h+=pl.map(function(p,i){var ty=dayType(p,r),d=pd(p.date),ps=p.date<tk,cur=p.date===tk;
      return '<div class="pd'+(ck[i]?" fin":"")+(ps?" past":"")+(cur?" now":"")+'" style="background:'+DCOL[ty]+'" role="checkbox" aria-checked="'+(!!ck[i])+'" tabindex="0" data-ck="tap" data-i="'+i+'">'+
        '<div class="dd"><span>'+DW[d.getDay()].charAt(0).toUpperCase()+DW[d.getDay()].slice(1,3)+'</span><b>'+d.getDate()+'</b><i>'+(cur?"auj.":jx(p.date))+'</i></div>'+
        '<div class="bd"><span class="ty">'+ty+'</span><div class="tt">'+esc(p.title)+'</div>'+(p.detail?'<div class="de">'+esc(p.detail)+'</div>':"")+'</div>'+
        '<span class="cc2">'+CHK+'</span></div>'}).join("");
    if(r.planNote)h+='<div class="why">'+esc(r.planNote)+'</div>';
    if(r.planRule)h+='<div class="warn"><b>'+esc(r.planRule[0])+'</b> '+esc(r.planRule[1])+'</div>';}
  else h+=genBtn(r)||todo("Plan d'affûtage");
  if((r.sessions||[]).length)h+='<h3>Séances types</h3><div class="lc">'+r.sessions.map(function(s){return '<div class="sx"><div class="t">'+esc(s.t)+'</div><div class="d">'+esc(s.d)+'</div><div class="w">'+esc(s.w)+'</div></div>'}).join("")+'</div>';
  if((r.gear||[]).length)h+='<h3>Chaussures</h3><div class="lc">'+r.gear.map(function(g){return '<div class="r"><span class="l">'+esc(g.n)+'</span><span class="v s '+(g.tone==="g"?"g":g.tone==="a"?"a":"")+'">'+esc(g.u)+'</span></div>'}).join("")+'</div>';
  return h}

function tJour(r){var h=coachBtn(),ck=(r.checks||{}).bag||{};
  function tl(list){return '<div class="lc">'+list.map(function(x){return '<div class="tl'+(x.key?" key":"")+'"><span class="h">'+esc(x.h)+'</span><span class="w">'+esc(x.w)+(x.small?'<small>'+esc(x.small)+'</small>':"")+'</span></div>'}).join("")+'</div>'}
  h+='<h3>Le jour J, minute par minute</h3>'+((r.day||[]).length?tl(r.day):(genBtn(r)||todo("Programme du jour J")));
  if(r.dayWarn)h+='<div class="warn"><b>'+esc(r.dayWarn[0])+'</b> '+esc(r.dayWarn[1])+'</div>';
  h+='<h3>La veille</h3>'+((r.eve||[]).length?tl(r.eve):todo("Programme de la veille"));
  var bag=r.bag||[],done=bag.filter(function(_,i){return ck[i]}).length;
  h+='<h3>Le sac'+(bag.length?'<span class="cnt">'+done+' / '+bag.length+'</span>':"")+'</h3>';
  h+=bag.length?'<div class="lc">'+bag.map(function(b,i){return '<div class="ci'+(ck[i]?" done":"")+'" role="checkbox" aria-checked="'+(!!ck[i])+'" tabindex="0" data-ck="bag" data-i="'+i+'"><span class="bx"></span><span>'+esc(b)+'</span></div>'}).join("")+'</div>':todo("Checklist du sac");
  if((r.dayInfo||[]).length)h+='<h3>Repères</h3><div class="lc">'+r.dayInfo.map(function(x){return '<div class="r"><span class="l">'+esc(x.l)+'</span><span class="v s">'+esc(x.v)+'</span></div>'}).join("")+'</div>';
  if(r.dayNote)h+='<div class="warn"><b>'+esc(r.dayNote[0])+'</b> '+esc(r.dayNote[1])+'</div>';
  return h}

function tBilan(r){var h="",res=r.result||{};
  h+='<h3>Résultat</h3>';
  if(res.s){h+='<div class="lc"><div class="r"><span class="l">Chrono</span><span class="v g">'+hms(res.s)+(r.distanceKm?'<u>'+pace(res.s,r.distanceKm)+'/km</u>':"")+'</span></div>'+
    (res.place?'<div class="r"><span class="l">Classement</span><span class="v s">'+esc(res.place)+'</span></div>':"")+
    (goalT(r)?'<div class="r"><span class="l">vs objectif '+esc(r.goalSel||"")+'</span><span class="v '+(res.s<=goalT(r)?"g":"a")+'">'+(res.s<=goalT(r)?"−":"+")+mmss(Math.abs(res.s-goalT(r)))+'</span></div>':"")+
    (res.avgHr?'<div class="r"><span class="l">FC moyenne</span><span class="v">'+esc(res.avgHr)+'</span></div>':"")+'</div>'}
  else h+='<div class="empty">'+(days(r.date)>0?"La course n'a pas encore eu lieu.":"Pas encore de chrono saisi.")+'</div>';
  if(res.strava)h+='<h3>Ton commentaire Strava</h3><div class="quote">'+esc(res.strava)+'</div>';
  if(r.bilan)h+='<h3>Bilan</h3><div class="quote">'+esc(r.bilan)+'</div>';
  if(!res.s&&days(r.date)<=0&&S.mcp)h+='<button class="btn w" data-import="1">Importer le résultat depuis Strava</button>';
  h+='<button class="btn w'+(!res.s&&days(r.date)<=0&&S.mcp?' soft':'')+'" data-result="1">'+(res.s?"Modifier le résultat":"Saisir le résultat")+'</button>';
  return h}

/* ── FORME ── */
function vForme(){var f=(S.me||{}).forme;if(!f)return '<div class="empty" style="margin-top:18px">Forme à compléter.</div>';
  var h='<h3>Forme'+(f.asOf?" au "+fdate(f.asOf):"")+'</h3><div class="grid">'+
    '<div class="sc"><div class="k">Condition physique</div><div class="v" style="color:var(--blu)">'+esc(f.condition)+'</div><div class="s" style="color:var(--blu)">'+esc(f.conditionNote||"")+'</div></div>'+
    '<div class="sc"><div class="k">Fatigue</div><div class="v" style="color:var(--vio)">'+esc(f.fatigue)+'</div><div class="s" style="color:var(--vio)">'+esc(f.fatigueNote||"")+'</div></div>'+
    '<div class="sc"><div class="k">Fraîcheur</div><div class="v" style="color:var(--grn)">'+esc(f.tsb)+'</div><div class="s g">'+esc(f.tsbNote||"")+'</div></div>'+
    '<div class="sc"><div class="k">'+esc(f.easyLabel||"FC facile")+'</div><div class="v" style="color:var(--amb)">'+esc(f.easyHr||"—")+'</div><div class="s a">'+esc(f.easyNote||"")+'</div></div></div>';
  if(f.alert)h+='<div class="why">'+esc(f.alert)+'</div>';
  var sq=f.threshold||[];
  if(sq.length>1){h+='<h3>Progression du seuil</h3><div class="cc"><svg viewBox="0 0 320 132" preserveAspectRatio="none" id="ch1"></svg><div class="cx">'+sq.map(function(p){return '<span>'+esc(p.d)+'</span>'}).join("")+'</div></div>'+(f.thresholdNote?'<div class="why">'+esc(f.thresholdNote)+'</div>':"")}
  if((f.predictions||[]).length)h+='<h3>Prédictions'+(f.predSrc?" "+esc(f.predSrc):"")+'</h3><div class="lc">'+f.predictions.map(function(p){return '<div class="r"><span class="l">'+esc(p.k)+'</span><span class="v">'+hms(p.s)+'<u>'+pace(p.s,p.km)+'</u></span></div>'}).join("")+'</div>';
  if((f.signals||[]).length)h+='<h3>Signaux</h3><div class="lc">'+f.signals.map(function(p){return '<div class="r"><span class="l">'+esc(p.l)+'</span><span class="v">'+esc(p.v)+(p.u?'<u>'+esc(p.u)+'</u>':"")+'</span></div>'}).join("")+'</div>';
  h+=vProg();
  if(S.acts)h+=vActs();else if((f.last7||[]).length)h+='<h3>Dernières séances</h3><div class="lc">'+f.last7.map(function(s){return '<div class="r"><span class="l">'+esc(s.d)+' · '+esc(s.n)+'</span><span class="v">'+esc(s.p)+'<u>FC '+esc(s.hr)+' · eff '+esc(s.e)+'</u></span></div>'}).join("")+'</div>';
  h+=vGear();
  h+='<h3>Records</h3>'+records();
  return h}
function drawSeuil(){var el=$("ch1"),sq=((S.me||{}).forme||{}).threshold||[];if(!el||sq.length<2)return;
  var pts=sq.map(function(p){return p.s}),lo=Math.min.apply(0,pts)-4,hi=Math.max.apply(0,pts)+5,W=320,H=132,n=pts.length,best=Math.min.apply(0,pts);
  var x=function(i){return 24+i*(W-48)/(n-1)},y=function(v){return 34+((v-lo)/(hi-lo))*(H-56)};
  var d="",dots="",labs="";pts.forEach(function(v,i){d+=(i?"L":"M")+x(i)+" "+y(v)+" ";
    dots+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="'+(v===best?5.5:4)+'" fill="var(--card)" stroke="var(--g1)" stroke-width="2.6"/>';
    labs+='<text x="'+x(i)+'" y="'+(y(v)-14)+'" text-anchor="middle" font-family="Urbanist,sans-serif" font-size="14" font-weight="800" fill="var(--ink)">'+mmss(v)+'</text>'});
  el.innerHTML='<path d="M'+x(0)+" "+H+" "+d.replace("M","L")+"L"+x(n-1)+" "+H+'Z" fill="var(--grn)" fill-opacity=".14"/><path d="'+d+'" fill="none" stroke="var(--g1)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'+dots+labs}

function heatNote(t){if(t==null)return "";t=+t;
  if(t<=12)return "Conditions idéales pour un 10 km : vise ton objectif A si le vent reste faible.";
  if(t<=16)return "Bonnes conditions : l'objectif B est pleinement jouable.";
  if(t<=20)return "Un peu chaud : compte 5 à 15 secondes de plus sur 10 km. Reste sur B et pars prudemment.";
  if(t<=24)return "Chaud : compte 15 à 30 secondes de plus. Vise C, bois bien la veille et le matin.";
  return "Très chaud : oublie le chrono, cours à la FC (jamais au-dessus de 180 avant le 8e km).";}
function coachBtn(){return S.sample?'<button class="coachbtn" data-coach="1"><i>C</i><div><b>Demander au coach</b><span>Une question sur cette course, ta forme ou ta séance</span></div></button>':""}

/* ── météo en direct (AccuWeather) ── */
function wxShort(c){return c==="server_not_connected"?"connecteur absent":c==="needs_reauth"?"à reconnecter":c==="not_in_manifest"?"non autorisée":"indisponible"}
function wxMsg(c){return "Météo momentanément indisponible."}
function watchWx(r){var w=r.weather||{};if(!S.mcp||!w.locationKey||S.wxOn[r.id]||days(r.date)<0)return;
  S.wxOn[r.id]=S.mcp.watchTool("AccuWeather","widgets-daily-claude",{queryParams:{locationKey:String(w.locationKey),unit:"metric",lang:"fr"}},function(ev){
    var cur=S.wx[r.id]||{};
    if(ev.type==="data"){var p=ev.result&&ev.result.payload;if(typeof p==="string"){try{p=JSON.parse(p)}catch(e){p=null}}
      var list=(p&&(p.dailyForecast||(p.result&&p.result.dailyForecast)))||[],day=null;
      list.forEach(function(x){if(String(x.date||"").slice(0,10)===r.date)day=x.day});
      var st=ev.result.cache&&ev.result.cache.storedAt,t=st?new Date(st):new Date();
      S.wx[r.id]=day?{day:day,at:String(t.getHours()).padStart(2,"0")+"h"+String(t.getMinutes()).padStart(2,"0")}
        :{msg:days(r.date)>15?"La prévision couvre 16 jours : elle apparaîtra à partir de "+jx(addDays(r.date,-15))+".":"Pas de prévision pour ce jour.",short:"pas encore"};
    }else{var c=ev.error&&ev.error.code;
      var deny=["needs_reauth","server_not_connected","blocked_by_policy","approval_required","not_in_manifest"].indexOf(c)>=0;
      if(deny||!cur.day)S.wx[r.id]={msg:wxMsg(c),short:wxShort(c)}}
    if((S.view==="race"&&S.raceId===r.id)||S.view==="home")render()},{refetchInterval:1800000});
}
function addDays(s,n){var d=pd(s);d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
