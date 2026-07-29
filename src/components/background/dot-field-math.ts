export interface DotPoint {
  x: number;
  y: number;
}

export interface DotPointer extends DotPoint {
  speed: number;
}

export interface DotFieldMathOptions {
  radius: number;
  maxDisplacement: number;
}

export interface DotOffset {
  x: number;
  y: number;
  intensity: number;
}

const ZERO_OFFSET: DotOffset = { x: 0, y: 0, intensity: 0 };

export function computeDotOffset(
  dot: DotPoint,
  pointer: DotPointer,
  options: DotFieldMathOptions,
): DotOffset {
  if (pointer.speed <= 0 || options.radius <= 0) {
    return ZERO_OFFSET;
  }

  const deltaX = dot.x - pointer.x;
  const deltaY = dot.y - pointer.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance >= options.radius) {
    return ZERO_OFFSET;
  }

  const proximity = 1 - distance / options.radius;
  const intensity = proximity * proximity * Math.min(1, pointer.speed);
  const displacement = options.maxDisplacement * intensity;

  if (distance === 0) {
    return { x: 0, y: -displacement, intensity };
  }

  return {
    x: (deltaX / distance) * displacement,
    y: (deltaY / distance) * displacement,
    intensity,
  };
}
