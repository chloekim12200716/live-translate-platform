import {
  PlatformComponentType,
  PlatformLayout,
  PlatformLayoutComponent
} from "../data/mockPlatformData";

export const componentTypeOptions: PlatformComponentType[] = ["video", "slide", "caption", "qa", "notice"];
export const backgroundFitOptions: PlatformLayout["backgroundFit"][] = ["cover", "contain", "fill"];
export const layoutUnitStep = 0.25;

export function clampGridValue(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Number(Math.min(Math.max(value, min), max).toFixed(2));
}

export function snapLayoutUnit(value: number) {
  return Number((Math.round(value / layoutUnitStep) * layoutUnitStep).toFixed(2));
}

export function getComponentFrameStyle(component: PlatformLayoutComponent, layout: PlatformLayout) {
  return {
    left: `${((component.x - 1) / layout.columns) * 100}%`,
    top: `${((component.y - 1) / layout.rows) * 100}%`,
    width: `${(component.w / layout.columns) * 100}%`,
    height: `${(component.h / layout.rows) * 100}%`
  };
}

export function componentDisplayName(type: PlatformComponentType) {
  switch (type) {
    case "video":
      return "Video";
    case "slide":
      return "Slide";
    case "caption":
      return "Caption";
    case "qa":
      return "Q&A";
    case "notice":
      return "Notice";
    default:
      return type;
  }
}

export function getDefaultComponentSize(type: PlatformComponentType) {
  switch (type) {
    case "video":
      return { w: 8, h: 5 };
    case "slide":
      return { w: 8, h: 5 };
    case "caption":
      return { w: 12, h: 2 };
    case "qa":
      return { w: 5, h: 4 };
    case "notice":
      return { w: 10, h: 2 };
    default:
      return { w: 6, h: 3 };
  }
}

export function getBackgroundSize(fit: PlatformLayout["backgroundFit"]) {
  if (fit === "fill") return "100% 100%";
  return fit;
}
