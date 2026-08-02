function addRandomizedSpeciesMapping(row) {
    if (row.dataset.randomizedSpeciesMapping || typeof species === "undefined") {
        return;
    }

    const sourceSpecies = species[row.id];
    const targetSpecies = sourceSpecies && species[sourceSpecies.randomized];
    const nameContainer = row.querySelector(".nameContainer");
    if (!targetSpecies || !nameContainer) {
        return;
    }

    const mapping = document.createElement("div");
    mapping.className = "randomizedSpeciesMapping";
    const targetName = typeof sanitizeString === "function"
        ? sanitizeString(targetSpecies.name)
        : targetSpecies.name.replace(/^SPECIES_/, "").replaceAll("_", " ");
    mapping.textContent = `Randomized into \u2192 ${targetName}`;
    nameContainer.append(mapping);
    row.dataset.randomizedSpeciesMapping = "true";
}

function observeRandomizedSpeciesMappings() {
    const attachMappings = () => {
        const tableBody = document.getElementById("speciesTableTbody");
        if (!tableBody) {
            return false;
        }

        tableBody.querySelectorAll("tr").forEach(addRandomizedSpeciesMapping);
        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.matches("tr")) {
                        addRandomizedSpeciesMapping(node);
                    }
                });
            });
        }).observe(tableBody, { childList: true });
        return true;
    };

    if (attachMappings()) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (attachMappings()) {
            observer.disconnect();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

fetch("https://raw.githubusercontent.com/ydarissep/dex-core/main/src/species/displaySpecies.js").then(response => {
    return response.text()
}).then(text => {
    eval.call(window, text);
    observeRandomizedSpeciesMappings();
}).catch(error => {
    console.warn(error)
})
