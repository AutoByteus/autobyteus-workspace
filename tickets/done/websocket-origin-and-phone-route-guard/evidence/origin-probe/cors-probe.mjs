import { createRequire } from "node:module";
const require = createRequire(process.argv[2] + "/package.json");
const fastify = require("fastify"); const cors = require("@fastify/cors");
const app = fastify(); await app.register(cors, { origin: true, methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"] });
app.post("/graphql", async () => ({ data: "secret" }));
const pre = await app.inject({ method: "OPTIONS", url: "/graphql", headers: { origin: "https://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "content-type" } });
const post = await app.inject({ method: "POST", url: "/graphql", headers: { origin: "https://evil.example", "content-type": "application/json" }, payload: "{}" });
console.log(JSON.stringify({ preflight: pre.statusCode, preAllowOrigin: pre.headers["access-control-allow-origin"], preAllowHeaders: pre.headers["access-control-allow-headers"], post: post.statusCode, postAllowOrigin: post.headers["access-control-allow-origin"] }));
