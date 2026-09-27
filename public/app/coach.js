/* Kida — coach : conversation, rendu Markdown, notes. Scripts classiques chargés dans l'ordre (voir app.html) : ils partagent la portée globale. */
/* ── COACH : conversation plein écran, gardée sur le serveur, réponses au fil de l'eau ── */
var ICO_NEW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
var ICO_NOTE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
var ICO_SEND='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
var ICO_CLIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/></svg>';
var FILE_ICO={image:"🖼",pdf:"📄",seance:"⌚",tableur:"📊",texte:"📝"};
var ICO_STOP='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
function loadChat(){if(S.chat)return;S.chat=[];
  KidaAPI("/api/coach/chat").then(function(j){if(!S.cctl)S.chat=j.messages||[];if(S.view==="coach"){render();chatBottom()}}).catch(function(){})}
function chatBox(){return document.querySelector(".chat.full")}
/* La zone des messages occupe l'espace entre l'en-tête et la saisie : c'est elle qui défile, pas la page. */
function fitChat(){var c=chatBox(),f=$("cform");if(!c||!f)return;c.style.height=Math.max(120,f.getBoundingClientRect().top-c.getBoundingClientRect().top-10)+"px"}
function chatBottom(){requestAnimationFrame(function(){var c=chatBox();if(c)c.scrollTop=c.scrollHeight})}
function nearBottom(){var c=chatBox();return !c||c.scrollHeight-c.scrollTop-c.clientHeight<160}
/* Markdown minimal et sûr : le texte est échappé avant toute mise en forme. */
function mdInline(t){return t.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>")
  .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g,"$1<i>$2</i>").replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g,"$1<i>$2</i>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')}
function md(src){var L=esc(src||"").split("\n"),o=[],i=0,m;
  var row=/^\s*\|.*\|\s*$/,cells=function(r){return r.trim().replace(/^\||\|$/g,"").split("|").map(function(c){return mdInline(c.trim())})};
  var tag=function(t,a){return a.map(function(c){return "<"+t+">"+c+"</"+t+">"}).join("")};
  var special=/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|\s*&gt;|\s*\|.*\|\s*$|\s*(---|\*\*\*)\s*$)/;
  while(i<L.length){var l=L[i];
    if(row.test(l)&&/^\s*\|?\s*:?-{2,}/.test(L[i+1]||"")){var rows=[];while(i<L.length&&row.test(L[i]))rows.push(L[i++]);
      o.push('<div class="tw"><table><thead><tr>'+tag("th",cells(rows[0]))+'</tr></thead><tbody>'+rows.slice(2).map(function(r){return "<tr>"+tag("td",cells(r))+"</tr>"}).join("")+'</tbody></table></div>');continue}
    if(m=/^(#{1,4})\s+(.*)$/.exec(l)){o.push("<h4>"+mdInline(m[2])+"</h4>");i++;continue}
    if(/^\s*(---|\*\*\*)\s*$/.test(l)){o.push("<hr>");i++;continue}
    if(/^\s*[-*•]\s+/.test(l)){var u=[];while(i<L.length&&/^\s*[-*•]\s+/.test(L[i]))u.push(mdInline(L[i++].replace(/^\s*[-*•]\s+/,"")));o.push("<ul>"+tag("li",u)+"</ul>");continue}
    if(/^\s*\d+[.)]\s+/.test(l)){var n=[];while(i<L.length&&/^\s*\d+[.)]\s+/.test(L[i]))n.push(mdInline(L[i++].replace(/^\s*\d+[.)]\s+/,"")));o.push("<ol>"+tag("li",n)+"</ol>");continue}
    if(/^\s*&gt;/.test(l)){var q=[];while(i<L.length&&/^\s*&gt;/.test(L[i]))q.push(mdInline(L[i++].replace(/^\s*&gt;\s?/,"")));o.push("<blockquote>"+q.join("<br>")+"</blockquote>");continue}
    if(!l.trim()){i++;continue}
    var p=[];do{p.push(mdInline(L[i++]))}while(i<L.length&&L[i].trim()&&!special.test(L[i]));o.push("<p>"+p.join("<br>")+"</p>")}
  return o.join("")}
function msgHtml(m,last){var cur=last&&S.cctl?'<span class="cur"></span>':"";
  if(m.role==="user")return '<div class="msg u">'+(m.files&&m.files.length?'<div class="mfiles">'+m.files.map(function(f){return '<span>'+(FILE_ICO[f.kind]||"📎")+" "+esc(f.name)+'</span>'}).join("")+'</div>':"")+esc(m.content)+'</div>';
  return '<div class="msg bot md"'+(last?' id="clast"':"")+'>'+(m.content?md(m.content):"")+cur+'</div>'}
