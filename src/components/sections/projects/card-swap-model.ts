export interface CardSwapState {
  activeIndex: number;
  count: number;
}

export type CardSwapEvent =
  | { type: "next" }
  | { type: "previous" }
  | { type: "select"; index: number }
  | { type: "set-count"; count: number };

function normalizedCount(count: number) {
  return Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
}

function clampIndex(index: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor(index)));
}

export function createCardSwapState(
  count: number,
  activeIndex = 0,
): CardSwapState {
  const safeCount = normalizedCount(count);
  return {
    count: safeCount,
    activeIndex: clampIndex(activeIndex, safeCount),
  };
}

export function cardSwapReducer(
  state: CardSwapState,
  event: CardSwapEvent,
): CardSwapState {
  switch (event.type) {
    case "next":
      return {
        ...state,
        activeIndex: clampIndex(state.activeIndex + 1, state.count),
      };
    case "previous":
      return {
        ...state,
        activeIndex: clampIndex(state.activeIndex - 1, state.count),
      };
    case "select":
      return {
        ...state,
        activeIndex: clampIndex(event.index, state.count),
      };
    case "set-count": {
      const count = normalizedCount(event.count);
      return {
        count,
        activeIndex: clampIndex(state.activeIndex, count),
      };
    }
    default:
      return state;
  }
}
