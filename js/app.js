let birds = [];
let filteredBirds = [];

const birdGrid = document.getElementById("birdGrid");
const searchInput = document.getElementById("searchInput");
const directorySearchInput =
    document.getElementById(
        "directorySearchInput"
    );
const statusFilter = document.getElementById("statusFilter");
const suggestionsBox = document.getElementById("suggestions");
const resetSearchBtn = document.getElementById("resetSearchBtn");

const loadMoreBtn =
    document.getElementById(
        "loadMoreBtn"
    );

let birdsPerPage = 12;

let visibleBirds = 12;

function getStatusClass(status) {

    switch (status) {

        case "LC":
            return "status-lc";

        case "NT":
            return "status-nt";

        case "VU":
            return "status-vu";

        case "EN":
            return "status-en";

        case "CR":
            return "status-cr";

        default:
            return "";
    }
}

async function loadBirds() {

    try {

        const response =
            await fetch("data/birds.json");

        if (!response.ok) {
            throw new Error(
                `Failed to load birds.json (${response.status})`
            );
        }

        birds = await response.json();

birds.sort((a, b) =>
    a.name.localeCompare(
        b.name,
        "en",
        { sensitivity: "base" }
    )
);

filteredBirds = [...birds];

updateStatistics();
renderBirdOfDay();
renderBirds(filteredBirds);
updateResultCount();

    } catch (error) {

        console.error(
            "Error loading bird data:",
            error
        );
    }
}

function updateStatistics() {

    const speciesCount =
        birds.length;

    document.getElementById(
        "speciesCount"
    ).textContent =
        speciesCount;

    const lc =
        birds.filter(
            b => b.iucnStatus === "LC"
        ).length;

    const nt =
        birds.filter(
            b => b.iucnStatus === "NT"
        ).length;

    const vu =
        birds.filter(
            b => b.iucnStatus === "VU"
        ).length;

    const en =
        birds.filter(
            b => b.iucnStatus === "EN"
        ).length;

    const cr =
        birds.filter(
            b => b.iucnStatus === "CR"
        ).length;

    document.getElementById(
        "countLC"
    ).textContent =
        `LC ${lc}`;

    document.getElementById(
        "countNT"
    ).textContent =
        `NT ${nt}`;

    document.getElementById(
        "countVU"
    ).textContent =
        `VU ${vu}`;

    document.getElementById(
        "countEN"
    ).textContent =
        `EN ${en}`;

    document.getElementById(
        "countCR"
    ).textContent =
        `CR ${cr}`;

    const total =
        lc + nt + vu + en + cr;

    if (total > 0) {

        document.getElementById(
            "barLC"
        ).style.width =
            `${(lc / total) * 100}%`;

        document.getElementById(
            "barNT"
        ).style.width =
            `${(nt / total) * 100}%`;

        document.getElementById(
            "barVU"
        ).style.width =
            `${(vu / total) * 100}%`;

        document.getElementById(
            "barEN"
        ).style.width =
            `${(en / total) * 100}%`;

        document.getElementById(
            "barCR"
        ).style.width =
            `${(cr / total) * 100}%`;
    }

    document.getElementById(
        "lastUpdated"
    ).textContent =
        "June 2025";
}

function updateResultCount() {

    const resultCount =
        document.getElementById(
            "resultCount"
        );

    if (resultCount) {

        resultCount.textContent =
            `Showing ${filteredBirds.length} birds`;
    }
}

