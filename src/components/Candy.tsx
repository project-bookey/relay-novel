import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, View, StyleSheet } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import * as THREE from "three";
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Path,
  Ellipse,
} from "react-native-svg";
import { candyColors } from "../theme";

export function Candy({
  color = candyColors[0],
  size = 120,
}: {
  color?: string;
  size?: number;
}) {
  const id = useRef(`candy-${Math.random().toString(36).slice(2)}`).current;
  const points = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12,
      r = i % 2 ? 31 : 47;
    return { x: 60 + Math.cos(a) * r, y: 55 + Math.sin(a) * r };
  });
  const path =
    points
      .map((p, i) => {
        const next = points[(i + 1) % 24];
        return `${i ? "" : "M " + (p.x + points[23].x) / 2 + " " + (p.y + points[23].y) / 2 + " "}Q ${p.x} ${p.y} ${(p.x + next.x) / 2} ${(p.y + next.y) / 2}`;
      })
      .join(" ") + " Z";
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id={id} cx="32%" cy="25%" rx="80%" ry="80%">
          <Stop offset="0%" stopColor="#fff" />
          <Stop offset="35%" stopColor={color} />
          <Stop offset="85%" stopColor={color} />
          <Stop offset="100%" stopColor="#726781" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="62" cy="108" rx="27" ry="5" fill={color} opacity={0.15} />
      <Path d={path} fill={`url(#${id})`} />
      <Ellipse cx="43" cy="38" rx="8" ry="12" fill="#fff" opacity={0.25} />
    </Svg>
  );
}

export function CandyUniverse() {
  const dispose = useRef<(() => void) | null>(null),
    mounted = useRef(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      dispose.current?.();
    };
  }, []);
  async function create(gl: ExpoWebGLRenderingContext) {
    const reduced = await AccessibilityInfo.isReduceMotionEnabled();
    if (!mounted.current) return;
    try {
      const canvas = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        style: {},
        addEventListener() {},
        removeEventListener() {},
        setAttribute() {},
        getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas as unknown as HTMLCanvasElement,
        context: gl as unknown as WebGLRenderingContext,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.setClearColor(0xf8f7f2, 1);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(
          35,
          gl.drawingBufferWidth / gl.drawingBufferHeight,
          0.1,
          50,
        );
      camera.position.z = 9;
      scene.add(new THREE.HemisphereLight("#ffffff", "#baabae", 2.7));
      const light = new THREE.DirectionalLight("#fff9ec", 4);
      light.position.set(-3, 4, 5);
      scene.add(light);
      const geometry = new THREE.SphereGeometry(1, 48, 32),
        pos = geometry.attributes.position,
        point = new THREE.Vector3();
      const bumps = Array.from({ length: 19 }, (_, i) => {
        const y = 1 - (2 * (i + 0.5)) / 19,
          a = i * Math.PI * (3 - Math.sqrt(5));
        return new THREE.Vector3(
          Math.cos(a) * Math.sqrt(1 - y * y),
          y,
          Math.sin(a) * Math.sqrt(1 - y * y),
        );
      });
      for (let i = 0; i < pos.count; i++) {
        point.fromBufferAttribute(pos, i).normalize();
        const bump = Math.max(
          ...bumps.map((d) => Math.pow(Math.max(0, point.dot(d)), 40)),
        );
        point.multiplyScalar(0.8 + 0.44 * bump);
        pos.setXYZ(i, point.x, point.y, point.z);
      }
      geometry.computeVertexNormals();
      const specs = [
        [0, 0, 0, 1.1],
        [1.65, 0.9, -0.8, 0.64],
        [-1.65, -0.7, -0.5, 0.65],
        [-1.9, 1.2, -1, 0.31],
        [1.85, -1.1, -1, 0.33],
      ];
      const candies = specs.map(([x, y, z, s], i) => {
        const material = new THREE.MeshPhysicalMaterial({
          color: candyColors[i],
          roughness: 0.3,
          clearcoat: 0.55,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(s);
        mesh.rotation.set(i * 0.5, i * 0.9, 0.3);
        scene.add(mesh);
        return { mesh, material, y };
      });
      let frame = 0,
        disposed = false;
      const start = Date.now();
      const render = () => {
        if (disposed) return;
        const t = (Date.now() - start) / 1000;
        candies.forEach(({ mesh, y }, i) => {
          if (!reduced) {
            mesh.rotation.y = t * 0.14 + i;
            mesh.position.y = y + Math.sin(t * 0.65 + i) * 0.08;
          }
        });
        renderer.render(scene, camera);
        gl.endFrameEXP();
        if (!reduced && AppState.currentState === "active")
          frame = requestAnimationFrame(render);
      };
      const listener = AppState.addEventListener("change", (state) => {
        cancelAnimationFrame(frame);
        if (state === "active") render();
      });
      dispose.current = () => {
        disposed = true;
        cancelAnimationFrame(frame);
        listener.remove();
        geometry.dispose();
        candies.forEach((c) => c.material.dispose());
        renderer.dispose();
      };
      render();
    } catch {
      if (mounted.current) setFailed(true);
    }
  }
  return (
    <View style={styles.universe} accessible={false}>
      {failed ? (
        <View style={styles.fallback}>
          <Candy size={190} />
          <View style={styles.small}>
            <Candy color={candyColors[1]} size={90} />
          </View>
        </View>
      ) : (
        <GLView
          style={StyleSheet.absoluteFill}
          onContextCreate={(gl) => {
            void create(gl);
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  universe: { height: 220, width: "100%" },
  fallback: { alignItems: "center", justifyContent: "center", height: 220 },
  small: { position: "absolute", right: 30, top: 12 },
});
