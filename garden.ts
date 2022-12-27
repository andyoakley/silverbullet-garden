import type { QueryProviderEvent, } from "$sb/app_event.ts";
import { applyQuery } from "$sb/lib/query.ts";
import {
    editor,
    index,
    space,
} from "$sb/silverbullet-syscall/mod.ts";
import { events } from "$sb/plugos-syscall/mod.ts";



async function getAllLinks() {
    const links: any[] = [];
    const knownPages = new Set((await space.listPages()).map(p => p.name));
    for (
        const { value: from_page, key } of await index.queryPrefix(`pl:`)
    ) {
        const [, to_page, from_pos] = key.split(":"); // Key: pl:page:pos
        const to_page_exists = knownPages.has(to_page);
        links.push({ from_page, to_page, from_pos, to_page_exists });
    }

    return links;
}

export async function allLinksQueryProvider({
    query,
}: QueryProviderEvent): Promise<any[]> {
    const links = await getAllLinks();
    return applyQuery(query, links);
}

export async function missingPagesQueryProvider({
    query,
}: QueryProviderEvent): Promise<any[]> {
    const links = await getAllLinks();

    // filter to just missing, collapsing dupes in a set
    const missing = new Set();
    for (let link of links) {
        if (!link.to_page_exists) {
            missing.add(link.to_page);
        }
    }

    // produce new data source
    const missingPageNames: any[] = [];
    for (let name of missing) {
        missingPageNames.push({ name });
    }

    return applyQuery(query, missingPageNames);
}


export async function randomMissing() {
    let missing: Array<Array<any>> = await events.dispatchEvent(
        'query:allLinks',
        { query: { table: 'pl', filter: [{ op: '=', prop: "to_page_exists", value: false }] } },
        10 * 1000,
    );

    const choice = Math.floor(Math.random() * missing[0].length);
    await editor.navigate(missing[0][choice].to_page);
}