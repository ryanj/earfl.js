function earfl_audio_player(mode) {
  // earfl.js (pre-release) - contact ryan@earfl.com with usage questions.
  // more information available at: http://www.earfl.com/about/earfl_web_player
  // github project: http://github.com/ryanjarvinen/earfl.js

  //This collection of functions wraps the 'soundmanager2' js library and adds a UI.
  
  // =INTERNAL VARS=
  var self = this;

  //The mode controls the layout and available features in the UI. 
  //'core' is the basic mode. 'narrow' and 'wide' modes may not work without additional data from the earfl.com API
  this.mode = mode;

  //Current track id, expected format once initialized is 'r_' plus the track id from earfl.com, "r_1823"
  this.cur_btn_id= new Boolean(false);
  //a soundmanager object capable of playing the current audio track
  this.sm=new Boolean(false);
  //a soundmanager object capable of playing the previous audio track
  this.last_sm=new Boolean(false);

  
  // =EVENT HANDLER FUNCTIONS=

  //Allow the user seeks to a specific point in the audio, update the UI to reflect the changes
  this.event_seek=function(event){
    event_element = Event.element(event);

    if(event_element.hasClassName('load_progress')){
      //skip forward
      button_name = $(event_element).up(0).previous(2).className)[0].slice(12);
      progress_px_width = event_element.up(0).getStyle('width');
    }else{
      //rewind, skip back
      button_name = $(event_element).up(1).previous(2).className)[0].slice(12);
      progress_px_width = event_element.up(1).getStyle('width');
    }

    //calculate the new playback progress amount and update the UI
    sound = soundManager.getSoundById( button_name );
    if(sound.playState == 1){
      px_offset = Event.pointerX(event) - Position.cumulativeOffset( event_element )[0];
      ms_offset = (px_offset / progress_px_width.slice(0,3) ) * sound.duration;
      soundManager.setPosition( button_name, ms_offset );
    }
  }

  //handle the onload event, add event listeners for our seekable progress bar
  this.event_onload=function(r_id, duration){
    if(this.mode != "buttons"){
      $('.play_button_' + r_id ).each(function(btn){
        btn.next(2).observe('click', earfl_player.event_seek);
        btn.next(2).down(0).observe('click', earfl_player.event_seek);
        btn.next(2).down(0).setStyle({width: '100%'});
        btn.next(0).down(2).innerHTML=millis_to_string(duration);
        //remove "loading" text
        btn.next(1).innerHTML='&nbsp;';
      });
    }
  }

  //Animate the loading progress as the audio is downloading
  this.event_whileloading=function(r_id, duration, bytesLoaded, bytesTotal){
    if(this.mode != "buttons"){
      $('.play_button_' + r_id ).each(function(btn){
        btn.next(2).down(0).setStyle({width:'' + Math.floor( 100 * bytesLoaded / bytesTotal ) + '%'});
        btn.next(0).down(2).innerHTML=millis_to_string(duration);
      });
    }
  }

  //handle play event, restart track at the beginning, and stop any other players that are in progress
  this.event_onplay=function(r_id, duration){
    // swap the 'play' button with our 'stop' button now that playback has started
    this.update_stop_ids(r_id);

    // re-run onload in case new players with the same rec_id have been recently injected into the DOM (since our initial load)
    // I know this may sound unlikely, but we definitely ran into a use case where this was necessary...
    this.event_onload(r_id, duration);  
  }

  //Animate the playback progress as the audio is playing
  this.event_whileplaying=function(r_id, offset, total){
    if(this.mode != "buttons"){
      $('.play_button_' + r_id ).each(function(btn){
        //update time offset
        btn.next(0).down(0).innerHTML=millis_to_string(offset);
        //update slider offset
        btn.next(2).down(1).setStyle({width: '' + Math.floor( 100 * offset / total ) + '%'});
      });
    }
  }

  //UI updates that need to happen when the user clicks a 'stop' button
  // change all visible 'stop' buttons back into 'play' buttons
  this.event_onstop=function(r_id){
    this.update_play_ids(r_id);
  }

  //When a track is done playing, swap the 'stop' button with a 'play' button.  (to allow the user to play it again)
  this.event_onfinish=function(r_id){
    this.update_play_ids(r_id);
    if(this.mode != "buttons"){
      $('.play_button_' + r_id ).each(function(btn){
        btn.next(2).down(1).setStyle({width: '98%'});
      });
    }
  }

  // =APPLICATION LOGIC=

  // when a play button is clicked, take the appropriate action
  this.play_track=function(id){
    //if we are swapping tracks, reset the previous players button.
    if(this.cur_btn_id){
      this.update_play_ids(this.cur_btn_id);
    }
    this.cur_btn_id = 'r_' + id;

    try{
      //store a reference to the previous track index, so we can test to see 
      //if we need to switch to a new track, or just restart the current one from the top.
      this.last_sm = this.sm;

      // check to see if the triggered recording has been loading yet.  
      // Attempt to reference the desired track in memory, if it is not found 
      // then an error will be thrown and we will load the track in the catch block below.
      this.sm = soundManager.getSoundById( 'r_' + id );

      // if the selected track is playing,
      if(!(this.sm && this.sm.playState == 1)){
        // then restart playback from zero, set the button's class to 'stop'.
        soundManager.stopAll();
        this.update_stop_ids(this.cur_btn_id);
        this.sm.play();
        // run the on_play event.  this patch fixes situations where soundmanager mysteriously fails to run this on its own.
        this.event_onplay('r_' + id, this.sm.duration );
      }
      else{
        // stop all audio from other players on the page 
        // (playback may have already been in progress on another player UI before we selected play on this track)
        soundManager.stopAll();
      }
    }
    catch(error){
      // The selected track has not been downloaded yet, lets load it up

      //UI updates
      if(this.mode != "buttons"){
        //display "loading..." text
        $('.play_button_r_' + id ).each(function(btn){
          btn.next(1).innerHTML='<blink>loading...</blink>';
        });
      }

      //create a new sound in soundmanager and store a shortcut reference to it
      this.sm = soundManager.createSound({
        'id' : 'r_'+id,
        'stream': true, 
        'url': '/recordings/'+id+'.mp3',
        'onload':       function(){ earfl_player.event_onload(this.sID, this.duration); },
        'onplay':       function(){ earfl_player.event_onplay(this.sID); },
        'onstop':       function(){ earfl_player.event_onstop(this.sID); },
        'onfinish':     function(){ earfl_player.event_onfinish(this.sID); },
        'whileloading': function(){ earfl_player.event_whileloading(this.sID, this.durationEstimate, this.bytesLoaded, this.bytesTotal); },
        'whileplaying': function(){ earfl_player.event_whileplaying(this.sID, this.position, this.durationEstimate); }
      });

      //stop all currently playing audio
      soundManager.stopAll();
      //redraw the button as stop
      this.update_stop_ids(this.cur_btn_id);
      //start audio playback
      soundManager.play('r_'+id);
    }
  }

  // =UI RELATED CODE=

  //This UI change should be triggered whenever the play button is pressed
  this.update_play_ids=function(r_id){
    //let the player play
    $('.play_button_' + r_id ).each(function(player){
      player.removeClassName('inline_stop_button');
      player.addClassName('inline_play_button');
    });
  }

  //This UI change should be triggered whenever the stop button is pressed
  this.update_stop_ids=function(r_id){
    //stop a player - (code-block?)
    $('.play_button_' + r_id ).each(function(player){
      player.addClassName('inline_stop_button');
      player.removeClassName('inline_play_button');
    });
  }
}

