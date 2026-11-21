import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SafeRestartMoment, SAFE_RESTART_QUIET_MS as quiet, SAFE_RESTART_RECHECK_MS as retry } from '../safeRestartMoment'
import { fetchBusyRuns } from '../../server/embeddedBusyRuns'

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0) })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('rechecks input after a pending read; waits another full quiet period then admits once', async () => {
  let input = 0, resolve!: (value: {busy:number;unknown:number}) => void
  const read = vi.fn(async () => ({ busy:0, unknown:0 })).mockImplementationOnce(() => new Promise(r => {resolve = r}))
  const safe=vi.fn(), moment=new SafeRestartMoment(() => input, read, Date.now)
  moment.watch(safe)
  await vi.advanceTimersByTimeAsync(quiet)
  input=Date.now(); resolve({busy:0,unknown:0}); await vi.advanceTimersByTimeAsync(quiet-1)
  expect(safe).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(retry);expect(safe).toHaveBeenCalledOnce()
})
it('defers busy, unavailable, unknown and failed observations, then proceeds on fresh zero', async () => {
  const read=vi.fn<() => Promise<{busy:number;unknown:number}|null>>()
    .mockResolvedValueOnce({busy:1,unknown:0}).mockResolvedValueOnce(null).mockResolvedValueOnce({busy:0,unknown:1})
    .mockRejectedValueOnce(Error('offline')).mockResolvedValue({busy:0,unknown:0})
  const safe=vi.fn(), moment=new SafeRestartMoment(() => -quiet,read,Date.now)
  moment.watch(safe);await vi.advanceTimersByTimeAsync(retry*4-1);expect(safe).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1);expect(safe).toHaveBeenCalledOnce()
})
it('old pending answer cannot admit a cancelled or replaced watch', async () => {
  let resolve!: (v:{busy:number;unknown:number})=>void
  const read=vi.fn(async()=>({busy:1,unknown:0})).mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
  const a=vi.fn(), b=vi.fn(), moment=new SafeRestartMoment(()=>-quiet,read,Date.now)
  moment.watch(a);moment.watch(b);resolve({busy:0,unknown:0});await vi.advanceTimersByTimeAsync(0)
  moment.cancel();await vi.advanceTimersByTimeAsync(retry);expect(a).not.toHaveBeenCalled();expect(b).not.toHaveBeenCalled()
})
it('authenticates the embedded request; malformed counts and failed reads are not idle', async () => {
  const f=vi.fn();vi.stubGlobal('fetch',f)
  expect(await fetchBusyRuns('http://test',null)).toBeNull();expect(f).not.toHaveBeenCalled()
  for(const payload of [{busy:0},{busy:-1,unknown:0},{busy:'0',unknown:0},{busy:0,unknown:.5},null]){
    f.mockResolvedValueOnce({status:200,json:async()=>payload});expect(await fetchBusyRuns('http://test','test-only')).toBeNull()
  }
  f.mockResolvedValueOnce({status:403}).mockRejectedValueOnce(Error()).mockResolvedValueOnce({status:200,json:async()=>({busy:0,unknown:0})})
  expect(await fetchBusyRuns('http://test','test-only')).toBeNull();expect(await fetchBusyRuns('http://test','test-only')).toBeNull()
  expect(await fetchBusyRuns('http://test','test-only')).toEqual({busy:0,unknown:0})
  expect(f).toHaveBeenCalledWith('http://test/rest/busy-runs',expect.objectContaining({headers:{authorization:'Bearer test-only'}, redirect:'error'}))
})
