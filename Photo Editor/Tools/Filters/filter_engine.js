/**
 * Visuals Photo Editor - Filter Engine Module
 * Selection-aware, stack-capable filter processing.
 */
const FilterEngine = {
    registry: {},
    pixelBuffer: { r: 0, g: 0, b: 0 },

    register(id, filterModule) {
        this.registry[id] = filterModule;
    },

    normalize(filter) {
        if (!filter || !filter.type || filter.type === 'none') {
            return null;
        }

        const intensity = Number(filter.intensity);

        if (!Number.isFinite(intensity) || intensity <= 0) {
            return null;
        }

        return {
            type: filter.type,
            intensity: Math.min(100, Math.max(0, intensity))
        };
    },

    cloneFilter(filter) {
        const normalized = this.normalize(filter);
        return normalized ? { type: normalized.type, intensity: normalized.intensity } : null;
    },

    sameFilter(a, b) {
        const fa = this.normalize(a);
        const fb = this.normalize(b);
        if (!fa && !fb) return true;
        if (!fa || !fb) return false;
        return fa.type === fb.type && fa.intensity === fb.intensity;
    },

    process(imageData, filterType, intensity) {
        if (!imageData || !filterType || filterType === 'none' || intensity === 0) {
            return imageData;
        }

        const filter = this.registry[filterType];
        if (!filter) {
            console.warn(`Filter profile '${filterType}' is not registered.`);
            return imageData;
        }

        const factor = Math.min(1, Math.max(0, Number(intensity) / 100));
        if (factor === 0) return imageData;

        if (typeof filter.processBulk === 'function') {
            return filter.processBulk(imageData, factor);
        }

        const data = imageData.data;
        const len = data.length;
        const applyPixel = filter.applyPixel;
        const buf = this.pixelBuffer;

        for (let i = 0; i < len; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            applyPixel(r, g, b, buf);

            data[i] = Math.min(255, Math.max(0, (buf.r * factor) + (r * (1 - factor))));
            data[i + 1] = Math.min(255, Math.max(0, (buf.g * factor) + (g * (1 - factor))));
            data[i + 2] = Math.min(255, Math.max(0, (buf.b * factor) + (b * (1 - factor))));
        }

        return imageData;
    },

    processStack(imageData, filterStack) {
        if (!imageData || !Array.isArray(filterStack) || filterStack.length === 0) {
            return imageData;
        }

        for (const filter of filterStack) {
            const normalized = this.normalize(filter);
            if (!normalized) continue;
            this.process(imageData, normalized.type, normalized.intensity);
        }

        return imageData;
    },

applyMasked(imageData, filter, mask) {
    if (!imageData || !mask) return imageData;

    const normalized = this.normalize(filter);
    if (!normalized) return imageData;

    const filtered = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
    );

    this.process(filtered, normalized.type, normalized.intensity);

    const source = imageData.data;
    const result = filtered.data;
    const maskData = mask.data || mask;
    const pixelCount = imageData.width * imageData.height;
    const maskIsRGBA = maskData.length >= pixelCount * 4;

    for (let p = 0; p < pixelCount; p++) {
        const i = p * 4;
        const maskValue = maskIsRGBA ? maskData[i + 3] : maskData[p];
        const alpha = Math.min(1, Math.max(0, Number(maskValue) / 255));

        if (alpha <= 0) continue;

        source[i] = Math.round(source[i] * (1 - alpha) + result[i] * alpha);
        source[i + 1] = Math.round(source[i + 1] * (1 - alpha) + result[i + 1] * alpha);
        source[i + 2] = Math.round(source[i + 2] * (1 - alpha) + result[i + 2] * alpha);
    }

    return imageData;
},

applyMaskedStack(imageData, filterStack, mask) {
    if (!imageData || !Array.isArray(filterStack) || filterStack.length === 0 || !mask) {
        return imageData;
    }

    for (const filter of filterStack) {
        const normalized = this.normalize(filter);
        if (!normalized) continue;
        this.applyMasked(imageData, normalized, mask);
    }

    return imageData;
},

mergeStacks(globalStack, localStack) {
    const merged = Array.isArray(globalStack)
        ? globalStack.map(filter => this.cloneFilter(filter)).filter(Boolean)
        : [];

    const locals = Array.isArray(localStack)
        ? localStack
        : [localStack];

    locals.forEach(localFilter => {
        const local = this.normalize(localFilter);

        if (!local) return;

        const sameIndex = merged.findIndex(
            filter => filter.type === local.type
        );

        if (sameIndex !== -1) {
            merged[sameIndex] = local;
        } else {
            merged.push(local);
        }
    });

    return merged;
}

};

window.FilterEngine = FilterEngine;