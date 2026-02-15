import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("three/examples"))
                            return "three-examples";
                        if (id.includes("three")) return "three";
                        if (id.includes("@react-three")) return "r3f";
                        if (id.includes("react")) return "react-vendor";
                        return "vendor";
                    }
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
});
