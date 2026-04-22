/**
 * generate-page.js — Generates an anime series page from info.json
 *
 * Usage:  node tools/generate-page.js
 *   (interactive — prompts you to pick a guid)
 *
 * Or:     node tools/generate-page.js <guid>
 *   (non-interactive — directly generates for that guid)
 *
 * What it does:
 *   1. Reads data/{guid}/info.json
 *   2. Adds the series to data/index.json (if not already there)
 *   3. Creates {guid}/index.html from tools/template.html
 *   4. Adds the page to sitemap.xml
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const TEMPLATE_PATH = path.join(ROOT, 'tools', 'template.html');
const INDEX_JSON_PATH = path.join(DATA_DIR, 'index.json');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const BASE_URL = 'https://otaku-save-terra.github.io/anime-watch-order';

function getAvailableGuids() {
    return fs.readdirSync(DATA_DIR).filter(name => {
        const infoPath = path.join(DATA_DIR, name, 'info.json');
        return fs.statSync(path.join(DATA_DIR, name)).isDirectory() && fs.existsSync(infoPath);
    });
}

function getGuidsWithPages() {
    return fs.readdirSync(ROOT).filter(name => {
        const htmlPath = path.join(ROOT, name, 'index.html');
        const dataPath = path.join(DATA_DIR, name);
        return fs.existsSync(htmlPath) && fs.existsSync(dataPath);
    });
}

function readInfo(guid) {
    const infoPath = path.join(DATA_DIR, guid, 'info.json');
    if (!fs.existsSync(infoPath)) {
        throw new Error(`No info.json found at data/${guid}/info.json`);
    }
    return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
}

/** Pick a short recognizable name from alt titles (last Latin-script alt, or guid capitalized) */
function getShortName(info) {
    const alts = info.title.alt || [];
    // Walk backwards to find last Latin-script alt title
    for (let i = alts.length - 1; i >= 0; i--) {
        if (/^[A-Za-z0-9\s\-:!'.&]+$/.test(alts[i])) {
            return alts[i];
        }
    }
    // Fallback: capitalize the guid
    return info.guid.charAt(0).toUpperCase() + info.guid.slice(1);
}

function generatePage(guid) {
    const info = readInfo(guid);
    const shortName = getShortName(info);
    const titleMain = info.title.main;

    // --- 1. Generate index.html from template ---
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const html = template
        .replace(/\{\{GUID\}\}/g, guid)
        .replace(/\{\{TITLE_MAIN\}\}/g, titleMain)
        .replace(/\{\{TITLE_SHORT\}\}/g, shortName);

    const pageDir = path.join(ROOT, guid);
    if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir);
    }
    const pagePath = path.join(pageDir, 'index.html');
    const overwriting = fs.existsSync(pagePath);
    fs.writeFileSync(pagePath, html, 'utf-8');
    console.log(`${overwriting ? 'Updated' : 'Created'} ${guid}/index.html`);

    // --- 2. Update data/index.json ---
    const indexData = JSON.parse(fs.readFileSync(INDEX_JSON_PATH, 'utf-8'));
    const exists = indexData.some(entry => entry.guid === guid);
    if (!exists) {
        indexData.push({
            guid: guid,
            title: info.title,
            thumbnail: info.thumbnail
        });
        fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(indexData, null, 2) + '\n', 'utf-8');
        console.log(`Added "${titleMain}" to data/index.json`);
    } else {
        console.log(`"${titleMain}" already in data/index.json — skipped`);
    }

    // --- 3. Update sitemap.xml ---
    const pageUrl = `${BASE_URL}/${guid}/index.html`;
    let sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    if (!sitemap.includes(pageUrl)) {
        const newEntry = [
            '  <url>',
            `    <loc>${pageUrl}</loc>`,
            '    <priority>0.9</priority>',
            '    <changefreq>weekly</changefreq>',
            '  </url>'
        ].join('\n');
        sitemap = sitemap.replace('</urlset>', newEntry + '\n</urlset>');
        fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
        console.log(`Added ${guid} to sitemap.xml`);
    } else {
        console.log(`${guid} already in sitemap.xml — skipped`);
    }

    console.log('\nDone! Summary:');
    console.log(`  Page:  ${guid}/index.html`);
    console.log(`  Title: ${titleMain} (${shortName})`);
    console.log(`  URL:   ${pageUrl}`);
}

async function main() {
    const guids = getAvailableGuids();
    const withPages = new Set(getGuidsWithPages());

    // If guid passed as CLI argument, use it directly
    const cliGuid = process.argv[2];
    if (cliGuid) {
        if (!guids.includes(cliGuid)) {
            console.error(`Error: No data/${cliGuid}/info.json found.`);
            console.error(`Available: ${guids.join(', ')}`);
            process.exit(1);
        }
        generatePage(cliGuid);
        return;
    }

    // Interactive mode
    console.log('=== AniWatch Order — Page Generator ===\n');
    console.log('Available series in data/:');
    guids.forEach((g, i) => {
        const status = withPages.has(g) ? ' [has page]' : ' [no page]';
        console.log(`  ${i + 1}. ${g}${status}`);
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => {
        rl.question('\nEnter guid or number: ', resolve);
    });
    rl.close();

    let guid = answer.trim();
    // If user entered a number, convert to guid
    const num = parseInt(guid, 10);
    if (!isNaN(num) && num >= 1 && num <= guids.length) {
        guid = guids[num - 1];
    }

    if (!guids.includes(guid)) {
        console.error(`Error: "${guid}" not found in data/. Available: ${guids.join(', ')}`);
        process.exit(1);
    }

    generatePage(guid);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
