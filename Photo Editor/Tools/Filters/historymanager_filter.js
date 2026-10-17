class FilterHistoryManager {
    constructor() {
        this.currentState = {
            type: 'none',
            intensity: 100,
            stack: []
        };
    }


    clearStack() {
        this.currentState = {
            type: 'none',
            intensity: 100,
            stack: []
        };
    }
    
    normalizeFilter(filter) {
        if (!filter || !filter.type || filter.type === 'none' || Number(filter.intensity) === 0) {
            return null;
        }

        return {
            type: filter.type,
            intensity: Math.min(100, Math.max(0, Number(filter.intensity) || 0))
        };
    }

    cloneStack(stack) {
        if (!Array.isArray(stack)) return [];

        return stack
            .map(filter => this.normalizeFilter(filter))
            .filter(Boolean)
            .map(filter => ({
                type: filter.type,
                intensity: filter.intensity
            }));
    }

    syncState(incomingFilterState) {
        if (!incomingFilterState) {
            this.currentState = {
                type: 'none',
                intensity: 100,
                stack: []
            };
            return;
        }

        if (Array.isArray(incomingFilterState.stack)) {
            this.currentState.stack = this.cloneStack(incomingFilterState.stack);
        } else if (incomingFilterState.type && incomingFilterState.type !== 'none') {
            const singleFilter = this.normalizeFilter(incomingFilterState);
            this.currentState.stack = singleFilter ? [singleFilter] : [];
        } else {
            this.currentState.stack = [];
        }

        if (this.currentState.stack.length > 0) {
            const lastFilter = this.currentState.stack[this.currentState.stack.length - 1];
            this.currentState.type = lastFilter.type;
            this.currentState.intensity = lastFilter.intensity;
        } else {
            this.currentState.type = 'none';
            this.currentState.intensity = 100;
        }
    }

updateLivePreviewValues(filterType, intensityValue) {
    const intensity = Number(intensityValue);

    if (!filterType || filterType === 'none' || !Number.isFinite(intensity)) {
        return;
    }

    // Direct assignment to state
    this.currentState.type = filterType;
    this.currentState.intensity = Math.min(100, Math.max(0, intensity));

    if (!Array.isArray(this.currentState.stack)) {
        this.currentState.stack = [];
    }

    const existingIndex = this.currentState.stack.findIndex(
        item => item.type === filterType
    );

    if (this.currentState.intensity <= 0) {
        if (existingIndex !== -1) {
            this.currentState.stack.splice(existingIndex, 1);
        }
    } else {
        if (existingIndex !== -1) {
            this.currentState.stack[existingIndex] = {
                type: filterType,
                intensity: this.currentState.intensity
            };
        } else {
            this.currentState.stack.push({
                type: filterType,
                intensity: this.currentState.intensity
            });
        }
    }
}

    removeFilter(filterType) {
    if (!Array.isArray(this.currentState.stack)) {
        this.currentState.stack = [];
    }

    this.currentState.stack = this.currentState.stack.filter(
        filter => filter.type !== filterType
    );

    if (this.currentState.stack.length > 0) {
        const lastFilter = this.currentState.stack[this.currentState.stack.length - 1];

        this.currentState.type = lastFilter.type;
        this.currentState.intensity = lastFilter.intensity;
    } else {
        this.currentState.type = 'none';
        this.currentState.intensity = 100;
    }
}

    setStack(stack) {
        this.currentState.stack = this.cloneStack(stack);

        if (this.currentState.stack.length > 0) {
            const lastFilter = this.currentState.stack[this.currentState.stack.length - 1];
            this.currentState.type = lastFilter.type;
            this.currentState.intensity = lastFilter.intensity;
        } else {
            this.currentState.type = 'none';
            this.currentState.intensity = 100;
        }
    }

    getStack() {
        return this.cloneStack(this.currentState.stack);
    }

    getCurrentState() {
        return {
            type: this.currentState.type,
            intensity: this.currentState.intensity,
            stack: this.getStack()
        };
    }

    commitToMaster(label = "Apply Filter") {
        if (!window.HistoryManager) {
            console.error("Global 'HistoryManager' wrapper instance is inaccessible across scope windows.");
            return;
        }

        window.HistoryManager.commitChange(label, {
            type: 'filter',
            values: this.getCurrentState()
        });
    }
}

window.BaselineFilterHistory = new FilterHistoryManager();