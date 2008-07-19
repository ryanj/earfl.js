function earfl_audio_player(mode) {
  // earfl.js (pre-release) - contact ryan@earfl.com with usage questions.
  // more information available at: http://www.earfl.com/about/earfl_web_player
  // github project: http://github.com/ryanjarvinen/earfl.js

  //This collection of functions wraps the 'soundmanager2' js library and does a bit of UI work for us.
  var self = this;
  this.mode = mode;
  this.cur_btn_id= new Boolean(false);
  this.sm=new Boolean(false);
  this.last_sm=new Boolean(false);
  this.update_play_ids=function(r_id){
    //let a playa play
    $$('.play_button_' + r_id ).each(function(player){
      player.removeClassName('inline_stop_button');
      player.addClassName('inline_play_button');
    });
  }
  this.update_stop_ids=function(r_id){
    //stop a player - (cockblock)
    $$('.play_button_' + r_id ).each(function(player){
      player.addClassName('inline_stop_button');
      player.removeClassName('inline_play_button');
    });
  }
  this.event_seek=function(event){
    event_element = Event.element(event);
    if(event_element.hasClassName('load_progress')){
      //forward
      button_name = $w(event_element.up(0).previous(2).className)[0].slice(12);
      progress_px_width = event_element.up(0).getStyle('width');
    }else{
      //rewind
      button_name = $w(event_element.up(1).previous(2).className)[0].slice(12);
      progress_px_width = event_element.up(1).getStyle('width');
    }
    sound = soundManager.getSoundById( button_name );
    if(sound.playState == 1){
      px_offset = Event.pointerX(event) - Position.cumulativeOffset( event_element )[0];
      ms_offset = (px_offset / progress_px_width.slice(0,3) ) * sound.duration;
      soundManager.setPosition( button_name, ms_offset );
    }
  }
  this.event_onload=function(r_id, duration){
    if(this.mode != "buttons"){
      $$('.play_button_' + r_id ).each(function(btn){
        btn.next(2).observe('click', earfl_player.event_seek);
        btn.next(2).down(0).observe('click', earfl_player.event_seek);
        btn.next(2).down(0).setStyle({width: '100%'});
        btn.next(0).down(2).innerHTML=millis_to_string(duration);
        //remove "loading" text
        btn.next(1).innerHTML='&nbsp;';
      });
    }
  }
  this.event_whileloading=function(r_id, duration, bytesLoaded, bytesTotal){
    if(this.mode != "buttons"){
      $$('.play_button_' + r_id ).each(function(btn){
        btn.next(2).down(0).setStyle({width:'' + Math.floor( 100 * bytesLoaded / bytesTotal ) + '%'});
        btn.next(0).down(2).innerHTML=millis_to_string(duration);
      });
    }
  }
  this.event_onplay=function(r_id, duration){
    //be kind, rewind
    this.update_stop_ids(r_id);
    //re-run onload in case new players with the same rec_id have been added to the DOM
    this.event_onload(r_id, duration);  
  }
  this.event_whileplaying=function(r_id, offset, total){
    if(this.mode != "buttons"){
      $$('.play_button_' + r_id ).each(function(btn){
        //update time offset
        btn.next(0).down(0).innerHTML=millis_to_string(offset);
        //update slider offset
        btn.next(2).down(1).setStyle({width: '' + Math.floor( 100 * offset / total ) + '%'});
      });
    }
  }
  this.event_onstop=function(r_id){
    //dont hate the player, hate the game
    this.update_play_ids(r_id);
  }
  this.event_onfinish=function(r_id){
    this.update_play_ids(r_id);
    if(this.mode != "buttons"){
      $$('.play_button_' + r_id ).each(function(btn){
        btn.next(2).down(1).setStyle({width: '98%'});
      });
    }
  }
  this.play_track=function(id){
    //if we are swapping songs reset the old players button.
    if(this.cur_btn_id){
      this.update_play_ids(this.cur_btn_id);
    }
    this.cur_btn_id = 'r_' + id;
    try{
      // 1- check to see if the triggered recording has been loading yet.  Jump to 'catch' if not.
      this.last_sm = this.sm;
      this.sm = soundManager.getSoundById( 'r_' + id );
      // 1a- if the selected track is playing,
      if(!(this.sm && this.sm.playState == 1)){
        // 1aa - restart playback from zero, set the button's class to 'stop'.
        soundManager.stopAll();
        this.update_stop_ids(this.cur_btn_id);
        this.sm.play();
        //this next line runs the on_play event.  I needed this because soundmanager doesn't seem to be running it as prescribed.
        this.event_onplay('r_' + id, this.sm.duration );
      }
      else{
        // 1ab - stop it
        soundManager.stopAll();
      }
    }
    catch(error){
      // 1b- if it's not loaded already, load it
      if(this.mode != "buttons"){
        //display "loading..." text
        $$('.play_button_r_' + id ).each(function(btn){
          btn.next(1).innerHTML='<blink>loading...</blink>';
        });
      }
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
      //play it
      soundManager.play('r_'+id);
    }
  }
}
function millis_to_string(millis){
  minutes = Math.floor(millis/60000);
  sixths = Math.floor(millis/10000)%6;
  sixtyths = Math.floor(millis/1000)%10;
  return '' + minutes + ':' + sixths + sixtyths;
}
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
