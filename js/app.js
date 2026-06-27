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
        if (!window.location.hash) {
            window.scrollTo(0, 0);
        }

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

    document.getElementById("lastUpdated").textContent = "27-June-2026";
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
                <img src="images/birds/cards/${bird.id}.avif" alt="${bird.name}" onerror="this.src='images/placeholder.jpg'">
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
            <div class="bird-image">
                <img src="images/birds/cards/${bird.id}.avif" alt="${bird.name}" onerror="this.src='images/placeholder.jpg'">
            </div>
            <div class="bird-info">
                <h3>${bird.name}</h3>
                <p class="assamese-name">${bird.assameseName || ""}</p>
                <span class="status-badge ${getStatusClass(bird.iucnStatus)}">${bird.iucnStatus || ""}</span>
            </div>
        `;
        card.addEventListener("click", () => openModal(bird));
        birdGrid.appendChild(card);
    });

    if (speciesProgress) {
        speciesProgress.textContent = `${Math.min(visibleBirds, birdList.length)} of ${birdList.length} species shown`;
    }

    if (visibleBirds >= birdList.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "inline-block";
        loadMoreBtn.textContent = `Load More`;
    }
}

function showSuggestions(searchTerm, targetBox, targetInput) {
    if (!targetBox) return;
    targetBox.innerHTML = "";

    if (searchTerm.length < 2) {
        targetBox.style.display = "none";
        return;
    }

    let matches = findMatchingBirds(searchTerm);
    const query = normalizeRoman(normalizeQuery(searchTerm));

    matches.sort((a, b) => {
        const aEnglish = normalizeRoman(a.name).includes(query);
        const bEnglish = normalizeRoman(b.name).includes(query);
        if (aEnglish !== bEnglish) return bEnglish - aEnglish;

        const aStarts = normalizeRoman(a.name).startsWith(query);
        const bStarts = normalizeRoman(b.name).startsWith(query);
        if (aStarts !== bStarts) return bStarts - aStarts;

        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });

    matches = matches.slice(0, 5);

    if (!matches.length) {
        targetBox.style.display = "none";
        return;
    }

    matches.forEach(bird => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        const romanQuery = normalizeRoman(romanizeAssamese(bird.assameseName || ""));
        const queryRoman = normalizeRoman(searchTerm);
        const showRomanHighlight = romanQuery.includes(queryRoman);
        const englishHighlighted = highlightMatch(bird.name, searchTerm);
        let assameseHighlighted = bird.assameseName || "";

        if (showRomanHighlight) {
            assameseHighlighted = highlightRomanAssamese(bird.assameseName, searchTerm);
        }

        item.innerHTML = `
            <div class="suggestion-title">${englishHighlighted}</div>
            <div class="suggestion-assamese">${assameseHighlighted}</div>
        `;

        item.addEventListener("click", () => {
            targetInput.value = bird.name;
            targetBox.style.display = "none";
            filterBirds();
            requestAnimationFrame(() => {
                const selectedCard = document.querySelector(`[data-bird-id="${bird.id}"]`);
                if (selectedCard) {
                    selectedCard.scrollIntoView({ behavior: "smooth", block: "start" });
                    selectedCard.classList.add("search-focus");
                    setTimeout(() => {
                        selectedCard.classList.remove("search-focus");
                    }, 1500);
                }
            });
        });
        targetBox.appendChild(item);
    });

    targetBox.style.display = "block";
}

function performSearch() {
    filterBirds();
    if (resetSearchBtn) resetSearchBtn.style.display = "inline-block";

    setTimeout(() => {
        const firstCard = birdGrid.querySelector(".bird-card");
        if (firstCard) {
            firstCard.scrollIntoView({ behavior: "smooth", block: "start" });
            firstCard.classList.add("search-focus");
            setTimeout(() => {
                firstCard.classList.remove("search-focus");
            }, 1500);
        }
    }, 100);

    setTimeout(() => {
        searchInput.value = "";
    }, 500);
}

function filterBirds() {
    const heroSearch = searchInput.value.toLowerCase().trim();
    const directorySearch = directorySearchInput ? directorySearchInput.value.toLowerCase().trim() : "";
    const search = directorySearch || heroSearch;
    const status = statusFilter.value;

    const matchingBirds = findMatchingBirds(search);
    filteredBirds = matchingBirds.filter(bird => {
        const matchesStatus = status === "All" || (bird.iucnStatus || "") === status;
        return matchesStatus;
    });

    visibleBirds = 12;
    const hasActiveFilter = search !== "" || status !== "All";
    if (resetSearchBtn) resetSearchBtn.style.display = hasActiveFilter ? "inline-block" : "none";

    renderBirds(filteredBirds);
    updateResultCount();
    showSuggestions(heroSearch, suggestionsBox, searchInput);

    if (directorySearchInput) {
        showSuggestions(directorySearch, directorySuggestionsBox, directorySearchInput);
    }
}

if (searchInput) {
    searchInput.addEventListener("input", filterBirds);
    searchInput.addEventListener("focus", () => {
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
        }
    });
}

if (directorySearchInput) {
    directorySearchInput.addEventListener("input", filterBirds);
    directorySearchInput.addEventListener("focus", () => {
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                directorySearchInput.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 500);
        }
    });
}

if (searchInput) {
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            if (suggestionsBox) suggestionsBox.style.display = "none";
            performSearch();
        }
    });
}

if (statusFilter) {
    statusFilter.addEventListener("change", filterBirds);
}

if (resetSearchBtn) {
    resetSearchBtn.addEventListener("click", () => {
        filteredBirds = [...birds];
        visibleBirds = 12;
        renderBirds(filteredBirds);
        updateResultCount();
        if (searchInput) searchInput.value = "";
        if (directorySearchInput) directorySearchInput.value = "";
        statusFilter.value = "All";
        suggestionsBox.style.display = "none";
        resetSearchBtn.style.display = "none";
    });
}

function openModal(bird) {
    const image = document.getElementById("modalImage");
    const imageBlur = document.getElementById("modalImageBlur");
    const imagePath = `images/birds/${bird.id}.avif`;

    image.src = imagePath;
    imageBlur.src = imagePath;

    image.onerror = () => {
        image.src = "images/placeholder.jpg";
        imageBlur.src = "images/placeholder.jpg";
    };

    document.getElementById("modalName").textContent = bird.name || "";
    document.getElementById("modalAssamese").textContent = bird.assameseName || "";

    const modalStatus = document.getElementById("modalStatus");
    modalStatus.textContent = `IUCN Status: ${bird.iucnStatus || ""}`;
    modalStatus.className = `status-badge ${getStatusClass(bird.iucnStatus)}`;
    document.getElementById("modalDescription").textContent = bird.description || "";
    document.getElementById("birdModal").style.display = "flex";
}

const closeModalBtn = document.getElementById("closeModal");
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        document.getElementById("birdModal").style.display = "none";
    });
}

window.addEventListener("click", event => {
    const modal = document.getElementById("birdModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrapper")) {
        if (suggestionsBox) suggestionsBox.style.display = "none";
        if (directorySuggestionsBox) directorySuggestionsBox.style.display = "none";
    }
});

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
        visibleBirds += birdsPerPage;
        renderBirds(filteredBirds);
    });
}

const suggestionForm = document.getElementById("birdSuggestionForm");
if (suggestionForm) {
    suggestionForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const englishName = document.getElementById("englishName").value.trim();
        const assameseName = document.getElementById("assameseName").value.trim();
        const location = document.getElementById("location").value.trim();
        const notes = document.getElementById("notes").value.trim();
        const contributorName = document.getElementById("contributorName").value.trim();
        const formMessage = document.getElementById("formMessage");

        if (!englishName && !assameseName) {
            formMessage.textContent = "Please enter either an English or Assamese name.";
            return;
        }

        try {
            await fetch("https://script.google.com/macros/s/AKfycbzDuo46jkZjM3mIxkgx8x9QopgF1zioD3Qy2S6qyrXalWVhrZJ12mTKWh-Sv5DTD12l/exec", {
                method: "POST",
                body: JSON.stringify({ englishName, assameseName, location, notes, contributorName })
            });
            formMessage.textContent = "Thank you for your contribution!";
            suggestionForm.reset();
        } catch (error) {
            formMessage.textContent = "Submission failed. Please try again.";
        }
    });
}

const anatomyInfo = {
    "Bill": {
        title: "Bill",
        description: "The bill is the hard, beak-like structure used for feeding, preening, nest building and many other tasks. Bill shape often reflects a bird's diet and lifestyle.",
        image: "images/bill.webp",
        caption: "Bill of a Stork-billed Kingfisher.",
        examples: ["Stork-billed Kingfisher", "Large-billed Crow"]
    },
    "Chin": {
        title: "Chin",
        description: "The chin is the small area immediately below the bill. Its colour and markings can help distinguish similar species.",
        image: "images/chin.webp",
        caption: "Chin of a Pale-chinned Flycatcher.",
        examples: ["Pale-chinned Flycatcher", "Gray-chinned Minivet"]
    },
    "Lore": {
        title: "Lore",
        description: "The lore is the area between the eye and the base of the bill. It may be bare, feathered, or brightly coloured and is often important for identification.",
        image: "images/lore.webp",
        caption: "Lore of a Grey-lored Broadbill.",
        examples: ["Grey-lored Broadbill", "Himalayan Black-lored Tit"]
    },
    "Eye Ring": {
        title: "Eye Ring",
        description: "An eye ring is a ring of feathers or bare skin surrounding the eye. Its presence, colour, and thickness are useful identification features.",
        image: "images/eye_ring.webp",
        caption: "Eye ring of an Indian White Eye.",
        examples: ["Indian White Eye", "Yellow-eyed Babbler"]
    },
    "Throat": {
        title: "Throat",
        description: "The throat is the feathered area below the chin and above the breast. Distinct throat patches or colours often help identify birds.",
        image: "images/throat.webp",
        caption: "Throat of a White-throated Kingfisher.",
        examples: ["White-throated Kingfisher", "White-throated Fantail"]
    },
    "Breast": {
        title: "Breast",
        description: "The breast is the front part of the body below the throat. Breast colour, streaking and patterns are commonly used in field identification.",
        image: "images/breast.webp",
        caption: "Breast of a Yellow-breasted Bunting.",
        examples: ["Yellow-breasted Bunting", "White-breasted Waterhen"]
    },
    "Belly": {
        title: "Belly",
        description: "The belly is the lower underside of a bird. Belly colour often contrasts with the breast and can be a key field mark.",
        image: "images/belly.webp",
        caption: "Belly of a Yellow-bellied Prinia.",
        examples: ["Yellow-bellied Prinia", "Spot-bellied Eagle-Owl"]
    },
    "Tarsus": {
        title: "Tarsus",
        description: "The tarsus is the lower leg segment between the toes and the feathered part of the leg. Its length and colour vary among species.",
        image: "images/tarsus.webp",
        caption: "Tarsus of a Purple Heron.",
        examples: ["Herons", "Egrets"]
    },
    "Toe": {
        title: "Toe",
        description: "Birds use their toes for walking, climbing, grasping branches and capturing prey. Toe arrangement differs among bird groups.",
        image: "images/toe.webp",
        caption: "Toes of a Short-toed Snake-Eagle.",
        examples: ["Short-toed Snake-Eagle", "Greater Short-toed Lark"]
    },
    "Supercilium": {
        title: "Supercilium",
        description: "The supercilium/brow is the stripe running above a bird's eye, often called the eyebrow. It is one of the most useful field marks for identifying many species.",
        image: "images/supercilium.webp",
        caption: "Supercilium of a Snowy-browed Flycatcher.",
        examples: ["Snowy-browed Flycatcher", "Yellow-browed Warbler"]
    },
    "Crest": {
        title: "Crest",
        description: "A crest is a tuft or crown of feathers on the head that can be raised or lowered. It is often used for display and communication.",
        image: "images/crest.webp",
        caption: "Crest of a Black-crested Bulbul.",
        examples: ["Black-crested Bulbul", "Crested Serpent Eagle"]
    },
    "Nape": {
        title: "Nape",
        description: "The nape is the back of the neck. Many species have distinctive nape colours, stripes, or patches that help with identification.",
        image: "images/nape.webp",
        caption: "Nape of a White-naped Yuhina.",
        examples: ["White-naped Yuhina", "Black-naped Monarch"]
    },
    "Wing Bars": {
        title: "Wing Bars",
        description: "Wing bars are contrasting bands formed by the tips of wing feathers. They are among the most useful field marks for identifying small birds.",
        image: "images/wing_bar.webp",
        caption: "Wing bar of a Chestnut-crowned Warbler.",
        examples: ["Chestnut-crowned Warbler", "Blyth's Leaf Warbler"]
    },
    "Vent": {
        title: "Vent",
        description: "The vent is the area surrounding the cloaca beneath the tail. Its colour can be an important identification feature in some species.",
        image: "images/vent.webp",
        caption: "Vent of a Red-vented Bulbul.",
        examples: ["Red-vented Bulbul", "Yellow-vented Warbler"]
    },
    "Rump": {
        title: "Rump",
        description: "The rump is the area between the back and the tail. Bright rump colours often become visible when a bird takes flight.",
        image: "images/rump.webp",
        caption: "Rump of a White-rumped Shama.",
        examples: ["White-rumped Shama", "White-rumped Vulture"]
    },
    "Claw": {
        title: "Claw",
        description: "Claws are the curved tips of the toes. Their size and shape reflect how a bird moves, hunts, perches, or grips surfaces.",
        image: "images/claw.webp",
        caption: "Claws of an Asian Barred Owlet.",
        examples: ["Owls", "Eagles"]
    },
    "Tail": {
        title: "Tail",
        description: "The tail helps with balance, steering, braking, and display. Tail length, shape, and pattern are often important identification features.",
        image: "images/tail.webp",
        caption: "Tail of a Long-tailed Shrike.",
        examples: ["Long-tailed Shrike", "Fork-tailed Drongo"]
    }
};

function updateInfoPanel(part) {
    const panel = document.getElementById("infoPanel");
    const data = anatomyInfo[part];
    if (!data) return;

    panel.innerHTML = `
        <h2>${data.title}</h2>
        <p>${data.description}</p>
        <div class="anatomy-example">
            <img src="${data.image}" alt="${data.title}">
            <p class="example-caption">${data.caption}</p>
        </div>
        <h3>Examples in Pokkhi</h3>
        <ul>
            ${data.examples.map(bird => `<li>${bird}</li>`).join("")}
        </ul>
    `;
}

const labels = document.querySelectorAll(".anatomy-label");
labels.forEach(label => {
    label.addEventListener("click", () => {
        labels.forEach(l => l.classList.remove("active"));
        label.classList.add("active");
        updateInfoPanel(label.dataset.part);
    });
});

/* ==========================================
   HERO SLIDESHOW
========================================== */

const heroImages = [
    { desktop: "images/hero/hero1.avif", mobile: "images/hero/hero1_mobile.avif" },
    { desktop: "images/hero/hero2.avif", mobile: "images/hero/hero2_mobile.avif" },
    { desktop: "images/hero/hero3.avif", mobile: "images/hero/hero3_mobile.avif" },
    { desktop: "images/hero/hero4.avif", mobile: "images/hero/hero4_mobile.avif" },
    { desktop: "images/hero/hero5.avif", mobile: "images/hero/hero5_mobile.avif" },
    { desktop: "images/hero/hero6.avif", mobile: "images/hero/hero6_mobile.avif" },
    { desktop: "images/hero/hero7.avif", mobile: "images/hero/hero7_mobile.avif" },
    { desktop: "images/hero/hero8.avif", mobile: "images/hero/hero8_mobile.avif" },
    { desktop: "images/hero/hero9.avif", mobile: "images/hero/hero9_mobile.avif" },
    { desktop: "images/hero/hero10.avif", mobile: "images/hero/hero10_mobile.avif" },
    { desktop: "images/hero/hero11.avif", mobile: "images/hero/hero11_mobile.avif" },
    { desktop: "images/hero/hero12.avif", mobile: "images/hero/hero12_mobile.avif" },
    { desktop: "images/hero/hero13.avif", mobile: "images/hero/hero13_mobile.avif" },
    { desktop: "images/hero/hero14.avif", mobile: "images/hero/hero14_mobile.avif" },
    { desktop: "images/hero/hero15.avif", mobile: "images/hero/hero15_mobile.avif" }
];

function isMobileView() {
    return window.matchMedia("(max-width: 768px)").matches;
}

function initHeroSlideshow() {
    const slideshow = document.getElementById("heroSlideshow");
    if (!slideshow) return;

    heroImages.forEach((image) => {
        const slide = document.createElement("div");
        slide.className = "hero-slide";
        const imagePath = isMobileView() ? image.mobile : image.desktop;
        slide.style.backgroundImage = `url("${imagePath}")`;
        slideshow.appendChild(slide);
    });

    const slides = slideshow.querySelectorAll(".hero-slide");
    if (slides.length > 0) {
        slides[0].classList.add("active");
    }

    let current = 0;
    setInterval(() => {
        slides[current].classList.remove("active");
        current = (current + 1) % slides.length;
        slides[current].classList.add("active");
    }, 5000);
}

function updateHeroImagePositions() {
    const slides = document.querySelectorAll(".hero-slide");
    slides.forEach((slide, index) => {
        const image = heroImages[index];
        slide.style.backgroundImage = isMobileView() ? `url("${image.mobile}")` : `url("${image.desktop}")`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
const loader = document.getElementById("loader");

if (sessionStorage.getItem("loaderShown")) {

    animationFinished = true;
    heroImagesLoaded = true;

    loader.classList.add("loader-hidden");

    initHeroSlideshow();

} else {

    sessionStorage.setItem("loaderShown", "true");

    startLoaderAnimation();

    preloadHeroImages().then(() => {
        heroImagesLoaded = true;
        hideLoaderIfReady();
    });

}

loadBirds();
});

/* ==========================================
   MOBILE NAVIGATION
========================================== */

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
        menuToggle.classList.toggle("active");
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            menuToggle.classList.remove("active");
        });
    });
}

window.addEventListener("resize", updateHeroImagePositions);

const teamData = {
    "chirantanu-saikia": {
        name: "Chirantanu Saikia",
        image: "images/chirantanu-saikia.avif",
        bio: "An acclaimed wildlife photographer and avid birder with a deep interest in documenting the region's avian diversity. His field observations, photographs and species knowledge form the foundation of Pokkhi's bird directory."
    },
    "abhilash-gayan": {
        name: "Abhilash Gayan",
        image: "images/abhilash-gayan.avif",
        bio: "A Ph.D. scholar at the Microwave Engineering Lab, Tezpur University. He is an experienced birder, a wildlife enthusiast and a wildlife photographer with passion for nature, technology and conservation."
    }
};

const teamModal = document.getElementById("teamModal");
const teamPhoto = document.getElementById("teamPhoto");
const teamName = document.getElementById("teamName");
const teamBio = document.getElementById("teamBio");

document.querySelectorAll(".team-member").forEach(member => {
    member.addEventListener("click", () => {
        const person = teamData[member.dataset.member];
        teamPhoto.src = person.image;
        teamName.textContent = person.name;
        teamBio.textContent = person.bio;
        teamModal.style.display = "flex";
    });
});

document.getElementById("closeTeamModal").onclick = () => {
    teamModal.style.display = "none";
};

teamModal.onclick = (e) => {
    if (e.target === teamModal) {
        teamModal.style.display = "none";
    }
};
/* ==========================================
   IMAGE PROTECTION
========================================== */

document.addEventListener("contextmenu", (e) => {

    if (e.target.tagName === "IMG") {

        e.preventDefault();

    }

});

document.addEventListener("dragstart", (e) => {

    if (e.target.tagName === "IMG") {

        e.preventDefault();

    }

});
