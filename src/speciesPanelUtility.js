function createRandomizerSpeciesLink(speciesName) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "randomizedSpeciesPanelLink";
    link.textContent = sanitizeString(species[speciesName].name);
    link.addEventListener("click", async () => {
        await createSpeciesPanel(speciesName);
    });
    return link;
}

function getRandomizedLocationMatches(speciesName) {
    if (!window.locations) {
        return [];
    }
    const matches = [];
    Object.entries(window.locations).forEach(([zone, methods]) => {
        Object.entries(methods).forEach(([method, encounters]) => {
            const rarity = encounters[speciesName];
            if (rarity !== undefined) {
                matches.push({ zone, method, rarity });
            }
        });
    });
    return matches;
}

function findBreedingAcquisitionPaths(speciesName, visited = new Set(), remainingDepth = 5) {
    if (visited.has(speciesName)) {
        return [];
    }
    const directLocations = getRandomizedLocationMatches(speciesName);
    if (directLocations.length > 0) {
        return [{ locations: directLocations, speciesChain: [speciesName] }];
    }
    if (remainingDepth === 0 || !species[speciesName]) {
        return [];
    }

    const nextVisited = new Set(visited);
    nextVisited.add(speciesName);
    const sources = species[speciesName].bredFrom || [];
    const paths = [];
    for (const sourceName of sources) {
        const sourcePaths = findBreedingAcquisitionPaths(sourceName, nextVisited, remainingDepth - 1);
        for (const path of sourcePaths) {
            paths.push({
                locations: path.locations,
                speciesChain: [...path.speciesChain, speciesName]
            });
            if (paths.length >= 3) {
                return paths;
            }
        }
    }
    return paths;
}

function appendBreedingAcquisitionPath(container, path) {
    const pathElement = document.createElement("div");
    pathElement.className = "randomizedSpeciesAcquisitionPath";

    const locations = path.locations.slice(0, 3).map(location =>
        `${sanitizeString(location.zone)} (${sanitizeString(location.method)} ${location.rarity}%)`
    );
    pathElement.append(locations.join("; "), " → ");
    path.speciesChain.forEach((speciesName, index) => {
        if (index > 0) {
            pathElement.append(" → breed → ");
        }
        pathElement.append(createRandomizerSpeciesLink(speciesName));
    });
    if (path.locations.length > 3) {
        pathElement.append(` (+${path.locations.length - 3} more locations)`);
    }
    container.append(pathElement);
}

function updateRandomizedSpeciesPanel(name) {
    const panelSubcontainer = document.getElementById("speciesPanelSubcontainer3");
    if (!panelSubcontainer || !species[name]) {
        return;
    }

    let container = document.getElementById("randomizedSpeciesPanelContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "randomizedSpeciesPanelContainer";
        panelSubcontainer.append(container);
    }
    container.replaceChildren();

    const randomizedTarget = species[name].randomized;
    const randomizedSources = Object.keys(species).filter(sourceName =>
        species[sourceName].baseSpeed > 0 && species[sourceName].randomized === name
    );
    if (!randomizedTarget && randomizedSources.length === 0) {
        container.classList.add("hide");
        return;
    }
    container.classList.remove("hide");

    const title = document.createElement("span");
    title.className = "speciesPanelText";
    title.textContent = "Randomizer:";
    container.append(title);

    if (randomizedTarget && species[randomizedTarget]) {
        const outgoing = document.createElement("div");
        outgoing.className = "randomizedSpeciesPanelRow";
        outgoing.append("Becomes: ", createRandomizerSpeciesLink(randomizedTarget));
        container.append(outgoing);
    }

    if (randomizedSources.length > 0) {
        const incoming = document.createElement("div");
        incoming.className = "randomizedSpeciesPanelRow";
        const label = document.createElement("span");
        label.textContent = "Randomized here: ";
        incoming.append(label);
        randomizedSources.forEach((sourceName, index) => {
            if (index > 0) {
                incoming.append(", ");
            }
            incoming.append(createRandomizerSpeciesLink(sourceName));
        });
        container.append(incoming);
    }

    const breedingResult = species[name].breedingResult;
    const breedingSources = species[name].bredFrom || [];
    if (breedingResult || breedingSources.length > 0) {
        const breedingTitle = document.createElement("details");
        breedingTitle.className = "randomizedSpeciesBreedingRule";
        const summary = document.createElement("summary");
        summary.textContent = "Breeding randomization ⓘ";
        const explanation = document.createElement("div");
        explanation.textContent = "Breeding starts with the usual egg species, then applies the same species-randomizer calculation twice. The normal ban-list rerolls still apply, so forms such as Mega Pokémon are excluded. Incense or form-specific egg rules can change the usual egg species.";
        breedingTitle.append(summary, explanation);
        if (breedingResult && species[name].breedingEggSpecies && species[name].breedingFirstPass) {
            const calculation = document.createElement("div");
            calculation.className = "randomizedSpeciesBreedingCalculation";
            calculation.append(
                "Calculation progression: ", createRandomizerSpeciesLink(species[name].breedingEggSpecies),
                " → ", createRandomizerSpeciesLink(species[name].breedingFirstPass),
                " → ", createRandomizerSpeciesLink(breedingResult)
            );
            breedingTitle.append(calculation);
        }
        container.append(breedingTitle);
    }

    if (breedingResult && species[breedingResult]) {
        const outgoingBreeding = document.createElement("div");
        outgoingBreeding.className = "randomizedSpeciesPanelRow";
        outgoingBreeding.append("Egg result: ", createRandomizerSpeciesLink(breedingResult));
        container.append(outgoingBreeding);
    }

    if (breedingSources.length > 0) {
        const incomingBreeding = document.createElement("div");
        incomingBreeding.className = "randomizedSpeciesPanelRow";
        incomingBreeding.append("Can hatch from: ");
        breedingSources.slice(0, 12).forEach((sourceName, index) => {
            if (index > 0) {
                incomingBreeding.append(", ");
            }
            incomingBreeding.append(createRandomizerSpeciesLink(sourceName));
        });
        if (breedingSources.length > 12) {
            incomingBreeding.append(` (+${breedingSources.length - 12} more)`);
        }
        container.append(incomingBreeding);
    }

    // Direct encounters are already covered by the Locations button. Only add
    // this section when at least one breeding step is needed after the encounter.
    const acquisitionPaths = findBreedingAcquisitionPaths(name).filter(path => path.speciesChain.length > 1);
    if (acquisitionPaths.length > 0) {
        const acquisition = document.createElement("div");
        acquisition.className = "randomizedSpeciesAcquisition";
        const label = document.createElement("span");
        label.className = "speciesPanelText";
        label.textContent = "Breeding route from an encounter:";
        acquisition.append(label);
        acquisitionPaths.forEach(path => appendBreedingAcquisitionPath(acquisition, path));
        container.append(acquisition);
    }
}

fetch("https://raw.githubusercontent.com/ydarissep/dex-core/main/src/speciesPanelUtility.js").then(response => {
    return response.text()
}).then(text => {
    eval.call(window, text);
    const coreCreateSpeciesPanel = createSpeciesPanel;
    window.createSpeciesPanel = async function(name) {
        await coreCreateSpeciesPanel(name);
        updateRandomizedSpeciesPanel(name);
    };
}).catch(error => {
    console.warn(error)
})
