/**
 * Visuals Photo Editor - Color Grading Math Engine
 * Performs luminosity zone extraction and real-time pixel color mathematical injection.
 */

let gradingCanvasCtx = null;
let gradingMainCanvas = null;
let gradingBackupSnapshot = null;

/**
 * Initializes and backs up the original clean canvas state
 */
function initGradingEngine() {
    // Dynamic Fallback: Target the active pipeline buffer canvas rather than the flat layout element
    gradingMainCanvas = window.imgState?.imageXCanvas || document.getElementById('editorCanvas');
    if (!gradingMainCanvas) return;

    gradingCanvasCtx = gradingMainCanvas.getContext('2d');
    
    // Store original image frame data for pixel processing operations
    gradingBackupSnapshot = gradingCanvasCtx.getImageData(0, 0, gradingMainCanvas.width, gradingMainCanvas.height);
}

/**
 * Restores the canvas back to the clean snapshot if canceled
 */
function revertGradingChanges() {
    if (gradingCanvasCtx && gradingBackupSnapshot) {
        gradingCanvasCtx.putImageData(gradingBackupSnapshot, 0, 0);
        // Trigger a fresh redraw pass across global frames
        if (window.CanvasEditor && typeof window.CanvasEditor.redraw === "function") {
            window.CanvasEditor.redraw();
        }
    }
}

/**
 * Inline Pixel Array Adjustments Hook for Canvas Editor Pipeline Intercepts
 * Processes data directly on an in-memory buffer without destructive intermediate puts.
 */
function processColorGradingPixelData(imgData, gradingParams) {
    if (!imgData) return imgData;

    // 1. Get current active layer parameters if gradingParams wasn't passed directly
    const activeLayer = window.CanvasEditor ? window.CanvasEditor.getActiveLayer() : null;
    const grading = gradingParams || 
                    (activeLayer && activeLayer.parameters ? activeLayer.parameters.colorGrading : null) || 
                    (typeof GradingEditor !== 'undefined' ? GradingEditor : null);

    if (!grading) return imgData;

    const states = grading.states || {
        shadows:    { hue: 0, sat: 0 },
        midtones:   { hue: 0, sat: 0 },
        highlights: { hue: 0, sat: 0 }
    };
    const balance  = grading.balance  !== undefined ? grading.balance  : 0;
    const blending = grading.blending !== undefined ? grading.blending : 50;

    // Fast exit if no color grading is applied
    if (
        states.shadows.sat === 0 && 
        states.midtones.sat === 0 && 
        states.highlights.sat === 0 && 
        balance === 0
    ) {
        return imgData;
    }

    let data = imgData.data;
    const len = data.length;

    const shadowRGB    = hslToRgbOffset(states.shadows.hue, states.shadows.sat);
    const midtoneRGB   = hslToRgbOffset(states.midtones.hue, states.midtones.sat);
    const highlightRGB = hslToRgbOffset(states.highlights.hue, states.highlights.sat);

    const balanceShift = balance / 100;
    const blendRange   = Math.max(0.01, blending / 100);

    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        let luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        if (balanceShift > 0) {
            luminance = Math.pow(luminance, 1.0 - balanceShift * 0.7);
        } else if (balanceShift < 0) {
            luminance = Math.pow(luminance, 1.0 / (1.0 + balanceShift * 0.7));
        }

        let wShadow    = Math.max(0, 1 - (luminance / blendRange));
        let wHighlight = Math.max(0, 1 - ((1 - luminance) / blendRange));
        let wMidtone   = Math.max(0, 1 - wShadow - wHighlight);

        let totalWeight = wShadow + wMidtone + wHighlight;
        if (totalWeight > 0) {
            wShadow    /= totalWeight;
            wMidtone   /= totalWeight;
            wHighlight /= totalWeight;
        }

        let finalR = r + (shadowRGB.r * wShadow) + (midtoneRGB.r * wMidtone) + (highlightRGB.r * wHighlight);
        let finalG = g + (shadowRGB.g * wShadow) + (midtoneRGB.g * wMidtone) + (highlightRGB.g * wHighlight);
        let finalB = b + (shadowRGB.b * wShadow) + (midtoneRGB.b * wMidtone) + (highlightRGB.b * wHighlight);

        data[i]     = finalR > 255 ? 255 : (finalR < 0 ? 0 : finalR);
        data[i + 1] = finalG > 255 ? 255 : (finalG < 0 ? 0 : finalG);
        data[i + 2] = finalB > 255 ? 255 : (finalB < 0 ? 0 : finalB);
    }

    return imgData;
}

/**
 * Core Pixel Processing Pipeline Engine Loop (Stand-alone/Live UI Trigger Mode)
 */
function applyColorGradingEngine() {
    // If the grading workspace module is active, tell the primary engine loop to redraw the stack
    if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
        window.CanvasEditor.applyEffectsPipeline();
    } else if (gradingCanvasCtx && gradingBackupSnapshot) {
        // Fallback backward compatibility loop
        let outputImageData = gradingCanvasCtx.createImageData(gradingMainCanvas.width, gradingMainCanvas.height);
        outputImageData.data.set(gradingBackupSnapshot.data);
        outputImageData = processColorGradingPixelData(outputImageData);
        gradingCanvasCtx.putImageData(outputImageData, 0, 0);
    }
}

/**
 * Utility Helper: Converts Hue & Saturation into scaled RGB offset tints
 */
function hslToRgbOffset(h, s) {
    if (s === 0) return { r: 0, g: 0, b: 0 };
    
    let saturationNormalized = s / 100;
    let hueNormalized = h / 360;
    
    let q = 0.5; // Fixed midpoint target lightness mapping factor
    let p = 0;
    
    let rChannel = hueToRgbFactor(p, q, hueNormalized + 1/3);
    let gChannel = hueToRgbFactor(p, q, hueNormalized);
    let bChannel = hueToRgbFactor(p, q, hueNormalized - 1/3);
    
    // Scale vectors so they translate cleanly to dynamic range boosters
    const intensityScalingFactor = 65; 
    return {
        r: (rChannel - 0.25) * saturationNormalized * intensityScalingFactor,
        g: (gChannel - 0.25) * saturationNormalized * intensityScalingFactor,
        b: (bChannel - 0.25) * saturationNormalized * intensityScalingFactor
    };
}

function hueToRgbFactor(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}