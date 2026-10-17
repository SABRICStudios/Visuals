/**
 * Visuals Photo Editor - Warp Studio UI Panel Manager
 */

const WarpManager = {
    currentMode: 'grid', // 'grid', 'push', 'restore'
    
    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        // Core Entry Toggle Button Anchor
        this.warpBtn = document.getElementById('warpBtn');

        // Layout Panel Structures
        this.panel = document.getElementById('warpPanel');
        this.galleryButtons = document.querySelectorAll('#warpGallery .gallery-item-btn');
        this.controlGroups = document.querySelectorAll('.warp-control-group');
        this.modeLabel = document.getElementById('warpModeLabel');

        // Parameter Node Slider References
        this.gridSlider = document.getElementById('warpGridDensity');
        this.gridVal = document.getElementById('warpGridDensityVal');
        this.brushSlider = document.getElementById('warpBrushSize');
        this.brushVal = document.getElementById('warpBrushSizeVal');
        this.pressureSlider = document.getElementById('warpPressure');
        this.pressureVal = document.getElementById('warpPressureVal');

        // Commit Triggers
        this.confirmBtn = document.getElementById('confirmWarpBtn');
        this.discardBtn = document.getElementById('discardWarpBtn');
    },

    bindEvents: function() {
        // Handle initial panel opening configurations
        if (this.warpBtn) {
            this.warpBtn.addEventListener('click', () => {
                if (this.panel.style.display === 'flex') {
                    this.closePanel(false);
                } else {
                    this.openPanel();
                }
            });
        }

        // Sub-tool option switches
        this.galleryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.currentTarget));
        });

        // Sliders event pipelines straight to calculations mapping engine
        this.gridSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            this.gridVal.innerText = `${val} x ${val}`;
            WarpEngine.setGridSize(parseInt(val));
        });

        this.brushSlider.addEventListener('input', (e) => {
            this.brushVal.innerText = `${e.target.value} px`;
            WarpEngine.settings.brushSize = parseInt(e.target.value);
        });

        this.pressureSlider.addEventListener('input', (e) => {
            this.pressureVal.innerText = `${e.target.value}%`;
            WarpEngine.settings.pressure = parseInt(e.target.value) / 100;
        });

        this.confirmBtn.addEventListener('click', () => this.closePanel(true));
        this.discardBtn.addEventListener('click', () => this.closePanel(false));
    },

    switchMode: function(selectedBtn) {
        // Toggle item selected active highlights configurations
        this.galleryButtons.forEach(btn => {
            btn.classList.remove('active-warp-btn');
            btn.style.color = '#aaa';
            if (btn.querySelector('i')) btn.querySelector('i').style.color = '';
        });

        selectedBtn.classList.add('active-warp-btn');
        selectedBtn.style.color = 'white';
        if (selectedBtn.querySelector('i')) selectedBtn.querySelector('i').style.color = '#00adb5';

        // Swap out slider sub-panel clusters
        const targetId = selectedBtn.getAttribute('data-target');
        this.controlGroups.forEach(group => {
            group.style.display = group.id === targetId ? 'block' : 'none';
        });

        // Sync local tracking strings
        if (selectedBtn.id === 'gridWarpBtn') { this.currentMode = 'grid'; this.modeLabel.innerText = "Mesh Grid"; }
        if (selectedBtn.id === 'pushWarpBtn') { this.currentMode = 'push'; this.modeLabel.innerText = "Push Fluid"; }
        if (selectedBtn.id === 'restoreWarpBtn') { this.currentMode = 'restore'; this.modeLabel.innerText = "Restore Canvas"; }

        WarpEngine.setOperationMode(this.currentMode);
    },

    openPanel: function() {
        this.panel.style.display = 'flex';
        WarpEngine.activate();
    },

    closePanel: function(applyChanges) {
        this.panel.style.display = 'none';
        WarpEngine.deactivate(applyChanges);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    WarpManager.init();
});