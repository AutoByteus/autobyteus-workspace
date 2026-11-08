// autobyteus-437 PROBE-02 helper: answers every request with the client address it sees. Usage: node echo-client-address.mjs <host> <port> <label>
import http from "node:http";
const [host, port, label] = process.argv.slice(2);
http.createServer((req, res) => {
  res.end(JSON.stringify({ listener: label, clientAddress: req.socket.remoteAddress, hostHeader: req.headers.host }) + "\n");
}).listen(Number(port), host, () => console.log(`listening ${label} ${host}:${port}`));
