/* ==========================
   LOADER
========================== */

let animationFinished = false;
let birdsLoaded = false;
let heroImagesLoaded = false;
let slideshowStarted = false;

const loaderSteps = [
    { action: "Exploring...", place: "the forests of Assam" },
    { action: "Scanning...", place: "the wetlands of Assam" },
    { action: "Listening...", place: "the grasslands of Assam" },
    { action: "Discovering...", place: "the tea gardens of Assam" },
    { action: "Identifying...", place: "the birds of Assam" },
    { action: " ", place: "Welcome to Pokkhi." }
];

const preloadImages = [
    "images/hero1.avif",
    "images/hero2.avif",
    "images/hero3.avif",
    "images/hero4.avif"
];

function preloadHeroImages() {
    return Promise.all(
        preloadImages.map(src =>
            new Promise(resolve => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            })
        )
    );
}

function hideLoaderIfReady() {
    if (animationFinished && birdsLoaded && heroImagesLoaded) {
        const logo = document.querySelector(".loader-logo");
        if (logo) {
            logo.style.animation = "none";
            logo.style.transform = "scale(1)";
        }

        const loader = document.getElementById("loader");
        loader.classList.add("loader-hidden");

        // Always start from the top
        window.scrollTo(0, 0);

        if (!slideshowStarted) {
            slideshowStarted = true;
            setTimeout(() => {
                initHeroSlideshow();
            }, 700);
        }
    }
}

function startLoaderAnimation() {
    const action = document.getElementById("loaderAction");
    const place = document.getElementById("loaderPlace");
    const progress = document.getElementById("loaderProgress");
    let step = 0;

    function nextStep() {
        if (step >= loaderSteps.length) {
            clearInterval(interval);
            setTimeout(() => {
                animationFinished = true;
                hideLoaderIfReady();
            }, 1000);
            return;
        }

        action.classList.add("loader-fade");
        place.classList.add("loader-fade");

        setTimeout(() => {
            const currentStep = loaderSteps[step];
            action.textContent = currentStep.action;
            place.textContent = currentStep.place;

            progress.style.width = ((step + 1) / loaderSteps.length) * 100 + "%";

            action.classList.remove("loader-fade");
            place.classList.remove("loader-fade");
            step++;
        }, 250);
    }

    nextStep();
    const interval = setInterval(nextStep, 1400);
}

let birds = [];
let filteredBirds = [];

const birdGrid = document.getElementById("birdGrid");
const searchInput = document.getElementById("searchInput");
const directorySearchInput = document.getElementById("directorySearchInput");
const statusFilter = document.getElementById("statusFilter");
const suggestionsBox = document.getElementById("suggestions");
const directorySuggestionsBox = document.getElementById("directorySuggestions");
const resetSearchBtn = document.getElementById("resetSearchBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let birdsPerPage = 12;
let visibleBirds = 12;

/* ==========================================
   SEARCH ENGINE
========================================== */

function normalizeQuery(text) {
    return (text || "").toLowerCase().trim();
}

function romanizeAssamese(text) {
    if (!text) return "";

    const consonants = {
        "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
        "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
        "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
        "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
        "প": "p", "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m",
        "য": "j", "য়": "y", "ৰ": "r", "ল": "l",
        "শ": "sh", "ষ": "sh", "স": "s", "হ": "h"
    };

    const vowels = {
        "অ": "a", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u",
        "ঊ": "u", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou"
    };

    const vowelSigns = {
        "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u",
        "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou"
    };

    let result = "";

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (vowels[ch]) {
            result += vowels[ch];
            continue;
        }

        if (consonants[ch]) {
            let roman = consonants[ch];
            const next = text[i + 1];
            if (vowelSigns[next]) {
                roman += vowelSigns[next];
                i++;
            } else if (next === "্") {
                i++;
            } else {
                roman += "a";
            }
            result += roman;
            continue;
        }

        if (ch === "ং") { result += "ng"; continue; }
        if (ch === "ঁ") { result += "n"; continue; }
        if (ch === "ঃ") { result += "h"; continue; }
        result += ch;
    }

    return normalizeQuery(result);
}

function normalizeRoman(text) {
    if (!text) return "";

    return text
        .toLowerCase()
        .replace(/aa/g, "a")
        .replace(/ee/g, "i")
        .replace(/ii/g, "i")
        .replace(/oo/g, "u")
        .replace(/o/g, "a")
        .replace(/e/g, "i")
        .replace(/kh/g, "k")
        .replace(/gh/g, "g")
        .replace(/chh/g, "ch")
        .replace(/jh/g, "j")
        .replace(/th/g, "t")
        .replace(/dh/g, "d")
        .replace(/bh/g, "b")
        .replace(/ph/g, "f")
        .replace(/sh/g, "h")
        .replace(/x/g, "h")
        .replace(/s/g, "h")
        .replace(/(.)\1+/g, "$1");
}

