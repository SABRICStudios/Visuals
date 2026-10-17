// adjust_manager.js
document.addEventListener('DOMContentLoaded', () => {
    const adjustBtn = document.getElementById('adjustBtn');
    const adjustPanel = document.getElementById('adjustPanel');
    const adjustGallery = document.getElementById('adjustGallery');
    const closeAdjustBtn = document.getElementById('closeAdjustBtn');
    const mainToolbar = document.getElementById('toolbar');
    
    let activeSliderControl = null;

    function openAdjustPanel() {
        if (adjustPanel) adjustPanel.style.display = 'block';
        if (adjustGallery) adjustGallery.style.display = 'flex';
        if (mainToolbar) mainToolbar.style.display = 'none';
        
        if (activeSliderControl) {
            activeSliderControl.style.display = 'none';
            activeSliderControl = null;
        }
    }

    function closeAdjustPanel() {
        if (adjustPanel) adjustPanel.style.display = 'none';
        if (mainToolbar) mainToolbar.style.display = 'flex';
        
        if (activeSliderControl) {
            activeSliderControl.style.display = 'none';
            activeSliderControl = null;
        }
        if (adjustGallery) adjustGallery.style.display = 'flex';
    }

    // --- CLICK AND DRAG TO SCROLL LOGIC ---
    if (adjustGallery) {
        let isDown = false;
        let startX;
        let scrollLeft;
        let isDragging = false; // Prevents button click trigger when dragging

        adjustGallery.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            adjustGallery.classList.add('active');
            startX = e.pageX - adjustGallery.offsetLeft;
            scrollLeft = adjustGallery.scrollLeft;
        });

        adjustGallery.addEventListener('mouseleave', () => {
            isDown = false;
        });

        adjustGallery.addEventListener('mouseup', () => {
            isDown = false;
        });

        adjustGallery.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - adjustGallery.offsetLeft;
            const walk = (x - startX) * 1.5; // Multiply by 1.5 for faster drag speed
            
            // Mark as dragging if moved more than 5 pixels
            if (Math.abs(walk) > 5) {
                isDragging = true;
            }
            
            e.preventDefault();
            adjustGallery.scrollLeft = scrollLeft - walk;
        });

        // Mouse Wheel Horizontal Scroll
        adjustGallery.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                adjustGallery.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        // Gallery Item Click Listener (Ignores click if user was dragging)
        adjustGallery.addEventListener('click', (e) => {
            if (isDragging) {
                e.stopImmediatePropagation();
                e.preventDefault();
                isDragging = false;
                return;
            }

            const targetBtn = e.target.closest('.gallery-item-btn');
            if (!targetBtn) return;

            const targetSliderId = targetBtn.getAttribute('data-target');
            const targetSlider = document.getElementById(targetSliderId);

            if (targetSlider) {
                adjustGallery.style.display = 'none';              
                targetSlider.style.display = 'block';    
                activeSliderControl = targetSlider;
            }
        }, true); // Capture phase to prevent button action on drag release
    }

    // Toggle main view settings panel container drawer
    if (adjustBtn) {
        adjustBtn.addEventListener('click', () => {
            if (adjustPanel && (adjustPanel.style.display === 'none' || !adjustPanel.style.display)) {
                openAdjustPanel();
            } else {
                closeAdjustPanel();
            }
        });
    }

    if (closeAdjustBtn) {
        closeAdjustBtn.addEventListener('click', closeAdjustPanel);
    }

    if (adjustPanel) {
        const actionButtons = adjustPanel.querySelectorAll('.tool-actions button');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (activeSliderControl) {
                    activeSliderControl.style.display = 'none';
                    activeSliderControl = null;
                }
                if (adjustGallery) adjustGallery.style.display = 'flex';
            });
        });
    }
});