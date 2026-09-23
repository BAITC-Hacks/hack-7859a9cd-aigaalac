"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createCityGeometry, disposeCityGeometry, type CityGeometry } from "@/lib/city-geometry";
import type { CityVisualState } from "@/lib/city-visuals";
import { updateDistrictFocus } from "@/lib/city-focus";

export interface CityCameraCommand {
  type: "reset" | "zoom-in" | "zoom-out" | "rotate-left" | "rotate-right";
  nonce: number;
}
export interface CitySceneProps {
  state: CityVisualState;
  focusedDistrictId: string | null;
  onDistrictSelect: (id: string | null) => void;
  cameraCommand?: CityCameraCommand;
  onReady?: (ready: boolean) => void;
  onError?: (message: string) => void;
}

interface SceneRuntime {
  updateState: (state: CityVisualState) => void;
  focusDistrict: (districtId: string | null) => void;
  command: (command: CityCameraCommand["type"]) => void;
}
interface CameraTransition {
  startedAt: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  fromZoom: number;
  toZoom: number;
}

const OVERVIEW_TARGET = new THREE.Vector3(0, 1.6, -.7);
const OVERVIEW_POSITION = new THREE.Vector3(48, 53, 66);
const FALLBACK_MESSAGE = "Бұл құрылғыда 3D көрініс ашылмады. Аудан көрсеткіштері мен шешімдер төменде қолжетімді.";