function tokenize(text) {
    return normalizeRoman(normalizeQuery(text))
        .replace(/[\/,()]/g, " ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .split(" ")
        .filter(Boolean);
}

function splitCompoundWord(word) {
    const parts = [];
    const endings = [
        "fisher", "bill", "bird", "pecker", "throat", "breasted",
        "tailed", "headed", "backed", "winged", "bellied", "crowned",
        "naped", "eared", "eyed", "footed"
    ];

    endings.forEach(ending => {
        if (word.length > ending.length && word.endsWith(ending)) {
            const prefix = word.slice(0, -ending.length);
            if (prefix.length > 1) {
                parts.push(prefix);
            }
            parts.push(ending);
        }
    });
    return parts;
}

function buildSearchIndex(bird) {
    const index = {
        english: { full: [], words: [], compounds: [] },
        assamese: { full: [], words: [] },
        roman: { full: [], words: [] }
    };

    const english = normalizeQuery(bird.name || "");
    if (english) {
        index.english.full.push(normalizeRoman(english));
        const words = tokenize(english);
        words.forEach(word => {
            index.english.words.push(word);
            splitCompoundWord(word).forEach(part => {
                index.english.compounds.push(part);
            });
        });
    }

    const assamese = normalizeQuery(bird.assameseName || "");
    if (assamese) {
        index.assamese.full.push(assamese);
        tokenize(assamese).forEach(word => index.assamese.words.push(word));
    }

    const roman = romanizeAssamese(bird.assameseName || "");
    index.roman.full.push(normalizeRoman(roman));
    if (roman) {
        tokenize(roman).forEach(word => index.roman.words.push(normalizeRoman(word)));
    }

    return index;
}

function scoreBird(bird, query) {
    if (!query) return 1;
    let score = 0;

    bird.searchIndex.english.full.forEach(name => {
        if (name === query) score = Math.max(score, 100);
        else if (name.startsWith(query)) score = Math.max(score, 90);
        else if (name.includes(query)) score = Math.max(score, 50);
    });

    bird.searchIndex.english.words.forEach(word => {
        if (word === query) score = Math.max(score, 80);
        else if (word.startsWith(query)) score = Math.max(score, 70);
        else if (word.includes(query)) score = Math.max(score, 40);
    });

    bird.searchIndex.english.compounds.forEach(word => {
        if (word === query) score = Math.max(score, 75);
        else if (word.startsWith(query)) score = Math.max(score, 65);
        else if (word.includes(query)) score = Math.max(score, 35);
    });

    bird.searchIndex.assamese.full.forEach(name => {
        if (name.includes(query)) score = Math.max(score, 60);
    });

    bird.searchIndex.assamese.words.forEach(word => {
        if (word.includes(query)) score = Math.max(score, 60);
    });

    bird.searchIndex.roman.full.forEach(name => {
        if (name === query) score = Math.max(score, 95);
        else if (name.startsWith(query)) score = Math.max(score, 88);
        else if (name.includes(query)) score = Math.max(score, 60);
    });

    bird.searchIndex.roman.words.forEach(word => {
        if (word === query) score = Math.max(score, 85);
        else if (word.startsWith(query)) score = Math.max(score, 75);
        else if (word.includes(query)) score = Math.max(score, 45);
    });

    return score;
}

function findMatchingBirds(query) {
    query = normalizeRoman(normalizeQuery(query));
    if (!query) return birds;

    return birds
        .map(bird => ({ bird: bird, score: scoreBird(bird, query) }))
        .filter(result => result.score > 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.bird.name.localeCompare(b.bird.name, "en", { sensitivity: "base" });
        })
        .map(result => result.bird);
}

