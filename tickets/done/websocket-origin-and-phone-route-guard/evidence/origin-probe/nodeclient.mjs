const ws = new WebSocket("ws://127.0.0.1:47911/rest/remote/run-observations-from-node22");
ws.onerror = () => {}; setTimeout(()=>process.exit(0), 800);