// ==more UI / renderer code==
// *TODO: relocate the following functions into the above class so as not to pollute the global namespace
// *TODO: move all CSS into a stylesheet.  most of these layout details don't belong in here

//The initial load of the playlist renders a bunch of data into an HTML string that will be injected into the DOM.
// I know this is mixing template data with logic, but I'm thinking of it like a renderer that converts JSON into HTML.
function render_xspf_playlist(playlist, format){
  var markup = '<ul class="content_tree" style="list-style-type:none;padding-left:5px;margin-left:0px;';
  switch(format){
  case 'wide':
    markup += 'width:450px;">';
    playlist.track.each(function( recording ){
      markup += render_wide_player(recording);
    })
    break;
  case 'narrow':
    markup += 'width:300px;">';
    playlist.track.each(function(recording) {
      markup += render_skinny_player(recording);
    })
    break;
  case 'core':
    markup += 'width:200px;">';
    playlist.track.each(function(recording) {
      markup += render_core_player(recording);
    })
    break;
  default:
    markup += 'width:200px;">';
    playlist.track.each(function(recording) {
      markup += render_core_player(recording);
    })
  }
  markup += '</ul>';
  return markup;
}

//The initial load of the playlist renders a bunch of data into an HTML string that will be injected into the DOM.
function render_playlist(recordings, format){
  var markup = '<ul class="content_tree" style="list-style-type:none;padding-left:10px;margin-left:0px;">';
  recordings.each(function(recording) {
    switch(format){
    case 'wide':
      markup += render_wide_player(recording);
      break;
    case 'narrow':
      markup += render_skinny_player(recording);
      break;
    case 'core':
      markup += render_core_player(recording);
      break;
    default:
      markup += render_core_player(recording);
    }
  })
  markup += '</ul>';
  return markup;
}

// ==RENDERING CODE FOR VARIOUS REUSABLE PLAYER UI COMPONENTS==

function render_player_images(recording){
  var images = '<div style="float:right;width:103px;">';
  images += '<div style="margin-top:4px;margin-right:3px;margin-bottom:3px;height:75px; overflow:hidden;">';
  images += '<a href="' + recording.identifier + '"><img src="' + recording.image + '" alt="' + recording.title.truncate(10).escapeHTML() + '" border="0" /></a>';
  images += '</div></div>';
  return images;
}

