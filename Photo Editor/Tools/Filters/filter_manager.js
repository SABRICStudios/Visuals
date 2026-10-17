class FilterManager {
    constructor() {
        this.filtersBtn = document.getElementById('filtersBtn');
        this.filterPanel = document.getElementById('filterPanel');
        this.filterGallery = document.getElementById('filterGallery');
        this.filterSlider = document.getElementById('filterIntensitySlider');
        this.filterLabel = document.getElementById('activeFilterLabel');
        this.confirmBtn = document.getElementById('confirmFilterBtn');
        this.discardBtn = document.getElementById('discardFilterBtn');
        this.closeBtn = document.getElementById('closeFilterBtn');
        this.mainToolBar = document.getElementById('toolbar');
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.activeFilter = 'none';
        this.intensity = 100;
        this.isLocalUpdateActive = false;
        this.isSelectionMode = false;
        this.sessionStartState = null;
        this.sessionStartStack = [];
        this.isMouseDown = false;
        this.startX = 0;
        this.scrollLeftPos = 0;
        this.isDragging = false;
        if (this.filtersBtn) this.init();
        else console.warn("Filters entry button '#filtersBtn' not found in HTML DOM.");
    }

    init() {
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => {
                    if (this.activeFilter === 'original' || this.activeFilter === 'none') {
                        // Keep the filter removed (confirm the original/none state)
                        this.confirmFilterTransaction();
                    } else {
                        // Otherwise, discard unconfirmed changes normally
                        this.discardFilterTransaction();
                    }
                });
            }

            this.filtersBtn.addEventListener('click', () => {
                if (!this.filterPanel) return;
                if (this.filterPanel.style.display === 'none' || !this.filterPanel.style.display) {
                    this.filterPanel.style.display = 'block';
                    if (this.mainToolBar) this.mainToolBar.style.display = 'none'; // Hide toolbar
                    this.openFilterSession();
                } else {
                    this.filterPanel.style.display = 'none';
                    if (this.mainToolBar) this.mainToolBar.style.display = 'flex'; // Restore toolbar
                }
                // Horizontal Mouse Wheel & Click-and-Drag handlers
        if (this.filterGallery) {
            // 1. Vertical Wheel to Horizontal Scroll
            this.filterGallery.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    this.filterGallery.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            // 2. Click & Drag Listeners
            this.filterGallery.addEventListener('mousedown', (e) => {
                this.isMouseDown = true;
                this.isDragging = false;
                this.filterGallery.style.scrollBehavior = 'auto';
                this.startX = e.pageX - this.filterGallery.offsetLeft;
                this.scrollLeftPos = this.filterGallery.scrollLeft;
            });

            this.filterGallery.addEventListener('mouseleave', () => {
                this.isMouseDown = false;
            });

            this.filterGallery.addEventListener('mouseup', () => {
                this.isMouseDown = false;
                this.filterGallery.style.scrollBehavior = 'smooth';
            });

            this.filterGallery.addEventListener('mousemove', (e) => {
                if (!this.isMouseDown) return;

                const x = e.pageX - this.filterGallery.offsetLeft;
                const walk = (x - this.startX) * 1.5;

                if (Math.abs(walk) > 5) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    e.preventDefault();
                    this.filterGallery.scrollLeft = this.scrollLeftPos - walk;
                }
            });
        }
            });

        const filterCards = document.querySelectorAll('.filter-item-btn');
        if (filterCards.length === 0) {
            console.warn("No elements matching '.filter-item-btn' found in your HTML markup.");
        }

        // WITH THIS (Prevents filter trigger when user is dragging):
