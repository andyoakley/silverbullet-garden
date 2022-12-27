import type { QueryProviderEvent, } from "$sb/app_event.ts";
import { applyQuery } from "$sb/lib/query.ts";
import {
    editor,
    index,
    space,
} from "$sb/silverbullet-syscall/mod.ts";
import { events } from "$sb/plugos-syscall/mod.ts";


export async function allLinksQueryProvider({
    query,
}: QueryProviderEvent): Promise<any[]> {
    const links: any[] = [];
    const knownPages = new Set((await space.listPages()).map(p => p.name));
    for (
        const { value: from_page, key } of await index.queryPrefix(`pl:`)
    ) {
        const [, to_page, from_pos] = key.split(":"); // Key: pl:page:pos
        const to_page_exists = knownPages.has(to_page);
        links.push({ from_page, to_page, from_pos, to_page_exists });
    }
    return applyQuery(query, links);
}

export async function missingPagesQueryProvider({
    query,
}: QueryProviderEvent): Promise<any[]> {
    const missing = new Set();
    const knownPages = new Set((await space.listPages()).map(p => p.name));
    for (
        const { value: from_page, key } of await index.queryPrefix(`pl:`)
    ) {
        const [, page, from_pos] = key.split(":"); // Key: pl:page:pos
        if (!knownPages.has(page)) {
            missing.add(page);
        }
    }

    const pages: any[] = [];
    for (let name of missing) {
        pages.push({ name });
    }

    return applyQuery(query, pages);
}


export async function randomMissing() {
    let links: Array<Array<any>> = await events.dispatchEvent(
        'query:allLinks',
        { query: { table: 'pl', filter: [] } },
        10 * 1000,
    );

    const linkSet = new Set();
    for (let link of links[0]) {
        linkSet.add(link['to_page']);
    }

    const pageSet = new Set();
    for (let page of await space.listPages()) {
        pageSet.add(page['name']);
    }

    // this will implicitly favor to_pages that have multiple references
    const missing = [...linkSet].filter(e => !pageSet.has(e));

    const choice = Math.floor(Math.random() * missing.length);
    await editor.navigate(missing[choice]);
}