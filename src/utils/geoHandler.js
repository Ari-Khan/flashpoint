self.onmessage = async (e) => {
    const { shardData, activeCountryIds } = e.data;

    try {
        const features = [];
        const isActiveFilterEnabled =
            activeCountryIds && activeCountryIds.length > 0;
        const activeSet = isActiveFilterEnabled
            ? new Set(activeCountryIds)
            : null;

        for (const json of shardData) {
            const shardFeatures = json.features;
            if (!shardFeatures) continue;

            for (const feature of shardFeatures) {
                if (!isActiveFilterEnabled) {
                    features.push(feature);
                    continue;
                }

                const id = feature.id || feature.properties?.ISO_A3;
                if (activeSet.has(id)) {
                    features.push(feature);
                }
            }
        }

        self.postMessage({
            success: true,
            data: { type: "FeatureCollection", features },
        });
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};
