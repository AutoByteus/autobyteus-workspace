
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelViewer from '../ExcelViewer.vue';
import * as XLSX from 'xlsx';

// Mock xlsx
vi.mock('xlsx', () => {
    return {
        read: vi.fn(),
        utils: {
            sheet_to_html: vi.fn(),
        }
    };
});

describe('ExcelViewer.vue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state when loading', async () => {
        // Mock fetch to hang to simulate loading
        global.fetch = vi.fn(() => new Promise(() => {}));
        
        const wrapper = mount(ExcelViewer, {
            props: {
                url: 'http://example.com/test.csv',
                content: null
            }
        });
        
        expect(wrapper.find('.loading-state').exists()).toBe(true);
        expect(wrapper.text()).toContain('Loading spreadsheet...');
    });

    it('loads from content when url is missing', async () => {
        const mockWorkbook = {
            SheetNames: ['Sheet1'],
            Sheets: { 'Sheet1': {} }
        };
        (XLSX.read as any).mockReturnValue(mockWorkbook);
        (XLSX.utils.sheet_to_html as any).mockReturnValue('<table><tbody><tr><td>test</td></tr></tbody></table>');

        const wrapper = mount(ExcelViewer, {
            props: {
                url: null,
                content: 'a,b\n1,2'
            }
        });

        // Wait for onMounted/watch
        await wrapper.vm.$nextTick();
        
        expect(XLSX.read).toHaveBeenCalledWith('a,b\n1,2', { type: 'string' });
        expect(wrapper.find('.sheet-table').html()).toContain('<table>');
    });

    it('prioritizes url over content', async () => {
        const mockWorkbook = {
            SheetNames: ['Sheet1'],
            Sheets: { 'Sheet1': {} }
        };
        (XLSX.read as any).mockReturnValue(mockWorkbook);
        
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
        });

        const wrapper = mount(ExcelViewer, {
            props: {
                url: 'http://example.com/test.xlsx',
                content: 'should ignored'
            }
        });

        // Wait for async loadExcel
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(global.fetch).toHaveBeenCalledWith('http://example.com/test.xlsx');
        // Should be called with buffer, not string
        expect(XLSX.read).toHaveBeenCalledWith(expect.any(Uint8Array), { type: 'array' });
    });
});
