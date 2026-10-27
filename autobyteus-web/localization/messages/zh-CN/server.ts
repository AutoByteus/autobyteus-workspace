export default {
  'server.conflict.summary': '后端端口 {port} 已被占用。',
  'server.conflict.owner': '{executable}（进程 ID：{pid}）',
  'server.conflict.unknownName': '未知应用',
  'server.conflict.unavailable': '无法识别当前监听此端口的应用。',
  'server.conflict.guidance': '“重启服务器”仅控制本应用管理的后端，无法停止其他应用的监听进程。请先确认占用端口的应用，停止该应用或更改其配置，然后重试。这里显示的身份信息只是当前快照，请勿据此停止不熟悉的进程。',
  'server.conflict.noReset': '重置服务器数据不会释放此端口，无需重置您的数据。',
};