function render_player_stats(recording){
  var stats = '<div style="float:right;width:70px;padding-right:6px;padding-top:4px;">';
  stats += '<p style="margin-bottom:0px;">Plays: ' + recording.extension['www.earfl.com/about/earfl_web_player'][0].play_count + '</p>';
  stats += '<p style="margin-bottom:0px;">Rating: ' + recording.extension['www.earfl.com/about/earfl_web_player'][0].avg_rating + '</p>';
  stats += '<p style="margin-bottom:0px;"><a href="' + recording.identifier + '/embed">embed</a></p>';
  stats += '<p style="margin-bottom:0px;"><a href="' + recording.location + '">save</a></p>';
  stats += '</div>';

  return stats;
}

function render_player_user(recording){
  var user = '<div style="float:right;width:70px;padding-top:4px;">';
  user += '<a href="' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_uri + '">';
  user += '<div style="float:left;overflow:hidden;height:60px;width:60px;border:1px solid #999;clear:both;background-position:center center;background-image:url(' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_mugshot + ')"><!--X--></div>';
  user += '</a><div style="float:left;clear:both;height:16px;width:60px;text-align:left;overflow:hidden;">';
  user += '<a href="' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_uri + '">' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_name.escapeHTML() + '</a>';
  user += '</div></div>';

  return user;
}

function render_player_title(recording, show_author){
  var title = '';
  if(show_author){
    title += '<div style="width:auto;height:31px;overflow:hidden;"><a href="' + recording.identifier + '">' + recording.title.truncate(40).escapeHTML() + '</a>';
    title += '<br/><a href="' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_uri + '">' + recording.extension['www.earfl.com/about/earfl_web_player'][0].user_name.truncate(40).escapeHTML() + '</a></div>';
  }else{
    title += '<div style="width:auto;height:28px;margin-bottom:3px;overflow:hidden;"><a href="' + recording.identifier + '">' + recording.title.truncate(40).escapeHTML() + '</a></div>';
  }

  return title;
}

function render_player_core(recording){
  var core = '<div style="width:190px;">';
  core += '<a class="inline_play_button play_button_r_' + recording.extension['www.earfl.com/about/earfl_web_player'][0].recording_id + '" style="float:left;margin-left: 1px; margin-bottom:4px;margin-top:1px;" onclick="earfl_player.play_track(' + recording.extension['www.earfl.com/about/earfl_web_player'][0].recording_id + '); return false;" href="#"> </a>';
  core += '<div style="float:right;padding-right:7px;padding-top:8px;width:60px;"><span class="player_time_offset">0:00</span> <b> / </b> <span class="player_time_total">' + millis_to_string( recording.duration * 1000 ) + '</span></div>';
  core += '<div style="float:right;font-size:80%;width:70px;padding-right:12px;padding-top:10px;">&nbsp;</div>';
  core += '<div class="earfl_progress_bar" style="clear:both;width:180px;height:15px;background-color:#FFF;text-align:right;border:1px solid #FFF;overflow:none;"><div class="load_progress" style="background-color:#CCC;float:left;width:1%"><div class="play_progress" style="background-color:#0BC;float:left;border:2px solid #0AC;border-bottom:3px solid #0AC;border-top:8px solid #0CC;width:0%;height:4px;"><!--X--></div></div></div>';
  core += '</div>';

  return core;
}

function render_player_left(recording, show_author){
  var left = '<div style="float:left;width:190px;text-align:left;padding-left:4px;padding-top:2px;">';
  left += render_player_title(recording, show_author);
  left += render_player_core(recording);
  left += '</div>';

  return left;
}

function render_wide_player(recording){
  var player = '<li style="clear:both;padding-top:1px;padding-bottom:2px;"><div style="background-color:#EFEFEF;width:445px;">';
  player += render_player_left(recording, show_author=false);
  player += render_player_images(recording);
  player += render_player_stats(recording);
  player += render_player_user(recording);
  player += '<div style="clear:both;"><!--comment   --> </div>';
  player += '</div></li>';

  return player;
}

function render_skinny_player(recording){
  var player = '<li style="clear:both;padding-top:1px;padding-bottom:2px;"><div style="background-color:#EFEFEF;width:298px;">';
  player += render_player_left( recording, show_author=true );
  player += render_player_images(recording);
  player += '<div style="clear:both;"><!--comment   --> </div>';
  player += '</div></li>';

  return player;
}

function render_core_player(recording){
  var player = '<li style="clear:both;padding-top:1px;padding-bottom:2px;"><div style="background-color:#EFEFEF;width:190px;">';
  player += render_player_left(recording, show_author=false);
  player += '<div style="clear:both;"><!--comment   --> </div>';
  player += '</div></li>';

  return player;
}

// =UTILITY FUNCTIONS=

function millis_to_string(millis){
  minutes = Math.floor(millis/60000);
  sixths = Math.floor(millis/10000)%6;
  sixtyths = Math.floor(millis/1000)%10;
  return '' + minutes + ':' + sixths + sixtyths;
}