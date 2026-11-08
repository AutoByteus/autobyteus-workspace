const html = await app.content();
const storage = await app.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
return { credentialShapedInDom: (html.match(/own_[A-Za-z0-9_-]{30,}/g) || []).length, ownOccurrences: (html.match(/own_/g) || []).length, credentialShapedInStorage: (storage.match(/own_[A-Za-z0-9_-]{30,}/g) || []).length };
