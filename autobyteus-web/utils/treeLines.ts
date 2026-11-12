/** The connector lines of one row of a flat tree list: which ancestor levels continue below it, and whether a sibling follows. */
export type TreeLines = Readonly<{ continuingAncestorDepths: number[]; hasFollowingSibling: boolean }>

/** Each row's connector lines in a flat, depth-first tree list (a row's depth counts from 0). */
export const treeLinesOf = (depths: readonly number[]): TreeLines[] => {
  const hasSibling = (index: number, depth: number): boolean => {
    for (let next = index + 1; next < depths.length; next += 1) {
      if (depths[next]! < depth) return false
      if (depths[next] === depth) return true
    }
    return false
  }
  return depths.map((depth, index) => Object.freeze({
    continuingAncestorDepths: Array.from({ length: depth }, (_, ancestor) => ancestor).filter((ancestor) => hasSibling(index, ancestor)),
    hasFollowingSibling: hasSibling(index, depth),
  }))
}
