import { AdMob, AdOptions, InterstitialAdPluginEvents } from '@capacitor-community/admob';

const INTERSTITIAL_ID = 'ca-app-pub-7398887532849395/9411971643';

let initialized = false;
let adLoaded = false;

async function initAdMob() {
  if (initialized) return;
  try {
    await AdMob.initialize({
      initializeForTesting: false,
    });
    initialized = true;

    AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      adLoaded = true;
    });
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      adLoaded = false;
      prepareInterstitial();
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
      adLoaded = false;
      setTimeout(prepareInterstitial, 30000);
    });
    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
      adLoaded = false;
      prepareInterstitial();
    });

    await prepareInterstitial();
  } catch {
    // AdMob not available (web browser)
  }
}

async function prepareInterstitial() {
  try {
    const options: AdOptions = {
      adId: INTERSTITIAL_ID,
      isTesting: false,
    };
    await AdMob.prepareInterstitial(options);
  } catch {
    // ignore
  }
}

export async function showInterstitial() {
  if (!initialized) {
    await initAdMob();
  }
  try {
    if (adLoaded) {
      await AdMob.showInterstitial();
    } else {
      await prepareInterstitial();
    }
  } catch {
    // ignore
  }
}

initAdMob();