function vCoach(){var C=S.chat||[];
  var h='<div class="chatbar">'+(C.length?'<button data-newchat="1">'+ICO_NEW+'Nouvelle</button>':"")+'<button data-notes="1">'+ICO_NOTE+'Mes notes</button></div>';
  h+=C.length?'<div class="chat full">'+C.map(function(m,i){return msgHtml(m,i===C.length-1)}).join("")+'</div>'
    :'<div class="chatempty"><img src="/icons/avatar.jpg?v=2" alt=""><b>Ton coach</b>Il connaît tes courses, ton plan, ta forme, tes blessures et 12 mois de Strava. Donne-lui aussi tes fichiers avec le trombone.</div>';
  return h+'<form class="ask" id="cform"><div class="cfiles" id="cfiles"></div><button type="button" class="clip" id="cclip" aria-label="Joindre un fichier">'+ICO_CLIP+'</button><input type="file" id="cfile" multiple hidden accept="image/*,.pdf,.fit,.gpx,.tcx,.csv,.tsv,.txt,.md,.json,.xlsx"><textarea id="cq" rows="1" placeholder="Écris à ton coach" aria-label="Message au coach"></textarea><button aria-label="'+(S.cctl?"Arrêter":"Envoyer")+'">'+(S.cctl?ICO_STOP:ICO_SEND)+'</button></form>'}
/* Fichiers joints : envoyés tout de suite au serveur, qui en fait une fiche gardée pour toujours par le coach. */
S.cfiles=[];
function paintFiles(){var el=$("cfiles"),f=$("cform");if(!el)return;
  el.innerHTML=S.cfiles.map(function(x,i){return '<span class="cfile'+(x.st==="up"?" up":"")+'">'+(FILE_ICO[x.kind]||"📎")+" "+esc(x.name)+(x.st==="up"?' <i>lecture…</i>':'')+'<button type="button" data-unfile="'+i+'" aria-label="Retirer">×</button></span>'}).join("");
  f.classList.toggle("hasfiles",S.cfiles.length>0);
  el.querySelectorAll("[data-unfile]").forEach(function(b){b.onclick=function(){var x=S.cfiles[+b.dataset.unfile];S.cfiles.splice(+b.dataset.unfile,1);
    if(x&&x.id)KidaAPI("/api/coach/files?id="+encodeURIComponent(x.id),{method:"DELETE"}).catch(function(){});paintFiles()}});
  fitChat()}
function kindGuess(n,t){n=n.toLowerCase();return /^image\//.test(t)||/\.(jpe?g|png|webp|heic|gif)$/.test(n)?"image":/\.pdf$/.test(n)?"pdf":/\.(fit|gpx|tcx)$/.test(n)?"seance":/\.(xlsx|csv|tsv)$/.test(n)?"tableur":"texte"}
/* Photos réduites à 2000 px avant l'envoi (les photos d'iPhone dépassent souvent la taille permise). */
function shrink(file){return new Promise(function(ok){if(!/^image\//.test(file.type)||file.type==="image/gif")return ok(file);
  var u=URL.createObjectURL(file),im=new Image();im.onload=function(){var k=Math.min(1,2000/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);
    c.toBlob(function(b){ok(b||file)},"image/jpeg",.85)};im.onerror=function(){URL.revokeObjectURL(u);ok(file)};im.src=u})}
function addFiles(list){Array.prototype.forEach.call(list,function(file){
  var x={name:file.name,kind:kindGuess(file.name,file.type),st:"up"};S.cfiles.push(x);paintFiles();
  shrink(file).then(function(b){if(b.size>4*1024*1024)throw {error:"Fichier trop lourd (4 Mo maximum)."};
    var name=b===file?file.name:file.name.replace(/\.\w+$/,"")+".jpg";
    return fetch("/api/coach/files",{method:"POST",credentials:"same-origin",headers:{"Content-Type":b.type||"application/octet-stream","X-File-Name":encodeURIComponent(name)},body:b})
      .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok)throw j;return j.file})})})
   .then(function(f){Object.assign(x,f,{st:"ok"});paintFiles()})
   .catch(function(e){S.cfiles=S.cfiles.filter(function(y){return y!==x});paintFiles();toast((e&&e.error)||"Impossible d'envoyer « "+file.name+" »")})})}
