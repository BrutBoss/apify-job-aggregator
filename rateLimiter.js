export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function rateLimit(rpm) {
    const delay = Math.floor((60_000 / rpm) + Math.random() * 500);
    await sleep(delay);
}
