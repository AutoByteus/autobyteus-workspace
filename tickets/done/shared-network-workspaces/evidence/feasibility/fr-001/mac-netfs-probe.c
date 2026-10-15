/* Disposable feasibility probe. No UI/auth prompts, no stored credentials. */
#include <CoreFoundation/CoreFoundation.h>
#include <NetFS/NetFS.h>
#include <sys/mount.h>
#include <stdio.h>
int main(int argc, char **argv) {
    if (argc != 3) return 64;
    CFStringRef u = CFStringCreateWithCString(NULL, argv[1], kCFStringEncodingUTF8);
    CFURLRef url = CFURLCreateWithString(NULL, u, NULL);
    CFStringRef m = CFStringCreateWithCString(NULL, argv[2], kCFStringEncodingUTF8);
    CFURLRef mount = CFURLCreateWithFileSystemPath(NULL, m, kCFURLPOSIXPathStyle, true);
    CFMutableDictionaryRef o = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFDictionarySetValue(o, kNAUIOptionKey, kNAUIOptionNoUI);
    CFDictionarySetValue(o, kNetFSAllowLoopbackKey, kCFBooleanTrue);
    CFMutableDictionaryRef mo = CFDictionaryCreateMutable(NULL, 0, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFDictionarySetValue(mo, kNetFSMountAtMountDirKey, kCFBooleanTrue);
    int flags = MNT_NOSUID | MNT_NODEV;
    CFNumberRef n = CFNumberCreate(NULL, kCFNumberIntType, &flags);
    CFDictionarySetValue(mo, kNetFSMountFlagsKey, n);
    CFArrayRef points = NULL;
    int result = NetFSMountURLSync(url, mount, NULL, NULL, o, mo, &points);
    printf("NetFSMountURLSync status=%d\n", result);
    if (points) CFShow(points);
    return result == 0 ? 0 : 1;
}
