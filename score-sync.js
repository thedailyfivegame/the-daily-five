// Share the existing Google sign-in session before writing a daily score.
(function(){
  window.DFSaveScore = function(collection, day, fields, targetId, wordId, onSaved){
    var target = document.getElementById(targetId);
    var statusId = 'score-status-' + collection;
    var status = document.getElementById(statusId);
    if(!status){
      status = document.createElement('div');
      status.id = statusId;
      status.setAttribute('role','status');
      status.style.cssText = 'margin:12px 0;font-size:13px;line-height:1.5;';
      if(target) target.parentNode.insertBefore(status,target.nextSibling);
      else document.body.appendChild(status);
    }
    function message(text, action, label){
      status.textContent = text;
      if(action){
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.cssText = 'display:block;margin:8px auto;padding:8px 12px;cursor:pointer;font:inherit;';
        button.onclick = action;
        status.appendChild(button);
      }
    }
    function failed(error){
      console.error('Score save failed (' + collection + '):', error);
      message('Your result is saved on this device, but could not be saved to rankings.', save, 'Retry saving');
    }
    function signIn(){
      var provider = new firebase.auth.GoogleAuthProvider();
      // Start the popup directly from the click so browsers do not block it.
      firebase.auth().signInWithPopup(provider).then(save).catch(function(error){
        console.error('Score sign-in failed:', error);
        message('Sign-in did not finish. Your result is still saved on this device.', signIn, 'Sign in with Google');
      });
    }
    function save(){
      message('Saving score…');
      if(!window._db || !window.firebase || !firebase.auth){
        message('Rankings are unavailable. Your result is saved on this device.', save, 'Retry saving');
        return;
      }
      // currentUser can be null while a previously signed-in session is restoring.
      var auth = firebase.auth();
      new Promise(function(resolve,reject){
        var unsubscribe = auth.onAuthStateChanged(function(user){
          unsubscribe();
          resolve(user);
        },reject);
      }).then(function(user){
        if(!user || user.isAnonymous){
          message('Sign in to save this result to rankings. Playing is always free.', signIn, 'Sign in with Google');
          return;
        }
        var name;
        try{name = localStorage.getItem('df_lb_name');}catch(e){}
        name = name || user.displayName || 'Player';
        var slug = name.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'') || user.uid;
        var id = wordId ? 'day' + day + '_' + slug : slug + '_' + day;
        var data = Object.assign({},fields,{day:day,name:name,ts:firebase.firestore.FieldValue.serverTimestamp()});
        return window._db.collection(collection).doc(id).set(data).then(function(){
          message('Score saved to rankings.');
          if(onSaved) onSaved();
        });
      }).catch(failed);
    }
    save();
  };
})();
