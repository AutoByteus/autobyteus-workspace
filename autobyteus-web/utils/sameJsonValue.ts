/** Two JSON values are equal, whatever the order of their objects' keys (a parsed snapshot follows its schema's order). */
export const sameJsonValue = (left: unknown, right: unknown): boolean => {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameJsonValue(value, right[index]))
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  const leftEntries = Object.entries(left).filter(([, value]) => value !== undefined)
  const rightRecord = right as Record<string, unknown>
  return leftEntries.length === Object.values(rightRecord).filter((value) => value !== undefined).length
    && leftEntries.every(([key, value]) => sameJsonValue(value, rightRecord[key]))
}
