import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowRight, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { formatCoins } from '../lib/api';
import { playGiftEffectSound } from '../lib/giftSoundService';
import { renderGiftIcon } from './GiftShopModal';

export interface RoomGiftEffectEvent {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  receiverId: string;
  receiverNickname: string;
  receiverAvatar?: string;
  giftName: string;
  giftIcon: string;
  isAnimated: boolean;
  tier: 'standard' | 'premium' | 'luxury';
  quantity: number;
  totalCoins: number;
  effectiveCoins?: number;
  isWeddingBonus?: boolean;
  videoUrl?: string;
}

interface Gift3DEffectOverlayProps {
  giftEvent: RoomGiftEffectEvent | null;
  queueCount?: number;
  onDismiss: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export const Gift3DEffectOverlay: React.FC<Gift3DEffectOverlayProps> = ({
  giftEvent,
  queueCount = 0,
  onDismiss,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const [isMuted, setIsMuted] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [phase, setPhase] = useState<'launching' | 'effect'>(
    reducedMotion ? 'effect' : 'launching'
  );

  // Automatic 2-phase transition: Launch trajectory -> Full Effect Stage + auto-dismiss
  useEffect(() => {
    if (!giftEvent) return;
    setIsMuted(false);
    setVideoFailed(false);
    setPhase(reducedMotion ? 'effect' : 'launching');

    playGiftEffectSound(giftEvent.tier, giftEvent.giftName);

    const launchTimer = reducedMotion
      ? null
      : window.setTimeout(() => {
          setPhase('effect');
        }, 520);

    const hasVideo = Boolean(giftEvent.videoUrl);
    const timeoutMs = hasVideo ? 16500 : 5200;
    const dismissTimer = window.setTimeout(() => {
      onDismissRef.current();
    }, timeoutMs);

    return () => {
      if (launchTimer) window.clearTimeout(launchTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [giftEvent?.id, reducedMotion]);

  // Attempt unmuted playback when video enters effect phase; fall back to muted if browser autoplay policy requires it
  useEffect(() => {
    if (phase !== 'effect' || !giftEvent?.videoUrl || videoFailed || !videoRef.current) return;
    const vid = videoRef.current;
    vid.muted = false;
    vid.play().catch(() => {
      vid.muted = true;
      setIsMuted(true);
      vid.play().catch(() => {});
    });
  }, [phase, giftEvent?.id, giftEvent?.videoUrl, videoFailed]);

  // Three.js full-screen 3D celebration scene
  useEffect(() => {
    if (!giftEvent || reducedMotion) return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    setWebglUnavailable(false);
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 6.2);
    camera.lookAt(0, 0, 0);

    // Mandatory Studio Environment Map for metallic gold & crystal PBR materials
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Warm/cool 3-point lighting rig
    const keyLight = new THREE.DirectionalLight(0xffdf9a, 2.2);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 1.1);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 1.6);
    rimLight.position.set(-4, 3, -5);
    scene.add(rimLight);

    // Palette by gift tier
    const isLuxury = giftEvent.tier === 'luxury' || Boolean(giftEvent.videoUrl);
    const primaryHex = isLuxury ? 0xe5b84b : giftEvent.tier === 'premium' ? 0xa855f7 : 0x3b82f6;
    const accentHex = isLuxury ? 0xfef08a : giftEvent.tier === 'premium' ? 0xf472b6 : 0x38bdf8;

    // Composite multi-part 3D hero emblem (THREE.Group of distinct beveled/lathe/torus parts)
    const heroGroup = new THREE.Group();
    if (!giftEvent.videoUrl) {
      heroGroup.position.y = 0.55;
      scene.add(heroGroup);
    }

    const disposables: Array<{ dispose: () => void }> = [envTexture];

    // 1. Lathe pedestal base
    const basePoints = [
      new THREE.Vector2(0, -0.85),
      new THREE.Vector2(0.95, -0.85),
      new THREE.Vector2(0.85, -0.68),
      new THREE.Vector2(0.55, -0.58),
      new THREE.Vector2(0.5, -0.35),
      new THREE.Vector2(0, -0.35),
    ];
    const baseGeo = new THREE.LatheGeometry(basePoints, 32);
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: primaryHex,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
    });
    const baseMesh = new THREE.Mesh(baseGeo, goldMat);
    heroGroup.add(baseMesh);
    disposables.push(baseGeo, goldMat);

    // 2. Faceted central gem crystal
    const gemGeo = new THREE.OctahedronGeometry(0.68, 0);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: accentHex,
      emissive: primaryHex,
      emissiveIntensity: 0.35,
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.y = 0.25;
    heroGroup.add(gemMesh);
    disposables.push(gemGeo, gemMat);

    // 3. Beveled star/crest ring around gem
    const outerRingGeo = new THREE.TorusGeometry(1.18, 0.055, 16, 64);
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.88,
      roughness: 0.22,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, silverMat);
    outerRing.position.y = 0.25;
    outerRing.rotation.x = Math.PI * 0.28;
    heroGroup.add(outerRing);
    disposables.push(outerRingGeo, silverMat);

    // 4. Tilted orbital halo ring
    const innerRingGeo = new THREE.TorusGeometry(0.94, 0.038, 14, 56);
    const innerRing = new THREE.Mesh(innerRingGeo, goldMat);
    innerRing.position.y = 0.25;
    innerRing.rotation.y = Math.PI * 0.35;
    innerRing.rotation.x = -Math.PI * 0.25;
    heroGroup.add(innerRing);
    disposables.push(innerRingGeo);

    // 5. Orbiting crown spikes / satellites (6 parts)
    const spikeGeo = new THREE.ConeGeometry(0.11, 0.32, 6);
    const satellitesGroup = new THREE.Group();
    satellitesGroup.position.y = 0.25;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(spikeGeo, goldMat);
      spike.position.set(Math.cos(angle) * 1.18, Math.sin(angle) * 1.18, 0);
      spike.rotation.z = angle - Math.PI / 2;
      satellitesGroup.add(spike);
    }
    satellitesGroup.rotation.x = Math.PI * 0.28;
    heroGroup.add(satellitesGroup);
    disposables.push(spikeGeo);

