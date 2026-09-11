export { BodyLocator, type LocatorMode } from './BodyLocator';
export { Fallback2D, pointTo2D } from './Fallback2D';
export { RegionSearch } from './RegionSearch';
export { CameraRig, REST_FOCUS, focusForRegion, type Focus } from './CameraRig';
export { hasWebGL, loadBody, MODEL_URL, BODY_ASSETS, modelBytes, type BodyAsset } from './assets';
export { buildRegionIndex, type RegionIndex } from './regionPick';
export {
  createSkinMaterial,
  paintRegions,
  ensureHighlightChannel,
  type SkinHandle,
  type PaintInput,
} from './skinMaterial';
export {
  bindRegionIndex,
  pinScaleFor,
  regionByValue,
  weightsFromPoint,
  weldHit,
  type PickResult,
} from './picker-types';
export { box, outlinePath, sidePath, anchorFor, projectX, projectY } from './silhouette';
export { LIGHTS, VIEW, GROUND, type LightSetup } from './lights';
export { Figure } from './Figure';
export { Pins } from './Pins';
export { Studio } from './Studio';
export { PinStrip } from './PinStrip';
export { ConfirmPanel } from './ConfirmPanel';
