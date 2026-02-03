export async function detectCaptcha(page) {
    const content = await page.content();
    return (
        content.includes('captcha') ||
        content.includes('unusual traffic') ||
        (await page.$('iframe[src*="captcha"]')) !== null
    );
}
