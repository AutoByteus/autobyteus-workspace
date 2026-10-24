export default async (page) => { const ctx = page.context(); return ctx.browser().contexts().flatMap((c) => c.pages()).map((p) => p.url().slice(-60)); };
