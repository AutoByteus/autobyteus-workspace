try { await fetch("http://127.0.0.1:59999/x"); } catch (e) { const c = e.cause; console.log(c?.message, "| code:", c?.code, "| errors:", c?.errors?.map(x => x.code)); }
try { await fetch("http://localhost:59999/x"); } catch (e) { const c = e.cause; console.log(c?.message, "| code:", c?.code, "| errors:", c?.errors?.map(x => x.code)); }