/** One WebGL context survives all decisions and before/after changes. */
export default function CityScene({ state, focusedDistrictId, onDistrictSelect, cameraCommand, onReady, onError }: CitySceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const stateRef = useRef(state);
  const focusRef = useRef(focusedDistrictId);
  const callbacksRef = useRef({ onDistrictSelect, onReady, onError });
  stateRef.current = state;
  focusRef.current = focusedDistrictId;
  callbacksRef.current = { onDistrictSelect, onReady, onError };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let failed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      callbacksRef.current.onError?.(FALLBACK_MESSAGE);
      return;
    }
    const canvas = renderer.domElement;
    canvas.dataset.testid = "city-3d-canvas";
    canvas.dataset.ready = "false";
    canvas.setAttribute("aria-label", "Астананың шартты 3D қаласы. Айналдыру үшін сүйреңіз, масштабтау үшін дөңгелекті немесе екі саусақты қолданыңыз. Ауданды басып таңдаңыз.");
    canvas.setAttribute("role", "img");
    canvas.tabIndex = 0;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.outlineOffset = "-3px";
    host.appendChild(canvas);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor("#e3ebeb", 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e3ebeb");
    scene.fog = new THREE.Fog("#e3ebeb", 115, 220);
    scene.add(new THREE.HemisphereLight("#fffaf0", "#b4c1aa", 1.8));
    const sunlight = new THREE.DirectionalLight("#fff0d5", 3.2);
    sunlight.position.set(-28, 52, 30);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = -55;
    sunlight.shadow.camera.right = 55;
    sunlight.shadow.camera.top = 50;
    sunlight.shadow.camera.bottom = -50;
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 150;
    sunlight.shadow.bias = -.0012;
    sunlight.shadow.normalBias = .025;
    scene.add(sunlight);
    const fill = new THREE.DirectionalLight("#c7e4e4", .9);
    fill.position.set(18, 14, -22); scene.add(fill);

    const camera = new THREE.OrthographicCamera(-30, 30, 18, -18, .1, 220);
    camera.position.copy(OVERVIEW_POSITION);
    camera.lookAt(OVERVIEW_TARGET);
    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(OVERVIEW_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = .09;
    controls.screenSpacePanning = true;
    controls.minZoom = .65;
    controls.maxZoom = 6;
    controls.minPolarAngle = .3;
    controls.maxPolarAngle = Math.PI / 2.28;
    controls.rotateSpeed = .58;
    controls.zoomSpeed = .8;
    controls.panSpeed = .7;
    controls.update();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    controls.enableDamping = !reducedMotion;
    let content: CityGeometry | null = null;
    let contentKey = "";
    let currentState = stateRef.current;
    let currentFocus = focusRef.current;
    let cameraTransition: CameraTransition | null = null;
    let raf = 0;
    let visible = true;
    let lastTime: number | null = null;
    let elapsed = 0;
    let readySent = false;
    let metadataDirty = true;

    function fail() {
      if (failed || disposed) return;
      failed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      canvas.dataset.ready = "false";
      callbacksRef.current.onReady?.(false);
      callbacksRef.current.onError?.(FALLBACK_MESSAGE);
    }
    function schedule() {
      if (!disposed && !failed && !raf && visible && !document.hidden) raf = requestAnimationFrame(renderFrame);
    }
    function stopFrame() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      lastTime = null;
    }
    function renderFrame(time: number) {
      raf = 0;
      if (disposed || failed || !visible || document.hidden) { lastTime = null; return; }
      const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .1);
      lastTime = time;
      if (!reducedMotion) elapsed += delta;
      if (cameraTransition) {
        const progress = reducedMotion ? 1 : Math.min(1, (time - cameraTransition.startedAt) / 650);
        const ease = 1 - (1 - progress) ** 3;
        camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, ease);
        controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, ease);
        camera.zoom = THREE.MathUtils.lerp(cameraTransition.fromZoom, cameraTransition.toZoom, ease);
        camera.updateProjectionMatrix();
        if (progress === 1) cameraTransition = null;
      }
      if (content && !reducedMotion) {
        for (const car of content.cars) {
          const progress = (car.phase + elapsed * car.speed) % 1;
          car.object.position[car.axis] = car.origin[car.axis] + (progress - .5) * car.distance * car.direction;
        }
      }
      const selectedRing = currentFocus ? content?.focusRings.get(currentFocus) : null;
      if (selectedRing) updateDistrictFocus(selectedRing, elapsed, reducedMotion);
      controls.update();
      try {
        renderer.render(scene, camera);
      } catch { fail(); return; }
      if (metadataDirty) {
        canvas.dataset.buildingCount = String(content?.root.userData.buildingCount ?? 0);
        canvas.dataset.projectPlots = String(content?.root.userData.projectPlots ?? 0);
        canvas.dataset.infillCount = String(content?.root.userData.infillCount ?? 0);
        canvas.dataset.districtBounds = JSON.stringify([...(content?.districtBounds ?? [])].map(([id, bounds]) => ({ id, min: bounds.min.toArray(), max: bounds.max.toArray() })));
        canvas.dataset.featurePlots = JSON.stringify([...(content?.featureNodes ?? [])].filter(([, node]) => node.userData.plot).map(([id, node]) => ({ id, plot: node.userData.plot })));
        canvas.dataset.view = currentState.view;
        canvas.dataset.featureCount = String(currentState.featureCount);
        canvas.dataset.actionCount = String(currentState.actionCount);
        canvas.dataset.districtCount = String(currentState.districts.length);
        canvas.dataset.focusedDistrict = currentFocus ?? "all";
        canvas.dataset.featureDistricts = JSON.stringify(currentState.districts.map((district) => ({ id: district.id, actions: district.features.map((feature) => feature.actionId) })));
        canvas.dataset.landmarks = JSON.stringify([...(content?.landmarkNodes ?? [])].map(([districtId, node]) => ({ districtId, kind: node.userData.kind, name: node.userData.landmarkName })));
        metadataDirty = false;
      }
      canvas.dataset.ready = "true";
      if (!readySent) { readySent = true; callbacksRef.current.onReady?.(true); }
      if (!reducedMotion || cameraTransition) schedule();
    }
    function applyFocus() {
      if (!content) return;
      for (const [id, ring] of content.focusRings) ring.visible = id === currentFocus;
      metadataDirty = true;
    }
    function transitionTo(position: THREE.Vector3, target: THREE.Vector3, zoom: number) {
      if (reducedMotion) {
        cameraTransition = null;
        camera.position.copy(position); controls.target.copy(target); camera.zoom = zoom; camera.updateProjectionMatrix();
        controls.update();
      } else {
        cameraTransition = {
          startedAt: performance.now(),
          fromPosition: camera.position.clone(), toPosition: position.clone(),
          fromTarget: controls.target.clone(), toTarget: target.clone(),
          fromZoom: camera.zoom, toZoom: zoom,
        };
      }
      schedule();
    }
    function districtZoom(districtId: string, target: THREE.Vector3, offset: THREE.Vector3) {
      const bounds = content?.districtBounds.get(districtId);
      if (!bounds) return 1;
      const direction = offset.clone().normalize();
      const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
      const up = new THREE.Vector3().crossVectors(direction, right).normalize();
      let halfWidth = 0, halfHeight = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).sub(target);
        halfWidth = Math.max(halfWidth, Math.abs(point.dot(right)));
        halfHeight = Math.max(halfHeight, Math.abs(point.dot(up)));
      }
      return THREE.MathUtils.clamp(Math.min((camera.right - camera.left) * .43 / halfWidth, (camera.top - camera.bottom) * .36 / halfHeight), .65, 3.2);
    }
    function focusDistrict(districtId: string | null) {
      const sameFocus = currentFocus === districtId;
      currentFocus = districtId;
      applyFocus();
      if (!sameFocus || !readySent) {
        const target = districtId ? content?.districtTargets.get(districtId) : OVERVIEW_TARGET;
        if (target) {
          const offset = camera.position.clone().sub(controls.target);
          transitionTo(districtId ? target.clone().add(offset) : OVERVIEW_POSITION, target, districtId ? districtZoom(districtId, target, offset) : 1);
        }
      }
      schedule();
    }
    function command(type: CityCameraCommand["type"]) {
      if (type === "reset") {
        currentFocus = null; applyFocus();
        callbacksRef.current.onDistrictSelect(null);
        transitionTo(OVERVIEW_POSITION, OVERVIEW_TARGET, 1);
      } else if (type === "zoom-in" || type === "zoom-out") {
        transitionTo(camera.position, controls.target, THREE.MathUtils.clamp(camera.zoom * (type === "zoom-in" ? 1.25 : .8), .65, 6));
      } else {
        const offset = camera.position.clone().sub(controls.target);
        const angle = type === "rotate-left" ? -.34 : .34;
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        transitionTo(controls.target.clone().add(offset), controls.target, camera.zoom);
      }
    }
    function updateState(next: CityVisualState) {
      const key = JSON.stringify(next);
      if (key === contentKey) return;
      try {
        const replacement = createCityGeometry(next);
        if (content) { scene.remove(content.root); disposeCityGeometry(content.root); }
        content = replacement;
        contentKey = key;
        currentState = next;
        scene.add(replacement.root);
        applyFocus();
        metadataDirty = true;
        schedule();
      } catch { fail(); }
    }
    runtimeRef.current = { updateState, focusDistrict, command };

    function resize() {
      if (disposed) return;
      const width = Math.max(1, host!.clientWidth);
      const height = Math.max(1, host!.clientHeight);
      const aspect = width / height;
      const frustumHeight = Math.max(64, 110 / aspect);
      camera.left = -frustumHeight * aspect / 2;
      camera.right = frustumHeight * aspect / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
      if (currentFocus) {
        const target = content?.districtTargets.get(currentFocus);
        if (target) {
          const offset = camera.position.clone().sub(controls.target);
          cameraTransition = null;
          camera.position.copy(target).add(offset);
          controls.target.copy(target);
          camera.zoom = districtZoom(currentFocus, target, offset);
        }
      }
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      schedule();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) schedule(); else stopFrame();
    }, { rootMargin: "70px" });
    intersectionObserver.observe(host);
    function visibilityChange() { if (document.hidden) stopFrame(); else schedule(); }
    function motionChange() {
      reducedMotion = motionQuery.matches;
      controls.enableDamping = !reducedMotion;
      if (reducedMotion && cameraTransition) transitionTo(cameraTransition.toPosition, cameraTransition.toTarget, cameraTransition.toZoom);
      schedule();
    }
    function controlsChange() { schedule(); }
    function controlsStart() { cameraTransition = null; }
    controls.addEventListener("change", controlsChange);
    controls.addEventListener("start", controlsStart);
    document.addEventListener("visibilitychange", visibilityChange);
    motionQuery.addEventListener("change", motionChange);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let press: { x: number; y: number; id: number; dragged: boolean } | null = null;
    const pointers = new Set<number>();
    function pointerDown(event: PointerEvent) {
      pointers.add(event.pointerId);
      if (pointers.size > 1) { if (press) press.dragged = true; return; }
      press = { x: event.clientX, y: event.clientY, id: event.pointerId, dragged: false };
    }
    function pointerMove(event: PointerEvent) {
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press.dragged = true;
    }
    function pointerUp(event: PointerEvent) {
      pointers.delete(event.pointerId);
      const click = press;
      if (click?.id !== event.pointerId) return;
      press = null;
      if (click.dragged || !content || event.button > 0) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(content.pickTargets, false)[0];
      const id = hit?.object.userData.districtId;
      if (typeof id === "string") callbacksRef.current.onDistrictSelect(id);
    }
    function pointerCancel(event: PointerEvent) { pointers.delete(event.pointerId); press = null; }
    function contextLost(event: Event) { event.preventDefault(); fail(); }
    function keyDown(event: KeyboardEvent) {
      const keyCommands: Record<string, CityCameraCommand["type"]> = { ArrowLeft: "rotate-left", ArrowRight: "rotate-right", ArrowUp: "zoom-in", ArrowDown: "zoom-out", "+": "zoom-in", "=": "zoom-in", "-": "zoom-out" };
      const type = keyCommands[event.key];
      if (type) { event.preventDefault(); command(type); }
    }
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("webglcontextlost", contextLost);
    canvas.addEventListener("keydown", keyDown);

    updateState(stateRef.current);
    resize();
    if (currentFocus) focusDistrict(currentFocus);
    schedule();

    return () => {
      disposed = true;
      runtimeRef.current = null;
      stopFrame();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      motionQuery.removeEventListener("change", motionChange);
      controls.removeEventListener("change", controlsChange);
      controls.removeEventListener("start", controlsStart);
      controls.dispose();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("keydown", keyDown);
      if (content) disposeCityGeometry(content.root);
      sunlight.shadow.map?.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, []);

  useEffect(() => { runtimeRef.current?.updateState(state); }, [state]);
  useEffect(() => { runtimeRef.current?.focusDistrict(focusedDistrictId); }, [focusedDistrictId]);
  useEffect(() => { if (cameraCommand) runtimeRef.current?.command(cameraCommand.type); }, [cameraCommand]);

  return <div ref={hostRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }} />;
}
