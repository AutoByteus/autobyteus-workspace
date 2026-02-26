import sha256 from 'crypto-js/sha256';

/**
 * Recursively sorts the keys of an object.
 * This is necessary to match Python's `json.dumps(sort_keys=True)`.
 * @param obj The object to sort.
 * @returns A new object with all keys (including nested ones) sorted.
 */
function deepSortObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepSortObject);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = deepSortObject(obj[key]);
        return result;
      }, {} as Record<string, any>);
  }
  return obj;
}


/**
 * Generates a deterministic base invocation ID for a tool call.
 * This logic MUST exactly match the backend's implementation for the base ID.
 * @param toolName The name of the tool.
 * @param args The arguments for the tool.
 * @returns A string in the format 'call_<sha256_hash>'.
 */
export function generateBaseInvocationId(toolName: string, args: Record<string, any>): string {
  // 1. Create a canonical string from arguments by sorting keys (deeply) and using compact JSON.
  // The backend uses `json.dumps(separators=(',', ':'), sort_keys=True)`.
  // A deep sort is required to match Python's behavior for nested objects.
  const sortedArgs = deepSortObject(args);
  const canonicalArgs = JSON.stringify(sortedArgs);

  // 2. Combine with tool name.
  const hashString = `${toolName}:${canonicalArgs}`;

  // --- ADDED LOGGING ---
  console.log(`[Frontend toolUtils] Generating tool invocation ID from hash_string: '${hashString}'`);

  // 3. Generate SHA-256 hash.
  const hash = sha256(hashString).toString();

  // 4. Prepend with 'call_' prefix.
  return `call_${hash}`;
}