// Inside FilterManager.init() where filter cards are handled:
filterCards.forEach(card => {
    card.addEventListener('click', (e) => {
        if (this.isDragging) {
            e.preventDefault();
            e.stopPropagation();
            this.isDragging = false;
            return;
        }

        this.activeFilter = card.getAttribute('data-filter') || 'none';
        this.intensity = 100;
        if (this.filterSlider) this.filterSlider.value = 100;
        this.updateSliderLabel(card);

        const intensityWrapper = document.getElementById('filterIntensityControl') || document.querySelector('.slider-group');

        // Check if selection mode is active to apply locally vs globally
        const isLocal = this.getSelectionMode();

        if (this.activeFilter === 'none' || this.activeFilter === 'original') {
            if (intensityWrapper) intensityWrapper.style.display = 'none';
            if (this.filterGallery) this.filterGallery.style.display = 'flex';
            
            // Clear only local if in selection mode, or global if outside
            this.clearFiltersForTarget(isLocal);
        } else {
            if (this.filterGallery) this.filterGallery.style.display = 'none';
            if (intensityWrapper) intensityWrapper.style.display = 'block';
            this.applyLivePreview();
        }
    });
});
        if (this.filterSlider) {
            this.filterSlider.addEventListener('input', (e) => {
                this.intensity = parseInt(e.target.value, 10);
                const matchingCard = document.querySelector(`.filter-item-btn[data-filter="${this.activeFilter}"]`);
                this.updateSliderLabel(matchingCard);
                this.applyLivePreview();
            });
        }

        if (this.confirmBtn) this.confirmBtn.addEventListener('click', () => this.confirmFilterTransaction());
        if (this.discardBtn) this.discardBtn.addEventListener('click', () => this.discardFilterTransaction());

        window.addEventListener('editorHistoryChanged', () => {
            if (this.isLocalUpdateActive) return;
            if (window.HistoryManager && !this.isSelectionMode) {
                const params = window.HistoryManager.getCurrentParameters();
                const current = params ? params.filter : null;
                if (current) {
                    this.activeFilter = current.type || 'none';
                    this.intensity = typeof current.intensity !== 'undefined' ? current.intensity : 100;
                    if (this.filterSlider) this.filterSlider.value = this.intensity;
                    const matchingCard = document.querySelector(`.filter-item-btn[data-filter="${this.activeFilter}"]`);
                    this.updateSliderLabel(matchingCard);
                }
            }
        });

        window.addEventListener('selectionToolStateChanged', (event) => {
            const detail = event && event.detail ? event.detail : {};
            const selectionOpen = !!detail.open && !!detail.processingActive;

            if (!selectionOpen) {
                this.isSelectionMode = false;
                return;
            }

            if (this.filterPanel && this.filterPanel.style.display !== 'none') {
                this.openFilterSession();
            }
        });
    }


clearFiltersForTarget(isLocal) {
    if (isLocal) {
        // Clear ONLY local selection filters
        const selectionState = this.ensureSelectionFilterState();
        selectionState.type = 'none';
        selectionState.intensity = 100;
        selectionState.stack = [];

        window.SelectionFilterState = selectionState;

        window.dispatchEvent(new CustomEvent('selectionFilterChanged', {
            detail: { state: selectionState }
        }));
    } else {
        // Clear ONLY global layer/baseline filters, explicitly preserving SelectionFilterState
        const activeLayer = window.CanvasEditor && typeof window.CanvasEditor.getActiveLayer === 'function'
            ? window.CanvasEditor.getActiveLayer()
            : null;

        if (activeLayer) {
            activeLayer.parameters = activeLayer.parameters || {};
            activeLayer.parameters.filter = {
                type: 'none',
                intensity: 100,
                stack: []
            };
        }

        if (window.BaselineFilterHistory) {
            if (typeof window.BaselineFilterHistory.clearStack === 'function') {
                window.BaselineFilterHistory.clearStack();
            }
            window.BaselineFilterHistory.updateLivePreviewValues('none', 100);
            window.BaselineFilterHistory.commitToMaster('Remove Filter');
        }

        // Ensure local selection state remains completely untouched here!
        window.dispatchEvent(new CustomEvent('editorHistoryChanged'));
    }

    // Trigger render pipeline update
    if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
        window.CanvasEditor.applyEffectsPipeline();
    }
}

    updateSliderLabel(activeCardElement) {
        if (!this.filterLabel) return;
        let titleText = this.activeFilter.charAt(0).toUpperCase() + this.activeFilter.slice(1);
        if (activeCardElement) titleText = activeCardElement.querySelector('span')?.innerText || titleText;
        this.filterLabel.innerText = `${titleText} Intensity (${this.intensity}%)`;
    }


    ensureSelectionFilterState() {
        if (!window.SelectionFilterState || typeof window.SelectionFilterState !== 'object') {
            window.SelectionFilterState = {
                type: 'none',
                intensity: 100,
                stack: []
            };
        }

        if (!Array.isArray(window.SelectionFilterState.stack)) {
            window.SelectionFilterState.stack = [];
        }

        return window.SelectionFilterState;
    }

