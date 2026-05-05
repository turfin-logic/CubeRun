// ads.js - GameDistribution SDK Integration

const AdManager = {
    isAdPlaying: false,

    init() {
        console.log("AdManager initializing...");
        // Expose hooks for the GD SDK events defined in index.html
        window.pauseGameForAd = this.pauseForAd.bind(this);
        window.resumeGameFromAd = this.resumeFromAd.bind(this);
    },

    pauseForAd() {
        console.log("Game Paused for Ad");
        this.isAdPlaying = true;
        // In game.js, if GAME_STATE is PAUSED, the loop won't update physics
        if (typeof GAME_STATE !== 'undefined') {
            window.PREVIOUS_GAME_STATE = GAME_STATE;
            GAME_STATE = 'PAUSED';
        }
        // Mute audio here if we had any
    },

    resumeFromAd() {
        console.log("Ad finished. Resuming Game");
        this.isAdPlaying = false;
        if (typeof window.PREVIOUS_GAME_STATE !== 'undefined') {
            GAME_STATE = window.PREVIOUS_GAME_STATE;
            if (GAME_STATE === 'PLAYING') {
                if (typeof window.gameLoop === 'function') window.gameLoop();
            }
        }
        
        // Ensure the restart button is visible after ad finishes
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.style.display = 'block';
    },

    showInterstitial() {
        return new Promise((resolve) => {
            console.log("Requesting GD Interstitial Ad...");
            const restartBtn = document.getElementById('restart-btn');
            if (restartBtn) restartBtn.style.display = 'none'; // Hide until ad finishes

            if (typeof gdsdk !== 'undefined' && gdsdk.showAd !== 'undefined') {
                gdsdk.showAd();
                // The resolution of this promise is handled indirectly by the SDK_GAME_START event
                // which calls resumeFromAd(). We resolve immediately so the UI can setup.
                resolve();
            } else {
                console.warn("GD SDK not found. Skipping ad.");
                if (restartBtn) restartBtn.style.display = 'block';
                resolve();
            }
        });
    }
};

window.addEventListener('load', () => {
    AdManager.init();
});
