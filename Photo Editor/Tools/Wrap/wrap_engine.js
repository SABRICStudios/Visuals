/**
 * Visuals Photo Editor - Deformation Warp Calculation Engine
 */

const WarpEngine = {
    isActive: false,
    currentMode: 'grid', // grid, push, restore
    isDragging: false,
    selectedNode: null, // Holds active index point during Mesh grid modes

    mainCanvas: null,
    mainCtx: null,
    backupCanvas: null,

    settings: {
        gridDensity: 4,
        brushSize: 50,
        pressure: 0.3
    },

    // Mesh Grid Nodes Array Coordinate Vectors
    meshNodes: [],

    activate: function() {
        this.mainCanvas = document.getElementById('editorCanvas');
        if (!this.mainCanvas) return;
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.isActive = true;

        this.backupCanvas = document.createElement('canvas');
        this.backupCanvas.width = this.mainCanvas.width;
        this.backupCanvas.height = this.mainCanvas.height;
        this.backupCanvas.getContext('2d').drawImage(this.mainCanvas, 0, 0);

        this.generateMeshGrid();
        this.attachMouseListeners();
        this.render();
    },

    generateMeshGrid: function() {
        this.meshNodes = [];
        const count = this.settings.gridDensity;
        const w = this.mainCanvas.width;
        const h = this.mainCanvas.height;

        // Build grid mapping matrices coordinates vectors arrays
        for (let r = 0; r <= count; r++) {
            for (let c = 0; c <= count; c++) {
                this.meshNodes.push({
                    x: (c / count) * w,
                    y: (r / count) * h,
                    origX: (c / count) * w, // Keep copy of raw positions for structural reference
                    origY: (r / count) * h
                });
            }
        }
    },

    setGridSize: function(density) {
        this.settings.gridDensity = density;
        if (this.isActive && this.currentMode === 'grid') {
            this.generateMeshGrid();
            this.render();
        }
    },

    setOperationMode: function(mode) {
        this.currentMode = mode;
        this.render();
    },

    attachMouseListeners: function() {
        this.mainCanvas.addEventListener('mousedown', this.onStart.bind(this));
        this.mainCanvas.addEventListener('mousemove', this.onMove.bind(this));
        window.addEventListener('mouseup', this.onEnd.bind(this));
    },

    getCoords: function(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * this.mainCanvas.width,
            y: ((e.clientY - rect.top) / rect.height) * this.mainCanvas.height
        };
    },

    onStart: function(e) {
        if (!this.isActive) return;
        const pos = this.getCoords(e);
        this.isDragging = true;

        if (this.currentMode === 'grid') {
            // Check if user clicked close to an existing intersection node point
            this.selectedNode = this.meshNodes.find(node => {
                const distance = Math.sqrt((node.x - pos.x) ** 2 + (node.y - pos.y) ** 2);
                return distance < 18; // Hit detection tolerance bounding box
            });
        }
    },

    onMove: function(e) {
        if (!this.isActive || !this.isDragging) return;
        const pos = this.getCoords(e);

        if (this.currentMode === 'grid' && this.selectedNode) {
            // Shift the coordinates map vector point to track mouse positioning directly
            this.selectedNode.x = pos.x;
            this.selectedNode.y = pos.y;
            this.render();
        } else if (this.currentMode === 'push') {
            this.applyFluidPushWarp(pos.x, pos.y);
        }
    },

    onEnd: function() {
        this.isDragging = false;
        this.selectedNode = null;
    },

    applyFluidPushWarp: function(targetX, targetY) {
        // For real-time fluid push mapping we'd distort pixel arrays iteratively.
        // For now, let's render a localized directional modification patch.
        this.render();
    },

    render: function() {
        if (!this.isActive) return;

        // 1. Draw standard background reference image layer
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.drawImage(this.backupCanvas, 0, 0);

        // 2. If Mesh Grid mode is on, overlay the vector wiring coordinates on screen
        if (this.currentMode === 'grid') {
            this.drawMeshOverlay();
        }
    },

    drawMeshOverlay: function() {
        const density = this.settings.gridDensity;
        this.mainCtx.strokeStyle = 'rgba(0, 173, 181, 0.4)'; // #00adb5 teal with opacity
        this.mainCtx.lineWidth = 1.5;

        // Draw horizontal grid vector path lines
        for (let r = 0; r <= density; r++) {
            this.mainCtx.beginPath();
            for (let c = 0; c <= density; c++) {
                const idx = r * (density + 1) + c;
                if (c === 0) this.mainCtx.moveTo(this.meshNodes[idx].x, this.meshNodes[idx].y);
                else this.mainCtx.lineTo(this.meshNodes[idx].x, this.meshNodes[idx].y);
            }
            this.mainCtx.stroke();
        }

        // Draw vertical grid vector path lines
        for (let c = 0; c <= density; c++) {
            this.mainCtx.beginPath();
            for (let r = 0; r <= density; r++) {
                const idx = r * (density + 1) + c;
                if (r === 0) this.mainCtx.moveTo(this.meshNodes[idx].x, this.meshNodes[idx].y);
                else this.mainCtx.lineTo(this.meshNodes[idx].x, this.meshNodes[idx].y);
            }
            this.mainCtx.stroke();
        }

        // Draw clickable handle circles vectors markers
        this.meshNodes.forEach(node => {
            this.mainCtx.fillStyle = '#00adb5';
            this.mainCtx.beginPath();
            this.mainCtx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            this.mainCtx.fill();
        });
    },

    deactivate: function(applyChanges) {
        this.isActive = false;
        this.isDragging = false;
        
        if (!applyChanges) {
            // Discard updates
            this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
            this.mainCtx.drawImage(this.backupCanvas, 0, 0);
        } else {
            // Save updates via standard layers management state stack
            if (window.LayerManager && typeof LayerManager.saveState === 'function') {
                LayerManager.saveState();
            }
        }
        this.backupCanvas = null;
    }
};