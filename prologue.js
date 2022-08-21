function _calculateScrollbarSizes() {
    document.documentElement.style.setProperty('--scrollbar-width', (window.innerWidth - document.documentElement.clientWidth) + "px");
    document.documentElement.style.setProperty('--scrollbar-height', (window.innerHeight - document.documentElement.clientHeight) + "px");
}
// recalculate on resize
window.addEventListener('resize', _calculateScrollbarSizes, false);
// recalculate on dom load
document.addEventListener('DOMContentLoaded', _calculateScrollbarSizes, false);
// recalculate on load (assets loaded as well)
window.addEventListener('load', _calculateScrollbarSizes);