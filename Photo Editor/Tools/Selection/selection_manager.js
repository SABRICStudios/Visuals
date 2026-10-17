/**
 * Visuals Photo Editor - Selection UI & Event Manager
 * Handles UI interactions, unified drag/move logic for both panel states,
 * touch/mouse listeners, and selection engine hooks.
 */
if (typeof window.selectionProcessingActive !== 'boolean') {
    window.selectionProcessingActive = false;
}

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const selectionBtn = document.getElementById('selectionToolBtn');
    const selectionPanel = document.getElementById('selectionPanel');
    const selectionPanelMini = document.getElementById('selectionPanelMini');
    
    // Header & Footer Action Buttons
    const minimizeBtn = document.getElementById('minimizeSelectionBtn');
    const expandBtn = document.getElementById('expandSelectionBtn');


    const mainCanvas = document.getElementById('editorCanvas');
    if (!selectionPanel) return;

    // --- Unified Panel Dragging Engine ---
    function enablePanelDragging(targetPanel) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        function handleDragStart(clientX, clientY, eventTarget) {
            // Ignore drag action if user clicks an interactive input or button directly
            if (eventTarget.closest('button, input, select, textarea, label, .op-btn, .selection-mode-btn')) {
                return false;
            }

            isDragging = true;
            startX = clientX;
            startY = clientY;

            const rect = targetPanel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            targetPanel.style.cursor = 'grabbing';
            return true;
        }

        function handleDragMove(clientX, clientY) {
            if (!isDragging) return;

            const dx = clientX - startX;
            const dy = clientY - startY;

            const newLeft = initialLeft + dx;
            const newTop = initialTop + dy;

            // Update active panel position
            targetPanel.style.left = `${newLeft}px`;
            targetPanel.style.top = `${newTop}px`;

            // Keep spatial position perfectly synced across expanded/minimized states
            if (targetPanel === selectionPanel && selectionPanelMini) {
                selectionPanelMini.style.left = `${newLeft}px`;
                selectionPanelMini.style.top = `${newTop}px`;
            } else if (targetPanel === selectionPanelMini && selectionPanel) {
                selectionPanel.style.left = `${newLeft}px`;
                selectionPanel.style.top = `${newTop}px`;
            }
        }

        function handleDragEnd() {
            if (isDragging) {
                isDragging = false;
                targetPanel.style.cursor = 'grab';
            }
        }

        targetPanel.style.cursor = 'grab';

        // Mouse Listeners
        targetPanel.addEventListener('mousedown', (e) => handleDragStart(e.clientX, e.clientY, e.target));
        window.addEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleDragEnd);

        // Touch Listenersa
        targetPanel.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                handleDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchend', handleDragEnd);
    }

    // Attach drag listener to both main panel and mini UI
    enablePanelDragging(selectionPanel);
    if (selectionPanelMini) {
        enablePanelDragging(selectionPanelMini);
    }

if (selectionBtn) {
    selectionBtn.addEventListener('click', () => {
        const engine = window.SelectionEditor;

        if (!engine) {
            console.warn('Selection engine not available');
            return;
        }

        if (engine.isOpen) {
            if (typeof engine.close === 'function') {
                engine.close();
            }
            return;
        }

        if (
            window.HistoryManager &&
            typeof window.HistoryManager.backupActiveSessionState === 'function'
        ) {
            window.HistoryManager.backupActiveSessionState();
        }

        if (typeof engine.open === 'function') {
            engine.open();
        }

        selectionPanel.style.display = 'block';

        if (selectionPanelMini) {
            selectionPanelMini.style.display = 'none';
        }

        if (
            window.CanvasEditor &&
            typeof window.CanvasEditor.loadSelectionSliderUI === 'function'
        ) {
            const local = window.SelectionAdjustmentState && window.SelectionAdjustmentState.local
                ? window.SelectionAdjustmentState.local
                : {};

            window.CanvasEditor.loadSelectionSliderUI(local);
        }
    });
}

});