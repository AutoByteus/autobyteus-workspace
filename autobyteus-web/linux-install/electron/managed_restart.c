// Electron bootstrap only. This addon has no command, path, uid, or descriptor API.
// The fixed inherited endpoint must not survive an exec into a backend or helper.
#define _GNU_SOURCE
#include <node_api.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/socket.h>

static napi_value claim(napi_env env, napi_callback_info unused) {
    (void)unused;
    const int fd = 4;
    int type = 0;
    socklen_t len = sizeof(type);
    struct ucred parent;
    socklen_t peerlen = sizeof(parent);
    int flags = fcntl(fd, F_GETFL), fdflags = fcntl(fd, F_GETFD);
    char hello[2];
    int ok = flags >= 0 && (flags & O_NONBLOCK) && fdflags >= 0
        && getsockopt(fd, SOL_SOCKET, SO_TYPE, &type, &len) == 0 && type == SOCK_DGRAM
        && getsockopt(fd, SOL_SOCKET, SO_PEERCRED, &parent, &peerlen) == 0
        && peerlen == sizeof(parent) && parent.pid == getppid() && parent.uid == getuid()
        && fcntl(fd, F_SETFD, fdflags | FD_CLOEXEC) == 0
        && recv(fd, hello, sizeof(hello), MSG_DONTWAIT | MSG_TRUNC) == 1 && hello[0] == 'M';
    napi_value result;
    if (napi_get_boolean(env, ok, &result) != napi_ok) return NULL;
    return result;
}
NAPI_MODULE_INIT() {
    (void)exports;
    napi_value fn;
    if (napi_create_function(env, "claim", NAPI_AUTO_LENGTH, claim, NULL, &fn) != napi_ok) return NULL;
    return fn;
}
