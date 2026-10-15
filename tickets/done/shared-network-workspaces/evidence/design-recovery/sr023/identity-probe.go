// Disposable dependency feasibility probe, NOT product source or finished implementation.
package main
import("bytes";"encoding/json";"encoding/xml";"errors";"fmt";"os";"os/exec";"path/filepath";"regexp";"strings";"syscall";"time")
// XMLName must retain element names for dictionary verification.
type elem struct { XMLName xml.Name; Text string `xml:",chardata"`; Children []elem `xml:",any"` }
type identity struct { VolumeUUID string `json:"volumeUuid"`; Inode uint64 `json:"inode"` }
func str[T ~int8 | ~uint8](a []T) string { b:=[]byte{}; for _,c:=range a {if c==0{break};b=append(b,byte(c))};return string(b) }
func main(){out,err:=observe(os.Args[1]);if err!=nil {json.NewEncoder(os.Stdout).Encode(map[string]any{"error":err.Error()});os.Exit(1)};json.NewEncoder(os.Stdout).Encode(out)}
func observe(p string)(map[string]any,error){
 before,err:=os.Lstat(p);if err!=nil{return nil,err};if !before.IsDir(){return nil,errors.New("not real directory")};canonical,err:=filepath.EvalSymlinks(p);if err!=nil{return nil,err};if canonical!=p{return nil,errors.New("noncanonical or symlink ancestor")}
 fd,err:=syscall.Open(p,syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW,0);if err!=nil{return nil,err};defer syscall.Close(fd)
 var st syscall.Stat_t;var fs syscall.Statfs_t
 if err=syscall.Fstat(fd,&st);err!=nil{return nil,err};if err=syscall.Fstatfs(fd,&fs);err!=nil{return nil,err}
 bst:=before.Sys().(*syscall.Stat_t);if st.Dev!=bst.Dev||st.Ino!=bst.Ino{return nil,errors.New("source changed opening")}
 if str(fs.Fstypename[:])!="apfs"||fs.Flags&0x00001000==0{return nil,errors.New("requires local APFS")}
 device, mount:=str(fs.Mntfromname[:]),str(fs.Mntonname[:]);if !strings.HasPrefix(device,"/dev/"){return nil,errors.New("not local device")}
 cmd:=exec.Command("/usr/sbin/diskutil","info","-plist",device);cmd.Env=[]string{"PATH=/usr/bin:/bin:/usr/sbin:/sbin","HOME=/var/empty","LANG=C","LC_ALL=C"};start:=time.Now();data,err:=cmd.Output();elapsed:=time.Since(start).Seconds();if err!=nil{return nil,err};if len(data)>1024*1024{return nil,errors.New("oversized plist")}
 var root elem;if err=xml.NewDecoder(bytes.NewReader(data)).Decode(&root);err!=nil{return nil,err};if root.XMLName.Local!="plist"||len(root.Children)!=1||root.Children[0].XMLName.Local!="dict"{return nil,errors.New("bad plist root")}
 children:=root.Children[0].Children;fields:=map[string]elem{};if len(children)%2!=0{return nil,errors.New("bad dictionary")}
 for i:=0;i<len(children);i+=2 {if children[i].XMLName.Local!="key"{return nil,errors.New("bad key")};key:=children[i].Text;if _,ok:=fields[key];ok{return nil,errors.New("duplicate key")};fields[key]=children[i+1]}
 get:=func(k string)string{n:=fields[k];if n.XMLName.Local!="string"{return ""};return n.Text}
 uuid:=strings.ToLower(get("VolumeUUID"));valid:=regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
 if !valid.MatchString(uuid)||uuid=="00000000-0000-0000-0000-000000000000"||get("DeviceNode")!=device||get("MountPoint")!=mount||get("FilesystemType")!="apfs"{return nil,fmt.Errorf("volume mapping incomplete/mismatch: device=%s mount=%s uuid=%s",device,mount,uuid)}
 after,err:=os.Lstat(p);if err!=nil{return nil,err};ast:=after.Sys().(*syscall.Stat_t);canon2,err:=filepath.EvalSymlinks(p);if err!=nil{return nil,err};var fs2 syscall.Statfs_t;if err=syscall.Fstatfs(fd,&fs2);err!=nil{return nil,err}
 if !after.IsDir()||canon2!=p||ast.Dev!=st.Dev||ast.Ino!=st.Ino||fs2.Fsid!=fs.Fsid||str(fs2.Mntfromname[:])!=device||str(fs2.Mntonname[:])!=mount{return nil,errors.New("source changed during observation")}
 return map[string]any{"identity":identity{uuid,st.Ino},"source":p,"deviceObservation":st.Dev,"uid":st.Uid,"gid":st.Gid,"mode":fmt.Sprintf("%o",st.Mode&0777),"mountedDevice":device,"volumeMountPoint":mount,"filesystem":"apfs","diskutilSeconds":elapsed,"rawPlist":string(data)},nil
}
