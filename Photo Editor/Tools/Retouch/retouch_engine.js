/**
 * Visuals Photo Editor - Retouch Processing Engine
 */

const RetouchEngine = {
    isActive: false,
    currentTool: 'spot', // spot, clone, heal, smooth
    isDrawing: false,
    isSamplingMode: false, // True when user is clicking canvas to capture standard reference points

    mainCanvas: null,
    mainCtx: null,
    backupCanvas: null, // Historical restoration layer

    settings: {
        brushSize: 20,
        hardness: 0.2,
        opacity: 1.0,
        smoothIntensity: 50
    },

    // Reference vector points transformations storage
    sourcePoint: { x: 100, y: 100 }, 

    activate: function() {
        this.mainCanvas = document.getElementById('editorCanvas');
        if (!this.mainCanvas) return;
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.isActive = true;

        // Take non-destructive snapshot buffer
        this.backupCanvas = document.createElement('canvas');
        this.backupCanvas.width = this.mainCanvas.width;
        this.backupCanvas.height = this.mainCanvas.height;
        this.backupCanvas.getContext('2d').drawImage(this.mainCanvas, 0, 0);

        this.attachCanvasListeners();
    },

    setToolType: function(tool) {
        this.currentTool = tool;
        this.isSamplingMode = false; // Reset selection state on tool swap
    },

    toggleSamplingMode: function() {
        const btn = document.getElementById('setSourceModeBtn');
        this.isSamplingMode = !this.isSamplingMode;
        
        if (this.isSamplingMode) {
            btn.innerHTML = `<i class="fa fa-dot-circle-o"></i> Click Canvas to Capture...`;
            btn.style.color = '#00adb5';
        } else {
            btn.innerHTML = `<i class="fa fa-crosshairs"></i> Set Source Location`;
            btn.style.color = '#ff9f43';
        }
    },

    attachCanvasListeners: function() {
        this.mainCanvas.addEventListener('mousedown', this.onStart.bind(this));
        this.mainCanvas.addEventListener('mousemove', this.onMove.bind(this));
        window.addEventListener('mouseup', this.onEnd.bind(this));
    },

    getCoordinates: function(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * this.mainCanvas.width,
            y: ((e.clientY - rect.top) / rect.height) * this.mainCanvas.height
        };
    },

    onStart: function(e) {
        if (!this.isActive) return;
        const coords = this.getCoordinates(e);

        // If user is defining a relative clean reference source point (Clone/Heal Brush)
        if (this.isSamplingMode) {
            this.sourcePoint = coords;
            this.toggleSamplingMode(); // Exit selection mode automatically once captured
            return;
        }

        this.isDrawing = true;
        this.processRetouchStroke(coords.x, coords.y);
    },

    onMove: function(e) {
        if (!this.isActive || !this.isDrawing) return;
        const coords = this.getCoordinates(e);
        this.processRetouchStroke(coords.x, coords.y);
    },

    onEnd: function() {
        this.isDrawing = false;
    },

    processRetouchStroke: function(targetX, targetY) {
        this.mainCtx.save();
        
        if (this.currentTool === 'clone') {
            // Calculate distance offset between source anchor point and target point
            const offsetX = this.sourcePoint.x - targetX;
            const offsetY = this.sourcePoint.y - targetY;

            // Pattern stamp execution clipping wrapper
            this.mainCtx.beginPath();
            this.mainCtx.arc(targetX, targetY, this.settings.brushSize, 0, Math.PI * 2);
            this.mainCtx.clip();

            this.mainCtx.globalAlpha = this.settings.opacity;
            // Draw original pixel snapshot shifted by the distance vector offset
            this.mainCtx.drawImage(this.backupCanvas, -offsetX, -offsetY);

        } else if (this.currentTool === 'spot') {
            // Intelligent Spot Healing: Blends texture directly from the outer circle rim inward
            this.mainCtx.beginPath();
            this.mainCtx.arc(targetX, targetY, this.settings.settings ?? this.settings.brushSize, 0, Math.PI * 2);
            this.mainCtx.clip();

            // Blends surrounding color using high feather composites values
            this.mainCtx.globalAlpha = 0.15; 
            this.mainCtx.drawImage(this.backupCanvas, targetX + 4, targetY, this.settings.brushSize, this.settings.brushSize, targetX, targetY, this.settings.brushSize, this.settings.brushSize);
            
        } else if (this.currentTool === 'smooth') {
            // Local Soften / Skin Smooth filter
            this.mainCtx.beginPath();
            this.mainCtx.arc(targetX, targetY, this.settings.brushSize, 0, Math.PI * 2);
            this.mainCtx.clip();

            this.mainCtx.filter = `blur(${this.settings.smoothIntensity / 15}px)`;
            this.mainCtx.drawImage(this.backupCanvas, 0, 0);
        }

        this.mainCtx.restore();
    },

    deactivate: function(applyChanges) {
        this.isActive = false;
        this.isDrawing = false;
        
        if (!applyChanges) {
            // Discard: Clear modifications back to safe historical trace backup snapshot
            this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
            this.mainCtx.drawImage(this.backupCanvas, 0, 0);
        } else {
            // Save: Save the newly adjusted image data array into LayerManager stack history
            if (window.LayerManager && typeof LayerManager.saveState === 'function') {
                LayerManager.saveState();
            }
        }
        this.backupCanvas = null;
    }
};