    // Instanced golden spark particles bursting across the viewport
    const particleCount = isLuxury ? 160 : 90;
    const sparkGeo = new THREE.OctahedronGeometry(0.055, 0);
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: primaryHex,
      emissiveIntensity: 0.85,
      metalness: 0.6,
      roughness: 0.25,
    });
    const sparks = new THREE.InstancedMesh(sparkGeo, sparkMat, particleCount);
    sparks.frustumCulled = false;
    scene.add(sparks);
    disposables.push(sparkGeo, sparkMat);

    const particleSeeds = Array.from({ length: particleCount }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 1.3 + Math.random() * 2.6;
      const scale = 0.55 + Math.random() * 1.1;
      const tint = i % 3 === 0 ? accentHex : i % 3 === 1 ? primaryHex : 0xffffff;
      _color.setHex(tint);
      sparks.setColorAt(i, _color);
      return {
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed * 0.8 + 0.6,
        vz: Math.cos(phi) * speed * 0.6,
        spin: (Math.random() - 0.5) * 5,
        scale,
        phase: Math.random() * Math.PI * 2,
      };
    });
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Exponentially damped scale entrance
      const targetScale = elapsed < 0.35 ? 1.16 : 0.95;
      const curScale = heroGroup.scale.x;
      const nextScale = THREE.MathUtils.damp(curScale || 0.2, targetScale, 8, dt);
      heroGroup.scale.setScalar(nextScale);
      heroGroup.rotation.y += dt * 1.15;
      heroGroup.position.y = 0.55 + Math.sin(elapsed * 2.4) * 0.1;

      gemMesh.rotation.y -= dt * 1.8;
      outerRing.rotation.z += dt * 0.9;
      innerRing.rotation.z -= dt * 1.3;
      satellitesGroup.rotation.z += dt * 0.9;

      // Update spark burst particles
      const t = elapsed % 3.2;
      for (let i = 0; i < particleCount; i++) {
        const s = particleSeeds[i];
        const life = (t + (i % 7) * 0.08) % 3.2;
        const px = s.vx * life * 0.85;
        const py = s.vy * life * 0.85 - 0.32 * life * life;
        const pz = s.vz * life * 0.85;
        const fade = Math.max(0, 1 - life / 3.0);

        _dummy.position.set(px, py, pz);
        _dummy.rotation.set(elapsed * s.spin, elapsed * s.spin * 0.7, s.phase);
        _dummy.scale.setScalar(s.scale * fade);
        _dummy.updateMatrix();
        sparks.setMatrixAt(i, _dummy.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      for (const d of disposables) {
        d.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [giftEvent?.id, reducedMotion]);

  if (!giftEvent) return null;

  const showVideoStage = Boolean(giftEvent.videoUrl && !videoFailed);
  const tierColors =
    giftEvent.tier === 'luxury'
      ? {
          border: 'border-[#E5B84B]/60',
          accent: 'text-[#E5B84B]',
          glow: 'shadow-[0_0_40px_rgba(229,184,75,0.35)]',
          badgeBg: 'bg-[#E5B84B]/15',
          bar: 'bg-gradient-to-r from-[#E5B84B] to-amber-300',
          label: 'Lyuks 3D Effekt',
        }
      : giftEvent.tier === 'premium'
      ? {
          border: 'border-purple-400/60',
          accent: 'text-purple-300',
          glow: 'shadow-[0_0_40px_rgba(168,85,247,0.35)]',
          badgeBg: 'bg-purple-500/20',
          bar: 'bg-gradient-to-r from-purple-500 to-pink-400',
          label: 'Premium 3D Effekt',
        }
      : {
          border: 'border-sky-400/55',
          accent: 'text-sky-300',
          glow: 'shadow-[0_0_32px_rgba(56,189,248,0.3)]',
          badgeBg: 'bg-sky-500/20',
          bar: 'bg-gradient-to-r from-blue-500 to-sky-300',
          label: 'Sovg‘a Effekti',
        };

  const durationMs = showVideoStage ? 16500 : 5200;

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 animate-backdrop-fade-in"
      style={{ backgroundColor: 'rgba(6, 9, 18, 0.86)' }}
      role="dialog"
      aria-label="Sovg'a effekti"
    >
      {/* Isolated Three.js 3D Canvas Layer */}
      {!reducedMotion && !webglUnavailable && (
        <div
          ref={mountRef}
          className="pointer-events-none absolute inset-0 w-full h-full overflow-hidden"
        />
      )}

      {/* Top Controls (Solid / rgba surface — no backdrop-filter over WebGL) */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between gap-3 mb-3">
        <div
          className={`px-3.5 py-2 rounded-xl border ${tierColors.border} flex items-center gap-2 text-xs font-semibold ${tierColors.accent}`}
          style={{ backgroundColor: 'rgba(15, 21, 36, 0.92)' }}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{showVideoStage ? '3D + Video Effekt' : tierColors.label}</span>
          {queueCount > 0 && (
            <span className="font-mono tabular-nums text-white/80">
              · +{queueCount} navbatda
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showVideoStage && (
            <button
              type="button"
              onClick={toggleMute}
              className="min-h-[40px] px-3 rounded-xl border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(15, 21, 36, 0.92)' }}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-amber-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isMuted ? 'Ovozni yoqish' : 'Ovozli'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[40px] min-w-[40px] rounded-xl border border-white/15 text-slate-200 hover:text-white flex items-center justify-center"
            style={{ backgroundColor: 'rgba(15, 21, 36, 0.92)' }}
            aria-label={queueCount > 0 ? 'Keyingi effektga o‘tish' : 'Effektni yopish'}
            title={queueCount > 0 ? 'Keyingi effekt' : 'Yopish'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Phase 1: Automatic Gift Throw Launch Trajectory -> Shockwave */}
      {phase === 'launching' ? (
        <div className="relative z-10 w-full max-w-sm h-72 flex items-center justify-center pointer-events-none">
          <div
            className={`absolute w-32 h-32 rounded-full border-2 ${tierColors.border} animate-gift-shockwave`}
          />
          <div
            className={`animate-gift-throw w-24 h-24 rounded-3xl border-2 ${tierColors.border} ${tierColors.badgeBg} ${tierColors.accent} ${tierColors.glow} flex flex-col items-center justify-center gap-1`}
            style={{ backgroundColor: 'rgba(12, 16, 30, 0.95)' }}
          >
            {renderGiftIcon(giftEvent.giftIcon, 'w-11 h-11')}
            {giftEvent.quantity > 1 && (
              <span className="text-[11px] font-mono font-bold text-white">
                {giftEvent.quantity}×
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Phase 2: Full Effect Stage */
        <div
          key={giftEvent.id}
          className="relative z-10 w-full max-w-sm flex flex-col items-center animate-gift-reveal"
        >
          {showVideoStage ? (
            <div
              className="w-full rounded-3xl border border-[#E5B84B]/65 overflow-hidden shadow-2xl p-3"
              style={{ backgroundColor: 'rgba(12, 16, 30, 0.92)' }}
            >
              <div className="w-full max-h-[54vh] min-h-[240px] rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={giftEvent.videoUrl}
                  autoPlay
                  playsInline
                  onEnded={onDismiss}
                  onError={() => setVideoFailed(true)}
                  className="w-full max-h-[54vh] object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="h-52 sm:h-60 w-full pointer-events-none flex flex-col items-center justify-end pb-2">
              {/* Gift Icon & Sender -> Receiver Visual Trajectory Stage */}
              <div className="relative flex flex-col items-center gap-3">
                {(reducedMotion || webglUnavailable) && (
                  <div
                    className={`w-28 h-28 rounded-3xl border-2 ${tierColors.border} ${tierColors.glow} flex items-center justify-center relative`}
                    style={{ backgroundColor: 'rgba(15, 21, 36, 0.94)' }}
                  >
                    <div className={tierColors.accent}>
                      {renderGiftIcon(giftEvent.giftIcon, 'w-12 h-12')}
                    </div>
                  </div>
                )}

                {!reducedMotion && !webglUnavailable && (
                  <div
                    className={`w-16 h-16 rounded-2xl border ${tierColors.border} ${tierColors.glow} flex items-center justify-center ${tierColors.accent}`}
                    style={{ backgroundColor: 'rgba(12, 16, 30, 0.9)' }}
                  >
                    {renderGiftIcon(giftEvent.giftIcon, 'w-8 h-8')}
                  </div>
                )}

                {/* Sender -> Receiver Link */}
                <div
                  className="px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-2.5"
                  style={{ backgroundColor: 'rgba(15, 21, 36, 0.9)' }}
                >
                  {giftEvent.senderAvatar ? (
                    <img
                      src={giftEvent.senderAvatar}
                      alt={giftEvent.senderNickname}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
                      {giftEvent.senderNickname.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <ArrowRight className={`w-4 h-4 ${tierColors.accent}`} />
                  {giftEvent.receiverAvatar ? (
                    <img
                      src={giftEvent.receiverAvatar}
                      alt={giftEvent.receiverNickname}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-[#E5B84B]/60"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#E5B84B]/20 border border-[#E5B84B]/50 flex items-center justify-center text-xs font-bold text-[#FDE68A]">
                      {giftEvent.receiverNickname.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gift Celebration Caption Card + Compositor Progress Countdown */}
          <div
            className={`mt-4 w-full rounded-2xl border ${tierColors.border} p-4 text-center shadow-2xl overflow-hidden`}
            style={{ backgroundColor: 'rgba(15, 21, 36, 0.94)' }}
          >
            <div className={`font-display text-lg font-bold ${tierColors.accent}`}>
              {giftEvent.giftName} · {giftEvent.quantity}×
            </div>
            <div className="text-sm text-white font-medium mt-1">
              {giftEvent.senderNickname} → {giftEvent.receiverNickname}
            </div>
            <div className="text-xs font-mono tabular-nums text-amber-300 mt-1">
              {formatCoins(giftEvent.totalCoins)} Tanga
              {giftEvent.isWeddingBonus ? ' · To‘y 1.1× bonus' : ''}
            </div>

            <div className="mt-3 h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                key={`prog-${giftEvent.id}-${showVideoStage ? 'v' : '3d'}`}
                className={`h-full w-full ${tierColors.bar} animate-gift-progress`}
                style={{ '--gift-duration': `${durationMs}ms` } as React.CSSProperties}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
