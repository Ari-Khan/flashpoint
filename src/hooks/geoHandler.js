self.onmessage = async (e) => {
    const { shardData, activeCountryIds } = e.data;
    
    try {
        const features = [];
        for (const json of shardData) {
            if (json.features) {
                for (const feature of json.features) {
                    const id = feature.id || feature.properties?.ISO_A3;
                    if (activeCountryIds.length === 0 || activeCountryIds.includes(id)) {
                        features.push(feature);
                    }
                }
            }
        }

        const merged = { type: "FeatureCollection", features };
        self.postMessage({ success: true, data: merged });
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};