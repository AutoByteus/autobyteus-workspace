# Designer-owned native guest/transport lifecycle, no host filesystem share.
import threading, selectors, os
Q=P.parent/'fr-019'
VM='ab-sf-fr034-macos'
SCRATCH=Path((Q/'scratch-path.txt').read_text().strip()).resolve()
assert str(SCRATCH).startswith('/private/tmp/ab-sf-macos-vm-fr019.')
T=str(SCRATCH/'tools/tart.app/Contents/MacOS/tart')
ENV={'HOME':str(SCRATCH/'driver-home'),'PATH':'/usr/bin:/bin:/usr/sbin:/sbin','TART_HOME':str(SCRATCH/'tart-state'),'TART_NO_AUTO_PRUNE':'1'}
vm_process=vm_log=relay_socket=None
relay_threads=[];relay_connections=[];relay_event=threading.Event()
vm_created_mount=False

def vt(*args,timeout=25,check=True):
    t=time.monotonic();r=sp.run([T,*args],env=ENV,capture_output=True,text=True,timeout=timeout)
    R['commands'].append({'argv':[T,*args],'rc':r.returncode,'seconds':round(time.monotonic()-t,3),'stdout':r.stdout,'stderr':r.stderr});save()
    if check and r.returncode:raise RuntimeError('owned VM command failed '+str(args[:3])+': '+r.stderr[-1200:])
    return r

def vmsh(code,**kw):return vt('exec',VM,'/usr/bin/sudo','-n','-u','admin','/bin/sh','-c',code,**kw)

def vm_boot():
    global vm_process,vm_log,vm_ip,vm_gateway
    prior=json.loads((Q/'probe-result.json').read_text())
    assert not prior.get('fatal') and all(c['status']=='PASS' for c in prior['cases']), 'FR019 native VM control must first be demonstrated'
    assert all(c.get('hostVmProcessExited',True) for c in prior['cleanup'])
    vt('set',VM,'--cpu','2','--memory','4096')
    vm_log=open(P/'tart-run.log','w')
    argv=[T,'run',VM,'--no-graphics','--no-audio','--no-clipboard','--no-usb-accessories','--net-host']
    vm_process=sp.Popen(argv,env=ENV,stdout=vm_log,stderr=sp.STDOUT)
    R['nativeMacVm']={'node':VM,'hostUid':os.getuid(),'runArgv':argv,'hostProcessPid':vm_process.pid,'hostShares':False,'guestProviderCredentials':False};save()
    for _ in range(45):
        assert vm_process.poll() is None,'VM exited while booting'
        try:
            r=vt('exec',VM,'/usr/bin/sw_vers',timeout=5,check=False)
            if r.returncode==0:break
        except sp.TimeoutExpired:pass
        time.sleep(2)
    else:raise RuntimeError('native guest command control unavailable')
    import ipaddress
    lease_ip=vt('ip',VM).stdout.strip()
    vm_ip=vmsh('/usr/sbin/ipconfig getifaddr en0').stdout.strip()
    assert vm_ip==lease_ip,(vm_ip,lease_ip)
    host_route=run('/sbin/route','-n','get',vm_ip).stdout
    interfaces=[l.split(':',1)[1].strip() for l in host_route.splitlines() if l.strip().startswith('interface:')]
    assert len(interfaces)==1 and interfaces[0].startswith('bridge'),host_route
    host_ifconfig=run('/sbin/ifconfig',interfaces[0]).stdout
    candidates=[]
    for line in host_ifconfig.splitlines():
        bits=line.split()
        if bits and bits[0]=='inet' and 'netmask' in bits:
            address=bits[1];mask=bits[bits.index('netmask')+1]
            dotted=str(ipaddress.IPv4Address(int(mask,16))) if mask.startswith('0x') else mask
            network=ipaddress.ip_network(address+'/'+dotted,strict=False)
            if ipaddress.ip_address(vm_ip) in network and address!=vm_ip:candidates.append(address)
    assert len(candidates)==1,(host_route,host_ifconfig)
    vm_gateway=candidates[0]
    R['vmHostOnlyRoute']={'ownedGuestIp':vm_ip,'hostInterface':interfaces[0],'hostAddress':vm_gateway,'noDefaultGatewayRequired':True,'hostRoute':host_route,'hostInterfaceInfo':host_ifconfig}

    R['nativeMacVm'].update(ip=vm_ip,gateway=vm_gateway,identity=vmsh('uname -sm; id; sw_vers').stdout);save()

def start_relay():
    global relay_socket,relay_port
    relay_socket=socket.socket();relay_socket.bind((vm_gateway,0));relay_socket.listen(8);relay_socket.settimeout(.2)
    relay_port=relay_socket.getsockname()[1]
    def tunnel(client):
        backend=socket.create_connection(('127.0.0.1',storage_port),timeout=5)
        relay_connections.extend([client,backend]);sel=selectors.DefaultSelector()
        sel.register(client,selectors.EVENT_READ,backend);sel.register(backend,selectors.EVENT_READ,client)
        try:
            while not relay_event.is_set():
                for key,_ in sel.select(.2):
                    data=key.fileobj.recv(65536)
                    if not data:return
                    key.data.sendall(data)
        except (OSError,ValueError):pass
        finally:sel.close();client.close();backend.close()
    def accept():
        while not relay_event.is_set():
            try:c,addr=relay_socket.accept()
            except socket.timeout:continue
            except OSError:return
            if addr[0]!=vm_ip:c.close();continue
            if len(relay_threads)>20:c.close();continue
            th=threading.Thread(target=tunnel,args=(c,),daemon=True);relay_threads.append(th);th.start()
    th=threading.Thread(target=accept,daemon=True);relay_threads.append(th);th.start()
    R['testTransport']={'guestOnlyListener':vm_gateway+':'+str(relay_port),'allowedPeer':vm_ip,'upstream':'127.0.0.1:'+str(storage_port),'scope':'NFS TCP transport relay only, no file-level copying, not production or LAN deployment'};save()

def vm_cleanup():
    global vm_created_mount
    if vm_process and vm_process.poll() is None:
        if vm_created_mount:
            try:
                q=vmsh('sudo -n /sbin/umount '+M,timeout=25,check=False);R['cleanup'].append({'guestNativeUnmountRc':q.returncode,'target':M})
                if q.returncode==0:
                    vm_created_mount=False;vmsh('sudo -n /bin/rmdir '+M,check=False)
            except Exception as e:R['cleanup'].append({'guestUnmountError':repr(e),'target':M})
        try:q=vt('stop',VM,'--timeout','10',timeout=25,check=False);R['cleanup'].append({'exactVmStopRc':q.returncode})
        except Exception as e:R['cleanup'].append({'vmStopError':repr(e)})
        try:vm_process.wait(timeout=15)
        except sp.TimeoutExpired:
            vm_process.terminate()
            try:vm_process.wait(timeout=10)
            except sp.TimeoutExpired:vm_process.kill();vm_process.wait(timeout=10)
        R['cleanup'].append({'exactOwnedVmProcessExited':vm_process.poll() is not None})
    if vm_log:vm_log.close()
    relay_event.set()
    if relay_socket:relay_socket.close()
    for s in relay_connections:
        try:s.shutdown(socket.SHUT_RDWR);s.close()
        except OSError:pass
    for th in relay_threads:th.join(timeout=2)
    R['retainedStoppedCredentialFreeVm']=VM;save()
