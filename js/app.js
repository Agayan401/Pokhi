let birds = [];
let filteredBirds = [];

const birdGrid = document.getElementById("birdGrid");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const suggestionsBox = document.getElementById("suggestions");
const resetSearchBtn = document.getElementById("resetSearchBtn");

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

    document.getElementById(
        "speciesCount"
    ).textContent = birds.length;

    const threatened =
        birds.filter(bird =>
            ["VU", "EN", "CR"].includes(
                (bird.iucnStatus || "").trim()
            )
        );

    document.getElementById(
        "threatenedCount"
    ).textContent = threatened.length;
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
            (1000 * 60 * 60 * 24)
        );

    const bird =
        birds[
            dayNumber % birds.length
        ];

    container.innerHTML = `
        <div class="bird-card">
            <img
                src="images/${bird.image}"
                alt="${bird.name}"
                onerror="this.src='images/placeholder.jpg'"
            >

            <div class="bird-info">

                <h3>${bird.name}</h3>

                <p class="assamese-name">
                    ${bird.assameseName || ""}
                </p>

                <span class="status-badge">
                    ${bird.iucnStatus || ""}
                </span>

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

    birdList.forEach(bird => {

        const card =
            document.createElement("div");

        card.className =
            "bird-card";

        card.innerHTML = `
            <img
                src="images/${bird.image}"
                alt="${bird.name}"
                onerror="this.src='images/placeholder.jpg'"
            >

            <div class="bird-info">

                <h3>${bird.name}</h3>

                <p class="assamese-name">
                    ${bird.assameseName || ""}
                </p>

                <span class="status-badge">
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

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

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

    renderBirds(filteredBirds);

    updateResultCount();

    showSuggestions(search);
}

searchInput.addEventListener(
    "input",
    filterBirds
);

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

            renderBirds(filteredBirds);

            updateResultCount();

            searchInput.value = "";

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
        `images/${bird.image}`;

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

loadBirds();