function renderBirdOfDay() {

    const container =
        document.getElementById(
            "birdOfDay"
        );

    if (!birds.length) return;

    const today = new Date();

    const dayNumber =
        Math.floor(
            today.getTime() /
            (1000 * 60 * 60 * 12)
        );

    const bird =
        birds[
            dayNumber % birds.length
        ];

container.innerHTML = `
    <div class="bird-card featured-bird">

        <div class="featured-image-wrapper">

            <img
                src="${bird.image}"
                alt="${bird.name}"
                onerror="this.src='images/placeholder.jpg'"
            >

            <div class="featured-tag">
                Featured Today
            </div>

        </div>

        <div class="bird-info">

            <h3>${bird.name}</h3>

            <p class="assamese-name">
                ${bird.assameseName || ""}
            </p>

            <span
                class="status-badge ${getStatusClass(
                    bird.iucnStatus
                )}">
                ${bird.iucnStatus || ""}
            </span>

            <p class="featured-description">

                ${(bird.description || "")
                    .substring(0, 180)}...

            </p>

            <button class="featured-btn">
                Learn More
            </button>

        </div>

    </div>
`;

    const card =
        container.querySelector(
            ".bird-card"
        );

    if (card) {

        card.addEventListener(
            "click",
            () => openModal(bird)
        );
    }
}

function renderBirds(birdList) {

    birdGrid.innerHTML = "";
    const speciesProgress =
    document.getElementById(
        "speciesProgress"
    );

    const birdsToShow =
        birdList.slice(
            0,
            visibleBirds
        );

    birdsToShow.forEach(bird => {

        const card =
            document.createElement("div");

        card.className =
            "bird-card";

        card.innerHTML = `
            <img
                src="${bird.image}"
                alt="${bird.name}"
                onerror="this.src='images/placeholder.jpg'"
            >

            <div class="bird-info">

                <h3>${bird.name}</h3>

                <p class="assamese-name">
                    ${bird.assameseName || ""}
                </p>

                <span
                    class="status-badge ${getStatusClass(
                        bird.iucnStatus
                    )}">

                    ${bird.iucnStatus || ""}

                </span>

            </div>
        `;

        card.addEventListener(
            "click",
            () => openModal(bird)
        );

        birdGrid.appendChild(card);
    });

if (speciesProgress) {

    speciesProgress.textContent =
        `${Math.min(
            visibleBirds,
            birdList.length
        )} of ${birdList.length} species shown`;
}
    
if (
    visibleBirds >=
    birdList.length
) {

    loadMoreBtn.style.display =
        "none";
}
else {

    loadMoreBtn.style.display =
        "inline-block";

    loadMoreBtn.textContent =
        `Load More`;
}
}
function showSuggestions(searchTerm) {

    if (!suggestionsBox) return;

    suggestionsBox.innerHTML = "";

    if (searchTerm.length < 2) {

        suggestionsBox.style.display =
            "none";

        return;
    }

    const matches =
        birds
            .filter(bird =>

                (bird.name || "")
                    .toLowerCase()
                    .includes(searchTerm)

                ||

                (bird.assameseName || "")
                    .toLowerCase()
                    .includes(searchTerm)
            )
            .slice(0, 5);

    if (!matches.length) {

        suggestionsBox.style.display =
            "none";

        return;
    }

    matches.forEach(bird => {

        const item =
            document.createElement("div");

        item.className =
            "suggestion-item";

        item.textContent =
            bird.name;

        item.addEventListener(
            "click",
            () => {

                searchInput.value =
                    bird.name;

                suggestionsBox.style.display =
                    "none";

                performSearch();
            }
        );

        suggestionsBox.appendChild(item);
    });

    suggestionsBox.style.display =
        "block";
}

function performSearch() {

    filterBirds();

    document
        .querySelector(".directory")
        .scrollIntoView({
            behavior: "smooth"
        });

    if (resetSearchBtn) {

        resetSearchBtn.style.display =
            "inline-block";
    }

    setTimeout(() => {

    searchInput.value = "";

}, 500);
}

function filterBirds() {

    const heroSearch =
        searchInput.value
            .toLowerCase()
            .trim();

    const directorySearch =
        directorySearchInput
            ? directorySearchInput.value
                .toLowerCase()
                .trim()
            : "";

    const search =
        directorySearch ||
        heroSearch;

    const status =
        statusFilter.value;

    filteredBirds =
        birds.filter(bird => {

            const matchesSearch =

                (bird.name || "")
                    .toLowerCase()
                    .includes(search)

                ||

                (bird.assameseName || "")
                    .toLowerCase()
                    .includes(search);

            const matchesStatus =

                status === "All"

                ||

                (bird.iucnStatus || "")
                    === status;

            return (
                matchesSearch &&
                matchesStatus
            );
        });
    visibleBirds = 12;
    renderBirds(filteredBirds);

    updateResultCount();

    showSuggestions(search);
}

