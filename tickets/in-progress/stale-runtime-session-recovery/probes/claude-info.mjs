const sdk = await import(process.argv[2]);
const real = process.argv[3], dir = process.argv[4];
console.log("missing:", JSON.stringify(await sdk.getSessionInfo("3f2c9e7a-1111-4222-8333-444455556666", { dir })));
const info = await sdk.getSessionInfo(real, { dir });
console.log("present:", info ? Object.keys(info).join(",") : info);
