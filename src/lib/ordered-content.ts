interface OrderedItem {
  order: number;
}

interface IdentifiedOrderedItem extends OrderedItem {
  id: string;
}

export function normalizeOrderedItems<T extends OrderedItem>(
  items: readonly T[],
): T[] {
  return [...items]
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
}

export function moveOrderedItem<T extends IdentifiedOrderedItem>(
  items: readonly T[],
  id: string,
  offset: -1 | 1,
): T[] {
  const ordered = normalizeOrderedItems(items);
  const currentIndex = ordered.findIndex((item) => item.id === id);
  const targetIndex = currentIndex + offset;
  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= ordered.length
  ) {
    return ordered;
  }
  [ordered[currentIndex], ordered[targetIndex]] = [
    ordered[targetIndex],
    ordered[currentIndex],
  ];
  return ordered.map((item, index) => ({ ...item, order: index + 1 }));
}