function highlightMatch(text, query) {
    if (!text || !query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "ig");
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function highlightRomanAssamese(text, query) {
    if (!text || !query) return text;
    const normalizedQuery = normalizeRoman(query);
    const words = text.split(" ");
    return words.map(word => {
        const romanWord = normalizeRoman(romanizeAssamese(word));
        if (romanWord.includes(normalizedQuery)) {
            return `<span class="search-highlight">${word}</span>`;
        }
        return word;
    }).join(" ");
}

function getStatusClass(status) {
    switch (status) {
        case "LC": return "status-lc";
        case "NT": return "status-nt";
        case "VU": return "status-vu";
        case "EN": return "status-en";
        case "CR": return "status-cr";
        default: return "";
    }
}

async function loadBirds() {
    try {
        const response = await fetch("data/birds.json");
        if (!response.ok) {
            throw new Error(`Failed to load birds.json (${response.status})`);
        }
        birds = await response.json();
        birds.forEach(bird => {
            bird.searchIndex = buildSearchIndex(bird);
        });

        birds.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

        filteredBirds = [...birds];
        visibleBirds = birdsPerPage;
        updateStatistics();

        if (document.getElementById("birdOfDay")) renderBirdOfDay();
        if (document.getElementById("birdGrid")) {
            renderBirds(filteredBirds);
            updateResultCount();
        }

        birdsLoaded = true;
        hideLoaderIfReady();
    } catch (error) {
        console.error("Error loading bird data:", error);
    }
}

function updateStatistics() {
    if (!document.getElementById("speciesCount")) return;

    const speciesCount = birds.length;
    document.getElementById("speciesCount").textContent = speciesCount;

    const assameseCount = birds.filter(bird => bird.assameseName && bird.assameseName.trim() !== "").length;

    document.getElementById("aboutSpeciesCount").textContent = speciesCount;
    document.getElementById("aboutAssameseCount").textContent = assameseCount;

    const lc = birds.filter(b => b.iucnStatus === "LC").length;
    const nt = birds.filter(b => b.iucnStatus === "NT").length;
    const vu = birds.filter(b => b.iucnStatus === "VU").length;
    const en = birds.filter(b => b.iucnStatus === "EN").length;
    const cr = birds.filter(b => b.iucnStatus === "CR").length;

    document.getElementById("countLC").textContent = `LC ${lc}`;
    document.getElementById("countNT").textContent = `NT ${nt}`;
    document.getElementById("countVU").textContent = `VU ${vu}`;
    document.getElementById("countEN").textContent = `EN ${en}`;
    document.getElementById("countCR").textContent = `CR ${cr}`;

    const total = lc + nt + vu + en + cr;
    if (total > 0) {
        document.getElementById("barLC").style.width = `${(lc / total) * 100}%`;
        document.getElementById("barNT").style.width = `${(nt / total) * 100}%`;
        document.getElementById("barVU").style.width = `${(vu / total) * 100}%`;
        document.getElementById("barEN").style.width = `${(en / total) * 100}%`;
        document.getElementById("barCR").style.width = `${(cr / total) * 100}%`;
    }

    document.getElementById("lastUpdated").textContent = "June 2025";
}

function updateResultCount() {
    const resultCount = document.getElementById("resultCount");
    if (resultCount) {
        resultCount.textContent = `Showing ${filteredBirds.length} birds`;
    }
}

const excludedBirds = new Set([
    "ashy-headed-green-pigeon", "asian-palm-swift", "bank-myna", "barn-owl", "barred-buttonquail", "bearded-vulture",
    "bengal-bushlark", "black-baza", "black-kite", "black-stork", "black-breasted-parrotbill", "black-capped-kingfisher",
    "black-headed-gull", "black-tailed-crake", "blue-breasted-quail", "brahminy-kite", "brown-fish-owl", "chestnut-capped-babbler",
    "cinereous-vulture", "clamorous-reed-warbler", "common-quail", "common-redshank", "crested-treeswift", "dusky-eagle-owl",
    "eurasian-curlew", "eurasian-hobby", "eurasian-spoonbill", "ferruginous-flycatcher", "finn's-weaver", "firethroat",
    "great-white-pelican", "greenish-warbler", "grey-nightjar", "grey-capped-pygmy-woodpecker", "grey-hooded-warbler",
    "indian-cormorant", "indian-grassbird", "jack-snipe", "jerdon-s-babbler", "jerdon-s-baza", "jerdon-s-bushchat",
    "lesser-fish-eagle", "long-legged-buzzard", "mandarin-duck", "marsh-babbler", "masked-finfoot", "mountain-hawk-eagle",
    "mountain-imperial-pigeon", "mountain-scops-owl", "orange-breasted-green-pigeon", "oriental-bay-owl", "oriental-hobby",
    "pin-tailed-snipe", "red-avadavat", "rufous-bellied-eagle", "sarus-crane", "slaty-legged-crake", "slender-billed-babbler",
    "slender-billed-vulture", "steppe-eagle", "striated-bulbul", "swamp-grass-babbler", "thick-billed-warbler",
    "tickell-s-leaf-warbler", "white-rumped-vulture", "white-spectacled-warbler", "yellow-eyed-warbler"
]);

function renderBirdOfDay() {
    const container = document.getElementById("birdOfDay");
    if (!birds.length) return;

    const today = new Date();
    const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 12));
    const availableBirds = birds.filter(bird => !excludedBirds.has(bird.id));
    const bird = availableBirds[dayNumber % availableBirds.length];

    container.innerHTML = `
        <div class="bird-card featured-bird">
            <div class="featured-image-wrapper">
                <img src="${bird.image}" alt="${bird.name}" onerror="this.src='images/placeholder.jpg'">
                <div class="featured-tag">Featured Today</div>
            </div>
            <div class="bird-info">
                <h3>${bird.name}</h3>
                <p class="assamese-name">${bird.assameseName || ""}</p>
                <span class="status-badge ${getStatusClass(bird.iucnStatus)}">${bird.iucnStatus || ""}</span>
                <p class="featured-description">${(bird.description || "").substring(0, 180)}...</p>
                <button class="featured-btn">Learn More</button>
            </div>
        </div>
    `;

    const card = container.querySelector(".bird-card");
    if (card) {
        card.addEventListener("click", () => openModal(bird));
    }
}

function renderBirds(birdList) {
    birdGrid.innerHTML = "";
    const speciesProgress = document.getElementById("speciesProgress");
    const birdsToShow = birdList.slice(0, visibleBirds);

    birdsToShow.forEach(bird => {
        const card = document.createElement("div");
        card.className = "bird-card";
        card.dataset.birdId = bird.id;
        card.innerHTML = `
            <div class