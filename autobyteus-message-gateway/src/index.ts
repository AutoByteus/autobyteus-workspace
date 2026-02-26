import { startGateway } from "./bootstrap/start-gateway.js";

export async function main(): Promise<void> {
  await startGateway();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
