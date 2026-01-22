import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Globe from "../components/Globe";
import "./index.css";
import CountryBorders from "../components/CountryBorders";

export default function App() {
  return (
    <div className="app-container">
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 0, 2], fov: 65 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} />

        <CountryBorders />
        <Globe />

        <OrbitControls enableZoom minDistance={1.2} maxDistance={4} />
      </Canvas>
    </div>
  );
}