getSelectionMode() {
    const editorOpen = !!(
        window.SelectionEditor &&
        window.SelectionEditor.isOpen === true
    );

    const processingActive = window.selectionProcessingActive === true;

    const hasMask = !!(
        window.activeSelectionMask &&
        window.activeSelectionMask.data &&
        window.activeSelectionMask.data.length
    );

    return editorOpen && processingActive && hasMask;
}

    getCurrentGlobalFilterState() {
        if (window.HistoryManager) {
            const params = window.HistoryManager.getCurrentParameters();
            if (params && params.filter) {
                return {
                    type: params.filter.type || 'none',
                    intensity: typeof params.filter.intensity !== 'undefined' ? params.filter.intensity : 100,
                    stack: Array.isArray(params.filter.stack) ? params.filter.stack.map(filter => ({
                        type: filter.type,
                        intensity: filter.intensity
                    })) : []
                };
            }
        }

        if (window.BaselineFilterHistory) {
            const state = window.BaselineFilterHistory.getCurrentState();
            return {
                type: state.type || 'none',
                intensity: typeof state.intensity !== 'undefined' ? state.intensity : 100,
                stack: Array.isArray(state.stack) ? state.stack.map(filter => ({
                    type: filter.type,
                    intensity: filter.intensity
                })) : []
            };
        }

        return {
            type: 'none',
            intensity: 100,
            stack: []
        };
    }

    getCurrentSelectionFilterState() {
        if (window.SelectionFilterState) {
            return {
                type: window.SelectionFilterState.type || 'none',
                intensity: typeof window.SelectionFilterState.intensity !== 'undefined' ? window.SelectionFilterState.intensity : 100,
                stack: Array.isArray(window.SelectionFilterState.stack) ? window.SelectionFilterState.stack.map(filter => ({
                    type: filter.type,
                    intensity: filter.intensity
                })) : []
            };
        }

        return {
            type: 'none',
            intensity: 100,
            stack: []
        };
    }

    openFilterSession() {
            if (this.mainToolBar) this.mainToolBar.style.display = 'none'; 
    this.isSelectionMode = this.getSelectionMode();

    if (this.isSelectionMode) {
        const localState = this.getCurrentSelectionFilterState();

        this.sessionStartState = {
            type: localState.type,
            intensity: localState.intensity,
            stack: localState.stack.map(filter => ({
                type: filter.type,
                intensity: filter.intensity
            }))
        };

        this.sessionStartStack = localState.stack.map(filter => ({
            type: filter.type,
            intensity: filter.intensity
        }));

        this.activeFilter = localState.type || 'none';
        this.intensity = typeof localState.intensity !== 'undefined'
            ? localState.intensity
            : 100;
    } else {
        const globalState = this.getCurrentGlobalFilterState();

        this.sessionStartState = {
            type: globalState.type,
            intensity: globalState.intensity,
            stack: globalState.stack.map(filter => ({
                type: filter.type,
                intensity: filter.intensity
            }))
        };

        this.sessionStartStack = globalState.stack.map(filter => ({
            type: filter.type,
            intensity: filter.intensity
        }));

        this.activeFilter = globalState.type || 'none';
        this.intensity = typeof globalState.intensity !== 'undefined'
            ? globalState.intensity
            : 100;
    }

    if (this.filterSlider) this.filterSlider.value = this.intensity;

    const matchingCard = document.querySelector(`.filter-item-btn[data-filter="${this.activeFilter}"]`);
    this.updateSliderLabel(matchingCard);

    if (this.filterGallery) this.filterGallery.style.display = 'flex';

    const intensityWrapper = document.getElementById('filterIntensityControl') || document.querySelector('.slider-group');
    if (intensityWrapper) intensityWrapper.style.display = 'none';
}

clearAllFiltersDirectly() {
        const selectionMode = this.getSelectionMode();

        if (selectionMode) {
            const selectionState = this.ensureSelectionFilterState();
            selectionState.type = 'none';
            selectionState.intensity = 100;
            selectionState.stack = [];

            window.SelectionFilterState = selectionState;

            window.dispatchEvent(new CustomEvent('selectionFilterChanged', {
                detail: { state: selectionState }
            }));
        } else {
            // Reset active layer filter parameters directly
            const activeLayer = window.CanvasEditor && typeof window.CanvasEditor.getActiveLayer === 'function'
                ? window.CanvasEditor.getActiveLayer()
                : null;

            if (activeLayer) {
                activeLayer.parameters = activeLayer.parameters || {};
                activeLayer.parameters.filter = {
                    type: 'none',
                    intensity: 100,
                    stack: []
                };
            }

            if (window.BaselineFilterHistory) {
                if (typeof window.BaselineFilterHistory.clearStack === 'function') {
                    window.BaselineFilterHistory.clearStack();
                }
                window.BaselineFilterHistory.updateLivePreviewValues('none', 100);
                window.BaselineFilterHistory.commitToMaster('Remove Filter');
            }

            window.dispatchEvent(new CustomEvent('editorHistoryChanged'));
        }

        // Immediately trigger render pipeline update
        if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
            window.CanvasEditor.applyEffectsPipeline();
        }
    }

