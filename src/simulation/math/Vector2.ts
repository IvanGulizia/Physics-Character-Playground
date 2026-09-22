/**
 * Vector2 - Fonctions d'algèbre vectorielle 2D pures et ultra-performantes
 */
import { Vec2 } from '../../types';

export const Vector2 = {
  create(x = 0, y = 0): Vec2 {
    return { x, y };
  },

  clone(v: Vec2): Vec2 {
    return { x: v.x, y: v.y };
  },

  set(out: Vec2, x: number, y: number): Vec2 {
    out.x = x;
    out.y = y;
    return out;
  },

  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
  },

  lengthSq(v: Vec2): number {
    return v.x * v.x + v.y * v.y;
  },

  length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len > 0.00001) {
      return { x: v.x / len, y: v.y / len };
    }
    return { x: 0, y: 0 };
  },

  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },

  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  },

  clampLength(v: Vec2, maxLen: number): Vec2 {
    const lenSq = v.x * v.x + v.y * v.y;
    if (lenSq > maxLen * maxLen && lenSq > 0) {
      const len = Math.sqrt(lenSq);
      return { x: (v.x / len) * maxLen, y: (v.y / len) * maxLen };
    }
    return { x: v.x, y: v.y };
  },
};
