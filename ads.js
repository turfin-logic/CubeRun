// ads.js - Handles Ad Network Integration (Mockup for now)

const AdManager = {
    interstitialTimer: null,
    
    // Initialize ad networks
    init() {
        console.log("AdManager Initialized. Ready to serve ads.");
        // Normally, you'd initialize Google AdSense or AdMob SDK here.
    },

    // Show a banner ad (e.g., on the main menu)
    showBanner() {
        console.log("Serving Banner Ad.");
        const adContainer = document.getElementById('main-menu-ad');
        if(adContainer) {
            adContainer.style.display = 'flex';
        }
    },

    // Show an interstitial ad (e.g., when the player dies)
    // Returns a Promise that resolves when the ad is closed
    showInterstitial() {
        return new Promise((resolve) => {
            console.log("Requesting Interstitial Ad...");
            
            const adContainer = document.getElementById('game-over-ad');
            const skipBtn = document.getElementById('skip-ad-btn');
            const restartBtn = document.getElementById('restart-btn');
            const mockContent = adContainer.querySelector('.mock-ad-content');
            
            if(adContainer) {
                adContainer.style.display = 'flex';
                skipBtn.style.display = 'none';
                restartBtn.style.display = 'none'; // Hide restart until ad is done
                mockContent.textContent = "Loading Sponsor...";

                // Simulate Ad load and unskippable time (3 seconds)
                setTimeout(() => {
                    mockContent.textContent = "BUY CYBER-COLA NOW! 50% OFF!";
                    skipBtn.style.display = 'block'; // Show skip button
                    
                    // Allow skipping
                    skipBtn.onclick = () => {
                        console.log("Ad Skipped.");
                        adContainer.style.display = 'none';
                        restartBtn.style.display = 'block'; // Reveal restart button
                        resolve();
                    };
                }, 3000);
            } else {
                resolve(); // Fallback if container missing
            }
        });
    }
};

// Initialize on load
window.addEventListener('load', () => {
    AdManager.init();
});
