/**
 * Visuals Photo Editor - Retouch Sub-Divided Tool Manager
 */

const RetouchManager = {
    currentToolType: 'spot', // 'spot', 'clone', 'heal', 'smooth'
    
    init: function() {
        this.cacheDOM();
        this.bindEvents();
    },

    cacheDOM: function() {
        // Main Trigger Input Entry Point
        this.retouchBtn = document.getElementById('retouchBtn');

        // Main Layout wrappers
        this.panel = document.getElementById('retouchPanel');
        this.galleryButtons = document.querySelectorAll('#retouchGallery .gallery-item-btn');
        this.controlGroups = document.querySelectorAll('.retouch-control-group');
        this.modeLabel = document.getElementById('retouchModeLabel');

        // Property Trackers
        this.brushSizeSlider = document.getElementById('retouchBrushSize');
        this.brushSizeVal = document.getElementById('retouchBrushSizeVal');
        this.hardnessSlider = document.getElementById('retouchHardness');
        this.hardnessVal = document.getElementById('retouchHardnessVal');
        this.sourceOpacitySlider = document.getElementById('retouchSourceOpacity');
        this.sourceOpacityVal = document.getElementById('sourceOpacityVal');
        this.smoothBlurSlider = document.getElementById('retouchSmoothBlur');
        this.smoothBlurVal = document.getElementById('smoothBlurVal');

        // Sampling State Toggle Button
        this.sourceSelectBtn = document.getElementById('setSourceModeBtn');

        // Execution buttons
        this.confirmBtn = document.getElementById('confirmRetouchBtn');
        this.discardBtn = document.getElementById('discardRetouchBtn');
    },

    bindEvents: function() {
        // Handle global entry toggle assignment switch
        if (this.retouchBtn) {
            this.retouchBtn.addEventListener('click', () => {
                if (this.panel.style.display === 'flex') {
                    this.closePanel(false);
                } else {
                    this.openPanel();
                }
            });
        }

        // Sub-Divided Module Gallery Selector Switching
        this.galleryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSubTool(e.currentTarget));
        });

        // Listeners for Sliders mapping parameters straight into engine state 
        this.brushSizeSlider.addEventListener('input', (e) => {
            this.brushSizeVal.innerText = `${e.target.value} px`;
            RetouchEngine.settings.brushSize = parseInt(e.target.value);
        });

        this.hardnessSlider.addEventListener('input', (e) => {
            this.hardnessVal.innerText = `${e.target.value}%`;
            RetouchEngine.settings.hardness = parseInt(e.target.value) / 100;
        });

        this.sourceOpacitySlider.addEventListener('input', (e) => {
            this.sourceOpacityVal.innerText = `${e.target.value}%`;
            RetouchEngine.settings.opacity = parseInt(e.target.value) / 100;
        });

        this.smoothBlurSlider.addEventListener('input', (e) => {
            this.smoothBlurVal.innerText = `${e.target.value}%`;
            RetouchEngine.settings.smoothIntensity = parseInt(e.target.value);
        });

        // Manual Target Sourcing Selector Trigger
        this.sourceSelectBtn.addEventListener('click', () => {
            RetouchEngine.toggleSamplingMode();
        });

        // End Panel Commits
        this.confirmBtn.addEventListener('click', () => this.closePanel(true));
        this.discardBtn.addEventListener('click', () => this.closePanel(false));
    },

    switchSubTool: function(selectedBtn) {
        // Clear old gallery selection visual styling states
        this.galleryButtons.forEach(btn => {
            btn.classList.remove('active-retouch-btn');
            btn.style.color = '#aaa';
            if(btn.querySelector('i')) btn.querySelector('i').style.color = '';
        });

        // Inject highlighted accent state features
        selectedBtn.classList.add('active-retouch-btn');
        selectedBtn.style.color = 'white';
        if(selectedBtn.querySelector('i')) selectedBtn.querySelector('i').style.color = '#00adb5';

        // Toggle visibility of the inner property sliders groups matching the button's data-target attribute
        const targetGroup = selectedBtn.getAttribute('data-target');
        this.controlGroups.forEach(group => {
            group.style.display = group.id === targetGroup ? 'block' : 'none';
        });

        // Assign settings states
        if (selectedBtn.id === 'spotHealBtn') { this.currentToolType = 'spot'; this.modeLabel.innerText = "Spot Heal"; }
        if (selectedBtn.id === 'cloneStampBtn') { this.currentToolType = 'clone'; this.modeLabel.innerText = "Clone Stamp"; }
        if (selectedBtn.id === 'healingBrushBtn') { this.currentToolType = 'heal'; this.modeLabel.innerText = "Healing Brush"; }
        if (selectedBtn.id === 'skinSmoothBtn') { this.currentToolType = 'smooth'; this.modeLabel.innerText = "Skin Smooth"; }

        // Reset text on the sampling button if changing tools
        this.sourceSelectBtn.innerHTML = `<i class="fa fa-crosshairs"></i> Set Source Location`;
        this.sourceSelectBtn.style.color = '#ff9f43';

        RetouchEngine.setToolType(this.currentToolType);
    },

    openPanel: function() {
        this.panel.style.display = 'flex';
        RetouchEngine.activate();
    },

    closePanel: function(applyChanges) {
        this.panel.style.display = 'none';
        RetouchEngine.deactivate(applyChanges);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    RetouchManager.init();
});