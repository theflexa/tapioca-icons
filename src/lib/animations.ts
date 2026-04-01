import type { AnimationType } from "./style-prompt";

export interface AnimationTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  shadowOpacity: number;
  shadowScale: number;
  cameraPosition?: [number, number, number];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type AnimationFn = (t: number) => AnimationTransform;

const animations: Record<AnimationType, AnimationFn> = {
  float: (t) => {
    const phase = t * Math.PI * 2;
    const y = Math.sin(phase) * 0.3;
    const tiltZ = Math.sin(phase) * 0.06;
    const height = Math.abs(y);
    return {
      position: [0, y, 0],
      rotation: [0, 0, tiltZ],
      scale: [1, 1, 1],
      shadowOpacity: 0.4 - height * 0.3,
      shadowScale: 1 + height * 0.5,
    };
  },

  rotate: (t) => {
    const angle = t * Math.PI * 2;
    return {
      position: [0, 0, 0],
      rotation: [0, angle, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.3 + Math.abs(Math.cos(angle)) * 0.1,
      shadowScale: 1,
    };
  },

  flip: (t) => {
    const eased = easeInOut(t < 0.5 ? t * 2 : 2 - t * 2);
    const angle = eased * Math.PI;
    return {
      position: [0, 0, 0],
      rotation: [0, angle, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.4 - Math.abs(Math.sin(angle)) * 0.2,
      shadowScale: 1 - Math.abs(Math.sin(angle)) * 0.3,
    };
  },

  "page-turn": (t) => {
    const eased = easeInOut(t < 0.5 ? t * 2 : 2 - t * 2);
    const angle = -eased * Math.PI;
    return {
      position: [0, 0, 0],
      rotation: [angle, 0, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.4 - Math.abs(Math.sin(angle)) * 0.2,
      shadowScale: 1 - Math.abs(Math.sin(angle)) * 0.3,
    };
  },

  pulse: (t) => {
    const phase = t * Math.PI * 2;
    const s = 1 + Math.sin(phase) * 0.12;
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [s, s, s],
      shadowOpacity: 0.4,
      shadowScale: 1 / s,
    };
  },

  bounce: (t) => {
    const phase = t * Math.PI * 2;
    const raw = Math.abs(Math.sin(phase));
    const y = easeInOut(raw) * 0.5;
    return {
      position: [0, y, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.5 - y * 0.6,
      shadowScale: 1 + y * 0.8,
    };
  },

  orbit: (t) => {
    const angle = t * Math.PI * 2;
    const radius = 3;
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.35,
      shadowScale: 1,
      cameraPosition: [
        Math.sin(angle) * radius,
        1,
        Math.cos(angle) * radius,
      ],
    };
  },

  tilt: (t) => {
    const phase = t * Math.PI * 2;
    const tiltX = Math.sin(phase) * 0.3;
    const tiltY = Math.cos(phase * 0.5) * 0.2;
    return {
      position: [0, 0, 0],
      rotation: [tiltX, tiltY, 0],
      scale: [1, 1, 1],
      shadowOpacity: 0.35,
      shadowScale: 1,
    };
  },
};

export function getAnimation(type: AnimationType): AnimationFn {
  return animations[type];
}
