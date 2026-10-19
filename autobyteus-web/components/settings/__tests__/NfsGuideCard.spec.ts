import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const release = vi.hoisted(() => ({value:null as null | {tag:string;installerUrl:string;downloadUrl:string;qualifiedComputers:('macos'|'linux')[]}}));
vi.mock('~/composables/useLocalization',()=>({useLocalization:()=>({t:(key:string)=>key.split('.').pop()})}));
import NfsGuideCard from '../NfsGuideCard.vue';
const wrappers: ReturnType<typeof mount>[]=[];
const render=()=>{const wrapper=mount(NfsGuideCard,{props:{release:release.value}});wrappers.push(wrapper);return wrapper;};
beforeEach(()=>{
  release.value=null;vi.useFakeTimers();
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:vi.fn().mockResolvedValue(undefined)}});
});
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());vi.useRealTimers();vi.restoreAllMocks();});
const publishedFixture=()=>{release.value={tag:'test-fixture',installerUrl:'https://release.example.invalid/install.sh',downloadUrl:'https://release.example.invalid/download',qualifiedComputers:['macos','linux']};};
describe('NFS guide',()=>{
  it('unavailable state disables both commands and has no invented download',async()=>{
    const w=render();expect(w.findAll('button')).toHaveLength(2);expect(w.get('#nfs-release-unavailable').text()).toBe('unavailable');
    for(const button of w.findAll('button'))expect(button.attributes('disabled')).toBeDefined();
    await w.get('button').trigger('click');expect(navigator.clipboard.writeText).not.toHaveBeenCalled();expect(w.find('a').exists()).toBe(false);
  });
  it('copies only a qualified fixture command; accessible success resets and links its release',async()=>{
    publishedFixture();const w=render();
    await w.get('[data-testid="copy-nfs-macos"]').trigger('click');await flushPromises();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("curl -fsSL 'https://release.example.invalid/install.sh' | bash");
    expect(w.get('[role="status"]').text()).toBe('copiedHint');expect(w.get('a').attributes('href')).toBe(release.value!.downloadUrl);
    await vi.advanceTimersByTimeAsync(2000);expect(w.get('[role="status"]').text()).toBe('');
  });
  it('shows clipboard failure without claiming success',async()=>{
    publishedFixture();vi.mocked(navigator.clipboard.writeText).mockRejectedValue(Error('denied'));const w=render();
    await w.get('[data-testid="copy-nfs-linux"]').trigger('click');await flushPromises();
    expect(w.get('[role="status"]').text()).toBe('copyFailed');expect(w.get('[data-testid="copy-nfs-linux"]').text()).toBe('copy');
  });
});
