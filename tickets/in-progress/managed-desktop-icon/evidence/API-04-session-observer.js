import {checkManagedWindows} from './shell-probe.js';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
const dir=GLib.get_home_dir()+'/icon-qa/';
export default class Observer extends Extension {
 enable(){this.timer=GLib.timeout_add(GLib.PRIORITY_DEFAULT,500,()=>{
 try{
 const sys=Shell.AppSystem.get_default(),id='autobyteus-managed.desktop',app=sys.lookup_app(id);
 let windows=global.get_window_actors().map(a=>a.meta_window).filter(Boolean).map(w=>({title:w.get_title(),pid:w.get_pid(),type:w.get_client_type()===Meta.WindowClientType.WAYLAND?'Wayland':'X11',wmclass:w.get_wm_class(),gtk:w.get_gtk_application_id(),tracked:Shell.WindowTracker.get_default().get_window_app(w)?.get_id()}));
 const state={session:GLib.getenv('XDG_SESSION_TYPE'),dock:Main.extensionManager.lookup('ubuntu-dock@ubuntu.com')?.state, favorites:global.settings.get_strv('favorite-apps'),registry:app?.get_app_info()?.get_filename(),icon:app?.get_app_info()?.get_icon()?.to_string(),running:sys.get_running().map(a=>a.get_id()),windows};
 GLib.file_set_contents(dir+'shell.json',JSON.stringify(state,null,2));
 const [ok,bytes]=GLib.file_get_contents(dir+'action');
 if(ok){GLib.unlink(dir+'action');let op=new TextDecoder().decode(bytes).trim();
 if(op.startsWith('probe ')){const [,pid,backend,n]=op.split(' ');try {GLib.file_set_contents(dir+'proof.json',JSON.stringify({pass:true,obs:checkManagedWindows(Number(pid),backend,Number(n))}));} catch(e) {GLib.file_set_contents(dir+'proof.json',JSON.stringify({pass:false,error:String(e)}));}}
 if(op==='menu')app.activate();
 if(op==='search'){Main.overview.show();Main.overview.searchEntry.set_text('AutoByteus');}
 if(op==='hide'){Main.overview.searchEntry.set_text('');Main.overview.hide();}
 }
 }catch(e){if(!String(e).includes('No such file'))console.error(e.stack);}
 return GLib.SOURCE_CONTINUE;});}
 disable(){if(this.timer)GLib.source_remove(this.timer);}
}
