/**
 * One display-name rule for members, collaborators and senders in every root (F-03): the last
 * address segment with `_` and `-` read as spaces (`/product_team/product_prototyper` →
 * `product prototyper`). Rows and the Team/Org tab use it as is; "From <Sender>:" uses the
 * title-case form.
 */
export const memberDisplayName = (address: string): string => {
  const leaf = address.split('/').filter(Boolean).at(-1) ?? ''
  return leaf.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || address
}

/** The title-case form for sentence positions ("From Product Prototyper:"). */
export const memberTitleName = (address: string): string =>
  memberDisplayName(address).replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