searchInput.addEventListener(
    "input",
    filterBirds
);

searchInput.addEventListener(
    "focus",
    () => {

        if (window.innerWidth <= 768) {

            setTimeout(() => {

                searchInput.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }, 300);

        }

    }
);

if (directorySearchInput) {

    directorySearchInput.addEventListener(
        "input",
        filterBirds
    );
}

searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            suggestionsBox.style.display =
                "none";

            performSearch();
        }
    }
);

statusFilter.addEventListener(
    "change",
    filterBirds
);

if (resetSearchBtn) {

    resetSearchBtn.addEventListener(
        "click",
        () => {

            filteredBirds = [...birds];

            visibleBirds = 12;
            
            renderBirds(filteredBirds);

            updateResultCount();

            searchInput.value = "";

            if (directorySearchInput) {

    directorySearchInput.value = "";
}

            statusFilter.value = "All";

            suggestionsBox.style.display =
                "none";

            resetSearchBtn.style.display =
                "none";
        }
    );
}

function openModal(bird) {

    const image =
        document.getElementById(
            "modalImage"
        );

    image.src =
    bird.image;

    image.onerror = () => {

        image.src =
            "images/placeholder.jpg";
    };

    document.getElementById(
        "modalName"
    ).textContent =
        bird.name || "";

    document.getElementById(
        "modalAssamese"
    ).textContent =
        bird.assameseName || "";

    document.getElementById(
        "modalStatus"
    ).textContent =
        `IUCN Status: ${bird.iucnStatus || ""}`;

    document.getElementById(
        "modalDescription"
    ).textContent =
        bird.description || "";

    document.getElementById(
        "birdModal"
    ).style.display =
        "flex";
}

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("birdModal")
                .style.display =
                "none";
        }
    );

window.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "birdModal"
            );

        if (event.target === modal) {

            modal.style.display =
                "none";
        }
    }
);

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-wrapper"
            )
        ) {

            suggestionsBox.style.display =
                "none";
        }
    }
);

loadMoreBtn.addEventListener(
    "click",
    () => {

        visibleBirds +=
            birdsPerPage;

        renderBirds(
            filteredBirds
        );
    }
);
const suggestionForm =
    document.getElementById(
        "birdSuggestionForm"
    );

if (suggestionForm) {

    suggestionForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            const englishName =
                document
                    .getElementById(
                        "englishName"
                    )
                    .value
                    .trim();

            const assameseName =
                document
                    .getElementById(
                        "assameseName"
                    )
                    .value
                    .trim();

            const location =
                document
                    .getElementById(
                        "location"
                    )
                    .value
                    .trim();

            const notes =
                document
                    .getElementById(
                        "notes"
                    )
                    .value
                    .trim();

            const contributorName =
                document
                    .getElementById(
                        "contributorName"
                    )
                    .value
                    .trim();

            const formMessage =
                document
                    .getElementById(
                        "formMessage"
                    );

            if (
                !englishName &&
                !assameseName
            ) {

                formMessage.textContent =
                    "Please enter either an English or Assamese name.";

                return;
            }

            try {

                await fetch(
                    "https://script.google.com/macros/s/AKfycbzDuo46jkZjM3mIxkgx8x9QopgF1zioD3Qy2S6qyrXalWVhrZJ12mTKWh-Sv5DTD12l/exec",
                    {
                        method: "POST",

                        body: JSON.stringify({
                            englishName,
                            assameseName,
                            location,
                            notes,
                            contributorName
                        })
                    }
                );

                formMessage.textContent =
                    "Thank you for your contribution!";

                suggestionForm.reset();

            } catch(error) {

                formMessage.textContent =
                    "Submission failed. Please try again.";
            }
        }
    );
}
loadBirds();
