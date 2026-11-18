// @vitest-environment jsdom
// ExcelViewer with the real SheetJS parser. Every workbook is generated in the
// test (aoa_to_sheet + XLSX.write); no real user file is read.
// jsdom, not the default happy-dom: under happy-dom 15, DOMPurify stops walking
// the tree after its first removed node, so sanitising looks broken there while
// it works in browsers and jsdom.
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import ExcelViewer from '../ExcelViewer.vue';

const originalFetch = global.fetch;
const FILE_URL = 'http://example.com/file';

const book = (sheets: Record<string, XLSX.WorkSheet | unknown[][]>) => {
    const wb = XLSX.utils.book_new();
    for (const [name, sheet] of Object.entries(sheets)) {
        XLSX.utils.book_append_sheet(wb, Array.isArray(sheet) ? XLSX.utils.aoa_to_sheet(sheet) : sheet, name);
    }
    return wb;
};

const okResponse = (bytes: ArrayBuffer) =>
    ({ ok: true, status: 200, statusText: 'OK', arrayBuffer: () => Promise.resolve(bytes) }) as Response;

const serve = (bytes: ArrayBuffer) => {
    global.fetch = vi.fn().mockResolvedValue(okResponse(bytes)) as unknown as typeof fetch;
};

const mountWithUrl = async () => {
    const wrapper = mount(ExcelViewer, { props: { url: FILE_URL, content: null } });
    await flushPromises();
    return wrapper;
};

const cellTexts = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('.sheet-table td').map((td) => td.text());

describe('ExcelViewer.vue (real SheetJS parser)', () => {
    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('renders the loading state while the file is fetched', () => {
        global.fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch;

        const wrapper = mount(ExcelViewer, { props: { url: `${FILE_URL}.csv`, content: null } });

        expect(wrapper.find('.loading-state').exists()).toBe(true);
        expect(wrapper.text()).toContain('Loading spreadsheet');
    });

    it('shows the fetch error with Retry, and Retry loads the file', async () => {
        const bytes = XLSX.write(book({ S: [['recovered']] }), { type: 'array', bookType: 'xlsx' });
        global.fetch = vi
            .fn()
            .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' } as Response)
            .mockResolvedValueOnce(okResponse(bytes)) as unknown as typeof fetch;

        const wrapper = await mountWithUrl();

        expect(wrapper.find('.error-text').text()).toBe('Failed to fetch file: 500 Server Error');
        await wrapper.find('.retry-button').trigger('click');
        await flushPromises();

        expect(wrapper.find('.error-state').exists()).toBe(false);
        expect(cellTexts(wrapper)).toEqual(['recovered']);
    });

    for (const bookType of ['xlsx', 'biff8', 'xlsm'] as const) {
        it(`renders a ${bookType} workbook from a URL with sheet tabs`, async () => {
            const wb = book({ Fruits: [['Name', 'Qty'], ['Apple', 3]], Second: [['only here']] });
            serve(XLSX.write(wb, { type: 'array', bookType }));

            const wrapper = await mountWithUrl();

            expect(global.fetch).toHaveBeenCalledWith(FILE_URL, { headers: expect.any(Headers) });
            expect(wrapper.find('.sheet-table table').exists()).toBe(true);
            expect(cellTexts(wrapper)).toEqual(['Name', 'Qty', 'Apple', '3']);
            const tabs = wrapper.findAll('.sheet-tab');
            expect(tabs.map((tab) => tab.text())).toEqual(['Fruits', 'Second']);
            expect(tabs[0].classes()).toContain('active');

            await tabs[1].trigger('click');

            expect(wrapper.findAll('.sheet-tab')[1].classes()).toContain('active');
            expect(cellTexts(wrapper)).toEqual(['only here']);
        });
    }

    it('renders a CSV file from a URL', async () => {
        serve(new TextEncoder().encode('city,count\nOslo,7\n').buffer as ArrayBuffer);

        const wrapper = await mountWithUrl();

        expect(cellTexts(wrapper)).toEqual(['city', 'count', 'Oslo', '7']);
        expect(wrapper.find('.sheet-tabs').exists()).toBe(false);
    });

    it('renders streamed CSV content when there is no URL', async () => {
        const wrapper = mount(ExcelViewer, { props: { url: null, content: 'a,b\n1,2' } });
        await flushPromises();

        expect(cellTexts(wrapper)).toEqual(['a', 'b', '1', '2']);
    });

    it('prefers the URL over streamed content', async () => {
        serve(XLSX.write(book({ S: [['from url']] }), { type: 'array', bookType: 'xlsx' }));

        const wrapper = mount(ExcelViewer, { props: { url: FILE_URL, content: 'from,content' } });
        await flushPromises();

        expect(cellTexts(wrapper)).toEqual(['from url']);
    });

    it('keeps markup in cell text inert and renders only table structure', async () => {
        const evil = [
            'x" onmouseover="window.__pwned=1" data-y="',
            '<img src=x onerror="window.__pwned=1">',
            '<script>window.__pwned=1</script>',
            'a < b > c',
        ];
        serve(XLSX.write(book({ S: [evil] }), { type: 'array', bookType: 'xlsx' }));

        const wrapper = await mountWithUrl();

        const root = wrapper.find('.sheet-table').element;
        const elements = [...root.querySelectorAll('*')];
        expect(new Set(elements.map((el) => el.tagName.toLowerCase()))).toEqual(new Set(['table', 'tbody', 'tr', 'td']));
        expect(elements.flatMap((el) => [...el.attributes].map((attr) => attr.name))).toEqual([]);
        expect(cellTexts(wrapper)).toEqual(evil);
    });

    it('shows hyperlinked cells as their text without a link', async () => {
        const sheet = XLSX.utils.aoa_to_sheet([['site', 'evil']]);
        sheet.A1.l = { Target: 'https://example.com/a?b=1&c=2' };
        sheet.B1.l = { Target: 'javascript:window.__pwned=1' };
        const bytes = XLSX.write(book({ S: sheet }), { type: 'array', bookType: 'xlsx' });
        // Precondition: the parser itself emits the links the viewer must drop.
        const rawHtml = XLSX.utils.sheet_to_html(XLSX.read(new Uint8Array(bytes), { type: 'array' }).Sheets.S);
        expect(rawHtml).toContain('href="javascript:window.__pwned=1"');
        expect(rawHtml).toContain('href="https://example.com/a?b=1&amp;c=2"');
        serve(bytes);

        const wrapper = await mountWithUrl();

        const root = wrapper.find('.sheet-table').element;
        expect(root.querySelectorAll('a').length).toBe(0);
        const attributeNames = [...root.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((attr) => attr.name));
        expect(attributeNames.filter((name) => name === 'href' || name.startsWith('on') || name.startsWith('data-'))).toEqual([]);
        expect(cellTexts(wrapper)).toEqual(['site', 'evil']);
    });
});
