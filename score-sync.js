/* Public display names with a browser guest identity; Google sign-in stays optional. */
(function(){
  'use strict';
  function read(key){try{return localStorage.getItem(key)||'';}catch(_){return '';}}
  function write(key,value){try{localStorage.setItem(key,value);}catch(_){}}
  function clean(name){return String(name||'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);}
  function slug(name){return name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');}
  window.DFScoreCollection=function(name){return /^(www\.)?thedailyfive\.net$/.test(location.hostname)?name:'preview_'+name;};
  window.DFEscape=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  window.DFScorePlayer=function(data){return data.playerId||slug(String(data.name||''));};
  var ready;
  function userReady(){
    if(!ready){ready=new Promise(function(resolve,reject){
      var auth=firebase.auth(),off=function(){},settled=false;
      var timer=setTimeout(function(){off();reject(new Error('Authentication timed out'));},12000);
      off=auth.onAuthStateChanged(function(user){if(settled)return;settled=true;clearTimeout(timer);Promise.resolve().then(off);resolve(user);},function(error){clearTimeout(timer);reject(error);});
    });}
    return ready.then(function(){return firebase.auth().currentUser;});
  }
  var joining;
  function guestUser(){
    if(!joining)joining=firebase.auth().signInAnonymously().then(function(result){return result.user;}).finally(function(){joining=null;});
    return joining;
  }
  window.DFSaveScore=function(collection,day,fields,targetId,wordId,onSaved){
    if(new URLSearchParams(location.search).get('practice')==='1')return;
    var target=document.getElementById(targetId),statusId='score-status-'+collection;
    var status=document.getElementById(statusId);
    if(!status){status=document.createElement('div');status.id=statusId;status.setAttribute('role','status');status.style.cssText='margin:12px 0;font-size:13px;line-height:1.5;';if(target)target.insertAdjacentElement('afterend',status);else document.body.appendChild(status);}
    var busy=false;
    function message(text,action,label){status.replaceChildren();var p=document.createElement('p');p.textContent=text;status.appendChild(p);if(action){var b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:9px 14px;font:inherit;cursor:pointer;';b.onclick=action;status.appendChild(b);}}
    function form(){
      status.replaceChildren();var label=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button'),note=document.createElement('p'),form=document.createElement('form');
      input.id='guest-name-'+collection;input.type='text';input.maxLength=20;input.minLength=2;input.required=true;input.autocomplete='nickname';var savedName=clean(read('df_lb_name'));input.value=savedName.includes('@')?'':savedName;input.placeholder='Your public display name';input.style.cssText='max-width:100%;padding:10px;font:inherit;';
      label.htmlFor=input.id;label.textContent='Your name in rankings';label.style.display='block';
      button.type='submit';button.textContent='Publish score';button.style.cssText='padding:10px 14px;margin:8px;font:inherit;cursor:pointer;';
      note.textContent='Your nickname, result and puzzle date will be public. Use a nickname without personal details.';
      form.append(label,input,button,note);status.appendChild(form);
      form.onsubmit=function(e){e.preventDefault();var name=clean(input.value);if(name.length<2||name.includes('@')){input.setCustomValidity('Enter a public nickname of at least two characters without an email address.');input.reportValidity();return;}input.setCustomValidity('');write('df_lb_name',name);save(name);};
      input.oninput=function(){input.setCustomValidity('');};
    }
    function save(name){
      if(busy)return;busy=true;message('Saving score…');
      if(!window._db||!window.firebase||!firebase.auth){busy=false;message('Rankings are unavailable. Your result is still on this device.',function(){save(name);},'Retry saving');return;}
      userReady().then(function(user){return user||guestUser();}).then(function(user){
        var identity=user.isAnonymous?'guest_'+user.uid:(slug(name)||user.uid);
        var id=user.isAnonymous?identity+'_'+day:(wordId?'day'+day+'_'+identity:identity+'_'+day);
        var data=Object.assign({},fields,{day:day,name:name,playerId:identity,uid:user.uid,ts:firebase.firestore.FieldValue.serverTimestamp()});
        return window._db.collection(DFScoreCollection(collection)).doc(id).set(data).then(function(){
          write('df_rank_player_id',identity);write('df_lb_name',name);
          message('Score saved as '+name+'. Come back tomorrow to build your monthly score.');
          var rankings=document.createElement('a');rankings.href='/leaderboard.html';rankings.textContent='View rankings →';status.appendChild(rankings);
          var change=document.createElement('button');change.type='button';change.textContent='Change name';change.style.cssText='display:block;margin:8px auto;padding:6px;font:inherit;';change.onclick=function(){form();};status.appendChild(change);
          if(onSaved)onSaved();
        });
      }).catch(function(error){ready=null;console.error('Score save failed:',error);message('Could not save to rankings. Your result is still on this device.',function(){save(name);},'Retry saving');}).finally(function(){busy=false;});
    }
    if(!window.firebase||!firebase.auth){message('Rankings are unavailable. Your result is still on this device.',function(){window.DFSaveScore(collection,day,fields,targetId,wordId,onSaved);},'Retry saving');return;}
    form();
  };
})();