applyLivePreview() {
    const selectionMode = this.getSelectionMode();

    if (selectionMode) {
        const selectionState = this.ensureSelectionFilterState();
        selectionState.type = this.activeFilter;
        selectionState.intensity = this.intensity;

        const existingIndex = selectionState.stack.findIndex(filter => filter.type === this.activeFilter);
        if (this.intensity > 0) {
            const nextFilter = { type: this.activeFilter, intensity: this.intensity };
            if (existingIndex !== -1) selectionState.stack[existingIndex] = nextFilter;
            else selectionState.stack.push(nextFilter);
        } else if (existingIndex !== -1) {
            selectionState.stack.splice(existingIndex, 1);
        }

        window.SelectionFilterState = selectionState;
    } else {
        // Only update local preview values in BaselineFilterHistory temporarily without committing to master
        if (window.BaselineFilterHistory) {
            window.BaselineFilterHistory.updateLivePreviewValues(this.activeFilter, this.intensity);
        }
    }

    // Force canvas re-render with updated preview values
    if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
        window.CanvasEditor.applyEffectsPipeline();
    }
}

confirmFilterTransaction() {
    const selectionMode = this.getSelectionMode();

    if (selectionMode) {
        const selectionState = this.ensureSelectionFilterState();

        window.SelectionFilterState = {
            type: selectionState.type || 'none',
            intensity: Number(selectionState.intensity) || 100,
            stack: Array.isArray(selectionState.stack)
                ? selectionState.stack.map(filter => ({
                    type: filter.type,
                    intensity: Number(filter.intensity) || 0
                }))
                : []
        };

        window.dispatchEvent(new CustomEvent('selectionFilterConfirmed', {
            detail: {
                state: window.SelectionFilterState
            }
        }));

        this.resetUIComponents();
        return;
    }

    // Commit changes to the active layer parameters and master history upon confirmation
    if (window.BaselineFilterHistory) {
        const activeLayer = window.CanvasEditor &&
            typeof window.CanvasEditor.getActiveLayer === 'function'
            ? window.CanvasEditor.getActiveLayer()
            : null;

        if (activeLayer) {
            activeLayer.parameters = activeLayer.parameters || {};
            activeLayer.parameters.filter = {
                type: this.activeFilter,
                intensity: this.intensity,
                stack: window.BaselineFilterHistory.getStack()
            };
        }

        window.BaselineFilterHistory.commitToMaster('Apply Filter');
    }

    if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
        window.CanvasEditor.applyEffectsPipeline();
    }

    this.resetUIComponents();
}

discardFilterTransaction() {
    const selectionMode = this.getSelectionMode();

    if (selectionMode) {
        if (this.sessionStartState) {
            window.SelectionFilterState = {
                type: this.sessionStartState.type || 'none',
                intensity: Number(this.sessionStartState.intensity) || 100,
                stack: Array.isArray(this.sessionStartStack)
                    ? this.sessionStartStack.map(filter => ({
                        type: filter.type,
                        intensity: Number(filter.intensity) || 0
                    }))
                    : []
            };
        }

        window.dispatchEvent(new CustomEvent('selectionFilterChanged', {
            detail: {
                state: window.SelectionFilterState
            }
        }));

        if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
            window.CanvasEditor.applyEffectsPipeline();
        }

        this.resetUIComponents();
        return;
    }

    // Rollback changes completely using the saved session start state
    if (window.BaselineFilterHistory && this.sessionStartState) {
        window.BaselineFilterHistory.syncState(this.sessionStartState);
        
        // Also restore active layer parameters back to session start state
        const activeLayer = window.CanvasEditor &&
            typeof window.CanvasEditor.getActiveLayer === 'function'
            ? window.CanvasEditor.getActiveLayer()
            : null;

        if (activeLayer) {
            activeLayer.parameters = activeLayer.parameters || {};
            activeLayer.parameters.filter = {
                type: this.sessionStartState.type,
                intensity: this.sessionStartState.intensity,
                stack: this.sessionStartStack
            };
        }
    }

    if (window.CanvasEditor && typeof window.CanvasEditor.applyEffectsPipeline === 'function') {
        window.CanvasEditor.applyEffectsPipeline();
    }

    this.resetUIComponents();
}

resetUIComponents() {
        if (this.filterPanel) this.filterPanel.style.display = 'none';
        if (this.mainToolBar) this.mainToolBar.style.display = 'flex'; // Restore main toolbar on confirm/discard

        if (this.filterGallery) this.filterGallery.style.display = 'flex';

        const intensityWrapper = document.getElementById('filterIntensityControl') || document.querySelector('.slider-group');
        if (intensityWrapper) intensityWrapper.style.display = 'none';

        this.sessionStartState = null;
        this.sessionStartStack = [];

        this.isSelectionMode = false;

        if (this.filterSlider) {
            this.filterSlider.value = this.intensity;
        }

        const matchingCard = document.querySelector(`.filter-item-btn[data-filter="${this.activeFilter}"]`);
        this.updateSliderLabel(matchingCard);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.AppFilterManager = new FilterManager();
});