function askCoach(q){var files=S.cfiles.filter(function(x){return x.st==="ok"});
  if(S.cctl||(!q&&!files.length))return;if(S.cfiles.some(function(x){return x.st==="up"})){toast("Attends la fin de la lecture du fichier");return}
  if(!q)q=files.length>1?"Voici des fichiers. Qu'en retiens-tu ?":"Voici un fichier. Qu'en retiens-tu ?";
  S.cfiles=[];S.draft="";var r=coachRace();S.chat=S.chat||[];
  var bot={role:"assistant",content:"",t:Date.now()};S.chat.push({role:"user",content:q,t:Date.now(),files:files.map(function(f){return {id:f.id,name:f.name,kind:f.kind}})},bot);
  var ctl=S.cctl=new AbortController(),raf=0;render();chatBottom();
  var paint=function(){raf=0;var el=$("clast");if(!el)return;var stick=nearBottom();el.innerHTML=md(bot.content)+'<span class="cur"></span>';if(stick)chatBottom()};
  fetch("/api/coach/chat",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,raceId:r?r.id:null,fileIds:files.map(function(f){return f.id})}),signal:ctl.signal})
   .then(function(res){if(res.status===401){location.href="/login";throw {code:"revoked"}}
     if(!res.ok||!res.body)return res.json().catch(function(){return {}}).then(function(j){throw {code:j.error||"upstream_error"}});
     var rd=res.body.getReader(),dec=new TextDecoder();
     var pump=function(){return rd.read().then(function(x){if(x.done)return;bot.content+=dec.decode(x.value,{stream:true});if(!raf)raf=requestAnimationFrame(paint);return pump()})};
     return pump()})
   .catch(function(e){var c=e&&(e.code||e.name);
     bot.content+=(bot.content?"\n\n":"")+(c==="AbortError"?"_(Arrêté.)_":c==="rate_limited"?"Trop de messages d'un coup : réessaie dans quelques minutes.":c==="sampling_disabled"?"Le coach n'est pas configuré sur le serveur.":"_(Réponse interrompue. Renvoie ton message.)_")})
   .then(function(){if(raf)cancelAnimationFrame(raf);if(S.cctl===ctl)S.cctl=null;if(S.view==="coach"){var stick=nearBottom();render();if(stick)chatBottom()}})}
function newChat(){if(!confirm("Effacer la conversation et repartir de zéro ?"))return;if(S.cctl)S.cctl.abort();
  KidaAPI("/api/coach/chat",{method:"DELETE"}).then(function(){S.chat=[];render()}).catch(function(){toast("Échec, réessaie")})}
function coachRace(){return (S.coachRace&&race(S.coachRace))||upcoming()[0]||null}
function notesSheet(){var L=$("layer");
  L.innerHTML='<div class="sheet-bg"><div class="sheet"><h2>Notes pour le coach</h2><p class="hint" style="margin:0 0 10px">Tout ce qu\'il doit savoir en plus des chiffres : contraintes, blessures, habitudes, objectifs. Il les lit avant chaque réponse.</p><label class="fld"><span>Tes notes</span><textarea id="cnotes" rows="12" placeholder="Chargement…" disabled></textarea></label><div id="cdocs"></div><div class="row2"><button type="button" class="btn soft" id="ncl">Fermer</button><button type="button" class="btn" id="nok" disabled>Enregistrer</button></div></div></div>';
  var close=function(){L.innerHTML=""};$("ncl").onclick=close;L.querySelector(".sheet-bg").onclick=function(e){if(e.target===this)close()};
  var docs=function(){KidaAPI("/api/coach/files").then(function(j){var el=$("cdocs");if(!el)return;var F=j.files||[];
    el.innerHTML=F.length?'<h3 class="docs-h">Documents gardés par le coach</h3>'+F.map(function(f){return '<div class="doc"><span>'+(FILE_ICO[f.kind]||"📎")+'</span><div><b>'+esc(f.name)+'</b><small>'+esc(f.summary||"")+'</small></div><button type="button" data-deldoc="'+esc(f.id)+'" aria-label="Supprimer">×</button></div>'}).join(""):"";
    el.querySelectorAll("[data-deldoc]").forEach(function(b){b.onclick=function(){if(!confirm("Le coach oubliera ce document. Supprimer ?"))return;
      KidaAPI("/api/coach/files?id="+encodeURIComponent(b.dataset.deldoc),{method:"DELETE"}).then(docs).catch(function(){toast("Échec, réessaie")})}})}).catch(function(){})};
  docs();
  KidaAPI("/api/coach/notes").then(function(j){var t=$("cnotes");if(!t)return;t.value=j.notes||"";t.disabled=false;$("nok").disabled=false}).catch(function(){toast("Notes indisponibles");close()});
  $("nok").onclick=function(){var b=$("nok");b.disabled=true;b.textContent="Enregistrement…";
    KidaAPI("/api/coach/notes",{method:"PUT",body:JSON.stringify({notes:$("cnotes").value})}).then(function(){toast("Notes enregistrées");close()}).catch(function(){b.disabled=false;b.textContent="Enregistrer";toast("Échec, réessaie")})}}
